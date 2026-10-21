import PulsePage from './PulsePage.jsx'
import VenueTour from './VenueTour.jsx'
import Icon from './Icon.jsx'

// Labs：好玩但不保證準的東西都放這裡。
// 分出來的理由很實際 —— 來台觀測室曾經三天就被主辦空降打臉，
// 那種東西擺在主導覽會拖累整站的可信度，擺在 Labs 反而變成特色。
export default function LabsPage(props) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="eyebrow"><Icon n="wand-magic-sparkles" className="text-[10px]" /> Labs</div>
        <h2 className="section-h mt-1.5">來台觀測室 <span className="align-middle text-[14px] font-medium text-dream-faint">Beta</span></h2>
        <p className="mt-2 text-[14px] text-dream-sub max-w-2xl leading-relaxed">
          本區只整理公開訊號，不負責阻止主辦突然空降活動。
          圖鑑那邊的數字是查證過的紀錄，這裡的推論不是 —— 看看就好。
        </p>
      </div>

      <PulsePage {...props} />

      <div className="mt-8">
        <div className="eyebrow"><Icon n="location-dot" className="text-[10px]" /> 3D</div>
        <h2 className="section-h mt-1.5">場館巡禮</h2>
        <p className="mt-2 text-[15px] text-dream-sub max-w-2xl leading-relaxed">
          照時間順序，從第一場一路飛到最近一場。光柱越高，那個場館辦過越多場。
        </p>
      </div>
      <VenueTour events={props.events} attended={props.attended} onSelectEvent={props.onSelectEvent} />
    </section>
  )
}
