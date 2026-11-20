import React, { useCallback, useEffect, useRef, useState } from 'react'
import {selectedSource} from './quote-selection.js'
import { createPortal } from 'react-dom'

// The portal stays outside the scrolling reader and docked-panel clipping regions.
export function SelectionAction({ reader, active, onPick, onPreview }) {
  const [anchor, setAnchor] = useState(null)
  const rangeRef = useRef(null)
  const dismiss = useCallback(() => {
    rangeRef.current = null
    setAnchor(null)
  }, [])
  useEffect(() => {
    const element = reader.current
    if (!active || !element) { dismiss(); return }
    const doc = element.ownerDocument, win = doc.defaultView
    let frame = 0, dragging = false
    const update = () => {
      const selection = doc.getSelection()
      if (dragging || !selection?.rangeCount || selection.isCollapsed ||
        !element.contains(selection.anchorNode) || !element.contains(selection.focusNode)) return dismiss()
      const range = selection.getRangeAt(0)
      const text = selectedSource(selection, element)
      if (!text) return dismiss()
      const clip = element.getBoundingClientRect()
      const rects = [...range.getClientRects()].filter(r => r.width && r.height && r.bottom > clip.top && r.top < clip.bottom)
      const end = selection.focusNode === range.startContainer && selection.focusOffset === range.startOffset ? rects[0] : rects.at(-1)
      if (!end) return dismiss()
      const width = Math.min(120, clip.width, win.innerWidth - 16)
      const left = Math.max(8, clip.left, Math.min(end.right - width, clip.right - width, win.innerWidth - width - 8))
      const top = Math.max(6, Math.min(win.innerHeight - 42, end.bottom + 42 > Math.min(clip.bottom, win.innerHeight) ? end.top - 38 : end.bottom + 5))
      rangeRef.current = range.cloneRange()
      setAnchor({ text, left, top, width })
    }
    const schedule = () => { win.cancelAnimationFrame(frame); frame = win.requestAnimationFrame(update) }
    const start = () => { dragging = true; dismiss() }
    const finish = e => {
      if (e.key === 'Escape') return
      dragging = false
      const s = doc.getSelection()
      if (s && !s.isCollapsed && element.contains(s.anchorNode) && element.contains(s.focusNode)) {
        const text = selectedSource(s,element)
        if (text) onPreview(text)
      }
      schedule()
    }
    const keydown = e => { if (e.key === 'Escape') { win.cancelAnimationFrame(frame); dismiss() } }
    element.addEventListener('pointerdown', start)
    doc.addEventListener('pointerup', finish)
    doc.addEventListener('pointercancel', finish)
    element.addEventListener('keyup', finish)
    doc.addEventListener('selectionchange', schedule)
    doc.addEventListener('keydown', keydown)
    doc.addEventListener('scroll', schedule, true)
    win.addEventListener('resize', schedule)
    return () => {
      win.cancelAnimationFrame(frame)
      element.removeEventListener('pointerdown', start)
      doc.removeEventListener('pointerup', finish)
      doc.removeEventListener('pointercancel', finish)
      element.removeEventListener('keyup', finish)
      doc.removeEventListener('selectionchange', schedule)
      doc.removeEventListener('keydown', keydown)
      doc.removeEventListener('scroll', schedule, true)
      win.removeEventListener('resize', schedule)
    }
  }, [reader, active, onPreview, dismiss])
  if (!anchor || !active || !reader.current) return null
  return createPortal(<button type="button" className="ch-selection-action" style={{left:anchor.left,top:anchor.top,width:anchor.width}}
    onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>{
      onPick(anchor.text, rangeRef.current)
      dismiss()
    }}>追问这段 <span aria-hidden="true">↗</span></button>, reader.current.ownerDocument.body)
}
