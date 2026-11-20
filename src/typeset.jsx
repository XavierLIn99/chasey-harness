import React, {memo} from 'react'
import {MarkdownText} from '@deepseek-ai/dsh-client-ui-primitives'
import {mathParts,mathMarkdown,asMarkdown,previewPrefix} from './math-text.js'

const labels={code:{copyLabel:'复制',copiedLabel:'已复制'},footnotes:'脚注'}
export const AnswerText=memo(function AnswerText({text}) {
  return <MarkdownText text={mathMarkdown(text)} labels={labels} omitHtml/>
})

// Render only the math portions in UI labels. Links and code in a card stay inert.
export const Typeset=memo(function Typeset({text,limit=Infinity,summary=false}) {
  const children=[]
  let used=0
  for (const part of mathParts(text)) {
    if (used>=limit) break
    if (part.math) {
      children.push(<div key={children.length} className="ch-math-run"><MarkdownText text={asMarkdown(part)} labels={labels} variant="compact" omitHtml/></div>)
    } else {
      const plain=summary ? part.text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/\s+/g,' ') : part.text
      children.push(previewPrefix(plain,limit-used))
    }
    used+=part.text.length
  }
  return <>{children}</>
})
