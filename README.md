# Chasey for DeepSeek Harness

Chasey (追追) turns a long DeepSeek Harness conversation into a map you can keep asking questions from. Open any turn, highlight a sentence or equation, and ask about it. Harness sends the question in the same conversation, while Chasey draws a branch back to the turn that prompted it.

For example, suppose turn 28 introduces a tensor and the discussion has since moved on to turn 70. Jump to 28, select the tensor, and ask what its indices mean. The conversation continues in its usual order. On the map, the new answer sits on a branch from turn 28, so you can revisit the derivation later.

[中文说明](README.zh-CN.md)

## Try it

Tested with [DeepSeek Harness Desktop and Web 0.2.2-rc.5](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.2-rc.5). The plugin interface currently uses Chinese labels.

1. Clone or download this repository. If you download the ZIP, extract it first.
2. In Harness, open **Plugins → Add plugin** and select the folder containing `package.json`. The repository includes the built client.
3. Open a conversation and click **追追** beside its title. Click a card to read the original question and answer.
4. Highlight a passage and click **追问这段** (“Ask about this passage”). Write your question and use the send arrow. The completed answer appears on the map.

## Reading the map

| On the canvas | What it means |
| --- | --- |
| Thick line | An ordinary continuation of the conversation |
| Thin branch | A follow-up linked to its source turn |
| Dashed return line | A connection you added using **连回卡片** (“Link back to a card”) |

Drag the background to pan, pinch to zoom, or move individual cards. In long conversations, enter a turn number to jump to it. **展开阅读** expands the reader for longer answers. Formulas use the math fonts bundled with Harness, and selecting a rendered equation carries its LaTeX source into the follow-up.

Chasey can also recover earlier Harness highlights when the quoted passage matches a single source turn. Ambiguous quotes remain visible with their source marked as unconfirmed.

## Data and model usage

Opening the map reads the selected session through Harness and uses no model tokens. The graph is rebuilt from the conversation history. Card positions and manual links are saved in local browser storage for that session. When you send a follow-up, Harness uses the model and permissions already configured for the conversation.

This version maps user questions and completed text responses. Images and file attachments appear as placeholders.

## Development

Use Node.js 22 or later. From the repository root, run:

```sh
npm ci
npm test
npm run build
```

The client uses the host's React, Markdown renderer, and session APIs. The tests cover branch reconstruction, quoted text, camera geometry, and math formatting.

## Acknowledgements

Thank you to our colleagues MaoKaiTou (<mao.caide@iboxplus.net>) and Zhen-Ze Zhao for their contributions to Chasey. We also thank OpenAI for developing the large language models that helped us write, debug, and test the plugin.
