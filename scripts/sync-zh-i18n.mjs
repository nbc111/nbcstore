/**
 * Merge existing translations/zh/*.csv and fill missing keys used by _() / translate().
 * Run from repo root: node scripts/sync-zh-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminZhSupplement from './admin-zh-supplement.mjs';
import geoZhSupplement from './geo-zh-supplement.mjs';
import { escapeCsv, isValidTranslationKey, parseCsv } from './parse-csv.mjs';
import zhSupplement from './zh-supplement.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zhDir = path.join(root, 'translations', 'zh');
const re = /_\(\s*['"]([^'"]+)['"]/g;
const translateRe = /translate\(\s*['"]([^'"]+)['"]/g;

const ZH = {
  // Admin & navigation
  'Admin Login': '管理员登录',
  Dashboard: '控制台',
  Catalog: '商品目录',
  Products: '商品',
  Categories: '分类',
  Collections: '商品集',
  Attributes: '属性',
  Orders: '订单',
  Customers: '客户列表',
  Pages: '页面',
  Widgets: '小部件',
  Coupons: '优惠券列表',
  'Cms pages': 'CMS 页面',
  'Create a new product': '新建商品',
  'Create a new category': '新建分类',
  'Create a new collection': '新建商品集',
  'Create a new attribute': '新建属性',
  'Create a new widget': '新建小部件',
  'Create a new cms page': '新建 CMS 页面',
  'Create a new coupon': '新建优惠券',
  'Store Setting': '店铺设置',
  'Payment Setting': '支付设置',
  'Shipping Setting': '配送设置',
  'Tax Setting': '税费设置',
  Cancel: '取消',
  Delete: '删除',
  Enable: '启用',
  Disable: '禁用',
  'Mark as shipped': '标记为已发货',
  Save: '保存',
  Edit: '编辑',
  Search: '搜索',
  Filter: '筛选',
  Actions: '操作',
  Status: '状态',
  Name: '名称',
  SKU: 'SKU',
  Price: '价格',
  Quantity: '数量',
  Total: '合计',
  Subtotal: '小计',
  Tax: '税费',
  Shipping: '运费',
  Discount: '折扣',
  'Email is required': '请填写邮箱',
  'Password is required': '请填写密码',
  'SIGN IN': '登录',
  // Storefront (supplement common keys)
  'Add to cart': '加入购物车',
  'Shopping cart': '购物车',
  Checkout: '结账',
  'Continue shopping': '继续购物',
  'No data available': '暂无数据',
  '${field} is required': '请填写${field}',
  'Please enter a valid email address': '请输入有效的邮箱地址',
  'Saved successfully!': '保存成功！',
  'Something went wrong! Please try again.': '出错了，请重试。',
  'Cart is not initialized': '购物车未初始化',
  'Product is out of stock': '商品已售罄',
  'Invalid quantity': '数量无效',
  'Coupon applied successfully!': '优惠券已应用',
  'Coupon removed successfully!': '优惠券已移除',
  'Please enter a coupon code': '请输入优惠码',
  'Failed to apply coupon': '应用优惠券失败',
  'No coupon to remove': '没有可移除的优惠券',
  'Failed to remove coupon': '移除优惠券失败',
  'Invalid coupon': '无效的优惠券',
  'Coupon code is required': '请填写优惠码',
  'A coupon is already applied': '已应用优惠券',
  'Processing Payment...': '正在处理付款…',
  'Please enter a valid URL': '请输入有效的 URL',
  'Password must be at least ${minLength} characters long':
    '密码至少需要 ${minLength} 个字符',
  'Value must be at least ${min}': '值不能小于 ${min}',
  'Value must be at most ${max}': '值不能大于 ${max}',
  'Value must be a whole number': '必须是整数',
  'File size must be less than ${maxSize}': '文件大小不能超过 ${maxSize}',
  'Date must be after ${min}': '日期必须晚于 ${min}',
  'Date must be before ${max}': '日期必须早于 ${max}',
  'Date and time must be after ${min}': '日期时间必须晚于 ${min}',
  'Date and time must be before ${max}': '日期时间必须早于 ${max}',
  'Time must be after ${min}': '时间必须晚于 ${min}',
  'Time must be before ${max}': '时间必须早于 ${max}'
};

function walk(dir, keys) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, keys);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      const c = fs.readFileSync(p, 'utf8');
      let m;
      while ((m = re.exec(c))) keys.add(m[1]);
      while ((m = translateRe.exec(c))) keys.add(m[1]);
    }
  }
}

function loadExisting() {
  const map = {};
  if (!fs.existsSync(zhDir)) fs.mkdirSync(zhDir, { recursive: true });
  for (const file of fs.readdirSync(zhDir).filter((f) => f.endsWith('.csv'))) {
    const parsed = parseCsv(fs.readFileSync(path.join(zhDir, file), 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidTranslationKey(key) && isValidTranslationKey(value)) {
        map[key] = value;
      }
    }
  }
  return map;
}

const keys = new Set();
walk(path.join(root, 'packages', 'evershop', 'src'), keys);
walk(path.join(root, 'extensions'), keys);

const merged = loadExisting();
for (const [en, zh] of Object.entries({
  ...ZH,
  ...zhSupplement,
  ...adminZhSupplement,
  ...geoZhSupplement
}))
  merged[en] = zh;

let missing = 0;
for (const key of keys) {
  if (!isValidTranslationKey(key)) continue;
  if (!merged[key]) {
    merged[key] = key;
    missing += 1;
  }
}

// Drop corrupted keys from previous bad codemod runs
for (const key of Object.keys(merged)) {
  if (!isValidTranslationKey(key)) {
    delete merged[key];
  }
}

const lines = Object.entries(merged)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([en, zh]) => `${escapeCsv(en)},${escapeCsv(zh)}`);

fs.writeFileSync(path.join(zhDir, 'i18n.csv'), lines.join('\n') + '\n', 'utf8');
console.log(`translations/zh/i18n.csv: ${lines.length} entries (${missing} keys still English — extend ZH in scripts/sync-zh-i18n.mjs)`);
