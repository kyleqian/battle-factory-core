// x2-history #148: replay the proposed x2 tracker over the presented bodies of ordinary generated-rental routes (generatedCommandAnimationReplay, the prep11 §4 recipe).
// EVERY presented move-animation command is collected (not only live-adapter ones).  Rule (see docs/x2-history-148.md): per battler idle|zeroed; a new species on the battler = send-in -> idle;
// after a body, roles whose move class is 'zeroed' (fixtures/x2-history/move-end-state-x2-onix-pairs.json) -> zeroed.  A later body's INPUT CHANGES when a battler is zeroed AND its species has a non-zero front rest x2 (opponent ONIX / RATTATA).
// usage: npx vite-node tools/integration/x2HistoryRouteReplay.ts [firstSeed] [count]    -> fixtures/x2-history/route-replay.json
import { readFileSync, writeFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
const FX = "tools/integration/fixtures/x2-history";
const table = JSON.parse(readFileSync(`${FX}/move-end-state-x2-onix-pairs.json`, "utf8")).table as Record<string, Record<string, { x2Class: string }>>;
const rest = JSON.parse(readFileSync(`${FX}/species-rest-x2.json`, "utf8")).nonZeroOpponentFront as Record<string, { x2: number }>;
const cls = (move: number, role: string) => (table[String(move)]?.[role]?.x2Class ?? "unknown").split(":")[0]!;
const first = Number(process.argv[2] ?? 0), count = Number(process.argv[3] ?? 40);
const patterns: (0 | 1 | 2 | 3)[][] = [[0, 1, 2, 3, 0, 1, 2, 3, 0, 1], [1, 2, 3, 0, 1, 2, 3, 0, 1, 2]];
const tot = { routes: 0, bodies: 0, bodiesWithRestSpecies: 0, laterBodiesInputChanged: 0, firstBodiesRest: 0, unknownClassBodies: 0, errors: 0 };
const byMove: Record<string, number> = {}, changed: unknown[] = [];
for (let seed = first; seed < first + count; seed++) {
  const slots = patterns[seed % 2]!;
  try {
    const seen = new Set<string>(); const st: Record<string, "idle" | "zeroed"> = {}; const lastSp: Record<string, string> = {}; let n = 0;
    generatedCommandAnimationReplay(seed, "on", slots, 0, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
      if (command?.type !== "move-animation" || !command.animation) return;
      const key = `${r.segmentIndex}:${r.commandIndex}:${command.animation.moveId}:${command.animation.turn}`;
      if (seen.has(key)) return; seen.add(key);
      const view = createBattleResolutionPresentationRenderView(r, undefined as never);
      const sp: Record<string, string> = { player: view.field.player.name, opponent: view.field.opponent.name };
      const a = command.animation; const attSide = a.attacker % 2 === 0 ? "player" : "opponent"; const tgtSide = attSide === "player" ? "opponent" : "player";
      for (const side of ["player", "opponent"]) if (lastSp[side] !== sp[side]) { st[side] = "idle"; lastSp[side] = sp[side]!; }
      tot.bodies++; n++;
      for (const side of ["opponent"] as const) {
        const hasRest = rest[sp[side]!] !== undefined;
        if (hasRest) { tot.bodiesWithRestSpecies++; if (n === 1 || st[side] === "idle") tot.firstBodiesRest++; else { tot.laterBodiesInputChanged++; changed.push({ seed, move: a.moveId, side, species: sp[side], key }); } }
      }
      for (const [role, side] of [["attacker", attSide], ["target", tgtSide]] as const) {
        const c = cls(a.moveId, role);
        if (c === "zeroed") st[side] = "zeroed"; else if (!["unchanged", "transient", "rest0"].includes(c)) { tot.unknownClassBodies++; byMove[a.moveId] = (byMove[a.moveId] ?? 0) + 1; }
      }
    });
    tot.routes++;
  } catch (e) { tot.errors++; }
}
const out = { seeds: [first, first + count - 1], ...tot, changedInputs: changed.slice(0, 40), unknownClassMoves: byMove };
writeFileSync(`${FX}/route-replay-${first}-${count}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ ...out, changedInputs: changed.length }));
