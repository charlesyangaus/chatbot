import { DocumentMetadata, MatchedChunk, IngestResult } from './types';

describe('Types', () => {
  test('DocumentMetadata type', () => {
    const metadata: DocumentMetadata = {
      source: 'source.txt',
      title: 'My Title',
      chunkIndex: 0,
    };
    expect(metadata.source).toBe('source.txt');
    expect(metadata.title).toBe('My Title');
    expect(metadata.chunkIndex).toBe(0);
  });

  test('MatchedChunk type', () => {
    const chunk: MatchedChunk = {
      id: '1',
      content: 'This is a chunk.',
      metadata: {
        source: 'source.txt',
      },
      similarity: 0.95,
    };
    expect(chunk.id).toBe('1');
    expect(chunk.content).toBe('This is a chunk.');
    expect(chunk.metadata.source).toBe('source.txt');
    expect(chunk.similarity).toBe(0.95);
  });

  test('IngestResult type', () => {
    const result: IngestResult = {
      files: 3,
      chunks: 10,
      deleted: 1,
    };
    expect(result.files).toBe(3);
    expect(result.chunks).toBe(10);
    expect(result.deleted).toBe(1);
  });
});