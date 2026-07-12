import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    service = new ExportService();
  });

  it('exports CSV with escaped values', () => {
    const result = service.toCsv([{ name: 'A "quoted" value', amount: 10 }]);

    expect(result.extension).toBe('csv');
    expect(result.file.toString('utf8')).toContain('"A ""quoted"" value"');
  });

  it('exports empty dataset for CSV/XLSX/PDF with a stable empty column', () => {
    const csv = service.toCsv([]).file.toString('utf8');
    const xlsx = service.toXlsx([]).file.toString('utf8');
    const pdf = service.toPdf([]).file.toString('utf8');

    expect(csv).toBe('empty');
    expect(xlsx).toContain('empty');
    expect(pdf).toContain('%PDF-1.4');
  });

  it('escapes XML content in XLSX export', () => {
    const result = service.toXlsx([{ note: '<unsafe & value>' }]);

    expect(result.extension).toBe('xlsx');
    expect(result.file.toString('utf8')).toContain(
      '&lt;unsafe &amp; value&gt;',
    );
  });
});
