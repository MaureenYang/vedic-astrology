// 時間換算：當地時間 ↔ UTC ↔ 儒略日
// 時區採 IANA 名稱，交給瀏覽器內建 Intl 處理歷史夏令時（例如台灣 1974–1975、1979 年）

function tzOffsetMinutes(utcMs, timeZone) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

// 當地時間 → UTC（毫秒）與使用的時差（分鐘）
// tz 可以是 IANA 名稱，或 {fixedOffset: 分鐘}
export function localToUtc({ year, month, day, hour, minute, second = 0 }, tz) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  if (tz && typeof tz === 'object') return { utcMs: naive - tz.fixedOffset * 60000, offsetMin: tz.fixedOffset };
  let off = tzOffsetMinutes(naive, tz);
  let utc = naive - off * 60000;
  const off2 = tzOffsetMinutes(utc, tz);
  if (off2 !== off) { off = off2; utc = naive - off * 60000; }
  return { utcMs: utc, offsetMin: off };
}

export const msToJd = (ms) => ms / 86400000 + 2440587.5;
export const jdToMs = (jd) => (jd - 2440587.5) * 86400000;

// 儒略日 → 當地時間字串
export function fmtLocal(jd, offsetMin, withTime = true) {
  const d = new Date(jdToMs(jd) + offsetMin * 60000);
  const p = (n) => String(n).padStart(2, '0');
  const s = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  return withTime ? `${s} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : s;
}

export function fmtOffset(min) {
  const s = min < 0 ? '-' : '+';
  const a = Math.abs(min);
  return `UTC${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
