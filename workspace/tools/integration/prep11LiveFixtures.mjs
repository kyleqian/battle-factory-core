// prep11: runnable live-adapter dense fixtures (verifyLiveAdapterFramebuffer) from the prep11 drafts.
// usage (workspace root): node tools/integration/prep11LiveFixtures.mjs <MOVE>...  -> fixtures/prep11-live/<draft stem>.json
// The window is the draft's (activation == accepted window start; alternates: alternate activation + accepted offset 0).
// maxHp from the scenario party (stat formula); hp = the ROM's hp at activation; a post-Tackle order shape declares the
// preceding Tackle by the other side (the draft's orderAtActivation `..,2,3,4,..` vs the first-body `..,2,4,3,..`).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
const FX = "tools/integration/fixtures";
const byId = id => speciesStats.species.find(x => x.id === id);
const maxHp = (p) => Math.floor((2 * byId(p.species).baseHp + p.ivs.hp + Math.floor(p.evs.hp / 4)) * p.level / 100) + p.level + 10;
for (const move of process.argv.slice(2)) {
  const stem = `prep11-${move.toLowerCase().replaceAll("_", "-")}-`;
  for (const f of readdirSync(FX).filter(x => x.startsWith(stem) && x.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(`${FX}/${f}`, "utf8"));
    if (d.move !== move || !d.draft) continue;
    const sc = JSON.parse(readFileSync(d.scenario, "utf8")), parties = sc.overrides.parties;
    const side = d.attacker.geometry.side, other = side === "player" ? "opponent" : "player";
    const hp = d.fieldProfileHpAtActivation;
    const o = d.draft.orderAtActivation, i2 = o.indexOf(2);
    const postTackle = o[i2 + 1] === 3 && o[i2 + 2] === 4;
    const out = {
      schema: "prep11-live-fixture/v1", move, sourceDraft: `${FX}/${f}`, probe: "tools/probe/run-battle-lab-rgb.py", scenario: d.scenario,
      attacker: d.attacker, target: d.target,
      fieldProfile: { playerHp: hp.player, playerMaxHp: maxHp(parties.player[0]), opponentHp: hp.opponent, opponentMaxHp: maxHp(parties.opponent[0]),
        playerGender: parties.player[0].gender, opponentGender: parties.opponent[0].gender },
      denseWindow: d.draft.denseWindow,
      requestFields: { turn: 0, power: d.draft.gAnimMovePower },
      ...(postTackle ? { precedingBodies: [{ moveId: 33, side: other }] } : {}),
    };
    writeFileSync(`${FX}/prep11-live/${f.replace(/^prep11-/, "")}`, JSON.stringify(out, null, 1) + "\n");
  }
}
