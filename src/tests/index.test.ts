import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import * as index from '../index';

jest.mock('fs');
jest.mock('proper-lockfile');

const TEST_STORE_PATH = path.join(process.env.HOME || '', 'test-store.json');
const TEST_EMBEDDING_SIZE = 3;
const VALID_EMBEDDING = [0.1, 0.2, 0.3];
const VALID_CONTENT = 'test content';

function resetMocks() {
  jest.resetAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (fs.readFileSync as jest.Mock).mockReset();
  (fs.writeFileSync as jest.Mock).mockReset();
  (fs.renameSync as jest.Mock).mockReset();
  (lockfile.lockSync as jest.Mock).mockImplementation(() => jest.fn());
}

describe('index.ts', () => {
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    // Prevent process.exit from killing Jest
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`process.exit: ${code}`); }) as any);
    // Optionally, silence error logs for cleaner output
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    resetMocks();
    // Remove any cached storeData
    (index as any).storeData = undefined;
    (index as any).storePath = undefined;
  });

  describe('configureStorePath', () => {
    it('should throw for invalid path', () => {
      expect(() => index.configureStorePath('/tmp/invalid.json')).toThrow('Invalid store path');
    });
    it('should throw if embedding size is missing for new store', () => {
      expect(() => index.configureStorePath(TEST_STORE_PATH)).toThrow('Embedding size is required');
    });
    it('should create new store if not exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(() => index.configureStorePath(TEST_STORE_PATH, TEST_EMBEDDING_SIZE)).not.toThrow();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    it('should throw on embedding size mismatch', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ embeddingSize: 5, documents: [] }));
      expect(() => index.configureStorePath(TEST_STORE_PATH, TEST_EMBEDDING_SIZE)).toThrow('Embedding size mismatch');
    });
    it('should not throw if embedding size matches', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ embeddingSize: TEST_EMBEDDING_SIZE, documents: [] }));
      expect(() => index.configureStorePath(TEST_STORE_PATH, TEST_EMBEDDING_SIZE)).not.toThrow();
    });
  });

  describe('configureStorePath invalid path', () => {
    it('should throw if path is not in home directory', () => {
      // Use a path outside home
      const invalidPath = '/tmp/invalid.json';
      expect(() => index.configureStorePath(invalidPath, 3)).toThrow('Invalid store path. Path must be within your home directory.');
    });
    it('should throw if path does not end with .json', () => {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      const invalidPath = home + '/file.txt';
      expect(() => index.configureStorePath(invalidPath, 3)).toThrow('Invalid store path. Path must be within your home directory.');
    });
    it('should throw if path contains ..', () => {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      const invalidPath = home + '/../file.json';
      expect(() => index.configureStorePath(invalidPath, 3)).toThrow('Invalid store path. Path must be within your home directory.');
    });
  });

  describe('addDocument', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ embeddingSize: TEST_EMBEDDING_SIZE, documents: [] }));
      index.configureStorePath(TEST_STORE_PATH, TEST_EMBEDDING_SIZE);
    });
    it('should add a valid document', () => {
      expect(() => index.addDocument(VALID_CONTENT, VALID_EMBEDDING)).not.toThrow();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    it('should throw for invalid content', () => {
      expect(() => index.addDocument('', VALID_EMBEDDING)).toThrow('Content must be a non-empty string');
    });
    it('should throw for invalid embedding', () => {
      expect(() => index.addDocument(VALID_CONTENT, [1, 2])).toThrow('Embedding must be 3 dimensions');
      expect(() => index.addDocument(VALID_CONTENT, [NaN, 2, 3])).toThrow('Embedding must only contain finite valid numbers');
    });
    it('should throw if store is too large', () => {
      const docs = Array(10000).fill({ content: 'a', embedding: VALID_EMBEDDING, timestamp: Date.now() });
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ embeddingSize: TEST_EMBEDDING_SIZE, documents: docs }));
      (index as any).storeData = undefined;
      expect(() => index.addDocument(VALID_CONTENT, VALID_EMBEDDING)).toThrow('Store is too large');
    });
    it('should throw if lock is compromised', () => {
      (lockfile.lockSync as jest.Mock).mockImplementation(() => { throw { message: 'Lock compromised', code: 'ELOCKED' }; });
      expect(() => index.addDocument(VALID_CONTENT, VALID_EMBEDDING)).toThrow('Failed to save store');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ embeddingSize: TEST_EMBEDDING_SIZE, documents: [{ content: VALID_CONTENT, embedding: VALID_EMBEDDING, timestamp: Date.now() }] }));
      index.configureStorePath(TEST_STORE_PATH, TEST_EMBEDDING_SIZE);
    });
    it('should return topKSimilar results', () => {
      const spy = jest.spyOn(require('../search'), 'topKSimilar').mockReturnValue([{ content: VALID_CONTENT, embedding: VALID_EMBEDDING, timestamp: Date.now() }]);
      const results = index.search(VALID_EMBEDDING, 1);
      expect(results.length).toBe(1);
      expect(spy).toHaveBeenCalled();
    });
    it('should throw for invalid embedding', () => {
      expect(() => index.search([1, 2], 1)).toThrow('Embedding must be 3 dimensions');
    });
    it('should throw for invalid k', () => {
      expect(() => index.search(VALID_EMBEDDING, 0)).toThrow('k must be a positive integer');
      expect(() => index.search(VALID_EMBEDDING, -1)).toThrow('k must be a positive integer');
      expect(() => index.search(VALID_EMBEDDING, 1.5)).toThrow('k must be a positive integer');
    });
    it('should throw if lock is compromised', () => {
      (lockfile.lockSync as jest.Mock).mockImplementation(() => { throw { message: 'Lock compromised', code: 'ELOCKED' }; });
      expect(() => index.search(VALID_EMBEDDING, 1)).toThrow('Lock compromised');
    });
  });

  describe('file corruption', () => {
    it('should throw if store file is invalid JSON', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new SyntaxError('Unexpected token'); });
      (index as any).storeData = undefined;
      expect(() => index.addDocument(VALID_CONTENT, VALID_EMBEDDING)).toThrow('Failed to load store');
    });
    it('should throw if store file is missing fields', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ foo: 1 }));
      (index as any).storeData = undefined;
      expect(() => index.addDocument(VALID_CONTENT, VALID_EMBEDDING)).toThrow('Invalid store file format');
    });
  });

  describe('lock release on shutdown', () => {
    it('should release lock on SIGINT', () => {
      const releaseMock = jest.fn();
      (lockfile.lockSync as jest.Mock).mockReturnValue(releaseMock);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ embeddingSize: TEST_EMBEDDING_SIZE, documents: [] }));
      index.configureStorePath(TEST_STORE_PATH, TEST_EMBEDDING_SIZE);
      index.addDocument(VALID_CONTENT, VALID_EMBEDDING);
      process.emit('SIGINT');
      expect(releaseMock).toHaveBeenCalled();
    });
  });
});
