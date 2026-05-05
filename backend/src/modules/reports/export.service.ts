import { Injectable } from '@nestjs/common';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

interface ExportResult {
  file: Buffer;
  contentType: string;
  extension: ExportFormat;
}

@Injectable()
export class ExportService {
  toCsv(rows: Record<string, unknown>[]): ExportResult {
    const columns = this.columnsFor(rows);
    const lines = [
      columns.join(','),
      ...rows.map((row) =>
        columns.map((column) => this.csvEscape(row[column])).join(','),
      ),
    ];
    return {
      file: Buffer.from(lines.join('\n'), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      extension: 'csv',
    };
  }

  toXlsx(rows: Record<string, unknown>[]): ExportResult {
    const columns = this.columnsFor(rows);
    const header = columns
      .map((column) => `<Cell><Data ss:Type="String">${this.xmlEscape(column)}</Data></Cell>`)
      .join('');
    const body = rows
      .map((row) => {
        const cells = columns
          .map((column) => {
            const value = this.cellValue(row[column]);
            return `<Cell><Data ss:Type="String">${this.xmlEscape(value)}</Data></Cell>`;
          })
          .join('');
        return `<Row>${cells}</Row>`;
      })
      .join('');
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Report">
    <Table><Row>${header}</Row>${body}</Table>
  </Worksheet>
</Workbook>`;
    return {
      file: Buffer.from(xml, 'utf8'),
      contentType: 'application/vnd.ms-excel',
      extension: 'xlsx',
    };
  }

  toPdf(rows: Record<string, unknown>[]): ExportResult {
    const columns = this.columnsFor(rows).slice(0, 6);
    const lines = [
      'Endemigo Admin Report',
      columns.join(' | '),
      ...rows.slice(0, 80).map((row) =>
        columns.map((column) => this.cellValue(row[column])).join(' | '),
      ),
    ];
    return {
      file: this.buildSimplePdf(lines),
      contentType: 'application/pdf',
      extension: 'pdf',
    };
  }

  private columnsFor(rows: Record<string, unknown>[]) {
    const columns = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => columns.add(key));
    });
    return columns.size > 0 ? Array.from(columns) : ['empty'];
  }

  private cellValue(value: unknown) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private csvEscape(value: unknown) {
    const stringValue = this.cellValue(value);
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  private xmlEscape(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private pdfEscape(value: string) {
    return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  }

  private buildSimplePdf(lines: string[]) {
    const content = [
      'BT',
      '/F1 9 Tf',
      '40 790 Td',
      ...lines.flatMap((line, index) => [
        index === 0 ? '' : '0 -13 Td',
        `(${this.pdfEscape(line.slice(0, 120))}) Tj`,
      ]),
      'ET',
    ]
      .filter(Boolean)
      .join('\n');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += object;
    });
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }
}
