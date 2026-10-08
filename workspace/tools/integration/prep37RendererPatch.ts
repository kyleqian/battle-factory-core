/**
 * prep37: the proposed minimal src change for the MOVE_SUBSTITUTE body renderer, applied to a COPY of
 * src/engine/battleScene.ts (src is never edited).  The accepted branch (battleScene.ts:18552-18673) hard-codes
 * GOLEM->ONIX art, names and throws for any other pair; the patch swaps exactly those inputs for the same
 * generic readers the live FAKE_OUT branch already uses:
 *   - battler art: liveSceneOnBattlerArt(view.attacker / view.target) (back sheet / front sheet frame 0);
 *   - healthbox / message names: the displayed species of each side;
 *   - the doll geometry is untouched (x = attacker spriteCorner.x + x2, y = 65 / 24 = GetSubstituteSpriteDefault_Y - 32).
 * usage: npx vite-node tools/integration/prep37RendererPatch.ts --write=<out.ts>   (writes the patched copy)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
export function patchedBattleSceneSource(options: { dollYDelta?: number } = {}): string {
  const file = resolve(root, "src/engine/battleScene.ts");
  let s = readFileSync(file, "utf8");
  // absolute import specifiers so the copy resolves from any directory
  s = s.replace(/(from\s+|import\s+)"(\.\.?\/[^"]+)"/g, (_m, kw: string, spec: string) => `${kw}${JSON.stringify(resolve(dirname(file), spec))}`);
  const start = s.indexOf(`  if (state.config.move === "SUBSTITUTE") {`);
  const end = s.indexOf(`  if (state.config.move === "FAKE_OUT") {`);
  if (start < 0 || end < start) throw new Error("patch anchor missing: SUBSTITUTE branch");
  let branch = s.slice(start, end);
  const swap = (from: string | RegExp, to: string) => {
    const before = branch;
    branch = branch.replace(from, to);
    if (branch === before) throw new Error(`patch anchor missing: ${String(from).slice(0, 70)}`);
  };
  swap(/const playerToOpponent =\n\s+view\.attacker\.species === "GOLEM"\n\s+&& view\.attacker\.geometry\.side === "player"\n\s+&& view\.target\.species === "ONIX"\n\s+&& view\.target\.geometry\.side === "opponent";/,
    `const playerToOpponent = view.attacker.geometry.side === "player" && view.target.geometry.side === "opponent";`);
  swap(/const opponentToPlayer =\n\s+view\.attacker\.species === "GOLEM"\n\s+&& view\.attacker\.geometry\.side === "opponent"\n\s+&& view\.target\.species === "ONIX"\n\s+&& view\.target\.geometry\.side === "player";/,
    `const opponentToPlayer = view.attacker.geometry.side === "opponent" && view.target.geometry.side === "player";`);
  swap(/const golemSource = [\s\S]*?const golem = [\s\S]*?\};\n/, `const golem = liveSceneOnBattlerArt(view.attacker);\n`);
  swap(/const onixSource = [\s\S]*?const onix = [\s\S]*?: onixSource;\n/, `const onix = liveSceneOnBattlerArt(view.target);\n`);
  swap(`name: playerToOpponent ? "ONIX" : "GOLEM",`, `name: (playerToOpponent ? view.target : view.attacker).species,`);
  swap(`name: playerToOpponent ? "GOLEM" : "ONIX",`, `name: (playerToOpponent ? view.attacker : view.target).species,`);
  swap(`playerToOpponent ? "GOLEM used" : "Foe GOLEM used",`, `playerToOpponent ? \`\${view.attacker.species} used\` : \`Foe \${view.attacker.species} used\`,`);
  // negative control only: move the doll's source-derived corner row (GetSubstituteSpriteDefault_Y - 32)
  if (options.dollYDelta) swap(`(playerToOpponent ? 65 : 24) + dollDisplayed.sprite.y2`, `(playerToOpponent ? 65 : 24) + ${options.dollYDelta} + dollDisplayed.sprite.y2`);
  return s.slice(0, start) + branch + s.slice(end);
}

const writeArg = process.argv.find((arg) => arg.startsWith("--write="));
if (writeArg) writeFileSync(writeArg.slice("--write=".length), patchedBattleSceneSource());
