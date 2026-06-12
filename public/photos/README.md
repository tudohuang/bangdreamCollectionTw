# 活動照片放這裡

把自己拍的現場照、或要本機保存的圖片放進這個資料夾，然後在 `src/data/events.json`
（或 Google Sheet 的「照片」欄）填**檔名**即可：

```json
{
  "id": "evt-034",
  "photos": ["evt-034-1.jpg", "evt-034-2.jpg"]
}
```

外部圖床 / 官方宣傳照則直接填**完整網址**（兩種可混用）：

```json
{
  "photos": [
    "evt-034-1.jpg",
    "https://i.imgur.com/xxxxxxx.jpg"
  ]
}
```

- 命名建議：`<活動id>-<序號>.jpg`，例如 `evt-034-1.jpg`，好對應、好整理。
- 第一張會自動當作卡片封面；也可另外用 `cover` 欄指定封面（檔名或網址）。
- 宣傳照／官方主視覺有版權，本站為非營利紀錄，建議優先放自己拍的，或標註來源於 `sources`。
- 這個資料夾在 build 時會原樣複製到網站根目錄（Vite public）。
