import { topKSimilar } from './search';
import * as fs from 'fs';
import * as path from 'path';
import lockfile from 'proper-lockfile';

export interface Document {
  content: string;
  embedding: number[];
  timestamp: number;
}

let storePath: string | undefined;
let storeData: { embeddingSize: number; documents: Document[] } | undefined;
const MAX_STORE_SIZE = Number(process.env['MAX_STORE_SIZE']) || 10000;

/**
 * Checks if the provided path is valid: must be within the user's home directory, not contain '..', and end with .json.
 * @param p - The file path to validate.
 * @returns True if the path is valid, false otherwise.
 */
function isValidPath(p: string): boolean {
  // Allow only paths within the user's home directory and its subdirectories, disallow parent traversal
  const resolved = path.resolve(p);
  const home = process.env.HOME || process.env.USERPROFILE || '';
  // Only allow .json files
  const isJson = resolved.endsWith('.json');
  return resolved.startsWith(home) && !p.includes('..') && isJson;
}

/**
 * Logs an error message to stderr. Replace with a real logger in production.
 * @param message - The error message.
 * @param err - Optional error object.
 */
function logError(message: string, err?: unknown) {
  // Simple logging to stderr; replace with a real logger in production
  const errorMsg = `[${new Date().toISOString()}] ERROR: ${message}` + (err ? ` | ${err instanceof Error ? err.stack : String(err)}` : '');
  console.error(errorMsg);
}

/**
 * Atomically writes data to a file by writing to a temp file and renaming.
 * @param filePath - The file path to write to.
 * @param data - The string data to write.
 */
function atomicWriteFileSync(filePath: string, data: string) {
  // Write to a temp file, then rename for atomicity
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, data, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Saves the store data to disk atomically.
 * @param data - The store data object.
 * @param filePath - The file path to save to.
 */
function saveStoreData(data: { embeddingSize: number; documents: Document[] }, filePath: string) {
  try {
    atomicWriteFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    logError('Failed to save store data atomically', err);
    throw err;
  }
}

/**
 * Loads the store data from disk and validates its structure.
 * @param filePath - The file path to load from.
 * @returns The loaded store data object.
 */
function loadStoreData(filePath: string): { embeddingSize: number; documents: Document[] } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (
    typeof data.embeddingSize !== 'number' ||
    !Array.isArray(data.documents)
  ) {
    throw new Error('Invalid store file format.');
  }
  return data;
}

/**
 * Configures the store path and optionally initializes a new store with the given embedding size.
 * @param p - The file path for the store (must be .json).
 * @param embeddingSize - The embedding size for a new store.
 * @throws If the path is invalid or embedding size mismatches.
 */
export function configureStorePath(p: string, embeddingSize?: number): void {
  if (!isValidPath(p)) {
    throw new Error('Invalid store path. Path must be within your home directory.');
  }
  storePath = p;
  storeData = undefined;
  const fileExists = fs.existsSync(storePath);
  if (fileExists) {
    if (embeddingSize !== undefined) {
      // Check for embedding size mismatch
      const existing = loadStoreData(storePath);
      if (existing.embeddingSize !== embeddingSize) {
        throw new Error(`Embedding size mismatch: store file has embedding size ${existing.embeddingSize}, but ${embeddingSize} was provided.`);
      }
    }
  } else {
    if (embeddingSize === undefined) {
      throw new Error('Embedding size is required to initialize a new store.');
    }
    storeData = { embeddingSize, documents: [] };
    saveStoreData(storeData, storePath);
  }
}

/**
 * Gets the current store data, loading from disk if necessary.
 * @returns The store data object.
 * @throws If the store path is not configured or the file does not exist.
 */
function getStoreData(): { embeddingSize: number; documents: Document[] } {
  if (!storePath) {
    throw new Error('Store path is not configured. Please call configureStorePath(path) before using the store.');
  }
  if (!storeData) {
    try {
      if (!fs.existsSync(storePath)) {
        throw new Error('Store file does not exist. Please configure with an embedding size.');
      } else {
        storeData = loadStoreData(storePath);
      }
    } catch (err) {
      logError('Failed to load store', err);
      throw new Error(`Failed to load store: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return storeData!;
}

/**
 * Validates that the embedding is an array of finite numbers of the correct size.
 * @param embedding - The embedding array.
 * @param embeddingSize - The expected size.
 * @throws If the embedding is invalid.
 */
function validateEmbedding(embedding: number[], embeddingSize: number): void {
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding must be an array.');
  }
  if (embedding.length !== embeddingSize) {
    throw new Error(`Embedding must be ${embeddingSize} dimensions, but got ${embedding.length}.`);
  }
  for (const v of embedding) {
    if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
      throw new Error('Embedding must only contain finite valid numbers.');
    }
  }
}

/**
 * Validates that the content is a non-empty string.
 * @param content - The content string.
 * @throws If the content is invalid.
 */
function validateContent(content: string): void {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Content must be a non-empty string.');
  }
}

/**
 * The current file lock release function, if a lock is held. Used to ensure locks are released on shutdown.
 */
let currentRelease: (() => void) | undefined = undefined;

/**
 * Releases the current file lock if held. Called on shutdown signals and after each locked operation.
 */
function releaseCurrentLock() {
  if (currentRelease) {
    try { currentRelease(); } catch {}
    currentRelease = undefined;
  }
}

// Listen for process shutdown signals and release any held file lock to avoid stale locks.
process.on('SIGINT', () => {
  releaseCurrentLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseCurrentLock();
  process.exit(0);
});
process.on('exit', () => {
  releaseCurrentLock();
});

/**
 * Adds a document to the store with the given content and embedding.
 * Acquires an exclusive file lock before writing to prevent concurrent writes.
 * The lock is always released, even if an error occurs.
 * @param content - The document content.
 * @param embedding - The embedding vector.
 * @throws If validation fails or the store is locked.
 */
export function addDocument(content: string, embedding: number[]): void {
  validateContent(content);
  const { embeddingSize, documents } = getStoreData();
  validateEmbedding(embedding, embeddingSize);
  if (documents.length >= MAX_STORE_SIZE) {
    throw new Error('Store is too large. Consider using a database for better performance.');
  }
  if (!storePath) throw new Error('Store path is not configured.');
  let release: (() => void) | undefined;
  try {
    // Acquire an exclusive lock on the store file before writing
    release = lockfile.lockSync(storePath, {
      retries: { retries: 5, factor: 2, minTimeout: 50, maxTimeout: 500 },
      stale: 30000, // 30 seconds stale lock timeout
      onCompromised: (err: Error) => {
        logError('Lock compromised (possible crash or NFS issue)', err);
        throw new Error('Lock on store file was compromised. Please check for concurrent access or system issues.');
      }
    });
    currentRelease = release;
    documents.push({ content, embedding, timestamp: Date.now() });
    saveStoreData({ embeddingSize, documents }, storePath);
  } catch (err) {
    logError('Failed to save store (locking error)', err);
    throw new Error(`Failed to save store: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    // Always release the lock, even if an error occurs
    if (release) {
      try { release(); } catch {}
      if (currentRelease === release) currentRelease = undefined;
    }
  }
}

/**
 * Searches for the top-k most similar documents to the given embedding.
 * Acquires an exclusive file lock before reading to prevent concurrent writes/reads.
 * The lock is always released, even if an error occurs.
 * @param contentEmbedding - The embedding to search for.
 * @param k - The number of results to return (default 5).
 * @returns An array of the top-k most similar documents.
 * @throws If validation fails or the store is locked.
 */
export function search(contentEmbedding: number[], k: number = 5): Document[] {
  if (!storePath) throw new Error('Store path is not configured.');
  let release: (() => void) | undefined;
  try {
    // Acquire an exclusive lock on the store file before reading
    // (This prevents reads during writes, but also blocks concurrent reads)
    release = lockfile.lockSync(storePath, {
      retries: { retries: 5, factor: 2, minTimeout: 50, maxTimeout: 500 },
      stale: 30000, // 30 seconds stale lock timeout
      onCompromised: (err: Error) => {
        logError('Lock compromised (possible crash or NFS issue)', err);
        throw new Error('Lock on store file was compromised. Please check for concurrent access or system issues.');
      }
    });
    currentRelease = release;
    const { embeddingSize, documents } = getStoreData();
    validateEmbedding(contentEmbedding, embeddingSize);
    if (typeof k !== 'number' || k <= 0 || !Number.isInteger(k)) {
      throw new Error('k must be a positive integer.');
    }
    return topKSimilar(contentEmbedding, documents, k);
  } finally {
    // Always release the lock, even if an error occurs
    if (release) {
      try { release(); } catch {}
      if (currentRelease === release) currentRelease = undefined;
    }
  }
}
