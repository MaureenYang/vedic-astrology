// Ashtakavarga（八分點），依 BPHS 第 66–72 章
// 對每顆行星（日～土），由 8 個貢獻者（日、月、火、水、木、金、土、上升）
// 各自所在的星座起算，落在指定宮數的星座得 1 點（Bindu）。

// BENEFIC[行星][貢獻者] = 得點的宮數（從貢獻者所在星座算起，1 = 同一星座）
// 貢獻者順序：日 月 火 水 木 金 土 上升
const BENEFIC = [
  // 太陽（總點 48）
  [[1, 2, 4, 7, 8, 9, 10, 11], [3, 6, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [3, 5, 6, 9, 10, 11, 12], [5, 6, 9, 11], [6, 7, 12], [1, 2, 4, 7, 8, 9, 10, 11], [3, 4, 6, 10, 11, 12]],
  // 月亮（49）
  [[3, 6, 7, 8, 10, 11], [1, 3, 6, 7, 10, 11], [2, 3, 5, 6, 9, 10, 11], [1, 3, 4, 5, 7, 8, 10, 11], [1, 4, 7, 8, 10, 11, 12], [3, 4, 5, 7, 9, 10, 11], [3, 5, 6, 11], [3, 6, 10, 11]],
  // 火星（39）
  [[3, 5, 6, 10, 11], [3, 6, 11], [1, 2, 4, 7, 8, 10, 11], [3, 5, 6, 11], [6, 10, 11, 12], [6, 8, 11, 12], [1, 4, 7, 8, 9, 10, 11], [1, 3, 6, 10, 11]],
  // 水星（54）
  [[5, 6, 9, 11, 12], [2, 4, 6, 8, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 3, 5, 6, 9, 10, 11, 12], [6, 8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 2, 4, 6, 8, 10, 11]],
  // 木星（56）
  [[1, 2, 3, 4, 7, 8, 9, 10, 11], [2, 5, 7, 9, 11], [1, 2, 4, 7, 8, 10, 11], [1, 2, 4, 5, 6, 9, 10, 11], [1, 2, 3, 4, 7, 8, 10, 11], [2, 5, 6, 9, 10, 11], [3, 5, 6, 12], [1, 2, 4, 5, 6, 7, 9, 10, 11]],
  // 金星（52）
  [[8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11, 12], [3, 5, 6, 9, 11, 12], [3, 5, 6, 9, 11], [5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 10, 11], [3, 4, 5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 11]],
  // 土星（39）
  [[1, 2, 4, 7, 8, 10, 11], [3, 6, 11], [3, 5, 6, 10, 11, 12], [6, 8, 9, 10, 11, 12], [5, 6, 11, 12], [6, 11, 12], [3, 5, 6, 11], [1, 3, 4, 6, 10, 11]],
];
export const BAV_TOTALS = [48, 49, 39, 54, 56, 52, 39];
export const CONTRIBUTORS = ['日', '月', '火', '水', '木', '金', '土', '上升'];

// signs: 九曜所在星座（0 = 牡羊）；ascSign: 上升星座
export function ashtakavarga(signs, ascSign) {
  const from = [...signs.slice(0, 7), ascSign];
  // prastara[p][c][sign] = 0/1
  const prastara = BENEFIC.map((rows) => rows.map((houses, c) => {
    const row = Array(12).fill(0);
    houses.forEach((h) => { row[(from[c] + h - 1) % 12] = 1; });
    return row;
  }));
  const bav = prastara.map((rows) => Array.from({ length: 12 }, (_, s) => rows.reduce((a, r) => a + r[s], 0)));
  const sav = Array.from({ length: 12 }, (_, s) => bav.reduce((a, r) => a + r[s], 0));
  return { prastara, bav, sav, total: sav.reduce((a, b) => a + b, 0), reduced: reductions(bav, signs) };
}

// ---------- 削減（Shodhana）與 Shodhya Pinda，依 BPHS／B.V. Raman《Ashtakavarga System》 ----------

const TRINES = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
// 同一行星主管的兩個星座（巨蟹、獅子各只有一個主星，不參與）
const SAME_LORD = [[0, 7], [1, 6], [2, 5], [8, 11], [9, 10]];
export const RASI_GUNA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]; // 牡羊～雙魚
export const GRAHA_GUNA = [5, 5, 8, 5, 10, 7, 5]; // 日 月 火 水 木 金 土

// Trikona Shodhana：三方星座中有 0 不減；三個相同全歸 0；否則各減去最小值
export function trikonaShodhana(row) {
  const out = row.slice();
  for (const t of TRINES) {
    const v = t.map((s) => out[s]);
    if (v.includes(0)) continue;
    if (v[0] === v[1] && v[1] === v[2]) { t.forEach((s) => { out[s] = 0; }); continue; }
    const m = Math.min(...v);
    t.forEach((s) => { out[s] -= m; });
  }
  return out;
}

// Ekadhipatya Shodhana（在 Trikona 之後）：occupied[s] = 該星座有行星（日～土）
// - 任一星座為 0，或兩個都有行星：不減
// - 兩個都沒有行星：相同則都歸 0；不同則較大的減成較小的
// - 一個有行星、一個沒有：沒有行星那格若 ≤ 有行星那格，歸 0；若較大，減成與有行星那格相同
export function ekadhipatyaShodhana(row, occupied) {
  const out = row.slice();
  for (const [a, b] of SAME_LORD) {
    const va = out[a], vb = out[b];
    if (va === 0 || vb === 0) continue;
    const oa = occupied[a], ob = occupied[b];
    if (oa && ob) continue;
    if (!oa && !ob) {
      if (va === vb) { out[a] = 0; out[b] = 0; } else { const m = Math.min(va, vb); out[a] = m; out[b] = m; }
      continue;
    }
    const [occ, emp] = oa ? [a, b] : [b, a];
    out[emp] = out[emp] <= out[occ] ? 0 : out[occ];
  }
  return out;
}

export function shodhyaPinda(reduced, signs) {
  const rasi = reduced.reduce((acc, v, s) => acc + v * RASI_GUNA[s], 0);
  const graha = GRAHA_GUNA.reduce((acc, g, p) => acc + reduced[signs[p]] * g, 0);
  return { rasi, graha, total: rasi + graha };
}

// 對 7 張 BAV 全部做削減並算 Shodhya Pinda
export function reductions(bav, signs) {
  const occupied = Array.from({ length: 12 }, (_, s) => signs.slice(0, 7).includes(s));
  return bav.map((row) => {
    const trikona = trikonaShodhana(row);
    const ekadhipatya = ekadhipatyaShodhana(trikona, occupied);
    return { trikona, ekadhipatya, pinda: shodhyaPinda(ekadhipatya, signs) };
  });
}
