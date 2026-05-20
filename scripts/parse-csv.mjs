/** Parse EverShop-style CSV (col0=key, col1=value) into a map. */
export function parseCsv(content) {
  const map = {};
  let i = 0;
  const len = content.length;

  const readField = () => {
    let field = '';
    if (content[i] === '"') {
      i += 1;
      while (i < len) {
        if (content[i] === '"') {
          if (content[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i += 1;
            break;
          }
        } else {
          field += content[i++];
        }
      }
      return field;
    }
    while (i < len && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
      field += content[i++];
    }
    return field;
  };

  while (i < len) {
    while (i < len && (content[i] === '\n' || content[i] === '\r')) i += 1;
    if (i >= len) break;
    const key = readField();
    if (i < len && content[i] === ',') i += 1;
    const value = readField();
    if (key && !key.startsWith('#')) {
      map[key] = value;
    }
    while (i < len && content[i] !== '\n' && content[i] !== '\r') i += 1;
  }
  return map;
}

export function escapeCsv(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function isValidTranslationKey(key) {
  if (!key || key.length > 400) return false;
  if (/window\.location|onAction|setDialog|onCreate|deleteFile|insertFile/.test(key)) {
    return false;
  }
  if (/^["']{2,}/.test(key) || key.includes(')}>')) return false;
  return true;
}
