/** Bounded component comparison, not full-move/pixel acceptance.
 * Snatch uses the existing helper unchanged. Mud Sport executes only its Splash
 * task from the observed creation boundary; unrelated sprite/audio tasks and
 * script state are explicitly outside this projection.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { windUpLungeAtTick } from '../../../src/animation/windUpLunge.ts';
import { AnimationRuntime, type Program, type SpriteState, type TaskSeed } from './runtime.ts';
import type { CaptureCase, Resources } from './compare.ts';
import { extractPrograms } from './extract.ts';

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const spriteFields=(s:SpriteState)=>({slot:s.slot,x:s.x,y:s.y,x2:s.x2,y2:s.y2,attr:s.attr,matrixNum:s.matrixNum,matrix:s.matrix});
// Linked-list neighbors belong to the excluded audio tasks after age 116.
const taskFields=(t:TaskSeed)=>({slot:t.slot,callback:t.callback,priority:t.priority,data:t.data});

export function verifyForwardCases(cases:CaptureCase[],resources:Resources) {
  return cases.map(testcase=>{
    const mismatchCounts:Record<string,number>={}; const examples:string[]=[];
    const check=(label:string,actual:unknown,expected:unknown,age:number)=>{
      if(same(actual,expected)) return true;
      mismatchCounts[label]=(mismatchCounts[label]??0)+1;
      if(examples.length<12) examples.push(`age ${age} ${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
      return false;
    };
    let sourceRows=0,softwareRows=0,hardwareRows=0,comparedRows=0;
    let startAge=0;
    const program=resources.programs['Move_'+testcase.move];
    if(testcase.move==='SNATCH') {
      const commands=Object.values(program.commands);
      if(commands.map(c=>c.op).join(',')!=='playsewithpan,createvisualtask,end') throw new Error('Snatch source script changed');
      const command=commands[1]; const a=command.args!;
      if(command.callback!=='AnimTask_WindUpLunge'||a[0]!==0) throw new Error('unexpected Snatch task');
      const first=testcase.frames[0]; const actor=first.sprites[first.attacker];
      const args={horizontalSpeed:a[1],waveAmplitude:a[2],windUpDuration:a[3],delayBeforeLunge:a[4],targetXOffset:a[5],lungeDuration:a[6]};
      const at=(age:number)=>windUpLungeAtTick(args,first.attacker===0?'player':'opponent',age-1);
      const inOam=(oam:number[][],age:number)=>{
        const offset=at(age).offset;
        return oam.some(attr=>attr[2]===actor.attr[2] && (attr[0]&255)===((actor.attr[0]+offset.y2)&255) && (attr[1]&511)===((actor.attr[1]+offset.x2)&511));
      };
      for(let age=0;age<testcase.frames.length;age++) {
        const expected=testcase.frames[age], predicted=at(age), sprite=expected.sprites[first.attacker];
        const task=expected.tasks.find(t=>t.callback.startsWith('AnimTask_WindUpLunge_'));
        const actual={offset:predicted.offset,active:predicted.active,phase:predicted.phase};
        const source={offset:{x2:sprite.x2,y2:sprite.y2},active:!!task,phase:!task?'complete':task.callback.endsWith('Step1')?'step1':'step2'};
        comparedRows++;
        if(check('helperState',actual,source,age))sourceRows++;
        // AnimateSprites/BuildOam precede RunTasks; hardware transfers the prior buffer.
        if(age>0) {
          if(check('softwareCoordinates',inOam(expected.softwareOam,age-1),true,age))softwareRows++;
          if(check('hardwareCoordinates',inOam(expected.hardwareOam,age-2),true,age))hardwareRows++;
        }
      }
    } else if(testcase.move==='MUD_SPORT') {
      const commands=Object.values(program.commands).filter(c=>c.op==='createvisualtask');
      if(commands.length!==1||commands[0].callback!=='AnimTask_Splash')throw new Error('unexpected Mud Sport task graph');
      const hasTask=(row:CaptureCase['frames'][number])=>row.tasks.some(t=>t.callback==='AnimTask_Splash_Step');
      startAge=testcase.frames.findIndex(hasTask);
      if(startAge<1)throw new Error('missing task creation boundary');
      const endAge=testcase.frames.findIndex((row,age)=>age>=startAge&&!hasTask(row));
      if(endAge<startAge)throw new Error('missing task completion boundary');
      const seed=testcase.frames[startAge-1];
      // Deliberately synthetic task-only harness. Never silently skip commands in the full VM.
      const isolated:Program={entry:0,commands:{0:{...commands[0],next:1},1:{op:'waitforvisualfinish',next:2},2:{op:'end',next:3}}};
      const runtime=new AnimationRuntime(isolated,seed,resources.sine,resources.affinePrograms);
      for(let age=startAge;age<=endAge;age++) {
        runtime.tick(false);
        const actual=runtime.snapshot(),expected=testcase.frames[age];
        let source=check('taskData',actual.tasks.map(taskFields),expected.tasks.filter(t=>t.callback==='AnimTask_Splash_Step').map(taskFields),age);
        source=check('battlerSprites',actual.sprites.map(spriteFields),expected.sprites.map(spriteFields),age)&&source;
        comparedRows++; if(source)sourceRows++;
        let software=true,hardware=true;
        for(let index=0;index<2;index++) {
          const sw=actual.software[index],hw=actual.hardware[index];
          software=check('softwareOam',expected.softwareOam.some(attr=>same(attr,sw.attr)),true,age)&&software;
          hardware=check('hardwareOam',expected.hardwareOam.some(attr=>same(attr,hw.attr)),true,age)&&hardware;
          if(hw.attr[0]&0x100)hardware=check('hardwareMatrix',hw.matrix,expected.hardwareMatrices[hw.matrixNum],age)&&hardware;
        }
        if(software)softwareRows++; if(hardware)hardwareRows++;
      }
    } else throw new Error(`unsupported comparison ${testcase.move}`);
    return {fixture:testcase.fixture,move:testcase.move,capturedRows:testcase.frames.length,startAge,comparedRows,sourceRows,softwareRows,hardwareRows,mismatchCounts,examples};
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw new Error('compare-forward.ts observations.json[.gz] receipt.json');
  const raw=readFileSync(input); const json=input.endsWith('.gz')?gunzipSync(raw):raw;
  const capture=JSON.parse(json.toString()) as {cases:CaptureCase[]};
  const resources=extractPrograms([...new Set(capture.cases.map(c=>'Move_'+c.move))]);
  const reports=verifyForwardCases(capture.cases,resources);
  const report={schema:'animation-runtime-forward-component-comparison/v1',romSha256:resources.romSha256,
    captureSha256:createHash('sha256').update(json).digest('hex'),
    scope:'Component source and selected transfer checks only. Snatch: unchanged helper, offsets/lifetime/phase and selected battler coordinates. Mud Sport: unchanged Splash task, all task data except external task links, battler state and selected OBJ/matrix transfers; observed creation boundary supplied once. No full script/audio/sprite effects, framebuffer, browser integration or acceptance.',reports};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(reports.some(r=>Object.keys(r.mismatchCounts).length))process.exitCode=1;
}
