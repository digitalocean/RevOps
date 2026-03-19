/**
 * All formatting uses the browser's local timezone and locale (undefined = user default).
 */

const DATE_DISPLAY: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const TIME_DISPLAY: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

const DATE_TIME_DISPLAY: Intl.DateTimeFormatOptions = {
  ...DATE_DISPLAY,
  ...TIME_DISPLAY,
};

function toDate(d: Date | string | number | null | undefined): Date | null {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalDate(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, DATE_DISPLAY);
}

export function formatLocalTime(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  return date.toLocaleTimeString(undefined, TIME_DISPLAY);
}

export function formatLocalDateTime(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  return date.toLocaleString(undefined, DATE_TIME_DISPLAY);
}

export function formatLocalMonthYear(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** Short date; omit year if it matches `sameYearAs`. */
export function formatLocalDateShort(
  d: Date | string | number | null | undefined,
  sameYearAs?: Date
): string {
  const date = toDate(d);
  if (!date) return '—';
  const omitYear = sameYearAs && date.getFullYear() === sameYearAs.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(omitYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Date from `<input type="date">` (YYYY-MM-DD) as noon local time → ISO for APIs (stable calendar day).
 */
export function localDateInputToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return `${dateStr}T12:00:00.000Z`;
  const local = new Date(y, m - 1, d, 12, 0, 0, 0);
  return local.toISOString();
}
