// 搜尋容錯：羅馬拼音 / 別名也搜得到
import { detectCity } from './derive.js'

// 常見聲優中↔羅馬字別名（手動補幾個熱門的，找不到也沒關係）
const ALIASES = {
  '愛美': ['aimi'],
  '伊藤美來': ['ito miku', 'miku'],
  '相羽あいな': ['aina', 'aiba'],
  '工藤晴香': ['kudo haruka'],
  '上坂堇': ['uesaka sumire', 'sumipe'],
  '小原莉子': ['kohara riko'],
  '佐佐木李子': ['sasaki riko'],
  '米澤茜': ['yonezawa akane'],
  '羊宮妃那': ['youmiya hina'],
  '立石凜': ['tateishi rin'],
  '林鼓子': ['hayashi coco'],
  '青木陽菜': ['aoki hina'],
  '小日向美香': ['kohinata mika'],
}

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')

// 建立可搜尋字串（含別名、城市）
export function searchHay(e) {
  const parts = [
    e.title, e.type, e.venue,
    ...(e.people || []),
    ...(e.relatedGroups || []),
    detectCity(e),
  ]
  for (const p of (e.people || [])) {
    if (ALIASES[p]) parts.push(...ALIASES[p])
  }
  return norm(parts.join(' '))
}

export function matchSearch(e, query) {
  const q = norm(query)
  if (!q) return true
  return searchHay(e).includes(q)
}
