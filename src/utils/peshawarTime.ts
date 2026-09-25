/**
 * Peshawar, Pakistan Time & Date Utilities (Asia/Karachi, UTC+5)
 * Ensures that the system accurately identifies year, month, day, hours, minutes, and seconds
 * according to Pakistan Standard Time (PST / PKT) regardless of user/browser local timezone.
 */

export interface PeshawarDateTimeComponents {
  year: number;
  monthIndex: number; // 0 = Jan, 8 = Sep, 11 = Dec
  monthName: string;
  day: number;
  dayOfWeek: string;
  hours: number; // 0-23
  minutes: number;
  seconds: number;
  time12: string; // e.g. "02:30:45 PM"
  time24: string; // e.g. "14:30:45"
  dateFormatted: string; // e.g. "23 September 2026"
  fullDisplay: string; // e.g. "Wednesday, 23 September 2026 • 02:30:45 PM PKT"
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Get accurate current date and time components in Peshawar, Pakistan (Asia/Karachi)
 */
export function getPeshawarComponents(baseDate?: Date | string | number | null): PeshawarDateTimeComponents {
  const d = baseDate ? new Date(baseDate) : new Date();
  const safeDate = isNaN(d.getTime()) ? new Date() : d;

  // Format using Intl with Asia/Karachi timezone
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(safeDate);
    const lookup: Record<string, string> = {};
    for (const part of parts) {
      lookup[part.type] = part.value;
    }

    const year = parseInt(lookup.year, 10);
    const monthNum = parseInt(lookup.month, 10); // 1-12
    const monthIndex = monthNum - 1; // 0-11
    const day = parseInt(lookup.day, 10);
    const dayOfWeek = lookup.weekday || DAY_NAMES[safeDate.getDay()];
    const hours = parseInt(lookup.hour, 10) % 24;
    const minutes = parseInt(lookup.minute, 10);
    const seconds = parseInt(lookup.second, 10);

    const monthName = MONTH_NAMES[monthIndex] || 'September';

    // 12-hour format calculation
    const h12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const pad = (n: number) => String(n).padStart(2, '0');

    const time12 = `${pad(h12)}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
    const time24 = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const dateFormatted = `${day} ${monthName} ${year}`;
    const fullDisplay = `${dayOfWeek}, ${dateFormatted} • ${time12} PKT`;

    return {
      year,
      monthIndex,
      monthName,
      day,
      dayOfWeek,
      hours,
      minutes,
      seconds,
      time12,
      time24,
      dateFormatted,
      fullDisplay,
    };
  } catch {
    // Fallback if Intl timeZone fails
    const utcTime = safeDate.getTime() + safeDate.getTimezoneOffset() * 60000;
    const pktTime = new Date(utcTime + 5 * 3600000); // UTC + 5 hours for Pakistan
    const year = pktTime.getFullYear();
    const monthIndex = pktTime.getMonth();
    const monthName = MONTH_NAMES[monthIndex];
    const day = pktTime.getDate();
    const dayOfWeek = DAY_NAMES[pktTime.getDay()];
    const hours = pktTime.getHours();
    const minutes = pktTime.getMinutes();
    const seconds = pktTime.getSeconds();

    const h12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const pad = (n: number) => String(n).padStart(2, '0');
    const time12 = `${pad(h12)}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
    const time24 = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const dateFormatted = `${day} ${monthName} ${year}`;
    const fullDisplay = `${dayOfWeek}, ${dateFormatted} • ${time12} PKT`;

    return {
      year,
      monthIndex,
      monthName,
      day,
      dayOfWeek,
      hours,
      minutes,
      seconds,
      time12,
      time24,
      dateFormatted,
      fullDisplay,
    };
  }
}

/**
 * Get current Pakistan/Peshawar Date object (shifted to PKT UTC+5 representation)
 */
export function getPeshawarCurrentDate(): Date {
  const comp = getPeshawarComponents();
  return new Date(comp.year, comp.monthIndex, comp.day, comp.hours, comp.minutes, comp.seconds);
}

/**
 * Format an input date string or timestamp in Peshawar locale
 */
export function formatToPeshawarDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  const comp = getPeshawarComponents(parsed);
  return `${comp.day} ${comp.monthName} ${comp.year}`;
}
