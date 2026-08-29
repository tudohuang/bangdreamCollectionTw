// 日文假名的處理：片假名↔平假名、假名→羅馬字。
//
// 為什麼需要：這個站有一半的名字是日文。「相羽あいな」用片假名打
// （アイバアイナ）搜不到，用羅馬字打（aiba）也搜不到 ——
// 而日本粉絲跟看動畫長大的台灣粉絲兩種都會打。
//
// 這支只處理假名。漢字的讀音推不出來（「愛美」可以是あいみ也可以是まなみ），
// 那種要靠名冊的別名欄，見 utils/search.js。

// 片假名與平假名在 Unicode 上剛好差 0x60，所以不用查表。
// 長音符「ー」與促音不在這個範圍，分開處理。
export function kataToHira(s) {
  return String(s || '').replace(/[ァ-ヶ]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60))
}

// 拗音（きゃ、しゅ…）要先比對，不然會被拆成「き」+「や」
const DIGRAPH = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo', てぃ: 'ti', でぃ: 'di', ふぁ: 'fa',
  ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', うぃ: 'wi', うぇ: 'we', ゔぁ: 'va',
}

const MONO = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゃ: 'ya', ゅ: 'yu', ょ: 'yo',
}

// 假名 → 羅馬字。不是假名的字元原樣留著 ——
// 「相羽あいな」會變成「相羽aina」，漢字的部分還在，用漢字搜一樣找得到。
export function toRomaji(input) {
  const s = kataToHira(String(input || ''))
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2)
    if (DIGRAPH[two]) { out += DIGRAPH[two]; i++; continue }
    const c = s[i]
    // 促音：下一個音的子音重複一次（きっぷ → kippu）
    if (c === 'っ') {
      const nxt = DIGRAPH[s.slice(i + 1, i + 3)] || MONO[s[i + 1]]
      if (nxt) out += nxt[0]
      continue
    }
    // 長音符：把前一個母音再寫一次（ラーメン → raamen）
    if (c === 'ー') { out += out.slice(-1); continue }
    out += MONO[c] ?? c
  }
  return out
}

