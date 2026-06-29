// 自架 FontAwesome SVG 子集 — 只打包下面這些圖示，移除整包 CDN。
// 用法：<Icon n="music" />、<Icon n="calendar" /> 等。
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMusic, faStar, faFire, faPalette, faCrown, faRainbow, faBolt, faGuitar,
  faMasksTheater, faWandMagicSparkles, faCompactDisc, faMicrophone,
  faMagnifyingGlass, faUsers, faUser, faLocationDot, faNoteSticky, faLink,
  faXmark, faChevronDown, faChevronLeft, faChevronRight, faArrowRotateLeft,
  faArrowUp, faHeart, faCircleCheck, faBullseye, faMoon, faSun, faClock, faUserGroup,
} from '@fortawesome/free-solid-svg-icons'
import { faCalendar, faClipboard } from '@fortawesome/free-regular-svg-icons'

const MAP = {
  music: faMusic,
  star: faStar,
  fire: faFire,
  palette: faPalette,
  crown: faCrown,
  rainbow: faRainbow,
  bolt: faBolt,
  guitar: faGuitar,
  'masks-theater': faMasksTheater,
  'wand-magic-sparkles': faWandMagicSparkles,
  'compact-disc': faCompactDisc,
  microphone: faMicrophone,
  'magnifying-glass': faMagnifyingGlass,
  users: faUsers,
  'user-group': faUserGroup,
  user: faUser,
  'location-dot': faLocationDot,
  'note-sticky': faNoteSticky,
  link: faLink,
  xmark: faXmark,
  'chevron-down': faChevronDown,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  'arrow-rotate-left': faArrowRotateLeft,
  'arrow-up': faArrowUp,
  heart: faHeart,
  'circle-check': faCircleCheck,
  bullseye: faBullseye,
  moon: faMoon,
  sun: faSun,
  clock: faClock,
  // 線框版
  calendar: faCalendar,
  clipboard: faClipboard,
}

export default function Icon({ n, className, style, fixedWidth }) {
  if (import.meta.env?.DEV && n && !MAP[n]) console.warn(`[Icon] 未知圖示名「${n}」，已 fallback 成 star`)
  const icon = MAP[n] || faStar
  return <FontAwesomeIcon icon={icon} className={className} style={style} fixedWidth={fixedWidth} />
}
