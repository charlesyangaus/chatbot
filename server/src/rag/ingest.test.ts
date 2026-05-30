import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jest } from "@jest/globals";

const deleteNeqMock = jest.fn<
  () => Promise<{ error: { message: string } | null; count: number | null }>
>();
const deleteMock = jest.fn(() => ({ neq: deleteNeqMock }));
const insertMock = jest.fn<
  (rows: unknown) => Promise<{ error: { message: string } | null }>
>();
const fromMock = jest.fn(() => ({
  delete: deleteMock,
  insert: insertMock,
}));

const embedTextsMock = jest.fn<(texts: string[]) => Promise<number[][]>>();

jest.unstable_mockModule("./supabase.js", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

jest.unstable_mockModule("./embeddings.js", () => ({
  embedTexts: embedTextsMock,
}));

const { ingestKnowledge } = await import("./ingest");

describe("ingestKnowledge", () => {
  let knowledgeDir: string;

  beforeEach(async () => {
    knowledgeDir = await mkdtemp(join(tmpdir(), "ingest-test-"));
    deleteNeqMock.mockReset();
    deleteMock.mockClear();
    insertMock.mockReset();
    fromMock.mockClear();
    embedTextsMock.mockReset();

    deleteNeqMock.mockResolvedValue({ error: null, count: 2 });
    insertMock.mockResolvedValue({ error: null });
    embedTextsMock.mockImplementation(async (texts) =>
      texts.map((_, index) => [index, 0.5, 0.25]),
    );
  });

  afterEach(async () => {
    await rm(knowledgeDir, { recursive: true, force: true });
  });

  it("returns zero files and chunks when the knowledge dir has no markdown", async () => {
    const result = await ingestKnowledge({ knowledgeDir });

    expect(result).toEqual({ files: 0, chunks: 0, deleted: 2 });
    expect(deleteNeqMock).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
    expect(embedTextsMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("clears documents, chunks markdown, embeds, and inserts rows", async () => {
    await writeFile(
      join(knowledgeDir, "guide.md"),
      "# Getting Started\n\n## Setup\n\nInstall dependencies.\n\n## Run\n\nStart the app.\n",
      "utf8",
    );

    const result = await ingestKnowledge({ knowledgeDir });

    expect(result.files).toBe(1);
    expect(result.chunks).toBeGreaterThanOrEqual(2);
    expect(result.deleted).toBe(2);
    expect(embedTextsMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);

    const insertedRows = insertMock.mock.calls[0]?.[0] as Array<{
      content: string;
      metadata: { source: string; title: string; chunkIndex: number };
      embedding: number[];
    }>;

    expect(insertedRows).toBeDefined();

    expect(insertedRows[0]?.metadata).toMatchObject({
      source: "guide.md",
      title: "Getting Started",
      chunkIndex: 0,
    });
    expect(insertedRows[0]?.embedding).toEqual([0, 0.5, 0.25]);
  });

  it("uses the filename as title when markdown has no h1", async () => {
    await writeFile(
      join(knowledgeDir, "billing.md"),
      "## Plans\n\nPro plan details.\n",
      "utf8",
    );

    await ingestKnowledge({ knowledgeDir });

    const insertedRows = insertMock.mock.calls[0]?.[0] as Array<{
      metadata: { title: string };
    }>;
    expect(insertedRows).toBeDefined();
    expect(insertedRows[0]?.metadata.title).toBe("billing");
  });

  it("skips clearing documents when clearExisting is false", async () => {
    const result = await ingestKnowledge({ knowledgeDir, clearExisting: false });

    expect(result.deleted).toBe(0);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("throws when clearing documents fails", async () => {
    deleteNeqMock.mockResolvedValueOnce({
      error: { message: "delete failed" },
      count: 0,
    });

    await expect(ingestKnowledge({ knowledgeDir })).rejects.toThrow(
      "Failed to clear documents: delete failed",
    );
  });

  it("throws when inserting documents fails", async () => {
    await writeFile(join(knowledgeDir, "one.md"), "# One\n\nBody.\n", "utf8");
    insertMock.mockResolvedValueOnce({
      error: { message: "insert failed" },
    });

    await expect(ingestKnowledge({ knowledgeDir })).rejects.toThrow(
      "Failed to insert documents: insert failed",
    );
  });
});
