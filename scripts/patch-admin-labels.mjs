/**
 * Wrap admin UI string props with _() for runtime translation lookup.
 * Run: node scripts/patch-admin-labels.mjs && node scripts/sync-zh-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(root, 'packages/evershop/src/modules'),
  path.join(root, 'packages/evershop/src/components')
];

const IMPORT_LINE =
  "import { _ } from '@evershop/evershop/lib/locale/translate/_';\n";

function ensureImport(code) {
  if (code.includes("lib/locale/translate/_")) return code;
  const m = code.match(/^(import .+;\n)+/);
  if (m) return code.replace(m[0], m[0] + IMPORT_LINE);
  return IMPORT_LINE + code;
}

function patchContent(code) {
  let c = code;
  const before = c;

  // label="Text" -> label={_('Text')}  (skip if already {_)
  c = c.replace(/\blabel="([^"]+)"/g, (m, t) =>
    m.includes('{_') ? m : `label={_('${t.replace(/'/g, "\\'")}')}`
  );
  c = c.replace(/\blabel='([^']+)'/g, (m, t) =>
    m.includes('{_') ? m : `label={_('${t.replace(/'/g, "\\'")}')}`
  );

  c = c.replace(/\bplaceholder="([^"]+)"/g, (m, t) =>
    m.includes('{_') ? m : `placeholder={_('${t.replace(/'/g, "\\'")}')}`
  );
  c = c.replace(/\bplaceholder='([^']+)'/g, (m, t) =>
    m.includes('{_') ? m : `placeholder={_('${t.replace(/'/g, "\\'")}')}`
  );

  // <CardTitle>Text</CardTitle> (single line, no nested tags)
  c = c.replace(
    /<CardTitle>([^<{]+)<\/CardTitle>/g,
    (m, t) => `<CardTitle>{_('${t.trim().replace(/'/g, "\\'")}')}</CardTitle>`
  );
  c = c.replace(
    /<CardDescription>([^<{]+)<\/CardDescription>/g,
    (m, t) =>
      `<CardDescription>{_('${t.trim().replace(/'/g, "\\'")}')}</CardDescription>`
  );
  c = c.replace(
    /<DialogTitle>([^<{]+)<\/DialogTitle>/g,
    (m, t) => `<DialogTitle>{_('${t.trim().replace(/'/g, "\\'")}')}</DialogTitle>`
  );

  // SelectLabel / SelectItem text
  c = c.replace(
    /<SelectLabel>([^<{]+)<\/SelectLabel>/g,
    (m, t) => `<SelectLabel>{_('${t.trim().replace(/'/g, "\\'")}')}</SelectLabel>`
  );
  c = c.replace(
    /<SelectItem([^>]*)>([^<{]+)<\/SelectItem>/g,
    (m, attrs, t) =>
      `<SelectItem${attrs}>{_('${t.trim().replace(/'/g, "\\'")}')}</SelectItem>`
  );
  c = c.replace(
    /<SelectValue>([^<{]+)<\/SelectValue>/g,
    (m, t) => `<SelectValue>{_('${t.trim().replace(/'/g, "\\'")}')}</SelectValue>`
  );

  if (c !== before) c = ensureImport(c);
  return c;
}

function walk(dir, changed) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, changed);
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(ent.name)) continue;
    const rel = p.replace(root + path.sep, '');
    if (!rel.includes(`${path.sep}admin${path.sep}`) && !rel.includes('components/admin')) {
      continue;
    }
    const orig = fs.readFileSync(p, 'utf8');
    const next = patchContent(orig);
    if (next !== orig) {
      fs.writeFileSync(p, next);
      changed.push(p);
    }
  }
}

const changed = [];
for (const t of targets) walk(t, changed);
console.log(`Patched ${changed.length} admin UI files`);
