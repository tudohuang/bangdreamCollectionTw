import { setlistOf, pricesOf, goodsOf, keyVisualOf, salesOf, programmeOf } from '../utils/archive.js'
import { songKey, setlistWithFirsts } from '../utils/songs.js'
import { bandMeta } from '../utils/bands.js'
import Icon from './Icon.jsx'

// 史料層的四塊：曲目、票價、周邊、主視覺。
// 沒資料的整塊不出現 —— 空殼比沒有更糟，它會讓人以為這站沒東西。
export default function ArchiveSection({ event, allEvents = [], color, glow }) {
  // 曲目連同「台灣首唱」「這首唱過幾次」一起算好
  const songs = setlistWithFirsts(event, allEvents)
  // 非歌曲的項目（MC、影片）也要顯示 —— 它們是現場的一部分
  const lines = setlistOf(event)
  // 雙團場才需要標「這首誰唱的」；單團場每一行都同一個團，標了是雜訊
  const multiBand = new Set(songs.map(s => s.band).filter(Boolean)).size > 1
  const price = pricesOf(event)
  const goods = goodsOf(event)
  const kv = keyVisualOf(event)
  const sales = salesOf(event)
  const programme = programmeOf(event)
  if (!songs.length && !price && !goods.length && !kv && !sales && !programme.length) return null

  // 這場的每一首歌在台灣被唱過幾次。只有曲目資料多起來才有意義，
  // 所以第二場以上才顯示次數。

  return (
    <div className="space-y-6">
      {songs.length > 0 && (
        <section>
          <Head icon="music" color={color}>曲目 {songs.length} 首</Head>
          <ol className="border-t" style={{ borderColor: `rgba(${glow},0.35)` }}>
            {lines.map(s => {
              const info = songs.find(x => x.title === s.title && x.n === s.n)
              const n = info?.countInTw || 1
              const bm = s.band ? bandMeta(s.band) : null
              return (
                <li key={`${s.n}-${s.title}`}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 border-b"
                  style={{ borderColor: `rgba(${glow},0.18)` }}>
                  <span className="font-round font-bold text-[14px] tabular-nums text-right"
                    style={{ color: s.encore ? color : undefined }}>
                    {!s.isSong ? '·' : s.encore ? (s.encoreRound > 1 ? 'EN' + s.encoreRound : 'EN') : s.n}
                  </span>
                  {/* 每一首連到它自己的頁：這首在台灣唱過幾次、誰唱的、第一次是什麼時候 */}
                  {s.isSong ? (
                    <a href={`#/song/${encodeURIComponent(songKey(s.title))}`}
                      className="min-w-0 truncate font-display font-semibold text-[14px] text-dream-ink hover:text-bloom-violet transition-colors">
                      {s.title}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate text-[14px] text-dream-faint">{s.title}</span>
                  )}
                  <span className="shrink-0 flex items-baseline gap-2 text-[14px] tabular-nums">
                    {/* 誰唱的：只有雙團場才標。單團場每一行都同一個團，標了是雜訊 */}
                    {multiBand && s.band && (
                      <span style={{ color: bm?.color }}>{s.band}</span>
                    )}
                    {/* 台灣首唱：曲目一填就自動算出來，不需要任何額外欄位 */}
                    {info?.firstInTw && (
                      <span className="font-bold" style={{ color }}>台灣首唱</span>
                    )}
                    {n > 1 && <span className="text-dream-faint">第 {n} 次</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {price && (
        <section>
          <Head icon="tag" color={color}>票價</Head>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
            {price.tiers.map(t => (
              <div key={t.text} className="min-w-0">
                <div className="font-display font-extrabold text-[19px] tabular-nums" style={{ color }}>
                  {t.amount != null ? t.amount.toLocaleString('zh-TW') : t.text}
                </div>
                {t.label && <div className="text-[14px] text-dream-faint">{t.label}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {sales && (
        <section>
          <Head icon="tag" color={color}>售票狀況</Head>
          <p className="pt-2 text-[15px] text-dream-ink">
            {sales.sold && (
              <span className="mr-2 text-[14px] font-bold px-2 py-0.5 rounded"
                style={{ background: `rgba(${glow},0.16)`, color }}>完售</span>
            )}
            {sales.raw}
          </p>
        </section>
      )}

      {programme.length > 0 && (
        <section>
          <Head icon="note-sticky" color={color}>場刊目次 {programme.length} 項</Head>
          <ul className="border-t" style={{ borderColor: `rgba(${glow},0.35)` }}>
            {programme.map(p => (
              <li key={p} className="py-2 border-b text-[15px] text-dream-ink"
                style={{ borderColor: `rgba(${glow},0.18)` }}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {goods.length > 0 && (
        <section>
          <Head icon="star" color={color}>場販周邊 {goods.length} 項</Head>
          <ul className="border-t" style={{ borderColor: `rgba(${glow},0.35)` }}>
            {goods.map(g => (
              <li key={g.name}
                className="flex items-baseline justify-between gap-3 py-2 border-b"
                style={{ borderColor: `rgba(${glow},0.18)` }}>
                <span className="min-w-0 text-[14px] text-dream-ink">
                  {g.name}
                  {g.taiwanOnly && (
                    <span className="ml-2 text-[14px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `rgba(${glow},0.16)`, color }}>台版限定</span>
                  )}
                </span>
                {g.price != null && (
                  <span className="shrink-0 font-round font-bold text-[14px] tabular-nums text-dream-sub">
                    {g.price.toLocaleString('zh-TW')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {kv && (
        <section>
          <Head icon="palette" color={color}>主視覺</Head>
          <p className="pt-2 text-[14px] text-dream-ink">
            {kv.url
              ? <a href={kv.url} target="_blank" rel="noopener noreferrer"
                  className="hover:text-bloom-violet transition-colors inline-flex items-center gap-1.5">
                  {kv.artist}<Icon n="link" className="text-[9px] opacity-50" />
                </a>
              : kv.artist}
          </p>
        </section>
      )}
    </div>
  )
}

function Head({ icon, color, children }) {
  return (
    <h3 className="flex items-center gap-2 font-display font-bold text-[16px] text-dream-ink mb-2">
      <Icon n={icon} className="text-[11px]" style={{ color }} />{children}
    </h3>
  )
}
