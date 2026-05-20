/**
 * Patch admin Grid.jsx files for i18n.
 * Run: node scripts/patch-admin-grids.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT = "import { _ } from '@evershop/evershop/lib/locale/translate/_';\n";

function ensureImport(code) {
  if (code.includes("lib/locale/translate/_")) return code;
  const m = code.match(/^(import .+;\n)+/);
  if (m) return code.replace(m[0], m[0] + IMPORT);
  return IMPORT + code;
}

function patchFile(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  const orig = c;

  c = c.replace(/>\s*Clear Filters\s*</g, ">{_('Clear Filters')}<");
  c = c.replace(/content: 'Are you sure\?'/g, "content: _('Are you sure?')");
  c = c.replace(
    /content: <div>Can&apos;t be undone<\/motion\.div>/g,
    "content: _('Can\\'t be undone')"
  );
  c = c.replace(
    /content: <motion\.motion>/g,
    'content: '
  );
  c = c.replace(
    /content: <div>Can&apos;t be undone<\/div>/g,
    "content: _('Can\\'t be undone')"
  );

  c = c.replace(
    /heading: `Disable \$\{selectedIds\.length\} (\w+)`/g,
    "heading: _('Disable ${count} $1', { count: String(selectedIds.length) })"
  );
  c = c.replace(
    /heading: `Enable \$\{selectedIds\.length\} (\w+)`/g,
    "heading: _('Enable ${count} $1', { count: String(selectedIds.length) })"
  );
  c = c.replace(
    /heading: `Delete \$\{selectedIds\.length\} (\w+)`/g,
    "heading: _('Delete ${count} $1', { count: String(selectedIds.length) })"
  );

  c = c.replace(/name: 'Disable'/g, "name: _('Disable')");
  c = c.replace(/name: 'Enable'/g, "name: _('Enable')");
  c = c.replace(/name: 'Delete'/g, "name: _('Delete')");

  const spans = [
    'Thumbnail',
    'Name',
    'Price',
    'Stock',
    'Status',
    'SKU',
    'Email',
    'Phone',
    'Order',
    'Total',
    'Date',
    'Coupon',
    'Code',
    'Discount',
    'Usage',
    'Type',
    'Widget',
    'Page',
    'Url',
    'URL',
    'Customer',
    'Group',
    'Attribute',
    'Collection',
    'Category',
    'Products',
    'Qty',
    'Weight',
    'Visibility',
    'Created',
    'Updated',
    'Payment',
    'Shipment',
    'Actions'
  ];
  for (const s of spans) {
    c = c.replace(new RegExp(`<span>${s}</span>`, 'g'), `<span>{_('${s}')}</span>`);
  }

  if (c !== orig) {
    fs.writeFileSync(filePath, ensureImport(c));
    return true;
  }
  return false;
}

function walk(dir, changed) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, changed);
    } else if (ent.name === 'Grid.jsx' && p.includes(`${path.sep}admin${path.sep}`)) {
      if (patchFile(p)) changed.push(p);
    }
  }
}

const changed = [];
walk(path.join(root, 'packages/evershop/src/modules'), changed);
console.log(`Patched ${changed.length} Grid.jsx files`);
