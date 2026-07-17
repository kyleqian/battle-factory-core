#!/usr/bin/env node
// Prettify Claude Code stream-json for the terminal.
//
// Reads the JSONL that `claude -p --verbose --output-format stream-json` emits
// on stdin and writes a compact, human-readable view (à la the Claude Code TUI)
// to stdout. The *raw* JSON is preserved upstream — run-agent.sh tees it to
// $AGENT_LOG before piping here — so this only affects what the terminal shows.
//
// Lines that aren't JSON (e.g. stray stderr) are passed through verbatim so
// nothing gets silently swallowed. Set NO_COLOR=1 to disable ANSI.

import { createInterface } from 'node:readline';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);
const italic = (s) => c('3', s);
const cyan = (s) => c('36', s);
const green = (s) => c('32', s);
const red = (s) => c('31', s);

const MAX = 200;
function oneLine(s, max = MAX) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function toolSummary(name, input) {
  const p = input || {};
  switch (name) {
    case 'Bash':
      return oneLine(p.command);
    case 'Read':
      return oneLine(p.file_path);
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return oneLine(p.file_path ?? p.notebook_path);
    case 'Grep':
      return oneLine(p.pattern) + (p.path ? dim(' in ' + oneLine(p.path, 40)) : '');
    case 'Glob':
      return oneLine(p.pattern);
    default: {
      const keys = Object.keys(p);
      if (!keys.length) return '';
      const k = keys[0];
      const v = typeof p[k] === 'object' ? JSON.stringify(p[k]) : p[k];
      return oneLine(`${k}=${v}`);
    }
  }
}

function resultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((b) => (typeof b === 'string' ? b : b?.text ?? '')).join(' ');
  }
  return '';
}

function handle(ev) {
  switch (ev.type) {
    case 'system':
      if (ev.subtype === 'init') {
        const tools = Array.isArray(ev.tools) ? ev.tools.length : '?';
        console.log(dim(`● ${cyan(ev.model ?? 'session')} · ${tools} tools · ${ev.cwd ?? ''}`));
      }
      break;
    case 'assistant':
      for (const b of ev.message?.content ?? []) {
        if (b.type === 'text' && b.text?.trim()) {
          // Set the agent's commentary apart from the tool-call bullets:
          // blockquote-style gutter, italics, and breathing room around it.
          console.log('');
          for (const line of b.text.trim().split('\n')) {
            console.log(`${cyan('│')} ${italic(line)}`);
          }
          console.log('');
        } else if (b.type === 'tool_use') {
          const sum = toolSummary(b.name, b.input);
          console.log(`${green('⏺')} ${bold(b.name)}${sum ? dim('(') + sum + dim(')') : ''}`);
        }
      }
      break;
    case 'user':
      for (const b of ev.message?.content ?? []) {
        if (b.type === 'tool_result') {
          const txt = oneLine(resultText(b.content), 160);
          const mark = b.is_error ? red('⎿') : dim('⎿');
          console.log(`  ${mark} ${dim(txt)}`);
        }
      }
      break;
    case 'result': {
      const dur = ev.duration_ms != null ? `${(ev.duration_ms / 1000).toFixed(1)}s` : '?';
      const cost = ev.total_cost_usd != null ? `$${ev.total_cost_usd.toFixed(4)}` : '';
      const turns = ev.num_turns != null ? `${ev.num_turns} turns` : '';
      const bits = [dur, turns, cost].filter(Boolean).join(' · ');
      console.log(`${ev.is_error ? red('✗ result') : green('✔ result')} ${dim(bits)}`);
      break;
    }
    default:
      break;
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const t = line.trim();
  if (!t) return;
  let ev;
  try {
    ev = JSON.parse(t);
  } catch {
    console.log(dim(line)); // not JSON — surface it verbatim
    return;
  }
  try {
    handle(ev);
  } catch {
    /* never let a formatting bug drop the stream */
  }
});
