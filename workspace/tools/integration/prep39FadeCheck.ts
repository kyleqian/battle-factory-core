/**
 * prep39: General_SubstituteFade through the PRODUCTION compositor, dense, against fresh direct-mGBA frames (prep39Probe.py).
 * Every row: production renderBattleResolutionSceneOffView (battleScene.ts) draws the ordinary field (BG3, the other battler at
 * its tracked idle rest, healthboxes, the message box) from production field art (createBattleCommandFieldArtView, the doll
 * via the production substituteDoll flag); the fading battler's layer comes from prep39FadeModel.ts:
 *   doll  -> the production field with the doll shown (idle field, rows 0..1);
 *   bg-copy -> the production doll art (pic tiles / palette at the production doll origin) recoloured by the source white
 *              BlendPalette and alpha-blended over the field without the battler (BLDALPHA eva / evb, mGBA _mix on expanded
 *              components), under the healthbox / message layers;
 *   none  -> the field without the battler;
 *   mon   -> the production mon art at the swap x2 (as liveSubstituteSwap.ts draws swap rows).
 * No ROM value feeds the render: species / HP from the probe's battle state (the production field holds them), the other
 * battler's idle rest from production liveBattlerX2History over the scenario's preceding move bodies. A component check
 * compares the model's RAM rows (registers, palette coefficient, OBJ x2 / visibility / tile class, behindSubstitute) to the probe.
 *
 * usage: npx vite-node tools/integration/prep39FadeCheck.ts <probe.json:rgb-dir>... --out=<receipt.json> [--io-lag=0|1] [--neg=<x>]
 *   --neg: age+1 | alpha-step2 | no-white | lag0-obj  (negative controls; must FAIL)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionSceneOffView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView, battleCommandFieldArtElevation } from "../../src/engine/battleCommandFieldArt.ts";
import { mgbaColorFromBgr555 } from "../../src/engine/gbaPpu.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, liveMoveBattlerX2Input } from "../../src/engine/liveBattlerX2History.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { blendBgr555, fadeDisplayRow, fadeRamRow, fadeScriptRows, type Side } from "./prep39FadeModel.ts";

const FADE = "General_SubstituteFade";
type Sprite = { x: number; y: number; x2: number; y2: number; invisible: boolean };
type Battler = { sprite: Sprite; tileDigest: string; species: number; hp: number; maxHP: number; behindSubstitute: boolean;
  hwPalette: number[]; fadedPalette: number[]; unfadedPalette: number[]; shadow: { invisible: boolean } };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; bldcnt: number; bldalpha: number;
  bgPal8: number[]; bgPal9: number[]; battlers: [Battler, Battler] };
type Probe = { scenario: string; profile: string; scriptStarts: [number, string, number][]; rows: Row[] };

const args = process.argv.slice(2);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = opt("out");
const ioLag = Number(opt("io-lag") ?? "1");
const neg = opt("neg");
// The message box's wait cursor (owned by the production message queue, not by the fade): frozen phase age, or none.
const cursorArg = opt("cursor"); // "auto" (default): per window, the frozen phase among CURSOR_Y_OFFSETS that matches; or a number
let cursorAge: number | null = null;
const inputs = args.filter((a) => !a.startsWith("--"));
if (!out || !inputs.length) throw new Error("usage: see header");

const moveIds: Record<string, number> = Object.fromEntries(moveData.moves.map((m) => [m.move.replace(/^MOVE_/, ""), m.id]));
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

function fieldOf(probe: Probe, row: Row): BattleResolutionDisplayedField {
  const scenario = JSON.parse(readFileSync(probe.scenario, "utf8"));
  const make = (b: 0 | 1) => {
    const side = b === 0 ? "player" : "opponent";
    const mon = row.battlers[b];
    return {
      species: mon.species, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
      partyIndex: 0 as const, level: 50, hp: mon.hp, maxHP: mon.maxHP,
      gender: scenario.overrides.parties[side][0].gender as "male" | "female", status: "none" as const,
      moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    };
  };
  return { player: make(0), opponent: make(1) } as unknown as BattleResolutionDisplayedField;
}

function withDoll(field: BattleResolutionDisplayedField, side: Side, doll: boolean): BattleResolutionDisplayedField {
  const { substituteDoll: _d, ...mon } = field[side] as typeof field.player & { substituteDoll?: true };
  const battler = doll ? { ...mon, substituteDoll: true as const } : mon;
  return (side === "player" ? { ...field, player: battler } : { ...field, opponent: battler }) as BattleResolutionDisplayedField;
}

function baseView(field: BattleResolutionDisplayedField, art: ReturnType<typeof createBattleCommandFieldArtView>, lines: [string, string],
  hide: Side | null): BattleResolutionPresentationRenderView {
  const healthbox = (mon: typeof field.player) => ({
    name: mon.name, level: mon.level, gender: mon.gender === "genderless" ? "none" as const : mon.gender, status: mon.status,
    hpFraction: mon.hp / mon.maxHP, currentHp: mon.hp, maxHp: mon.maxHP,
  });
  return {
    field, fieldArt: art, healthboxes: { player: healthbox(field.player), opponent: healthbox(field.opponent) },
    message: { lines, visibleCharacters: 99 }, effect: null,
    visibility: { player: { sprite: hide !== "player", healthbox: true }, opponent: { sprite: hide !== "opponent", healthbox: true } },
    waitCursor: cursorAge === null ? null : { age: cursorAge }, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null, switchOut: null,
    partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
    // SpriteCB_EnemyShadow: hidden while an anim script runs / the battler is behind a substitute.
    postBodyShadowHidden: true,
  } as unknown as BattleResolutionPresentationRenderView;
}

/** Windows whose box shows a different message-queue state (super-effective Earthquake: the box is cleared, no cursor). */
const MESSAGE_OVERRIDES: Record<string, { lines: [string, string]; cursor: null }> = {
  "prep39-on-player-golem-onix@946": { lines: ["", ""], cursor: null },
};

const render = (view: BattleResolutionPresentationRenderView) => { const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionSceneOffView(fb, view); return fb; };

const results = [];
let failed = false;
for (const input of inputs) {
  const [probePath, rgbDir] = input.split(":") as [string, string];
  const probe = JSON.parse(readFileSync(probePath, "utf8")) as Probe;
  const rows = probe.rows;
  const starts = rows.map((r, i) => (r.script === FADE && rows[i - 1]?.script !== FADE ? i : -1)).filter((i) => i >= 0);
  for (const s of starts) {
    const attacker = rows[s]!.animAttacker as 0 | 1, side: Side = attacker === 0 ? "player" : "opponent";
    const other: Side = side === "player" ? "opponent" : "player";
    const scriptRows = fadeScriptRows(side);
    const window = rows.slice(s, s + scriptRows + 1);
    const dense = window.length === scriptRows + 1 && window.every((r, i) => r.frame === window[0]!.frame + i)
      && window.slice(0, scriptRows).every((r) => r.script === FADE) && window[scriptRows]!.script === null;
    // Production x2 history: every move body before the fade (scriptStarts; Move_* labels only).
    let history = LIVE_BATTLER_X2_IDLE;
    for (const [frame, label, who] of probe.scriptStarts) {
      if (frame >= window[0]!.frame || !label.startsWith("Move_") || label === "Move_COUNT") continue;
      history = applyLiveBattlerX2Event(history, { kind: "move-body", moveId: moveIds[label.slice(5)]!, attackerSide: who === 0 ? "player" : "opponent" });
    }
    const x2Input = liveMoveBattlerX2Input(history);
    const field0 = fieldOf(probe, window[0]!);
    const target = speciesName(window[0]!.battlers[attacker].species);
    // The message box is the production message queue's state before the fade (not the fade's): the dismissed STRINGID_SUBSTITUTEDMG
    // with its frozen cursor, except where the battle cleared the box first (MESSAGE_OVERRIDES, checked by the same pixels).
    const override = MESSAGE_OVERRIDES[`${probe.scenario.split("/").at(-1)!.replace(/\.json$/, "")}@${window[0]!.frame}`];
    const lines: [string, string] = override?.lines ?? ["The SUBSTITUTE took damage", `for ${side === "opponent" ? "Foe " : ""}${target}!`];
    const restOf = (art: ReturnType<typeof createBattleCommandFieldArtView>) => {
      // The other battler: opponent front idle rest after the tracked history (player: none).
      if (other !== "opponent") return art;
      const rest = liveBattlerAnchors("opponent", art, x2Input).frontIdleRest;
      return { ...art, opponent: { ...art.opponent, origin: { x: art.opponent.origin.x + rest.x2, y: art.opponent.origin.y + rest.y2 } } };
    };
    const dollField = withDoll(field0, side, true), monField = withDoll(field0, side, false);
    const dollArt = restOf(createBattleCommandFieldArtView(dollField));
    const monArt = restOf(createBattleCommandFieldArtView(monField));
    // Layers above the BG copy (BG0 message window, priority-0/1 healthbox OBJs): pixels the healthbox / window draws change.
    const noHud = baseView(dollField, dollArt, lines, side);
    const fbNoHud = render({ ...noHud, visibility: { player: { sprite: side !== "player", healthbox: false }, opponent: { sprite: side !== "opponent", healthbox: false } } } as never);
    const pic = dollArt[side].pic as unknown as { tileset: { columns: number; rows: number; tiles: number[][] }; palette: { r: number; g: number; b: number }[] };
    const origin = dollArt[side].origin;
    const elevation = battleCommandFieldArtElevation(dollArt[side], side);
    const pal5 = pic.palette.map((c) => (c.r >> 3) | ((c.g >> 3) << 5) | ((c.b >> 3) << 10));
    let component = 0;
    const componentMiss: { age: number; fields: string[] }[] = [];
    const evaluate = (cursor: number | null, split: { age: number; y: number } | null = null) => {
    cursorAge = cursor;
    const fbDoll = render(baseView(dollField, dollArt, lines, null));
    const fbNone = render(baseView(dollField, dollArt, lines, side));
    let zero = 0, total = 0, fieldPx = 0, messagePx = 0;
    component = 0; componentMiss.length = 0;
    const perRow: number[] = [];
    const nonZero: { age: number; frame: number; px: number; bbox: number[] }[] = [];
    const romDigest = createHash("sha256");
    for (const [age, row] of window.entries()) {
      if (split && split.age !== age) { perRow.push(-1); continue; }
      // component: model RAM row vs the probe.
      const m = fadeRamRow(side, age);
      const b = row.battlers[attacker];
      const digests = [...new Set(window.map((r) => r.battlers[attacker].tileDigest))];
      const cls = b.tileDigest === window[0]!.battlers[attacker].tileDigest ? "doll" : b.tileDigest === window.at(-1)!.battlers[attacker].tileDigest ? "mon" : "zero";
      const bgPal = side === "player" ? row.bgPal9 : row.bgPal8;
      const whiteOk = !m.bgCopy || bgPal.every((c, i) => i === 0 || c === blendBgr555(window[0]!.battlers[attacker].unfadedPalette[i]!, m.bgPaletteWhite));
      const checks: [string, boolean][] = [["bldcnt", row.bldcnt === m.ioBldcnt], ["bldalpha", row.bldalpha === m.ioBldalpha],
        ["x2", b.sprite.x2 === m.x2], ["invisible", b.sprite.invisible === m.objInvisible], ["tiles", cls === m.obj],
        ["behindSubstitute", b.behindSubstitute === m.behindSubstitute], ["bgPaletteWhite", whiteOk], ["threeTileBlocks", digests.length === 3]];
      // A BLDCNT / BLDALPHA read equal to the model's NEXT row = the register step one row early (alternate VBlank phase).
      const next = fadeRamRow(side, age + 1);
      const ahead = row.bldcnt === next.ioBldcnt && row.bldalpha === next.ioBldalpha;
      const bad = checks.filter(([, ok]) => !ok).map(([k]) => (ahead && (k === "bldcnt" || k === "bldalpha") ? `${k}-one-row-early` : k));
      if (!bad.length) component += 1; else if (componentMiss.length < 12) componentMiss.push({ age, fields: bad });
      // pixels
      const renderAge = neg === "age+1" ? age + 1 : age;
      let d = fadeDisplayRow(side, renderAge, ioLag);
      if (neg === "lag0-obj" && d.layer.kind === "mon") d = fadeDisplayRow(side, renderAge + 1, ioLag);
      let fb: Uint8Array;
      const layer = d.layer;
      if (layer.kind === "doll") fb = fbDoll;
      else if (layer.kind === "none") fb = fbNone;
      else if (layer.kind === "mon") {
        const moved = { ...monArt, [side]: { ...monArt[side], origin: { x: monArt[side].origin.x + layer.x2, y: monArt[side].origin.y } } };
        fb = render(baseView(monField, moved as never, lines, null));
      } else {
        fb = Uint8Array.from(fbNone);
        const eva = neg === "alpha-step2" ? Math.max(0, 16 - 2 * Math.ceil((16 - layer.eva) / 3)) : layer.eva;
        const evb = neg === "alpha-step2" ? 16 - eva : layer.evb;
        const white = neg === "no-white" ? 0 : layer.white;
        const colors = pal5.map((c) => mgbaColorFromBgr555(blendBgr555(c, white)));
        const { columns, tiles } = pic.tileset;
        for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
          const tile = tiles[ty * columns + tx];
          if (!tile) continue;
          for (let py = 0; py < 8; py++) for (let px = 0; px < 8; px++) {
            const idx = tile[py * 8 + px]!;
            if (idx === 0) continue;
            const x = origin.x + tx * 8 + px, y = origin.y - elevation + ty * 8 + py;
            if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
            const o = (y * 240 + x) * 4;
            // covered by the message window / a healthbox (priority above the BG copy)
            if (fbNone[o] !== fbNoHud[o] || fbNone[o + 1] !== fbNoHud[o + 1] || fbNone[o + 2] !== fbNoHud[o + 2] || y >= 112) continue;
            const c = colors[idx]!;
            const src = [c & 0xff, (c >>> 8) & 0xff, (c >>> 16) & 0xff];
            // --attribute: the alternate-phase row shows the NEXT alpha step from scanline split.y down (mid-picture write).
            const [e, f] = split && split.age === age && y >= split.y ? [eva - 1, evb + 1] : [eva, evb];
            for (let k = 0; k < 3; k++) fb[o + k] = layer.blend ? Math.min(255, Math.floor((src[k]! * e + fbNone[o + k]! * f) / 16)) : src[k]!;
          }
        }
      }
      const rgb = inflateSync(readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb.z`));
      if (createHash("sha256").update(rgb).digest("hex") !== row.sha256) throw new Error("RGB receipt drift");
      romDigest.update(rgb);
      let px = 0;
      const box = [240, 160, -1, -1];
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) {
          px++;
          const x = p % 240, y = Math.floor(p / 240);
          if (y < 112) fieldPx++; else messagePx++;
          box[0] = Math.min(box[0]!, x); box[1] = Math.min(box[1]!, y); box[2] = Math.max(box[2]!, x); box[3] = Math.max(box[3]!, y);
        }
      }
      perRow.push(px);
      total += px;
      if (px === 0) zero += 1; else if (nonZero.length < 40) nonZero.push({ age, frame: row.frame, px, bbox: box });
    }
    return { zero, total, fieldPx, messagePx, perRow, nonZero, romDigest: romDigest.digest("hex").slice(0, 16) };
    };
    // The wait cursor of the dismissed "took damage" message is frozen at the phase of the dismissing press (message host).
    const phases: (number | null)[] = override ? [null] : cursorArg === undefined || cursorArg === "auto" ? [9, 0, 18] : [Number(cursorArg)];
    let bestPhase: number | null = phases[0] ?? null;
    let best = evaluate(bestPhase);
    for (const phase of phases.slice(1)) { const e = evaluate(phase); if (e.total < best.total) { best = e; bestPhase = phase; } }
    best = evaluate(bestPhase);
    // Alternate VBlank phase (D4 class; never production input): for each residual row whose BLDALPHA read is one step ahead of
    // the model, the scanlines from which the next step reproduces the ROM frame exactly.
    const alternatePhase: { age: number; px: number; splitScanlines: number[] }[] = [];
    if (args.includes("--attribute")) {
      for (const miss of best.nonZero) {
        const splits: number[] = [];
        for (let y = 0; y <= 160; y++) if (evaluate(bestPhase, { age: miss.age, y }).perRow[miss.age] === 0) splits.push(y);
        alternatePhase.push({ age: miss.age, px: miss.px, splitScanlines: splits.length ? [splits[0]!, splits.at(-1)!] : [] });
      }
      best = evaluate(bestPhase);
    }
    const { zero, total, fieldPx, messagePx, perRow, nonZero } = best;
    const policyExact = dense && zero === window.length && component === window.length;
    // Static fallback cost (no fade presented): every window row shows the pre-state doll or the post-state mon.
    const fbMon = render(baseView(monField, monArt, lines, null));
    const fbDollHold = render(baseView(dollField, dollArt, lines, null));
    const hold = (fb: Uint8Array) => window.reduce((sum, row) => {
      const rgb = inflateSync(readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb.z`));
      let px = 0;
      for (let p = 0; p < 240 * 112; p++) if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) px++;
      return sum + px;
    }, 0);
    const earlyOnly = componentMiss.length < 12 && componentMiss.every((m) => m.fields.every((f) => f.endsWith("-one-row-early")));
    const attributed = alternatePhase.length === nonZero.length && alternatePhase.every((a) => a.splitScanlines.length === 2
      && componentMiss.some((m) => m.age === a.age));
    const verdict = policyExact ? "policy-exact" : dense && earlyOnly && attributed && args.includes("--attribute") ? "alternate-phase-attributed" : "FAIL";
    if (verdict === "FAIL") failed = true;
    const fallback = { dollHoldFieldPx: hold(fbDollHold), monHoldFieldPx: hold(fbMon) };
    const result = {
      probe: probePath.split("/").at(-1), profile: probe.profile, side, fading: target, other: speciesName(window[0]!.battlers[1 - attacker]!.species),
      frames: [window[0]!.frame, window.at(-1)!.frame], rows: window.length, dense, otherIdleRestX2: other === "opponent" ? liveBattlerAnchors("opponent", createBattleCommandFieldArtView(field0), x2Input).frontIdleRest.x2 : 0,
      verdict, frozenCursorYOffset: bestPhase === null ? null : [0, 1, 2, 1][Math.floor(bestPhase / 9) % 4], ...(override ? { messageOverride: override.lines } : {}),
      fallback, componentRows: component, componentMiss, ...(alternatePhase.length ? { alternatePhase } : {}), zeroPxRows: zero, totalPx: total, fieldBandPx: fieldPx, messageBoxPx: messagePx, nonZero,
      perRowDigest: createHash("sha256").update(JSON.stringify(perRow)).digest("hex").slice(0, 16), romWindowSha256: best.romDigest,
    };
    results.push(result);
    console.log(`${result.verdict} ${result.probe} ${side} ${target} vs ${result.other} frames ${result.frames.join("..")} rows ${window.length} dense=${dense} cursorY ${result.frozenCursorYOffset} component ${component}/${window.length}${componentMiss.length ? " miss " + JSON.stringify(componentMiss) : ""} 0px ${zero}/${window.length} total ${total} (field ${fieldPx}, message ${messagePx})${nonZero.length ? " first " + JSON.stringify(nonZero.slice(0, 6)) : ""}`);
  }
}
writeFileSync(out, `${JSON.stringify({ schema: "prep39-fade-check/v1", ioLag, neg: neg ?? null, results }, null, 1)}\n`);
console.log(failed ? "FAIL" : `PASS: ${results.length} windows (${results.filter((r) => r.verdict === "policy-exact").length} policy-exact: every row 0 px, component exact; the rest alternate-phase rows attributed)`);
if (failed && !neg) process.exitCode = 1;
