import cosineSimilarity from 'cosine-similarity';

/**
 * Computes the cosine similarity between two numeric vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 *returns The cosine similarity score between vecA and vecB.
 */
export function getCosineSimilarity(vecA: number[], vecB: number[]): number {
  return cosineSimilarity(vecA, vecB);
}
