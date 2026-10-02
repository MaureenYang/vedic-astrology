# 吠陀占星排盤網頁 — 專案說明

使用者要的是：網頁輸入出生時間、性別、出生地、Ayanamsa → 顯示完整命盤資訊。
目前階段**只排盤、不做解析**（解析之後再與使用者討論）；**不做密碼**。使用者不想花錢：不要加入付費 API 或需要伺服器的服務。

## 結構

- `index.html`、`css/style.css`：頁面（繁體中文，支援手機與深色模式）
- `js/app.js`：表單、出生地搜尋、各分頁的顯示；輸入存在網址 hash，可直接分享
- `js/chart.js`：排盤主程式（行星、宮位、分盤、Shadbala、Bhava Bala、九分盤資訊、時間主宰星）
- `js/vargas.js`：20 張分盤規則（Parashara 16 張＋D5/D6/D8/D11）；`js/dasha.js`：Vimshottari 五層；`js/time.js`：時區換算
- `js/render.js`：南印度式／北印度式 SVG 盤面
- `js/cities.js`：城市資料（產生後的靜態檔）
- `js/export.js`：把命盤整理成 Excel 工作表；`js/xlsx.js`：不依賴外部套件的 XLSX 產生器（瀏覽器內建 CompressionStream 壓縮）
- `vendor/swisseph/`：Swiss Ephemeris WebAssembly（`@swisseph/browser` 1.4.0，AGPL），Moshier 星曆
- `tests/`：`node tests/compare-sample.mjs` 與使用者範例檔比對

## 驗證基準

使用者範例檔 `MM_1988-07-19.xlsx`：台中、1988-07-19 23:30（UTC+8）、女、Lahiri。
已知差異（皆為範例檔的算法或錯誤，本站維持 BPHS 標準）：
- 月亮星宿：範例檔寫角宿，是誤用回歸黃道；正確為翼宿（Uttara Phalguni）
- D30：範例檔偶數星座用了奇數星座（天秤、雙子、水瓶…）；本站用 BPHS（金牛、處女、雙魚、摩羯、天蠍）
- Shadbala：Drik Bala、年月日時主力、Drekkana 力、水星 Cheshta 算法不同，總分有差
- 範例檔「此宮評分」算法不明，本站改顯示 Bhava Bala
- 範例檔大運日期為 UT 日期；本站顯示當地時間到分鐘。Dasha 一年預設 365.24219 天（使用者指定的選項：365.24219／360／359.017／354.37）

修改計算時，先跑 `node tests/compare-sample.mjs` 確認沒有退步。

## 發布前

修改任何 `index.html`、`css/`、`js/` 後，commit 前執行 `node scripts/bump-version.mjs` 更新快取版本號，
否則使用者的瀏覽器可能繼續用舊檔案。
