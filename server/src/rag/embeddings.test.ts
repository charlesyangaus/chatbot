import { embedTexts } from './embeddings';

describe('embedTexts', () => {
  it('should return embeddings for given input', async () => {
    const input = ['Sample text 1', 'Sample text 2'];
    const result = await embedTexts(input);
    expect(result).toBeDefined();
    expect(result).toHaveLength(input.length);
  });

  it('should handle empty input', async () => {
    const result = await embedTexts([]);
    expect(result).toEqual([]);
  });
});