import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patchIndex(file) {
  let c = fs.readFileSync(file, 'utf8');
  if (c.includes("from '") && c.includes('translate/translate.js')) return false;
  const parts = file.split(path.sep);
  const srcIdx = parts.indexOf('src');
  const depth = parts.length - srcIdx - 2;
  const rel = `${'../'.repeat(depth)}lib/locale/translate/translate.js`;
  const importLine = `import { translate } from '${rel}';\n`;
  const importMatch = c.match(/^import .+;\n/m);
  if (importMatch) {
    c = c.replace(importMatch[0], importMatch[0] + importLine);
  } else {
    c = importLine + c;
  }
  c = c.replace(/title:\s*'([^']+)'/g, "title: translate('$1')");
  c = c.replace(/description:\s*'([^']+)'/g, "description: translate('$1')");
  fs.writeFileSync(file, c);
  return true;
}

function patchJsx(file) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes("title: '") && !c.includes('label="')) return false;
  let changed = false;
  if (!c.includes("lib/locale/translate/_")) {
    const importLine =
      "import { _ } from '@evershop/evershop/lib/locale/translate/_';\n";
    const m = c.match(/^import .+;\n/m);
    if (m) {
      c = c.replace(m[0], m[0] + importLine);
      changed = true;
    }
  }
  const next = c
    .replace(/title:\s*'([^']+)'/g, "title: _('$1')")
    .replace(/name:\s*'([^']+)'/g, (m, p1) =>
      ['Catalog', 'Orders', 'Customers', 'Pages', 'Widgets', 'Dashboard'].includes(p1)
        ? `name: _('${p1}')`
        : m
    );
  if (next !== c) changed = true;
  c = next;
  if (changed) fs.writeFileSync(file, c);
  return changed;
}

let n = 0;
for (const dir of [
  path.join(root, 'packages/evershop/src/modules'),
  path.join(root, 'packages/evershop/src/components')
]) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!ent.isFile()) continue;
    const file = path.join(ent.parentPath ?? ent.path, ent.name);
    if (!file.includes(`${path.sep}admin${path.sep}`)) continue;
    if (file.endsWith('index.ts') && patchIndex(file)) n++;
    if ((file.endsWith('.jsx') || file.endsWith('.tsx')) && patchJsx(file)) n++;
  }
}

console.log(`Patched ${n} admin files`);
