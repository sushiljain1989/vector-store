import { topKSimilar } from '../search';
import * as vectorUtils from '../vectorUtils';
import { Document } from '../store';

describe('topKSimilar', () => {
  const query = [1, 0, 0];
  const docs: Document[] = [
    { content: 'A', embedding: [1, 0, 0], timestamp: 1 },
    { content: 'B', embedding: [0, 1, 0], timestamp: 2 },
    { content: 'C', embedding: [0, 0, 1], timestamp: 3 },
    { content: 'D', embedding: [0.5, 0.5, 0], timestamp: 4 },
  ];

  it('returns top k most similar documents', () => {
    jest.spyOn(vectorUtils, 'getCosineSimilarity').mockImplementation((a, b) => {
      // Simple dot product for test
      return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    });
    const result = topKSimilar(query, docs, 2);
    expect(result.length).toBe(2);
    expect(result[0].content).toBe('A'); // Most similar
    expect(result[1].content).toBe('D'); // Next most similar
  });

  it('returns all documents if k > docs.length', () => {
    jest.spyOn(vectorUtils, 'getCosineSimilarity').mockReturnValue(1);
    const result = topKSimilar(query, docs, 10);
    expect(result.length).toBe(docs.length);
  });

  it('returns empty array if documents is empty', () => {
    const result = topKSimilar(query, [], 3);
    expect(result).toEqual([]);
  });
});
