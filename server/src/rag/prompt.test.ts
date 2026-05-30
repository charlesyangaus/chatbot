import { formatRagContext, buildRagSystemPrompt } from './prompt';
import type { MatchedChunk } from './types';

describe('RAG Prompt Functions', () => {
  test('formatRagContext should return empty string for empty input', () => {
    expect(formatRagContext([])).toBe('');
  });

  test('formatRagContext should format chunks correctly', () => {
    const chunks: MatchedChunk[] = [
      {
        id: '1',
        content: 'Sample Content 1',
        similarity: 0.95,
        metadata: { source: 'source1', title: 'Title 1' }
      },
      {
        id: '2',
        content: 'Sample Content 2',
        similarity: 0.85,
        metadata: { source: 'source2' }
      }
    ];

    const result = formatRagContext(chunks);
    expect(result).toBe(`[1] (source1 — Title 1, score 0.950)
Sample Content 1

[2] (source2, score 0.850)
Sample Content 2`);
  });

  test('buildRagSystemPrompt should return correct prompt when context is provided', () => {
    const basePrompt = 'What is the vision?';
    const context = 'Vision is to be the best.';
    const result = buildRagSystemPrompt(basePrompt, context);
    expect(result).toContain('Answer using the knowledge base excerpts below.');
  });

  test('buildRagSystemPrompt should handle empty context', () => {
    const basePrompt = 'What is the vision?';
    const result = buildRagSystemPrompt(basePrompt, '');
    expect(result).toContain('No relevant knowledge base excerpts were found for this question.');
  });
});
