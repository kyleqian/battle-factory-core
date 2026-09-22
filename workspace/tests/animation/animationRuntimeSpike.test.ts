import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { AnimationRuntime, TaskPool, type Program } from '../../tools/animation/runtime-spike/runtime.ts';
import { verifyCases, type CaptureCase, type Resources } from '../../tools/animation/runtime-spike/compare.ts';

const root='tools/animation/runtime-spike/';
const resources=JSON.parse(readFileSync(root+'programs.json','utf8')) as Resources;
const capture=JSON.parse(gunzipSync(readFileSync(root+'observations.json.gz')).toString()) as {cases:CaptureCase[]};

describe('standalone animation runtime experiment',()=>{
  it.each(capture.cases)('matches retained source and selected transfer rows: $fixture',testcase=>{
    const report=verifyCases([testcase],resources)[0];
    expect(report.examples).toEqual([]);
    expect(report.mismatchCounts).toEqual({});
    expect(report.sourceRows).toBe(report.rows);
    expect(report.softwareRows).toBe(report.rows-1);
    expect(report.hardwareRows).toBe(report.rows-1);
  });

  it('preserves slot allocation, equal-priority insertion, and self-destruction traversal',()=>{
    const pool=new TaskPool();
    const ambient=pool.create('ambient',0);
    const first=pool.create('first',5);
    const second=pool.create('second',5);
    expect([ambient.slot,first.slot,second.slot]).toEqual([0,1,2]);
    const visited:string[]=[];
    pool.run(task=>{
      visited.push(task.callback);
      if(task.callback==='first') pool.destroy(task);
    });
    expect(visited).toEqual(['ambient','first','second']);
    expect(pool.create('replacement',3).slot).toBe(1);
    const after:string[]=[]; pool.run(task=>after.push(task.callback));
    expect(after).toEqual(['ambient','replacement','second']);
  });

  it('runs a newly inserted later-priority task in the current traversal',()=>{
    const pool=new TaskPool(); pool.create('first',5);
    const visited:string[]=[];
    pool.run(task=>{
      visited.push(task.callback);
      if(task.callback==='first') {pool.create('earlier',1);pool.create('later',9);}
    });
    expect(visited).toEqual(['first','later']);
  });

  it('fails explicitly for missing callbacks and unsupported commands',()=>{
    const first=capture.cases[0].frames[0];
    const missing:Program={entry:0,commands:{0:{op:'createvisualtask',next:1,callback:'UnknownCallback',priority:2,args:[]},1:{op:'end',next:2}}};
    expect(()=>new AnimationRuntime(missing,first,resources.sine).tick(false)).toThrow(/unsupported native callback/);
    const unknown:Program={entry:0,commands:{0:{op:'unimplemented',next:1}}};
    expect(()=>new AnimationRuntime(unknown,first,resources.sine).tick(false)).toThrow(/unsupported command/);
    const occupied={...first,tasks:[{slot:0,callback:'UnportedAmbientTask',priority:0,prev:254,next:255,data:Array(16).fill(0)}]};
    expect(()=>new AnimationRuntime(unknown,occupied,resources.sine)).toThrow(/unsupported initial task/);
  });

  it('keeps delay zero as a yielding command and preserves 16-bit callback storage',()=>{
    const first=capture.cases[0].frames[0];
    const program:Program={entry:0,commands:{0:{op:'delay',next:2,frames:0},2:{op:'end',next:3}}};
    const runtime=new AnimationRuntime(program,first,resources.sine);
    runtime.tick(false); expect(runtime.snapshot()).toMatchObject({pc:2,active:true,wait:-1});
    runtime.tick(false); expect(runtime.snapshot()).toMatchObject({pc:2,active:true,wait:0});
    runtime.tick(false); expect(runtime.active).toBe(false);
    const pool=new TaskPool(); const task=pool.create('test',2); task.data[0]=65535;
    expect(task.data[0]).toBe(-1);
  });
});
