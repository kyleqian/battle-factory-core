/** Experimental presentation-only interpreter. No move-name or age-based branches.
 * Source: battle_anim.c, task.c, battle_anim_mon_movement.c, battle_main.c.
 * Unsupported commands/callbacks fail explicitly. This is not production code.
 */
export interface Command {
  op: string;
  next: number;
  target?: number;
  callback?: string;
  priority?: number;
  args?: number[];
  song?: number;
  pan?: number;
  interval?: number;
  plays?: number;
  frames?: number;
}
export interface Program { entry: number; commands: Record<number, Command> }
export interface TaskSeed { slot: number; callback: string; priority: number; prev: number; next: number; data: number[] }
interface Task extends Omit<TaskSeed, 'data'> { active: boolean; data: Int16Array }
export interface SpriteState { slot: number; x: number; y: number; x2: number; y2: number; attr: number[]; matrixNum: number; matrix: number[]; reservedMatrixNum: number; reservedMatrix: number[]; pictureYOffset: number }
export interface AffineProgram { address: number; commands: Array<{ type: number; x: number; y: number; rotation: number; duration: number }> }
export interface Context { attacker: number; target: number; sprites: SpriteState[]; tasks: TaskSeed[] }
const HEAD = 254, TAIL = 255;

/** Port of fixed slots + priority-linked list. Destroy retains next for RunTasks. */
export class TaskPool {
  readonly slots: Task[] = Array.from({ length: 16 }, (_, slot) => ({
    slot, callback: 'TaskDummy', priority: 255, prev: slot === 0 ? HEAD : slot,
    next: slot === 15 ? TAIL : slot + 1, active: false, data: new Int16Array(16),
  }));
  constructor(seed: TaskSeed[] = []) {
    for (const task of seed) this.slots[task.slot] = { ...task, active: true, data: Int16Array.from(task.data) };
  }
  create(callback: string, priority: number): Task {
    const task = this.slots.find((item) => !item.active);
    // C returns slot 0 on exhaustion; reject instead of pretending the spike supports that failure path.
    if (!task) throw new Error('unsupported: task pool exhausted');
    task.callback = callback; task.priority = priority; task.data.fill(0);
    let current = this.slots.find((item) => item.active && item.prev === HEAD);
    if (!current) { task.prev = HEAD; task.next = TAIL; }
    else while (true) {
      if (priority < current.priority) {
        task.prev = current.prev; task.next = current.slot;
        if (current.prev !== HEAD) this.slots[current.prev].next = task.slot;
        current.prev = task.slot; break;
      }
      if (current.next === TAIL) {
        task.prev = current.slot; task.next = TAIL; current.next = task.slot; break;
      }
      current = this.slots[current.next];
    }
    task.active = true;
    return task;
  }
  destroy(task: Task): void {
    if (!task.active) return;
    task.active = false;
    if (task.prev !== HEAD) this.slots[task.prev].next = task.next;
    if (task.next !== TAIL) this.slots[task.next].prev = task.prev;
  }
  run(step: (task: Task) => void): void {
    let task = this.slots.find((item) => item.active && item.prev === HEAD);
    let budget = 256;
    while (task) {
      if (!budget--) throw new Error('task traversal did not terminate');
      step(task);
      task = task.next === TAIL ? undefined : this.slots[task.next];
    }
  }
  active(): TaskSeed[] {
    return this.slots.filter((task) => task.active).map(({ active: _, ...task }) => ({ ...task, data: [...task.data] }));
  }
}

export class AnimationRuntime {
  readonly tasks: TaskPool;
  readonly sprites: SpriteState[];
  readonly args = new Int16Array(8);
  readonly audioEvents: Array<{ song: number; pan: number }> = [];
  readonly callbacksCreated: string[] = [];
  pc: number;
  active = true;
  wait = 0;
  visual = 0;
  sound = 0;
  private countdown = false;
  private returnAddress = 0; // Source has one return address, not a general call stack.
  private soundWait = 0;
  private ambientSlots: Set<number>;
  private matrices = new Map<number, number[]>();
  software: SpriteState[];
  hardware: SpriteState[];
  readonly program: Program;
  readonly context: Context;
  readonly sine: readonly number[];
  readonly affinePrograms: Record<string, AffineProgram>;
  constructor(program: Program, context: Context, sine: readonly number[], affinePrograms: Record<string, AffineProgram> = {}) {
    this.program = program; this.context = context; this.sine = sine; this.affinePrograms = affinePrograms;
    this.pc = program.entry;
    for (const task of context.tasks) {
      if (task.callback !== 'TaskDummy') throw new Error(`unsupported initial task ${task.callback}`);
    }
    this.tasks = new TaskPool(context.tasks);
    this.ambientSlots = new Set(context.tasks.map((task) => task.slot));
    this.sprites = structuredClone(context.sprites);
    for (const sprite of this.sprites) {
      this.matrices.set(sprite.matrixNum, [...sprite.matrix]);
      this.matrices.set(sprite.reservedMatrixNum, [...sprite.reservedMatrix]);
    }
    this.software = structuredClone(this.sprites);
    this.hardware = structuredClone(this.sprites);
  }
  private sprite(which: number): SpriteState {
    if (which !== 0 && which !== 1) throw new Error(`unsupported anim battler ${which}`);
    return this.sprites[which === 0 ? this.context.attacker : this.context.target];
  }
  private bySlot(slot: number): SpriteState {
    const sprite = this.sprites.find((entry) => entry.slot === slot);
    if (!sprite) throw new Error(`unsupported sprite slot ${slot}`);
    return sprite;
  }
  private sin(angle: number, amplitude: number): number {
    return (this.sine[angle & 255] * amplitude) >> 8;
  }
  private destroyVisual(task: Task): void { this.tasks.destroy(task); this.visual = (this.visual - 1) & 255; }
  private pan(value: number): number { return this.context.attacker === 0 ? value : value === -64 ? 63 : value === 63 ? -64 : -value; }
  private initialize(task: Task): void {
    const a = this.args, d = task.data;
    this.callbacksCreated.push(task.callback);
    if (task.callback === 'AnimTask_TranslateMonEllipticalRespectSide') {
      if (this.context.attacker !== 0) a[1] = -a[1];
      task.callback = 'AnimTask_TranslateMonElliptical';
    }
    switch (task.callback) {
      case 'AnimTask_TranslateMonElliptical':
        a[4] = Math.min(a[4], 5);
        d[0] = this.sprite(a[0]).slot; d[1] = a[1]; d[2] = a[2]; d[3] = a[3]; d[4] = 1 << a[4];
        task.callback = 'AnimTask_TranslateMonElliptical_Step';
        this.stepTask(task); // Source calls the step synchronously, before the frame's RunTasks.
        break;
      case 'AnimTask_SwayMon':
        if (this.context.attacker !== 0) a[1] = -a[1];
        d.set(a.slice(0, 4)); d[4] = this.sprite(a[4]).slot;
        d[5] = a[4] === 0 ? this.context.attacker : this.context.target;
        d[12] = 1; task.callback = 'AnimTask_SwayMonStep';
        break;
      case 'AnimTask_ScaleMonAndRestore': {
        const sprite = this.sprite(a[3]);
        this.prepareScale(sprite, a[4]);
        d[0] = a[0]; d[1] = a[1]; d[2] = a[2]; d[3] = a[2]; d[4] = sprite.slot;
        d[10] = 256; d[11] = 256; task.callback = 'AnimTask_ScaleMonAndRestore_Step';
        break;
      }
      case 'AnimTask_Splash':
        if (a[1] === 0) { this.destroyVisual(task); break; }
        d[0] = this.sprite(a[0]).slot; d[1] = 0; d[2] = a[1]; d[3] = 0; d[4] = 0;
        this.prepareAffine(task, 'gSplashEffectAffineAnimCmds');
        task.callback = 'AnimTask_Splash_Step';
        break;
      default: throw new Error(`unsupported native callback ${task.callback}`);
    }
  }
  private setMatrix(sprite: SpriteState, values: number[]): void {
    this.matrices.set(sprite.matrixNum, values);
    sprite.matrix = [...values];
  }
  private prepareScale(sprite: SpriteState, mode: number): void {
    if ((sprite.attr[0] >> 8 & 3) === 0) {
      sprite.matrixNum = sprite.reservedMatrixNum;
      sprite.matrix = [...this.matrices.get(sprite.reservedMatrixNum)!];
      sprite.attr[1] = (sprite.attr[1] & ~0x3e00) | (sprite.matrixNum << 9);
    }
    sprite.attr[0] = (sprite.attr[0] & ~0xf00) | 0x300 | (mode << 10);
  }
  private prepareAffine(task: Task, name: string): void {
    const resource = this.affinePrograms[name];
    if (!resource) throw new Error(`missing affine resource ${name}`);
    const d = task.data;
    d[7] = 0; d[8] = 0; d[9] = 0; d[15] = d[0];
    d[10] = 256; d[11] = 256; d[12] = 0;
    d[13] = resource.address & 65535; d[14] = resource.address >>> 16;
    this.prepareScale(this.bySlot(d[15]), 0);
  }
  private runAffine(task: Task): boolean {
    const d = task.data, address = ((d[14] & 65535) * 65536) + (d[13] & 65535);
    const resource = Object.values(this.affinePrograms).find((item) => item.address === address);
    if (!resource) throw new Error('missing affine program');
    let command = resource.commands[d[7]];
    const sprite = this.bySlot(d[15]);
    if (command.type === 0x7fff) {
      sprite.y2 = 0; this.setMatrix(sprite, [256, 0, 0, 256]);
      sprite.attr[0] = (sprite.attr[0] & ~0xf00) | 0x100;
      return false;
    }
    if (command.type === 0x7ffe || command.type === 0x7ffd) throw new Error('unsupported affine jump/loop');
    if (!command.duration) {
      d[10] = command.x; d[11] = command.y; d[12] = command.rotation;
      command = resource.commands[++d[7]];
    }
    d[10] += command.x; d[11] += command.y; d[12] += command.rotation;
    if (d[12] !== 0) throw new Error('unsupported nonzero affine rotation');
    this.setMatrix(sprite, [d[10], 0, 0, d[11]]);
    const height = 64 - sprite.pictureYOffset * 2;
    const scaledHeight = d[11] === 0 ? 0 : Math.trunc((height << 8) / d[11]);
    sprite.y2 = Math.trunc((height - Math.min(scaledHeight, 128)) / 2);
    if (++d[8] >= command.duration) { d[8] = 0; d[7]++; }
    return true;
  }
  private stepTask(task: Task): void {
    const d = task.data;
    switch (task.callback) {
      case 'AnimTask_TranslateMonElliptical_Step': {
        const sprite = this.bySlot(d[0]);
        sprite.x2 = this.sin(d[5], d[1]); sprite.y2 = -this.sin(d[5] + 64, d[2]) + d[2];
        d[5] = (d[5] + d[4]) & 255;
        if (d[5] === 0) d[3]--;
        if (d[3] === 0) { sprite.x2 = 0; sprite.y2 = 0; this.destroyVisual(task); }
        break;
      }
      case 'AnimTask_SwayMonStep': {
        const sprite = this.bySlot(d[4]);
        const index = (d[10] + d[2]) & 65535; d[10] = index;
        const wave = index >> 8, value = this.sin(wave, d[1]);
        if (d[0] === 0) sprite.x2 = value;
        else sprite.y2 = d[5] === 0 ? Math.abs(value) : -Math.abs(value);
        if ((wave >= 128 && d[11] === 0 && d[12] === 1) || (wave < 127 && d[11] === 1 && d[12] === 0)) {
          d[11] ^= 1; d[12] ^= 1;
          if (--d[3] === 0) { sprite.x2 = 0; sprite.y2 = 0; this.destroyVisual(task); }
        }
        break;
      }
      case 'AnimTask_ScaleMonAndRestore_Step': {
        const sprite = this.bySlot(d[4]);
        d[10] += d[0]; d[11] += d[1];
        // ObjAffineSet at rotation 0: Q8.8 scales become diagonal matrix values.
        this.setMatrix(sprite, [d[10], 0, 0, d[11]]);
        if (--d[2] === 0) {
          if (d[3] > 0) { d[0] = -d[0]; d[1] = -d[1]; d[2] = d[3]; d[3] = 0; }
          else {
            this.setMatrix(sprite, [256, 0, 0, 256]); sprite.attr[0] = (sprite.attr[0] & ~0xf00) | 0x100;
            this.destroyVisual(task);
          }
        }
        break;
      }
      case 'AnimTask_Splash_Step': {
        const sprite = this.bySlot(d[0]);
        switch (d[1]) {
          case 0:
            this.runAffine(task); d[4] += 3; sprite.y2 += d[4];
            if (++d[3] > 7) { d[3] = 0; d[1]++; }
            break;
          case 1:
            this.runAffine(task); sprite.y2 += d[4];
            if (++d[3] > 7) { d[3] = 0; d[1]++; }
            break;
          case 2:
            if (d[4] !== 0) { sprite.y2 -= 2; d[4] -= 2; } else d[1]++;
            break;
          case 3:
            if (!this.runAffine(task)) {
              if (--d[2] === 0) { sprite.y2 = 0; this.destroyVisual(task); }
              else { this.prepareAffine(task, 'gSplashEffectAffineAnimCmds'); d[1] = 0; }
            }
            break;
        }
        break;
      }
      case 'Task_LoopAndPlaySE': {
        const before = d[8]; d[8]++;
        if (before >= d[2]) {
          d[8] = 0; const remaining = (--d[3]) & 255;
          this.audioEvents.push({ song: d[0] & 65535, pan: d[1] });
          if (remaining === 0) { this.tasks.destroy(task); this.sound = (this.sound - 1) & 255; }
        }
        break;
      }
      default:
        // Only explicitly inert initial TaskDummy slots are pass-through context.
        if (!this.ambientSlots.has(task.slot)) throw new Error(`unsupported task ${task.callback}`);
    }
  }
  private script(sePlaying: boolean): void {
    if (!this.active) return;
    if (this.countdown) {
      if (this.wait <= 0) { this.countdown = false; this.wait = 0; }
      else this.wait--;
      return;
    }
    let budget = 1000;
    do {
      if (!budget--) throw new Error('script did not yield');
      const command = this.program.commands[this.pc];
      if (!command) throw new Error(`unmapped script address ${this.pc}`);
      switch (command.op) {
        case 'createvisualtask': {
          this.args.set(command.args!);
          const task = this.tasks.create(command.callback!, command.priority!);
          this.ambientSlots.delete(task.slot);
          this.initialize(task); this.visual = (this.visual + 1) & 255;
          this.pc = command.next; break;
        }
        case 'loopsewithpan': {
          const task = this.tasks.create('Task_LoopAndPlaySE', 1); this.ambientSlots.delete(task.slot);
          task.data[0] = command.song!; task.data[1] = this.pan(command.pan!);
          task.data[2] = command.interval!; task.data[3] = command.plays!; task.data[8] = command.interval!;
          this.stepTask(task); this.sound = (this.sound + 1) & 255;
          this.pc = command.next; break;
        }
        case 'playsewithpan':
          this.audioEvents.push({ song: command.song!, pan: this.pan(command.pan!) }); this.pc = command.next; break;
        case 'call': this.returnAddress = command.next; this.pc = command.target!; break;
        case 'return': this.pc = this.returnAddress; break;
        case 'goto': this.pc = command.target!; break;
        case 'delay': this.wait = command.frames === 0 ? -1 : ((command.frames! + 128) & 255) - 128; this.countdown = true; this.pc = command.next; break;
        case 'waitforvisualfinish':
          if (this.visual === 0) { this.pc = command.next; this.wait = 0; } else this.wait = 1;
          break;
        case 'end':
          if (this.visual || this.sound) { this.soundWait = 0; this.wait = 1; break; }
          if (sePlaying && ++this.soundWait <= 90) { this.wait = 1; break; }
          this.soundWait = 0; this.active = false;
          break;
        default: throw new Error(`unsupported command ${command.op}`);
      }
    } while (this.wait === 0 && this.active);
  }
  /** One CB1/CB2 update. Hardware is the prior built buffer at this oracle's frame boundary. */
  tick(sePlaying: boolean): void {
    this.audioEvents.length = 0;
    this.hardware = structuredClone(this.software);
    const wasActive = this.active;
    this.script(sePlaying);
    // Host/controller completion hook, battle_controller_player.c:2522.
    if (wasActive && !this.active) for (const sprite of this.sprites) {
      sprite.attr[0] = (sprite.attr[0] & ~0x300) | 0x100;
      sprite.matrixNum = sprite.reservedMatrixNum;
      sprite.attr[1] = (sprite.attr[1] & ~0x3e00) | (sprite.matrixNum << 9);
      sprite.matrix = [...this.matrices.get(sprite.matrixNum)!];
    }
    // No moving sprite callbacks in this family. UpdateOamCoords before RunTasks.
    for (const sprite of this.sprites) {
      const shape = sprite.attr[0] >> 14, size = sprite.attr[1] >> 14;
      const dimensions = [
        [[8,8],[16,16],[32,32],[64,64]],
        [[16,8],[32,8],[32,16],[64,32]],
        [[8,16],[8,32],[16,32],[32,64]],
      ][shape]?.[size];
      if (!dimensions) throw new Error('unsupported OBJ shape');
      const factor = (sprite.attr[0] >> 8 & 3) === 3 ? 1 : 0.5;
      const x = sprite.x + sprite.x2 - dimensions[0] * factor;
      const y = sprite.y + sprite.y2 - dimensions[1] * factor;
      sprite.attr[0] = (sprite.attr[0] & ~255) | (y & 255);
      sprite.attr[1] = (sprite.attr[1] & ~511) | (x & 511);
    }
    this.software = structuredClone(this.sprites);
    this.tasks.run((task) => this.stepTask(task));
  }
  snapshot() {
    return { pc: this.pc, active: this.active, wait: this.wait, args: [...this.args], visual: this.visual,
      sound: this.sound, sprites: structuredClone(this.sprites), tasks: this.tasks.active(),
      software: structuredClone(this.software), hardware: structuredClone(this.hardware) };
  }
}
