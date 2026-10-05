import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['9991234567', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
  ])('%s → %s', (input, phone) => {
    expect(normalizePhone(input)).toEqual({ ok: true, phone });
  });

  it('отклоняет пустой ввод и номера других стран', () => {
    expect(normalizePhone('  ').ok).toBe(false);
    expect(normalizePhone('+44 20 7946 0958').ok).toBe(false);
    expect(normalizePhone('12345').ok).toBe(false);
  });
});

describe('formatPhone', () => {
  it('форматирует российские и белорусские номера', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67');
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67');
  });
});
