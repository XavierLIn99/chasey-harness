import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {Typeset} from './typeset.jsx'
import { centered, MAX_ZOOM, MIN_ZOOM, readPositions, zoomAt } from './camera.js'

const title = node => node.questions.join(' / ') || '本轮回答'
const midpoint = (a,b) => ({ x:(a.x+b.x)/2, y:(a.y+b.y)/2 })
const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y)
const nodePoint = (n, positions) => positions.get(n.id) ?? n

function edgePath(a,b,kind) {
  if (kind === 'return') {
    const x = Math.max(a.x,b.x) + 220
    return 'M '+(a.x+188)+' '+(a.y+65)+' C '+x+' '+(a.y+65)+', '+x+' '+(b.y+63)+', '+(b.x+188)+' '+(b.y+63)
  }
  const x1=a.x+36, y1=a.y+96, x2=b.x+36, y2=b.y, mid=(y1+y2)/2
  return 'M '+x1+' '+y1+' C '+x1+' '+mid+', '+x2+' '+mid+', '+x2+' '+y2
}

const Cards = memo(function Cards({ graph, byId, positions, selected, returns, pick }) {
  return <>
    <svg className="ch-wires" aria-hidden="true">{graph.edges.map(e=><path key={e.source.id+'-'+e.target.id} className={'ch-line '+e.kind} d={edgePath(nodePoint(e.source,positions),nodePoint(e.target,positions),e.kind)}/>)}{returns.map(([a,b])=><path key={a+'-'+b} className="ch-line return" d={edgePath(nodePoint(byId.get(a),positions),nodePoint(byId.get(b),positions),'return')}/>)}</svg>
    {graph.nodes.map(n=>{
      const point=nodePoint(n,positions)
      return <button key={n.id} data-turn={n.id} className={'ch-card'+(n.id===selected?' active':'')} style={{left:point.x,top:point.y}} aria-pressed={n.id===selected} aria-label={'第 '+n.id+' 轮：'+title(n)} onClick={()=>pick(n)}><small>{String(n.id).padStart(2,'0')} <span>{n.parent ? '追问 · '+n.parent : '问答'}</span>{n.id===selected && <em>阅读中</em>}</small><div className="ch-card-title"><Typeset text={title(n)} limit={180}/></div><div className="ch-preview"><Typeset text={n.answers[0] || '等待回答'} limit={180} summary/></div></button>
    })}
  </>
})

export function Canvas({sessionKey, graph, byId, selected, expanded, returns, onPick, empty, onError, linkBanner}) {
  const viewport = useRef(null)
  const storageKey = 'chasey.positions.v1.' + sessionKey
  const [positions, setPositions] = useState(() => readPositions(storageKey))
  const positionsRef = useRef(positions)
  const [camera, setCamera] = useState({x:0,y:0,k:1})
  const cameraRef = useRef(camera)
  const pointers = useRef(new Map())
  const gesture = useRef(null), swallowClick = useRef(false), pinned = useRef(null)
  const [moving,setMoving] = useState(false)
  const [round,setRound] = useState('')
  const roundInput=useRef(null)
  const latest = graph.nodes.at(-1)?.id
  const data = useRef(null)
  data.current = { byId, selected, latest, onPick, onError }
  const moveCamera = useCallback(next => { cameraRef.current = next; setCamera(next) }, [])
  const center = useCallback((id, animate = false) => {
    const node = data.current.byId.get(id), el = viewport.current
    if (!el || !node || !el.clientWidth || !el.clientHeight) return
    pinned.current = id
    el.classList.toggle('ch-focusing',animate)
    moveCamera(centered(nodePoint(node, positionsRef.current),cameraRef.current.k,el.clientWidth,el.clientHeight))
  },[moveCamera])
  const freeCamera = useCallback(() => {
    pinned.current = null
    viewport.current?.classList.remove('ch-focusing')
  },[])
  const pick = useCallback(n => {
    center(n.id,true)
    data.current.onPick(n)
  },[center])
  // Resolve initial focus once, even when the history arrives in pages.
  const initialized = useRef(false)
  useLayoutEffect(()=>{
    if (latest == null) return
    if (!initialized.current) { initialized.current=true; center(selected ?? latest) }
    else if (pinned.current != null) center(pinned.current)
  },[byId, latest, center]) // selection by click focuses explicitly
  useLayoutEffect(()=>{
    if (selected != null && pinned.current !== selected) center(selected,true)
  },[selected,center])
  useLayoutEffect(()=>{
    if (pinned.current != null) center(pinned.current)
  },[expanded,center])
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(()=>{ if (pinned.current!=null) center(pinned.current) })
    observer.observe(viewport.current)
    return ()=>observer.disconnect()
  },[center])
  const local = (el,x,y) => {
    const rect=el.getBoundingClientRect()
    return {x:x-rect.left,y:y-rect.top}
  }
  function locate() {
    if (!round) { center(selected ?? latest,true); return }
    const target = byId.get(Number(round))
    if (!target) {
      roundInput.current.setCustomValidity('当前图谱里没有这一轮。')
      roundInput.current.reportValidity()
      return
    }
    setRound('')
    pick(target)
  }
  function zoomButton(factor) {
    const el=viewport.current
    freeCamera()
    moveCamera(zoomAt(cameraRef.current,factor,{x:el.clientWidth/2,y:el.clientHeight/2}))
  }
  useEffect(()=>{
    const el=viewport.current
    let safari=null
    const wheel=e=>{
      e.preventDefault()
      if (safari) return
      freeCamera()
      const multiplier=e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1
      const dx=e.deltaX*multiplier,dy=e.deltaY*multiplier
      const c=cameraRef.current
      if (e.ctrlKey || e.metaKey) moveCamera(zoomAt(c,Math.exp(-Math.max(-180,Math.min(180,dy))*.012),local(el,e.clientX,e.clientY)))
      else moveCamera({...c,x:c.x-(e.shiftKey && !dx?dy:dx),y:c.y-(e.shiftKey && !dx?0:dy)})
    }
    const gesturePoint=e=>Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)?local(el,e.clientX,e.clientY):{x:el.clientWidth/2,y:el.clientHeight/2}
    const start=e=>{e.preventDefault();freeCamera();safari={camera:cameraRef.current,point:gesturePoint(e)}}
    const change=e=>{e.preventDefault();if(safari && e.scale>0)moveCamera(zoomAt(safari.camera,e.scale,safari.point,gesturePoint(e)))}
    const end=e=>{e.preventDefault();safari=null}
    el.addEventListener('wheel',wheel,{passive:false})
    el.addEventListener('gesturestart',start,{passive:false})
    el.addEventListener('gesturechange',change,{passive:false})
    el.addEventListener('gestureend',end,{passive:false})
    return ()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('gesturestart',start);el.removeEventListener('gesturechange',change);el.removeEventListener('gestureend',end)}
  },[freeCamera,moveCamera])

  function updatePositions(next) { positionsRef.current=next; setPositions(next) }
  function commitPositions() {
    try { localStorage.setItem(storageKey,JSON.stringify([...positionsRef.current])) }
    catch { data.current.onError('卡片已移动，本机未能保存这次位置。') }
  }
  function down(e) {
    if (e.button!==0 && e.button!==1) return
    const el=e.currentTarget, list=pointers.current, card=e.target.closest('[data-turn]')
    const point=local(el,e.clientX,e.clientY)
    list.set(e.pointerId,point)
    ;(card || el).setPointerCapture(e.pointerId)
    if (list.size===1) {
      swallowClick.current=false
      const node=e.button===0 && card ? byId.get(Number(card.dataset.turn)) : null
      gesture.current={mode:node?'card':'pan',origin:point,camera:cameraRef.current,node,point:node && nodePoint(node,positionsRef.current),dragged:false}
    } else if (list.size===2) {
      if (gesture.current?.mode==='card' && gesture.current.dragged) commitPositions()
      const [a,b]=list.values()
      freeCamera();setMoving(true);swallowClick.current=true
      gesture.current={mode:'pinch',center:midpoint(a,b),distance:Math.max(1,distance(a,b)),camera:cameraRef.current}
    }
    if (e.button===1) e.preventDefault()
  }
  function move(e) {
    const list=pointers.current, g=gesture.current
    if (!list.has(e.pointerId) || !g) return
    const p=local(e.currentTarget,e.clientX,e.clientY)
    list.set(e.pointerId,p)
    if (g.mode==='pinch') {
      if(list.size<2)return
      const [a,b]=list.values()
      moveCamera(zoomAt(g.camera,distance(a,b)/g.distance,g.center,midpoint(a,b)))
      return
    }
    const dx=p.x-g.origin.x,dy=p.y-g.origin.y
    if (!g.dragged) {
      if(Math.hypot(dx,dy)<5)return
      g.dragged=true;freeCamera();swallowClick.current=true;setMoving(true)
    }
    if(g.mode==='pan')moveCamera({...g.camera,x:g.camera.x+dx,y:g.camera.y+dy})
    else updatePositions(new Map(positionsRef.current).set(g.node.id,{x:g.point.x+dx/g.camera.k,y:g.point.y+dy/g.camera.k}))
  }
  function up(e) {
    const list=pointers.current,g=gesture.current
    if(!list.delete(e.pointerId) || !g)return
    if(g.mode==='card' && g.dragged)commitPositions()
    if(list.size>=2){
      const [a,b]=list.values()
      gesture.current={mode:'pinch',center:midpoint(a,b),distance:Math.max(1,distance(a,b)),camera:cameraRef.current}
    } else if(list.size===1) {
      gesture.current={mode:'pan',origin:[...list.values()][0],camera:cameraRef.current,dragged:true}
    } else { gesture.current=null;setMoving(false) }
  }

  return <>
    <div className="ch-tools"><span className="ch-legend main">顺序</span><span className="ch-legend branch">追问</span><span className="ch-legend back">回连</span><div className="ch-zoom"><button aria-label="缩小" disabled={camera.k<=MIN_ZOOM} onClick={()=>zoomButton(1/1.2)}>−</button><button title="重置缩放" onClick={()=>zoomButton(1/cameraRef.current.k)}>{Math.round(camera.k*100)}%</button><button aria-label="放大" disabled={camera.k>=MAX_ZOOM} onClick={()=>zoomButton(1.2)}>+</button><input ref={roundInput} className="ch-round-input" inputMode="numeric" value={round} aria-label="跳到第几轮" placeholder="轮次" title="输入轮次后按回车" onChange={e=>{e.target.setCustomValidity('');setRound(e.target.value.replace(/[^0-9]/g,''))}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();locate()}}}/><button disabled={latest==null} title={selected!=null?'定位所选卡片':'定位最新一轮'} onClick={locate}>定位</button></div></div>
    {linkBanner}
    <div ref={viewport} className={'ch-viewport'+(moving?' ch-moving':'')} tabIndex="0" aria-label="会话图谱，可拖动画布和卡片，双指缩放"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
      onClickCapture={e=>{if(swallowClick.current && e.detail!==0){e.preventDefault();e.stopPropagation()}}}
      onFocus={e=>{const card=e.target.closest('[data-turn]');if(card && card.matches(':focus-visible'))center(Number(card.dataset.turn))}}
      onKeyDown={e=>{
        if(e.target!==viewport.current)return
        if(e.key==='Home'){e.preventDefault();center(selected ?? latest,true)}
        else if(e.key==='+' || e.key==='=')zoomButton(1.2)
        else if(e.key==='-')zoomButton(1/1.2)
        else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
          e.preventDefault();freeCamera();const c=cameraRef.current
          moveCamera({...c,x:c.x+(e.key==='ArrowLeft'?64:e.key==='ArrowRight'?-64:0),y:c.y+(e.key==='ArrowUp'?64:e.key==='ArrowDown'?-64:0)})
        }
      }} style={{backgroundPosition:camera.x+'px '+camera.y+'px',backgroundSize:17*camera.k+'px '+17*camera.k+'px'}}>
      {!graph.nodes.length && <div className="ch-empty">{empty}</div>}
      <div className="ch-plane" style={{transform:'translate('+camera.x+'px,'+camera.y+'px) scale('+camera.k+')'}}>
        <Cards graph={graph} byId={byId} positions={positions} selected={selected} returns={returns} pick={pick}/>
      </div>
    </div>
  </>
}
