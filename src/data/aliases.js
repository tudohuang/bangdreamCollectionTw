// 聲優名字的羅馬字別名。
//
// 為什麼要手維護：漢字的讀音推不出來。「愛美」可以是あいみ也可以是まなみ，
// 「西本里美」在日文是「西本りみ Nishimoto Rimi」而不是 Satomi ——
// 中文圈用的漢字寫法跟日文本名不見得對得起來，靠規則一定會錯。
//
// 假名寫的名字（相羽あいな、進藤あまね）不用列在這裡，
// utils/kana.js 會自動轉成羅馬字。
//
// 寫錯的代價只是「某個搜尋詞找不到」，不會在畫面上顯示錯的東西，
// 所以寧可多收幾個常見拼法（姓名順序顛倒、只打姓、圈內暱稱）。
export const ROMAJI = {
  愛美: ['aimi'],
  伊藤美來: ['ito miku', 'itou miku', 'miku'],
  '相羽あいな': ['aiba aina', 'aina'],
  工藤晴香: ['kudo haruka', 'kudou haruka'],
  上坂菫: ['uesaka sumire', 'sumipe'],
  小原莉子: ['kohara riko'],
  佐佐木李子: ['sasaki riko'],
  米澤茜: ['yonezawa akane'],
  羊宮妃那: ['youmiya hina', 'yomiya hina'],
  立石凜: ['tateishi rin'],
  林鼓子: ['hayashi coco', 'hayashi koko'],
  青木陽菜: ['aoki hina'],
  小日向美香: ['kohinata mika'],

  // Poppin'Party
  大塚紗英: ['otsuka sae', 'ohtsuka sae'],
  西本里美: ['nishimoto rimi'],
  伊藤彩沙: ['ito ayasa', 'itou ayasa'],
  大橋彩香: ['ohashi ayaka', 'oohashi ayaka'],

  // Roselia / RAISE A SUILEN
  中島由貴: ['nakashima yuki'],
  志崎樺音: ['shizaki kanon', 'kanon'],
  紡木吏佐: ['tsumugi risa'],
  倉知玲鳳: ['kurachi reo'],
  夏芽: ['natsume'],
  '千春': ['chiharu'],

  // Pastel＊Palettes / Morfonica / MyGO!!!!! / Ave Mujica
  前島亞美: ['maeshima ami'],
  豐田萌繪: ['toyota moe'],
  三澤紗千香: ['misawa sachika'],
  直田姬奈: ['naota hina'],
  高尾奏音: ['takao kanon'],
  渡瀨結月: ['watase yuzuki'],
  岡田夢以: ['okada mei'],
  反田葉月: ['tanda hazuki', 'sorida hazuki'],

  // 客串 / 其他作品
  三森鈴子: ['mimori suzuko', 'mimorin'],
  金元壽子: ['kanemoto hisako'],
  加藤英美里: ['kato emiri', 'katou emiri'],
  小澤亞李: ['ozawa ari'],
  西尾夕香: ['nishio yuka'],
  '進藤あまね': ['shindo amane', 'shindou amane'],
  櫻川惠: ['sakuragawa megu'],
}

// 樂團的常見縮寫。站上用全名，但粉絲打的是縮寫。
export const BAND_ALIASES = {
  "Poppin'Party": ['popipa', 'ppp', 'poppin party', 'ポピパ'],
  'Pastel＊Palettes': ['pasupare', 'pastel palettes', 'パスパレ'],
  Roselia: ['roselia', 'ロゼリア'],
  Afterglow: ['afuroguro', 'アフターグロウ'],
  'Hello, Happy World!': ['hapihapi', 'hello happy world', 'ハロハピ'],
  Morfonica: ['morufo', 'モルフォニカ'],
  'RAISE A SUILEN': ['ras', 'raise a suilen', 'レイズアスイレン'],
  'MyGO!!!!!': ['mygo', 'マイゴ'],
  'Ave Mujica': ['avemujica', 'アヴェムジカ'],
  'BanG Dream!': ['bandori', 'bang dream', 'バンドリ', '邦邦'],
}
