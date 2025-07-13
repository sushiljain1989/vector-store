/**
 * Similarity search utilities for vector store.
 * Provides functions to find the most similar documents using cosine similarity.
 */

import { Document } from './types/document';
import { getCosineSimilarity } from './vectorUtils';

/**
 * Returns the top-k most similar documents to the query embedding, using cosine similarity.
 * @param queryEmbedding - The embedding vector to compare against.
 * @param documents - The list of documents to search.
 * @param k - The number of top results to return.
 * @returns An array of the top-k most similar documents, each with a score property.
 */
export function topKSimilar(queryEmbedding: number[], documents: Document[], k: number): Document[] {
  const scored = documents.map(doc => ({
    ...doc,
    score: getCosineSimilarity(queryEmbedding, doc.embedding),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
