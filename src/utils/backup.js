// 打卡紀錄的可攜備份碼。
//
// 這站刻意不做帳號：登入、個資、密碼重設的維護成本遠高於它能換到的東西。
// 代價是紀錄只活在這台裝置的 localStorage 裡，換手機就沒了。
// 折衷做法是把整份紀錄壓成一段可以複製貼上的短字串 ——
// 使用者自己保管，換裝置貼回去就好，不需要伺服器也不需要交出任何資料。
//
// 編碼：版本位元組 + 位元圖（第 n 個 bit = 編號 n 有沒有打卡）+ 校驗位元組，
// 再轉 base64url。59 場只要 12 個字元左右，短到可以塞進聊天訊息。

const PREFIX = 'BDTW'
const VERSION = 2

const numberOf = (id) => {
  const n = Number(String(id).replace(/^evt-/, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}
const idOf = (n) => `evt-${String(n).padStart(3, '0')}`

const toBase64Url = (bytes) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(text.length / 4) * 4, '=')
  const bin = atob(padded)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

const checksum = (bytes) => bytes.reduce((a, b) => (a + b) % 256, 0)

// Set<'evt-042'> → 'BDTW:v2:AwBI'
export function exportCode(attended) {
  const numbers = [...(attended || [])].map(numberOf).filter(Boolean)
  if (!numbers.length) return ''

  const bitmap = new Uint8Array(Math.ceil(Math.max(...numbers) / 8))
  for (const n of numbers) bitmap[(n - 1) >> 3] |= 1 << ((n - 1) & 7)

  const body = Uint8Array.from([VERSION, ...bitmap])
  return `${PREFIX}:v${VERSION}:${toBase64Url(Uint8Array.from([...body, checksum(body)]))}`
}

// 'BDTW:v2:AwBI' → { ids: Set, numbers: [] }；認不得就回 null，不要吃掉錯誤
export function importCode(code) {
  const text = String(code || '').trim().replace(/\s+/g, '')
  const m = text.match(/^BDTW:v(\d+):([A-Za-z0-9_-]+)$/)
  if (!m || Number(m[1]) !== VERSION) return null

  let bytes
  try { bytes = fromBase64Url(m[2]) } catch { return null }
  if (bytes.length < 3 || bytes[0] !== VERSION) return null

  const body = bytes.slice(0, -1)
  if (checksum(body) !== bytes[bytes.length - 1]) return null

  const numbers = []
  for (let i = 1; i < body.length; i++) {
    for (let bit = 0; bit < 8; bit++) {
      if (body[i] & (1 << bit)) numbers.push((i - 1) * 8 + bit + 1)
    }
  }
  return { numbers, ids: new Set(numbers.map(idOf)) }
}
