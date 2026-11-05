import { badInput } from './errors.js';

export function text(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string') return badInput(path, 'Обязательное текстовое поле');
  const result = value.trim();
  if ([...result].length < 1 || [...result].length > max)
    return badInput(path, `Длина от 1 до ${max} символов`);
  return result;
}
export function optionalText(value: unknown, path: string, max: number): string | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim()))
    return null;
  return text(value, path, max);
}
export function webUrl(value: unknown, path: string): string | null {
  const raw = optionalText(value, path, 2048);
  if (raw === null) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol))
      return badInput(path, 'Нужен абсолютный HTTP/HTTPS адрес');
    return url.toString();
  } catch {
    return badInput(path, 'Нужен абсолютный HTTP/HTTPS адрес');
  }
}
export function calendarDate(value: unknown, path: string, now: Date): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return badInput(path, 'Дата YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value > now.toISOString().slice(0, 10)
  )
    return badInput(path, 'Нужна существующая дата не в будущем');
  return date;
}
export function order(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9999)
    return badInput('sortOrder', 'Целое число от 0 до 9999');
  return value;
}
export function normalize(value: string): string {
  return value.trim().normalize('NFC').toLowerCase();
}
