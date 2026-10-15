import Icon from './Icon.jsx'
import { FRIEND_SITES } from '../data/friendSites.js'

const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
const threadsUrl = (h) => `https://www.threads.com/@${h}`

// 好站連結：頁首的連結圖示進來。一站一張卡，站名與「前往網站」都開新分頁。
export default function FriendsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="eyebrow"><Icon n="link" className="text-[10px]" /> 好站連結</div>
        <h2 className="section-h mt-1.5">同好做的站</h2>
        <p className="mt-2 text-[16px] text-dream-sub max-w-2xl leading-relaxed">
          大家各自做了好用的東西，這裡互相連一下。想交換連結的話，Threads 找{' '}
          <a href={threadsUrl('tsty1215.bdforever')} target="_blank" rel="noopener noreferrer"
            className="underline hover:text-dream-ink">@tsty1215.bdforever</a>。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FRIEND_SITES.map(s => (
          <article key={s.url} className="glass-soft overflow-hidden flex flex-col">
            {s.shot && (
              <a href={s.url} target="_blank" rel="noopener noreferrer" tabIndex={-1}
                className="group relative block aspect-video overflow-hidden border-b border-dream-line/70 dark:border-white/10">
                <picture className="contents">
                  <source type="image/avif" srcSet={`/friends/${s.shot}.avif`} />
                  <img src={`/friends/${s.shot}.webp`} alt={`${s.name} 首頁`} loading="lazy" decoding="async"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                </picture>
              </a>
            )}

            <div className="p-5 sm:p-6 flex flex-col flex-1">
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                className="font-display font-bold text-[20px] text-dream-ink hover:text-bloom-indigo">
                {s.name}
              </a>
              <div className="mt-0.5 text-[14px] text-dream-faint">{host(s.url)}</div>

              {/* 作者要看得到是誰做的：名字下面直接一行，頭像用帳號首字母代替（Threads 拿不到頭像） */}
              {s.threads && (
                <a href={threadsUrl(s.threads)} target="_blank" rel="noopener noreferrer"
                  className="mt-3 self-start max-w-full inline-flex items-center gap-2.5 rounded-full pl-1 pr-4 py-1 bg-bloom-indigo/10 hover:bg-bloom-indigo/15 transition-colors">
                  <span aria-hidden className="grid place-items-center w-8 h-8 rounded-full bg-bloom-indigo text-white font-display font-bold text-[15px] uppercase shrink-0">
                    {s.threads[0]}
                  </span>
                  <span className="min-w-0 truncate text-[16px] font-bold text-dream-ink">@{s.threads}</span>
                </a>
              )}

              <p className="mt-3 text-[16px] text-dream-sub leading-relaxed flex-1">{s.note}</p>

              <div className="mt-5 flex justify-end">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="pill shrink-0">
                  前往網站 <Icon n="arrow-right" className="text-[11px] ml-1" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
