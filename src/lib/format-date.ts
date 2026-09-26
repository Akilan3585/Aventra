/**
 * Deterministic date formatting for text that is rendered on the server and
 * hydrated on the client. A fixed locale and campus time zone guarantee both
 * sides produce the same string, which `toLocaleString()` with the runtime
 * default locale does not.
 */
const campusTimeZone = "Asia/Kolkata";
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: campusTimeZone });
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: campusTimeZone, year: "numeric" });
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: campusTimeZone });

export function formatCampusDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
}

export function formatCampusDate(value: string | Date) {
  return date.format(new Date(value));
}

export function formatCampusTime(value: string | Date) {
  return time.format(new Date(value));
}
