import Icon from './Icon.jsx'

// 給第一次來的人。
//
// 站長自己是重度玩家，很容易假設所有人都知道「本體」「擦邊」「FMT」是什麼；
// 但被朋友推薦進來的人不一定知道，看不懂就會直接離開。三行就夠。

const TERMS = [
  ['收什麼', 'BanG Dream! 的官方活動，以及出演聲優、樂手以個人身分來台的活動。'],
  ['本體', '以 BanG Dream! 企劃或旗下樂團名義舉辦的活動。'],
  ['個人', '出演者以自己或其他作品的身分來台，站上仍會標註她所屬的團。'],
]

const ABBR = [
  ['FMT', '見面會 Fan Meeting'],
  ['LIVE', '演唱會'],
  ['手渡／親遞', '本人親手把禮物或簽名遞給你'],
  ['公錄', '廣播或節目的公開錄音'],
]

export default function Primer() {
  return (
    <details className="glass mt-6 px-5 py-4 group">
      <summary className="flex items-center gap-2 cursor-pointer text-[14px] font-semibold text-dream-ink marker:text-dream-faint">
        <Icon n="note-sticky" className="text-bloom-sky text-[12px]" />
        第一次來？這個站收什麼
      </summary>

      <dl className="mt-4 grid sm:grid-cols-3 gap-x-6 gap-y-3 text-[14px] leading-relaxed">
        {TERMS.map(([term, note]) => (
          <div key={term}>
            <dt className="font-semibold text-dream-ink">{term}</dt>
            <dd className="text-dream-sub mt-0.5">{note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 pt-3.5 border-t border-dream-line dark:border-white/10">
        <div className="text-[14px] font-bold text-dream-faint mb-2">常見縮寫</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
          {ABBR.map(([k, v]) => (
            <span key={k}>
              <span className="font-semibold text-dream-ink">{k}</span>
              <span className="text-dream-faint"> · {v}</span>
            </span>
          ))}
        </div>
      </div>
    </details>
  )
}
