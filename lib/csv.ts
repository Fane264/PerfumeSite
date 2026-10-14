// Lightweight client-side CSV builder + download trigger. Used by admin bulk
// "Export CSV selectate" actions. Escapes per RFC 4180.

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string from a header row and body rows. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(","),
  );
  // Prepend a BOM so Excel opens UTF-8 (diacritice) correctly.
  return `﻿${lines.join("\r\n")}`;
}

/** Trigger a browser download of the given rows as a CSV file. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const blob = new Blob([toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
