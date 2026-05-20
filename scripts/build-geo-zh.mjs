/**
 * Build geo-zh-supplement.mjs from countries.ts and provinces.ts
 * Run: node scripts/build-geo-zh.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countriesPath = path.join(
  root,
  'packages/evershop/src/lib/locale/countries.ts'
);
const provincesPath = path.join(
  root,
  'packages/evershop/src/lib/locale/provinces.ts'
);

/** Common English → 简体中文 for countries/regions */
const ZH = {
  China: '中国',
  'United States': '美国',
  'United Kingdom': '英国',
  Japan: '日本',
  'South Korea': '韩国',
  'North Korea': '朝鲜',
  'Hong Kong SAR China': '中国香港',
  'Macau SAR China': '中国澳门',
  Taiwan: '中国台湾',
  Singapore: '新加坡',
  Malaysia: '马来西亚',
  Thailand: '泰国',
  Vietnam: '越南',
  India: '印度',
  Australia: '澳大利亚',
  Canada: '加拿大',
  Germany: '德国',
  France: '法国',
  Italy: '意大利',
  Spain: '西班牙',
  Russia: '俄罗斯',
  Brazil: '巴西',
  Mexico: '墨西哥',
  // China provinces
  Anhui: '安徽省',
  Beijing: '北京市',
  Chongqing: '重庆市',
  Fujian: '福建省',
  Gansu: '甘肃省',
  Guangdong: '广东省',
  Guangxi: '广西壮族自治区',
  Guizhou: '贵州省',
  Hainan: '海南省',
  Hebei: '河北省',
  Heilongjiang: '黑龙江省',
  Henan: '河南省',
  Hubei: '湖北省',
  Hunan: '湖南省',
  Jiangsu: '江苏省',
  Jiangxi: '江西省',
  Jilin: '吉林省',
  Liaoning: '辽宁省',
  'Nei Mongol': '内蒙古自治区',
  Ningxia: '宁夏回族自治区',
  Qinghai: '青海省',
  Shaanxi: '陕西省',
  Shandong: '山东省',
  Shanghai: '上海市',
  Shanxi: '山西省',
  Sichuan: '四川省',
  Tianjin: '天津市',
  Xinjiang: '新疆维吾尔自治区',
  Xizang: '西藏自治区',
  Yunnan: '云南省',
  Zhejiang: '浙江省'
};

function extractNames(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return [...content.matchAll(/name: '([^'\\]*(?:\\.[^'\\]*)*)'/g)].map(
    (m) => m[1].replace(/\\'/g, "'")
  );
}

const names = new Set([
  ...extractNames(countriesPath),
  ...extractNames(provincesPath)
]);

const entries = {};
for (const name of names) {
  entries[name] = ZH[name] || name;
}

const lines = [
  '/** Auto-generated geo names — run: node scripts/build-geo-zh.mjs */',
  'export default {',
  ...Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([en, zh]) => {
      const ek = en.includes("'") ? `"${en.replace(/"/g, '\\"')}"` : `'${en}'`;
      const vk = zh.includes("'") ? `"${zh.replace(/"/g, '\\"')}"` : `'${zh}'`;
      return zh === en ? `  ${ek}: ${ek},` : `  ${ek}: ${vk},`;
    }),
  '};',
  ''
];

const outPath = path.join(root, 'scripts/geo-zh-supplement.mjs');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${Object.keys(entries).length} geo entries to scripts/geo-zh-supplement.mjs`);
