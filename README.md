# Chasey for DeepSeek Harness

Turn a long chat into a map. Open an earlier answer, highlight a sentence or equation, and ask a follow-up. The answer appears in the same Harness chat and branches from the source turn on the map.

## Get started

1. Download and unzip the plugin from the [latest release](https://github.com/XavierLIn99/chasey-harness/releases/latest).
2. In DeepSeek Harness, choose **Plugins → Add plugin** and select the extracted folder containing `package.json`.
3. Open a chat, click **Chasey**, and select a card. Highlight a passage and choose **Ask about this** to start a branch.

The interface follows your device or browser language preferences. It supports English, Simplified Chinese, and Traditional Chinese, with English as the fallback. Questions, answers, and equations stay in their original language.

## Using the map

Thick lines show conversation order. Thin branches connect follow-ups to their source turns. Use **Link to card** to add a dashed return link. Drag cards to rearrange them, pinch to zoom, or enter a turn number to jump back.

Opening a map uses no model tokens. Harness handles follow-ups using the model configured for the chat. Card positions and manual links are saved on this device. Images and files appear as placeholders.

## Development

Targets [DeepSeek Harness Desktop and Web 0.2.2-rc.5](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.2-rc.5). With Node.js 22.12 or later, run `npm ci`, `npm test`, then `npm run build`.

## Acknowledgements

Thank you to our colleagues MaoKaiTou (<mao.caide@iboxplus.net>) and Zhen-Ze Zhao (<ucaqzh0@ucl.ac.uk>) for their contributions to Chasey. We also thank OpenAI for developing the large language models that helped us write, debug, and test the plugin.
