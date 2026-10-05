// prep10: runnable live-adapter dense fixtures (verifyLiveAdapterFramebuffer) from the prep10 drafts.
// usage (workspace root): node tools/integration/prep10LiveFixtures.mjs <move> [bodyIndex]  -> fixtures/prep10-live/<draft>-b<i>.json
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
const moveId = Object.fromEntries(moveData.moves.map(r => [r.move.replace(/^MOVE_/, ""), r.id]));
const speciesName = id => speciesStats.species.find(x => x.id === id).name.replace(/^SPECIES_/, "");
const FX = "tools/integration/fixtures";
const move = process.argv[2], only = process.argv[3];
const GEN = { male: "male", female: "female", genderless: "genderless" };
for (const f of readdirSync(FX).filter(x => x.startsWith(`prep10-${move.toLowerCase().replaceAll("_", "-")}-`) && x.endsWith(".json"))) {
  const d = JSON.parse(readFileSync(`${FX}/${f}`, "utf8"));
  if (d.move !== move) continue;
  const stem = d.probe;
  const scenario = existsSync(`tools/battle-lab/${stem}.json`) ? `tools/battle-lab/${stem}.json` : `${FX}/prep10-scenarios/${stem}.json`;
  const sc = JSON.parse(readFileSync(scenario, "utf8"));
  const parties = sc.overrides.parties;
  // Attacker/target come from the scenario (party 0 that knows the move), not from the draft's file-name side.
  const side = parties.player[0].moves.includes(moveId[move]) ? "player" : "opponent";
  const other = side === "player" ? "opponent" : "player";
  const attacker = { species: speciesName(parties[side][0].species), geometry: { side } };
  const target = { species: speciesName(parties[other][0].species), geometry: { side: other } };
  d.draft.bodies.forEach((b0, i) => {
    // Rock Blast: the third player hit was cut by the draft's recording end (end -1); every hit is 89 frames.
    const b = move === "ROCK_BLAST" ? { ...b0, end: b0.start + 89 } : b0;
    if (only !== undefined && String(i) !== only) return;
    // The third Rock Blast hit (448..537) is past the lab scenario's recorded trace: same deterministic prefix, longer last segment.
    let scenarioPath = scenario;
    if (move === "ROCK_BLAST" && b.end > sc.trace.captureFrames[1]) {
      const longer = structuredClone(sc);
      longer.trace.segments.at(-1).frames += 100;
      longer.trace.captureFrames = [0, sc.trace.captureFrames[1] + 100];
      scenarioPath = `${FX}/prep10-scenarios/${stem.replace(/^mechanic-/, "")}-long.json`;
      writeFileSync(scenarioPath, JSON.stringify(longer));
    }
    const out = {
      schema: "prep10-live-fixture/v1", move, sourceDraft: `${FX}/${f}`, bodyIndex: i, kind: d.kind,
      probe: "tools/probe/run-battle-lab-rgb.py", scenario: scenarioPath,
      attacker, target,
      fieldProfile: { playerHp: b.hpBefore[0], playerMaxHp: b.maxHp[0], opponentHp: b.hpBefore[1], opponentMaxHp: b.maxHp[1],
        playerGender: GEN[parties.player[0].gender], opponentGender: GEN[parties.opponent[0].gender] },
      denseWindow: { startFrame: b.start, endFrame: b.end - 1 + (move === "PAIN_SPLIT" ? 1 : 0), // Pain Split: the accepted window includes the first inactive row (81 rows)
 ageOffset: 0 },
      // Magnitude's ROM text box shows STRINGID_MAGNITUDESTRENGTH (queue-owned in production), not the move-used banner.
      // Razor Wind's setup body shows no text (the unleash body shows the move-used banner).
      ...(move === "RAZOR_WIND" && b.animTurn === 0 ? { messageLines: ["", ""] } : {}),
      ...(move === "ROCK_BLAST" && i > 0 ? { messageLines: ["", ""] } : {}), // later hits: the text box is empty (queue-owned)
      ...(move === "MAGNITUDE" ? { messageLines: [`MAGNITUDE ${b.gAnimMovePower <= 10 ? 4 : b.gAnimMovePower <= 30 ? 5 : b.gAnimMovePower <= 50 ? 6 : b.gAnimMovePower <= 70 ? 7 : b.gAnimMovePower <= 90 ? 8 : b.gAnimMovePower <= 110 ? 9 : 10}!`, ""] } : {}),
      requestFields: { turn: b.animTurn, power: b.gAnimMovePower, ...(b.multiHitCounter ? { multihit: b.multiHitCounter } : {}) },
      // Later per-hit bodies follow the earlier hits of the same move (the lent order is tracker-predicted).
      ...(i > 0 && move === "ROCK_BLAST" ? { precedingBodies: Array.from({ length: i }, () => ({ moveId: moveId[move], side })) } : {}),
    };
    writeFileSync(`${FX}/prep10-live/${f.replace(/^prep10-/, "").replace(/\.json$/, "")}-b${i}.json`, JSON.stringify(out, null, 1) + "\n");
  });
}
