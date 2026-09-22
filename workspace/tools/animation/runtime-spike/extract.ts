/** Dev-time decoding of compiled source scripts. No ROM/emulator in the runtime. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AffineProgram, Command, Program } from './runtime.ts';
export function extractPrograms(roots: string[]) {
  const ref = resolve('reference/pokeemerald');
  const rom = readFileSync(resolve(ref, 'pokeemerald.gba'));
  const nm = execFileSync('arm-none-eabi-nm', ['-a', resolve(ref, 'pokeemerald.elf')], { encoding: 'utf8', maxBuffer: 32*1024*1024 });
  const symbols = new Map<string, number>();
  const reverse = new Map<number, string>();
  for (const line of nm.split('\n')) {
    const match = /^([0-9a-fA-F]+) \S (.+)$/.exec(line);
    if (match) { const address = parseInt(match[1], 16); symbols.set(match[2], address); reverse.set(address, match[2]); }
  }
  const u8 = (address: number) => rom.readUInt8(address - 0x08000000);
  const u16 = (address: number) => rom.readUInt16LE(address - 0x08000000);
  const u32 = (address: number) => rom.readUInt32LE(address - 0x08000000);
  const signed = (value: number, bits: number) => value << (32-bits) >> (32-bits);
  const programs: Record<string, Program> = {};
  for (const root of roots) {
    const entry = symbols.get(root);
    if (entry === undefined) throw new Error(`missing script ${root}`);
    const commands: Record<number, Command> = {};
    const pending = [entry];
    while (pending.length) {
      const pc = pending.pop()!;
      if (commands[pc]) continue;
      if (Object.keys(commands).length > 500) throw new Error('extraction instruction limit');
      // Decoding an instruction is not a claim the experimental VM executes it.
      const opcode = u8(pc); let command: Command & {tag?:number;template?:string;subpriority?:number};
      switch (opcode) {
        case 0: command={op:'loadspritegfx',next:pc+3,tag:u16(pc+1)}; break;
        case 2: {
          const template=reverse.get(u32(pc+1));
          if (!template) throw new Error('unknown sprite template address');
          const count=u8(pc+6);
          command={op:'createsprite',next:pc+7+count*2,template,subpriority:u8(pc+5),args:Array.from({length:count},(_,i)=>signed(u16(pc+7+i*2),16))}; break;
        }
        case 3: {
          const callback = reverse.get(u32(pc+1) & ~1);
          if (!callback) throw new Error('unknown task address');
          const count = u8(pc+6);
          command = { op: 'createvisualtask', next: pc+7+count*2, callback, priority: u8(pc+5), args: Array.from({length:count}, (_,i)=>signed(u16(pc+7+i*2),16)) }; break;
        }
        case 4: command={op:'delay',next:pc+2,frames:u8(pc+1)}; break;
        case 5: command={op:'waitforvisualfinish',next:pc+1}; break;
        case 8: command={op:'end',next:pc+1}; break;
        case 14: case 19: command={op:opcode===14?'call':'goto',next:pc+5,target:u32(pc+1)}; break;
        case 15: command={op:'return',next:pc+1}; break;
        case 25: command={op:'playsewithpan',next:pc+4,song:u16(pc+1),pan:signed(u8(pc+3),8)}; break;
        case 28: command={op:'loopsewithpan',next:pc+6,song:u16(pc+1),pan:signed(u8(pc+3),8),interval:u8(pc+4),plays:u8(pc+5)}; break;
        case 29: command={op:'waitplaysewithpan',next:pc+5,song:u16(pc+1),pan:signed(u8(pc+3),8),frames:u8(pc+4)}; break;
        default: throw new Error(`unsupported opcode 0x${opcode.toString(16)} at 0x${pc.toString(16)} (${root})`);
      }
      commands[pc]=command;
      if (command.target !== undefined) pending.push(command.target);
      if (!['end','return','goto'].includes(command.op)) pending.push(command.next);
    }
    programs[root] = { entry, commands };
  }
  const sineAddress = symbols.get('gSineTable')!;
  const sine = Array.from({length:256}, (_,i)=>signed(u16(sineAddress+i*2),16));
  const affinePrograms: Record<string, AffineProgram> = {};
  if (Object.values(programs).some(program=>Object.values(program.commands).some(command=>command.callback==='AnimTask_Splash'))) {
    const address = symbols.get('gSplashEffectAffineAnimCmds')!;
    const commands = [];
    for (let index=0; index<64; index++) {
      // The pinned agbcc ROM stores AffineAnimCmd unions at an 8-byte stride.
      const pc = address + index*8;
      const type = signed(u16(pc),16);
      commands.push({type, x:type, y:signed(u16(pc+2),16), rotation:u8(pc+4), duration:u8(pc+5)});
      if (type === 0x7fff) break;
    }
    if (commands.at(-1)?.type !== 0x7fff) throw new Error('unterminated affine program');
    affinePrograms.gSplashEffectAffineAnimCmds = {address, commands};
  }
  return { affinePrograms, schema:'animation-runtime-spike-programs/v1', romSha256:createHash('sha256').update(rom).digest('hex'), programs, sine };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, ...roots] = process.argv.slice(2);
  if (!output || !roots.length) throw new Error('extract.ts output.json Move_NAME [...]');
  writeFileSync(output, JSON.stringify(extractPrograms(roots), null, 2)+'\n');
}
