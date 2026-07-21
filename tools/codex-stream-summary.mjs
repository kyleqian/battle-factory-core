#!/usr/bin/env node
// Digest a `codex exec --json` transcript into a fixed-size worker handoff.

import { createInterface } from 'node:readline';

const itemCounts = new Map();
let failedItems = 0;
let finalText = '';
let completed = false;
let failure = '';
let usage = null;
let sawUsageLimit = false;

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    if (/usage limit|rate.?limit|quota exceeded/i.test(line)) sawUsageLimit = true;
    return;
  }

  if (/usage limit|rate.?limit|quota exceeded/i.test(JSON.stringify(ev))) {
    sawUsageLimit = true;
  }
  if (ev.type === 'item.completed') {
    const item = ev.item ?? {};
    if (item.type === 'agent_message' && item.text?.trim()) {
      finalText = item.text.trim();
    } else if (item.type && item.type !== 'reasoning') {
      itemCounts.set(item.type, (itemCounts.get(item.type) ?? 0) + 1);
    }
    if (item.status === 'failed') failedItems++;
  } else if (ev.type === 'turn.completed') {
    completed = true;
    usage = ev.usage ?? null;
  } else if (ev.type === 'turn.failed' || ev.type === 'error') {
    failure = ev.error?.message ?? ev.message ?? ev.error ?? ev.type;
  }
});

rl.on('close', () => {
  const items = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${name}×${n}`)
    .join(' ');

  if (!completed) {
    console.log(`=== worker FAILED (${failure || 'killed before turn completion'}) ===`);
  } else {
    console.log('=== worker finished ===');
  }
  if (usage) {
    const input = usage.input_tokens ?? 0;
    const cached = usage.cached_input_tokens ?? 0;
    const writes = usage.cache_write_input_tokens ?? 0;
    const output = usage.output_tokens ?? 0;
    const reasoning = usage.reasoning_output_tokens ?? 0;
    console.log(`tokens: input ${input} · cached ${cached} · cache-write ${writes} · output ${output} · reasoning ${reasoning}`);
  }
  if (items) console.log(`items: ${items}${failedItems ? ` · ${failedItems} failed` : ''}`);
  if (sawUsageLimit) {
    console.log('USAGE LIMIT: an account usage/rate limit stopped this worker.');
    process.exitCode = 42;
  }
  console.log('--- final message ---');
  console.log(finalText || failure || '(no final text)');
});
