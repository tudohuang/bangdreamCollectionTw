# 名冊缺的 15 人

`名冊` 分頁目前 25 人，但活動裡出現過 40 人。差的這 15 人沒有權威資料，
程式只能從活動表反推 —— 而聯合場次一列塞好幾個團，反推一定會錯。

**這些人的人物頁已經會被 Google 收錄了**，所以錯的團會被收進去。

## 怎麼補

把 `roster-missing.tsv` 的內容貼進 `名冊` 分頁最下面（Sheet 會自動分欄），
再把下面標★的那幾列改對。欄位是：`對象 / 類別 / 樂團 / 角色 / 追蹤中`。

「追蹤中」留空＝要追蹤；只有明確填「否」才會被排除。

## ★ 一定要人工確認

這幾位的團是從「一列標了兩三個團」的聯合場次反推的，或根本推不出來。

| 對象 | 場次 | 程式填了 | 那些活動上標到的團 |
| --- | --- | --- | --- |
| 進藤あまね | 3 | （空白） | Morfonica、Poppin'Party、Roselia |
| 伊藤美來 | 3 | Hello, Happy World! | Poppin'Party、Hello, Happy World! |
| 前島亞美 | 2 | Pastel＊Palettes | Pastel＊Palettes、Hello, Happy World!、Roselia |
| 豐田萌繪 | 1 | （空白） | Pastel＊Palettes、Hello, Happy World!、Roselia |
| 千春 | 1 | （空白） | Millsage、Ave Mujica |

## ○ 相對可靠，但還是掃一眼

只跟單一個團一起出現過，所以反推比較穩。角色欄空白的代表活動表上沒寫。

| 對象 | 場次 | 樂團 | 角色 |
| --- | --- | --- | --- |
| 上坂菫 | 5 | Pastel＊Palettes | 白鷺千聖 |
| 西尾夕香 | 3 | Morfonica | |
| 三森鈴子 | 2 | Glitter☆Green | 牛込ゆり |
| 小澤亞李 | 2 | Pastel＊Palettes | 冰川日菜 |
| 金元壽子 | 1 | Afterglow | 羽澤鶇 |
| 加藤英美里 | 1 | Afterglow | 上原緋瑪麗 |
| 三澤紗千香 | 1 | Afterglow | 青葉摩卡 |
| 直田姬奈 | 1 | Morfonica | |
| 反田葉月 | 1 | Sumimi | 純田真奈 |
| Ayasa | 1 | Morfonica | |

## 補完之後

```bash
npm run import -- "<你的 Sheet CSV 網址>"
npm run verify
```

重新產生的資料會用名冊的答案，不再反推。
