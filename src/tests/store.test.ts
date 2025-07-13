import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadStore, saveStore } from '../store';
import { Document } from '../types/document';

describe('store.ts', () => {
  const TEST_PATH = path.join(os.homedir(), 'vectors-store-test.json');
  const TEST_DOCS: Document[] = [
    { content: 'doc1', embedding: [1, 2, 3], timestamp: 123 },
    { content: 'doc2', embedding: [4, 5, 6], timestamp: 456 },
  ];

  function cleanup() {
    if (fs.existsSync(TEST_PATH)) {
      fs.unlinkSync(TEST_PATH);
    }
  }

  beforeEach(() => {
    cleanup();
  });

  afterAll(() => {
    cleanup();
  });

  it('returns empty array if file does not exist', () => {
    expect(loadStore(TEST_PATH)).toEqual([]);
  });

  it('saves and loads documents correctly', () => {
    saveStore(TEST_DOCS, TEST_PATH);
    const loaded = loadStore(TEST_PATH);
    expect(loaded).toEqual(TEST_DOCS);
  });

  it('overwrites file with new data', () => {
    saveStore(TEST_DOCS, TEST_PATH);
    const newDocs: Document[] = [{ content: 'new', embedding: [7, 8, 9], timestamp: 789 }];
    saveStore(newDocs, TEST_PATH);
    const loaded = loadStore(TEST_PATH);
    expect(loaded).toEqual(newDocs);
  });
});
