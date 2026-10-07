/**
 * prep27 Baton Pass body: does the accepted pure reducer `batonPassAtAge(age, animationCenter)` reproduce the ROM body with PRODUCTION-DERIVABLE inputs?
 * Inputs: the dense probe (tools/compare/poisonFangProbe.py, move 226; raw JSON + RGB dir) per scenario; the animationCenter is derived with the live adapter's own
 * formula (liveBattlerAnchors(side, createBattleCommandFieldArtView({player,opponent species ids})).picOffsetPoint) -- NOT the fixture / ROM constants.
 * Field-by-field per age (53 rows; same component list as tools/compare/batonPassPortable.ts minus audio/change-map) and, where the renderer supports the pair
 * (staged AIPOM/ONIX), the framebuffer through render(engine).
 * usage: npx vite-node tools/integration/prep27BatonReducerCheck.ts <dense.json>:<rgbDir>:<player|opponent>:<attackerSpeciesId>,<targetSpeciesId> ... [--out=receipt.json] [--neg=center|matrix|palette]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { batonPassAtAge } from "../../src/animation/batonPass.ts";
import { createSceneOnMovePresentation, sceneOnBatonPassView } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createBattleCommandFieldArtView, battleCommandFieldSpriteOrigin } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sha = (v: Uint8Array | string) => createHash("sha256").update(v).digest("hex");
const blend = (c: number, t: number, k: number) => { const r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31, tr = t & 31, tg = (t >> 5) & 31, tb = (t >> 10) & 31;
  return (r + (((tr - r) * k) >> 4)) | ((g + (((tg - g) * k) >> 4)) << 5) | ((b + (((tb - b) * k) >> 4)) << 10); };
const SPECIES: Record<number, string> = { 190: "AIPOM", 95: "ONIX", 302: "NINJASK", 76: "GOLEM" };
const receipt: Record<string, unknown> = {};
for (const spec of args.filter((a) => !a.startsWith("--"))) {
  const [json, rgbDir, side, ids] = spec.split(":"); const [attId, tgtId] = ids!.split(",").map(Number) as [number, number];
  const probe = JSON.parse(readFileSync(json!, "utf8")); const frames: any[] = probe.frames;
  const pl = side === "player" ? attId : tgtId, op = side === "player" ? tgtId : attId;
  const art = createBattleCommandFieldArtView({ player: { species: pl }, opponent: { species: op } } as never);
  const geo = (s: "player" | "opponent") => { const o = battleCommandFieldSpriteOrigin(art[s], s), a = liveBattlerAnchors(s, art);
    return { side: s, spriteCorner: o, animationCenter: a.picOffsetPoint, battlePositionCenter: a.battlePositionCenter }; };
  const aSide = side as "player" | "opponent", tSide = aSide === "player" ? "opponent" : "player";
  const attacker = { species: SPECIES[attId], geometry: geo(aSide) }, target = { species: SPECIES[tgtId], geometry: geo(tSide) };
  const center = neg === "center" ? { x: attacker.geometry.animationCenter.x + 1, y: attacker.geometry.animationCenter.y } : attacker.geometry.animationCenter;
  const hp = (s: any) => ({ hp: s.hp, maxHp: s.maxHp });
  const pf = frames[0].player, of = frames[0].opponent;
  const fieldProfile = { playerHp: pf.hp ?? 0, playerMaxHp: pf.maxHp ?? 0, opponentHp: of.hp ?? 0, opponentMaxHp: of.maxHp ?? 0, playerGender: "male", opponentGender: "male" };
  const stage: any = createSceneOnMovePresentation({ move: "BATON_PASS", attacker, target, fieldProfile } as never);
  let comp = 0, fbMatch = 0, fbTried = 0; const fails: string[] = []; let rendererError: string | null = null;
  for (const [age, o] of frames.entries()) {
    const before = fails.length, exp = batonPassAtAge(age, center);
    const A = aSide === "player" ? o.playerSprite : o.opponentSprite;
    if (o.scriptOffset !== exp.scriptOffset || o.animScriptActive !== exp.active) fails.push(`age ${age}: pointer/cleanup`);
    const actual = o.sprites.map((s: any) => ({ slot: s.slot, x: s.x, y: s.y, y2: s.y2, data: s.data }));
    const wanted = exp.pokeball ? [{ slot: 3, x: exp.pokeball.x, y: exp.pokeball.y, y2: exp.pokeball.y2, data: [exp.pokeball.phase, exp.pokeball.data1, exp.pokeball.data2, exp.pokeball.data3, 0, 0, 0, 0] }] : [];
    if (!same(actual, wanted)) fails.push(`age ${age}: Pokeball software`);
    const m = neg === "matrix" && age === 5 ? { a: 257, b: 0, c: 0, d: 256 } : exp.attackerMatrix;
    if (!same(A.matrix, m) || A.invisible !== exp.attackerInvisible) fails.push(`age ${age}: attacker matrix/invisible`);
    if (o.visualTaskCount !== exp.visualTaskCount || o.soundTaskCount !== 0) fails.push(`age ${age}: task counts`);
    const bank = 256 + (A.attr2 >>> 12) * 16; const selBg = [1, 2, 3].flatMap((b) => Array.from({ length: 16 }, (_, i) => b * 16 + i)), selA = Array.from({ length: 16 }, (_, i) => bank + i);
    const T = aSide === "player" ? o.opponentSprite : o.playerSprite; const tb = 256 + (T.attr2 >>> 12) * 16;
    const unsel = [...Array.from({ length: 16 }, (_, i) => i), ...Array.from({ length: 16 }, (_, i) => tb + i)];
    const by = neg === "palette" && age === 12 ? exp.bgPaletteY + 1 : exp.bgPaletteY;
    if (selBg.some((i) => o.fadedPalette[i] !== blend(o.unfadedPalette[i], 31455, by)) || selA.some((i) => o.fadedPalette[i] !== blend(o.unfadedPalette[i], 31455, exp.battlerPaletteY))
      || unsel.some((i) => o.fadedPalette[i] !== o.unfadedPalette[i])) fails.push(`age ${age}: palette blend/selector`);
    if (o.tileTags.includes(10226) !== exp.pokeballLoaded || o.paletteTags.includes(10226) !== exp.pokeballLoaded) fails.push(`age ${age}: Pokeball resource tags`);
    if (age > 0) { const pr = frames[age - 1]; const PA = aSide === "player" ? pr.playerSprite : pr.opponentSprite;
      if (!same(o.hardwarePalette, pr.fadedPalette)) fails.push(`age ${age}: hardware palette transfer`);
      if (!same(A.hardwareMatrix, PA.matrix)) fails.push(`age ${age}: live matrix transfer`);
      if (!pr.sprites.every((s: any) => o.hardwareOam.some((it: number[]) => same(it, [s.attr0, s.attr1, s.attr2])))) fails.push(`age ${age}: Pokeball hardware OAM transfer`);
      const onHw = o.hardwareOam.some((it: number[]) => same(it, [PA.attr0, PA.attr1, PA.attr2])); if (onHw === PA.invisible) fails.push(`age ${age}: attacker hardware OAM visibility transfer`); }
    // typed seam equals the reducer (software fields)
    const seam: any = sceneOnBatonPassView({ ...stage, age }); const { age: _a, attacker: _b, target: _c, displayedBgPaletteY: _d, displayedBattlerPaletteY: _e, displayedPokeball: _f, displayedAttackerMatrix: _g, displayedAttackerInvisible: _h, ...software } = seam;
    if (neg !== "center" && !same(software, exp)) fails.push(`age ${age}: typed seam`);
    if (rgbDir && !neg) { const rgb = readFileSync(`${rgbDir}/${String(o.frame).padStart(5, "0")}.rgb`); if (sha(rgb) !== o.sha256) fails.push(`age ${age}: raw hash`);
      if (!rendererError) { fbTried += 1; try { const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as never);
        let n = 0; for (let p = 0; p < 240 * 160; p += 1) if (fb[p * 4] !== rgb[p * 3] || fb[p * 4 + 1] !== rgb[p * 3 + 1] || fb[p * 4 + 2] !== rgb[p * 3 + 2]) n += 1; if (n === 0) fbMatch += 1; else fails.push(`age ${age}: framebuffer ${n}px`); } catch (e) { rendererError = String(e).slice(0, 120); } } }
    if (fails.length === before) comp += 1;
  }
  const key = `${side}:${attacker.species}->${target.species}`;
  receipt[key] = { rows: frames.length, componentExact: comp, framebufferExact: fbMatch, framebufferTried: fbTried, rendererError, derivedCenter: attacker.geometry.animationCenter, derivedCorner: attacker.geometry.spriteCorner, firstFailures: fails.slice(0, 4), failureCount: fails.length };
  console.log(key, "component", `${comp}/${frames.length}`, "framebuffer", `${fbMatch}/${fbTried}`, rendererError ? `renderer: ${rendererError}` : "", "center", JSON.stringify(attacker.geometry.animationCenter), fails.length ? `fails ${fails.length}: ${fails.slice(0, 2).join("; ")}` : "");
}
if (outPath) writeFileSync(outPath, JSON.stringify({ neg: neg ?? null, receipt }, null, 1) + "\n");
