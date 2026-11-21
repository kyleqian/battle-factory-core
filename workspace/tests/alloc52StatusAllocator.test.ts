import { censusDeal } from '../tools/integration/censusRound.ts';
import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import type { GbaButton } from '../src/input.ts';
import {
 createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
 advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
 advanceFactoryRoundBattleResolution,
} from '../src/engine/factoryRoundBattleOrchestrator.ts';

// (alloc52 copy of the alloc50 staging) A crossed / trailing status animation invalidates the PALETTE host always, but the sprite ALLOCATOR host only when the
// status animation is not audited net-zero (tools/integration/fixtures/prep50/status-net-zero-audit.json; prep52 adds
// FRZ / INFATUATION / CURSED / NIGHTMARE, tools/integration/fixtures/prep52/net-zero-audit.json: see tests/alloc52StatusAllocator.test.ts).
const STATUS = {frz: [0, 0x20], infatuation: [1, 0x10000], cursed: [1, 0x10000000], nightmare: [1, 0x08000000], wrapped: [1, 0x2000]} as const;

function routeToMoveBody() {
 let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({id: 'status-tail', battleScene: 'on', factoryWinStreak: 0, playerTrainerId: 416049562, battleTowerLevel50WinStreak: 0, facilityState: {rentsCount: 0}, ...censusDeal({ seed: 549, factoryWinStreak: 0 })}));
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
 const snapshot = state; const r = snapshot.battleResolutionPresentation!;
 until(() => !!state.battleResolutionPresentation?.segments[r.segmentIndex]?.events.some(e => e.payload.kind === 'status-animation'));
 const events = state.battleResolutionPresentation!.segments[r.segmentIndex]!.events;
 return {snapshot, r, events};
}

function advanceWith(where: 'crossed' | 'trailing', [isStatus2, status]: readonly [number, number]) {
 const {snapshot, r, events} = routeToMoveBody();
 const seg = r.segments[r.segmentIndex]!; const command = seg.commands[r.commandIndex]!;
 assert.equal(command.type, 'move-animation');
 const base = events.find(e => e.payload.kind === 'status-animation')!;
 assert.equal(snapshot.liveMoveSpriteAllocatorHost?.host.historyKnown, true);
 // crossed: the event precedes the active command's sequence and further commands follow it; trailing: it follows the final command.
 const sequence = where === 'crossed' ? command.eventSequence : Number.MAX_SAFE_INTEGER - 1;
 const event = {...base, sequence, payload: {...base.payload, isStatus2, status}} as typeof base;
 const commands = where === 'trailing' ? seg.commands.slice(0, r.commandIndex + 1) : seg.commands;
 if (where === 'crossed') assert.ok(r.commandIndex < seg.commands.length - 1, 'a later body must follow the crossed event');
 let state = {...snapshot, liveMovePaletteHost: {...snapshot.liveMovePaletteHost!, commandKey: '', eventCursor: undefined}, battleResolutionPresentation: {...r, liveMovePaletteInput: undefined, segments: r.segments.map((s, i) => i === r.segmentIndex ? {...s, events: [event], commands} : s)}} as typeof snapshot;
 const before = state.battle;
 state = advanceFactoryRoundBattleResolution(state);
 assert.equal(state.battle, before);
 return state;
}

describe('alloc52 status-animation allocator net-zero set', () => {
 for (const where of ['crossed', 'trailing'] as const) {
  for (const name of ['frz', 'infatuation', 'cursed', 'nightmare'] as const) {
   it(`${where} ${name}: allocator host stays known while the palette host goes unknown`, () => {
    const state = advanceWith(where, STATUS[name]);
    expect(state.liveMovePaletteHost?.host.historyKnown).toBe(false);
    expect(state.liveMoveSpriteAllocatorHost?.host.historyKnown).toBe(true);
   }, 60000);
  }
  it(`${where} wrapped: allocator host still goes unknown`, () => {
   const state = advanceWith(where, STATUS.wrapped);
   expect(state.liveMovePaletteHost?.host.historyKnown).toBe(false);
   expect(state.liveMoveSpriteAllocatorHost?.host.historyKnown).toBe(false);
  }, 60000);
 }
});
