/**
 * ISSUES #142 scope scan (evidence only, no production edit).
 *
 * For every id in LIVE_MOVE_ANIMATION_IDS renders the production live path with an elevated
 * opponent (GOLBAT) in both roles at ages 0/1 and tests the source enemy shadow, and renders an
 * ONIX opponent attacker against a zero-idle-offset twin of the engine (a scratch copy of src/ whose
 * speciesFrontIdleRestOffsetOrZero returns 0) to detect whether the rest offset is applied.
 *
 *   node --experimental-strip-types tools/integration/issue142Scan.ts
 * Modes: (default) orchestrate; `render <root>` child mode prints JSON for one engine root.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function renderMode(root: string, capture: boolean) {
  const imp = (p: string) => import(`${root}/src/${p}`);
  const { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration } = await imp("engine/liveMoveAnimation.ts");
  const { renderBattleResolutionLiveView } = await imp("engine/battleScene.ts");
  const { createBattleCommandFieldArtView } = await imp("engine/battleCommandFieldArt.ts");
  const { createKnownEntrySpriteAllocatorProvider } = await imp("engine/knownEntrySpriteAllocator.ts");
  const { prepareLiveMoveSpriteAllocator } = await imp("engine/liveMoveSpriteAllocator.ts");
  const stats = JSON.parse(readFileSync(`${root}/src/data/gen/species-stats.json`, "utf8"));
  const shadow = JSON.parse(readFileSync(`${root}/src/assets/gen/battle-enemy-shadow.json`, "utf8"));
  const sid = (n: string) => stats.species.find((s: any) => s.name === `SPECIES_${n}`).id;
  const mon = (n: string, side: string, x: number, y: number) => ({
    species: sid(n), speciesSymbol: n, name: n, level: 50, hp: 120, maxHP: 120, gender: "male",
    status: "none", side: side === "player" ? "player" : "trainer", battler: side === "player" ? 0 : 1,
    partyIndex: 0, spriteCorner: { x, y }, moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0,
  });
  const sx = 176 - shadow.width / 2, sy = 40 + 29 - shadow.height / 2;
  const shadowCount = (fb: Uint8Array) => {
    let n = 0;
    for (const p of shadow.mask) {
      const o = ((sy + Math.floor(p / shadow.width)) * 240 + sx + (p % shadow.width)) * 4;
      if (fb[o] === shadow.color.r && fb[o + 1] === shadow.color.g && fb[o + 2] === shadow.color.b) n++;
    }
    return n;
  };
  const render = (id: number, attacker: 0 | 1, opp: string, age: number) => {
    const field = { player: mon("PHANPY", "player", 40, 56), opponent: mon(opp, "opponent", 144, 16) };
    const request = { moveId: id, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 };
    let spriteAllocatorInput;
    try {
      spriteAllocatorInput = prepareLiveMoveSpriteAllocator(
        createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove, request).input;
    } catch { /* adapter has no plan: production passes none either */ }
    const hb = (m: any) => ({ name: m.name, level: 50, gender: "male", status: "none", hpFraction: 1, currentHp: 120, maxHp: 120 });
    const view = {
      field, fieldArt: createBattleCommandFieldArtView(field),
      healthboxes: { player: hb(field.player), opponent: hb(field.opponent) },
      message: { lines: ["X used", "Y!"], visibleCharacters: 99 },
      effect: { type: "move", request, age, spriteAllocatorInput },
      visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
      waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
      switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
    };
    const fb = new Uint8Array(240 * 160 * 4);
    (globalThis as any).__i142 = capture && age === 0 && opp === "GOLBAT" ? { n: 0, chains: new Map<string, number>() } : null;
    renderBattleResolutionLiveView(fb, view as any);
    const cap = (globalThis as any).__i142;
    (globalThis as any).__i142 = null;
    return { fb, chains: cap ? [...cap.chains.keys()] : [] };
  };
  const out: Record<string, any> = {};
  for (const id of LIVE_MOVE_ANIMATION_IDS as number[]) {
    const row: Record<string, any> = {};
    try {
      row.durationPlayer = liveMoveAnimationDuration({ moveId: id, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 });
      for (const [role, attacker] of [["asTarget", 0], ["asAttacker", 1]] as const) {
        const a0 = render(id, attacker, "GOLBAT", 0), a1 = render(id, attacker, "GOLBAT", 1);
        row[role] = { shadow0: shadowCount(a0.fb), shadow1: shadowCount(a1.fb), chains0: a0.chains };
      }
      row.controlOnixTarget0 = shadowCount(render(id, 0, "ONIX", 0).fb);
      row.onixAttackerHashes = [0, 1, 2, 6].map(age =>
        createHash("sha256").update(render(id, 1, "ONIX", age).fb).digest("hex"));
    } catch (e) { row.error = String((e as Error).message ?? e); }
    out[id] = row;
  }
  process.stdout.write(`@@JSON@@${JSON.stringify(out)}`);
}

function runChild(root: string, capture: boolean) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", resolve(repo, "tools/integration/issue142Scan.ts"),
    "render", root, capture ? "capture" : "plain"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const i = r.stdout.indexOf("@@JSON@@");
  if (i < 0) throw new Error(`child failed: ${r.stderr.slice(-2000)}`);
  return JSON.parse(r.stdout.slice(i + 8));
}

if (process.argv[2] === "render") {
  await renderMode(process.argv[3]!, process.argv[4] === "capture");
} else {
  const twin = resolve(repo, ".integration/issue142-zero-idle");
  rmSync(twin, { recursive: true, force: true });
  mkdirSync(twin, { recursive: true });
  cpSync(resolve(repo, "src"), resolve(twin, "src"), { recursive: true });
  // zero-idle twin: only the helper's return value changes (same-length edit of one expression)
  const idle = resolve(twin, "src/animation/speciesIdleAnim.ts");
  const idleSrc = readFileSync(idle, "utf8");
  const needle = "return speciesFrontIdleRestOffset(species) ?? { x2: 0, y2: 0 };";
  if (!idleSrc.includes(needle)) throw new Error("idle helper shape changed");
  writeFileSync(idle, idleSrc.replace(needle, "return { x2: 0, y2: 0 };"));
  // call-chain capture twin: single-line hook inside setPixel keeps battleScene line numbers aligned
  const bs = resolve(twin, "src/engine/battleScene.ts");
  const bsSrc = readFileSync(bs, "utf8");
  const sig = "export function setPixel(fb: Uint8Array, x: number, y: number, c: RgbColor): void {";
  if (!bsSrc.includes(sig)) throw new Error("setPixel shape changed");
  writeFileSync(bs, bsSrc.replace(sig, `${sig} { const g = (globalThis as any).__i142; if (g && (++g.n % 4096) === 1) { const f = (new Error().stack ?? "").split("\\n").filter(l => l.includes("battleScene.ts")).map(l => l.trim().replace(/^at /, "").replace(/\\(?file:\\/\\/.*battleScene\\.ts:(\\d+):\\d+\\)?/, "L$1")).slice(1, 6).reverse().join(" > "); g.chains.set(f, 1); } }`));
  const real = runChild(repo, false);
  console.error("real done");
  const zero = runChild(twin, true);
  const rows: any[] = [];
  const missingShadowAsTarget: number[] = [], missingShadowAsAttacker: number[] = [], missingOpponentIdle: number[] = [], errors: number[] = [], shadowStillAtRow1: number[] = [];
  for (const id of Object.keys(real)) {
    const r = real[id], z = zero[id];
    if (r.error || z.error) { errors.push(+id); rows.push({ id: +id, error: r.error ?? z.error }); continue; }
    const full = 200;
    const row = {
      id: +id,
      durationPlayer: r.durationPlayer,
      shadowRow0: { asTarget: r.asTarget.shadow0, asAttacker: r.asAttacker.shadow0 },
      shadowRow1: { asTarget: r.asTarget.shadow1, asAttacker: r.asAttacker.shadow1 },
      shadowRow1Absent: { asTarget: r.asTarget.shadow1 === 0, asAttacker: r.asAttacker.shadow1 === 0 },
      controlOnixTargetShadowRow0: r.controlOnixTarget0,
      opponentAttackerIdleApplied: JSON.stringify(r.onixAttackerHashes) !== JSON.stringify(z.onixAttackerHashes),
      rendererChainAtAge0: { asTarget: z.asTarget.chains0, asAttacker: z.asAttacker.chains0 },
    };
    rows.push(row);
    if (row.shadowRow0.asTarget < full) missingShadowAsTarget.push(+id);
    if (row.shadowRow0.asAttacker < full) missingShadowAsAttacker.push(+id);
    if (!row.opponentAttackerIdleApplied) missingOpponentIdle.push(+id);
    if (row.shadowRow1.asTarget > 0 || row.shadowRow1.asAttacker > 0) shadowStillAtRow1.push(+id);
  }
  const summary = { ids: rows.length, missingShadowAsTarget, missingShadowAsAttacker, missingOpponentIdle, shadowStillAtRow1, errors };
  mkdirSync(resolve(repo, "tools/integration/fixtures"), { recursive: true });
  writeFileSync(resolve(repo, "tools/integration/fixtures/issue142-scan.json"),
    JSON.stringify({ generated: "issue142Scan.ts", shadowFullPixels: 200, summary, rows }, null, 1) + "\n");
  console.log(JSON.stringify(summary));
}
