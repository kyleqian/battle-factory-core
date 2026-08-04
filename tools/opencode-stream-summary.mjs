#!/usr/bin/env node
// Digest an `opencode run --format json` transcript into a fixed-size handoff.

import { createInterface } from 'node:readline';

const toolCounts = new Map();
let failedTools = 0;
let finalText = '';
let completed = false;
let failure = '';
let sawUsageLimit = false;
const usage = {
  input: 0,
  output: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheWrite: 0,
  cost: 0,
};

const failureText = (event) => String(
  event.error?.message
  ?? event.error
  ?? event.message
  ?? event.part?.error?.message
  ?? event.part?.error
  ?? '',
);

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  if (event.type === 'tool_use') {
    const tool = event.part?.tool ?? 'unknown';
    toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
    if (event.part?.state?.status === 'error') failedTools++;
  } else if (event.type === 'text' && event.part?.text?.trim()) {
    finalText = event.part.text.trim();
  } else if (event.type === 'step_finish') {
    const tokens = event.part?.tokens ?? {};
    usage.input += tokens.input ?? 0;
    usage.output += tokens.output ?? 0;
    usage.reasoning += tokens.reasoning ?? 0;
    usage.cacheRead += tokens.cache?.read ?? 0;
    usage.cacheWrite += tokens.cache?.write ?? 0;
    usage.cost += event.part?.cost ?? 0;
    if (event.part?.reason === 'stop') completed = true;
    if (event.part?.reason === 'error') {
      failure = failureText(event) || 'OpenCode step failed';
    }
  } else if (event.type === 'error') {
    failure = failureText(event) || 'OpenCode error';
  }

  const providerFailure = failureText(event);
  if (
    (event.type === 'error' || event.part?.reason === 'error')
    && /usage limit|rate.?limit|quota exceeded/i.test(providerFailure)
  ) {
    sawUsageLimit = true;
  }
});

rl.on('close', () => {
  const tools = [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}×${count}`)
    .join(' ');

  console.log(completed
    ? '=== worker finished ==='
    : `=== worker FAILED (${failure || 'killed before turn completion'}) ===`);
  console.log(
    `tokens: input ${usage.input} · cached ${usage.cacheRead} · cache-write ${usage.cacheWrite} · output ${usage.output} · reasoning ${usage.reasoning} · cost $${usage.cost.toFixed(4)}`,
  );
  if (tools) {
    console.log(`tools: ${tools}${failedTools ? ` · ${failedTools} failed` : ''}`);
  }
  if (sawUsageLimit) {
    console.log('USAGE LIMIT: an account usage/rate limit stopped this worker.');
    process.exitCode = 42;
  }
  console.log('--- final message ---');
  console.log(finalText || failure || '(no final text)');
});
