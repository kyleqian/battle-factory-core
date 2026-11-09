/**
 * speciesAudit14: the doll-free ("plain") bodies that attdollLiveCheck.ts measures from the activation row with age shift 0, re-measured
 * at the move's calibrated prep38 doll-free shift (LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.shift: ROM body row r shows adapter age r + shift).
 * Only rows with 0 <= r + shift < the adapter duration are compared (the rows outside belong to the neighbouring commands); both fresh
 * runs, per-row px digests. Fixture inputs exactly as attdollLiveCheck.ts (HP, status1, genders, preceding bodies, D3 activation value,
 * request.damage). usage: node --experimental-strip-types --no-warnings tools/integration/speciesAudit14PlainShift.ts
 *   --out=<json> [--pins=<json>] <probe dir> <scenario dir> <stem>@<activation frame> ...
 * --pins (d4w): also write, per target, the fixture built here and the run-1 ROM RGB888 sha256 of every compared row ([age, sha256]),
 * the pins tests/animation/liveD4wWidening.test.ts renders the production live view against.
 */
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_FRAMING } from "../../src/engine/liveSubstituteSwap.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type B = { species: number; hp: number; maxHP: number; status1: number };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; rng2: number; battlers: [B, B] };
const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith("--out="))?.slice(6);
const pinsOut = args.find((a) => a.startsWith("--pins="))?.slice(7);
const pins: Record<string, unknown>[] = [];
const [probeDir, scDir, ...targets] = args.filter((a) => !a.startsWith("--")) as [string, string, ...string[]];
const moveIds: Record<string, number> = Object.fromEntries(moveData.moves.map((m) => [m.move.replace(/^MOVE_/, ""), m.id]));
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const unstep = (v: number) => Number((BigInt.asUintN(32, BigInt(v) - 24691n) * 0xeeb9eb65n) & 0xffffffffn);
const hash = (b: string) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const statusOf = (s1: number) => (s1 & 7 ? "sleep" : s1 & 0x88 ? "poison" : s1 & 0x10 ? "burn" : s1 & 0x20 ? "freeze" : s1 & 0x40 ? "paralysis" : "none") as "none";
const results: Record<string, unknown>[] = [];
for (const t of targets) {
  const [stem, act] = t.split("@") as [string, string];
  const runs = [1, 2].map((r) => ({ rows: (JSON.parse(readFileSync(`${probeDir}/${stem}-r${r}.json`, "utf8")) as { frames: Row[] }).frames, rgb: `${probeDir}/${stem}-r${r}-rgb` }));
  const scen = JSON.parse(readFileSync(`${scDir}/${stem}.json`, "utf8")) as { overrides: { parties: Record<"player" | "opponent", { gender: string }[]> } };
  const rows = runs[0]!.rows;
  const a = rows.findIndex((r) => r.frame === Number(act));
  const attacker = rows[a]!.animAttacker as 0 | 1, side = attacker === 0 ? "player" as const : "opponent" as const;
  let end = a; while (rows[end]!.script !== null) end++;
  const pre: { moveId: number; side: "player" | "opponent" }[] = [];
  for (let i = 1; i < a; i++) {
    const r = rows[i]!;
    if (r.script?.startsWith("Move_") && r.script !== "Move_COUNT" && rows[i - 1]!.script == null) pre.push({ moveId: moveIds[r.script.slice(5)]!, side: r.animAttacker === 0 ? "player" : "opponent" });
  }
  const move = rows[a]!.script!.slice(5), moveId = moveIds[move]!;
  let dmg = 0; for (let n = end, hp0 = rows[end]!.battlers[1 - attacker]!.hp; n < Math.min(rows.length, end + 600); n++) if (rows[n]!.battlers[1 - attacker]!.hp !== hp0) { dmg = Math.max(0, hp0 - rows[n]!.battlers[1 - attacker]!.hp); break; }
  const b0 = rows[a]!.battlers;
  const fixture = {
    move, probe: "tools/integration/prep40Probe.py", scenario: stem,
    attacker: { species: speciesName(b0[attacker].species), geometry: { side } },
    target: { species: speciesName(b0[1 - attacker]!.species), geometry: { side: side === "player" ? "opponent" : "player" } },
    fieldProfile: { playerHp: b0[0].hp, playerMaxHp: b0[0].maxHP, opponentHp: b0[1].hp, opponentMaxHp: b0[1].maxHP,
      playerGender: scen.overrides.parties.player[0]!.gender, opponentGender: scen.overrides.parties.opponent[0]!.gender },
    precedingBodies: pre,
    displayedStatus: { player: statusOf(rows[a]!.battlers[0].status1), opponent: statusOf(rows[a]!.battlers[1].status1) },
    requestFields: { damage: dmg },
    presentationRngActivation: { value: unstep(rows[a + 1]!.rng2), source: "prep40Probe.py gRng2Value at activation + 1, stepped back once" },
  } as unknown as Fixture;
  const v0 = liveView(fixture, 0);
  const D = liveMoveAnimationDuration((v0.effect as { request: BattleMoveAnimationRequest }).request, v0.field)!;
  const shift = LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(moveId)?.shift ?? 0;
  if (pinsOut) {
    const ageRomSha256: [number, string][] = [];
    for (let r = 0; r <= end - a; r++) {
      const age = r + shift; if (age < 0 || age >= D) continue;
      const rgb = inflateSync(readFileSync(`${runs[0]!.rgb}/${String(rows[a + r]!.frame).padStart(5, "0")}.rgb.z`));
      ageRomSha256.push([age, createHash("sha256").update(rgb).digest("hex")]);
    }
    pins.push({ stem, activation: Number(act), fixture, ageRomSha256 });
  }
  const per = runs.map((run) => {
    const px: [number, number][] = [];
    for (let r = 0; r <= end - a; r++) {
      const age = r + shift; if (age < 0 || age >= D) continue;
      const rgb = inflateSync(readFileSync(`${run.rgb}/${String(rows[a + r]!.frame).padStart(5, "0")}.rgb.z`));
      const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, liveView(fixture, age));
      let n = 0; for (let p = 0; p < 240 * 160; p++) if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) n++;
      px.push([r, n]);
    }
    return px;
  });
  const res = { stem, activation: Number(act), move, side, shift, adapterDuration: D, romBodyRows: end - a, comparedRows: per[0]!.length,
    px: per.map((p) => p.reduce((s, x) => s + x[1], 0)), digests: per.map((p) => hash(JSON.stringify(p))), badRows: per[0]!.filter((x) => x[1] > 0).slice(0, 8) };
  results.push(res);
  console.log(`${stem}@${act} ${move} ${side} shift ${shift} D ${D} romBody ${res.romBodyRows} compared ${res.comparedRows} px ${res.px.join("/")} identical ${res.digests[0] === res.digests[1]} bad ${JSON.stringify(res.badRows)}`);
}
if (out) writeFileSync(out, `${JSON.stringify({ schema: "s14-plain-shift/v1", results })}\n`);
if (pinsOut) writeFileSync(pinsOut, `${JSON.stringify(pins)}\n`);
