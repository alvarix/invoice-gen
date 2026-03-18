/**
 * Round a duration in seconds up to the nearest 15 minutes.
 * @param totalSeconds - raw duration in seconds
 * @returns rounded duration in seconds
 */
function roundUp15(totalSeconds: number): number {
  const fifteenMin = 15 * 60;
  return Math.ceil(totalSeconds / fifteenMin) * fifteenMin;
}

/**
 * Parse a duration string "h:mm:ss" or "h:mm" into total seconds.
 * @param raw - duration string from Toggl
 * @returns total seconds
 */
function parseDuration(raw: string): number {
  const parts = raw.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return 0;
}

/**
 * Format seconds as "h:mm".
 * @param totalSeconds - duration in seconds
 * @returns formatted string
 */
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export interface ParsedEntry {
  description: string;
  duration_raw: string;
  duration_rounded: string;
  hours_rounded: number;
}

/**
 * Parse Toggl copy/paste text into time entries.
 * Format alternates: description line, duration line, repeat.
 * Keeps prefixes (e.g. "2: design") as-is.
 * @param text - raw pasted text from Toggl
 * @returns array of parsed entries
 */
export function parseTogglPaste(text: string): ParsedEntry[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const entries: ParsedEntry[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isDuration = /^\d+:\d{2}(:\d{2})?$/.test(line);

    if (!isDuration && lines[i + 1] && /^\d+:\d{2}(:\d{2})?$/.test(lines[i + 1])) {
      const description = line || 'misc';
      const duration_raw = lines[i + 1];
      const rawSeconds = parseDuration(duration_raw);
      const roundedSeconds = roundUp15(rawSeconds);
      entries.push({
        description,
        duration_raw,
        duration_rounded: formatDuration(roundedSeconds),
        hours_rounded: roundedSeconds / 3600
      });
      i += 2;
    } else if (isDuration) {
      const rawSeconds = parseDuration(line);
      const roundedSeconds = roundUp15(rawSeconds);
      entries.push({
        description: 'misc',
        duration_raw: line,
        duration_rounded: formatDuration(roundedSeconds),
        hours_rounded: roundedSeconds / 3600
      });
      i += 1;
    } else {
      i += 1;
    }
  }

  return entries;
}

/**
 * Split a single CSV line respecting double-quoted fields that may contain commas.
 * e.g. `"deploy, staging","1:00:00"` → ["deploy, staging", "1:00:00"]
 * @param line - raw CSV line
 * @returns array of field values with quotes stripped
 */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse Toggl CSV export text into time entries.
 * Expects columns: Description, Duration (h:mm:ss).
 * Handles quoted fields containing commas.
 * @param csvText - raw CSV string
 * @returns array of parsed entries
 */
export function parseTogglCSV(csvText: string): ParsedEntry[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = splitCSVLine(lines[0]).map(h => h.toLowerCase());
  const descIdx = header.findIndex(h => h === 'description');
  const durIdx = header.findIndex(h => h === 'duration');

  if (descIdx === -1 || durIdx === -1) return [];

  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    const description = cols[descIdx] || 'misc';
    const duration_raw = cols[durIdx] || '0:00:00';
    const rawSeconds = parseDuration(duration_raw);
    const roundedSeconds = roundUp15(rawSeconds);
    return {
      description,
      duration_raw,
      duration_rounded: formatDuration(roundedSeconds),
      hours_rounded: roundedSeconds / 3600
    };
  }).filter(e => e.hours_rounded > 0);
}
