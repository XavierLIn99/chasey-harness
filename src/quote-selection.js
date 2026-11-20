// Browsers expose both visual glyphs and accessibility text for rendered math.
export function selectedSource(selection, reader) {
  if (!selection?.rangeCount || selection.isCollapsed) return ''
  const range = selection.getRangeAt(0).cloneRange()
  function formula(node) {
    const el = node.nodeType === 1 ? node : node.parentElement
    return el?.closest('.katex-display') ?? el?.closest('.katex')
  }
  const first = formula(range.startContainer), last = formula(range.endContainer)
  if (first) range.setStartBefore(first)
  if (last) range.setEndAfter(last)
  if (!first && !last && !reader.querySelector('.katex')) return selection.toString().trim()
  const fragment = range.cloneContents()
  const formulas = fragment.querySelectorAll('.katex')
  if (!formulas.length) return selection.toString().trim()
  for (const item of formulas) {
    const source = item.querySelector('annotation[encoding="application/x-tex"]')?.textContent
    if (source == null) continue
    const display = item.closest('.katex-display')
    ;(display ?? item).replaceWith(display ? '\\['+source+'\\]' : '\\('+source+'\\)')
  }
  const copy=reader.ownerDocument.createElement('div')
  copy.style.cssText='position:fixed;left:-100000px;pointer-events:none'
  copy.append(fragment)
  reader.append(copy)
  try {return copy.innerText.trim()} finally {copy.remove()}
}
