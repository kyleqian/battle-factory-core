// prep10: runnable live-adapter dense fixtures (verifyLiveAdapterFramebuffer) from the prep10 drafts.
// usage (workspace root): node tools/integration/prep10LiveFixtures.mjs <move> [bodyIndex]  -> fixtures/prep10-live/<draft>-b<i>.json
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
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
  d.draft.bodies.forEach((b, i) => {
    if (only !== undefined && String(i) !== only) return;
    const out = {
      schema: "prep10-live-fixture/v1", move, sourceDraft: `${FX}/${f}`, bodyIndex: i, kind: d.kind,
      probe: "tools/probe/run-battle-lab-rgb.py", scenario,
      attacker: d.attacker, target: d.target,
      fieldProfile: { playerHp: b.hpBefore[0], playerMaxHp: b.maxHp[0], opponentHp: b.hpBefore[1], opponentMaxHp: b.maxHp[1],
        playerGender: GEN[parties.player[0].gender], opponentGender: GEN[parties.opponent[0].gender] },
      denseWindow: { startFrame: b.start, endFrame: b.end - 1, ageOffset: 0 },
      // Magnitude's ROM text box shows STRINGID_MAGNITUDESTRENGTH (queue-owned in production), not the move-used banner.
      ...(move === "MAGNITUDE" ? { messageLines: [`MAGNITUDE ${b.gAnimMovePower <= 10 ? 4 : b.gAnimMovePower <= 30 ? 5 : b.gAnimMovePower <= 50 ? 6 : b.gAnimMovePower <= 70 ? 7 : b.gAnimMovePower <= 90 ? 8 : b.gAnimMovePower <= 110 ? 9 : 10}!`, ""] } : {}),
      requestFields: { turn: b.animTurn, power: b.gAnimMovePower },
    };
    writeFileSync(`${FX}/prep10-live/${f.replace(/^prep10-/, "").replace(/\.json$/, "")}-b${i}.json`, JSON.stringify(out, null, 1) + "\n");
  });
}
