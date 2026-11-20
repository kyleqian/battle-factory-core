// pic3 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): the drawn-field check. Renders a frame with src/engine/drawRecord.ts
// recording on and compares what was drawn with the battle rules state, at state level (no pixels):
//   - pic: every Pokemon picture read during the frame belongs to a Pokemon in one of the two teams (the canonical sample battle's
//     MURKROW drawn over a live DELIBIRD fails here);
//   - healthbox: each healthbox names a Pokemon of its own side at its own level, and the player's prints that Pokemon's own max HP and
//     an HP inside the range the rules state held for it during the presentation being shown (a sample's full 138/138 over a live
//     65/138 fails here);
//   - room: the battle room's opponent sprite is the sheet of the round's own trainer (the generic BUG CATCHER over TUBER JASON fails);
//   - sample: a canonical sample-battle helper reached during a live render is an error (drawRecord.ts throws it; reported here as a
//     finding with the error message).
// Used by tools/soak/randomRoundSoakDriver.ts (`drawCheck`) and tools/integration/soundCensusRomReplay.ts (`--draw-check`).
import "../../src/engine/monPicPixelsInstall.ts";
import { recordDraws, setCanonicalSampleStrict, type DrawRecord } from "../../src/engine/drawRecord.ts";
import { containedPresentationErrorCount, containedPresentationErrors } from "../../src/engine/presentationContainment.ts";
import { render, type EngineState } from "../../src/engine/core.ts";
import { factoryTrainerPresentationForOpponent, type FactoryTrainerPresentation } from "../../src/engine/factoryTrainerPresentation.ts";
import { facilityTrainerGfxIdForClass } from "../../src/engine/factoryTrainerOverworldGfx.ts";
import { opponentSheetNameForGfx } from "../../src/engine/battleRoomRender.ts";
import speciesNamesData from "../../src/data/gen/species-names.json" with { type: "json" };

// a live-route canonical sample throws here (the browser only records it), so checkDrawnFrame reports it as a finding
setCanonicalSampleStrict(true);

export type DrawCheckFinding = Readonly<{ frame: number; kind: "pic" | "healthbox" | "room" | "sample" | "render"; detail: string }>;

const speciesRows = (speciesNamesData as { species: readonly { species: string; name: string }[] }).species;
const symbolOf = (id: number): string => speciesRows[id]?.species.replace(/^SPECIES_/, "") ?? `#${id}`;
const nameOf = (id: number): string => speciesRows[id]?.name ?? `#${id}`;

type PartyMon = Readonly<{ species: number; hp: number; maxHP: number; level: number }>;
type RulesSnapshot = Readonly<{ rulesContext: Readonly<{ party?: Readonly<{ player: readonly PartyMon[]; opponent: readonly PartyMon[] }>; battlers?: readonly (PartyMon & { partyIndex: number })[] }> }>;

function partiesOf(rules: RulesSnapshot | null | undefined): { player: readonly PartyMon[]; opponent: readonly PartyMon[] } | null {
  const party = rules?.rulesContext?.party;
  return party === undefined ? null : party;
}

type ShownSegment = { beforeRules?: RulesSnapshot | null; afterRules?: RulesSnapshot | null; field?: { player?: { species: number } };
  commands?: readonly { type: string; battler?: number; from?: number; to?: number; incoming?: { species: number } }[] };

function shownSegments(state: EngineState): readonly ShownSegment[] {
  const orchestrator = state.factoryRoundBattleOrchestrator as unknown as {
    battleResolutionPresentation?: { segments?: readonly ShownSegment[] } | null;
    retainedLockedActionPresentationOwner?: { resolution?: { segments?: readonly ShownSegment[] } } | null;
  } | null;
  const resolution = orchestrator?.battleResolutionPresentation ?? orchestrator?.retainedLockedActionPresentationOwner?.resolution ?? null;
  return resolution?.segments ?? [];
}

/** The player-side HP endpoints the shown presentation animates (an hp command's from / to), per species: a hit then a berry heal in one
 * segment passes through HP that neither rules snapshot holds. */
function playerHpEndpoints(state: EngineState): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const segment of shownSegments(state)) {
    let species = segment.field?.player?.species;
    for (const command of segment.commands ?? []) {
      if (command.type === "switch-in" && command.battler === 0 && command.incoming) species = command.incoming.species;
      if (command.type === "hp" && command.battler === 0 && species !== undefined && command.from !== undefined && command.to !== undefined) {
        const list = out.get(species) ?? [];
        list.push(command.from, command.to);
        out.set(species, list);
      }
    }
  }
  return out;
}

/** Every rules snapshot that the frame's presentation can be showing: the live rules and each shown segment's before / after. */
function rulesSnapshots(state: EngineState): RulesSnapshot[] {
  const orchestrator = state.factoryRoundBattleOrchestrator as unknown as {
    battle?: { rules?: RulesSnapshot } | null;
    battleResolutionPresentation?: { segments?: readonly { beforeRules?: RulesSnapshot | null; afterRules?: RulesSnapshot | null }[] } | null;
    retainedLockedActionPresentationOwner?: { resolution?: { segments?: readonly { beforeRules?: RulesSnapshot | null; afterRules?: RulesSnapshot | null }[] } } | null;
  } | null;
  if (!orchestrator) return [];
  const out: RulesSnapshot[] = [];
  if (orchestrator.battle?.rules) out.push(orchestrator.battle.rules);
  const resolution = orchestrator.battleResolutionPresentation ?? orchestrator.retainedLockedActionPresentationOwner?.resolution ?? null;
  for (const segment of resolution?.segments ?? []) {
    if (segment.beforeRules) out.push(segment.beforeRules);
    if (segment.afterRules) out.push(segment.afterRules);
  }
  return out;
}

/** The round's own current opponent (never the room state's copy, which is what is being checked); null before battle 1's orchestrator. */
function roundTrainer(state: EngineState): FactoryTrainerPresentation | null {
  const opponent = (state.factoryRoundBattleOrchestrator as unknown as { round?: { rules?: { currentOpponent?: { id: string; trainerName: string } } } } | null)
    ?.round?.rules?.currentOpponent;
  return factoryTrainerPresentationForOpponent(opponent);
}
const sheetOf = (trainer: FactoryTrainerPresentation): string => opponentSheetNameForGfx(facilityTrainerGfxIdForClass(trainer.facilityClassId));

/** Compares one frame's draw record with the state it was drawn from. */
export function compareDrawRecord(state: EngineState, record: DrawRecord, frame: number): DrawCheckFinding[] {
  const findings: DrawCheckFinding[] = [];
  for (const sample of record.canonicalSamples) {
    if (state.factoryRoundBattleOrchestrator) findings.push({ frame, kind: "sample", detail: sample });
  }
  const snapshots = rulesSnapshots(state);
  const parties = snapshots.map(partiesOf).filter((p): p is NonNullable<ReturnType<typeof partiesOf>> => p !== null);
  if (parties.length > 0) {
    const teamSymbols = new Set<string>();
    for (const p of parties) for (const mon of [...p.player, ...p.opponent]) teamSymbols.add(symbolOf(mon.species));
    for (const pic of record.monPics) {
      if (!teamSymbols.has(pic.species)) {
        findings.push({ frame, kind: "pic", detail: `${pic.side} picture ${pic.species} is in neither team (${[...teamSymbols].join(" ")})` });
      }
    }
    // The live seam paints its healthboxes over a staged move body's placeholder chrome at the same opaque footprint
    // (renderBattleResolutionLiveView), so the visible healthbox of each side is the last one composed in the frame.
    const visible = new Map<string, (typeof record.healthboxes)[number]>();
    for (const box of record.healthboxes) visible.set(box.side, box);
    for (const box of visible.values()) {
      const side = box.side === "player" ? "player" : "opponent";
      const candidates = parties.flatMap((p) => p[side].map((mon, index) => ({ mon, index })))
        .filter(({ mon }) => nameOf(mon.species) === box.name && mon.level === box.level);
      if (candidates.length === 0) {
        findings.push({ frame, kind: "healthbox", detail: `${side} healthbox ${box.name} Lv${box.level} is no ${side} Pokemon` });
        continue;
      }
      if (box.side === "player" && box.currentHp !== null && box.maxHp !== null) {
        const sameMax = candidates.filter(({ mon }) => mon.maxHP === box.maxHp);
        if (sameMax.length === 0) {
          findings.push({ frame, kind: "healthbox", detail: `player healthbox ${box.name} max HP ${box.maxHp}, team has ${candidates.map(({ mon }) => mon.maxHP).join("/")}` });
          continue;
        }
        const endpoints = playerHpEndpoints(state);
        const hps = sameMax.flatMap(({ mon }) => [mon.hp, ...(endpoints.get(mon.species) ?? [])]);
        const lo = Math.min(...hps);
        const hi = Math.max(...hps);
        if (box.currentHp < lo || box.currentHp > hi) {
          findings.push({ frame, kind: "healthbox", detail: `player healthbox ${box.name} prints ${box.currentHp}/${box.maxHp}, rules held ${lo}..${hi}` });
        }
      }
    }
  }
  const trainer = roundTrainer(state);
  for (const sprite of record.overworldSprites) {
    if (sprite.role !== "room-opponent" || trainer === null) continue;
    const expected = sheetOf(trainer);
    if (sprite.graphicsId !== expected) {
      findings.push({ frame, kind: "room", detail: `room opponent ${sprite.graphicsId}, round trainer ${trainer.className} ${trainer.name} is ${expected}` });
    }
  }
  return findings;
}

/** The first room of a round is drawn before battle 1's orchestrator exists: its sheets wait for the battle's own opponent. */
type PendingRoom = { frame: number; sheet: string };

/** Renders `state` with recording on and compares; a render throw is a finding (the frame is still counted). */
export function checkDrawnFrame(state: EngineState, frame: number, pendingRooms?: PendingRoom[]): DrawCheckFinding[] {
  let record: DrawRecord;
  const containedBefore = containedPresentationErrorCount();
  try {
    record = recordDraws(() => render(state)).record;
  } catch (error) {
    return [{ frame, kind: error instanceof Error && error.name === "CanonicalSampleInLiveRenderError" ? "sample" : "render", detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }];
  }
  const findings = compareDrawRecord(state, record, frame);
  // A throw the presentation containment caught (contain209: the frame drew the static field instead) is a finding too: a sample
  // reached inside a contained draw, or any other degraded command. Distinct errors are recorded once, so this reports the first.
  if (containedPresentationErrorCount() > containedBefore) {
    const fresh = containedPresentationErrors().slice(containedBefore);
    if (fresh.length === 0) findings.push({ frame, kind: "render", detail: "contained presentation error (past the containment list's limit)" });
    for (const error of fresh) {
      findings.push({ frame, kind: error.message.startsWith("CanonicalSampleInLiveRenderError") ? "sample" : "render", detail: `contained ${error.site} ${error.commandType}: ${error.message}` });
    }
  }
  if (pendingRooms !== undefined) {
    const trainer = roundTrainer(state);
    if (trainer === null) {
      for (const sprite of record.overworldSprites) if (sprite.role === "room-opponent") pendingRooms.push({ frame, sheet: sprite.graphicsId });
    } else if (pendingRooms.length > 0) {
      const expected = sheetOf(trainer);
      for (const room of pendingRooms.splice(0)) {
        if (room.sheet !== expected) {
          findings.push({ frame: room.frame, kind: "room", detail: `first room opponent ${room.sheet}, battle 1 trainer ${trainer.className} ${trainer.name} is ${expected}` });
        }
      }
    }
  }
  return findings;
}

/** Accumulates findings over a run, keeping the first few of each distinct detail and a count. */
export class DrawCheckLog {
  readonly pendingRooms: PendingRoom[] = [];
  /** Renders, compares and logs one frame. */
  check(state: EngineState, frame: number): void {
    this.add(checkDrawnFrame(state, frame, this.pendingRooms));
  }
  readonly counts = new Map<string, { kind: string; detail: string; first: number; last: number; frames: number }>();
  framesChecked = 0;
  add(findings: readonly DrawCheckFinding[]): void {
    this.framesChecked += 1;
    for (const f of findings) {
      // one row per finding shape (numbers folded), keeping the first example's own text
      const key = `${f.kind}|${f.detail.replace(/\d+/g, "#")}`;
      const row = this.counts.get(key);
      if (row) { row.frames += 1; row.last = f.frame; } else this.counts.set(key, { kind: f.kind, detail: f.detail, first: f.frame, last: f.frame, frames: 1 });
    }
  }
  rows(): { kind: string; detail: string; first: number; last: number; frames: number }[] {
    return [...this.counts.values()];
  }
}
