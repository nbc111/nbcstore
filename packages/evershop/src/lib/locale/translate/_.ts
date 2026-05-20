declare const __EVERSHOP_TRANSLATIONS__: Record<string, string> | undefined;

function lookup(text: string): string {
  if (
    typeof __EVERSHOP_TRANSLATIONS__ !== 'undefined' &&
    __EVERSHOP_TRANSLATIONS__[text]
  ) {
    return __EVERSHOP_TRANSLATIONS__[text];
  }
  return text;
}

export function _(text: string, values?: Record<string, string>): string {
  const translated = lookup(text);
  if (!values || Object.keys(values).length === 0) {
    return translated;
  }
  const template = `${translated}`;
  return template.replace(/\${(.*?)}/g, (match, key) =>
    values[key.trim()] !== undefined ? values[key.trim()] : match
  );
}
