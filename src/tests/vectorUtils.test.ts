import { getCosineSimilarity } from '../vectorUtils';

describe('getCosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(getCosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(getCosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(getCosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });
});
