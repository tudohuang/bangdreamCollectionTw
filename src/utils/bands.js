// 每個樂團的代表色與點綴 — 夢幻發光卡片就靠這個
// 顏色取自 BanG Dream! 各團官方識別色，略微提亮以配合粉紫漸層底。

// icon = <Icon n="..."> 短名稱
export const BAND_META = {
  ppp:       { name: "Poppin'Party",      color: '#ff5c8a', glow: '255,92,138',  icon: 'star' },
  afterglow: { name: 'Afterglow',         color: '#ec3d56', glow: '236,61,86',   icon: 'fire' },
  pastel:    { name: 'Pastel＊Palettes',  color: '#ff86bd', glow: '255,134,189', icon: 'palette' },
  roselia:   { name: 'Roselia',           color: '#4d6bff', glow: '77,107,255',  icon: 'crown' },
  hhw:       { name: 'Hello, Happy World!',color: '#f5b400', glow: '245,180,0',   icon: 'rainbow' },
  morfonica: { name: 'Morfonica',         color: '#56bcdd', glow: '86,188,221',  icon: 'music' },
  ras:       { name: 'RAISE A SUILEN',    color: '#19bd95', glow: '25,189,149',  icon: 'bolt' },
  mygo:      { name: 'MyGO!!!!!',         color: '#4f86d6', glow: '79,134,214',  icon: 'guitar' },
  ave:       { name: 'Ave Mujica',        color: '#8a4ff0', glow: '138,79,240',  icon: 'masks-theater' },
  glitter:   { name: 'Glitter☆Green',     color: '#2fb96d', glow: '47,185,109',  icon: 'wand-magic-sparkles' },
  bang:      { name: 'BanG Dream!',       color: '#ff5fa2', glow: '255,95,162',  icon: 'compact-disc' },
  other:     { name: '其他',               color: '#a78bfa', glow: '167,139,250', icon: 'music' },
}

// 把「Ave Mujica／sumimi／純田真奈」拆成 { band, parts:[角色/小團…] }
export function parseGroup(group = '') {
  const segs = group.split('／').map(s => s.trim()).filter(Boolean)
  return { band: segs[0] || '', parts: segs.slice(1) }
}

// 個人身分來台（擦邊）→ 應以聲優為主、樂團/角色只是柔性關聯
export function isPersonal(event) {
  return event.category === '擦邊'
}

// 「Pastel＊Palettes／白鷺千聖」→ 主團名
export function rootGroup(group = '') {
  return group.split('／')[0].trim()
}

export function bandKey(group = '') {
  const r = rootGroup(group)
  if (r.startsWith('Poppin')) return 'ppp'
  if (r.startsWith('Afterglow')) return 'afterglow'
  if (r.startsWith('Pastel')) return 'pastel'
  if (r.startsWith('Roselia')) return 'roselia'
  if (r.startsWith('Hello')) return 'hhw'
  if (r.startsWith('Morfonica')) return 'morfonica'
  if (r.startsWith('RAISE')) return 'ras'
  if (r.startsWith('MyGO')) return 'mygo'
  if (r.startsWith('Ave')) return 'ave'
  if (r.startsWith('Glitter')) return 'glitter'
  if (r.startsWith('BanG')) return 'bang'
  return 'other'
}

export function bandMeta(group) {
  return BAND_META[bandKey(group)] || BAND_META.other
}

// 一個活動的主色 = 第一個關聯樂團
export function primaryMeta(event) {
  const first = event.relatedGroups && event.relatedGroups[0]
  return first ? bandMeta(first) : BAND_META.other
}
