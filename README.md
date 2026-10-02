# 吠陀占星排盤

輸入出生日期、時間、性別、出生地，選擇 Ayanamsa，即可排出完整的吠陀占星（Jyotish）命盤。
所有計算都在瀏覽器中完成，不需要伺服器，也不會上傳任何出生資料。

## 功能

- 基本資料：上升、命主星、月亮星座與星宿、太陽星座、月相、日出日落、吠陀日
- 四軸點：ASC／DSC／MC／IC
- 行星表：星座、度數、宮位、星宿與 Pada、落陷／廟旺／Moolatrikona／本宮、燃燒、逆行、同宮、敵友、Baladi 狀態、Shadbala、速率
- 十二宮：宮主、宮內行星、Bhava Bala
- 20 張分盤：Parashara 16 張 D1～D60，加上 D5、D6、D8、D11（非 Parashara 標準，採常見算法），南印度式／北印度式，並標示出生時間誤差容忍度
- Shadbala 六力全部細項
- 二十七宿、九分盤資訊（Vargottama、Pushkara、64th Navamsa、年月日時主宰星）
- Vimshottari：大運 → 中運 → 小運 → 小小運（Sookshma）→ Prana，並標出目前所在的運；一年天數可選 365.24219／360／359.017／354.37
- Ayanamsa：Lahiri／Raman／KP
- **匯出 Excel**：一鍵下載 .xlsx（14 張工作表：基本資料、十二宮、行星、四軸點、Shadbala、二十七宿、九分盤資訊、分盤長表與總表、大運中運、小運、小小運、目前大運的 Prana、欄位說明），方便交給 Claude 解讀
- 出生地：台灣 22 縣市與 368 鄉鎮市區（中文）＋全球約 7,000 個城市；也可手動輸入經緯度與時區（含歷史夏令時）

## 本機預覽

因為使用 ES module 與 WebAssembly，不能直接雙擊 `index.html`，要用本機伺服器開啟：

```bash
python -m http.server 8000
# 瀏覽器開啟 http://localhost:8000
```

## 測試

```bash
node tests/compare-sample.mjs   # 與範例命盤（台中 1988-07-19 23:30）逐項比對
```

## 授權

使用 [Swiss Ephemeris](https://www.astro.com/swisseph/)（WebAssembly 版 `@swisseph/browser`，AGPL-3.0），因此本專案原始碼亦採 AGPL-3.0。
城市資料：[taiwan-atlas](https://github.com/dkaoster/taiwan-atlas)（內政部界線）、[city-timezones](https://github.com/kevinroberts/city-timezones)（MIT）。
