/**
 * Type definitions for vector store documents.
 */

/**
 * Represents a document stored in the vector store.
 * @property content - The textual content of the document.
 * @property embedding - The embedding vector representing the document.
 * @property timestamp - The creation or insertion time (milliseconds since epoch).
 */
export interface Document {
  content: string;
  embedding: number[];
  timestamp: number;
}
