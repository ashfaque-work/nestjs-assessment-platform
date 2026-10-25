import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PracticeSetExcelService } from './practiceSetExcelService';

// The ways the services use SheetJS, exercised against the installed release with the
// exact options each call site passes: uploads parsed from a buffer into row objects
// (administration, subject, classroom, admin user import), practice-set sheets parsed as
// raw arrays, and the practice-set import that reads a file, rewrites the ranges and
// saves a copy.
describe('xlsx usage', () => {
  const rows = [
    { Name: 'Asha', Email: 'asha@example.com', Marks: 91, Passed: true },
    { Name: 'Ravi', Email: 'ravi@example.com', Marks: 47.5, Passed: false },
  ];

  const workbookBuffer = (sheets: Record<string, any[][]>) => {
    const wb = XLSX.utils.book_new();
    for (const [name, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  };

  const upload = workbookBuffer({
    Students: [['Name', 'Email', 'Marks', 'Passed'], ...rows.map((r) => [r.Name, r.Email, r.Marks, r.Passed])],
  });

  it('reads an uploaded buffer into row objects keyed by the header', () => {
    const workbook = XLSX.read(upload, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    expect(XLSX.utils.sheet_to_json(sheet)).toEqual(rows);
  });

  it('keeps raw cell values with { raw: true }', () => {
    const workbook = XLSX.read(upload, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed: any[] = XLSX.utils.sheet_to_json(sheet, { raw: true });
    expect(parsed[1].Marks).toBe(47.5);
    expect(parsed[0].Passed).toBe(true);
  });

  it('parses practice-set sheets as raw arrays through PracticeSetExcelService', async () => {
    const service = Object.create(PracticeSetExcelService.prototype);
    const workbook = XLSX.read(workbookBuffer({
      Practice: [['Title', 'Duration'], ['Algebra I', 30]],
      Questions: [['Question', 'Answer'], ['2+2', 4], [null, 'blank question cell']],
    }), { type: 'buffer' });

    expect(await service.parseExcelSheet(workbook, 0)).toEqual([['Title', 'Duration'], ['Algebra I', 30]]);
    expect(await service.parseExcelSheet(workbook, 1)).toEqual([['Question', 'Answer'], ['2+2', 4], [undefined, 'blank question cell']]);
  });

  it('reads a file, rewrites its ranges from A1 and saves a copy the way the import does', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-import-'));
    const source = path.join(dir, 'upload.xlsx');
    fs.writeFileSync(source, workbookBuffer({ Practice: [['Title'], ['Algebra I']] }));

    const workbook = XLSX.readFile(source);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = sheet['!ref'].split(':');
    sheet['!ref'] = 'A1:' + range[1];

    const copy = path.join(dir, 'copy.xlsx');
    XLSX.writeFile(workbook, copy, { bookType: 'xlsx', bookSST: true, type: 'binary' } as any);

    const reread = XLSX.readFile(copy);
    expect(XLSX.utils.sheet_to_json(reread.Sheets[reread.SheetNames[0]], { header: 1 })).toEqual([['Title'], ['Algebra I']]);
  });
});
