/**
 * Source-shaped, presentation-only battle-animation executor.
 *
 * Programs and callback/resource registries are supplied by the host. This module
 * never reads a ROM, capture, emulator, or tooling fixture. Unsupported commands,
 * callbacks, templates, and resource exhaustion fail explicitly.
 *
 * Source: battle_anim.c, task.c, sprite.c, battle_anim_ground.c,
 * battle_anim_mon_movement.c, and battle_main.c.
 */
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  type SpriteOrderState,
} from "./spriteOrder.ts";
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
  tag?: number;
  template?: string;
  subpriority?: number;
}
export interface Program { entry: number; commands: Record<number, Command> }
export interface TaskSeed { slot: number; callback: string; priority: number; prev: number; next: number; data: number[] }
interface Task extends Omit<TaskSeed, 'data'> { active: boolean; data: Int16Array }
export interface SpriteState { slot: number; x: number; y: number; x2: number; y2: number; attr: number[]; matrixNum: number; matrix: number[]; reservedMatrixNum: number; reservedMatrix: number[]; pictureYOffset: number }
export interface AffineProgram { address: number; commands: Array<{ type: number; x: number; y: number; rotation: number; duration: number }> }
export interface NativeSpriteSeed {
  slot: number;
  inUse: boolean;
  template: string;
  callback: string;
  attr: [number, number, number];
  x: number;
  y: number;
  x2: number;
  y2: number;
  centerToCornerX: number;
  centerToCornerY: number;
  animNum: number;
  animCmdIndex: number;
  animDelayCounter: number;
  animPaused: boolean;
  affineAnimPaused: boolean;
  animLoopCounter: number;
  data: number[];
  coordOffsetEnabled: boolean;
  flags3To7: number;
  invisible: boolean;
  hFlip: boolean;
  vFlip: boolean;
  animBeginning: boolean;
  affineAnimBeginning: boolean;
  animEnded: boolean;
  affineAnimEnded: boolean;
  usingSheet: boolean;
  anchored: boolean;
  sheetTileStart: number;
  subspriteMode: number;
  subpriority: number;
}
export interface NativeResourceState {
  reservedTileCount: number;
  tileAllocBitmap: number[];
  tileRangeTags: number[];
  tileRanges: Array<[number, number]>;
  reservedPaletteCount: number;
  paletteTags: number[];
  loadedSpriteIndices: number[];
}
export interface NativeResourceSpec {
  trueIndex: number;
  tag: number;
  tileCount: number;
}
export interface NativeSpriteTemplateSpec {
  callback: string;
  tileTag: number;
  paletteTag: number;
  priority: 0 | 1 | 2 | 3;
  shape: 0 | 1 | 2;
  size: 0 | 1 | 2 | 3;
}
export interface NativeAnimationRegistry {
  resources?: Record<number, NativeResourceSpec>;
  templates?: Record<string, NativeSpriteTemplateSpec>;
}
export interface Context {
  attacker: number;
  target: number;
  sprites: SpriteState[];
  tasks: TaskSeed[];
  /** Active non-runtime sprites reserve their fixed source slots. */
  occupiedSpriteSlots?: number[];
  /** Persistent source order filtered to the slots available to this runtime. */
  spriteOrderSeed?: number[];
  battlerSubpriorities?: number[];
  /** Source GetBattlerSpriteCoord(X_2/Y_PIC_OFFSET), supplied by the scene host. */
  battlerCoords?: Array<{ x: number; y: number }>;
  resources?: NativeResourceState;
}
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
  readonly commandAddressesExecuted: number[] = [];
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
  private readonly registry: NativeAnimationRegistry;
  private readonly nativeSlots: Array<NativeSpriteSeed | null>;
  private readonly ownedSpriteSlots = new Set<number>();
  private nativeSoftware: NativeSpriteSeed[] = [];
  private nativeHardware: NativeSpriteSeed[] = [];
  private spriteOrder: SpriteOrderState;
  readonly resources: NativeResourceState;
  software: SpriteState[];
  hardware: SpriteState[];
  readonly program: Program;
  readonly context: Context;
  readonly sine: readonly number[];
  readonly affinePrograms: Record<string, AffineProgram>;
  constructor(
    program: Program,
    context: Context,
    sine: readonly number[],
    affinePrograms: Record<string, AffineProgram> = {},
    registry: NativeAnimationRegistry = {},
  ) {
    this.program = program; this.context = context; this.sine = sine; this.affinePrograms = affinePrograms;
    this.pc = program.entry;
    this.registry = registry;
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
    const occupied = new Set(context.occupiedSpriteSlots ?? context.sprites.map((sprite) => sprite.slot));
    this.nativeSlots = Array.from({ length: 64 }, (_, slot) => occupied.has(slot)
      ? ({ slot, inUse: true } as NativeSpriteSeed)
      : null);
    const available = Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => !occupied.has(slot));
    const orderSeed = context.spriteOrderSeed?.filter((slot) => available.includes(slot)) ?? available;
    this.spriteOrder = createSpriteOrderState(available, orderSeed);
    this.resources = structuredClone(context.resources ?? {
      reservedTileCount: 0,
      tileAllocBitmap: Array(128).fill(0),
      tileRangeTags: Array(64).fill(0xffff),
      tileRanges: Array.from({ length: 64 }, () => [0, 0] as [number, number]),
      reservedPaletteCount: 0,
      paletteTags: Array(16).fill(0xffff),
      loadedSpriteIndices: Array(8).fill(0xffff),
    });
  }

  private s16(value: number): number { return value << 16 >> 16; }
  private u8(value: number): number { return value & 0xff; }
  private tileAllocated(tile: number): boolean {
    return Boolean((this.resources.tileAllocBitmap[tile >>> 3]! >>> (tile & 7)) & 1);
  }
  private markTile(tile: number, allocated: boolean): void {
    const index = tile >>> 3;
    const bit = 1 << (tile & 7);
    this.resources.tileAllocBitmap[index] = allocated
      ? this.resources.tileAllocBitmap[index]! | bit
      : this.resources.tileAllocBitmap[index]! & ~bit;
  }
  private indexOfTileTag(tag: number): number {
    return this.resources.tileRangeTags.indexOf(tag);
  }
  private indexOfPaletteTag(tag: number): number {
    for (let index = this.resources.reservedPaletteCount; index < 16; index++) {
      if (this.resources.paletteTags[index] === tag) return index;
    }
    return -1;
  }
  private loadSpriteGfx(tag: number): void {
    const spec = this.registry.resources?.[tag];
    if (!spec) throw new Error(`unsupported sprite resource tag ${tag}`);
    if (this.indexOfTileTag(spec.tag) < 0) {
      let start = -1;
      for (let candidate = this.resources.reservedTileCount; candidate + spec.tileCount <= 1024; candidate++) {
        if (Array.from({ length: spec.tileCount }, (_, offset) => candidate + offset)
          .every((tile) => !this.tileAllocated(tile))) { start = candidate; break; }
      }
      if (start < 0) throw new Error(`unsupported: sprite tile allocation exhausted for tag ${tag}`);
      for (let tile = start; tile < start + spec.tileCount; tile++) this.markTile(tile, true);
      const range = this.resources.tileRangeTags.indexOf(0xffff);
      if (range < 0) throw new Error("unsupported: sprite tile range table exhausted");
      this.resources.tileRangeTags[range] = spec.tag;
      this.resources.tileRanges[range] = [start, spec.tileCount];
    }
    if (this.indexOfPaletteTag(spec.tag) < 0) {
      const palette = this.indexOfPaletteTag(0xffff);
      if (palette < 0) throw new Error(`unsupported: sprite palette allocation exhausted for tag ${tag}`);
      this.resources.paletteTags[palette] = spec.tag;
    }
    const indexSlot = this.resources.loadedSpriteIndices.indexOf(0xffff);
    if (indexSlot < 0) throw new Error("unsupported: animation sprite-index table exhausted");
    this.resources.loadedSpriteIndices[indexSlot] = spec.trueIndex;
  }
  private freeLoadedResources(): void {
    for (let index = 0; index < this.resources.loadedSpriteIndices.length; index++) {
      const trueIndex = this.resources.loadedSpriteIndices[index]!;
      if (trueIndex === 0xffff) continue;
      const spec = Object.values(this.registry.resources ?? {}).find((item) => item.trueIndex === trueIndex);
      if (!spec) throw new Error(`missing loaded resource index ${trueIndex}`);
      const range = this.indexOfTileTag(spec.tag);
      if (range >= 0) {
        const [start, count] = this.resources.tileRanges[range]!;
        for (let tile = start; tile < start + count; tile++) this.markTile(tile, false);
        this.resources.tileRangeTags[range] = 0xffff;
      }
      const palette = this.indexOfPaletteTag(spec.tag);
      if (palette >= 0) this.resources.paletteTags[palette] = 0xffff;
      this.resources.loadedSpriteIndices[index] = 0xffff;
    }
  }

  private createNativeSprite(templateName: string, encodedSubpriority: number, args: readonly number[]): void {
    const template = this.registry.templates?.[templateName];
    if (!template) throw new Error(`unsupported sprite template ${templateName}`);
    const slot = this.nativeSlots.findIndex((sprite) => sprite === null);
    if (slot < 0) throw new Error("unsupported: sprite pool exhausted");
    const tileRange = this.indexOfTileTag(template.tileTag);
    if (tileRange < 0) throw new Error(`sprite tile tag ${template.tileTag} is not loaded`);
    const paletteNum = this.indexOfPaletteTag(template.paletteTag);
    if (paletteNum < 0) throw new Error(`sprite palette tag ${template.paletteTag} is not loaded`);
    let relative = encodedSubpriority & 0x7f;
    relative = relative >= 64 ? relative - 64 : -relative;
    const anchorBattler = encodedSubpriority & 0x80 ? this.context.target : this.context.attacker;
    const anchorSubpriority = this.context.battlerSubpriorities?.[anchorBattler];
    if (anchorSubpriority === undefined) throw new Error("missing battler subpriority for createsprite");
    const subpriority = Math.max(3, anchorSubpriority + relative);
    const target = this.sprites[this.context.target];
    if (!target) throw new Error("missing animation target sprite");
    const sheetTileStart = this.resources.tileRanges[tileRange]![0];
    const sprite: NativeSpriteSeed = {
      slot, inUse: true, template: templateName, callback: template.callback,
      attr: [0, template.size << 14, sheetTileStart | template.priority << 10 | paletteNum << 12],
      x: target.x, y: target.y, x2: 0, y2: 0, centerToCornerX: -8, centerToCornerY: -8,
      animNum: 0, animCmdIndex: 0, animDelayCounter: 0, animPaused: false,
      affineAnimPaused: false, animLoopCounter: 0, data: Array(8).fill(0),
      coordOffsetEnabled: false, flags3To7: 0, invisible: false, hFlip: false, vFlip: false,
      animBeginning: true, affineAnimBeginning: true,
      animEnded: false, affineAnimEnded: false, usingSheet: true,
      anchored: false,
      sheetTileStart, subspriteMode: 0, subpriority,
    };
    this.nativeSlots[slot] = sprite;
    this.ownedSpriteSlots.add(slot);
    this.spriteOrder = createOrderedSprite(this.spriteOrder, slot, {
      priority: template.priority, subpriority, oamY: 0,
    });
    this.args.fill(0); this.args.set(args);
    this.initializeNativeSprite(sprite);
    // gDummySpriteAnimTable is ANIMCMD_END: preserve the initializer's tile++.
    this.visual = this.u8(this.visual + 1);
  }
  private initializeNativeSprite(sprite: NativeSpriteSeed): void {
    switch (sprite.callback) {
      case "AnimMudSportDirt":
        sprite.attr[2] = (sprite.attr[2] + 1) & 0xffff;
        if (this.args[0] === 0) {
          const attacker = this.context.battlerCoords?.[this.context.attacker];
          if (!attacker) throw new Error("missing attacker source coordinates for createsprite");
          sprite.x = this.s16(attacker.x + this.args[1]!);
          sprite.y = this.s16(attacker.y + this.args[2]!);
          sprite.data[0] = this.args[1]! > 0 ? 1 : -1;
          sprite.callback = "AnimMudSportDirtRising";
        } else {
          sprite.x = this.args[1]!;
          sprite.y = this.args[2]!;
          sprite.y2 = -this.args[2]!;
          sprite.callback = "AnimMudSportDirtFalling";
        }
        break;
      default: throw new Error(`unsupported native sprite callback ${sprite.callback}`);
    }
  }
  private destroyNativeSprite(sprite: NativeSpriteSeed): void {
    if (!sprite.inUse) return;
    sprite.inUse = false;
    this.nativeSlots[sprite.slot] = null;
    this.spriteOrder = destroyOrderedSprite(this.spriteOrder, sprite.slot);
    this.visual = this.u8(this.visual - 1);
  }
  private stepNativeSprite(sprite: NativeSpriteSeed): void {
    switch (sprite.callback) {
      case "AnimMudSportDirtRising":
        sprite.data[1] = this.s16(sprite.data[1]! + 1);
        if (sprite.data[1]! > 1) {
          sprite.data[1] = 0;
          sprite.x = this.s16(sprite.x + sprite.data[0]!);
        }
        sprite.y = this.s16(sprite.y - 4);
        if (sprite.y < -4) this.destroyNativeSprite(sprite);
        break;
      case "AnimMudSportDirtFalling":
        if (sprite.data[0] === 0) {
          sprite.y2 = this.s16(sprite.y2 + 4);
          if (sprite.y2 >= 0) { sprite.y2 = 0; sprite.data[0] = 1; }
        } else if (sprite.data[0] === 1) {
          sprite.data[1] = this.s16(sprite.data[1]! + 1);
          if (sprite.data[1]! > 0) {
            sprite.data[1] = 0;
            sprite.invisible = !sprite.invisible;
            sprite.data[2] = this.s16(sprite.data[2]! + 1);
            if (sprite.data[2] === 10) this.destroyNativeSprite(sprite);
          }
        }
        break;
      default: throw new Error(`unsupported native sprite step ${sprite.callback}`);
    }
  }
  private updateNativeOam(): void {
    for (const sprite of this.nativeSlots) {
      if (!sprite?.inUse || !this.ownedSpriteSlots.has(sprite.slot)) continue;
      sprite.attr[0] = (sprite.attr[0] & ~0x3ff)
        | ((sprite.y + sprite.y2 + sprite.centerToCornerY) & 0xff);
      sprite.attr[1] = (sprite.attr[1] & ~0x1ff)
        | ((sprite.x + sprite.x2 + sprite.centerToCornerX) & 0x1ff);
      this.spriteOrder = {
        ...this.spriteOrder,
        occupants: this.spriteOrder.occupants.map((occupant) => occupant.owner === sprite.slot
          ? { ...occupant, oamY: sprite.attr[0] & 0xff }
          : occupant),
      };
    }
    this.spriteOrder = sortSpriteOrder(this.spriteOrder);
    const bySlot = new Map(this.nativeSlots.flatMap((sprite) => sprite?.inUse ? [[sprite.slot, sprite] as const] : []));
    this.nativeSoftware = spriteOwnersBackToFront(this.spriteOrder)
      .slice().reverse().map((slot) => bySlot.get(slot)!)
      .filter((sprite) => !sprite.invisible)
      .map((sprite) => structuredClone(sprite));
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
      case 'Task_WaitAndPlaySE': {
        const before = d[2]!;
        d[2] = this.s16(before - 1);
        if (before <= 0) {
          this.audioEvents.push({ song: d[0]! & 0xffff, pan: d[1]! });
          this.tasks.destroy(task);
          this.sound = this.u8(this.sound - 1);
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
      this.commandAddressesExecuted.push(this.pc);
      switch (command.op) {
        case 'loadspritegfx':
          this.loadSpriteGfx(command.tag!);
          this.wait = 1; this.countdown = true; this.pc = command.next;
          break;
        case 'createsprite':
          this.createNativeSprite(command.template!, command.subpriority!, command.args ?? []);
          this.pc = command.next;
          break;
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
        case 'waitplaysewithpan': {
          const task = this.tasks.create('Task_WaitAndPlaySE', 1); this.ambientSlots.delete(task.slot);
          task.data[0] = command.song!; task.data[1] = this.pan(command.pan!);
          task.data[2] = command.frames!;
          this.sound = this.u8(this.sound + 1); this.pc = command.next; break;
        }
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
          this.freeLoadedResources();
          break;
        default: throw new Error(`unsupported command ${command.op}`);
      }
    } while (this.wait === 0 && this.active);
  }
  /** One CB1/CB2 update. Hardware is the prior built buffer at this oracle's frame boundary. */
  tick(sePlaying: boolean): void {
    this.audioEvents.length = 0;
    this.hardware = structuredClone(this.software);
    this.nativeHardware = structuredClone(this.nativeSoftware);
    const wasActive = this.active;
    this.script(sePlaying);
    // Host/controller completion hook, battle_controller_player.c:2522.
    if (wasActive && !this.active) for (const sprite of this.sprites) {
      sprite.attr[0] = (sprite.attr[0] & ~0x300) | 0x100;
      sprite.matrixNum = sprite.reservedMatrixNum;
      sprite.attr[1] = (sprite.attr[1] & ~0x3e00) | (sprite.matrixNum << 9);
      sprite.matrix = [...this.matrices.get(sprite.matrixNum)!];
    }
    // AnimateSprites runs fixed slots in ascending order before OAM build.
    for (let slot = 0; slot < this.nativeSlots.length; slot++) {
      const sprite = this.nativeSlots[slot];
      if (sprite?.inUse && this.ownedSpriteSlots.has(slot)) this.stepNativeSprite(sprite);
    }
    // UpdateOamCoords before RunTasks.
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
    this.updateNativeOam();
    this.tasks.run((task) => this.stepTask(task));
  }
  snapshot() {
    return { pc: this.pc, active: this.active, wait: this.wait, args: [...this.args], visual: this.visual,
      sound: this.sound, sprites: structuredClone(this.sprites), tasks: this.tasks.active(),
      software: structuredClone(this.software), hardware: structuredClone(this.hardware),
      nativeSprites: this.nativeSlots.flatMap((sprite) => sprite?.inUse && this.ownedSpriteSlots.has(sprite.slot)
        ? [structuredClone(sprite)] : []),
      nativeSoftware: structuredClone(this.nativeSoftware),
      nativeHardware: structuredClone(this.nativeHardware),
      spriteOrder: structuredClone(this.spriteOrder),
      resources: structuredClone(this.resources),
      audioEvents: structuredClone(this.audioEvents),
      commandAddressesExecuted: [...this.commandAddressesExecuted],
    };
  }
}
