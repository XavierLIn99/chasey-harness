// Keep Markdown literals and existing formulas intact when recognizing legacy variables.
const tokens = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ `~\t]*$|(?![\s\S]))|^(?: {4}|\t)[^\n]*|(`+)(?!`)[\s\S]*?(?<!`)\2(?!`)|!?\[[^\]\n]*\]\([^\n]*?\)|(?:https?:\/\/|www\.)\S+|\\\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$(?!\s)(?:\\.|[^$\n\\])+?(?<!\s)\$(?!\d)|(?<![A-Za-z0-9_\\])[A-Za-zΑ-Ωα-ω](?:[_^](?:\{[A-Za-z0-9]{1,8}\}|[A-Za-z0-9])){1,2}(?![A-Za-z0-9_])/gmu

export function mathParts(text) {
  const parts = []
  let pos = 0
  for (const match of text.matchAll(tokens)) {
    if (match.index > pos) parts.push({text:text.slice(pos,match.index)})
    const value = match[0]
    const bare = /^[A-Za-zΑ-Ωα-ω][_^]/u.test(value)
    const math = bare || /^(?:\$|\\[[(])/u.test(value)
    parts.push({text:value, math, bare})
    pos = match.index + value.length
  }
  if (pos < text.length) parts.push({text:text.slice(pos)})
  return parts
}
export const asMarkdown = part => part.bare ? '\\('+part.text+'\\)' : part.text
export const mathMarkdown = text => mathParts(text).map(asMarkdown).join('')

const graphemes = new Intl.Segmenter(undefined,{granularity:'grapheme'})
export function previewPrefix(text, limit) {
  if (text.length <= limit) return text
  const end = graphemes.segment(text).containing(limit).index
  return text.slice(0,end)
}
