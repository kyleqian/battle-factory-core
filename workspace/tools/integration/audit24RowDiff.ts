/**
 * Live audit 24 (docs/live-audit-24.md): where a bad row of an audit24LeadCheck.ts window differs. Re-renders production's row j
 * (effect age max(0, j - N)) of the stem's first doll-free --move body and prints the diff bbox, the diff count per 16-px column
 * band and up to 6 sample pixels (ROM rgb vs production rgb). Inputs exactly as audit24LeadCheck.ts.
 * usage: node --experimental-strip-types --no-warnings tools/integration/audit24RowDiff.ts --scenarios=<dir> --move=<MOVE> --rows=<j,j..>
 *          <probe dir> <stem>
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveIdleLeadRows } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Battler = { species: number; hp: number; maxHP: number; status1: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; rng2: number; battlers: [Battler, Battler] };
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
const [dir, stem] = args.filter((a) => !a.startsWith("--")) as [string, string];
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const LCG_INV = 0xeeb9eb65;
const unstep = (v: number) => Number((BigInt.asUintN(32, BigInt(v) - 24691n) * BigInt(LCG_INV)) & 0xffffffffn);
const statusOf = (s1: number) => (s1 & 7 ? "sleep" : s1 & 0x88 ? "poison" : s1 & 0x10 ? "burn" : s1 & 0x20 ? "freeze" : s1 & 0x40 ? "paralysis" : "none") as "none";
const rows = (JSON.parse(readFileSync(`${dir}/${stem}-r1.json`, "utf8")) as { frames: Row[] }).frames;
const scen = JSON.parse(readFileSync(`${opt.scenarios}/${stem}.json`, "utf8")) as { overrides: { parties: Record<"player" | "opponent", { gender: string }[]> } };
const i = rows.findIndex((r, k) => r.script === `Move_${opt.move}` && rows[k - 1]?.script == null && !r.battlers[r.animAttacker]!.behindSubstitute);
const r = rows[i]!, attacker = r.animAttacker as 0 | 1, side = attacker === 0 ? "player" as const : "opponent" as const;
let bodyEnd = i; while (rows[bodyEnd]!.script !== null) bodyEnd++;
let dmg = 0; { const t = 1 - attacker, hp0 = rows[bodyEnd]!.battlers[t]!.hp; for (let n = bodyEnd; n < Math.min(rows.length, bodyEnd + 600); n++) if (rows[n]!.battlers[t]!.hp !== hp0) { dmg = hp0 - rows[n]!.battlers[t]!.hp; break; } }
const b0 = r.battlers;
const fixture = {
  move: opt.move, probe: "tools/integration/prep40Probe.py", scenario: stem,
  attacker: { species: speciesName(b0[attacker].species), geometry: { side } },
  target: { species: speciesName(b0[1 - attacker]!.species), geometry: { side: side === "player" ? "opponent" : "player" } },
  fieldProfile: { playerHp: b0[0].hp, playerMaxHp: b0[0].maxHP, opponentHp: b0[1].hp, opponentMaxHp: b0[1].maxHP,
    playerGender: scen.overrides.parties.player[0]!.gender as "male", opponentGender: scen.overrides.parties.opponent[0]!.gender as "male" },
  precedingBodies: [], displayedStatus: { player: statusOf(b0[0].status1), opponent: statusOf(b0[1].status1) },
  requestFields: { damage: dmg },
  presentationRngActivation: { value: unstep(rows[i + 1]!.rng2), source: "prep40Probe.py gRng2Value at activation + 1, stepped back once" },
} as Fixture;
const v0 = liveView(fixture, 0);
const lead = liveMoveIdleLeadRows((v0.effect as { request: BattleMoveAnimationRequest }).request, v0.field);
for (const j of (opt.rows ?? "0").split(",").map(Number)) {
  const row = rows[i + j]!;
  const rgb = inflateSync(readFileSync(`${dir}/${stem}-r1-rgb/${String(row.frame).padStart(5, "0")}.rgb.z`));
  const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, liveView(fixture, Math.max(0, j - lead)));
  let x0 = 240, y0 = 160, x1 = -1, y1 = -1, n = 0; const samples: string[] = [];
  for (let p = 0; p < 240 * 160; p++) {
    if (rgb[p * 3] === fb[p * 4] && rgb[p * 3 + 1] === fb[p * 4 + 1] && rgb[p * 3 + 2] === fb[p * 4 + 2]) continue;
    const x = p % 240, y = (p / 240) | 0; n++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (samples.length < 6 && n % 97 === 1) samples.push(`(${x},${y}) rom ${rgb[p * 3]},${rgb[p * 3 + 1]},${rgb[p * 3 + 2]} prod ${fb[p * 4]},${fb[p * 4 + 1]},${fb[p * 4 + 2]}`);
  }
  console.log(`${stem} row ${j} (frame ${row.frame}, age ${Math.max(0, j - lead)}, lag-row ${row.rng2 === rows[i + j - 1]!.rng2}) px ${n} bbox ${x0},${y0}..${x1},${y1} ${samples.join(" | ")}`);
}
