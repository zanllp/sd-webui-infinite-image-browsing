export const getShortcutStrFromEvent = (e: KeyboardEvent) => {
  const keys = [] as string[]
  if (e.shiftKey) {
    keys.push('Shift')
  }
  if (e.ctrlKey) {
    keys.push('Ctrl')
  }
  if (e.metaKey) {
    keys.push('Cmd')
  }
  if (e.code.startsWith('Key') || e.code.startsWith('Digit')) {
    keys.push(e.code)
  }
  if (e.key ==='Escape') {
    keys.push('Esc')
  }
  const keysStr = keys.join(' + ')
  return keysStr
}
