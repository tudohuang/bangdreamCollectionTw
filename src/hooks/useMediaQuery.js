import { useEffect, useState } from 'react'

// 依視窗寬度切版型用（例如 xl 以上把篩選改成左側常駐側欄）
export function useMediaQuery(query) {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const sync = () => setMatch(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [query])
  return match
}
