/**
 * prep32 Nightmare checker library (field check + reducer inputs): every caller-owned per-age input of `nightmareAtAge` from `prep32NightmareModel.ts`, compared field by
 * field with each window's ROM rows; the unchanged reducer fed with those inputs (at the window's program age) compared with the ROM
 * tasks / clone / cursor / registers / animation RNG.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { nightmareAtAge, type NightmareLiveInputs } from "../../src/animation/nightmare.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import ghostAsset from "../../src/assets/gen/battle-anim-ghost-bg.json" with { type: "json" };
import { firstInactive, monbgBg, monbgOrigin, nmBattlers, nmClone, nmOrders, nmPalettes, nmRegisters, programAge, type NmKnown, type NmPhase, type NmSprite, type Side } from "./prep32NightmareModel.ts";

type Json = Record<string, any>;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export const loadRows = (path: string): Json[] => (JSON.parse((path.endsWith(".gz") ? gunzipSync(readFileSync(path)) : readFileSync(path)).toString("utf8")) as Json).frames;
export const compact = (e: Json): NmSprite => ({ slot: e.slot, template: e.template.symbol, callback: e.callback.symbol, x: e.x, y: e.y, x2: e.x2, y2: e.y2,
  subpriority: e.subpriority, attr: e.attr, flags: e.flags, matrixNum: e.matrixNum, matrix: e.matrix, data: e.data });
/** P: gBattleAnimBgPalette_Ghost words from the extracted asset (mGBA 5 -> 8 bit expansion inverted: >> 3). */
export const GHOST_PALETTE: number[] = (ghostAsset as Json).palette.map((c: Json) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10);
export const ACCEPTED: readonly string[] = ["tools/compare/evidence/nightmare-player-dense-state.json.gz:player", "tools/compare/evidence/nightmare-opponent-dense-state.json.gz:opponent"];
/** T measured from the window (never derived): lag at 149 = 169 rows; BG palette restore row = first row >= 100 whose bank 2 equals the activation bank 2. */
export function measuredPhase(rows: Json[]): NmPhase {
  const b2 = (r: Json) => JSON.stringify(r.unfadedPalette.slice(32, 48)), r0 = b2(rows[0]!);
  const restore = rows.findIndex((r, i) => i >= 100 && b2(r) === r0);
  return { lag149: rows.length === 169, restoreRow: restore as 148 | 149 };
}
const TASKS = { fadeToGhost: 0, clone: 0, shake: 2, fadeRestore: 2, monbgUpdate: 1, monbgClear: 0 } as const;   // K: task slots (same in every window)
export function knownFor(rows: Json[], side: Side, lend: "corpus" | "entry"): NmKnown {
  const r0 = rows[0]!, a = compact(r0.battlerSprites.attacker), t = compact(r0.battlerSprites.target);
  const hostKeys = new Map<number, readonly [number, number]>();
  for (const s of r0.sprites as Json[]) if (s.slot !== a.slot && s.slot !== t.slot) hostKeys.set(s.slot, [(s.attr[2] >>> 10 & 3) << 8 | s.subpriority, s.attr[0] & 0xff]);
  const dummy = (r0.sprites as Json[]).find((s) => s.callback.symbol === "SpriteCallbackDummy")!.callback.address as number;
  return { attackerSide: side, registers0: r0.registers, unfaded0: r0.unfadedPalette, faded0: r0.fadedPalette, hardware0: r0.hardwarePalette,
    attacker0: a, target0: t, order0: lend === "entry" ? [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, ...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER] : r0.spriteOrder,
    hostKeys, inUse0: (r0.sprites as Json[]).map((s) => s.slot), ghostPalette: GHOST_PALETTE,
    battlerMatrix: { attacker: side === "player" ? 1 : 2, target: side === "player" ? 2 : 1 }, spriteCallbackDummy: dummy };
}
/** The reducer's NightmareLiveInputs for a window row, every caller-owned field from the model (K for allocator / matrices / seeds). */
export function liveInputs(row: number, rows: Json[], k: NmKnown, p: NmPhase, orders: number[][]): NightmareLiveInputs {
  const r0 = rows[0]!, b = nmBattlers(row, k, p), pal = nmPalettes(row, k, p), o = monbgOrigin(k), bg = monbgBg(k);
  return {
    attackerSide: k.attackerSide, targetSide: k.attackerSide === "player" ? "opponent" : "player", attackerSpecies: "-", targetSpecies: "-",
    attackerPictureOrigin: { x: k.attacker0.x, y: k.attacker0.y }, targetPictureOrigin: { x: k.target0.x, y: k.target0.y },
    attackerSprite: b.attacker, targetSprite: b.target, clone: nmClone(k),
    tasks: { fadeToGhost: TASKS.fadeToGhost, clone: TASKS.clone, shake: TASKS.shake, fadeRestore: TASKS.fadeRestore },
    monBg: { updateTaskSlot: TASKS.monbgUpdate, clearTaskSlot: TASKS.monbgClear, selected: bg === "bg1" ? "BG1" : "BG2", backgroundOrigin: o,
      inBg2: bg === "bg1" ? 0 : 1, battler: k.attackerSide === "player" ? 1 : 0, setupControl: nmRegisters(firstInactive(p) - 1, k, p)[`${bg}cnt`]! },
    painterOrder: orders[row]!, resources: r0.resourceAllocators, matrixBitmap: r0.resourceAllocators.matrixBitmap, matrices: r0.softwareMatrices,
    palettes: pal, backgrounds: { battle: "battle", ghost: "ghost", monBg: "monbg", clear: "clear", clearedGhost: "cleared-ghost", restoredBattle: "restored" },
    registers: nmRegisters(row, k, p), audio: { targetPan: k.attackerSide === "player" ? 63 : -64 }, animationRngSeed: r0.animationRng,
    gameplayRng: r0.rawBattleState?.gameplayRng, gameplayState: r0.immutableState,
  };
}
export const NEG = process.argv.find((x) => x.startsWith("--neg="))?.slice(6) ?? "";
export const LEND = (process.argv.find((x) => x.startsWith("--lend="))?.slice(7) ?? "corpus") as "corpus" | "entry";
export function negKnown(k: NmKnown): NmKnown {
  if (NEG === "palette") return { ...k, ghostPalette: k.ghostPalette.map((w, i) => (i === 9 ? w ^ 1 : w)) };
  if (NEG === "registers") return { ...k, registers0: { ...k.registers0, bg3cnt: k.registers0.bg3cnt! ^ 1 } };
  if (NEG === "shake") return { ...k, target0: { ...k.target0, x: k.target0.x + 1 } };
  return k;
}
export const negPhase = (p: NmPhase): NmPhase => (NEG === "phase" ? { ...p, lag149: !p.lag149 } : p);

export function checkWindow(path: string, side: Side): Json {
  const rows = loadRows(path), p0 = measuredPhase(rows), p = negPhase(p0), k = negKnown(knownFor(rows, side, LEND));
  const n = rows.length, orders = nmOrders(n, k, p), out: Json = { window: path.split("/").pop()!.replace(/(-r1)?\.json(\.gz)?$/, ""), side, rows: n, phase: p0, lend: LEND, fields: {} };
  const bump = (f: string, ok: boolean, r: number) => { const e = (out.fields[f] ??= { exact: 0, rows: 0, bad: [] as number[] }); e.rows += 1; if (ok) e.exact += 1; else if (e.bad.length < 10) e.bad.push(r); };
  const clone = nmClone(k), slots = [k.attacker0.slot, k.target0.slot, clone.slot];
  for (let r = 0; r < n; r += 1) {
    const row = rows[r]!, pal = nmPalettes(r, k, p), b = nmBattlers(r, k, p), a = programAge(r, p);
    bump("unfadedPalette", same(pal.unfaded, row.unfadedPalette), r); bump("fadedPalette", same(pal.faded, row.fadedPalette), r);
    bump("hardwarePalette", same(pal.hardware, row.hardwarePalette), r);
    bump("registers", same(nmRegisters(r, k, p), row.registers), r);
    bump("attackerSprite", same(b.attacker, compact(row.battlerSprites.attacker)), r); bump("targetSprite", same(b.target, compact(row.battlerSprites.target)), r);
    bump("painterOrder64", same(orders[r], row.spriteOrder), r);
    const rank = (o: number[]) => slots.map((s) => o.indexOf(s)).join(",");
    bump("painterRanks(attacker,target,clone)", rank(orders[r]!) === rank(row.spriteOrder), r);
    bump("allocator+matrices", same(row.resourceAllocators, rows[0]!.resourceAllocators) && same(row.softwareMatrices, rows[0]!.softwareMatrices), r);
    const bgx = row.battleBg[`gBattle_${monbgBg(k).toUpperCase()}_X`], bgy = row.battleBg[`gBattle_${monbgBg(k).toUpperCase()}_Y`];
    const o = monbgOrigin(k), sh = a >= 45 && a <= 120 && Math.floor((a - 45) / 2) % 2 === 0 ? 3 : 0;
    bump("monbgSourceScroll", a >= 40 && a < 130 ? bgx === o.x - sh && bgy === o.y : bgx === 0 && bgy === 0, r);
    const st = nightmareAtAge(a, liveInputs(r, rows, k, p, orders));
    bump("reducer.cursor", st.active === row.animScriptActive && st.source.pointerOffset === row.scriptOffset && st.source.wait === row.scriptWait, r);
    const tasksOk = same(st.tasks.map((t) => ({ slot: t.slot, callback: t.callback, data: t.data })), row.tasks.map((t: Json) => ({ slot: t.slot, callback: t.func.symbol, data: t.data })));
    // T: with the BG restore on row 148 the Task_FadeToBg state-3 write lands on row 148; the reducer encodes the restore-149 phase (state 2 there)
    if (r === 148 && p.restoreRow === 148) bump("reducer.tasks@T-row148", tasksOk, r); else bump("reducer.tasks", tasksOk, r);
    const rc = row.sprites.find((s: Json) => s.callback.symbol === "TranslateSpriteLinearFixedPoint"), sc = st.sprites[0];
    bump("reducer.clone", rc ? !!sc && same([sc.slot, sc.attr, sc.x, sc.y, sc.x2, sc.y2, sc.subpriority, sc.flags, sc.matrixNum, sc.matrix, sc.data],
      [rc.slot, rc.attr, rc.x, rc.y, rc.x2, rc.y2, rc.subpriority, rc.flags, rc.matrixNum, rc.matrix, rc.data]) : !sc, r);
    bump("reducer.registers", same(st.registers, row.registers), r);
    bump("reducer.targetShake", st.battlers.target.shake.x === row.battlerSprites.target.x2, r);
    bump("reducer.animationRng", st.rng.animation === row.animationRng, r);
    if (r > 0) bump("hardwareOam=prevSoftware(latch)", same(row.hardwareOam, rows[r - 1]!.softwareOam), r);
  }
  const vramRows: number[] = []; for (let r = 1; r < n; r += 1) if (!same(rows[r]!.bgVram, rows[r - 1]!.bgVram)) vramRows.push(r);
  out.bgVramChangeRows = vramRows;
  out.activationOrderFreeTail = rows[0]!.spriteOrder.slice(9);
  out.activationOrderIsKnownEntry = same(rows[0]!.spriteOrder, [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, ...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER]);
  out.allExact = Object.values(out.fields).every((f: any) => f.exact === f.rows);
  for (const f of Object.values(out.fields) as Json[]) if (!f.bad.length) delete f.bad;
  return out;
}
