import { formatRagContext, buildRagSystemPrompt } from './prompt.js';
import type { MatchedChunk } from './types.js';

describe('RAG Functions', () => {
  describe('formatRagContext', () => {
    it('should return an empty string for an empty array', () => {
      expect(formatRagContext([])).toBe('');
    });

    it('should format the context correctly for one chunk', () => {
      const chunks: MatchedChunk[] = [{
        id: '1',
        metadata: { source: 'test-source', title: 'test-title' },
        similarity: 0.123,
        content: 'Test content',
      }];
      const result = formatRagContext(chunks);
      expect(result).toBe('[1] (test-source — test-title, score 0.123)\nTest content');
    });

    it('should format multiple chunks correctly', () => {
      const chunks: MatchedChunk[] = [
        { id: '1', metadata: { source: 'source1' }, similarity: 0.456, content: 'Content 1' },
        { id: '2', metadata: { source: 'source2', title: 'Title 2' }, similarity: 0.789, content: 'Content 2' },
      ];
      const result = formatRagContext(chunks);
      expect(result).toBe('[1] (source1, score 0.456)\nContent 1\n\n[2] (source2 — Title 2, score 0.789)\nContent 2');
    });
  });

  describe('buildRagSystemPrompt', () => {
    it('should return base prompt with no context message when context is empty', () => {
      const result = buildRagSystemPrompt('Base Prompt', '');
      expect(result).toContain('No relevant knowledge base excerpts were found for this question.');
    });

    it('should return base prompt with context when context is provided', () => {
      const result = buildRagSystemPrompt('Base Prompt', 'Context');
      expect(result).toContain('Knowledge base excerpts:');
      expect(result).toContain('Context');
    });
  });
});