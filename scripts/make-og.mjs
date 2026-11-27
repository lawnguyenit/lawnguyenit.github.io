// One-off: render public/og.png (1200x630) from scripts/og.html and public/favicon-32.png from favicon.svg. Output is committed.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const exe = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + root + 'scripts/og.html');
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: root + 'public/og.png' });
const q = await b.newPage({ viewport: { width: 32, height: 32 } });
await q.goto('file://' + root + 'scripts/og.html');
await q.setContent(`<body style="margin:0"><img src="file://${root}public/favicon.svg" width="32" height="32"></body>`);
await q.waitForLoadState('load');
await q.screenshot({ path: root + 'public/favicon-32.png', omitBackground: true });
await b.close();
