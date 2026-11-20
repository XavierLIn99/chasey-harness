// Harness serializes its native brush as ordinary Markdown blockquotes.
export function nativeQuotes(input) {
  const quotes = [], rest = []
  let pending = [], fence = ''
  const flush = () => {
    const quote = pending.join('\n').trim()
    if (quote) quotes.push(quote)
    pending = []
  }
  for (const line of input.split(/\r?\n/)) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (fence) {
      rest.push(line)
      if (match?.[1][0] === fence[0] && match[1].length >= fence.length && !line.slice(match[0].length).trim()) fence = ''
    } else if (match) {
      flush(); fence = match[1]; rest.push(line)
    } else if (/^ {0,3}>/.test(line)) {
      pending.push(line.replace(/^ {0,3}>[ \t]?/, ''))
    } else {
      flush(); rest.push(line)
    }
  }
  flush()
  return { quotes, question: rest.join('\n').trim() }
}

function visible(text) {
  return text.normalize('NFC')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, ' ')
    .replace(/^\s*\|(.+)\|\s*$/gm, (_,row) => row.split('|').join(' '))
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
    .replace(/\[([^\]\n]+)\]\([^()\n]+\)/g, '$1')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\s+/gu, ' ').trim()
}

export function quoteIndex() {
  const history = []
  return {
    add(turn, text) { history.push({turn,text}) },
    find(quote) {
      const needle = visible(quote)
      if ([...needle].length < 6) return null
      let source = null
      for (const item of history) {
        item.visible ??= visible(item.text)
        if (!item.visible.includes(needle)) continue
        if (source !== null && source !== item.turn) return null
        source = item.turn
      }
      return source
    },
  }
}
