// (library) The PRODUCTION transform (src/engine/spriteOrderEventTransform.ts battle units, docs/sprite-order-uncovered-units.md
// §2) driven by the ROM evidence event streams (fixtures/sprite-order-uncovered/events): production events only, no ROM
// re-seed, no body overrides, battler slots held by the tracker itself. Used by tests/spriteOrderBattleUnits.test.ts and
// tests/liveSpriteOrderHost.test.ts.
import { readFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

const FX = new URL("./fixtures/sprite-order-uncovered/", import.meta.url);
export interface Ev { n: number; k: string; [key: string]: unknown }
type Side = "player" | "opponent";
const maskSlots = (mask: string) => {
  const bits = BigInt(`0x${mask}`);
  return Array.from({ length: 64 }, (_, slot) => slot).filter(slot => (bits >> BigInt(slot)) & 1n);
};
const same = (a: readonly number[], b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
const GENERAL = new Map<number, string>([[7, "HELD_ITEM_EFFECT"], [11, "SUN_CONTINUES"], [13, "HAIL_CONTINUES"], [6, "TURN_TRAP"], [20, "FOCUS_PUNCH_SETUP"]]);
const STATUS = new Map<number, string>([[0, "PSN"], [1, "CONFUSION"], [2, "BRN"], [3, "INFATUATION"], [4, "SLP"], [5, "PRZ"], [6, "FRZ"], [7, "CURSED"], [8, "NIGHTMARE"]]);
function animEvent(table: string, id: number, arg: number | null): SpriteOrderPresentationEvent {
  if (table === "gBattleAnims_General" && id === 1 && arg !== null) return { kind: "stat-animation", argument: arg };
  if (table === "gBattleAnims_General") return { kind: "general-animation", animation: GENERAL.get(id) ?? `GENERAL_${id}` };
  if (table === "gBattleAnims_StatusConditions") return { kind: "status-animation", status: STATUS.get(id) ?? `STATUS_${id}` };
  return { kind: "invalidate", reason: `unknown animation table ${table}` };
}

/** Production events of one evidence unit (`recall` = the provisional switch-out event the live host never emits). */
function unitEvents(klass: string, playerPresent: boolean, recall: boolean): SpriteOrderPresentationEvent[] | null {
  if (klass === "faint-opponent" || klass === "faint-player") return [{ kind: "faint", side: klass.slice(6) as Side }];
  if (klass === "U2-next-mon-summary") return [{ kind: "party-summary-next" }];
  if (klass === "U3-next-mon-sendout") return [{ kind: "party-summary-hide" }, { kind: "next-mon-send-out" }];
  if (klass === "U4a-switchin-ball-start") return [{ kind: "switch-in-start" }];
  if (klass === "U4b-switchin-ball-particles") return [{ kind: "switch-in-finish" }];
  if (klass === "U5-party-menu") return []; // menu contents: erased by the exit reset (the next `reset` event)
  if (klass === "U6-battle-reshow") return [{ kind: "battle-reshow", playerBattlerPresent: playerPresent }];
  if (klass === "U7-end-trainer-slide") return [{ kind: "trainer-slide-end" }];
  if (klass === "U8-recall-switch-out") return [recall ? { kind: "switch-out" } : { kind: "invalidate", reason: "return to ball" }];
  return null;
}

/** `recall`: model the provisional voluntary recall (the receipt does); false = the live host's behaviour (invalidate). */
export const evidenceEvents = (name: string): Ev[] => JSON.parse(readFileSync(new URL(`./events/${name.replace(":", "-")}.json`, FX), "utf8")).events;
export const maskSlotsOf = (mask: string) => maskSlots(mask);

/** `until`: stop before the first event at or after that frame (the tracker there is the strict pre-state). */
export function productionReplay(name: string, recall = true, until = Number.POSITIVE_INFINITY) {
  const events: Ev[] = evidenceEvents(name).filter(e => e.n < until);
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
  let playerPresent = true; // from the event stream only (the host derives it from faint / switch-in events)
  const entryEnd = events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim" || e.k === "prompt-unterminated")!.n;
  const edges: { frame: number; kind: "move" | "anim"; known: boolean; exact: boolean | null; occupiedMatch: boolean | null }[] = [];
  const unitChecks: { frame: number; unit: string; exact: boolean; occupiedMatch: boolean }[] = [];
  const apply = (event: SpriteOrderPresentationEvent) => { tracker = applySpriteOrderPresentationEvent(tracker, event); };
  const check = (frame: number, unit: string, obsF: number[], obsMask: string) => {
    if (tracker.cursor.order.known) unitChecks.push({ frame, unit, exact: same(tracker.cursor.order.free, obsF), occupiedMatch: same(tracker.cursor.occupied, maskSlots(obsMask)) });
  };
  for (let index = 0; index < events.length; index += 1) {
    const e = events[index]!;
    const next = events[index + 1];
    if (e.n <= entryEnd && e.k === "uncovered") continue;
    const klass = String(e.unitClass ?? "");
    if (e.k === "prompt") {
      apply({ kind: "action-prompt" });
      apply({ kind: "actions-committed" });
    } else if (e.k === "blip") {
      apply({ kind: "hit-animation", targetVisible: true });
    } else if (e.k === "body" || e.k === "anim") {
      const known = tracker.cursor.order.known;
      edges.push({ frame: e.n, kind: e.k === "body" ? "move" : "anim", known, exact: known ? same(tracker.cursor.order.free, e.obsF as number[]) : null,
        occupiedMatch: known ? same(tracker.cursor.occupied, maskSlots(e.obsMask as string)) : null });
      if (e.k === "anim" && klass === "U8-recall-switch-out") {
        unitEvents(klass, playerPresent, recall)!.forEach(apply);
        playerPresent = false;
        if (next) check(e.n, klass, next.preF as number[], next.preMask as string);
      } else apply(e.k === "body" ? { kind: "move-animation", moveId: e.move as number, attackerSide: e.side as Side }
        : animEvent(e.table as string, e.id as number, (e.arg as number | null) ?? null));
    } else if (e.k === "prompt-unterminated") {
      apply({ kind: "action-prompt" }); // the bounce pair's create half (party menu opened over the prompt / trace end)
    } else if (e.k === "reset") {
      apply({ kind: "party-menu-reset" });
    } else if (e.k === "uncovered") {
      if (klass.startsWith("other:HandleTurnActionSelectionState")) continue; // = the prompt-unterminated event
      const mapped = unitEvents(klass, playerPresent, recall);
      if (mapped === null) { apply({ kind: "invalidate", reason: `uncovered unit class ${klass}` }); continue; }
      mapped.forEach(apply);
      if (klass === "faint-player") playerPresent = false;
      if (klass === "U4b-switchin-ball-particles") playerPresent = true;
      if (klass !== "U5-party-menu") check(e.n, klass, e.obsF as number[], e.obsMask as string);
    } else {
      apply({ kind: "invalidate", reason: e.k });
    }
  }
  return { trace: name, edges, unitChecks, tracker };
}

