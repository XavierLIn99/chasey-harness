import React, { useEffect, useRef, useState } from 'react'
import {AnswerText,Typeset} from './typeset.jsx'
import { SelectionAction } from './selection.jsx'

const excerpt = n => (n.answers.join('\n\n') || n.questions.join(' / ')).trim().slice(0, 420)
const icons = {
  previous:'m14 6-6 6 6 6', next:'m10 6 6 6-6 6',
  expand:'M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7',
  collapse:'M20 4l-7 7m0-6v6h6M4 20l7-7m-6 0h6v6',
  close:'m6 6 12 12M18 6 6 18', send:'M12 19V5m-6 6 6-6 6 6',
  connect:'M5 6v7a4 4 0 0 0 4 4h10m-4-4 4 4-4 4',
}
function Icon({name}) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]}/></svg>
}
function IconButton({label,icon,onClick,pressed,disabled}) {
  return <button type="button" className={'ch-icon'+(pressed!==undefined?' ch-view-toggle':'')} title={label} aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled}><Icon name={icon}/>{pressed!==undefined && <span>{label}</span>}</button>
}

export function Reader({ node, send, maySend, drafts, close, connect, outgoing, unlink, expanded, toggleExpanded, previous, next, visitSource }) {
  const [question,setQuestion]=useState(()=>drafts.get(node.id)?.question ?? ''), [quote,setQuote]=useState(()=>drafts.get(node.id)?.quote ?? ''), [status,setStatus]=useState(''), [busy,setBusy]=useState(false)
  const reader=useRef(null), input=useRef(null), pending=useRef(false)
  const highlightName = 'chasey-' + React.useId().replace(/[^a-z0-9-]/gi,'')
  const clearMark = () => globalThis.CSS?.highlights?.delete(highlightName)
  useEffect(() => () => globalThis.CSS?.highlights?.delete(highlightName), [highlightName])
  useEffect(()=>{
    if (question || quote) drafts.set(node.id,{question,quote})
    else drafts.delete(node.id)
  },[drafts,node.id,question,quote])
  function startFollowUp(text, range) {
    setQuote(text)
    if (range && globalThis.Highlight && globalThis.CSS?.highlights) {
      CSS.highlights.set(highlightName, new Highlight(range))
    }
    reader.current.ownerDocument.getSelection()?.removeAllRanges()
    input.current?.focus({preventScroll:true})
    input.current?.scrollIntoView({block:'nearest', inline:'nearest'})
  }
  async function submit(event) {
    event.preventDefault()
    if (!maySend || pending.current || !question.trim()) return
    pending.current = true; setBusy(true); setStatus('')
    try {
      await send(node, quote || excerpt(node), question)
      drafts.delete(node.id)
      setStatus('已提交到本会话。回答完成后会显示在图谱上。'); setQuestion(''); setQuote(''); clearMark()
    } catch (e) { setStatus('提交失败：'+(e.message || String(e))) }
    finally { pending.current=false; setBusy(false) }
  }
  const heading='ch-round-'+node.id
  return <section className={'ch-reader'+(expanded?' ch-expanded':'')} aria-labelledby={heading}>
    <div className="ch-readbar">
      <div className="ch-round-nav"><IconButton icon="previous" label="上一轮" onClick={previous} disabled={!previous}/><strong id={heading}>第 {node.id} 轮</strong><IconButton icon="next" label="下一轮" onClick={next} disabled={!next}/></div>
      <div className="ch-read-actions"><button type="button" className="ch-connect" onClick={connect}><Icon name="connect"/>连回卡片</button><IconButton icon={expanded?'collapse':'expand'} label={expanded?'返回画布':'展开阅读'} onClick={toggleExpanded} pressed={expanded}/><IconButton icon="close" label="关闭原文" onClick={close}/></div>
    </div>
    <div className="ch-scroll" ref={reader} tabIndex={0} aria-label="本轮原文">
      <article className="ch-article">
        {node.questions.length>0 && <header className="ch-question"><span className="ch-byline">我的提问</span>{node.questions.map((text,i)=><div role="heading" aria-level={3} className="ch-question-text" key={i}><Typeset text={text}/></div>)}</header>}
        {node.references.map((ref,i)=><blockquote key={i}>{ref.parent!=null && ref.parent!==node.id
          ? <button className="ch-ref-source" onClick={()=>visitSource(ref.parent)}>引用第 {ref.parent} 轮原文 ↗</button>
          : <small>{ref.parent===node.id?'引用本轮原文':'引用 · 来源未确认'}</small>}<Typeset text={ref.text}/></blockquote>)}
        <div className="ch-response"><span className="ch-byline">回答原文</span>
          {node.answers.map((text,i)=><div className="ch-prose" key={i}><AnswerText text={text}/></div>)}
          {!node.answers.length && <p role="status" className="ch-pending">等待本轮回答…</p>}
        </div>
      </article>
    </div>
    <style>{'::highlight('+highlightName+'){background-color:#e9d7fa;color:#30223c}'}</style>
    <SelectionAction reader={reader} active={maySend && !busy} onPreview={setQuote} onPick={startFollowUp}/>
    {!maySend && <div className="ch-status">此会话当前为只读，无法提交追问。</div>}
    {outgoing.length>0 && <div className="ch-status">{outgoing.map(([,b])=><button key={b} aria-label={'移除回到第 '+b+' 轮的连线'} onClick={()=>unlink(b)}>回到第 {b} 轮 ×</button>)}</div>}
    {maySend && <form onSubmit={submit}><div className="ch-composer">
      {quote && <div className="ch-quote"><strong>引用</strong><div className="ch-quote-preview"><Typeset text={quote} limit={240}/></div><button type="button" aria-label="清除选段" onClick={()=>{setQuote('');clearMark()}}>×</button></div>}
      <div className="ch-entry"><textarea rows={1} ref={input} aria-label={quote?'沿选段追问':'沿本轮追问'} value={question} disabled={busy} onChange={e=>setQuestion(e.target.value)} placeholder={quote?'针对这段原文提问…':'沿着这一轮继续追问…'}/>
      <button className="ch-send" aria-label="发送到本会话" title="发送到本会话" disabled={busy || !question.trim()}><Icon name="send"/></button></div>
    </div></form>}
    {status && <div className="ch-status" role="status">{status}</div>}
  </section>
}
