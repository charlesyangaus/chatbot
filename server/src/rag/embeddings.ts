import { EMBEDDING_DIMENSIONS, embeddingModel } from "./config.js";

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing (required for embeddings)");

  if (texts.length === 0) return [];

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: embeddingModel(),
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embeddings error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as EmbeddingResponse;
  const vectors = data.data?.map((row) => row.embedding).filter((v): v is number[] => !!v);

  if (!vectors || vectors.length !== texts.length) {
    throw new Error("Unexpected embeddings response from OpenAI");
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
