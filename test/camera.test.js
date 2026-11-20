import assert from 'node:assert/strict'
import test from 'node:test'
import { CARD, MAX_ZOOM, MIN_ZOOM, centered, zoomAt } from '../src/camera.js'

test('a pinch preserves the point between both fingers while their midpoint moves',()=>{
  const c={x:-2200,y:399,k:2}, a={x:300,y:400}, b={x:320,y:350}
  for (const factor of [.001,.7,1,1.4,100]) {
    const next=zoomAt(c,factor,a,b)
    assert.equal((a.x-c.x)/c.k,(b.x-next.x)/next.k)
    assert.ok(Math.abs((a.y-c.y)/c.k-(b.y-next.y)/next.k)<1e-9)
    assert.ok(next.k>=MIN_ZOOM && next.k<=MAX_ZOOM)
  }
})
test('focus uses the current viewport and dragged card position even at negative coordinates',()=>{
  const n={x:-100,y:12400}, c=centered(n,.5,340,210)
  assert.equal(c.x+(n.x+CARD.width/2)*c.k,170)
  assert.equal(c.y+(n.y+CARD.height/2)*c.k,105)
})
