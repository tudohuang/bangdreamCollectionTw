import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

// 頁首：搜尋是主角。
// 以前搜尋是一顆按鈕、按了才跳出另一個面板；現在直接是輸入框，打字就到資料庫即時篩。
// 桌機一排：站名｜分頁｜搜尋｜我的・好站・深色。手機兩排：站名（或返回）＋我的・好站・深色／搜尋；分頁在底部。
export default function AppHeader({ tabs, page, title, onGo, onBack, search, onSearch, inputRef, meOn, onMe, linksOn, onLinks, dark, onToggleDark }) {
  // 搜尋框桌機、手機各一個（版面不同），⌘K 與 / 要聚焦的是「現在看得到的那一個」
  const fields = useRef([])
  useEffect(() => {
    if (inputRef) inputRef.current = { focus: () => fields.current.find(el => el?.offsetParent)?.focus() }
  }, [inputRef])
  const field = (i) => (
    <label className="relative flex items-center w-full">
      <Icon n="magnifying-glass" className="absolute left-3.5 text-[13px] text-dream-faint pointer-events-none" />
      <input ref={(el) => { fields.current[i] = el }} type="search" value={search} onChange={(e) => onSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}
        placeholder="搜尋活動、聲優、樂團、場館" aria-label="搜尋" enterKeyHint="search"
        className="w-full h-10 pl-10 pr-9 rounded-full bg-dream-line/50 border border-transparent text-[16px] sm:text-[14px] text-dream-ink placeholder:text-dream-faint
          focus:outline-none focus:bg-white focus:border-bloom-indigo/60 transition-colors
          dark:bg-white/[.07] dark:focus:bg-white/10 [&::-webkit-search-cancel-button]:hidden" />
      {search && (
        <button onClick={() => onSearch('')} aria-label="清除搜尋"
          className="absolute right-2 grid place-items-center w-7 h-7 rounded-full text-dream-faint hover:text-dream-ink">
          <Icon n="xmark" className="text-[12px]" />
        </button>
      )}
    </label>
  )

  const tools = (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onMe} aria-label="我的收藏" title="我的收藏"
        className={`icon-btn ${meOn ? '!text-bloom-indigo' : ''}`}>
        <Icon n="circle-check" />
      </button>
      <button onClick={onLinks} aria-label="好站連結" title="好站連結"
        className={`icon-btn ${linksOn ? '!text-bloom-indigo' : ''}`}>
        <Icon n="link" />
      </button>
      <button onClick={onToggleDark} aria-label="切換深色模式" title={dark ? '切回淺色' : '深色模式'} className="icon-btn">
        <Icon n={dark ? 'sun' : 'moon'} />
      </button>
    </div>
  )

  const brand = (
    <a href="#/" onClick={(e) => { e.preventDefault(); onGo('home') }} className="flex items-center gap-2.5 shrink-0">
      <Logo size={32} />
      <span className="font-display font-bold text-[16px] text-dream-ink">邦邦來台圖鑑</span>
    </a>
  )

  return (
    <>
      {/* 桌機 */}
      <div className="hidden sm:flex max-w-6xl xl:max-w-[1280px] mx-auto px-6 lg:px-8 h-16 items-center gap-6">
        {onBack ? <BackButton onBack={onBack} title={title} /> : brand}
        <nav className="flex items-center gap-1 text-[14px]" aria-label="主導覽">
          {tabs.map(([p, label]) => {
            const on = page === p && !onBack
            return (
              <button key={p} onClick={() => onGo(p)} aria-current={on ? 'page' : undefined}
                className={`relative h-16 px-3 font-semibold transition-colors ${on ? 'text-dream-ink' : 'text-dream-faint hover:text-dream-ink'}`}>
                {label}
                {on && <span aria-hidden className="absolute left-3 right-3 bottom-0 h-[2.5px] rounded-t-full bg-bloom-indigo" />}
              </button>
            )
          })}
        </nav>
        <div className="flex-1 max-w-md ml-auto">{field(0)}</div>
        {tools}
      </div>

      {/* 手機 */}
      <div className="sm:hidden px-4 pt-2 pb-3">
        <div className="h-11 flex items-center justify-between gap-2">
          {onBack ? <BackButton onBack={onBack} title={title} /> : brand}
          {tools}
        </div>
        <div className="mt-1.5">{field(1)}</div>
      </div>
    </>
  )
}

function BackButton({ onBack, title }) {
  return (
    <button onClick={onBack} className="flex items-center gap-2 min-w-0 shrink text-dream-ink">
      <Icon n="chevron-left" className="text-[14px]" />
      <span className="font-display font-bold text-[16px] truncate">{title}</span>
    </button>
  )
}
