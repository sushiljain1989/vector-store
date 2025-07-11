import { Document } from './store';
import { getCosineSimilarity } from './vectorUtils';

export function topKSimilar(queryEmbedding: number[], documents: Document[], k: number): Document[] {
  const scored = documents.map(doc => ({
    ...doc,
    score: getCosineSimilarity(queryEmbedding, doc.embedding),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
