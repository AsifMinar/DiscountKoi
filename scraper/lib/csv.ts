/**
 * Small RFC 4180 CSV reader: quoted fields, commas and line breaks inside quotes,
 * doubled quotes (""), CRLF line endings and a leading byte-order mark.
 * Pass "\t" or "|" as the delimiter for tab- or pipe-separated files.
 */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** CSV with a header row → one object per row, keyed by header name. */
export function csvToObjects(text: string, delimiter = ","): Array<Record<string, string>> {
  const [header, ...rows] = parseCsv(text, delimiter);
  if (!header) return [];
  return rows.map((row) =>
    Object.fromEntries(header.map((name, i) => [name.trim(), (row[i] ?? "").trim()])),
  );
}
