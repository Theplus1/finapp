import * as path from 'path';
import * as fs from 'fs-extra';
import { buildTimestampedName } from 'src/shared/utils/naming.util';
import { publicPath } from 'src/shared/utils/file.util';

export interface SavedFile {
  filePath: string;
  fileName: string;
}

export async function saveExportFile(buffer: Buffer, prefix: string): Promise<SavedFile> {
  const fileName = buildTimestampedName(new Date(), {
    prefix,
    ext: 'xlsx',
  });

  const outDir = publicPath('exports');
  await fs.ensureDir(outDir);

  const filePath = path.join(outDir, fileName);
  await fs.writeFile(filePath, buffer);

  return { filePath, fileName };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
