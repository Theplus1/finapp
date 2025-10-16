import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeTextFile(dir: string, fileName: string, contents: string): Promise<void> {
  await ensureDir(path.join(dir, path.dirname(fileName)));
  await writeFile(path.join(dir, fileName), contents, 'utf8');
}

export async function writeBufferFile(dir: string, fileName: string, data: Buffer): Promise<void> {
  await ensureDir(path.join(dir, path.dirname(fileName)));
  await writeFile(path.join(dir, fileName), data);
}

export function publicPath(...segments: string[]): string {
  return path.join(process.cwd(), 'public', ...segments);
}
