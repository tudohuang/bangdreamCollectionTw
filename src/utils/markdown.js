// 極簡 Markdown → HTML。只支援心得會用到的語法，不引外部套件。
//
// 安全性：先把整段做 HTML escape，之後才插入標籤，
// 所以來源就算含 <script> 也只會被當成文字顯示。

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// 行內語法：粗體 / 斜體 / 行內碼 / 連結
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

// 區塊語法：標題 / 引言 / 清單 / 分隔線 / 段落
export function renderMarkdown(src) {
  if (!src) return ''
  const lines = esc(src).replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let para = []      // 累積中的段落
  let list = null    // 累積中的清單項目

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  const flushList = () => {
    if (list) out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`)
    list = null
  }
  const flush = () => { flushPara(); flushList() }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }

    const heading = line.match(/^(#{2,4})\s+(.*)$/)
    const quote = line.match(/^&gt;\s?(.*)$/)
    const item = line.match(/^[-*]\s+(.*)$/)

    if (heading) {
      flush()
      const level = Math.min(heading[1].length + 1, 5)
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
    } else if (line === '---') {
      flush()
      out.push('<hr/>')
    } else if (quote) {
      flush()
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`)
    } else if (item) {
      flushPara()
      ;(list ||= []).push(item[1])
    } else {
      flushList()
      para.push(line)
    }
  }
  flush()
  return out.join('')
}

// 讀 --- 包起來的 YAML-ish 前置資料（只支援 key: value 單行）
export function parseFrontMatter(text) {
  const m = String(text ?? '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: String(text ?? '').trim() }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([^:]+):\s*(.*)$/)
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: m[2].trim() }
}
