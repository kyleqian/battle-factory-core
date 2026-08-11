#!/usr/bin/env node
// Render `codex exec --json` as a compact terminal stream. Raw JSONL is
// retained by the launcher before it reaches this formatter.

import { createInterface } from 'node:readline';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, value) => (useColor ? `\x1b[${code}m${value}\x1b[0m` : String(value));
const dim = (value) => c('2', value);
const green = (value) => c('32', value);
const red = (value) => c('31', value);
const cyan = (value) => c('36', value);
const oneLine = (value, max = 180) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

function handle(ev) {
  if (ev.type === 'thread.started') {
    console.log(dim(`session ${ev.thread_id ?? ''}`));
  } else if (ev.type === 'item.started') {
    const item = ev.item ?? {};
    if (item.type === 'command_execution') console.log(`${green('>')} ${oneLine(item.command)}`);
    else if (item.type && item.type !== 'reasoning') console.log(`${cyan('>')} ${item.type}`);
  } else if (ev.type === 'item.completed') {
    const item = ev.item ?? {};
    if (item.type === 'agent_message' && item.text?.trim()) {
      console.log('');
      console.log(item.text.trim());
      console.log('');
    } else if (item.status === 'failed') {
      console.log(`${red('x')} ${item.type ?? 'item'} ${oneLine(item.output ?? item.error)}`);
    }
  } else if (ev.type === 'turn.completed') {
    const u = ev.usage ?? {};
    console.log(green(`done · in ${u.input_tokens ?? 0} · cached ${u.cached_input_tokens ?? 0} · out ${u.output_tokens ?? 0}`));
  } else if (ev.type === 'turn.failed' || ev.type === 'error') {
    console.log(red(`failed · ${oneLine(ev.error?.message ?? ev.message ?? ev.error)}`));
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    handle(JSON.parse(line));
  } catch {
    console.log(dim(line));
  }
});
