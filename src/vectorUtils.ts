import cosineSimilarity from 'cosine-similarity';

export function getCosineSimilarity(vecA: number[], vecB: number[]): number {
  return cosineSimilarity(vecA, vecB);
}
