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
  /** Date string in YYYY-MM-DD format, if available from the source */
  date: string | null;
}

/**
 * Parse Toggl screenshot/column-view paste into time entries.
 * Format: four sections separated by headers DESCRIPTION, DATE, PROJECT, DURATION.
 * Each section lists values in order, one per line.
 * (N) count markers in the description section are ignored.
 * @param text - raw pasted text from Toggl column view
 * @returns array of parsed entries
 */
function parseTogglColumns(text: string): ParsedEntry[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);

  const sections: Record<string, string[]> = { description: [], date: [], project: [], duration: [] };
  let current = '';

  for (const line of lines) {
    if (/^DESCRIPTION/i.test(line))      current = 'description';
    else if (/^DATE/i.test(line))        current = 'date';
    else if (/^PROJECT/i.test(line))     current = 'project';
    else if (/^DURATION/i.test(line))    current = 'duration';
    else if (current) sections[current].push(line);
  }

  const descriptions = sections.description.filter(l => !/^\(\d+\)$/.test(l));
  const dates = sections.date;
  const durations = sections.duration;

  return durations.map((duration_raw, i) => {
    const rawSeconds = parseDuration(duration_raw);
    const roundedSeconds = roundUp15(rawSeconds);
    let date: string | null = null;
    if (dates[i]) {
      const parts = dates[i].split('/');
      if (parts.length === 3) date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return {
      description: descriptions[i] || 'misc',
      duration_raw,
      duration_rounded: formatDuration(roundedSeconds),
      hours_rounded: roundedSeconds / 3600,
      date
    };
  }).filter(e => e.hours_rounded > 0);
}

/**
 * Parse Toggl's interleaved paste format, with or without per-entry dates.
 *
 * Handles two variants:
 *   Legacy (no dates):   description / project / duration
 *   With dates:          description / MM/DD/YYYY / project / duration
 *
 * @param text - raw pasted text
 * @returns array of parsed entries
 */
function parseTogglInterleaved(text: string): ParsedEntry[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const entries: ParsedEntry[] = [];
  const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;

  for (let i = 0; i < lines.length; i++) {
    if (!/^\d+:\d{2}:\d{2}$/.test(lines[i])) continue;

    const duration_raw = lines[i];

    // i-1 is always the project/client line — skip it
    let descIdx = i - 2;
    while (descIdx >= 0 && /^\(\d+\)$/.test(lines[descIdx])) descIdx--;

    let date: string | null = null;
    if (descIdx >= 0 && datePattern.test(lines[descIdx])) {
      const parts = lines[descIdx].split('/');
      date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      descIdx--;
      while (descIdx >= 0 && /^\(\d+\)$/.test(lines[descIdx])) descIdx--;
    }

    const description =
      descIdx >= 0 && !/^\d+:\d{2}:\d{2}$/.test(lines[descIdx])
        ? lines[descIdx]
        : 'misc';

    const rawSeconds = parseDuration(duration_raw);
    const roundedSeconds = roundUp15(rawSeconds);
    entries.push({
      description,
      duration_raw,
      duration_rounded: formatDuration(roundedSeconds),
      hours_rounded: roundedSeconds / 3600,
      date
    });
  }

  return entries;
}

/**
 * Parse Toggl copy/paste text into time entries.
 * @param text - raw pasted text from Toggl
 * @param columns - true to use the columnar format (DESCRIPTION/DATE/DURATION section headers);
 *                  false (default) for the legacy interleaved format
 * @returns array of parsed entries
 */
export function parseTogglPaste(text: string, columns = false): ParsedEntry[] {
  if (columns) {
    const result = parseTogglColumns(text);
    // Fall back to interleaved parser when no column headers are present
    if (result.length > 0) return result;
    return parseTogglInterleaved(text);
  }
  return parseTogglInterleaved(text);
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
  const dateIdx = header.findIndex(h => h === 'start date');

  if (descIdx === -1 || durIdx === -1) return [];

  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    const description = cols[descIdx] || 'misc';
    const duration_raw = cols[durIdx] || '0:00:00';
    const rawSeconds = parseDuration(duration_raw);
    const roundedSeconds = roundUp15(rawSeconds);
    // Toggl exports dates as MM/DD/YYYY — normalize to YYYY-MM-DD
    let date: string | null = null;
    if (dateIdx !== -1 && cols[dateIdx]) {
      const parts = cols[dateIdx].split('/');
      if (parts.length === 3) date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return {
      description,
      duration_raw,
      duration_rounded: formatDuration(roundedSeconds),
      hours_rounded: roundedSeconds / 3600,
      date
    };
  }).filter(e => e.hours_rounded > 0);
}
