import Icon from './Icon.jsx'

// 分段控制項：一排互斥的選項，選中的那格填色。
// 篩選列與篩選抽屜都在用，所以放這裡而不是任一邊的檔案裡。

export default function Segmented({ value, onChange, options, full }) {
  return (
    <div className={`flex shrink-0 p-1 rounded-full bg-white border border-dream-line overflow-x-auto scrollbar-none max-w-full dark:bg-white/[.06] dark:border-white/15 ${full ? 'w-full' : ''}`}>
      {options.map(([l, v, icon]) => (
        <button key={v}
          className={`${full ? 'flex-1 justify-center' : 'shrink-0'} whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-medium transition-colors ${
            value === v
              ? 'bg-bloom-indigo text-white shadow-sm'
              : 'text-dream-sub hover:text-dream-ink hover:bg-dream-line/50 dark:hover:bg-white/10'}`}
          onClick={() => onChange(v)}>
          {icon && <Icon n={icon} className="text-[11px] opacity-80" />}
          {l}
        </button>
      ))}
    </div>
  )
}



