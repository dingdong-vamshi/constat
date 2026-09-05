export const number = (v: number, digits = 2) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(v);
export const money = (v: number) => `₹${number(v)}`;
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shiftDay(day: string, offset: number) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const displayDate = (day: string) =>
  new Date(day + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const shortDate = (day: string) =>
  new Date(day + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export const inRange = (day: string, from: string, to: string) =>
  (!from || day >= from) && (!to || day <= to);
