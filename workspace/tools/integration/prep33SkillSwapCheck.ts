/**
 * prep33: MOVE_SKILL_SWAP (285) derived-field check. Derives what is source / species / known-entry determined (class A bounds from the species
 * pic coords = GetBattlerSpriteCoordAttr LEFT/RIGHT/TOP/BOTTOM, K orb slot / matrix allocations and task slots, T firstInactiveAge 194 / 195)
 * and checks, every row of every window, the reducer-owned per-age state against the ROM: source cursor, the two AnimTask_SkillSwap_Step and
 * two AnimTask_BlendMonInAndOut_Step task records, all 24 orbs (slot, matrixNum, x, y, x2, y2, data[0..7]) and the orb + battler HARDWARE OAM
 * content (prep20 rule hardwareOam[row] = build(state row - 1): attr0 / attr1 position + affine bit + matrixNum, attr2), compared as a set.
 * NOT modelled here (lent from the row, see docs/next-adapters-prep33.md s2.4): the per-age hardware OAM ORDER, orb affine matrices, the psychic-BG
 * / BlendMonInAndOut palette program, bldy, VRAM handles, shared task data, audio.
 * usage: npx vite-node tools/integration/prep33SkillSwapCheck.ts <dense.json[.gz]>:<attackerSide> ... [--neg=anchor|lag] --out=<receipt.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { skillSwapAtAge, skillSwapDisplayPlan, type SkillSwapLiveInputs } from "../../src/animation/skillSwap.ts";
import { coordX, picOffsetY, speciesName, yDelta, yWithElevation } from "./prep30Species.ts";

type Json = Record<string, any>; type Side = "player" | "opponent";
const args = process.argv.slice(2), neg = args.find((a) => a.startsWith("--neg="))?.slice(6), out = args.find((a) => a.startsWith("--out="))?.slice(6);
const ref = resolve(import.meta.dirname, "../../reference/pokeemerald/src/data/pokemon_graphics");
const sizes = (file: string) => new Map([...readFileSync(resolve(ref, file), "utf8").matchAll(/\[SPECIES_(\w+)\]\s*=\s*\{\s*\.size\s*=\s*MON_COORDS_SIZE\((\d+),\s*(\d+)\)/g)]
  .map((m) => [m[1]!, [Math.ceil(Number(m[2]) / 8) * 8, Math.ceil(Number(m[3]) / 8) * 8] as const]));
const FRONT = sizes("front_pic_coordinates.h"), BACK = sizes("back_pic_coordinates.h");
/** A: GetBattlerSpriteCoordAttr (battle_anim_mons.c:2273-2280) from X_2 / Y_PIC_OFFSET and the species pic size. */
export function skillSwapBounds(species: number, side: Side, dx = 0) {
  const [w, h] = (side === "player" ? BACK : FRONT).get(speciesName(species)) ?? [64, 64];
  const x = coordX(side) + dx, y = picOffsetY(species, side);
  return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
}
/** K (identical in 6/6 windows): the lowest-free (slot, matrix) pairs of the known entry (slots 6 / 8 and matrices 1 / 2 are the battlers) and task slots. */
export const SS_K = Object.freeze({
  orbPairs: [[3, 0], [4, 3], [5, 4], [7, 5], [9, 6]] as const,
  taskSlots: { fadeToPsychic: 0, psychicBackground: 1, targetOrbs: 0, targetBlend: 2, loopReversal: 3, attackerOrbs: 4, attackerBlend: 5, restoreFade: 0 },
  orbAttr2: 31025, // tile 305, prio 2, OBJ bank 7 (the first loaded sheet of the known entry, prep18 / prep22 constant)
});
/** S: 24 orbs, one every 7 rows from rows 42 (target leg) and 60 (attacker leg), each alive 17 rows -> the K pair of the lowest free (slot, matrix). */
export function orbAllocations33(): SkillSwapLiveInputs["orbAllocations"] {
  const starts = [...Array.from({ length: 12 }, (_, i) => 42 + i * 7), ...Array.from({ length: 12 }, (_, i) => 60 + i * 7)];
  const live: { pair: number; end: number }[] = [], out: SkillSwapLiveInputs["orbAllocations"][number][] = [];
  // chronological creation (the two legs interleave); an orb is alive spawn .. spawn + 16 and its slot / matrix are free from spawn + 17
  for (const order of starts.map((_, i) => i).sort((l, r) => starts[l]! - starts[r]! || l - r)) {
    const age = starts[order]!;
    for (let i = live.length - 1; i >= 0; i -= 1) if (live[i]!.end < age) live.splice(i, 1);
    const used = new Set(live.map((l) => l.pair)), pair = SS_K.orbPairs.findIndex((_, i) => !used.has(i));
    live.push({ pair, end: age + 16 }); const [slot, matrixNum] = SS_K.orbPairs[pair]!;
    out[order] = { slot, matrixNum, sourceCreationOrder: order };
  }
  return out;
}
/** A + K: a battler's OAM (spriteCenter = X_2 / sBattlerCoords y + pic y_offset (- elevation), 64x64, side attr2 tile / prio / bank). */
export const battlerAttr33 = (species: number, side: Side): readonly number[] => {
  const x = coordX(side), y = side === "player" ? 80 + yDelta(species, side) : yWithElevation(species, side) + yDelta(species, side);
  return [(y - 32) & 0xff, 0xc000 | ((x - 32) & 0x1ff), side === "player" ? 2417 : 6617];
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const report: Json = { schema: "prep33-skill-swap-check/v1", neg: neg ?? null, windows: [] };
const DEFAULT = ["tools/compare/evidence/skill-swap-player-dense-state.json.gz:player", "tools/compare/evidence/skill-swap-opponent-dense-state.json.gz:opponent"];
const specs = args.filter((a) => !a.startsWith("--"));
for (const spec of specs.length ? specs : DEFAULT) {
  const [path, side] = spec.split(":") as [string, Side];
  const buf = readFileSync(path), fr: Json[] = JSON.parse((path.endsWith(".gz") ? gunzipSync(buf) : buf).toString()).frames;
  const r0 = fr[0]!, ts: Side = side === "player" ? "opponent" : "player";
  const lag = fr.some((f, i) => i > 0 && f.animationRng === fr[i - 1]!.animationRng); // T observable: the gRng2 stall row (176)
  const firstInactiveAge = neg === "lag" ? (lag ? 194 : 195) : lag ? 195 : 194;
  const attackerBounds = skillSwapBounds(r0.battlers[side].species, side, neg === "anchor" ? 1 : 0), targetBounds = skillSwapBounds(r0.battlers[ts].species, ts);
  const fields = ["cursor", "skillTasks", "blendTasks", "orbs", "hwOamContent", "battlerAttr", "firstInactive"] as const;
  const ok: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0])), bad: Record<string, number[]> = Object.fromEntries(fields.map((f) => [f, []]));
  const inputsAt = (age: number): SkillSwapLiveInputs => { const row = fr[Math.min(age, fr.length - 1)]!; return {
    attackerSide: side, targetSide: ts, attackerSpecies: speciesName(r0.battlers[side].species), targetSpecies: speciesName(r0.battlers[ts].species),
    attackerBounds, targetBounds,
    attackerSprite: { slot: 0, x: 0, y: 0, x2: 0, y2: 0, attr: row.battlerSprites.attacker.attr, subpriority: 0, matrixNum: 0, matrix: [256, 0, 0, 256] },
    targetSprite: { slot: 0, x: 0, y: 0, x2: 0, y2: 0, attr: row.battlerSprites.target.attr, subpriority: 0, matrixNum: 0, matrix: [256, 0, 0, 256] },
    taskSlots: SS_K.taskSlots, orbAllocations: orbAllocations33(),
    // lent (not modelled): software orb OAM / matrices, order, buffers, palettes, registers, VRAM, shared task data, audio, live counts
    orbOam: row.sprites.filter((e: Json) => e.template?.symbol === "gSkillSwapOrbSpriteTemplate").map((e: Json) => ({ slot: e.slot, attr: e.attr, subpriority: e.subpriority })),
    spriteOrder: row.spriteOrder, softwareOam: row.softwareOam, hardwareOam: row.hardwareOam, softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices,
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette }, registers: row.registers,
    background: { currentVram: null, battleVram: null, psychicVram: null },
    resources: { tag: 10070, tileSlot: 0, paletteAllocatorSlot: 7, paletteBank: 23, tileRange: [305, 4], allocator: null },
    sharedTaskData: { fadeToPsychic: [], loopReversal: [], restoreFade: [] }, targetBlendPaletteStart: 0, attackerBlendPaletteStart: 0,
    audio: { current: null, attackerPan: side === "player" ? -64 : 63 }, liveCounts: { visualTasks: 0, soundTasks: 0 }, animationRng: 0, firstInactiveAge,
    abilityOutcome: { playerAbilityAfterSwap: -1, opponentAbilityAfterSwap: -1 }, gameplayRng: null, gameplayState: null } as SkillSwapLiveInputs; };
  for (const [age, row] of fr.entries()) {
    const st = skillSwapAtAge(age, inputsAt(age)) as Json;
    const mark = (f: (typeof fields)[number], good: boolean) => { if (good) ok[f] += 1; else bad[f]!.push(age); };
    mark("cursor", st.active === row.animScriptActive && st.source.pointerOffset === row.scriptOffset && st.source.wait === row.scriptWait);
    const romTasks = (sym: string) => row.tasks.filter((t: Json) => t.func?.symbol === sym).map((t: Json) => [t.slot, t.data]).sort((a: any, b: any) => a[0] - b[0]);
    const myTasks = (cb: string) => st.tasks.filter((t: Json) => t.callback === cb).map((t: Json) => [t.slot, t.data]).sort((a: any, b: any) => a[0] - b[0]);
    mark("skillTasks", same(romTasks("AnimTask_SkillSwap_Step"), myTasks("AnimTask_SkillSwap_Step")));
    mark("blendTasks", same(romTasks("AnimTask_BlendMonInAndOut_Step").map((t: any) => t[0]), myTasks("AnimTask_BlendMonInAndOut_Step").map((t: any) => t[0])));
    const romOrbs = row.sprites.filter((e: Json) => e.template?.symbol === "gSkillSwapOrbSpriteTemplate").map((e: Json) => [e.slot, e.matrixNum, e.x, e.y, e.x2, e.y2, e.data.slice(0, 8)]).sort((a: any, b: any) => a[0] - b[0]);
    mark("orbs", same(romOrbs, st.orbs.map((o: Json) => [o.slot, o.matrixNum, o.x, o.y, o.x2, o.y2, o.data]).sort((a: any, b: any) => a[0] - b[0])));
    // hardware OAM content: orbs of state row - 1 (16x16 affine-normal, corner = pos - 8) + the two battlers, vs the decoded ROM hardware OAM
    if (age > 0 && age < fr.length - 1) {
      const prev = skillSwapAtAge(age - 1, inputsAt(age - 1)) as Json;
      // a task-created orb is born after that frame's BuildOamBuffer: it reaches hardware OAM one row later (from spawn + 2)
      const mine = prev.orbs.filter((o: Json) => o.displayedStart < age).map((o: Json) => [(o.y + o.y2 - 8) & 0xff, (o.x + o.x2 - 8) & 0x1ff, o.matrixNum, SS_K.orbAttr2]).sort();
      const plan = skillSwapDisplayPlan({ ...st, buffers: { ...st.buffers, hardwareOam: row.hardwareOam, hardwareMatrices: row.hardwareMatrices },
        resources: { ...st.resources, tileRange: [305, 4], paletteBank: 23 } } as never);
      const rom = plan.orbs.map((o) => [o.attr[0] & 0xff, o.attr[1] & 0x1ff, o.matrixNum, o.attr[2]]).sort();
      mark("hwOamContent", same(mine, rom));
    } else ok.hwOamContent += 1;
    // the first inactive row belongs to the battle scene (battler cleanup), as in verifyShockWaveReducer
    mark("battlerAttr", age >= firstInactiveAge || same(row.battlerSprites.attacker.attr, battlerAttr33(r0.battlers[side].species, side)) && same(row.battlerSprites.target.attr, battlerAttr33(r0.battlers[ts].species, ts)));
    mark("firstInactive", (age === firstInactiveAge) === (!row.animScriptActive && fr[age - 1]?.animScriptActive === true));
  }
  const compress = (rows: number[]) => { const o: string[] = []; for (let i = 0; i < rows.length;) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j]! + 1) j += 1; o.push(i === j ? `${rows[i]}` : `${rows[i]}-${rows[j]}`); i = j + 1; } return o; };
  const w = { window: basename(path).replace(/(-dense-state)?\.json(\.gz)?$/, ""), attackerSide: side, species: [speciesName(r0.battlers[side].species), speciesName(r0.battlers[ts].species)],
    rows: fr.length, lagRow176: lag, firstInactiveAge, attackerBounds, targetBounds,
    fields: Object.fromEntries(fields.map((f) => [f, `${ok[f]}/${fr.length}`])), mismatchRows: Object.fromEntries(fields.filter((f) => bad[f]!.length).map((f) => [f, compress(bad[f]!).slice(0, 12)])) };
  report.windows.push(w); console.error(`${w.window}: ${JSON.stringify(w.fields)}`);
}
if (out) writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
