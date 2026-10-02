import { AnimationRuntime, type AffineProgram, type Context, type Program, type SpriteState, type TaskSeed } from './runtime.ts';
export interface Row extends Context { frame:number; pc:number; active:boolean; wait:number; args:number[]; visual:number; sound:number; sePlaying:boolean; softwareOam:number[][]; hardwareOam:number[][]; hardwareMatrices:number[][] }
export interface CaptureCase {fixture:string;move:string;frames:Row[]}
export interface Resources { programs:Record<string,Program>; sine:number[]; affinePrograms:Record<string,AffineProgram> }
/** Observations are assertions, except initial context and the unported audio host's busy input. */
export function verifyCases(cases:CaptureCase[], resources:Resources) {
const reports=[];
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const taskFields=(task:TaskSeed)=>({slot:task.slot, callback:task.callback,priority:task.priority,prev:task.prev,next:task.next,data:task.data});
const spriteFields=(s:SpriteState)=>({slot:s.slot,x:s.x,y:s.y,x2:s.x2,y2:s.y2,attr:s.attr,matrixNum:s.matrixNum,matrix:s.matrix});
for (const testcase of cases) {
  const first=testcase.frames[0];
  const context:Context={attacker:first.attacker,target:first.target,sprites:first.sprites,tasks:first.tasks};
  const untouched=JSON.stringify(context);
  const runtime=new AnimationRuntime(resources.programs['Move_'+testcase.move],context,resources.sine,resources.affinePrograms);
  const mismatchCounts:Record<string,number>={}; const examples:string[]=[];
  let sourceRows=0,softwareRows=0,hardwareRows=0;
  const check=(label:string,actual:unknown,expected:unknown,age:number)=>{
    if(same(actual,expected)) return true;
    mismatchCounts[label]=(mismatchCounts[label]??0)+1;
    if(examples.length<12) examples.push(`age ${age} ${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    return false;
  };
  for(let age=0;age<testcase.frames.length;age++) {
    const expected=testcase.frames[age];
    if(age) runtime.tick(expected.sePlaying);
    const actual=runtime.snapshot();
    let source=true,software=true,hardware=true;
    for(const key of ['pc','active','wait','args','visual','sound'] as const) source=check(key,actual[key],expected[key],age)&&source;
    source=check('tasks',actual.tasks.map(taskFields),expected.tasks.map(taskFields),age)&&source;
    source=check('sprites',actual.sprites.map(spriteFields),expected.sprites.map(spriteFields),age)&&source;
    if(age>0) for(let i=0;i<2;i++) {
      const sw=actual.software[i];
      const hw=actual.hardware[i];
      software=check('softwareOam',expected.softwareOam.some(attr=>same(attr,sw.attr)),true,age)&&software;
      hardware=check('hardwareOam',expected.hardwareOam.some(attr=>same(attr,hw.attr)),true,age)&&hardware;
      if(hw.attr[0]&0x100) hardware=check('hardwareMatrix',hw.matrix,expected.hardwareMatrices[hw.matrixNum],age)&&hardware;
    }
    if(source) sourceRows++;
    if(software && age>0) softwareRows++;
    if(hardware && age>0) hardwareRows++;
  }
  if(untouched!==JSON.stringify(context)) throw new Error('runtime mutated caller context');
  reports.push({fixture:testcase.fixture,move:testcase.move,rows:testcase.frames.length,sourceRows,softwareRows,hardwareRows,
    callbacks:[...new Set(runtime.callbacksCreated)],mismatchCounts,examples});
}
return reports;
}
