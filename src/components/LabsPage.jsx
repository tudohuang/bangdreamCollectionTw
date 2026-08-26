import { useState } from 'react'
import PulsePage from './PulsePage.jsx'
import VariantsPage from './variants/VariantsPage.jsx'
import Icon from './Icon.jsx'

// Labs 目前有兩塊：來台觀測室（既有）與三個版本的比較（暫時的）。
// 選定版本之後，variants/ 整個資料夾會拆掉。
const SECTIONS = [
  ['observatory', '來台觀測室'],
  ['variants', '三個版本'],
]

// Labs：好玩但不保證準的東西都放這裡。
// 分出來的理由很實際 —— 來台觀測室曾經三天就被主辦空降打臉，
// 那種東西擺在主導覽會拖累整站的可信度，擺在 Labs 反而變成特色。
export default function LabsPage(props) {
  const [section, setSection] = useState('variants')
  return (
    <section className="flex flex-col gap-6">
      <div className="flex gap-2">
        {SECTIONS.map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              section === key ? 'bg-bloom-indigo text-white' : 'border border-dream-line text-dream-sub dark:border-white/15'}`}>
            {label}
          </button>
        ))}
      </div>

      {section === 'variants' && (
        <VariantsPage events={props.events} attended={props.attended} onSelect={props.onSelectEvent} />
      )}

      {section === 'observatory' && (<>
      <div>
        <div className="eyebrow"><Icon n="wand-magic-sparkles" className="text-[10px]" /> Labs</div>
        <h2 className="section-h mt-1.5">來台觀測室 <span className="align-middle text-[13px] font-medium text-dream-faint">Beta</span></h2>
        <p className="mt-2 text-[14px] text-dream-sub max-w-2xl leading-relaxed">
          本區只整理公開訊號，不負責阻止主辦突然空降活動。
          圖鑑那邊的數字是查證過的紀錄，這裡的推論不是 —— 看看就好。
        </p>
      </div>

      <PulsePage {...props} />
      </>)}
    </section>
  )
}
