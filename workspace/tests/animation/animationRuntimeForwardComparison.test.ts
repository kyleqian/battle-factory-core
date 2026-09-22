import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { verifyForwardCases } from '../../tools/animation/runtime-spike/compare-forward.ts';
import { AnimationRuntime } from '../../tools/animation/runtime-spike/runtime.ts';
import type { CaptureCase, Resources } from '../../tools/animation/runtime-spike/compare.ts';

const root='tools/animation/runtime-spike/';
const resources=JSON.parse(readFileSync(root+'forward-programs.json','utf8')) as Resources;
const capture=JSON.parse(gunzipSync(readFileSync(root+'forward-observations.json.gz')).toString()) as {cases:CaptureCase[]};

describe('forward comparison on unfinished animation components',()=>{
  it.each(capture.cases)('reuses unchanged implementation: $fixture',testcase=>{
    const report=verifyForwardCases([testcase],resources)[0];
    expect(report.mismatchCounts).toEqual({});
    expect(report.examples).toEqual([]);
    const rows=testcase.move==='SNATCH'?52:228;
    expect(report.comparedRows).toBe(rows);
    expect(report.sourceRows).toBe(rows);
    expect(report.softwareRows).toBe(rows-(testcase.move==='SNATCH'?1:0));
    expect(report.hardwareRows).toBe(report.softwareRows);
  });

  it('treats later observations as assertions, not trajectory input',()=>{
    const cases=structuredClone(capture.cases);
    const snatch=cases.find(c=>c.move==='SNATCH')!;
    snatch.frames[12].sprites[snatch.frames[0].attacker].x2+=7;
    expect(verifyForwardCases([snatch],resources)[0].mismatchCounts).toEqual({helperState:1});
    const mud=cases.find(c=>c.move==='MUD_SPORT')!;
    mud.frames[100].tasks.find(t=>t.callback==='AnimTask_Splash_Step')!.data[10]+=7;
    expect(verifyForwardCases([mud],resources)[0].mismatchCounts).toEqual({taskData:1});
  });

  it('still rejects the full Mud Sport script rather than treating omitted graphics as implemented',()=>{
    const mud=capture.cases.find(c=>c.move==='MUD_SPORT')!;
    const runtime=new AnimationRuntime(resources.programs.Move_MUD_SPORT,mud.frames[0],resources.sine,resources.affinePrograms);
    expect(()=>runtime.tick(false)).toThrow('unsupported command loadspritegfx');
  });
});
