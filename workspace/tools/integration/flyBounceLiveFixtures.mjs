// Fly / Bounce live-adapter dense fixtures (verifyLiveAdapterFramebuffer) from the prep11 drafts (docs/next-adapters-prep11.md s2.3).
// usage (workspace root): node tools/integration/flyBounceLiveFixtures.mjs  -> fixtures/flybounce-live/<draft stem>.json
// Windows are the drafts' (activation == the ROM body's first frame, rows = script frames + 1; never matched to live output).
// request.turn = draft bodyTurn - 1 (gAnimMoveTurn: 0 charge, 1 strike). The opponent-attacker drafts of
// mechanic-fly-murkrow-onix / mechanic-bounce-spoink-onix label the attacker as the player battler: the scenario's
// opponent (MURKROW / SPOINK, monsAtAct battler 1) is the attacker, so the sides are taken from the scenario.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
const FX = "tools/integration/fixtures";
const byId = id => speciesStats.species.find(x => x.id === id);
const maxHp = (p) => Math.floor((2 * byId(p.species).baseHp + p.ivs.hp + Math.floor(p.evs.hp / 4)) * p.level / 100) + p.level + 10;
const OPPONENT_ATTACKER = new Set(["tools/battle-lab/mechanic-fly-murkrow-onix.json", "tools/battle-lab/mechanic-bounce-spoink-onix.json"]);
// Legacy `overrides.battlers` scenarios (set-id species): species / maxHP from a fresh prep11Probe.py run at the body's
// activation (gBattleMons), genders from the accepted staged fixtures of the same scenarios (tools/compare/fixtures).
const LEGACY = {
  "tools/battle-lab/mechanic-fly-murkrow-onix.json": { player: ["ONIX", 117, "female"], opponent: ["MURKROW", 142, "male"] },
  "tools/battle-lab/mechanic-fly-player-murkrow-onix.json": { player: ["MURKROW", 142, "female"], opponent: ["ONIX", 117, "male"] },
  "tools/battle-lab/mechanic-bounce-player-spoink-onix.json": { player: ["SPOINK", 153, "male"], opponent: ["ONIX", 117, "female"] },
  "tools/battle-lab/mechanic-bounce-spoink-onix.json": { player: ["ONIX", 117, "female"], opponent: ["SPOINK", 153, "female"] },
};
for (const f of readdirSync(FX).filter(x => /^prep11-(fly|bounce)-.*\.json$/.test(x))) {
  const d = JSON.parse(readFileSync(`${FX}/${f}`, "utf8"));
  const sc = JSON.parse(readFileSync(d.scenario, "utf8")), parties = sc.overrides.parties;
  const name = (p) => byId(p.species).name.replace(/^SPECIES_/, "");
  const mon = (side) => LEGACY[d.scenario]?.[side]
    ?? [name(parties[side][0]), maxHp(parties[side][0]), parties[side][0].gender];
  const opp = OPPONENT_ATTACKER.has(d.scenario);
  const attackerSide = opp ? "opponent" : "player", targetSide = opp ? "player" : "opponent";
  const hp = d.fieldProfileHpAtActivation;
  const out = {
    schema: "flybounce-live-fixture/v1", move: d.move, sourceDraft: `${FX}/${f}`, probe: "tools/probe/run-battle-lab-rgb.py",
    scenario: d.scenario,
    attacker: { species: mon(attackerSide)[0], geometry: { side: attackerSide } },
    target: { species: mon(targetSide)[0], geometry: { side: targetSide } },
    fieldProfile: { playerHp: hp.player, playerMaxHp: mon("player")[1], opponentHp: hp.opponent,
      opponentMaxHp: mon("opponent")[1], playerGender: mon("player")[2], opponentGender: mon("opponent")[2] },
    denseWindow: d.draft.denseWindow,
    requestFields: { turn: d.bodyTurn - 1, power: d.draft.gAnimMovePower },
    // BattleScriptFirstChargingTurn prints STRINGID_EMPTYSTRING3 before attackanimation: the charge body shows a blank box.
    ...(d.bodyTurn === 1 ? { messageLines: ["", ""] } : {}),
  };
  const stem = `${d.move.toLowerCase()}-${attackerSide}-${out.attacker.species.toLowerCase()}-${out.target.species.toLowerCase()}-${d.bodyTurn === 1 ? "charge" : "strike"}`;
  writeFileSync(`${FX}/flybounce-live/${stem}.json`, JSON.stringify(out, null, 1) + "\n");
  console.log(stem, d.draft.denseWindow.startFrame, d.draft.denseWindow.endFrame);
}
