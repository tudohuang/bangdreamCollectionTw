import { lazy, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'

// 人物／樂團／主辦／場館／系列這五種「某一個東西的頁面」。
//
// 從 App 抽出來的原因不是行數，是重複：五個分支各自寫一次
// ErrorBoundary + Suspense + fallback 高度 + 同一組 props，
// 加第六種就要再抄一次，而抄漏一個 ErrorBoundary 不會有人發現 ——
// 那一頁只是在出錯時整頁變白。

const ProfilePage = lazy(() => import('./ProfilePage.jsx'))
const OrganizerPage = lazy(() => import('./OrganizerPage.jsx'))
const VenuePage = lazy(() => import('./VenuePage.jsx'))
const SeriesPage = lazy(() => import('./SeriesPage.jsx'))
const SongPage = lazy(() => import('./SongPage.jsx'))

// person 與 band 共用 ProfilePage，靠 kind 分辨；其餘各有各的頁
const PAGES = {
  org: OrganizerPage,
  venue: VenuePage,
  series: SeriesPage,
  song: SongPage,
}

export default function ProfileRoute({ profile, events, attended, sheetRoster, songMeta,
  onToggleAttended, onSelect, onClose, fallback }) {
  if (!profile) return null

  const Page = PAGES[profile.kind] || ProfilePage
  // 只有 ProfilePage 需要打卡狀態與名冊；多傳給別的頁沒有壞處，
  // 但明著分開比較看得出誰要什麼。
  const extra = profile.kind === 'song'
    ? { songMeta }
    : PAGES[profile.kind]
      ? {}
      : { kind: profile.kind, attended, onToggleAttended, sheetRoster }

  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <Page
          value={profile.value}
          events={events}
          onSelect={onSelect}
          onClose={onClose}
          {...extra}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
