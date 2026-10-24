// Утилиты для номеров телефонов в международном формате E.164

// Приводит номер к международному формату E.164 (+ и цифры).
// Российские 8XXXXXXXXXX и 7XXXXXXXXXX превращаются в +7XXXXXXXXXX, остальные номера
// ожидаются с кодом страны. Пустая строка остаётся пустой.
export const normalizePhone = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!trimmed.startsWith('+') && digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    return '+7' + digits.slice(1);
  }
  return '+' + digits;
};

// Проверка номера в формате E.164: + и от 8 до 15 цифр, первая — не ноль.
export const isValidInternationalPhone = (phone: string): boolean => /^\+[1-9][0-9]{7,14}$/.test(phone);
