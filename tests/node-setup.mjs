// 讓瀏覽器版 Swiss Ephemeris 可以在 Node 裡跑（測試用）
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.startsWith('file:') || u.startsWith('/')) {
    const buf = await readFile(u.startsWith('file:') ? fileURLToPath(u) : u);
    return new Response(buf, { headers: { 'Content-Type': 'application/wasm' } });
  }
  return realFetch(url, opts);
};
const { SwissEphemeris } = await import('../vendor/swisseph/swisseph-browser.js');
export async function loadSwe() {
  const swe = new SwissEphemeris();
  const log = console.log; console.log = () => {};
  await swe.init(new URL('../vendor/swisseph/swisseph.wasm', import.meta.url).href);
  console.log = log;
  return swe;
}
