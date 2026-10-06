// Rollout (205) runnable live-adapter dense fixtures (verifyLiveAdapterFramebuffer), one per ROM body.
// usage (workspace root): node tools/integration/rolloutLiveFixtures.mjs  -> fixtures/rollout-live/*.json
// Windows are the drafts' accepted body windows (activation == window start, inclusive of the first-inactive frame; rows
// 167,167,161,153,145); never chosen by matching live output. The counter is 1.. in body order (docs/rollout-endeavor-prep.md s0.1).
import { readFileSync, writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
const FX = "tools/integration/fixtures";
const byId = id => speciesStats.species.find(x => x.id === id);
const maxHp = (p) => Math.floor((2 * byId(p.species).baseHp + p.ivs.hp + Math.floor(p.evs.hp / 4)) * p.level / 100) + p.level + 10;
const nm = p => typeof p.species === "number" ? byId(p.species).name.replace(/^SPECIES_/, "") : p.species;
const emit = (name, scenarioPath, attackerSide, body, counter, preceding, hp) => {
  const sc = JSON.parse(readFileSync(scenarioPath, "utf8")), parties = sc.overrides.parties;
  const other = attackerSide === "player" ? "opponent" : "player";
  const out = {
    schema: "rollout-live-fixture/v1", move: "ROLLOUT", probe: "tools/probe/run-battle-lab-rgb.py", scenario: scenarioPath,
    attacker: { species: nm(parties[attackerSide][0]), geometry: { side: attackerSide } },
    target: { species: nm(parties[other][0]), geometry: { side: other } },
    fieldProfile: { playerHp: hp.player, playerMaxHp: maxHp(parties.player[0]), opponentHp: hp.opponent, opponentMaxHp: maxHp(parties.opponent[0]),
      playerGender: parties.player[0].gender, opponentGender: parties.opponent[0].gender },
    denseWindow: { startFrame: body.start, endFrame: body.end, ageOffset: 0 },
    requestFields: { turn: 0, power: body.gAnimMovePower, rolloutCounter: counter },
    ...(preceding > 0 ? { precedingBodies: Array.from({ length: preceding }, () => ({ moveId: 205, side: attackerSide })) } : {}),
  };
  writeFileSync(`${FX}/rollout-live/${name}.json`, JSON.stringify(out, null, 1) + "\n");
};
for (const n of ["player-plain", "opponent-plain", "player-curl"]) {
  const d = JSON.parse(readFileSync(`${FX}/rollout-endeavor/draft-rollout-${n}.json`, "utf8"));
  const side = d.bodies[0].attacker === 0 ? "player" : "opponent";
  d.bodies.forEach((b, i) => emit(`rollout-${n}-body${i + 1}`, d.scenario, side, b,
    n === "opponent-plain" && i === 5 ? 1 : i + 1, n === "opponent-plain" && i === 5 ? 0 : i,
    { player: b.hp[0], opponent: b.hp[1] }));
}
const w = JSON.parse(readFileSync(`${FX}/prep11-rollout-player-rollout-alt-wailmer.json`, "utf8"));
emit("rollout-alt-wailmer-body1", w.scenario, "player",
  { start: w.draft.denseWindow.startFrame, end: w.draft.denseWindow.endFrame, gAnimMovePower: w.draft.gAnimMovePower }, 1, 0,
  { player: w.fieldProfileHpAtActivation.player, opponent: w.fieldProfileHpAtActivation.opponent });
