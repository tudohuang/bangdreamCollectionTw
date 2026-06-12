# 邦邦來台圖鑑 · Taiwan BanG Dream! Event Collection

一份關於 BanG Dream! 相關聲優、樂團與活動在台灣的收藏紀錄（2018–2026）。

### Sheet 可填的欄位（全部都吃得到）

基本欄位之外，在表頭加這些欄就會自動生效，等於整本圖鑑都能在 Sheet 維護：

| 欄名 | 用途 |
|---|---|
| `地點` | 場館（詳情顯示＋Google 地圖連結＋場館/城市統計）|
| `城市` | 選填；不填會自動從地點/標題判斷 |
| `封面` | 指定卡片封面（留空＝用照片第一張）|
| `購票連結` | 詳情顯示購票按鈕 |
| `主辦` | 主辦單位 |
| `簡介` | 活動簡介（長文）|
| `來源` | 參考連結，多個用空白/換行分隔 |


### 本體 vs 個人（重要）

`本體／擦邊` 欄位區分兩種來台性質：

- **本體**：BanG Dream! 官方活動，卡片以**樂團**為主視覺。
- **擦邊（顯示為「個人」）**：聲優以**個人身分**來台，只是與某樂團／角色有關聯。卡片改以**聲優**為主，樂團/角色只作柔性標註，不會硬綁邦邦。

關聯欄寫成 `樂團／角色`（全形斜線），例如 `Roselia／湊友希那`、`Ave Mujica／sumimi／純田真奈`。

## 資料來源

所有活動資料在 `src/data/events.json`，從 CSV 轉換而來。每筆活動格式：

```json
{
  "id": "evt-001",
  "number": 1,
  "year": 2018,
  "startDate": "2018-02-03",
  "endDate": "2018-02-03",
  "month": 2,
  "title": "活動名稱",
  "type": "FMT",
  "people": ["聲優A", "聲優B"],
  "relatedGroups": ["Poppin'Party"],
  "category": "本體",
  "isFullBand": false,
  "attendanceCount": 3,
  "venue": "",
  "city": "",
  "photos": [],
  "cover": "",
  "ticketUrl": "",
  "organizer": "",
  "description": "",
  "impression": "",
  "sources": [],
  "notes": "",
  "lastUpdated": "2026-06-11"
}
```

新增活動只需在這個 JSON 加一筆即可。

## 授權與致謝

由Tudo Huang 整理，非營利、非官方紀錄。
資料如有錯漏歡迎開 issue 或 PR。
