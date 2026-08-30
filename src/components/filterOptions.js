// 篩選的選項清單。
//
// 篩選列（FilterPanel）與篩選抽屜（FilterSheet）都要用同一組 ——
// 抽屜是從篩選列拆出去的，這三個常數當時沒跟著搬，結果抽屜一打開就
// 「TIMEFRAMES is not defined」整塊掛掉。
//
// 放共用檔而不是各自複製：兩份遲早會分岔，而分岔的症狀是
// 「同一個篩選在兩個地方選項不一樣」，那種錯很難被發現。

export const TIMEFRAMES = [
  ['全部', 'all'], ['即將', 'upcoming'], ['已結束', 'past'],
  ['今年', 'thisYear'], ['本月', 'thisMonth'],
]

export const ORDERS = [
  ['日期↑', 'date-asc'], ['日期↓', 'date-desc'],
  ['人次', 'attendance'], ['編號', 'number'],
]

export const VIEWS = [
  ['卡片', 'cards', 'grid'],
  ['時間軸', 'timeline', 'bars-staggered'],
  ['總表', 'table', 'table'],
]

// 工具列只留兩種常用檢視；總表是給要對資料的人用的，收進「全部篩選」。
// 已經在總表裡的時候要把它顯示出來，不然沒有路可以切回去。
export const mainViews = (view) => (view === 'table' ? VIEWS : VIEWS.slice(0, 2))

// 「進階」算幾個條件時要看的欄位。年份、樂團、人物… 這些收在抽屜裡。
export const ADV_KEYS = ['year', 'groups', 'people', 'characters', 'types', 'venues', 'cities', 'fullBand']
