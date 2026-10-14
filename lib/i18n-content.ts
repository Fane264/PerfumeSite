/**
 * Returns the localized version of a DB field.
 * Falls back to the base (RO) field if the EN version is missing/empty.
 *
 * Usage: getLocalizedField(house, "description", locale)
 *   → returns house.descriptionEn when locale === "en" and it's set,
 *     otherwise house.description.
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  locale: string,
): string {
  const enKey = `${field}En` as keyof T;
  if (locale === "en" && obj[enKey]) {
    return String(obj[enKey]);
  }
  return String(obj[field as keyof T] ?? "");
}
