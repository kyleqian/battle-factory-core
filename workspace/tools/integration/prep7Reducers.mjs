// prep7: reducer-level checks that need no mGBA: (1) the order adapter mapping for Dragon Dance (provider free order -> allocationOrder) reproduces the ROM front-to-back orb order at window age 20
// (prep6-dd-order.json romOrderFrontToBack [4,3,5,9,7]); (2) the first age at which each body is non-idle (pre-activation rows are idle bodies); (3) age+offset equivalence of the accepted player/opponent offsets.
//   node --experimental-strip-types tools/integration/prep7Reducers.mjs > tools/integration/fixtures/prep7-reducer-checks.json
import { dragonDanceAtAge } from "../../src/animation/dragonDance.ts";
import { aerialAceAnimationAtAge } from "../../src/animation/aerialAce.ts";
import { quickAttackAnimationAtAge } from "../../src/animation/quickAttack.ts";
import { featherDanceSpritesAtAge } from "../../src/animation/featherDance.ts";
import { rd } from "./prep7Accepted.mjs";
const seeds = rd("tools/integration/fixtures/prep7-order-seed.json");
const F = seeds.providerKnownEntryFree, slots = [3, 4, 5, 7, 9, 10];
const providerOrder = F.filter((s) => slots.includes(s)); // spriteOrderForSlots(state, slots): free order restricted to the allocation slots = front-to-back
const mapped = providerOrder.map((s) => slots.indexOf(s)); // allocationOrder[i] = orb index of the i-th front-most slot (dragonDance.ts:157,182: orbs sorted by rank, drawn reversed => array[0] is front-most)
const out = { schema: "prep7-reducer-checks/v1", dragonDance: {}, firstActiveAge: {}, offsetEquivalence: {} };
const rom = rd("tools/integration/fixtures/prep6-dd-order.json").filter((r) => r.windowAge === 20);
for (const side of ["player", "opponent"]) {
  const center = side === "player" ? { x: 72, y: 88 } : { x: 176, y: 46 };
  const mk = (order) => dragonDanceAtAge(20, side, center, { pictureSize: { width: 64, height: 64 }, allocationSlots: slots, allocationOrder: order }, side === "player" ? 80 : 40).orbs.map((o) => o.allocationSlot);
  const romRow = rom.find((r) => r.orientation === (side === "player" ? "player-back" : "opponent-front")).romOrderFrontToBack;
  out.dragonDance[side] = { providerFreeOrderOverAllocationSlots: providerOrder, derivedAllocationOrder: mapped, orbOrderAtAge20_derived: mk(mapped), orbOrderAtAge20_accepted_0to5: mk([0, 1, 2, 3, 4, 5]), romFrontToBackAtAge20: romRow,
    derivedEqualsRom: JSON.stringify(mk(mapped)) === JSON.stringify(romRow), acceptedLiteralEqualsRom: JSON.stringify(mk([0, 1, 2, 3, 4, 5])) === JSON.stringify(romRow) };
}
const first = (f, from = 0) => { const b = JSON.stringify(f(0)); for (let a = 1; a < 120; a++) if (JSON.stringify(f(a)) !== b) return a; return null; };
out.firstActiveAge = {
  AERIAL_ACE: first((a) => aerialAceAnimationAtAge(a, "opponent")), AERIAL_ACE_player: first((a) => aerialAceAnimationAtAge(a, "player")),
  QUICK_ATTACK: first((a) => quickAttackAnimationAtAge(a, "opponent", 0)), QUICK_ATTACK_player: first((a) => quickAttackAnimationAtAge(a, "player", 1)),
  FEATHER_DANCE: first((a) => featherDanceSpritesAtAge(a, { x: 72, y: 80 }, "player", 0)),
  note: "first animationAge whose body output differs from age 0 (idle). Reducer age at the script activation (accepted timeline) is 42/42 (AA), 44/44 (QA), 44/44 (FD): the body is idle for animationAge 0..41/43 and for the first 8-10 script frames",
};
const same = (f, g, n) => { for (let a = 0; a < n; a++) if (JSON.stringify(f(a)) !== JSON.stringify(g(a))) return false; return true; };
out.offsetEquivalence = {
  AERIAL_ACE_player_off4_vs_basis42: same((a) => aerialAceAnimationAtAge(a + 38 + 4 - 38 + 0, "player"), (a) => aerialAceAnimationAtAge(a + 4, "player"), 200),
  FEATHER_DANCE_player_off4: same((a) => featherDanceSpritesAtAge(a + 40, { x: 176, y: 40 }, "opponent", 4), (a) => featherDanceSpritesAtAge(a + 44, { x: 176, y: 40 }, "opponent", 0), 300),
  QUICK_ATTACK_player_off4: same((a) => quickAttackAnimationAtAge(a + 40 + 4, "player", 1), (a) => quickAttackAnimationAtAge(a + 44, "player", 1), 120),
};
console.log(JSON.stringify(out, null, 1));
