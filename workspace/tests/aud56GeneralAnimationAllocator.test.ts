import { censusDeal } from '../tools/integration/censusRound.ts';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {GbaButton} from '../src/input.ts';
import {
 createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
 advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
 advanceFactoryRoundBattleResolution,
} from '../src/engine/factoryRoundBattleOrchestrator.ts';
import {
 LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS, liveSpriteAllocatorAnimationNetZero, liveSpriteAllocatorAnimationUnit,
} from '../src/engine/liveMoveSpriteAllocator.ts';

// aud56 (ISSUES #156): general / hit / stat animation events keep the sprite ALLOCATOR host known only when their unit is audited
// net-zero (tools/integration/fixtures/aud56-net-zero-audit.json); every other kernel animation id invalidates it (fail closed).
interface AuditUnit {
 unit: string; verdict: string; reason?: string; completeInstances?: number; jobs?: string[]; sourceBattlerRule?: string;
 fromKnownEntry?: {player: number; opponent: number}; instances?: {netZero?: boolean; incomplete?: string; side: string}[];
}
const receipt = JSON.parse(readFileSync(new URL('../tools/integration/fixtures/aud56-net-zero-audit.json', import.meta.url), 'utf8')) as {
 allIdenticalAB: boolean; knownEntry: number[]; units: AuditUnit[]; scenarios: {job: string; seed: number; identicalAB: boolean}[];
};
// land68: SUBSTITUTE_FADE is NET-ZERO by prep64's audit (General_SubstituteFade, both sides, Scene ON and OFF; aud56's rule).
const prep64 = JSON.parse(readFileSync(new URL('../tools/integration/fixtures/prep64/netzero.json', import.meta.url), 'utf8')) as {
 allIdenticalAB: boolean; knownEntry: number[];
 verdicts: Record<string, {unit: string; verdict: string; createdPerInstance: number[]; lateOwners: unknown[]; fromKnownEntry: {player: number; opponent: number}}>;
};
// Kernel animation ids audited UNREACHABLE / unstaged: they must invalidate.
const UNAUDITED_IDS = ['SNATCH_MOVE', 'DOOM_DESIRE_HIT', 'SCENE_OFF_ATTACK_PAUSE'];

/** Every `animationId: "X"` literal the kernel can emit (src/engine), plus the playanimation table's ids. */
function emittedAnimationIds(): string[] {
 const ids = new Set<string>();
 const dir = new URL('../src/engine/', import.meta.url);
 for (const file of readdirSync(dir)) {
  if (!file.endsWith('.ts') || file === 'liveSpriteOrderHost.ts' || file === 'liveMoveSpriteAllocator.ts') continue;
  const text = readFileSync(new URL(file, dir), 'utf8');
  for (const m of text.matchAll(/animationId: "([A-Z0-9_]+)"/g)) ids.add(m[1]!);
 }
 return [...ids].sort();
}

describe('aud56 general / hit / stat allocator net-zero set', () => {
 it('the set is exactly the receipt\'s NET-ZERO units (two fresh runs identical, both battlers or a source battler rule)', () => {
  expect(receipt.allIdenticalAB).toBe(true);
  expect(receipt.knownEntry).toEqual([0, 1, 2, 6, 8, 60, 61, 62, 63]);
  for (const s of receipt.scenarios) {
   expect(s.identicalAB, s.job).toBe(true);
   expect(Number.isInteger(s.seed), `${s.job} explicit lab seed`).toBe(true);
  }
  // land68: prep64's receipt adds SUBSTITUTE_FADE (NET-ZERO on both scene profiles, from the same known entry, nothing created).
  expect(prep64.allIdenticalAB).toBe(true);
  expect(prep64.knownEntry).toEqual(receipt.knownEntry);
  expect(Object.keys(prep64.verdicts).sort()).toEqual(['battle-scene-off', 'battle-scene-on']);
  for (const [profile, v] of Object.entries(prep64.verdicts)) {
   expect({profile, unit: v.unit, verdict: v.verdict, created: v.createdPerInstance, late: v.lateOwners})
    .toEqual({profile, unit: 'SUBSTITUTE_FADE', verdict: 'NET-ZERO', created: [0], late: []});
   expect(v.fromKnownEntry.player, profile).toBeGreaterThan(0);
   expect(v.fromKnownEntry.opponent, profile).toBeGreaterThan(0);
  }
  const netZero = [...receipt.units.filter(u => u.verdict === 'NET-ZERO').map(u => u.unit), 'SUBSTITUTE_FADE'].sort();
  expect([...LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS].sort()).toEqual(netZero);
  expect(netZero).toHaveLength(21);
  for (const u of receipt.units.filter(x => x.verdict === 'NET-ZERO')) {
   const complete = u.instances!.filter(i => i.incomplete === undefined);
   expect(complete.length, u.unit).toBeGreaterThan(0);
   expect(complete.every(i => i.netZero === true), u.unit).toBe(true);
   expect(u.fromKnownEntry!.player, u.unit).toBeGreaterThan(0);
   if (u.sourceBattlerRule === undefined) expect(u.fromKnownEntry!.opponent, u.unit).toBeGreaterThan(0);
  }
  // Pinned exposure order of the audit (docs/aud56-general-animation-allocator.md): the three largest are in.
  for (const unit of ['HIT_ANIMATION', 'STATS_CHANGE', 'HELD_ITEM_EFFECT']) expect(netZero).toContain(unit);
 });

 it('every kernel-emitted animation id is classified: audited ids pass, every other id invalidates (fail closed)', () => {
  const ids = emittedAnimationIds();
  expect(ids).toContain('HIT_ANIMATION');
  expect(ids).toContain('STATS_CHANGE');
  const unitsOf = (id: string): string[] => id === 'TURN_TRAP'
   ? ['TURN_TRAP_FIRE_SPIN', 'TURN_TRAP_WHIRLPOOL', 'TURN_TRAP_SAND_TOMB', 'TURN_TRAP_BIND']
   : id === 'WEATHER_VAR' ? ['SANDSTORM_CONTINUES', 'HAIL_CONTINUES'] : [id];
  const classified = new Set([...LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS, ...UNAUDITED_IDS, 'MOVE_ANIMATION']);
  for (const id of ids) {
   for (const unit of unitsOf(id)) expect(classified.has(unit), `${id} -> ${unit} must be audited or listed unaudited`).toBe(true);
  }
  for (const id of UNAUDITED_IDS) {
   expect(receipt.units.find(u => u.unit === id)?.verdict, id).toBe('UNAUDITED');
   for (const battler of [0, 1]) expect(liveSpriteAllocatorAnimationNetZero({animationId: id, battler, arguments: []}), id).toBe(false);
  }
  // Wrapped-move branches: Clamp (128) and any other move are the unaudited TURN_TRAP; WEATHER_VAR other than 12 / 13 too.
  expect(liveSpriteAllocatorAnimationUnit({animationId: 'TURN_TRAP', battler: 0, arguments: ['128']})).toBe('TURN_TRAP');
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'TURN_TRAP', battler: 0, arguments: ['128']})).toBe(false);
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'TURN_TRAP', battler: 1, arguments: ['35']})).toBe(true);
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'WEATHER_VAR', battler: 0, arguments: ['13']})).toBe(true);
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'WEATHER_VAR', battler: 0, arguments: ['5']})).toBe(false);
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'SOMETHING_NEW', battler: 0, arguments: []})).toBe(false);
  // land68: SUBSTITUTE_FADE (aud56: UNAUDITED; prep64: NET-ZERO) passes on both battlers.
  expect(receipt.units.find(u => u.unit === 'SUBSTITUTE_FADE')?.verdict).toBe('UNAUDITED');
  for (const battler of [0, 1]) expect(liveSpriteAllocatorAnimationNetZero({animationId: 'SUBSTITUTE_FADE', battler, arguments: []})).toBe(true);
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'MOVE_ANIMATION', battler: 0, arguments: []})).toBe(true);
  // Weather continuing is keyed on the unit alone (ROM battler is always 0, the receipt's sourceBattlerRule).
  expect(liveSpriteAllocatorAnimationNetZero({animationId: 'RAIN_CONTINUES', battler: 1, arguments: []})).toBe(true);
 });
});

let routed: ReturnType<typeof routeToMoveBodyUncached> | undefined;
function routeToMoveBodyUncached() {
 let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({id: 'aud56-general', battleScene: 'on', factoryWinStreak: 0, playerTrainerId: 416049562, battleTowerLevel50WinStreak: 0, facilityState: {rentsCount: 0}, ...censusDeal({ seed: 549, factoryWinStreak: 0 })}));
 let frame = 0;
 const step = (keys: readonly GbaButton[] = []) => {
  if (++frame > 20000) throw new Error('route budget');
  if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(keys));
  else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(keys));
  else state = advanceFactoryRoundBattleCommand(state, new Set(keys));
 };
 const until = (p: () => boolean) => {while (!p()) step((state.battleStartIntro && frame % 16 === 0) || (state.battleResolutionPresentation?.lifecycle.phase === 'awaiting-message-dismiss' && frame % 2 === 0) ? ['A'] : []);};
 const pulse = (key: GbaButton) => {step(); step([key]); step();};
 until(() => state.battleCommandPresentation?.lifecycle.phase === 'action-menu'); pulse('A'); until(() => state.battleCommandPresentation?.lifecycle.phase === 'fight-menu'); pulse('DOWN'); pulse('A');
 until(() => {const r = state.battleResolutionPresentation, c = r?.segments[r.segmentIndex]?.commands[r.commandIndex]; return r?.lifecycle.phase === 'presenting' && c?.type === 'move-animation' && c.animation?.moveId === 122;});
 return {snapshot: state, r: state.battleResolutionPresentation!};
}
const routeToMoveBody = () => (routed ??= routeToMoveBodyUncached());

function advanceWith(where: 'crossed' | 'trailing', animationId: string, battler: number, args: readonly string[] = []) {
 const {snapshot, r} = routeToMoveBody();
 const seg = r.segments[r.segmentIndex]!; const command = seg.commands[r.commandIndex]!;
 assert.equal(command.type, 'move-animation');
 assert.equal(snapshot.liveMoveSpriteAllocatorHost?.host.historyKnown, true);
 const base = seg.events.find(e => e.payload.kind === 'animation')!;
 const sequence = where === 'crossed' ? command.eventSequence : Number.MAX_SAFE_INTEGER - 1;
 const event = {...base, sequence, payload: {kind: 'animation', animationId, battler, arguments: args}} as typeof base;
 const commands = where === 'trailing' ? seg.commands.slice(0, r.commandIndex + 1) : seg.commands;
 if (where === 'crossed') assert.ok(r.commandIndex < seg.commands.length - 1, 'a later body must follow the crossed event');
 let state = {...snapshot, liveMovePaletteHost: {...snapshot.liveMovePaletteHost!, commandKey: '', eventCursor: undefined}, battleResolutionPresentation: {...r, liveMovePaletteInput: undefined, segments: r.segments.map((s, i) => i === r.segmentIndex ? {...s, events: [event], commands} : s)}} as typeof snapshot;
 const before = state.battle;
 state = advanceFactoryRoundBattleResolution(state);
 assert.equal(state.battle, before);
 return state;
}

describe('aud56 orchestrator: crossed / trailing general / hit / stat animation events', () => {
 for (const where of ['crossed', 'trailing'] as const) {
  for (const [id, battler, args] of [['HIT_ANIMATION', 1, []], ['STATS_CHANGE', 0, ['17']], ['HELD_ITEM_EFFECT', 1, []], ['WEATHER_VAR', 1, ['13']], ['TURN_TRAP', 1, ['250']], ['SUBSTITUTE_FADE', 1, []]] as const) {
   it(`${where} ${id}${args.length ? `(${args[0]})` : ''}: allocator host stays known`, () => {
    expect(advanceWith(where, id, battler, args).liveMoveSpriteAllocatorHost?.host.historyKnown).toBe(true);
   }, 60000);
  }
  for (const [id, battler, args] of [['SNATCH_MOVE', 0, []], ['TURN_TRAP', 0, ['128']], ['WEATHER_VAR', 0, ['5']], ['SOMETHING_NEW', 0, []]] as const) {
   it(`${where} ${id}${args.length ? `(${args[0]})` : ''}: allocator host goes unknown (fail closed)`, () => {
    expect(advanceWith(where, id, battler, args).liveMoveSpriteAllocatorHost?.host.historyKnown).toBe(false);
   }, 60000);
  }
 }
});
