/**
 * Lightweight CSV / Excel / PDF export helpers.
 *
 * - `exportCSV` — generic CSV using `Blob` + `URL.createObjectURL`.
 * - `exportXLSX` — same CSV but with `application/vnd.ms-excel` mime so
 *   Excel opens it correctly.
 * - `exportPDF` — uses jsPDF + autoTable to render a table-like layout.
 *
 * All helpers are tree-shakeable and don't pull heavyweight libs at import
 * time. jspdf / jspdf-autotable are dynamically imported on first use.
 */
import { saveAs } from 'file-saver';

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  /** Optional value extractor (overrides `key` access). */
  get?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  width?: number;
}

const escapeCsv = (val: unknown): string => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const exportCSV = <T extends object>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void => {
  const head = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const val = c.get ? c.get(r) : (r as Record<string, unknown>)[c.key as string];
          return escapeCsv(val);
        })
        .join(','),
    )
    .join('\n');
  const csv = `${head}\n${body}`;
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8',
  });
  saveAs(blob, `${filename}.csv`);
};

export const exportXLSX = <T extends object>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void => {
  const head = columns.map((c) => escapeCsv(c.header)).join('\t');
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const val = c.get ? c.get(r) : (r as Record<string, unknown>)[c.key as string];
          return escapeCsv(val);
        })
        .join('\t'),
    )
    .join('\n');
  const tsv = `${head}\n${body}`;
  const blob = new Blob(['\uFEFF' + tsv], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  saveAs(blob, `${filename}.xls`);
};

export const exportPDF = async <T extends object>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title = filename,
): Promise<void> => {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (
    autoTableMod as unknown as {
      default: (doc: unknown, options: unknown) => void;
    }
  ).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title, 40, 40);

  autoTable(doc, {
    startY: 60,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) =>
      columns.map((c) => {
        const val = c.get
          ? c.get(r)
          : (r as Record<string, unknown>)[c.key as string];
        return val == null ? '' : String(val);
      }),
    ),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  doc.save(`${filename}.pdf`);
};