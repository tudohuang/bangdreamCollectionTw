import { setlistOf, pricesOf, goodsOf, keyVisualOf, songIndex } from '../utils/archive.js'
import Icon from './Icon.jsx'

// 史料層的四塊：曲目、票價、周邊、主視覺。
// 沒資料的整塊不出現 —— 空殼比沒有更糟，它會讓人以為這站沒東西。
export default function ArchiveSection({ event, allEvents = [], color, glow }) {
  const songs = setlistOf(event)
  const price = pricesOf(event)
  const goods = goodsOf(event)
  const kv = keyVisualOf(event)
  if (!songs.length && !price && !goods.length && !kv) return null

  // 這場的每一首歌在台灣被唱過幾次。只有曲目資料多起來才有意義，
  // 所以第二場以上才顯示次數。
  const counts = songs.length ? new Map(songIndex(allEvents).map(s => [s.title, s.count])) : null

  return (
    <div className="space-y-6">
      {songs.length > 0 && (
        <section>
          <Head icon="music" color={color}>曲目 {songs.length} 首</Head>
          <ol className="border-t" style={{ borderColor: `rgba(${glow},0.35)` }}>
            {songs.map(s => {
              const n = counts?.get(s.title) || 1
              return (
                <li key={`${s.n}-${s.title}`}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 border-b"
                  style={{ borderColor: `rgba(${glow},0.18)` }}>
                  <span className="font-round font-bold text-[12px] tabular-nums text-right"
                    style={{ color: s.encore ? color : undefined }}>
                    {s.encore ? 'EN' : s.n}
                  </span>
                  <span className="min-w-0 font-display font-semibold text-[14.5px] text-dream-ink">
                    {s.title}
                  </span>
                  {n > 1 && (
                    <span className="text-[11px] text-dream-faint tabular-nums shrink-0">
                      台灣第 {n} 次
                    </span>
                  )}
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
                {t.label && <div className="text-[11px] text-dream-faint">{t.label}</div>}
              </div>
            ))}
          </div>
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
                    <span className="ml-2 text-[10.5px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `rgba(${glow},0.16)`, color }}>台版限定</span>
                  )}
                </span>
                {g.price != null && (
                  <span className="shrink-0 font-round font-bold text-[13px] tabular-nums text-dream-sub">
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
    <h3 className="flex items-center gap-2 font-display font-bold text-[15px] text-dream-ink mb-2">
      <Icon n={icon} className="text-[11px]" style={{ color }} />{children}
    </h3>
  )
}
