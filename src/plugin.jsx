import React, { useEffect, useMemo, useRef, useState } from 'react'
import { followUpText, layout, project, validReturns } from './map.js'
import styles from './style.css'
import { Canvas } from './canvas.jsx'
import { Reader } from './reader.jsx'

const tabKind = 'chasey-map'
const id = 'chasey-harness'
const relevant = e => ['turn/start', 'turn/end', 'user/message', 'assistant/message'].includes(e.event.type)

// A live token delta doesn't change a completed answer. Build only when the visible log changes.
function history(source) {
  let lastRevision, rows = []
  const read = () => {
    const window = source.getSnapshot()
    if (lastRevision === window.revision) return rows
    const change = window.change
    const skip = lastRevision + 1 === window.revision && change.kind === 'append' && !change.entries.some(relevant)
    lastRevision = window.revision
    if (!skip) rows = project(window.entries)
    return rows
  }
  return { getSnapshot: read, subscribe: notify => source.subscribe(notify) }
}

function MapIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 5v14m0-9c4 0 11 1 11-5m0 8c0 4-7 3-11 5"/><circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="17" cy="4" r="2"/><circle cx="17" cy="12" r="2"/></svg>
}
function loadLinks(key) {
  try { return validReturns(JSON.parse(localStorage.getItem(key))) } catch { return [] }
}

function Panel({ sessionKey, useTurns, useSession, useAccess, loadAll, send }) {
  const turns = useTurns(v => v)
  const graph = useMemo(() => layout(turns), [turns])
  const hasMore = useSession(v => v.hasMore)
  const loading = useSession(v => v.loadingOlder)
  const historyError = useSession(v => v.historyLoadStatus === 'error')
  const openError = useSession(v => v.openError)
  const opened = useSession(v => v.openState === 'open')
  const maySend = useAccess('session/prompt') !== false
  const [request, setRequest] = useState(0)
  const [failure, setFailure] = useState('')
  const [selected, select] = useState(null)
  const [expanded,setExpanded]=useState(false)
  const drafts=useRef(new Map())
  const [linkStart, setLinkStart] = useState(null)
  const pendingFollowUp = useRef(null)
  const storageKey = 'chasey.returns.v1.' + sessionKey
  const [returns, setReturns] = useState(() => loadLinks(storageKey))
  const selectedIndex = graph.nodes.findIndex(n => n.id === selected)
  const selectedNode = graph.nodes[selectedIndex]
  const byId = useMemo(() => new Map(graph.nodes.map(n=>[n.id,n])), [graph])
  useEffect(() => {
    if (!opened || !hasMore) return
    let active = true
    Promise.resolve(loadAll()).catch(err => { if (active) setFailure(String(err.message || err)) })
    return () => { active = false }
  }, [opened, hasMore, loadAll, request])
  async function sendFollowUp(node, quote, question) {
    const text = followUpText(node.id, quote, question)
    const request = {after:turns.at(-1)?.id ?? 0, parent:node.id, quote:quote.trim(), question:question.trim()}
    pendingFollowUp.current = request
    try { await send(text) }
    catch (err) { if (pendingFollowUp.current === request) pendingFollowUp.current = null; throw err }
  }
  useEffect(() => {
    const pending = pendingFollowUp.current
    if (!pending || selected !== pending.parent) return
    const next = turns.find(n=>n.id>pending.after && n.questions.includes(pending.question) &&
      n.references.some(ref=>ref.parent===pending.parent && ref.text===pending.quote))
    if (next) { pendingFollowUp.current=null; select(next.id) }
  },[turns, selected])
  function saveLinks(next) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setReturns(next); return true }
    catch { setFailure('无法保存连线，请检查此窗口的本地存储权限。'); return false }
  }
  function pick(n) {
    pendingFollowUp.current = null
    if (linkStart !== null) {
      if (linkStart === n.id) return
      if (!returns.some(pair => pair[0] === linkStart && pair[1] === n.id) && !saveLinks([...returns,[linkStart,n.id]])) return
      setLinkStart(null)
    }
    select(n.id)
  }
  const returnEdges = useMemo(() => returns.filter(([a,b]) => byId.has(a) && byId.has(b)), [returns, byId])
  return <section className="chasey" aria-label="追追会话图谱">
    <header><div><MapIcon/><strong>追追</strong><span className="ch-sub">会话图谱</span></div><span className="ch-count">{turns.length} 轮</span></header>
    {(hasMore || historyError || openError || failure) && <div className="ch-status" role="status">{failure || (openError ? '会话暂时无法打开' : historyError ? '较早记录加载失败，当前展示部分图谱' : '正在读取较早的会话记录…')} {(historyError || failure) && <button disabled={loading} onClick={()=>{setFailure('');setRequest(x=>x+1)}}>重试</button>}</div>}
    <Canvas sessionKey={sessionKey} graph={graph} byId={byId} selected={selected} expanded={expanded} returns={returnEdges} onPick={pick} onError={setFailure}
      empty={opened && !loading ? '这段会话还没有可展示的问答。' : '正在读取会话…'}
      linkBanner={linkStart !== null && <div className="ch-status">选择第 {linkStart} 轮要连回的卡片 <button onClick={()=>setLinkStart(null)}>取消</button></div>}/>
    {selectedNode && linkStart === null && <Reader key={selectedNode.id} node={selectedNode} send={sendFollowUp} maySend={maySend} drafts={drafts.current}
      expanded={expanded} toggleExpanded={()=>setExpanded(v=>!v)} close={()=>{pendingFollowUp.current=null;setExpanded(false);select(null)}}
      previous={selectedIndex>0 ? ()=>pick(graph.nodes[selectedIndex-1]) : null}
      next={selectedIndex<graph.nodes.length-1 ? ()=>pick(graph.nodes[selectedIndex+1]) : null}
      visitSource={id=>{if(byId.has(id))pick(byId.get(id))}}
      connect={()=>{pendingFollowUp.current=null;setExpanded(false);setLinkStart(selectedNode.id)}}
      outgoing={returnEdges.filter(p=>p[0]===selectedNode.id)} unlink={b=>saveLinks(returns.filter(p=>p[0]!==selectedNode.id || p[1]!==b))}/>}
  </section>
}

export const inject = ['slots','sessions','sidebarRightTabs','sidebarRight']
export function apply(ctx) {
  const histories = new WeakMap()
  ctx.effect(()=>{
    const sheet=document.createElement('style')
    sheet.textContent=styles; document.head.append(sheet)
    return ()=>sheet.remove()
  }, 'chasey: panel styles')
  ctx.effect(()=>ctx.sidebarRightTabs.register({ id, kind:tabKind, title:()=>'追追', guide:[{id:'open',order:40,title:()=>'追追 · 会话图谱',description:()=>'沿原文分叉追问，连回主线。'}] }), 'chasey: session map')
  const slot='sidebar.right.pane.tab'
  ctx.slots.inject(slot,()=>ctx.slots.register({name:slot,key:id,inject(sessionId){
    const binding=ctx.sessions.binding(sessionId)
    if (!binding) throw new Error('追追无法绑定此会话。')
    if (!histories.has(binding)) histories.set(binding,history(binding.eventSource))
    return { hooks:{turns:histories.get(binding)}, sessionKey:sessionId,
      loadAll:()=>binding.session.loadThrough(0),
      send:async text=>{
        const result=await binding.session.prompt([{type:'text',text}],'queue')
        if (!result.ok) throw new Error(result.error.message || result.error.code)
      } }
  }},props=><Panel key={props.sessionKey} {...props}/>))
  const header='conversation.session.header.actions'
  ctx.slots.inject(header,()=>ctx.slots.register({name:header,id,order:15},()=><button type="button" className="ch-open" title="打开当前会话的追追图谱" onClick={()=>ctx.sidebarRight.openTab(tabKind)}><MapIcon/>追追</button>))
}
