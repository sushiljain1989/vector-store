import fs from 'fs';

export interface Document {
  content: string;
  embedding: number[];
  timestamp: number; // Unix timestamp in ms
}

export function loadStore(filePath: string): Document[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export function saveStore(data: Document[], filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
