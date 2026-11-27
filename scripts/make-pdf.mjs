// Build -> serve dist/ -> print the two CVs to A4 PDF with Playwright (print CSS = same look as the web).
//   npm run pdf                    build, then write dist/pdf/*.pdf
//   npm run pdf -- --no-build      reuse the existing dist/ (CI runs build first)
// Env: PDF_OUT (output dir relative to repo root, default dist/pdf)
//      CHROMIUM_PATH (use a local Chrome/Chromium instead of Playwright's download)
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');

if (!process.argv.includes('--no-build')) {
  const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const outDir = join(root, process.env.PDF_OUT || 'dist/pdf');
await mkdir(outDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.txt': 'text/plain', '.xml': 'application/xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.pdf': 'application/pdf',
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const c of [path, path + '.html', join(path, 'index.html')]) {
    const f = join(dist, c);
    if (f.startsWith(dist) && existsSync(f) && extname(f)) {
      res.writeHead(200, { 'content-type': mime[extname(f)] ?? 'application/octet-stream' });
      return res.end(await readFile(f));
    }
  }
  res.writeHead(404).end('not found');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const targets = [
  { path: '/', file: 'ho-so-di-lam.pdf' },
  { path: '/academic-cv', file: 'academic-cv.pdf' },
];

let executablePath = process.env.CHROMIUM_PATH || undefined;
if (!executablePath && !existsSync(chromium.executablePath())) {
  executablePath = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
}
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const t of targets) {
    const page = await browser.newPage();
    await page.goto(base + t.path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const out = join(outDir, t.file);
    await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('wrote', out);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
