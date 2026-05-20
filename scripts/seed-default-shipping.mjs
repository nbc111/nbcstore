/**
 * Seed default shipping zone + method when none exist (required for checkout).
 * Run: node scripts/seed-default-shipping.mjs
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

loadEnv({ path: join(root, '.env') });

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl:
    process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

/** @type {{ name: string; country: string; methodName: string; cost: string }[]} */
const DEFAULT_ZONES = [
  {
    name: '中国大陆',
    country: 'CN',
    methodName: '标准快递',
    cost: '12.0000'
  },
  {
    name: '香港',
    country: 'HK',
    methodName: '标准快递（香港）',
    cost: '25.0000'
  },
  {
    name: '澳门',
    country: 'MO',
    methodName: '标准快递（澳门）',
    cost: '25.0000'
  }
];

async function ensureShippingMethod(methodName) {
  const existing = await client.query(
    `SELECT shipping_method_id FROM shipping_method WHERE name = $1`,
    [methodName]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].shipping_method_id;
  }
  const inserted = await client.query(
    `INSERT INTO shipping_method (name) VALUES ($1) RETURNING shipping_method_id`,
    [methodName]
  );
  return inserted.rows[0].shipping_method_id;
}

async function ensureZone({ name, country, methodName, cost }) {
  const zoneExisting = await client.query(
    `SELECT shipping_zone_id FROM shipping_zone WHERE country = $1 AND name = $2`,
    [country, name]
  );

  let zoneId;
  if (zoneExisting.rowCount > 0) {
    zoneId = zoneExisting.rows[0].shipping_zone_id;
    console.log(`  ⊘ Zone already exists: ${name} (${country})`);
  } else {
    const zone = await client.query(
      `INSERT INTO shipping_zone (name, country) VALUES ($1, $2) RETURNING shipping_zone_id`,
      [name, country]
    );
    zoneId = zone.rows[0].shipping_zone_id;
    console.log(`  ✓ Created zone: ${name} (${country})`);
  }

  const methodId = await ensureShippingMethod(methodName);

  const link = await client.query(
    `SELECT shipping_zone_method_id FROM shipping_zone_method
     WHERE zone_id = $1 AND method_id = $2`,
    [zoneId, methodId]
  );

  if (link.rowCount > 0) {
    await client.query(
      `UPDATE shipping_zone_method
       SET is_enabled = true, cost = $3, condition_type = NULL, calculate_api = NULL
       WHERE zone_id = $1 AND method_id = $2`,
      [zoneId, methodId, cost]
    );
    console.log(`  ✓ Updated zone method: ${methodName} → ${name}`);
  } else {
    await client.query(
      `INSERT INTO shipping_zone_method (zone_id, method_id, is_enabled, cost)
       VALUES ($1, $2, true, $3)`,
      [zoneId, methodId, cost]
    );
    console.log(`  ✓ Linked method: ${methodName} → ${name} (¥${parseFloat(cost)})`);
  }
}

async function main() {
  await client.connect();

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM shipping_zone`
  );
  if (rows[0].n > 0) {
    console.log(
      `Shipping zones already configured (${rows[0].n}). Skipping default seed.`
    );
    console.log(
      'To re-seed, delete rows from shipping_zone / shipping_method first.'
    );
    await client.end();
    return;
  }

  console.log('Seeding default shipping zones…');
  for (const zone of DEFAULT_ZONES) {
    await ensureZone(zone);
  }

  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
