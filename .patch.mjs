import { readFileSync, writeFileSync } from 'node:fs'
export function patch(path, pairs) {
  let s = readFileSync(path, 'utf8')
  for (const [old, nw] of pairs) {
    if (!s.includes(old)) { console.log('✗ MISS', path, '::', old.split('\n')[0].slice(0, 56)); continue }
    s = s.replace(old, nw); console.log('✓', path, '::', old.split('\n')[0].slice(0, 56))
  }
  writeFileSync(path, s, 'utf8')
}
