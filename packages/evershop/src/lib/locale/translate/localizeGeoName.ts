import { _ } from './_.js';

/** Translate country/province names from locale data files. */
export function localizeGeoName(name: string): string {
  if (!name) return name;
  return _(name);
}
