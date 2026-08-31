# 資料健檢

> 由 `npm run health` 產生。59 筆活動。

## 欄位覆蓋率

| 欄位 | 已填 | 比例 | 補起來會怎樣 |
| --- | ---: | ---: | --- |
| 一句話 | 0/59 | 0% | 卡片、首頁、搜尋結果、分享描述會同時活過來。每筆 20 字。 |
| 來源 | 6/59 | 10% | 史料庫的底線是可追溯。沒有來源的條目等於「聽說」。 |
| 簡介 | 0/59 | 0% | 詳情頁與 SEO 描述的正文。沒有的話搜尋結果只有標題。 |
| 心得 | 0/59 | 0% | 這站唯一別的地方沒有的東西。 |
| 照片 | 3/59 | 5% | 現場的樣子。封面是宣傳圖，照片才是紀錄。 |
| 購票連結 | 5/59 | 8% | 對過去的場次它是史料 —— 當年在哪買、賣多少錢。 |
| 開賣日 | 0/59 | 0% | 有它才畫得出「公布 → 開賣 → 演出」那條線。 |
| 場次 | 0/59 | 0% | 留空時用天數推。填了統計才精確。 |
| 關聯 | 0/59 | 0% | 本體／強／弱。留空時由規則推，目前 59 筆全是推的。 |
| 備註 | 1/59 | 2% | 規則塞不下的例外。 |

## 具體要處理的

### 6 張封面抓不下來

原網址掛了或擋外連。這些活動在列表上只會顯示編號。

- #007 LisAni！LIVE TAIWAN 2018 SATURDAY STAGE ← https://s3-press.niusnews.com/72023_2_15403380024680.jpg
- #019 Ani Crew DJ Live in Taipei ← https://www.fanhealth.com.tw/uploads/article/img1717212012-2924271.jpg
- #028 Ani-mode 花火大會 ← https://scontent-tpe5-1.cdninstagram.com/v/t51.82787-15/521298010_17891739996280139_6036055020299743203_n.webp?_nc_cat=104&ig_cache_key=MzY3OTM5MDU3OTc3ODkyOTgyOQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQueHBpZHMuMTAyNC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=PcuXAmSSkM4Q7kNvwG3q4LL&_nc_oc=Adqh4BaAkYKDRQU0EsPGlcpezWCDxnjjBAgYhObnnuyuLPYRtM986gJ95_VgiZ0-U1k&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-tpe5-1.cdninstagram.com&_nc_gid=ccmjWBBjPAN8LINTFNtfgw&_nc_ss=7a22e&oh=00_AQGqeLklnO3FHolDnFiXohvdfWuhgIFznDetS2LIe78YcQ&oe=6A9206AC
- #056 工藤晴香 Fan Meeting 2026 in Taipei ← https://assets.kktix.io/organization_resource_files/32182/79565/0814%E5%B7%A5%E8%97%A4%E6%99%B4%E9%A6%99%E4%B8%BB%E8%A6%96%E8%A6%BA%E6%B5%B7%E5%A0%B1-new_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_%E8%A4%87%E6%9C%AC_20.jpg
- #057 AKANE YONEZAWA "Black Pasta" TOUR in Taipei ← https://p2.bahamut.com.tw/B/2KU/42/3e75ae1a5a688aa52411b6cbc21zxrq5.PNG
- #059 AIMI ASIA TOUR 2026「STAR RISING」 ← https://p2.bahamut.com.tw/B/2KU/27/995c488f85153f19c16eaad05d1zx7v5.JPG

### 1 筆根本沒有封面

- #017 Raychell個人簽售會

### 5 筆歸不出城市

這些場館的名字裡沒有城市，對照表也不敢猜（venues.js 的規矩是只放有把握的）。在 Sheet 的「城市」欄填一次就解決。

- #002 地點「詩涼子街頭實況攝影棚」
- #019 地點「SAKURA 音樂餐酒館」
- #027 地點「WESTAR」
- #054 地點「WESTAR」
- #058 地點「未確認」

### 2 個場館有多種寫法

程式已經合併了，但 Sheet 統一寫法之後這裡就不用靠規則。

- 南港展覽館一館  ／  台北南港展覽館一館 4 樓
- 三創生活園區 CLAPPER STUDIO  ／  Clapper Studio

### 關聯程度 59 筆全部是推的

官方本體／強關聯／弱關聯目前沒有一筆是人工確認的。在 Sheet 的「關聯」欄填 official／strong／weak 就會蓋掉推導。


### 名冊少了 15 個在活動表出現過的人

詳情頁的「飾演」會留白，動態頁也追蹤不到他們。

- 金元壽子
- 前島亞美
- 豐田萌繪
- 上坂菫
- 三森鈴子
- 進藤あまね
- 西尾夕香
- 加藤英美里
- Ayasa
- 小澤亞李
- 三澤紗千香
- 伊藤美來
- 千春
- 直田姬奈
- 反田葉月

### 名冊有 30 筆沒有官方連結

人物頁的「官方連結」那一排不會出現。在名冊加一欄「連結」，貼官推或 Eventernote 就好。

- 愛美
- 伊藤彩沙
- 西本里美
- 大塚紗英
- 大橋彩香
- Poppin'Party
- 相羽あいな
- 工藤晴香
- 中島由貴
- 櫻川惠
- 志崎樺音
- Roselia
- Raychell
- 紡木吏佐
- 夏芽
- 倉知玲鳳
- 小原莉子
- RAISE A SUILEN
- 羊宮妃那
- 立石凜
- 青木陽菜
- 小日向美香
- 林鼓子
- MyGO!!!!!
- 佐佐木李子
- 渡瀨結月
- 米澤茜
- 岡田夢以
- 高尾奏音
- Ave Mujica

### 歌曲分頁有 40 首只填了歌名

只有歌名的話畫面上完全不會有變化。填一條「連結」（Spotify 或 YouTube）就會長出按鈕。

- 一冊のアロー
- 光るなら
- 光をくれるあなたへ
- 君の知らない物語
- 青100色
- 夢のみちしるべ
- 熱色スターマイン
- BLACK SHOUT
- Dreamers Go!
- Drive Your Heart
- Light Delight
- Live Beyond!!
- No.6
- Now On Air
- ONENESS
- only my railgun
- Plunderer
- ray
- Requiem for Fate
- Shocking Blue
- Sing Alive
- Snow halation
- Time Lapse
- Yes! BanG_Dream!
- ZEAL of proud
- カザニア
- キズナミュージック♪
- キボウマイロード
- シャルル
- つまさきMovin'on!
- ティアドロップス
- ときめきエクスペリエンス！
- ナツイロ探し
- はよ、New World.
- ひなたぼっこ。
- ふわふわ時間
- ぽっぴん'しゃっふる
- ぽっぴん'どりーむ！
- ライオン
- ワールドイズマイン

### 1 筆的樂團欄用了半形逗號

分隔多個團要用「、」。半形逗號不切（因為 Hello, Happy World! 團名本身就有），兩個團會黏成一個查不到的樂團頁。

- #026 「RAISE A SUILEN,Morfonica」
