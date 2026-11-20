import { nativeQuotes, quoteIndex } from './quotes.js'

const marker = /^〔追追 · 第 (\d+) 轮〕\n((?:> [^\n]*\n)+)\n([\s\S]+)$/

function readable(parts, attachments) {
  return (parts ?? []).map(part => {
    if (part.type === 'text') return part.text
    if (attachments && part.type === 'image') return '〔图片〕'
    if (attachments && part.type === 'file') return '〔附件〕'
    return ''
  }).filter(Boolean).join('\n')
}

export function followUpText(turn, excerpt, question) {
  if (!Number.isSafeInteger(turn) || turn < 1 || !excerpt.trim() || !question.trim()) {
    throw new Error('请选择原文并填写问题。')
  }
  const quote = excerpt.trim().split('\n').map(line => '> ' + line).join('\n')
  return '〔追追 · 第 ' + turn + ' 轮〕\n' + quote + '\n\n' + question.trim()
}

// Only settled, user-visible text from the selected binding enters the map.
export function project(entries) {
  const turns = new Map(), earlier = quoteIndex()
  let current
  function get(id) {
    if (!Number.isSafeInteger(id) || id < 1) return
    if (!turns.has(id)) turns.set(id, { id, questions: [], answers: [], parent: null, quote: '', references: [] })
    return turns.get(id)
  }
  for (const { event, type } of entries) {
    if (!event || type === 'transient') continue
    const { data } = event
    if (event.type === 'turn/start') { current = get(data.turn); continue }
    if (event.type === 'turn/end') { current = undefined; continue }
    if (event.surfaceOp && event.surfaceOp !== 'append') continue
    if (event.type === 'user/message' && data.source?.kind === 'user' && current) {
      const text = readable(data.content, true)
      if (!text) continue
      const ref = text.match(marker)
      if (ref && Number(ref[1]) <= current.id && Number(ref[1]) > 0) {
        const source = Number(ref[1])
        if (source !== current.id) current.parent ??= source
        current.quote = ref[2].trimEnd().split('\n').map(line => line.slice(2)).join('\n')
        current.references.push({text:current.quote, parent:source})
        current.questions.push(ref[3])
      } else {
        const {quotes, question} = nativeQuotes(text)
        for (const quote of quotes) {
          const source = earlier.find(quote)
          current.references.push({text:quote, parent:source})
          if (source !== null && source < current.id) current.parent ??= source
        }
        if (question || !quotes.length) current.questions.push(question || text)
      }
    }
    if (event.type === 'assistant/message') {
      const answer = readable(data.message?.content, false)
      const node = get(data.turn)
      if (node && answer) { node.answers.push(answer); earlier.add(node.id,answer) }
    }
  }
  return [...turns.values()].filter(t => t.questions.length || t.answers.length || t.references.length).sort((a,b) => a.id - b.id)
}

export function layout(turns) {
  const index = new Map()
  const nodes = []
  const edges = []
  let lanes = 1
  for (const [row, turn] of turns.entries()) {
    const prev = nodes.at(-1)
    const source = turn.parent === null ? prev : index.get(turn.parent)
    const branch = turn.parent !== null
    const lane = branch && source ? lanes++ : (source?.lane ?? 0)
    const node = { ...turn, lane, x: 24 + lane * 214, y: 22 + row * 122 }
    index.set(turn.id, node)
    nodes.push(node)
    if (source) edges.push({ source, target: node, kind: branch ? 'branch' : 'main' })
    const others = new Set(turn.references?.map(ref=>ref.parent))
    for (const id of others) {
      if (id !== node.id && id !== source?.id && index.has(id)) edges.push({source:index.get(id), target:node, kind:'branch'})
    }
  }
  return { nodes, edges, width: 48 + lanes * 214, height: Math.max(160, turns.length * 122 + 44) }
}

export function validReturns(value) {
  if (!Array.isArray(value)) return []
  return value.filter(pair => Array.isArray(pair) && pair.length === 2 &&
    pair.every(n => Number.isSafeInteger(n) && n > 0) && pair[0] !== pair[1])
}
