// 活動跟 BanG Dream! 的關聯程度。
//
// 「本體／擦邊」兩分法已經不夠用了：上坂菫來台六次，一次是《金肉人》、一次是漫博舞台、
// 一次是她自己的見面會 —— 全部算「擦邊」的話，Pastel＊Palettes 的出現次數就會虛胖。
// 所以分三級，並且把「這是 Sheet 標的還是程式猜的」一起回傳，統計時才敢講。
//
// Sheet 可以加一欄「關聯」，填 官方本體／強關聯／弱關聯 就會直接採用；
// 沒填的用下面的規則推，推錯就去 Sheet 補一格，不用改程式。

export const TIERS = {
  official: { key: 'official', label: '官方本體', short: '本體', rank: 0 },
  strong: { key: 'strong', label: '強關聯', short: '強', rank: 1 },
  weak: { key: 'weak', label: '弱關聯', short: '弱', rank: 2 },
}

export const CONTEXTS = {
  bandori: '邦邦企劃',
  solo: '個人名義',
  festival: '音樂祭',
  convention: '展會／動漫祭',
  other_ip: '其他作品',
}

const TIER_ALIAS = {
  官方本體: 'official', 本體: 'official', official: 'official',
  強關聯: 'strong', 強: 'strong', strong: 'strong',
  弱關聯: 'weak', 弱: 'weak', weak: 'weak',
}

// 這些是「別人的場子，聲優只是去站台」
const FESTIVAL = /音樂祭|LisAni|リスアニ|ANISAMA|ANISONG|KING SUPER LIVE|花火|綠洲/i
const CONVENTION = /EXPO|漫畫博覽會|動漫祭|動漫節|WCS|A\.C\.F|PF\d+|Comic|開拓|一日店長/i
// 書名號、或明確是別的 IP
const OTHER_IP = /[《【]|IDOLM@STER|SPY×FAMILY|換裝娃娃|金肉人/i

const text = (e) => `${e?.title || ''} ${e?.type || ''}`
const primaryType = (e) => String(e?.type || '').split(/[／/、]/)[0].trim()

// 回傳 { tier, context, source }；source 是 'sheet' 或 'inferred'
export function relationOf(event) {
  if (!event) return { tier: 'weak', context: 'other_ip', source: 'inferred' }

  const declared = TIER_ALIAS[String(event.relation || event.extras?.['關聯'] || '').trim()]
  const inferred = infer(event)
  return declared
    ? { ...inferred, tier: declared, source: 'sheet' }
    : { ...inferred, source: 'inferred' }
}

function infer(event) {
  if (event.category !== '擦邊') return { tier: 'official', context: 'bandori' }

  const t = text(event)
  if (FESTIVAL.test(t)) return { tier: 'weak', context: 'festival' }
  if (CONVENTION.test(t)) return { tier: 'weak', context: 'convention' }
  if (OTHER_IP.test(t)) return { tier: 'weak', context: 'other_ip' }

  // 一位出演者、以自己名義辦的 LIVE 或見面會 —— 這種跟邦邦的關聯是實的
  const solo = (event.people || []).length === 1
  const own = /FMT|LIVE|公錄/i.test(primaryType(event))
  if (solo && own) return { tier: 'strong', context: 'solo' }

  return { tier: 'weak', context: 'other_ip' }
}

export const tierOf = (e) => relationOf(e).tier
export const isOfficial = (e) => tierOf(e) === 'official'

// 一批活動的關聯分布，附帶「有幾筆是猜的」
export function relationBreakdown(events = []) {
  const counts = { official: 0, strong: 0, weak: 0 }
  const contexts = {}
  let inferred = 0

  for (const e of events) {
    const r = relationOf(e)
    counts[r.tier]++
    contexts[r.context] = (contexts[r.context] || 0) + 1
    if (r.source === 'inferred') inferred++
  }

  return {
    counts,
    contexts,
    inferred,
    total: events.length,
    confirmed: events.length - inferred,
  }
}
