import { t } from './i18n.js'
import { LocaleContext } from './use-locale.js'
import React, {memo, useContext} from 'react'
import {MarkdownText} from '@deepseek-ai/dsh-client-ui-primitives'
import {mathParts,mathMarkdown,asMarkdown,previewPrefix} from './math-text.js'

const labels=locale=>({code:{copyLabel:t('Copy', {}, locale),copiedLabel:t('Copied', {}, locale)},footnotes:t('Footnotes', {}, locale)})
export const AnswerText=memo(function AnswerText({text}) {
  const locale = useContext(LocaleContext)
  return <MarkdownText text={mathMarkdown(text)} labels={labels(locale)} omitHtml/>
})

// Render only the math portions in UI labels. Links and code in a card stay inert.
export const Typeset=memo(function Typeset({text,limit=Infinity,summary=false}) {
  const locale = useContext(LocaleContext)
  const children=[]
  let used=0
  for (const part of mathParts(text)) {
    if (used>=limit) break
    if (part.math) {
      children.push(<div key={children.length} className="ch-math-run"><MarkdownText text={asMarkdown(part)} labels={labels(locale)} variant="compact" omitHtml/></div>)
    } else {
      const plain=summary ? part.text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/\s+/g,' ') : part.text
      children.push(previewPrefix(plain,limit-used))
    }
    used+=part.text.length
  }
  return <>{children}</>
})
