import fs from 'fs';
import { Document } from './types/document';

/**
 * Loads an array of documents from a JSON file.
 * @param filePath - The path to the JSON file.
 * @returns An array of Document objects, or an empty array if the file does not exist.
 */
export function loadStore(filePath: string): Document[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Saves an array of documents to a JSON file.
 * @param data - The array of Document objects to save.
 * @param filePath - The path to the JSON file.
 */
export function saveStore(data: Document[], filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

