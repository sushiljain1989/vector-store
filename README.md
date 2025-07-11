# Vector Store

A TypeScript-based vector store for storing, searching, and managing documents with embedding vectors. This project provides atomic, file-based storage with locking, similarity search, and robust validation, making it suitable for small to medium-scale vector search applications.

## Features
- Store documents with embedding vectors and timestamps
- Atomic file operations with file locking (using `proper-lockfile`)
- Cosine similarity search for top-K most similar documents
- TypeScript-first, with strong type safety
- Simple file-based storage (JSON)
- Comprehensive validation and error handling

## Installation

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd vector-store-ts
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```

## Build

To build the project (compiles TypeScript to JavaScript in `dist/`):

```sh
npm run build
```

## Running Tests

This project uses Jest for testing. To run all tests:

```sh
npm test
```

Test coverage reports are generated in the `coverage/` directory.

## Usage

### 1. Configure the Store

```typescript
import { configureStorePath } from './src/index';

// Set the path for the store and initialize with embedding size (e.g., 384)
configureStorePath('/Users/youruser/vector-store.json', 384);
```

### 2. Add Documents

```typescript
import { addDocument } from './src/index';

const content = 'This is a sample document.';
const embedding = [0.1, 0.2, ...]; // Must match the embedding size
addDocument(content, embedding);
```

### 3. Search for Similar Documents

```typescript
import { search } from './src/index';

const queryEmbedding = [0.1, 0.2, ...];
const topK = 5;
const results = search(queryEmbedding, topK);
console.log(results);
```

### 4. Example: Top-K Similarity Search

```typescript
import { configureStorePath, addDocument, search } from './src/index';

configureStorePath('/Users/youruser/vector-store.json', 384);
addDocument('First doc', Array(384).fill(0.1));
addDocument('Second doc', Array(384).fill(0.2));

const results = search(Array(384).fill(0.1), 2);
console.log(results);
```

## Environment Variables
- `MAX_STORE_SIZE`: Maximum number of documents in the store (default: 10000)

## Notes
- Store files must be within your home directory and end with `.json`.
- For large-scale or concurrent workloads, consider using a database instead of file-based storage.

## License
MIT
