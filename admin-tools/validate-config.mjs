#!/usr/bin/env node
// Đối chiếu admin/config.yml với schema.ts (Zod) và (tùy chọn) với JSON schema chính thức của Sveltia.
// Chạy từ gốc repo: node admin-tools/validate-config.mjs
// Tùy chọn: [--schema src/content.config.ts] [--config public/admin/config.yml] [--content src/content] [--deps node_modules]
// Thoát mã 0 = khớp, 1 = có lỗi. Cảnh báo (WARN) không làm hỏng kết quả.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const schemaTs = path.resolve(arg('schema', path.join(here, '../src/content.config.ts')));
const configYml = path.resolve(arg('config', path.join(here, '../public/admin/config.yml')));
const contentDir = path.resolve(arg('content', path.join(here, '../src/content')));
const depsDir = path.resolve(arg('deps', path.join(here, '../node_modules')));

const req = createRequire(path.join(depsDir, 'noop.js'));
const zodPath = req.resolve('zod');
const YAML = req('yaml');

// ---- nạp schema.ts với bản giả của astro:content ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfgcheck-'));
const stub = `import { z } from ${JSON.stringify(pathToFileURL(zodPath).href)};
export { z };
export const defineCollection = (x) => x;
export const reference = (n) => z.string().describe('REF:' + n);
export const glob = (o) => o;
`;
fs.writeFileSync(path.join(tmp, 'stub.mjs'), stub);
let src = fs.readFileSync(schemaTs, 'utf8')
  .replace(/import\s*\{[^}]*\}\s*from\s*'astro:content';/, "import { defineCollection, reference } from './stub.mjs';")
  .replace(/import\s*\{[^}]*\}\s*from\s*'astro\/zod';/, "import { z } from './stub.mjs';")
  .replace(/import\s*\{[^}]*\}\s*from\s*'astro\/loaders';/, "import { glob } from './stub.mjs';");
fs.writeFileSync(path.join(tmp, 'schema.ts'), src);
const mod = await import(pathToFileURL(path.join(tmp, 'schema.ts')).href);
const collections = mod.collections;

// ---- mô tả trường Zod ----
function describe(z) {
  let optional = false, nullable = false, hasDefault = false, ref = null, cur = z;
  for (let i = 0; i < 10; i++) {
    const t = cur.def.type;
    if (cur.description?.startsWith('REF:')) ref = cur.description.slice(4);
    if (t === 'optional') { optional = true; cur = cur.def.innerType; }
    else if (t === 'nullable') { nullable = true; cur = cur.def.innerType; }
    else if (t === 'default' || t === 'prefault') { hasDefault = true; cur = cur.def.innerType; }
    else break;
  }
  if (cur.description?.startsWith('REF:')) ref = cur.description.slice(4);
  const t = cur.def.type;
  const info = { optional: optional || hasDefault, nullable, kind: t, ref };
  if (t === 'object') info.shape = cur.def.shape;
  else if (t === 'array') info.elem = describe(cur.def.element);
  else if (t === 'enum') info.values = Object.values(cur.def.entries);
  else if (t === 'literal') info.values = cur.def.values;
  else if (t === 'number') info.int = cur.format === 'safeint' || cur.isInt === true;
  return info;
}
// Làm phẳng thành {path: info}; mảng object -> "links[].url"
function flatten(shape, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(shape)) {
    const p = prefix + k, d = describe(v);
    out[p] = d;
    if (d.kind === 'object') flatten(d.shape, p + '.', out);
    if (d.kind === 'array' && d.elem.kind === 'object') flatten(d.elem.shape, p + '[].', out);
  }
  return out;
}

// ---- cấu hình Sveltia ----
const cfg = YAML.parse(fs.readFileSync(configYml, 'utf8'));
function flattenCfg(fields, prefix = '', out = {}) {
  for (const f of fields || []) {
    const p = prefix + f.name;
    out[p] = f;
    if (f.widget === 'object') flattenCfg(f.fields, p + '.', out);
    if (f.widget === 'list' && f.fields) flattenCfg(f.fields, p + '[].', out);
  }
  return out;
}

const errors = [], warns = [];
const E = (c, m) => errors.push(`[${c}] ${m}`);
const W = (c, m) => warns.push(`[${c}] ${m}`);

const cfgByName = Object.fromEntries((cfg.collections || []).map(c => [c.name, c]));
for (const name of Object.keys(cfgByName)) if (!collections[name]) E(name, 'collection có trong config.yml nhưng KHÔNG có trong schema.ts');

let fieldCount = 0;
for (const [name, def] of Object.entries(collections)) {
  const c = cfgByName[name];
  if (!c) { E(name, 'collection có trong schema.ts nhưng THIẾU trong config.yml'); continue; }
  const zshape = def.schema.def.shape;
  const zf = flatten(zshape);
  const fields = c.files ? c.files[0]?.fields : c.fields;
  const cf = flattenCfg(fields);
  // thư mục / file khớp loader
  const base = def.loader?.base?.replace(/^\.\//, '');
  if (c.folder && base && c.folder !== base) E(name, `folder "${c.folder}" khác loader base "${base}"`);
  if (c.files && base) {
    const want = path.posix.join(base, def.loader.pattern);
    if (c.files[0].file !== want) E(name, `file "${c.files[0].file}" khác loader "${want}"`);
  }
  // body của trang markdown
  const isMd = (c.extension === 'md');
  for (const p of Object.keys(zf)) {
    fieldCount++;
    if (!cf[p]) { E(name, `schema có "${p}" nhưng config.yml THIẾU`); continue; }
    const z = zf[p], f = cf[p];
    const w = f.widget;
    const okKind = {
      string: () => ['string', 'text'].includes(w) || (w === 'markdown') || (w === 'image') || (w === 'select' && !f.multiple) || (w === 'relation' && !f.multiple),
      number: () => w === 'number',
      boolean: () => w === 'boolean',
      enum: () => w === 'select' && !f.multiple,
      literal: () => ['string', 'boolean'].includes(w),
      object: () => w === 'object',
      array: () => w === 'list' || (w === 'select' && f.multiple) || (w === 'relation' && f.multiple),
    }[z.kind];
    if (!okKind) W(name, `"${p}": kiểu Zod "${z.kind}" chưa có quy tắc đối chiếu widget`);
    else if (!okKind()) E(name, `"${p}": schema kiểu ${z.kind} nhưng widget là "${w}"${f.multiple ? ' (multiple)' : ''}`);
    if (z.kind === 'enum') {
      const vals = (f.options || []).map(o => typeof o === 'object' ? o.value : o).sort().join(',');
      if (vals !== [...z.values].sort().join(',')) E(name, `"${p}": giá trị select [${vals}] ≠ enum [${[...z.values].sort()}]`);
    }
    if (z.kind === 'array' && z.elem.kind === 'enum') {
      const vals = (f.options || []).map(o => typeof o === 'object' ? o.value : o).sort().join(',');
      if (w !== 'select' || !f.multiple) E(name, `"${p}": mảng enum phải là select + multiple: true`);
      else if (vals !== [...z.elem.values].sort().join(',')) E(name, `"${p}": giá trị select [${vals}] ≠ enum [${[...z.elem.values].sort()}]`);
    }
    if (z.kind === 'number' && z.int && f.value_type && f.value_type !== 'int') E(name, `"${p}": schema int nhưng value_type="${f.value_type}"`);
    if (z.kind === 'number' && !z.int && f.value_type === 'int' ) W(name, `"${p}": schema number (cho phép số thập phân) nhưng value_type=int`);
    if (z.kind === 'string' && z.ref) {
      if (w !== 'relation') E(name, `"${p}": schema reference("${z.ref}") nhưng widget là "${w}", cần relation`);
      else if (f.collection !== z.ref) E(name, `"${p}": relation trỏ "${f.collection}", schema trỏ "${z.ref}"`);
    }
    if (z.kind === 'array' && z.elem.kind === 'string' && w === 'list' && f.fields) W(name, `"${p}": schema là mảng chuỗi nhưng config có subfields`);
    if (z.kind === 'array' && z.elem.kind === 'object' && w === 'list' && !f.fields) E(name, `"${p}": schema là mảng object nhưng list không có fields`);
    // bắt buộc
    const schemaRequired = !z.optional && !z.nullable;
    const cfgRequired = f.required !== false;
    if (schemaRequired && !cfgRequired && w !== 'boolean') E(name, `"${p}": schema BẮT BUỘC nhưng config required: false`);
    if (!schemaRequired && cfgRequired && !(z.kind === 'array' && f.min)) W(name, `"${p}": schema tùy chọn nhưng config required: true`);
    if (z.nullable && !z.optional) W(name, `"${p}": schema nullable nhưng KHÔNG optional. Sveltia (omit_empty_optional_fields) bỏ khóa khi để trống, nên Zod báo thiếu. Đề xuất thêm .optional()`);
    // trường literal false (phone.public cũ)
    if (z.kind === 'literal' && z.values?.[0] === false && f.widget === 'boolean' && f.default !== false) W(name, `"${p}": literal false nhưng default không phải false`);
  }
  // trường trong config không có trong schema
  for (const p of Object.keys(cf)) {
    if (zf[p]) continue;
    if (isMd && p === 'body') continue; // thân Markdown, không nằm trong frontmatter schema
    E(name, `config có "${p}" nhưng schema.ts KHÔNG có`);
  }
  if (isMd && !cf['body']) E(name, 'trang markdown thiếu trường body');
  // file mẫu: mọi khóa trong dữ liệu phải có trong config
  const dir = path.join(contentDir, path.basename(base || ''));
  const files = c.files ? [path.join(contentDir, 'profile', 'profile.yaml')] : (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.(ya?ml|md)$/.test(f)).map(f => path.join(dir, f)) : []);
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.md')) { const m = text.match(/^---\n([\s\S]*?)\n---/); text = m ? m[1] : ''; }
    let data;
    try { data = YAML.parse(text) || {}; } catch (e) { E(name, `${path.basename(file)}: YAML không đọc được: ${e.message.split('\n')[0]}`); continue; }
    const walk = (obj, prefix) => {
      for (const [k, v] of Object.entries(obj)) {
        const p = prefix + k;
        if (!cf[p]) E(name, `${path.basename(file)}: khóa "${p}" trong dữ liệu không có trong config.yml`);
        if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p + '.');
        if (Array.isArray(v) && v.length && typeof v[0] === 'object') for (const it of v) walk(it, p + '[].');
      }
    };
    walk(data, '');
    // giá trị select phải nằm trong options
    for (const [k, v] of Object.entries(data)) {
      const f = cf[k];
      if (f?.widget === 'select') {
        const opts = (f.options || []).map(o => typeof o === 'object' ? o.value : o);
        for (const x of [].concat(v ?? [])) if (!opts.includes(x)) E(name, `${path.basename(file)}: "${k}" = "${x}" không có trong options của select`);
      }
    }
  }
}

// ---- JSON schema chính thức của Sveltia (cấu trúc config hợp lệ) ----
const schemaFile = path.join(here, 'sveltia-cms.schema.json');
if (fs.existsSync(schemaFile)) {
  const Ajv = req('ajv');
  const ajv = new Ajv({ strict: false, allErrors: false, validateFormats: false });
  const validate = ajv.compile(JSON.parse(fs.readFileSync(schemaFile, 'utf8')));
  if (!validate(cfg)) for (const e of validate.errors.slice(0, 10)) E('sveltia-schema', `${e.instancePath} ${e.message}`);
  else console.log('OK  config.yml hợp lệ theo JSON schema của @sveltia/cms 5.0.1');
} else W('sveltia-schema', 'không tìm thấy admin-tools/sveltia-cms.schema.json, bỏ qua bước này');

console.log(`Đã đối chiếu ${Object.keys(collections).length} collection, ${fieldCount} trường schema.`);
for (const w of warns) console.log('WARN ' + w);
for (const e of errors) console.log('LỖI  ' + e);
console.log(errors.length ? `\n${errors.length} lỗi, ${warns.length} cảnh báo.` : `\nKHỚP: 0 lỗi, ${warns.length} cảnh báo.`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(errors.length ? 1 : 0);
