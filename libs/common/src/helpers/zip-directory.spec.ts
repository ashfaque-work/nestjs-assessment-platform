import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as JSZip from 'jszip';
import { zipDirectory } from './zip-directory';

describe('zipDirectory', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-dir-'));
    fs.writeFileSync(path.join(dir, 'report.xlsx'), 'excel bytes');
    fs.mkdirSync(path.join(dir, 'images'));
    fs.writeFileSync(path.join(dir, 'images', 'a.png'), 'png bytes');
  });

  const entriesOf = async (file: string) => {
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    return Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort();
  };

  it('puts the directory contents, nested folders included, at the archive root', async () => {
    const out = path.join(os.tmpdir(), `out-${Date.now()}.zip`);
    await zipDirectory(dir, out);
    expect(await entriesOf(out)).toEqual(['images/a.png', 'report.xlsx']);
    const zip = await JSZip.loadAsync(fs.readFileSync(out));
    expect(await zip.file('report.xlsx').async('string')).toBe('excel bytes');
  });

  it('does not include an archive it saves inside the same directory', async () => {
    const out = path.join(dir, 'export.zip');
    await zipDirectory(dir, out);
    expect(await entriesOf(out)).toEqual(['images/a.png', 'report.xlsx']);
  });
});
