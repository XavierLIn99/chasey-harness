import assert from 'node:assert/strict'
import test from 'node:test'
import { project, layout, followUpText, validReturns } from '../src/map.js'

const part=text=>({type:'text',text})
const line=(type,data)=>({type:'event',event:{type,data}})
const turn=n=>line('turn/start',{turn:n})
const ask=(text,kind='user')=>line('user/message',{source:{kind},content:[part(text)]})
const answer=(n,text)=>line('assistant/message',{turn:n,message:{content:[{type:'reasoning',text:'private'},part(text),{type:'tool-call',text:'private'}]}})
test('follows earlier evidence across intervening turns and keeps steering, multiple answers and the exact quote',()=>{
  const events=[turn(1),ask('为什么？'),ask('system secret','runtime-context'),answer(1,'第一段\n第二段'),ask('补充'),answer(1,'结论'),turn(2),ask('新的问题'),turn(3),ask(followUpText(1,'第一段\n第二段','请举例')),answer(3,'例子')]
  const graph=layout(project(events))
  assert.deepEqual(graph.nodes[0].answers,['第一段\n第二段','结论'])
  assert.deepEqual(graph.nodes[0].questions,['为什么？','补充'])
  assert.equal(graph.nodes[2].quote,'第一段\n第二段')
  assert.equal(graph.nodes[2].questions[0],'请举例')
  assert.deepEqual(graph.edges.map(e=>[e.source.id,e.target.id,e.kind]),[[1,2,'main'],[1,3,'branch']])
  assert.ok(graph.nodes[2].x>graph.nodes[1].x)
})
test('partially loaded history does not invent a source and resolves after prepending',()=>{
  const newer=[turn(9),ask(followUpText(2,'原句','依据是什么？'))]
  assert.equal(layout(project(newer)).edges.length,0)
  assert.equal(layout(project([turn(2),ask('起点'),...newer])).edges[0].source.id,2)
})
test('only completed visible answers enter the graph',()=>{
  const result=project([turn(1),{type:'transient',event:{type:'assistant/live-chunk',data:{}}},ask('继续'),{type:'event',event:{type:'assistant/message',surfaceOp:{op:'replace'},data:{turn:1,message:{content:[part('summary')]}}}}])
  assert.deepEqual(result[0].answers,[])
  assert.deepEqual(project([turn(1),ask('secret','runtime-context')]),[])
})
test('validates a follow-up and rejects corrupt return links',()=>{
  assert.throws(()=>followUpText(1,'','test'))
  assert.deepEqual(validReturns([[1,1],[1,2],['2',3],{},null]),[[1,2]])
})
test('native quotes match earlier rendered text, including multiple origins in one question',()=>{
  const g=layout(project([turn(1),ask('一'),answer(1,'这里是**第一份**材料的结论。'),turn(2),ask('二'),answer(2,'另一段独立的回答。'),turn(3),ask('> 第一份材料的结论\n\n> 另一段独立的回答\n\n具体如何关联？')]))
  assert.deepEqual(g.nodes[2].questions,['具体如何关联？'])
  assert.deepEqual(g.edges.filter(e=>e.kind==='branch').map(e=>e.source.id),[1,2])
})
test('ambiguous native brushes, same-turn brushes and code never produce spurious branches',()=>{
  const g=layout(project([turn(1),answer(1,'重复出现在不同轮的句子。'),turn(2),answer(2,'重复出现在不同轮的句子。'),turn(3),ask('> 重复出现在不同轮的句子。\n\n为什么'),answer(3,'这是本轮第一条回答'),ask('> 这是本轮第一条回答\n\n继续'),ask('```sh\n> output_file\n```')]))
  assert.deepEqual(g.nodes[2].references.map(r=>r.parent),[null,3])
  assert.equal(g.edges.filter(e=>e.kind==='branch').length,0)
  assert.match(g.nodes[2].questions.at(-1),/> output_file/)
})
