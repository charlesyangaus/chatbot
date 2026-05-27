export type DocumentMetadata = {
  source: string;
  title?: string;
  chunkIndex?: number;
};

export type MatchedChunk = {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  similarity: number;
};

export type IngestResult = {
  files: number;
  chunks: number;
  deleted: number;
};
