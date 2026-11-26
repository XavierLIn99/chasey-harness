import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveLocale, t } from '../src/i18n.js'
import { project, followUpText } from '../src/map.js'

test('follows supported device preferences in order and respects explicit scripts', () => {
  for (const [preferences, expected] of [
    [['de', 'zh-TW', 'en-US'], 'zh-Hant'],
    [['zh-HK'], 'zh-Hant'], [['zh-MO'], 'zh-Hant'],
    [['zh'], 'zh-Hans'], [['zh-SG'], 'zh-Hans'],
    [['zh-Hans-TW'], 'zh-Hans'], [['zh-Hant-CN'], 'zh-Hant'],
    [['en-AU', 'zh'], 'en'], [['invalid_tag', 'zh-CN'], 'zh-Hans'],
    [['fr-FR'], 'en'], [[], 'en'],
  ]) assert.equal(resolveLocale(preferences), expected)
})

test('reads old and localized follow-ups in every interface language without altering the quote', () => {
  const question = 'Why 追问?', quote = '追问 {n} $x_i$'
  for (const sent of ['en', 'zh-Hant', 'zh-Hans']) {
    const text = followUpText(1, quote, question, sent)
    assert.equal(text.split('\n')[0], {
      en: '[Chasey · Turn 1]', 'zh-Hans': '〔追追 · 第 1 轮〕', 'zh-Hant': '〔追追 · 第 1 輪〕',
    }[sent])
    for (const display of ['zh-Hans', 'en', 'zh-Hant']) {
      const events = [{type: 'turn/start', data: {turn: 2}}, {
        type: 'user/message', data: {source: {kind: 'user'}, content: [{type: 'text', text}]},
      }]
      const [node] = project(events.map(event => ({type: 'event', event})), display)
      assert.equal(node.parent, 1)
      assert.equal(node.quote, quote)
      assert.deepEqual(node.questions, [question])
      assert.equal(t('Turn {n}: {title}', {n: 2, title: quote}, display).endsWith(quote), true)
    }
  }
})
