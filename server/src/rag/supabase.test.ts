import { jest } from "@jest/globals";

const createClientMock = jest.fn();
const isRagConfiguredMock = jest.fn<() => boolean>();

const selectMock = jest.fn<
  () => Promise<{ count: number | null; error: { message: string } | null }>
>();
const fromMock = jest.fn(() => ({ select: selectMock }));

jest.unstable_mockModule("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

jest.unstable_mockModule("./config.js", () => ({
  isRagConfigured: isRagConfiguredMock,
}));

describe("getSupabase", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(async () => {
    jest.resetModules();
    isRagConfiguredMock.mockReset();
    createClientMock.mockReset();
    fromMock.mockClear();
    selectMock.mockReset();

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    createClientMock.mockReturnValue({ from: fromMock });
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;

    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("throws when Supabase is not configured", async () => {
    isRagConfiguredMock.mockReturnValue(false);
    const { getSupabase } = await import("./supabase");

    expect(() => getSupabase()).toThrow(
      "Supabase is not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("creates a client once and reuses it", async () => {
    isRagConfiguredMock.mockReturnValue(true);
    const { getSupabase } = await import("./supabase");

    const first = getSupabase();
    const second = getSupabase();

    expect(first).toBe(second);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  });
});

describe("countDocuments", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(async () => {
    jest.resetModules();
    isRagConfiguredMock.mockReset();
    createClientMock.mockReset();
    fromMock.mockClear();
    selectMock.mockReset();

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    createClientMock.mockReturnValue({ from: fromMock });
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;

    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("returns null when Supabase is not configured", async () => {
    isRagConfiguredMock.mockReturnValue(false);
    const { countDocuments } = await import("./supabase");

    await expect(countDocuments()).resolves.toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns document count from Supabase", async () => {
    isRagConfiguredMock.mockReturnValue(true);
    selectMock.mockResolvedValue({ count: 42, error: null });

    const { countDocuments } = await import("./supabase");
    await expect(countDocuments()).resolves.toBe(42);

    expect(fromMock).toHaveBeenCalledWith("documents");
    expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("returns null when the count query fails", async () => {
    isRagConfiguredMock.mockReturnValue(true);
    selectMock.mockResolvedValue({ count: null, error: { message: "db error" } });

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const { countDocuments } = await import("./supabase");
    await expect(countDocuments()).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith(
      "[rag] count documents failed:",
      "db error",
    );

    warnSpy.mockRestore();
  });
});
