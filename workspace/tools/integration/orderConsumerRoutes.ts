// Ordinary generated-rental routes for the order-consumer moves (adapted from prep5Routes.ts).
//   node --experimental-strip-types tools/integration/orderConsumerRoutes.ts > tools/integration/fixtures/order-consumer-routes.json   (from workspace/)
// party member 0 = rentals[0] knows the move; seeds 0..9999 ascending, streak 0..42 step 7, rentsCount 0, playerTrainerId 416049562 (0x18D6D41A).
// For every move: first route, accepted-species route, a "later action" route (slot-0 rental also knows >=1 other live move whose body plan is EXACT in both
// orientations, so turn 1 = that move, turn 2 = the order consumer, provider valid if the opponent's body is also EXACT), and carrier species list.
import { readFileSync } from "node:fs";
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";

const plans = JSON.parse(readFileSync("tools/integration/fixtures/sprite-order-body-plans.json", "utf8"));
const exactBoth = new Set<number>((plans.liveIds as number[]).filter((id) => plans.bodies[`${id}:player`]?.verdict === "EXACT-PLAN" && plans.bodies[`${id}:opponent`]?.verdict === "EXACT-PLAN"));
const ACCEPTED: Record<string, string[]> = { EMBER: ["ONIX"], FLAMETHROWER: ["ONIX"], ROCK_THROW: ["GRAVELER"], DRAGON_RAGE: ["CHARMELEON"], HEAL_BELL: ["CHIMECHO"], PERISH_SONG: ["MURKROW"], LEAF_BLADE: ["SCEPTILE"],
  BLAZE_KICK: ["ONIX"], MUD_SLAP: ["PIDGEOTTO"], SAND_ATTACK: ["PIDGEOTTO"], GRUDGE: ["HAUNTER"], ROCK_SLIDE: ["GROVYLE"], MAGNITUDE: ["GRAVELER", "CAMERUPT"], DIVE: ["CHINCHOU"] };
const MOVES: Record<string, number> = { EMBER: 52, FLAMETHROWER: 53, ROCK_THROW: 88, DRAGON_RAGE: 82, HEAL_BELL: 215, PERISH_SONG: 195, LEAF_BLADE: 348, BLAZE_KICK: 299, MUD_SLAP: 189, SAND_ATTACK: 28, GRUDGE: 288, ROCK_SLIDE: 157, MAGNITUDE: 222, DIVE: 291 };
const STREAK_MAX = Number(process.env.STREAK_MAX ?? 42);
const found: Record<string, any[]> = {}, slotCounts: Record<string, number> = {}, anySlot: Record<string, number> = {}, species: Record<string, Set<string>> = {}, laterCounts: Record<string, number> = {};
for (let seed = 0; seed < 10000; seed++) {
  for (let streak = 0; streak <= STREAK_MAX; streak += 7) {
    const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
    g.rentals.forEach((rental, slot) => {
      const m = createFactoryCorpusPartyMember(rental) as any;
      for (const [name, id] of Object.entries(MOVES)) {
        if (!(m.moves as readonly number[]).includes(id)) continue;
        (species[name] ??= new Set()).add(rental.speciesName); anySlot[name] = (anySlot[name] ?? 0) + 1;
        if (slot !== 0) continue;
        slotCounts[name] = (slotCounts[name] ?? 0) + 1;
        const preds = (m.moves as number[]).filter((x) => x !== id && exactBoth.has(x));
        const rec = { seed, streak, slot, setId: rental.setId, species: rental.speciesName, moves: [...m.moves], hp: m.hp, maxHp: m.maxHP, gender: m.gender, personality: m.personality, level: m.level, item: m.itemName, exactPlanPredecessorMoves: preds };
        const list = (found[name] ??= []);
        if (list.length === 0) list.push({ kind: "first", ...rec });
        if (ACCEPTED[name].some((s) => rental.speciesName === `SPECIES_${s}`) && !list.some((r) => r.kind === "accepted-species")) list.push({ kind: "accepted-species", ...rec });
        if (preds.length) { laterCounts[name] = (laterCounts[name] ?? 0) + 1; if (!list.some((r) => r.kind === "later-action-after-exact-body")) list.push({ kind: "later-action-after-exact-body", ...rec }); }
      }
    });
  }
}
console.log(JSON.stringify({ schema: "order-consumer-routes/v1", playerTrainerId: 416049562, rentsCount: 0, streakMax: STREAK_MAX, slot0Counts: slotCounts, anySlotCounts: anySlot, laterActionSlot0Counts: laterCounts,
  species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, [...v].sort()])), routes: found }, null, 1));
