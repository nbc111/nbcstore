/**
 * Update storefront CMS, catalog, and widgets to Simplified Chinese in an existing database.
 * Run: node scripts/update-zh-storefront-content.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const seedDir = join(root, 'packages/evershop/src/bin/seed/data');

loadEnv({ path: join(root, '.env') });

const pages = JSON.parse(readFileSync(join(seedDir, 'pages.json'), 'utf-8'));
const widgets = JSON.parse(readFileSync(join(seedDir, 'widgets.json'), 'utf-8'));
const categories = JSON.parse(
  readFileSync(join(seedDir, 'categories.json'), 'utf-8')
);
const attributes = JSON.parse(
  readFileSync(join(seedDir, 'attributes.json'), 'utf-8')
);
const productNames = JSON.parse(
  readFileSync(join(seedDir, 'products-zh-names.json'), 'utf-8')
);

const colorOptionMap = {
  Black: '黑色',
  White: '白色',
  Red: '红色',
  Blue: '蓝色',
  Green: '绿色',
  Yellow: '黄色',
  Pink: '粉色',
  Gray: '灰色',
  Navy: '藏青',
  Beige: '米色'
};

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl:
    process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

async function updatePages() {
  for (const page of pages) {
    const res = await client.query(
      `UPDATE cms_page_description
       SET name = $1,
           content = $2,
           meta_title = $3,
           meta_keywords = $4,
           meta_description = $5
       WHERE url_key = $6`,
      [
        page.name,
        JSON.stringify(page.content),
        page.meta_title,
        page.meta_keywords ?? null,
        page.meta_description ?? null,
        page.url_key
      ]
    );
    if (res.rowCount === 0) {
      console.warn(`  ⊘ No cms_page_description for url_key: ${page.url_key}`);
    } else {
      console.log(`  ✓ Updated page: ${page.url_key}`);
    }
  }
}

async function updateWidgets() {
  const legacyNames = {
    主菜单: ['Main menu'],
    首页轮播: ['Homepage Slideshow'],
    精选商品: ['Featured Products']
  };

  for (const widget of widgets) {
    const names = [widget.name, ...(legacyNames[widget.name] || [])];
    let updated = false;
    for (const name of names) {
      const res = await client.query(
        `UPDATE widget
         SET name = $1, settings = $2
         WHERE type = $3 AND name = $4`,
        [widget.name, JSON.stringify(widget.settings), widget.type, name]
      );
      if (res.rowCount > 0) {
        console.log(`  ✓ Updated widget: ${name} → ${widget.name}`);
        updated = true;
        break;
      }
    }
    if (!updated) {
      console.warn(`  ⊘ Widget not found: ${widget.name} (${widget.type})`);
    }
  }
}

async function updateCategories() {
  for (const category of categories) {
    const res = await client.query(
      `UPDATE category_description
       SET name = $1,
           description = $2,
           meta_title = $3,
           meta_keywords = $4,
           meta_description = $5
       WHERE url_key = $6`,
      [
        category.name,
        JSON.stringify(category.description),
        category.meta_title,
        category.meta_keywords ?? null,
        category.meta_description ?? null,
        category.url_key
      ]
    );
    if (res.rowCount === 0) {
      console.warn(`  ⊘ No category for url_key: ${category.url_key}`);
    } else {
      console.log(`  ✓ Updated category: ${category.url_key}`);
    }
  }
}

async function updateAttributes() {
  for (const attr of attributes) {
    const attrRes = await client.query(
      `UPDATE attribute
       SET attribute_name = $1
       WHERE attribute_code = $2`,
      [attr.attribute_name, attr.attribute_code]
    );
    if (attrRes.rowCount === 0) {
      console.warn(`  ⊘ Attribute not found: ${attr.attribute_code}`);
      continue;
    }
    console.log(`  ✓ Updated attribute: ${attr.attribute_code}`);

    if (attr.attribute_code === 'color') {
      for (const [en, zh] of Object.entries(colorOptionMap)) {
        const optRes = await client.query(
          `UPDATE attribute_option ao
           SET option_text = $1
           FROM attribute a
           WHERE ao.attribute_id = a.attribute_id
             AND a.attribute_code = 'color'
             AND ao.option_text = $2`,
          [zh, en]
        );
        if (optRes.rowCount > 0) {
          await client.query(
            `UPDATE product_attribute_value_index pavi
             SET option_text = $1
             FROM attribute a
             WHERE pavi.attribute_id = a.attribute_id
               AND a.attribute_code = 'color'
               AND pavi.option_text = $2`,
            [zh, en]
          );
        }
      }
    }
  }
}

async function updateProductNames() {
  for (const [sku, name] of Object.entries(productNames)) {
    const res = await client.query(
      `UPDATE product_description pd
       SET name = $1::varchar,
           meta_title = $1::text
       FROM product p
       WHERE pd.product_description_product_id = p.product_id
         AND p.sku = $2`,
      [name, sku]
    );
    if (res.rowCount === 0) {
      console.warn(`  ⊘ Product not found: ${sku}`);
    } else {
      console.log(`  ✓ Updated product: ${sku}`);
    }
  }
}

async function updateCollections() {
  for (const collection of JSON.parse(
    readFileSync(join(seedDir, 'collections.json'), 'utf-8')
  )) {
    const res = await client.query(
      `UPDATE collection SET name = $1, description = $2 WHERE code = $3`,
      [collection.name, JSON.stringify(collection.description), collection.code]
    );
    if (res.rowCount === 0) {
      console.warn(`  ⊘ No collection for code: ${collection.code}`);
    } else {
      console.log(`  ✓ Updated collection: ${collection.code}`);
    }
  }
}

async function upsertSetting(name, value) {
  const existing = await client.query(
    `SELECT setting_id FROM setting WHERE name = $1`,
    [name]
  );
  if (existing.rowCount > 0) {
    await client.query(`UPDATE setting SET value = $1 WHERE name = $2`, [
      value,
      name
    ]);
  } else {
    await client.query(
      `INSERT INTO setting (name, value, is_json) VALUES ($1, $2, false)`,
      [name, value]
    );
  }
  console.log(`  ✓ Setting ${name}`);
}

async function updatePaymentDisplayNames() {
  await upsertSetting('codDisplayName', '货到付款');
  await upsertSetting('stripeDisplayName', 'Stripe 支付');
  await upsertSetting('paypalDisplayName', 'PayPal');
}

async function updateStoreSettings() {
  await upsertSetting('storeName', 'NBCStore');
}

async function main() {
  await client.connect();
  console.log('Updating CMS pages…');
  await updatePages();
  console.log('Updating widgets…');
  await updateWidgets();
  console.log('Updating categories…');
  await updateCategories();
  console.log('Updating collections…');
  await updateCollections();
  console.log('Updating attributes…');
  await updateAttributes();
  console.log('Updating product names…');
  await updateProductNames();
  console.log('Updating payment display names…');
  await updatePaymentDisplayNames();
  console.log('Updating store settings…');
  await updateStoreSettings();
  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
