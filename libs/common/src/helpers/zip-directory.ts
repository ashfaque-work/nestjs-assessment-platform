import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';

function listFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

// Zips the contents of `dir` (not the directory itself) into `outFile`, compressed.
// The file list is read before the archive is written, so an archive saved inside `dir`
// never includes itself. Replaces zip-local, which is abandoned and pins jszip 2.
export async function zipDirectory(dir: string, outFile: string): Promise<void> {
  const zip = new JSZip();
  for (const file of listFiles(dir)) {
    zip.file(file.split(path.sep).join('/'), fs.readFileSync(path.join(dir, file)));
  }
  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.promises.writeFile(outFile, content);
}
