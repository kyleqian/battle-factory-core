// inv142 (S10A, ISSUES #168 follow-up, docs/inv142-status-animation-invisible-battler.md): the Scene ON status-animation windows whose
// battler's sprite is INVISIBLE (fixtures/inv142/rom-r1.json `invisible` windows with a gAnimScriptActive rise: a Dig charge, then the
// in-love check immobilizes the digger / Yawn puts it to sleep; inv142Probes.sh dense direct-mGBA dumps, r1 == r2) compared THROUGH THE
// PRODUCTION RENDER PATH (createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView), gaf140Compare.ts's method. A
// constructed resolution segment [sprite-visibility {battler, visible: false} (production's hidden state at these commands: the exposure
// census finds them hidden by the semi-invulnerable live-body hide, which the view folds into the same visibility flag), previous message
// (or the battler's `status` command on the Yawn path, as production emits it), status-animation {battler, animation, minimumFrames =
// STATUS_ANIMATION_ADDED_ROWS (gate 0 on every window)}, next message]; command age a == ROM row X + 1 + a. Transplant: C(a) = ROM(X)
// except where production's frame P(a) differs from its reference R(a) (the effect dropped); full screen, rows a = -1 .. minimumFrames + 1;
// on the next command's rows the message-box band (y >= 112: its print) is reported apart.
// Per row also: the view's visibility[side].sprite (the battler stays hidden on every command row: `battlerHiddenRows`).
//   node --experimental-strip-types --no-warnings tools/integration/inv142Compare.ts <rom.json> <raw-dir> <out.json> [--neg=age+1|wrong-side]
// Controls (must fail on a tree that draws the sprites): age+1 (the effect one row late), wrong-side (the effect on the other battler).
// (A "battler drawn visible" control cannot fail under the transplant -- the reference draws the battler too; the ROM's gSprites
// invisible bit on every active row (rom-r1.json battlerInvisibleRows) is that evidence.)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";

const PRE = 32;
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const ANIMATION: Record<string, keyof typeof STATUS_ANIMATION_ADDED_ROWS> = { love: "INFATUATION", yawn: "SLP" };

export function inv142Window(scenarioPath: string, battler: 0 | 1, animation: keyof typeof STATUS_ANIMATION_ADDED_ROWS, neg?: string) {
  const parties = JSON.parse(readFileSync(scenarioPath, "utf8")).overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  const rows = STATUS_ANIMATION_ADDED_ROWS[animation];
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const hide = Object.freeze({ type: "sprite-visibility", eventSequence: 0, battler, visible: false, recall: false, timing: { minimumFrames: 1 } });
  const status = Object.freeze({ type: "status", eventSequence: 1, battler, before: 0, after: 3, timing: { minimumFrames: 1 } });
  const previous = animation === "SLP" ? status : message(1, ["PREVIOUS", "MESSAGE"]);
  const command = Object.freeze({ type: "status-animation", eventSequence: 2, battler: neg === "wrong-side" ? 1 - battler : battler, animation,
    timing: { minimumFrames: rows } });
  const commands = [hide, previous, command, message(3, ["NEXT", "MESSAGE"])];
  const first = 1;
  const shift = neg === "age+1" ? 1 : 0;
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView => createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
  const viewAt = (a: number) => a < 0 ? viewOf(first, 200) : a < rows ? viewOf(first + 1, Math.min(rows - 1, a + shift)) : viewOf(first + 2, a - rows);
  const draw = (view: BattleResolutionPresentationRenderView) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };
  const reference = (a: number) => draw({ ...viewAt(a), effect: null, ...(a < 0 ? {} : { postBodyShadowHidden: false }) });
  return { rows, viewAt, draw, reference };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
  const [romPath, rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string, string];
  const rom = JSON.parse(readFileSync(romPath, "utf8"));
  const result: Record<string, unknown> = {};
  let windows = 0, clean = 0;
  const digest = createHash("sha256");
  for (const [name, wins] of Object.entries<any[]>(rom)) {
    for (const w of wins.filter((x) => x.invisible && x.R !== undefined)) {
      windows++;
      const animation = ANIMATION[name.replace(/^inv142-/, "").split("-")[0]!]!;
      const win = inv142Window(`tools/integration/fixtures/inv142/scenarios/${name}.json`, w.battler, animation, neg);
      const raw = readFileSync(`${rawDir}/${w.dump.replace(/\.npz$/, ".rgb")}`);
      const firstRow = w.R - PRE;
      const romRowAt = (a: number) => { const i = w.X + 1 + a - firstRow; return raw.subarray(i * FRAME, (i + 1) * FRAME); };
      const base = romRowAt(-1);
      const perRow: [number, number, number][] = [];
      const productionSha: string[] = [];
      let fullPx = 0, firstBad: number | null = null, drawnRows = 0, hiddenRows = 0;
      const nextRows: { a: number; fullPx: number; boxPx: number }[] = [];
      for (let a = -1; a <= win.rows + 1; a++) {
        const view = win.viewAt(a);
        const fb = win.draw(view);
        if (a >= 0 && a < win.rows && !view.visibility[w.battler === 0 ? "player" : "opponent"].sprite) hiddenRows++;
        const ref = win.reference(a);
        productionSha.push(sha(fb));
        const romRow = romRowAt(a);
        let fp = 0, bp = 0, drawn = false;
        for (let o = 0; o < 240 * 160; o++) {
          const changed = fb[o * 4] !== ref[o * 4] || fb[o * 4 + 1] !== ref[o * 4 + 1] || fb[o * 4 + 2] !== ref[o * 4 + 2];
          if (changed) drawn = true;
          const src = changed ? fb : base, k = changed ? o * 4 : o * 3;
          if (src[k] === romRow[o * 3] && src[k + 1] === romRow[o * 3 + 1] && src[k + 2] === romRow[o * 3 + 2]) continue;
          fp++;
          if (Math.floor(o / 240) >= BOX_Y) bp++;
        }
        if (drawn && a >= 0 && a < win.rows) drawnRows++;
        const onNext = a >= win.rows;
        perRow.push([a, fp, bp]);
        if (onNext) nextRows.push({ a, fullPx: fp, boxPx: bp });
        const counted = onNext ? fp - bp : fp;
        fullPx += counted;
        if (counted && firstBad === null) firstBad = a;
      }
      if (fullPx === 0) clean++;
      const key = `${name}@${w.X}`;
      digest.update(`${key}:${JSON.stringify(perRow)}\n`);
      result[key] = {
        animation, side: w.battler === 0 ? "player" : "opponent", X: w.X, R: w.R, activeRows: w.activeRows,
        rows: { compared: perRow.length, first: -1, last: win.rows + 1, firstBad, productionDrawnCommandRows: drawnRows, battlerHiddenRows: hiddenRows,
          commandRows: win.rows },
        fullScreen: { px: fullPx }, zeroPx: fullPx === 0, nextCommandRows: nextRows,
        productionFrameSha: productionSha, perRowMismatches: perRow.filter((r) => r[1]),
      };
      console.log(key, animation, w.battler === 0 ? "player" : "opponent", `rows ${perRow.length}: full ${fullPx} px, firstBad ${firstBad}, production drew on ${drawnRows} command rows, battler hidden on ${hiddenRows} / ${win.rows}`);
    }
  }
  result.summary = { neg: neg ?? null, windows, zeroPxWindows: clean, perRowDigest: digest.digest("hex").slice(0, 16) };
  console.log(`invisible-battler windows, production path, full screen 0 px (rows statusanimation-1 .. release+2): ${clean} / ${windows}`);
  writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
}
