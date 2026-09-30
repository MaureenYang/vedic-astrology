// 更新快取版本號：修改網站後執行 `node scripts/bump-version.mjs`
// 會把 index.html 與 js/*.js 裡對本站檔案的引用加上 ?v=<時間戳>，讓瀏覽器一定抓到新版本
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const v = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const stamp = (s) => s.replace(/((?:href|src)="(?:css|js)\/[\w.-]+\.(?:css|js)|from '\.{1,2}\/[\w./-]+\.js|import\('\.{1,2}\/[\w./-]+\.js)(\?v=\w+)?/g, `$1?v=${v}`);

const files = ['index.html', ...readdirSync(root + 'js').filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)];
for (const f of files) {
  const p = root + f;
  const before = readFileSync(p, 'utf8');
  const after = stamp(before);
  if (after !== before) writeFileSync(p, after);
}
console.log('version', v);
