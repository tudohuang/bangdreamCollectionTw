import { REPORT_URL } from '../config.js'
import Icon from './Icon.jsx'

// 社群共筆入口：缺場次／有照片情報，歡迎一起補。沒設定 REPORT_URL 就不顯示。
export default function Contribute() {
  if (!REPORT_URL) return null
  return (
    <div className="glass overflow-hidden">
      <div className="h-1.5 w-full bg-bloom-indigo" />
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
        <div className="flex items-start gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-full bg-bloom-rose/15 text-bloom-rose text-xl shrink-0">
            <Icon n="heart" />
          </span>
          <div>
            <h2 className="font-display font-bold text-xl text-dream-ink">一起補完這本圖鑑</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-dream-sub max-w-lg">
              少了哪一場？有現場照片、購票連結或情報？歡迎回報，讓台邦在台灣的回憶更完整——這是大家的共同紀錄。
            </p>
          </div>
        </div>
        <a href={REPORT_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[14px] font-bold text-white bg-bloom-indigo hover:bg-bloom-violet transition-colors shrink-0">
          <Icon n="link" /> 幫補資料
        </a>
      </div>
    </div>
  )
}
