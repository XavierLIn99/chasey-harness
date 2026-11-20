import test from 'node:test'
import assert from 'node:assert/strict'
import {mathMarkdown,mathParts,previewPrefix} from '../src/math-text.js'

test('legacy physics indices render alongside marked math',()=>{
  assert.equal(mathMarkdown('度规 g_{MN}、C₃ 与 Ψ_M'),String.raw`度规 \(g_{MN}\)、C₃ 与 \(Ψ_M\)`)
  const text=String.raw`原式 \(g_{MN}\) 和 $C_3$，以及 \[\frac{1}{2}\]`
  assert.equal(mathMarkdown(text),text)
  assert.equal(mathParts(text).filter(p=>p.math).length,3)
})
test('code, URLs, currency and ordinary identifiers remain unchanged',()=>{
  for(const text of ['`x_i`','```js\nlet x_i=1\n```','https://example.org/x_i','example_id','单价 $20 或 $30','    x_i = 1']){
    assert.equal(mathMarkdown(text),text)
    assert.ok(mathParts(text).every(p=>!p.math))
  }
})

test('a compact preview ends before a partial glyph cluster',()=>{
  assert.equal(previewPrefix('测👩🏽‍🔬量',4),'测')
  assert.equal(previewPrefix('áβ',1),'')
  assert.equal(previewPrefix('áβ',2),'á')
})
