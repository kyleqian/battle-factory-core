// spark62: runnable live-adapter dense fixtures (liveAdapterFramebuffer.ts) for the spark62 lab scenarios (opponent + player attackers).
// usage (workspace root): node tools/integration/spark62LiveFixtures.mjs <prep10Probe-output-dir>   -> fixtures/spark62-live/<scenario>.json
// Activation / HP come from prep10Probe.py runs of the same scenarios (the first Move_SPARK body); the window is activation + 9 .. + 123 (115 rows,
// the accepted prep10 s3.5 window shape for both orientations).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
const speciesName = id => speciesStats.species.find(x => x.id === id).name.replace(/^SPECIES_/, "");
const FX = "tools/integration/fixtures";
const probes = process.argv[2];
mkdirSync(`${FX}/spark62-live`, { recursive: true });
for (const name of readdirSync(`${FX}/spark62-scenarios`).filter(n => n.endsWith(".json")).sort()) {
  const scenario = `${FX}/spark62-scenarios/${name}`;
  const sc = JSON.parse(readFileSync(scenario, "utf8"));
  const probe = JSON.parse(readFileSync(`${probes}/${name}`, "utf8"));
  const body = probe.bodies.find(b => b.move === 209);
  const mons = body.atActivation.mons;
  const parties = sc.overrides.parties;
  const side = parties.player[0].moves.includes(209) ? "player" : "opponent";
  const other = side === "player" ? "opponent" : "player";
  const gender = m => m.gender ?? "genderless";
  const out = {
    schema: "spark62-live-fixture/v1", move: "SPARK", kind: `${side}-attacker ${speciesName(parties[side][0].species)}`,
    probe: "tools/probe/run-battle-lab-rgb.py", scenario,
    attacker: { species: speciesName(parties[side][0].species), geometry: { side } },
    target: { species: speciesName(parties[other][0].species), geometry: { side: other } },
    fieldProfile: { playerHp: mons[0].hp, playerMaxHp: mons[0].maxHP, opponentHp: mons[1].hp, opponentMaxHp: mons[1].maxHP,
      playerGender: gender(parties.player[0]), opponentGender: gender(parties.opponent[0]) },
    denseWindow: { startFrame: body.start + 9, endFrame: body.start + 9 + 114, ageOffset: 0 },
    requestFields: { turn: body.atActivation.animTurn, power: body.atActivation.gAnimMovePower },
  };
  writeFileSync(`${FX}/spark62-live/${name}`, JSON.stringify(out, null, 1) + "\n");
}
