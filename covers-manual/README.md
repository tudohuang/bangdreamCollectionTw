# 手動存的封面

抓不到的封面放這裡，檔名是**三位數的永久鍵 ID**（不是編號），副檔名隨意：

```
covers-manual/059.jpg
covers-manual/019.png
```

跑 `npm run covers` 就會用它，而且**優先於原網址** —— 有手動檔就不會去抓網路。

## 什麼時候需要這個

Instagram 與 Facebook 的圖片網址帶簽章與到期時間（`oh=` / `oe=` 參數），
**本來就會失效**。換一個新網址只會再死一次。唯一穩的做法是把圖存下來。

`npm run covers` 跑完會直接告訴你哪幾張是這種情況、檔名該叫什麼。

## 怎麼知道 ID

`npm run health` 或 `docs/covers-failed.json` 裡都有。
ID 不等於編號 —— 編號可以重排，ID 不能動。
