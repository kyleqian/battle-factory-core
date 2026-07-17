#!/usr/bin/env node
// Digest a Claude Code stream-json run down to a few lines.
//
// Reads the JSONL that `claude -p --verbose --output-format stream-json` emits
// on stdin and prints only an end-of-run digest: status, duration/turns/cost,
// a tool tally, and the agent's final message. run-subagent.sh pipes workers
// through this so the supervisor reading the output gets a fixed-size summary
// no matter how long the run was — the full transcript lives in the JSONL log
// tee'd upstream.
//
// Exits 42 when the result text shows the run was stopped by an account
// usage/rate limit (run-subagent.sh also greps the log for this, since an
// exit code doesn't survive process substitution).

import { createInterface } from 'node:readline';

const toolCounts = new Map();
let failedToolCalls = 0;
let lastText = '';
let resultEv = null;

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    return;
  }
  if (ev.type === 'assistant') {
    for (const b of ev.message?.content ?? []) {
      if (b.type === 'tool_use') {
        toolCounts.set(b.name, (toolCounts.get(b.name) ?? 0) + 1);
      } else if (b.type === 'text' && b.text?.trim()) {
        lastText = b.text.trim();
      }
    }
  } else if (ev.type === 'user') {
    for (const b of ev.message?.content ?? []) {
      if (b.type === 'tool_result' && b.is_error) failedToolCalls++;
    }
  } else if (ev.type === 'result') {
    resultEv = ev;
  }
});

rl.on('close', () => {
  const tools = [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${name}×${n}`)
    .join(' ');
  const toolLine = tools
    ? `tools: ${tools}${failedToolCalls ? ` · ${failedToolCalls} failed` : ''}`
    : '';

  if (!resultEv) {
    // The stream ended without a result event — the run was killed (time cap,
    // signal) before it could finish. Surface where it got to.
    console.log('=== worker did NOT reach a result (killed at the cap?) ===');
    if (toolLine) console.log(toolLine);
    console.log('--- last text before it stopped ---');
    console.log(lastText || '(none)');
    return;
  }

  const ev = resultEv;
  const dur = ev.duration_ms != null ? `${(ev.duration_ms / 60000).toFixed(1)}min` : '?';
  const turns = ev.num_turns != null ? `${ev.num_turns} turns` : '';
  const cost = ev.total_cost_usd != null ? `$${ev.total_cost_usd.toFixed(2)}` : '';
  const text = typeof ev.result === 'string' ? ev.result.trim() : '';

  console.log(`=== worker ${ev.is_error ? `FAILED (${ev.subtype ?? 'error'})` : 'finished'} ===`);
  console.log([dur, turns, cost].filter(Boolean).join(' · '));
  if (toolLine) console.log(toolLine);
  if (/usage limit|rate.?limit/i.test(text)) {
    console.log('⚠ USAGE LIMIT: an account usage/rate limit stopped this worker.');
    process.exitCode = 42;
  }
  console.log('--- final message ---');
  console.log(text || lastText || '(no final text)');
});
