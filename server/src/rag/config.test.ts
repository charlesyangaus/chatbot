import { isRagConfigured, ragMatchThreshold, ragFallbackMinSimilarity, ragMatchCount, embeddingModel } from './config';

describe('Config Module', () => {
  it('should verify ragMatchThreshold returns a valid number', () => {
    const threshold = ragMatchThreshold();
    expect(typeof threshold).toBe('number');
    expect(threshold).toBeGreaterThan(0);
  });

  it('should verify ragFallbackMinSimilarity returns a valid number', () => {
    const similarity = ragFallbackMinSimilarity();
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThan(0);
  });

  it('should verify ragMatchCount returns a valid number', () => {
    const count = ragMatchCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  it('should return default model when OPENAI_EMBEDDING_MODEL is not set', () => {
    const model = embeddingModel();
    expect(model).toBe('text-embedding-3-small');
  });
});