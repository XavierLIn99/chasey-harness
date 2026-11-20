window.__ModuleLoader__.load({id:'chasey-harness',factory(require){const module={exports:{}};
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/plugin.jsx
var plugin_exports = {};
__export(plugin_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(plugin_exports);
var import_react5 = __toESM(require("react"), 1);

// src/quotes.js
function nativeQuotes(input) {
  const quotes = [], rest = [];
  let pending = [], fence = "";
  const flush = () => {
    const quote = pending.join("\n").trim();
    if (quote) quotes.push(quote);
    pending = [];
  };
  for (const line of input.split(/\r?\n/)) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      rest.push(line);
      if (match?.[1][0] === fence[0] && match[1].length >= fence.length && !line.slice(match[0].length).trim()) fence = "";
    } else if (match) {
      flush();
      fence = match[1];
      rest.push(line);
    } else if (/^ {0,3}>/.test(line)) {
      pending.push(line.replace(/^ {0,3}>[ \t]?/, ""));
    } else {
      flush();
      rest.push(line);
    }
  }
  flush();
  return { quotes, question: rest.join("\n").trim() };
}
function visible(text) {
  return text.normalize("NFC").replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, " ").replace(/^\s*\|(.+)\|\s*$/gm, (_, row) => row.split("|").join(" ")).replace(/^ {0,3}#{1,6}[ \t]+/gm, "").replace(/\[([^\]\n]+)\]\([^()\n]+\)/g, "$1").replace(/\*\*([^*]+?)\*\*/g, "$1").replace(/`([^`\n]+)`/g, "$1").replace(/\s+/gu, " ").trim();
}
function quoteIndex() {
  const history2 = [];
  return {
    add(turn, text) {
      history2.push({ turn, text });
    },
    find(quote) {
      const needle = visible(quote);
      if ([...needle].length < 6) return null;
      let source = null;
      for (const item of history2) {
        item.visible ??= visible(item.text);
        if (!item.visible.includes(needle)) continue;
        if (source !== null && source !== item.turn) return null;
        source = item.turn;
      }
      return source;
    }
  };
}

// src/map.js
var marker = /^〔追追 · 第 (\d+) 轮〕\n((?:> [^\n]*\n)+)\n([\s\S]+)$/;
function readable(parts, attachments) {
  return (parts ?? []).map((part) => {
    if (part.type === "text") return part.text;
    if (attachments && part.type === "image") return "\u3014\u56FE\u7247\u3015";
    if (attachments && part.type === "file") return "\u3014\u9644\u4EF6\u3015";
    return "";
  }).filter(Boolean).join("\n");
}
function followUpText(turn, excerpt2, question) {
  if (!Number.isSafeInteger(turn) || turn < 1 || !excerpt2.trim() || !question.trim()) {
    throw new Error("\u8BF7\u9009\u62E9\u539F\u6587\u5E76\u586B\u5199\u95EE\u9898\u3002");
  }
  const quote = excerpt2.trim().split("\n").map((line) => "> " + line).join("\n");
  return "\u3014\u8FFD\u8FFD \xB7 \u7B2C " + turn + " \u8F6E\u3015\n" + quote + "\n\n" + question.trim();
}
function project(entries) {
  const turns = /* @__PURE__ */ new Map(), earlier = quoteIndex();
  let current;
  function get(id2) {
    if (!Number.isSafeInteger(id2) || id2 < 1) return;
    if (!turns.has(id2)) turns.set(id2, { id: id2, questions: [], answers: [], parent: null, quote: "", references: [] });
    return turns.get(id2);
  }
  for (const { event, type } of entries) {
    if (!event || type === "transient") continue;
    const { data } = event;
    if (event.type === "turn/start") {
      current = get(data.turn);
      continue;
    }
    if (event.type === "turn/end") {
      current = void 0;
      continue;
    }
    if (event.surfaceOp && event.surfaceOp !== "append") continue;
    if (event.type === "user/message" && data.source?.kind === "user" && current) {
      const text = readable(data.content, true);
      if (!text) continue;
      const ref = text.match(marker);
      if (ref && Number(ref[1]) <= current.id && Number(ref[1]) > 0) {
        const source = Number(ref[1]);
        if (source !== current.id) current.parent ??= source;
        current.quote = ref[2].trimEnd().split("\n").map((line) => line.slice(2)).join("\n");
        current.references.push({ text: current.quote, parent: source });
        current.questions.push(ref[3]);
      } else {
        const { quotes, question } = nativeQuotes(text);
        for (const quote of quotes) {
          const source = earlier.find(quote);
          current.references.push({ text: quote, parent: source });
          if (source !== null && source < current.id) current.parent ??= source;
        }
        if (question || !quotes.length) current.questions.push(question || text);
      }
    }
    if (event.type === "assistant/message") {
      const answer = readable(data.message?.content, false);
      const node = get(data.turn);
      if (node && answer) {
        node.answers.push(answer);
        earlier.add(node.id, answer);
      }
    }
  }
  return [...turns.values()].filter((t) => t.questions.length || t.answers.length || t.references.length).sort((a, b) => a.id - b.id);
}
function layout(turns) {
  const index = /* @__PURE__ */ new Map();
  const nodes = [];
  const edges = [];
  let lanes = 1;
  for (const [row, turn] of turns.entries()) {
    const prev = nodes.at(-1);
    const source = turn.parent === null ? prev : index.get(turn.parent);
    const branch = turn.parent !== null;
    const lane = branch && source ? lanes++ : source?.lane ?? 0;
    const node = { ...turn, lane, x: 24 + lane * 214, y: 22 + row * 122 };
    index.set(turn.id, node);
    nodes.push(node);
    if (source) edges.push({ source, target: node, kind: branch ? "branch" : "main" });
    const others = new Set(turn.references?.map((ref) => ref.parent));
    for (const id2 of others) {
      if (id2 !== node.id && id2 !== source?.id && index.has(id2)) edges.push({ source: index.get(id2), target: node, kind: "branch" });
    }
  }
  return { nodes, edges, width: 48 + lanes * 214, height: Math.max(160, turns.length * 122 + 44) };
}
function validReturns(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((n) => Number.isSafeInteger(n) && n > 0) && pair[0] !== pair[1]);
}

// src/style.css
var style_default = `.chasey,.ch-open{--ch-ink:#353048;--ch-muted:#736d80;--ch-paper:#fcfaf6;--ch-card:#fffdfa;--ch-rule:#ded9df;--ch-accent:#796295;--ch-main:#aaa1c8;--ch-back:#b2823b;color:var(--ch-ink);font-family:inherit}
@media(prefers-color-scheme:dark){.chasey,.ch-open{--ch-ink:#eee7f4;--ch-muted:#bbb1c4;--ch-paper:#211f26;--ch-card:#302c35;--ch-rule:#4f4857;--ch-accent:#c7a8dd;--ch-main:#9186ad;--ch-back:#d7a961}}
.chasey{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--ch-paper);font-size:13px;line-height:1.45;isolation:isolate}
.chasey *{box-sizing:border-box}
.ch-open,.chasey button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
.ch-open{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;border-radius:6px;padding:4px 7px}
.chasey button:focus-visible,.ch-open:focus-visible,.chasey textarea:focus-visible,.ch-viewport:focus-visible{outline:2px solid var(--ch-accent);outline-offset:-2px}
.chasey button:disabled{opacity:.45;cursor:default}.chasey>header,.ch-tools,.ch-readbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--ch-rule)}
.chasey>header{justify-content:space-between}.chasey>header>div,.ch-zoom,.ch-legend,.ch-quote,.ch-readbar{display:flex;align-items:center;gap:7px}
.chasey>header svg{color:var(--ch-accent)}.chasey>header strong{font-size:18px}.ch-count,.ch-sub,.ch-legend{color:var(--ch-muted);font-size:12px}
.ch-tools{gap:12px;padding:6px 12px;flex-wrap:wrap}.ch-zoom{margin-left:auto;gap:1px}.ch-zoom button,.ch-readbar button,.ch-status button{padding:3px 6px;border-radius:5px}.chasey button:hover:not(:disabled):not(.ch-card):not(.ch-send){background:color-mix(in srgb,var(--ch-accent) 13%,transparent)}
.ch-legend{gap:4px}.ch-legend:before{content:'';width:15px;border-top:4px solid var(--ch-main);border-radius:4px}.ch-legend.branch:before{border-width:2px;border-color:var(--ch-accent)}.ch-legend.back:before{border:0;border-top:2px dashed var(--ch-back)}
.ch-viewport{flex:1;min-height:80px;position:relative;overflow:clip;touch-action:none;user-select:none;cursor:grab;background:radial-gradient(circle,color-mix(in srgb,var(--ch-muted) 30%,transparent) .7px,transparent 1px) 0 0/17px 17px;overscroll-behavior:contain}
.ch-plane{position:absolute;left:0;top:0;transform-origin:0 0}.ch-plane>svg{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none}.chasey .ch-card{touch-action:none;cursor:grab}.ch-moving,.ch-moving .ch-card{cursor:grabbing}.ch-focusing .ch-plane{transition:transform .18s ease-out}.ch-line{fill:none;stroke-linecap:round}.ch-line.main{stroke:var(--ch-main);stroke-width:5}.ch-line.branch{stroke:var(--ch-accent);stroke-width:2}.ch-line.return{stroke:var(--ch-back);stroke-width:2;stroke-dasharray:3 5}
.chasey .ch-card{position:absolute;width:188px;height:96px;display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;border:1px solid var(--ch-rule);box-shadow:0 3px 10px #211a3010;background:var(--ch-card);text-align:left;overflow:hidden;transition:transform .16s,border-color .16s}
.ch-card:hover{border-color:var(--ch-accent)}.chasey .ch-card.active{border-color:var(--ch-accent);box-shadow:0 0 0 1px var(--ch-accent)}.ch-card small{color:var(--ch-accent);font-size:10px;font-weight:600;font-variant-numeric:tabular-nums}.ch-card small span{padding-left:5px}.ch-card-title{font-weight:650;font-size:13px;line-height:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.ch-preview{width:100%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;color:var(--ch-muted);font-size:12px}
.ch-empty,.ch-status{padding:8px 12px;color:var(--ch-muted)}.ch-empty{padding:24px}@media(prefers-reduced-motion:reduce){.chasey .ch-card,.ch-focusing .ch-plane{transition:none}}
.ch-selection-action{position:fixed;z-index:2147483000;height:33px;padding:0 10px;border:1px solid #7b6099;border-radius:9px;color:#fff;background:#503b68;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 3px 12px #1e102a38;cursor:pointer;white-space:nowrap}
.ch-selection-action:hover,.ch-selection-action:focus-visible{background:#674c85;outline:2px solid #bea4d9;outline-offset:1px}
.ch-round-input{width:4.2em;min-width:0;margin-left:5px;padding:3px 5px;border:1px solid var(--ch-rule);border-radius:5px;color:var(--ch-ink);background:var(--ch-card);font:inherit;font-size:12px}.ch-round-input:focus-visible{outline:2px solid var(--ch-accent);outline-offset:-1px}
.chasey{position:relative;container-type:inline-size}
.ch-reader{position:relative;z-index:1;flex:0 1 auto;max-height:62%;min-height:0;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--ch-rule);border-bottom:0;border-radius:16px 16px 0 0;background:var(--ch-card);box-shadow:0 -5px 22px #21182c0c;animation:ch-reader-in .2s cubic-bezier(.2,.75,.3,1)}
.ch-reader.ch-expanded{max-height:none;position:absolute;inset:0;z-index:3;border:0;border-radius:0}
.ch-readbar{justify-content:space-between;flex:none;gap:4px;min-height:42px;padding:5px 10px;background:var(--ch-card)}
.ch-round-nav,.ch-read-actions,.ch-readbar .ch-connect{display:flex;align-items:center;gap:4px}
.ch-round-nav strong{font-size:13px;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap}
.ch-readbar .ch-icon,.ch-readbar .ch-connect{border-radius:7px;color:var(--ch-muted);height:30px}
.ch-readbar .ch-icon{display:grid;place-items:center;width:30px;padding:0}
.ch-readbar .ch-connect{padding:0 6px;font-size:12px}
.ch-scroll{flex:1 1 auto;min-height:0;overflow:auto;overflow-anchor:none;overscroll-behavior:contain;scrollbar-gutter:stable;padding:0 clamp(14px,4.2cqw,50px);cursor:text}
.ch-article{max-width:44rem;margin:0 auto;padding:clamp(15px,3cqw,28px) 0 22px;overflow-wrap:anywhere}
.ch-question{display:block;margin:0 0 18px;padding:0 0 0 12px;border:0;border-left:3px solid var(--ch-accent)}
.ch-byline{display:block;margin-bottom:5px;font-size:11px;line-height:1.5;font-weight:600;letter-spacing:.04em;color:var(--ch-muted)}
.ch-question-text{margin:0;font:600 clamp(16px,2.4cqw,21px)/1.5 system-ui,sans-serif;color:var(--ch-ink);white-space:pre-wrap;text-wrap:pretty}
.ch-question-text+h3{margin-top:8px}
.ch-response>.ch-byline{margin-bottom:8px;color:var(--ch-accent)}
.ch-prose,.ch-prose :where(p,li,td,th,blockquote){font-size:clamp(14px,1.9cqw,16px);line-height:1.75;color:var(--ch-ink)}
.ch-prose :where(p){margin:0 0 .85em}.ch-prose :where(ul,ol){padding-inline-start:1.5em}.ch-prose :where(li+li){margin-top:.35em}
.ch-prose :where(h1,h2,h3,h4){line-height:1.45;margin:1.3em 0 .55em;color:var(--ch-ink)}
.ch-prose :where(pre){max-width:100%;overflow-x:auto}
.ch-prose+.ch-prose{margin-top:1.25em}
.ch-article>blockquote{white-space:pre-wrap;margin:0 0 16px;padding:8px 12px;border-left:2px solid var(--ch-main);background:color-mix(in srgb,var(--ch-accent) 6%,transparent);color:var(--ch-muted);font-size:13px;line-height:1.55}
.ch-article>blockquote small,.ch-article .ch-ref-source{display:block;margin:0 0 3px;padding:0;color:var(--ch-accent);font-size:11px;font-weight:600}
.ch-pending,.ch-status{color:var(--ch-muted);font-size:12px}
.ch-reader form{display:block;flex:none;border-top:1px solid var(--ch-rule);padding:8px clamp(10px,3.5cqw,42px);background:var(--ch-card)}
.ch-composer{max-width:45rem;margin:auto;padding:4px;background:var(--ch-paper);border:1px solid var(--ch-rule);border-radius:12px}
.ch-composer:focus-within{border-color:var(--ch-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--ch-accent) 14%,transparent)}
.ch-entry{display:flex;gap:5px;align-items:flex-end}
.ch-entry textarea{flex:1;min-width:0;resize:none;field-sizing:content;min-height:32px;max-height:110px;padding:5px 7px;border:0;border-radius:6px;background:transparent;font:inherit;font-size:14px;line-height:1.55;color:var(--ch-ink)}
.ch-entry textarea:focus-visible{outline:0}.ch-entry textarea::placeholder{color:var(--ch-muted)}
.chasey .ch-send{display:grid;place-items:center;flex:none;height:32px;width:32px;border-radius:9px;background:var(--ch-accent);color:var(--ch-card)}
.chasey .ch-send:disabled{opacity:.48}.ch-send svg{width:18px;height:18px}
.ch-quote{gap:6px;margin:2px 3px 4px;padding:3px 4px 3px 7px;border-left:2px solid var(--ch-accent);color:var(--ch-muted);font-size:12px}
.ch-quote strong{color:var(--ch-accent);font-size:11px}.ch-quote-preview{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-quote button{flex:none;line-height:1;padding:1px 4px}
@keyframes ch-reader-in{from{opacity:.65;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@container(min-width:720px){.ch-readbar{padding-inline:22px}.ch-reader:not(.ch-expanded){margin:0 12px;border-radius:18px 18px 0 0}}
@media(prefers-reduced-motion:reduce){.ch-reader{animation:none}}

.ch-card small{display:flex;align-items:center;width:100%;gap:2px}.ch-card small em{margin-left:auto;font-size:9px;font-style:normal;letter-spacing:.04em;color:var(--ch-accent)}
.ch-view-toggle span{display:none}
@container(min-width:430px){.ch-readbar .ch-view-toggle{display:flex;width:auto;padding:0 7px;align-items:center;gap:4px}.ch-view-toggle span{display:inline;font-size:12px}}

.chasey,.ch-selection-action{font-family:system-ui,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Apple Symbols","Segoe UI Symbol","Apple Color Emoji","Segoe UI Emoji",sans-serif}
.ch-question-text{font-family:inherit}.ch-article pre,.ch-article code{font-family:ui-monospace,Menlo,Consolas,"PingFang SC",monospace}
.ch-math-run,.ch-math-run>div,.ch-math-run p{display:inline;margin:0!important;padding:0}
.ch-math-run{font-weight:normal;white-space:normal}.chasey .katex{white-space:nowrap;overflow-wrap:normal;word-break:normal}
.ch-article .katex-display{display:block;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:.3em 0;text-align:left}
.ch-article .katex-display>.katex{display:block;width:max-content;min-width:100%}
.ch-card-title,.ch-preview,.ch-quote-preview{min-width:0;max-width:100%}
.ch-card .katex-display,.ch-quote-preview .katex-display{display:inline;margin:0}
.ch-article .ch-math-run:has(.katex-display){display:block;max-width:100%}
.ch-article .katex-error{white-space:pre-wrap;overflow-wrap:anywhere}
.chasey .ch-math-run [data-markdown-variant],.chasey .ch-math-run p{font:inherit;color:inherit}
.ch-prose>div{font-family:inherit}
`;

// src/canvas.jsx
var import_react2 = __toESM(require("react"), 1);

// src/typeset.jsx
var import_react = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/math-text.js
var tokens = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ `~\t]*$|(?![\s\S]))|^(?: {4}|\t)[^\n]*|(`+)(?!`)[\s\S]*?(?<!`)\2(?!`)|!?\[[^\]\n]*\]\([^\n]*?\)|(?:https?:\/\/|www\.)\S+|\\\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$(?!\s)(?:\\.|[^$\n\\])+?(?<!\s)\$(?!\d)|(?<![A-Za-z0-9_\\])[A-Za-zΑ-Ωα-ω](?:[_^](?:\{[A-Za-z0-9]{1,8}\}|[A-Za-z0-9])){1,2}(?![A-Za-z0-9_])/gmu;
function mathParts(text) {
  const parts = [];
  let pos = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index > pos) parts.push({ text: text.slice(pos, match.index) });
    const value = match[0];
    const bare = /^[A-Za-zΑ-Ωα-ω][_^]/u.test(value);
    const math = bare || /^(?:\$|\\[[(])/u.test(value);
    parts.push({ text: value, math, bare });
    pos = match.index + value.length;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos) });
  return parts;
}
var asMarkdown = (part) => part.bare ? "\\(" + part.text + "\\)" : part.text;
var mathMarkdown = (text) => mathParts(text).map(asMarkdown).join("");
var graphemes = new Intl.Segmenter(void 0, { granularity: "grapheme" });
function previewPrefix(text, limit) {
  if (text.length <= limit) return text;
  const end = graphemes.segment(text).containing(limit).index;
  return text.slice(0, end);
}

// src/typeset.jsx
var labels = { code: { copyLabel: "\u590D\u5236", copiedLabel: "\u5DF2\u590D\u5236" }, footnotes: "\u811A\u6CE8" };
var AnswerText = (0, import_react.memo)(function AnswerText2({ text }) {
  return /* @__PURE__ */ import_react.default.createElement(import_dsh_client_ui_primitives.MarkdownText, { text: mathMarkdown(text), labels, omitHtml: true });
});
var Typeset = (0, import_react.memo)(function Typeset2({ text, limit = Infinity, summary = false }) {
  const children = [];
  let used = 0;
  for (const part of mathParts(text)) {
    if (used >= limit) break;
    if (part.math) {
      children.push(/* @__PURE__ */ import_react.default.createElement("div", { key: children.length, className: "ch-math-run" }, /* @__PURE__ */ import_react.default.createElement(import_dsh_client_ui_primitives.MarkdownText, { text: asMarkdown(part), labels, variant: "compact", omitHtml: true })));
    } else {
      const plain = summary ? part.text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/\s+/g, " ") : part.text;
      children.push(previewPrefix(plain, limit - used));
    }
    used += part.text.length;
  }
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, children);
});

// src/camera.js
var CARD = { width: 188, height: 96 };
var MIN_ZOOM = 0.25;
var MAX_ZOOM = 3;
function zoomAt(camera, factor, from, to = from) {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.k * factor));
  const ratio = k / camera.k;
  return { x: to.x - (from.x - camera.x) * ratio, y: to.y - (from.y - camera.y) * ratio, k };
}
function centered(node, k, width, height) {
  return { k, x: width / 2 - (node.x + CARD.width / 2) * k, y: height / 2 - (node.y + CARD.height / 2) * k };
}
function readPositions(storageKey) {
  try {
    const pairs = JSON.parse(localStorage.getItem(storageKey));
    return new Map(Array.isArray(pairs) ? pairs.filter((entry) => Array.isArray(entry) && entry.length === 2 && Number.isSafeInteger(entry[0]) && entry[0] > 0 && Number.isFinite(entry[1]?.x) && Number.isFinite(entry[1]?.y)) : []);
  } catch {
    return /* @__PURE__ */ new Map();
  }
}

// src/canvas.jsx
var title = (node) => node.questions.join(" / ") || "\u672C\u8F6E\u56DE\u7B54";
var midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var nodePoint = (n, positions) => positions.get(n.id) ?? n;
function edgePath(a, b, kind) {
  if (kind === "return") {
    const x = Math.max(a.x, b.x) + 220;
    return "M " + (a.x + 188) + " " + (a.y + 65) + " C " + x + " " + (a.y + 65) + ", " + x + " " + (b.y + 63) + ", " + (b.x + 188) + " " + (b.y + 63);
  }
  const x1 = a.x + 36, y1 = a.y + 96, x2 = b.x + 36, y2 = b.y, mid = (y1 + y2) / 2;
  return "M " + x1 + " " + y1 + " C " + x1 + " " + mid + ", " + x2 + " " + mid + ", " + x2 + " " + y2;
}
var Cards = (0, import_react2.memo)(function Cards2({ graph, byId, positions, selected, returns, pick }) {
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("svg", { className: "ch-wires", "aria-hidden": "true" }, graph.edges.map((e) => /* @__PURE__ */ import_react2.default.createElement("path", { key: e.source.id + "-" + e.target.id, className: "ch-line " + e.kind, d: edgePath(nodePoint(e.source, positions), nodePoint(e.target, positions), e.kind) })), returns.map(([a, b]) => /* @__PURE__ */ import_react2.default.createElement("path", { key: a + "-" + b, className: "ch-line return", d: edgePath(nodePoint(byId.get(a), positions), nodePoint(byId.get(b), positions), "return") }))), graph.nodes.map((n) => {
    const point = nodePoint(n, positions);
    return /* @__PURE__ */ import_react2.default.createElement("button", { key: n.id, "data-turn": n.id, className: "ch-card" + (n.id === selected ? " active" : ""), style: { left: point.x, top: point.y }, "aria-pressed": n.id === selected, "aria-label": "\u7B2C " + n.id + " \u8F6E\uFF1A" + title(n), onClick: () => pick(n) }, /* @__PURE__ */ import_react2.default.createElement("small", null, String(n.id).padStart(2, "0"), " ", /* @__PURE__ */ import_react2.default.createElement("span", null, n.parent ? "\u8FFD\u95EE \xB7 " + n.parent : "\u95EE\u7B54"), n.id === selected && /* @__PURE__ */ import_react2.default.createElement("em", null, "\u9605\u8BFB\u4E2D")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "ch-card-title" }, /* @__PURE__ */ import_react2.default.createElement(Typeset, { text: title(n), limit: 180 })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "ch-preview" }, /* @__PURE__ */ import_react2.default.createElement(Typeset, { text: n.answers[0] || "\u7B49\u5F85\u56DE\u7B54", limit: 180, summary: true })));
  }));
});
function Canvas({ sessionKey, graph, byId, selected, expanded, returns, onPick, empty, onError, linkBanner }) {
  const viewport = (0, import_react2.useRef)(null);
  const storageKey = "chasey.positions.v1." + sessionKey;
  const [positions, setPositions] = (0, import_react2.useState)(() => readPositions(storageKey));
  const positionsRef = (0, import_react2.useRef)(positions);
  const [camera, setCamera] = (0, import_react2.useState)({ x: 0, y: 0, k: 1 });
  const cameraRef = (0, import_react2.useRef)(camera);
  const pointers = (0, import_react2.useRef)(/* @__PURE__ */ new Map());
  const gesture = (0, import_react2.useRef)(null), swallowClick = (0, import_react2.useRef)(false), pinned = (0, import_react2.useRef)(null);
  const [moving, setMoving] = (0, import_react2.useState)(false);
  const [round, setRound] = (0, import_react2.useState)("");
  const roundInput = (0, import_react2.useRef)(null);
  const latest = graph.nodes.at(-1)?.id;
  const data = (0, import_react2.useRef)(null);
  data.current = { byId, selected, latest, onPick, onError };
  const moveCamera = (0, import_react2.useCallback)((next) => {
    cameraRef.current = next;
    setCamera(next);
  }, []);
  const center = (0, import_react2.useCallback)((id2, animate = false) => {
    const node = data.current.byId.get(id2), el = viewport.current;
    if (!el || !node || !el.clientWidth || !el.clientHeight) return;
    pinned.current = id2;
    el.classList.toggle("ch-focusing", animate);
    moveCamera(centered(nodePoint(node, positionsRef.current), cameraRef.current.k, el.clientWidth, el.clientHeight));
  }, [moveCamera]);
  const freeCamera = (0, import_react2.useCallback)(() => {
    pinned.current = null;
    viewport.current?.classList.remove("ch-focusing");
  }, []);
  const pick = (0, import_react2.useCallback)((n) => {
    center(n.id, true);
    data.current.onPick(n);
  }, [center]);
  const initialized = (0, import_react2.useRef)(false);
  (0, import_react2.useLayoutEffect)(() => {
    if (latest == null) return;
    if (!initialized.current) {
      initialized.current = true;
      center(selected ?? latest);
    } else if (pinned.current != null) center(pinned.current);
  }, [byId, latest, center]);
  (0, import_react2.useLayoutEffect)(() => {
    if (selected != null && pinned.current !== selected) center(selected, true);
  }, [selected, center]);
  (0, import_react2.useLayoutEffect)(() => {
    if (pinned.current != null) center(pinned.current);
  }, [expanded, center]);
  (0, import_react2.useLayoutEffect)(() => {
    const observer = new ResizeObserver(() => {
      if (pinned.current != null) center(pinned.current);
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [center]);
  const local = (el, x, y) => {
    const rect = el.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  };
  function locate() {
    if (!round) {
      center(selected ?? latest, true);
      return;
    }
    const target = byId.get(Number(round));
    if (!target) {
      roundInput.current.setCustomValidity("\u5F53\u524D\u56FE\u8C31\u91CC\u6CA1\u6709\u8FD9\u4E00\u8F6E\u3002");
      roundInput.current.reportValidity();
      return;
    }
    setRound("");
    pick(target);
  }
  function zoomButton(factor) {
    const el = viewport.current;
    freeCamera();
    moveCamera(zoomAt(cameraRef.current, factor, { x: el.clientWidth / 2, y: el.clientHeight / 2 }));
  }
  (0, import_react2.useEffect)(() => {
    const el = viewport.current;
    let safari = null;
    const wheel = (e) => {
      e.preventDefault();
      if (safari) return;
      freeCamera();
      const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      const dx = e.deltaX * multiplier, dy = e.deltaY * multiplier;
      const c = cameraRef.current;
      if (e.ctrlKey || e.metaKey) moveCamera(zoomAt(c, Math.exp(-Math.max(-180, Math.min(180, dy)) * 0.012), local(el, e.clientX, e.clientY)));
      else moveCamera({ ...c, x: c.x - (e.shiftKey && !dx ? dy : dx), y: c.y - (e.shiftKey && !dx ? 0 : dy) });
    };
    const gesturePoint = (e) => Number.isFinite(e.clientX) && Number.isFinite(e.clientY) ? local(el, e.clientX, e.clientY) : { x: el.clientWidth / 2, y: el.clientHeight / 2 };
    const start = (e) => {
      e.preventDefault();
      freeCamera();
      safari = { camera: cameraRef.current, point: gesturePoint(e) };
    };
    const change = (e) => {
      e.preventDefault();
      if (safari && e.scale > 0) moveCamera(zoomAt(safari.camera, e.scale, safari.point, gesturePoint(e)));
    };
    const end = (e) => {
      e.preventDefault();
      safari = null;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", start, { passive: false });
    el.addEventListener("gesturechange", change, { passive: false });
    el.addEventListener("gestureend", end, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", start);
      el.removeEventListener("gesturechange", change);
      el.removeEventListener("gestureend", end);
    };
  }, [freeCamera, moveCamera]);
  function updatePositions(next) {
    positionsRef.current = next;
    setPositions(next);
  }
  function commitPositions() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...positionsRef.current]));
    } catch {
      data.current.onError("\u5361\u7247\u5DF2\u79FB\u52A8\uFF0C\u672C\u673A\u672A\u80FD\u4FDD\u5B58\u8FD9\u6B21\u4F4D\u7F6E\u3002");
    }
  }
  function down(e) {
    if (e.button !== 0 && e.button !== 1) return;
    const el = e.currentTarget, list = pointers.current, card = e.target.closest("[data-turn]");
    const point = local(el, e.clientX, e.clientY);
    list.set(e.pointerId, point);
    (card || el).setPointerCapture(e.pointerId);
    if (list.size === 1) {
      swallowClick.current = false;
      const node = e.button === 0 && card ? byId.get(Number(card.dataset.turn)) : null;
      gesture.current = { mode: node ? "card" : "pan", origin: point, camera: cameraRef.current, node, point: node && nodePoint(node, positionsRef.current), dragged: false };
    } else if (list.size === 2) {
      if (gesture.current?.mode === "card" && gesture.current.dragged) commitPositions();
      const [a, b] = list.values();
      freeCamera();
      setMoving(true);
      swallowClick.current = true;
      gesture.current = { mode: "pinch", center: midpoint(a, b), distance: Math.max(1, distance(a, b)), camera: cameraRef.current };
    }
    if (e.button === 1) e.preventDefault();
  }
  function move(e) {
    const list = pointers.current, g = gesture.current;
    if (!list.has(e.pointerId) || !g) return;
    const p = local(e.currentTarget, e.clientX, e.clientY);
    list.set(e.pointerId, p);
    if (g.mode === "pinch") {
      if (list.size < 2) return;
      const [a, b] = list.values();
      moveCamera(zoomAt(g.camera, distance(a, b) / g.distance, g.center, midpoint(a, b)));
      return;
    }
    const dx = p.x - g.origin.x, dy = p.y - g.origin.y;
    if (!g.dragged) {
      if (Math.hypot(dx, dy) < 5) return;
      g.dragged = true;
      freeCamera();
      swallowClick.current = true;
      setMoving(true);
    }
    if (g.mode === "pan") moveCamera({ ...g.camera, x: g.camera.x + dx, y: g.camera.y + dy });
    else updatePositions(new Map(positionsRef.current).set(g.node.id, { x: g.point.x + dx / g.camera.k, y: g.point.y + dy / g.camera.k }));
  }
  function up(e) {
    const list = pointers.current, g = gesture.current;
    if (!list.delete(e.pointerId) || !g) return;
    if (g.mode === "card" && g.dragged) commitPositions();
    if (list.size >= 2) {
      const [a, b] = list.values();
      gesture.current = { mode: "pinch", center: midpoint(a, b), distance: Math.max(1, distance(a, b)), camera: cameraRef.current };
    } else if (list.size === 1) {
      gesture.current = { mode: "pan", origin: [...list.values()][0], camera: cameraRef.current, dragged: true };
    } else {
      gesture.current = null;
      setMoving(false);
    }
  }
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "ch-tools" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "ch-legend main" }, "\u987A\u5E8F"), /* @__PURE__ */ import_react2.default.createElement("span", { className: "ch-legend branch" }, "\u8FFD\u95EE"), /* @__PURE__ */ import_react2.default.createElement("span", { className: "ch-legend back" }, "\u56DE\u8FDE"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "ch-zoom" }, /* @__PURE__ */ import_react2.default.createElement("button", { "aria-label": "\u7F29\u5C0F", disabled: camera.k <= MIN_ZOOM, onClick: () => zoomButton(1 / 1.2) }, "\u2212"), /* @__PURE__ */ import_react2.default.createElement("button", { title: "\u91CD\u7F6E\u7F29\u653E", onClick: () => zoomButton(1 / cameraRef.current.k) }, Math.round(camera.k * 100), "%"), /* @__PURE__ */ import_react2.default.createElement("button", { "aria-label": "\u653E\u5927", disabled: camera.k >= MAX_ZOOM, onClick: () => zoomButton(1.2) }, "+"), /* @__PURE__ */ import_react2.default.createElement("input", { ref: roundInput, className: "ch-round-input", inputMode: "numeric", value: round, "aria-label": "\u8DF3\u5230\u7B2C\u51E0\u8F6E", placeholder: "\u8F6E\u6B21", title: "\u8F93\u5165\u8F6E\u6B21\u540E\u6309\u56DE\u8F66", onChange: (e) => {
    e.target.setCustomValidity("");
    setRound(e.target.value.replace(/[^0-9]/g, ""));
  }, onKeyDown: (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      locate();
    }
  } }), /* @__PURE__ */ import_react2.default.createElement("button", { disabled: latest == null, title: selected != null ? "\u5B9A\u4F4D\u6240\u9009\u5361\u7247" : "\u5B9A\u4F4D\u6700\u65B0\u4E00\u8F6E", onClick: locate }, "\u5B9A\u4F4D"))), linkBanner, /* @__PURE__ */ import_react2.default.createElement(
    "div",
    {
      ref: viewport,
      className: "ch-viewport" + (moving ? " ch-moving" : ""),
      tabIndex: "0",
      "aria-label": "\u4F1A\u8BDD\u56FE\u8C31\uFF0C\u53EF\u62D6\u52A8\u753B\u5E03\u548C\u5361\u7247\uFF0C\u53CC\u6307\u7F29\u653E",
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: up,
      onPointerCancel: up,
      onLostPointerCapture: up,
      onClickCapture: (e) => {
        if (swallowClick.current && e.detail !== 0) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      onFocus: (e) => {
        const card = e.target.closest("[data-turn]");
        if (card && card.matches(":focus-visible")) center(Number(card.dataset.turn));
      },
      onKeyDown: (e) => {
        if (e.target !== viewport.current) return;
        if (e.key === "Home") {
          e.preventDefault();
          center(selected ?? latest, true);
        } else if (e.key === "+" || e.key === "=") zoomButton(1.2);
        else if (e.key === "-") zoomButton(1 / 1.2);
        else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
          e.preventDefault();
          freeCamera();
          const c = cameraRef.current;
          moveCamera({ ...c, x: c.x + (e.key === "ArrowLeft" ? 64 : e.key === "ArrowRight" ? -64 : 0), y: c.y + (e.key === "ArrowUp" ? 64 : e.key === "ArrowDown" ? -64 : 0) });
        }
      },
      style: { backgroundPosition: camera.x + "px " + camera.y + "px", backgroundSize: 17 * camera.k + "px " + 17 * camera.k + "px" }
    },
    !graph.nodes.length && /* @__PURE__ */ import_react2.default.createElement("div", { className: "ch-empty" }, empty),
    /* @__PURE__ */ import_react2.default.createElement("div", { className: "ch-plane", style: { transform: "translate(" + camera.x + "px," + camera.y + "px) scale(" + camera.k + ")" } }, /* @__PURE__ */ import_react2.default.createElement(Cards, { graph, byId, positions, selected, returns, pick }))
  ));
}

// src/reader.jsx
var import_react4 = __toESM(require("react"), 1);

// src/selection.jsx
var import_react3 = __toESM(require("react"), 1);

// src/quote-selection.js
function selectedSource(selection, reader) {
  if (!selection?.rangeCount || selection.isCollapsed) return "";
  const range = selection.getRangeAt(0).cloneRange();
  function formula(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return el?.closest(".katex-display") ?? el?.closest(".katex");
  }
  const first = formula(range.startContainer), last = formula(range.endContainer);
  if (first) range.setStartBefore(first);
  if (last) range.setEndAfter(last);
  if (!first && !last && !reader.querySelector(".katex")) return selection.toString().trim();
  const fragment = range.cloneContents();
  const formulas = fragment.querySelectorAll(".katex");
  if (!formulas.length) return selection.toString().trim();
  for (const item of formulas) {
    const source = item.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
    if (source == null) continue;
    const display = item.closest(".katex-display");
    (display ?? item).replaceWith(display ? "\\[" + source + "\\]" : "\\(" + source + "\\)");
  }
  const copy = reader.ownerDocument.createElement("div");
  copy.style.cssText = "position:fixed;left:-100000px;pointer-events:none";
  copy.append(fragment);
  reader.append(copy);
  try {
    return copy.innerText.trim();
  } finally {
    copy.remove();
  }
}

// src/selection.jsx
var import_react_dom = require("react-dom");
function SelectionAction({ reader, active, onPick, onPreview }) {
  const [anchor, setAnchor] = (0, import_react3.useState)(null);
  const rangeRef = (0, import_react3.useRef)(null);
  const dismiss = (0, import_react3.useCallback)(() => {
    rangeRef.current = null;
    setAnchor(null);
  }, []);
  (0, import_react3.useEffect)(() => {
    const element = reader.current;
    if (!active || !element) {
      dismiss();
      return;
    }
    const doc = element.ownerDocument, win = doc.defaultView;
    let frame = 0, dragging = false;
    const update = () => {
      const selection = doc.getSelection();
      if (dragging || !selection?.rangeCount || selection.isCollapsed || !element.contains(selection.anchorNode) || !element.contains(selection.focusNode)) return dismiss();
      const range = selection.getRangeAt(0);
      const text = selectedSource(selection, element);
      if (!text) return dismiss();
      const clip = element.getBoundingClientRect();
      const rects = [...range.getClientRects()].filter((r) => r.width && r.height && r.bottom > clip.top && r.top < clip.bottom);
      const end = selection.focusNode === range.startContainer && selection.focusOffset === range.startOffset ? rects[0] : rects.at(-1);
      if (!end) return dismiss();
      const width = Math.min(120, clip.width, win.innerWidth - 16);
      const left = Math.max(8, clip.left, Math.min(end.right - width, clip.right - width, win.innerWidth - width - 8));
      const top = Math.max(6, Math.min(win.innerHeight - 42, end.bottom + 42 > Math.min(clip.bottom, win.innerHeight) ? end.top - 38 : end.bottom + 5));
      rangeRef.current = range.cloneRange();
      setAnchor({ text, left, top, width });
    };
    const schedule = () => {
      win.cancelAnimationFrame(frame);
      frame = win.requestAnimationFrame(update);
    };
    const start = () => {
      dragging = true;
      dismiss();
    };
    const finish = (e) => {
      if (e.key === "Escape") return;
      dragging = false;
      const s = doc.getSelection();
      if (s && !s.isCollapsed && element.contains(s.anchorNode) && element.contains(s.focusNode)) {
        const text = selectedSource(s, element);
        if (text) onPreview(text);
      }
      schedule();
    };
    const keydown = (e) => {
      if (e.key === "Escape") {
        win.cancelAnimationFrame(frame);
        dismiss();
      }
    };
    element.addEventListener("pointerdown", start);
    doc.addEventListener("pointerup", finish);
    doc.addEventListener("pointercancel", finish);
    element.addEventListener("keyup", finish);
    doc.addEventListener("selectionchange", schedule);
    doc.addEventListener("keydown", keydown);
    doc.addEventListener("scroll", schedule, true);
    win.addEventListener("resize", schedule);
    return () => {
      win.cancelAnimationFrame(frame);
      element.removeEventListener("pointerdown", start);
      doc.removeEventListener("pointerup", finish);
      doc.removeEventListener("pointercancel", finish);
      element.removeEventListener("keyup", finish);
      doc.removeEventListener("selectionchange", schedule);
      doc.removeEventListener("keydown", keydown);
      doc.removeEventListener("scroll", schedule, true);
      win.removeEventListener("resize", schedule);
    };
  }, [reader, active, onPreview, dismiss]);
  if (!anchor || !active || !reader.current) return null;
  return (0, import_react_dom.createPortal)(/* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      type: "button",
      className: "ch-selection-action",
      style: { left: anchor.left, top: anchor.top, width: anchor.width },
      onPointerDown: (e) => e.preventDefault(),
      onMouseDown: (e) => e.preventDefault(),
      onClick: () => {
        onPick(anchor.text, rangeRef.current);
        dismiss();
      }
    },
    "\u8FFD\u95EE\u8FD9\u6BB5 ",
    /* @__PURE__ */ import_react3.default.createElement("span", { "aria-hidden": "true" }, "\u2197")
  ), reader.current.ownerDocument.body);
}

// src/reader.jsx
var excerpt = (n) => (n.answers.join("\n\n") || n.questions.join(" / ")).trim().slice(0, 420);
var icons = {
  previous: "m14 6-6 6 6 6",
  next: "m10 6 6 6-6 6",
  expand: "M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7",
  collapse: "M20 4l-7 7m0-6v6h6M4 20l7-7m-6 0h6v6",
  close: "m6 6 12 12M18 6 6 18",
  send: "M12 19V5m-6 6 6-6 6 6",
  connect: "M5 6v7a4 4 0 0 0 4 4h10m-4-4 4 4-4 4"
};
function Icon({ name }) {
  return /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("path", { d: icons[name] }));
}
function IconButton({ label, icon, onClick, pressed, disabled }) {
  return /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "ch-icon" + (pressed !== void 0 ? " ch-view-toggle" : ""), title: label, "aria-label": label, "aria-pressed": pressed, onClick, disabled }, /* @__PURE__ */ import_react4.default.createElement(Icon, { name: icon }), pressed !== void 0 && /* @__PURE__ */ import_react4.default.createElement("span", null, label));
}
function Reader({ node, send, maySend, drafts, close, connect, outgoing, unlink, expanded, toggleExpanded, previous, next, visitSource }) {
  const [question, setQuestion] = (0, import_react4.useState)(() => drafts.get(node.id)?.question ?? ""), [quote, setQuote] = (0, import_react4.useState)(() => drafts.get(node.id)?.quote ?? ""), [status, setStatus] = (0, import_react4.useState)(""), [busy, setBusy] = (0, import_react4.useState)(false);
  const reader = (0, import_react4.useRef)(null), input = (0, import_react4.useRef)(null), pending = (0, import_react4.useRef)(false);
  const highlightName = "chasey-" + import_react4.default.useId().replace(/[^a-z0-9-]/gi, "");
  const clearMark = () => globalThis.CSS?.highlights?.delete(highlightName);
  (0, import_react4.useEffect)(() => () => globalThis.CSS?.highlights?.delete(highlightName), [highlightName]);
  (0, import_react4.useEffect)(() => {
    if (question || quote) drafts.set(node.id, { question, quote });
    else drafts.delete(node.id);
  }, [drafts, node.id, question, quote]);
  function startFollowUp(text, range) {
    setQuote(text);
    if (range && globalThis.Highlight && globalThis.CSS?.highlights) {
      CSS.highlights.set(highlightName, new Highlight(range));
    }
    reader.current.ownerDocument.getSelection()?.removeAllRanges();
    input.current?.focus({ preventScroll: true });
    input.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  async function submit(event) {
    event.preventDefault();
    if (!maySend || pending.current || !question.trim()) return;
    pending.current = true;
    setBusy(true);
    setStatus("");
    try {
      await send(node, quote || excerpt(node), question);
      drafts.delete(node.id);
      setStatus("\u5DF2\u63D0\u4EA4\u5230\u672C\u4F1A\u8BDD\u3002\u56DE\u7B54\u5B8C\u6210\u540E\u4F1A\u663E\u793A\u5728\u56FE\u8C31\u4E0A\u3002");
      setQuestion("");
      setQuote("");
      clearMark();
    } catch (e) {
      setStatus("\u63D0\u4EA4\u5931\u8D25\uFF1A" + (e.message || String(e)));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const heading = "ch-round-" + node.id;
  return /* @__PURE__ */ import_react4.default.createElement("section", { className: "ch-reader" + (expanded ? " ch-expanded" : ""), "aria-labelledby": heading }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-readbar" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-round-nav" }, /* @__PURE__ */ import_react4.default.createElement(IconButton, { icon: "previous", label: "\u4E0A\u4E00\u8F6E", onClick: previous, disabled: !previous }), /* @__PURE__ */ import_react4.default.createElement("strong", { id: heading }, "\u7B2C ", node.id, " \u8F6E"), /* @__PURE__ */ import_react4.default.createElement(IconButton, { icon: "next", label: "\u4E0B\u4E00\u8F6E", onClick: next, disabled: !next })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-read-actions" }, /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "ch-connect", onClick: connect }, /* @__PURE__ */ import_react4.default.createElement(Icon, { name: "connect" }), "\u8FDE\u56DE\u5361\u7247"), /* @__PURE__ */ import_react4.default.createElement(IconButton, { icon: expanded ? "collapse" : "expand", label: expanded ? "\u8FD4\u56DE\u753B\u5E03" : "\u5C55\u5F00\u9605\u8BFB", onClick: toggleExpanded, pressed: expanded }), /* @__PURE__ */ import_react4.default.createElement(IconButton, { icon: "close", label: "\u5173\u95ED\u539F\u6587", onClick: close }))), /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-scroll", ref: reader, tabIndex: 0, "aria-label": "\u672C\u8F6E\u539F\u6587" }, /* @__PURE__ */ import_react4.default.createElement("article", { className: "ch-article" }, node.questions.length > 0 && /* @__PURE__ */ import_react4.default.createElement("header", { className: "ch-question" }, /* @__PURE__ */ import_react4.default.createElement("span", { className: "ch-byline" }, "\u6211\u7684\u63D0\u95EE"), node.questions.map((text, i) => /* @__PURE__ */ import_react4.default.createElement("div", { role: "heading", "aria-level": 3, className: "ch-question-text", key: i }, /* @__PURE__ */ import_react4.default.createElement(Typeset, { text })))), node.references.map((ref, i) => /* @__PURE__ */ import_react4.default.createElement("blockquote", { key: i }, ref.parent != null && ref.parent !== node.id ? /* @__PURE__ */ import_react4.default.createElement("button", { className: "ch-ref-source", onClick: () => visitSource(ref.parent) }, "\u5F15\u7528\u7B2C ", ref.parent, " \u8F6E\u539F\u6587 \u2197") : /* @__PURE__ */ import_react4.default.createElement("small", null, ref.parent === node.id ? "\u5F15\u7528\u672C\u8F6E\u539F\u6587" : "\u5F15\u7528 \xB7 \u6765\u6E90\u672A\u786E\u8BA4"), /* @__PURE__ */ import_react4.default.createElement(Typeset, { text: ref.text }))), /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-response" }, /* @__PURE__ */ import_react4.default.createElement("span", { className: "ch-byline" }, "\u56DE\u7B54\u539F\u6587"), node.answers.map((text, i) => /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-prose", key: i }, /* @__PURE__ */ import_react4.default.createElement(AnswerText, { text }))), !node.answers.length && /* @__PURE__ */ import_react4.default.createElement("p", { role: "status", className: "ch-pending" }, "\u7B49\u5F85\u672C\u8F6E\u56DE\u7B54\u2026")))), /* @__PURE__ */ import_react4.default.createElement("style", null, "::highlight(" + highlightName + "){background-color:#e9d7fa;color:#30223c}"), /* @__PURE__ */ import_react4.default.createElement(SelectionAction, { reader, active: maySend && !busy, onPreview: setQuote, onPick: startFollowUp }), !maySend && /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-status" }, "\u6B64\u4F1A\u8BDD\u5F53\u524D\u4E3A\u53EA\u8BFB\uFF0C\u65E0\u6CD5\u63D0\u4EA4\u8FFD\u95EE\u3002"), outgoing.length > 0 && /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-status" }, outgoing.map(([, b]) => /* @__PURE__ */ import_react4.default.createElement("button", { key: b, "aria-label": "\u79FB\u9664\u56DE\u5230\u7B2C " + b + " \u8F6E\u7684\u8FDE\u7EBF", onClick: () => unlink(b) }, "\u56DE\u5230\u7B2C ", b, " \u8F6E \xD7"))), maySend && /* @__PURE__ */ import_react4.default.createElement("form", { onSubmit: submit }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-composer" }, quote && /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-quote" }, /* @__PURE__ */ import_react4.default.createElement("strong", null, "\u5F15\u7528"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-quote-preview" }, /* @__PURE__ */ import_react4.default.createElement(Typeset, { text: quote, limit: 240 })), /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", "aria-label": "\u6E05\u9664\u9009\u6BB5", onClick: () => {
    setQuote("");
    clearMark();
  } }, "\xD7")), /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-entry" }, /* @__PURE__ */ import_react4.default.createElement("textarea", { rows: 1, ref: input, "aria-label": quote ? "\u6CBF\u9009\u6BB5\u8FFD\u95EE" : "\u6CBF\u672C\u8F6E\u8FFD\u95EE", value: question, disabled: busy, onChange: (e) => setQuestion(e.target.value), placeholder: quote ? "\u9488\u5BF9\u8FD9\u6BB5\u539F\u6587\u63D0\u95EE\u2026" : "\u6CBF\u7740\u8FD9\u4E00\u8F6E\u7EE7\u7EED\u8FFD\u95EE\u2026" }), /* @__PURE__ */ import_react4.default.createElement("button", { className: "ch-send", "aria-label": "\u53D1\u9001\u5230\u672C\u4F1A\u8BDD", title: "\u53D1\u9001\u5230\u672C\u4F1A\u8BDD", disabled: busy || !question.trim() }, /* @__PURE__ */ import_react4.default.createElement(Icon, { name: "send" }))))), status && /* @__PURE__ */ import_react4.default.createElement("div", { className: "ch-status", role: "status" }, status));
}

// src/plugin.jsx
var tabKind = "chasey-map";
var id = "chasey-harness";
var relevant = (e) => ["turn/start", "turn/end", "user/message", "assistant/message"].includes(e.event.type);
function history(source) {
  let lastRevision, rows = [];
  const read = () => {
    const window = source.getSnapshot();
    if (lastRevision === window.revision) return rows;
    const change = window.change;
    const skip = lastRevision + 1 === window.revision && change.kind === "append" && !change.entries.some(relevant);
    lastRevision = window.revision;
    if (!skip) rows = project(window.entries);
    return rows;
  };
  return { getSnapshot: read, subscribe: (notify) => source.subscribe(notify) };
}
function MapIcon() {
  return /* @__PURE__ */ import_react5.default.createElement("svg", { width: "17", height: "17", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", "aria-hidden": "true" }, /* @__PURE__ */ import_react5.default.createElement("path", { d: "M6 5v14m0-9c4 0 11 1 11-5m0 8c0 4-7 3-11 5" }), /* @__PURE__ */ import_react5.default.createElement("circle", { cx: "6", cy: "4", r: "2" }), /* @__PURE__ */ import_react5.default.createElement("circle", { cx: "6", cy: "20", r: "2" }), /* @__PURE__ */ import_react5.default.createElement("circle", { cx: "17", cy: "4", r: "2" }), /* @__PURE__ */ import_react5.default.createElement("circle", { cx: "17", cy: "12", r: "2" }));
}
function loadLinks(key) {
  try {
    return validReturns(JSON.parse(localStorage.getItem(key)));
  } catch {
    return [];
  }
}
function Panel({ sessionKey, useTurns, useSession, useAccess, loadAll, send }) {
  const turns = useTurns((v) => v);
  const graph = (0, import_react5.useMemo)(() => layout(turns), [turns]);
  const hasMore = useSession((v) => v.hasMore);
  const loading = useSession((v) => v.loadingOlder);
  const historyError = useSession((v) => v.historyLoadStatus === "error");
  const openError = useSession((v) => v.openError);
  const opened = useSession((v) => v.openState === "open");
  const maySend = useAccess("session/prompt") !== false;
  const [request, setRequest] = (0, import_react5.useState)(0);
  const [failure, setFailure] = (0, import_react5.useState)("");
  const [selected, select] = (0, import_react5.useState)(null);
  const [expanded, setExpanded] = (0, import_react5.useState)(false);
  const drafts = (0, import_react5.useRef)(/* @__PURE__ */ new Map());
  const [linkStart, setLinkStart] = (0, import_react5.useState)(null);
  const pendingFollowUp = (0, import_react5.useRef)(null);
  const storageKey = "chasey.returns.v1." + sessionKey;
  const [returns, setReturns] = (0, import_react5.useState)(() => loadLinks(storageKey));
  const selectedIndex = graph.nodes.findIndex((n) => n.id === selected);
  const selectedNode = graph.nodes[selectedIndex];
  const byId = (0, import_react5.useMemo)(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  (0, import_react5.useEffect)(() => {
    if (!opened || !hasMore) return;
    let active = true;
    Promise.resolve(loadAll()).catch((err) => {
      if (active) setFailure(String(err.message || err));
    });
    return () => {
      active = false;
    };
  }, [opened, hasMore, loadAll, request]);
  async function sendFollowUp(node, quote, question) {
    const text = followUpText(node.id, quote, question);
    const request2 = { after: turns.at(-1)?.id ?? 0, parent: node.id, quote: quote.trim(), question: question.trim() };
    pendingFollowUp.current = request2;
    try {
      await send(text);
    } catch (err) {
      if (pendingFollowUp.current === request2) pendingFollowUp.current = null;
      throw err;
    }
  }
  (0, import_react5.useEffect)(() => {
    const pending = pendingFollowUp.current;
    if (!pending || selected !== pending.parent) return;
    const next = turns.find((n) => n.id > pending.after && n.questions.includes(pending.question) && n.references.some((ref) => ref.parent === pending.parent && ref.text === pending.quote));
    if (next) {
      pendingFollowUp.current = null;
      select(next.id);
    }
  }, [turns, selected]);
  function saveLinks(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setReturns(next);
      return true;
    } catch {
      setFailure("\u65E0\u6CD5\u4FDD\u5B58\u8FDE\u7EBF\uFF0C\u8BF7\u68C0\u67E5\u6B64\u7A97\u53E3\u7684\u672C\u5730\u5B58\u50A8\u6743\u9650\u3002");
      return false;
    }
  }
  function pick(n) {
    pendingFollowUp.current = null;
    if (linkStart !== null) {
      if (linkStart === n.id) return;
      if (!returns.some((pair) => pair[0] === linkStart && pair[1] === n.id) && !saveLinks([...returns, [linkStart, n.id]])) return;
      setLinkStart(null);
    }
    select(n.id);
  }
  const returnEdges = (0, import_react5.useMemo)(() => returns.filter(([a, b]) => byId.has(a) && byId.has(b)), [returns, byId]);
  return /* @__PURE__ */ import_react5.default.createElement("section", { className: "chasey", "aria-label": "\u8FFD\u8FFD\u4F1A\u8BDD\u56FE\u8C31" }, /* @__PURE__ */ import_react5.default.createElement("header", null, /* @__PURE__ */ import_react5.default.createElement("div", null, /* @__PURE__ */ import_react5.default.createElement(MapIcon, null), /* @__PURE__ */ import_react5.default.createElement("strong", null, "\u8FFD\u8FFD"), /* @__PURE__ */ import_react5.default.createElement("span", { className: "ch-sub" }, "\u4F1A\u8BDD\u56FE\u8C31")), /* @__PURE__ */ import_react5.default.createElement("span", { className: "ch-count" }, turns.length, " \u8F6E")), (hasMore || historyError || openError || failure) && /* @__PURE__ */ import_react5.default.createElement("div", { className: "ch-status", role: "status" }, failure || (openError ? "\u4F1A\u8BDD\u6682\u65F6\u65E0\u6CD5\u6253\u5F00" : historyError ? "\u8F83\u65E9\u8BB0\u5F55\u52A0\u8F7D\u5931\u8D25\uFF0C\u5F53\u524D\u5C55\u793A\u90E8\u5206\u56FE\u8C31" : "\u6B63\u5728\u8BFB\u53D6\u8F83\u65E9\u7684\u4F1A\u8BDD\u8BB0\u5F55\u2026"), " ", (historyError || failure) && /* @__PURE__ */ import_react5.default.createElement("button", { disabled: loading, onClick: () => {
    setFailure("");
    setRequest((x) => x + 1);
  } }, "\u91CD\u8BD5")), /* @__PURE__ */ import_react5.default.createElement(
    Canvas,
    {
      sessionKey,
      graph,
      byId,
      selected,
      expanded,
      returns: returnEdges,
      onPick: pick,
      onError: setFailure,
      empty: opened && !loading ? "\u8FD9\u6BB5\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u95EE\u7B54\u3002" : "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u2026",
      linkBanner: linkStart !== null && /* @__PURE__ */ import_react5.default.createElement("div", { className: "ch-status" }, "\u9009\u62E9\u7B2C ", linkStart, " \u8F6E\u8981\u8FDE\u56DE\u7684\u5361\u7247 ", /* @__PURE__ */ import_react5.default.createElement("button", { onClick: () => setLinkStart(null) }, "\u53D6\u6D88"))
    }
  ), selectedNode && linkStart === null && /* @__PURE__ */ import_react5.default.createElement(
    Reader,
    {
      key: selectedNode.id,
      node: selectedNode,
      send: sendFollowUp,
      maySend,
      drafts: drafts.current,
      expanded,
      toggleExpanded: () => setExpanded((v) => !v),
      close: () => {
        pendingFollowUp.current = null;
        setExpanded(false);
        select(null);
      },
      previous: selectedIndex > 0 ? () => pick(graph.nodes[selectedIndex - 1]) : null,
      next: selectedIndex < graph.nodes.length - 1 ? () => pick(graph.nodes[selectedIndex + 1]) : null,
      visitSource: (id2) => {
        if (byId.has(id2)) pick(byId.get(id2));
      },
      connect: () => {
        pendingFollowUp.current = null;
        setExpanded(false);
        setLinkStart(selectedNode.id);
      },
      outgoing: returnEdges.filter((p) => p[0] === selectedNode.id),
      unlink: (b) => saveLinks(returns.filter((p) => p[0] !== selectedNode.id || p[1] !== b))
    }
  ));
}
var inject = ["slots", "sessions", "sidebarRightTabs", "sidebarRight"];
function apply(ctx) {
  const histories = /* @__PURE__ */ new WeakMap();
  ctx.effect(() => {
    const sheet = document.createElement("style");
    sheet.textContent = style_default;
    document.head.append(sheet);
    return () => sheet.remove();
  }, "chasey: panel styles");
  ctx.effect(() => ctx.sidebarRightTabs.register({ id, kind: tabKind, title: () => "\u8FFD\u8FFD", guide: [{ id: "open", order: 40, title: () => "\u8FFD\u8FFD \xB7 \u4F1A\u8BDD\u56FE\u8C31", description: () => "\u6CBF\u539F\u6587\u5206\u53C9\u8FFD\u95EE\uFF0C\u8FDE\u56DE\u4E3B\u7EBF\u3002" }] }), "chasey: session map");
  const slot = "sidebar.right.pane.tab";
  ctx.slots.inject(slot, () => ctx.slots.register({ name: slot, key: id, inject(sessionId) {
    const binding = ctx.sessions.binding(sessionId);
    if (!binding) throw new Error("\u8FFD\u8FFD\u65E0\u6CD5\u7ED1\u5B9A\u6B64\u4F1A\u8BDD\u3002");
    if (!histories.has(binding)) histories.set(binding, history(binding.eventSource));
    return {
      hooks: { turns: histories.get(binding) },
      sessionKey: sessionId,
      loadAll: () => binding.session.loadThrough(0),
      send: async (text) => {
        const result = await binding.session.prompt([{ type: "text", text }], "queue");
        if (!result.ok) throw new Error(result.error.message || result.error.code);
      }
    };
  } }, (props) => /* @__PURE__ */ import_react5.default.createElement(Panel, { key: props.sessionKey, ...props })));
  const header = "conversation.session.header.actions";
  ctx.slots.inject(header, () => ctx.slots.register({ name: header, id, order: 15 }, () => /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "ch-open", title: "\u6253\u5F00\u5F53\u524D\u4F1A\u8BDD\u7684\u8FFD\u8FFD\u56FE\u8C31", onClick: () => ctx.sidebarRight.openTab(tabKind) }, /* @__PURE__ */ import_react5.default.createElement(MapIcon, null), "\u8FFD\u8FFD")));
}
return module.exports;}});
