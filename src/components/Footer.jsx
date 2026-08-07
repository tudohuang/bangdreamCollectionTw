import Icon from './Icon.jsx'
import { REPORT_URL } from '../config.js'

function sourceText(source, updatedAt) {
  const t = updatedAt ? new Date(updatedAt).toLocaleString('zh-TW', { hour12: false }) : ''
  if (source === 'loading') return '資料更新中…'
  if (source === 'sheet') return `資料來源：Google Sheet（即時）${t ? ' · ' + t : ''}`
  if (source === 'cached') return `資料來源：本機快取${t ? ' · ' + t : ''}（背景更新中）`
  if (source === 'error') return '即時更新失敗，正在使用內建資料'
  return ''
}

const NAV = [['#/collection', '圖鑑'], ['#/people', '聲優'], ['#/stats', '數據'], ['#/me', '我的']]

export default function Footer({ source = 'bundled', updatedAt, onRetry }) {
  const txt = sourceText(source, updatedAt)
  return (
    <footer className="relative z-10 mt-8">
      <div className="max-w-6xl xl:max-w-[1400px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-8 pb-10">
        <div className="glass-soft px-6 sm:px-8 py-7">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-bloom-rose to-bloom-indigo text-white text-[14px] shadow-sm dark:shadow-[0_0_14px_-2px_rgba(217,70,239,0.6)]"><Icon n="music" /></span>
              <div>
                <div className="font-display font-bold text-[15px] text-dream-ink">邦邦來台圖鑑</div>
                <div className="text-[11px] text-dream-faint">Taiwan BanG Dream! Collection</div>
              </div>
            </div>
            <nav className="flex items-center gap-1 text-[13px] text-dream-sub">
              {NAV.map(([href, label]) => (
                <a key={href} href={href}
                  className="rounded-full px-3 py-1.5 hover:text-dream-ink hover:bg-dream-line/60 transition-colors dark:hover:bg-white/10">
                  {label}
                </a>
              ))}
              {REPORT_URL && (
                <a href={REPORT_URL} target="_blank" rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-bloom-indigo bg-bloom-indigo/10 hover:bg-bloom-indigo hover:text-white transition-colors">
                  <Icon n="heart" className="text-[10px]" /> 資料回報
                </a>
              )}
            </nav>
          </div>

          <div className="mt-5 pt-4 border-t border-dream-line/70 dark:border-white/10 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between text-[12px] text-dream-faint">
            <span>
              粉絲自主整理的非官方站 · 看到錯漏跟我們說一聲
              <span className="font-hand text-[12.5px] ml-2 text-dream-faint">（站長手動更新中，通常在半夜）</span>
            </span>
            {txt && (
              <span>
                {txt}
                {(source === 'error' || source === 'cached') && onRetry && (
                  <button onClick={onRetry} className="ml-2 underline hover:text-dream-ink">重試</button>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
