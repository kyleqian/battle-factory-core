// H_BUFFER triage generator (S10A, evidence only). Reads the readiness inventory + the typed config/profile sources
// and writes tools/integration/fixtures/h-buffer-triage.json. Pure node, no oracle. Run from workspace/:
//   node tools/integration/hBufferTriage.mjs [--carriers /tmp/carrier.json]
import fs from "node:fs";
import cp from "node:child_process";

const readiness = JSON.parse(fs.readFileSync("docs/animation-integration-readiness.json", "utf8"));
const live = JSON.parse(fs.readFileSync("docs/animation-integration-live-status.json", "utf8"));
const implemented = new Set(live.implementedAdapters.map((x) => x.move ?? x));
const carriers = JSON.parse(fs.readFileSync("tools/integration/fixtures/h-buffer-carrier-census.json", "utf8"));
const ids = Object.fromEntries(JSON.parse(fs.readFileSync("src/data/gen/moves.json", "utf8")).moves.map((m) => [m.move, m.id]));

const sourceFiles = cp.execSync("grep -rlE 'export (interface|type)' src/animation src/engine --include=*.ts")
  .toString().trim().split("\n").filter((f) => !f.endsWith(".test.ts"));
const cache = new Map();
const text = (f) => cache.get(f) ?? (cache.set(f, fs.readFileSync(f, "utf8").split("\n")), cache.get(f));

/** Find `export interface|type NAME` and return {file, line, lines[]} for the body (brace matched). */
function findType(name) {
  for (const f of sourceFiles) {
    const lines = text(f);
    const start = lines.findIndex((l) => new RegExp(`^(export )?(interface|type) ${name}\\b`).test(l));
    if (start < 0) continue;
    let depth = 0, seen = false, end = start;
    for (let i = start; i < lines.length; i++) {
      for (const ch of lines[i]) { if (ch === "{") { depth++; seen = true; } if (ch === "}") depth--; }
      end = i;
      if (seen && depth <= 0) break;
      if (!seen && lines[i].includes(";")) break;
    }
    return { file: f, line: start + 1, body: lines.slice(start, end + 1), startIndex: start };
  }
  return null;
}

/** Enumerate `readonly x` fields (depth <= 2 inside inline objects) with path + file:line. */
function fieldsOf(typeName, extraExpand = 0) {
  const t = findType(typeName);
  if (!t) return [{ path: `?${typeName}`, file: "", line: 0, type: "NOT FOUND" }];
  const out = [];
  const stack = [];
  let depth = 0;
  t.body.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) { /* comment */ }
    else {
      const m = /^(?:readonly )?([A-Za-z0-9_]+)\??:\s*(.*)$/.exec(line);
      if (m && depth >= 1) {
        const path = [...stack, m[1]].join(".");
        if (stack.length <= 1 + extraExpand) out.push({ path, file: t.file, line: t.startIndex + idx + 1, type: m[2].replace(/\s+/g, " ").slice(0, 90) });
        if (/[{<(]\s*$/.test(m[2]) && /\{\s*$/.test(m[2])) stack.push(m[1]);
        else if (/Readonly<\{\s*$/.test(m[2])) stack.push(m[1]);
      }
    }
    for (const ch of raw) { if (ch === "{") depth++; if (ch === "}") { depth--; if (stack.length > depth - 1 && depth >= 1) stack.length = Math.max(0, depth - 1); } }
  });
  return out;
}

export { findType, fieldsOf };

// ---- classification ------------------------------------------------------------------------------------------
// Classes: A (derivable today), B (sprite order), C (Random2), D-* (GPU/palette/BG/VRAM/OAM), E-* (task/outcome), F-* (other)
// A-subtags carried in `via`.
const RULES = [
  [/^(gameplayRng|gameplayState|immutableGameplayState)$/, "A", "opaque pass-through (engine rng/frozen snapshot)"],
  [/Rng|AtAge0$.*rng/i, "C", "presentation Random2 (gRng2Value)"],
  [/spriteOrder|orderSeed|OrderSeed|painterOrder|painterSprites|activeOrderKeys|initialOrder|initialKeys|persistentOrder|(^|\.)orders?$|impactOrders|OrderIndex|allocationOrder|ringInsertion|painterInsertion|(^|\.)painter(\.|$)|initialLiveSprites|initialSprites|freeSpriteSlots|persistentOrders/, "B", "sSpriteOrder / live sort keys"],
  [/taskSlots?$|TaskSlot|(^|\.)tasks(\.|$)|sharedTaskData|monbgTask|liveCounts/i, "E-TASK", "CreateTask slot / live task table"],
  [/softwareOam|hardwareOam|buffers|softwareMatrices|hardwareMatrices|hardwareMatricesAtAge0/, "D-OAM", "OAM/affine buffers"],
  [/vram|Vram/, "D-VRAM", "BG VRAM snapshot"],
  [/scanline|Scanline/i, "D-SCAN", "gScanlineEffect buffers"],
  [/registers|monbg|monBg|background|bgOffset|BgOffset|bg3|Bg3|BgCnt|targetBgPriority|attackerBgPriority|(^|\.)palettes\.backgroundBanks/, "D-BG", "BG regs / monbg / BLDCNT state"],
  [/palette|Palette|unfaded|faded|hardware|paletteBanks|paletteBank|resourcePalette/, "D-PAL", "palette host / resource plan"],
  [/tileSlot|tileRange|tileSlots|(^|\.)resources?(\.|$)|mudSand|dirtMound|\.allocator$|^allocator$/, "D-TILE", "OBJ tile/palette resource allocator"],
  [/matrix|Matrix|matrixNum|matrixBitmap|MatrixIds|matrices|Matrices/, "F-AFFINE", "affine matrix allocator"],
  [/audio|Pan$|\.current$/, "F-AUDIO", "sound task state"],
  [/moveDamage|accuracyStage|hpDrain|targetStartHp|targetEndHp|abilityOutcome|staleMovePower|controllerProfile|counter$/, "E-OUT", "controller/outcome value"],
  [/Slot|Slots|slot$|allocations?|(^|\.)ball$|sparks|arcs|bolts|flashes|rocks|hitsplats|droplets|impacts|stars|orbs|hearts|clone|thread|^body$/, "A-SLOT", "sprite slot (allocator plan)"],
];
export function classify(path) {
  for (const [re, cls, note] of RULES) if (re.test(path)) return { cls, note };
  return { cls: "A", note: "anchors / species / const" };
}

// ---- per-move enumeration ------------------------------------------------------------------------------------
const OMIT = /^(attackerSide|targetSide|attackerSpecies|targetSpecies)$/;
const NAMED = /([A-Z][A-Za-z0-9]+(?:LiveInputs|Profile|Geometry|BodyConfig))\b/;
const EXPAND_NAMED = new Set(["EruptionLaunchProfile", "EruptionFallingRockProfile", "EruptionHorizontalShakeProfile", "EruptionPaletteProfile", "EruptionAudioProfile"]);

export function enumerate(entry) {
  const fields = [];
  const cfgLine = `src/animation/sceneOnPresentation.ts:${entry.entryPoints.config.line}`;
  for (const a of entry.requiredHostState.additional) {
    const named = NAMED.exec(a.type);
    if (named && /^(animationInputs|animationProfile|animationGeometry)$/.test(a.name)) {
      for (const f of fieldsOf(named[1], 1)) {
        if (OMIT.test(f.path)) continue;
        fields.push({ ...f, path: `${a.name}.${f.path}`, owner: named[1] });
      }
    } else if (a.name === "bodies") {
      fields.push({ path: "bodies[].animationProfile(RockBlastAnimationProfile)", file: "src/animation/rockBlast.ts", line: 21, type: a.type.slice(0, 90), owner: "SceneOnRockBlastBodyConfig" });
    } else {
      fields.push({ path: a.name, file: "src/animation/sceneOnPresentation.ts", line: entry.entryPoints.config.line, type: a.type.replace(/\s+/g, " ").slice(0, 90), owner: entry.entryPoints.config.symbol });
    }
  }
  return { cfgLine, fields };
}

// Field-level overrides where the name regexes misread the nested allocation records (checked by hand against the
// type sources and the Random2 call sites in reference/pokeemerald/src/battle_anim_*.c).
const ALLOC_REC = "A-SLOT+F-AFFINE+B"; // {slot, matrixNum, order|persistentOrder}
const OVERRIDES = [
  // allocation records carrying slot + matrix + persistent sort order
  ["MOVE_ZAP_CANNON", /^(ball|sparks|arcs)$/, ALLOC_REC, "ZapCannonAllocation {slot,matrixNum,order} zapCannon.ts:14"],
  ["MOVE_THUNDERBOLT", /^(orb|bolts|flashes|arcs)$/, ALLOC_REC, "ThunderboltAllocation {slot,matrixNum,order} thunderbolt.ts:9"],
  ["MOVE_SEISMIC_TOSS", /^(rocks|hitsplats)$/, ALLOC_REC, "SeismicTossAllocation {slot,matrixNum,persistentOrder} seismicToss.ts:14"],
  ["MOVE_SEISMIC_TOSS", /^(attackerPalette|targetPalette)$/, "A", "species palette RGB (species tables, not hardware state)"],
  ["MOVE_DIVE", /^(ball|splash|impacts)$/, ALLOC_REC, "DiveAllocation dive.ts:8"],
  ["MOVE_DIVE", /^droplets$/, ALLOC_REC + "+C", "DiveDropletProfile velocity/direction: AnimSprayWaterDroplet Random2 (battle_anim_flying.c:1106-1107)"],
  ["MOVE_DIVE", /^body$/, "E-OUT", "H_VARIANT setup/attack body selector from resolution"],
  ["MOVE_HYPER_BEAM", /^orbs$/, ALLOC_REC + "+C", "HyperBeamOrbRandom {animation,speed,phase,slot,persistentOrder}; AnimHyperBeamOrb Random2 (battle_anim_effects_1.c:2339-2356)"],
  ["MOVE_MUD_SLAP", /^mud$/, "A-SLOT+C", "MudSlapMudSeed {slot,xStep,yStep}: AnimDirtScatter Random2 (battle_anim_ground.c:213-214)"],
  ["MOVE_SAND_ATTACK", /^dirt$/, "A-SLOT+C", "SandAttackDirtSeed {slot,xStep,yStep}: AnimDirtScatter Random2"],
  ["MOVE_FRUSTRATION", /^impactOrders$/, "B", "FrustrationAllocationProfile.impactOrders sort ordinals"],
  // variant / outcome selectors
  ["*", /^(body|animationInputs\.body)$/, "E-OUT", "H_VARIANT body selector from resolution (A5)"],
  ["MOVE_PURSUIT", /^branch$/, "E-OUT", "Pursuit switch/no-switch branch from resolution"],
  ["MOVE_ROLLOUT", /^counter$/, "E-OUT", "RolloutCounter 1..5 (battle-state consecutive count)"],
  // ages / text offsets: live path runs `if (!liveField)` around the move's own text, offsets align to activation
  ["*", /^(moveTextStartAge|animationAgeOffset)$/, "A", "fixture-window alignment: live passes -1/0 (no live adapter sets either; src/engine/liveMoveAnimation.ts)"],
  // drain family: allocator profile objects (type text is inline in readiness)
  ["MOVE_ABSORB", /^allocatorProfile$/, "A-SLOT+D-PAL", "{hitsplat,orbs[],stars[],paletteController} slots; paletteController = palette-blend sprite slot"],
  ["MOVE_LEECH_SEED", /^allocatorProfile$/, "A-SLOT+D-PAL", "{seeds[3],hitsplat,orbs,stars,paletteController}"],
  ["MOVE_MEGA_DRAIN", /^allocatorProfile$/, "A-SLOT+D-PAL+B", "MegaDrainAllocatorProfile {hitsplat,orbs,stars,paletteController,orderSeed} megaDrain.ts:85"],
  ["MOVE_GIGA_DRAIN", /^allocatorProfile$/, "A-SLOT+D-PAL+B", "GigaDrainAllocatorProfile gigaDrain.ts:86"],
  ["MOVE_DREAM_EATER", /^allocatorProfile$/, "A-SLOT+D-PAL+B", "DreamEaterAllocatorProfile dreamEater.ts:44"],
  ["MOVE_ABSORB", /^healingCenter$/, "A+E-OUT", "healing/absorption anchors are A; H_OUTCOME = drained HP bar change (readiness)"],
  ["MOVE_SAND_ATTACK", /^controllerProfile$/, "E-OUT", "{accuracyStageBefore/After,resultTextFirstAge,currentMoveResetAge}: controller timing + stage outcome"],
  // nested sub-profiles of the three Eruption/Ice Beam/Sand Tomb profiles
  ["MOVE_ERUPTION", /^(launch|falling|horizontalShake)$/, "A-SLOT+B+C+E-TASK+D-TILE", "Eruption{Launch,FallingRock,HorizontalShake}Profile: allocator snapshots, taskSlot, startingAnimationRng (eruption*.ts)"],
  ["MOVE_ERUPTION", /^palette$/, "D-PAL+A-SLOT", "EruptionPaletteProfile: palette snapshots + tags at age 0 (eruptionPalette.ts:26)"],
  ["MOVE_ERUPTION", /^audio$/, "F-AUDIO+E-TASK", "EruptionAudioProfile {taskSlot,commandAge,...} (eruptionAudio.ts:23)"],
  ["MOVE_SAND_TOMB", /^target$/, "A+A-SLOT", "SandTombTargetGeometry {vortexCenter,paletteCenter,spriteSlot,initialX2/Y2,subpriority,sortTopY}"],
  ["MOVE_ICE_BEAM", /^geometry$/, "A", "IceBeamGeometry anchors + monbgBaseHofs/Vofs (const per orientation)"],
  ["MOVE_ICE_BEAM", /^orientation$/, "A", "side"],
  // Rock Blast: bodies[] each carry RockBlastAnimationProfile (src/animation/rockBlast.ts), inspected separately
  ["MOVE_ROCK_BLAST", /^bodies/, "A-SLOT+E-TASK+E-OUT", "bodies[] = one body per hit (multi-hit count from resolution); RockBlastAnimationProfile rockBlast.ts:21-47: attacker/target {spriteSlot,initialX2/Y2,battlePositionCenter,effectCenter}, allocator {lungeSlot,rockSlot,hitsplatSlot,fragmentSlots[4],shakeTaskSlot}, gameplayRng; no order seed, no Random2 field"],
  // outcome-ish fields hiding as plain numbers
  ["MOVE_ENDEAVOR", /^(staleMovePower|hpDrainFirstAge|targetStartHp|targetEndHp)$/, "E-OUT", "HP before/after + stale gAnimMovePower (value left by the previous animation)"],
  ["MOVE_WATER_SPOUT", /^(attackerHp|attackerMaxHp)$/, "A", "displayed HP of the attacker (BattleCommandFieldBattler)"],
  ["MOVE_HIDDEN_POWER", /^attackerPersonality$/, "A", "party personality (BattleScriptRulesBattlerState.personality; only Unown pixels read it)"],
  ["MOVE_GRUDGE", /^attackerBgPriority$/, "A", "GetBattlerSpriteBGPriority: const per side in singles"],
  ["MOVE_DRAGON_DANCE", /^allocationOrder$/, "A", "optional: omitted => renderer default order [0..5] (profile docs dragonDance.ts:29)"],
  ["MOVE_DRAGON_DANCE", /^allocationSlots$/, "A-SLOT", "optional"],
  ["MOVE_SWEET_SCENT", /^spriteSlots$/, "A-SLOT", "optional"],
  ["MOVE_RECYCLE", /^attackerPaletteIdPlusOne$/, "D-PAL", "attacker OBJ palette bank id (+1) for BlendPalInAndOutByTag"],
  ["MOVE_FIRE_BLAST", /^targetSpriteSlot$/, "A-SLOT", "battler sprite slot (allocator owner kind=battler)"],
  ["MOVE_SMELLING_SALT", /^animationProfile$/, "A", "{targetLeft,targetRight,targetTop,targetPictureY,targetVerticalSpan}: target pic-coords geometry (liveBattlerAnchors / species coords)"],
  ["MOVE_BIND", /^(sway|squeeze|squeezeStarts)$/, "A", "bind.ts:3 SwayMonParameters/ScaleMonAndRestoreParameters: script-argument constants (per orientation)"],
  ["MOVE_WRAP", /^(ellipse|squeeze|squeezeStarts)$/, "A", "wrap.ts:7 script-argument constants (per orientation)"],
  ["MOVE_DOUBLE_TEAM", /^(cloneAnchorAge|cloneVisibleStartAge|cloneVisibleEndAge)$/, "A", "ages (battleMenu.ts:1395): script constants; NOT slots"],
  ["MOVE_ROLLOUT", /^(attackerPan|targetPan)$/, "A", "SOUND_PAN_ATTACKER/TARGET by side (const)"],
  ["MOVE_ROLLOUT", /^monbg$/, "D-BG", "RolloutMonBgGeometry {layer,spriteX/Y,bgX/Y,inBg2,battlerId} (rollout.ts:15)"],
  ["MOVE_SHOCK_WAVE", /^allocator\.initialOccupiedSprites$/, "A-SLOT", "known-entry occupants"],
  ["MOVE_OVERHEAT", /^allocator\.initialOccupiedSprites$/, "A-SLOT", "known-entry occupants"],
  ["*", /^(attackerSprite|targetSprite|attackerArt|targetArt)$/, "A-SLOT+F-AFFINE", "battler sprite record {slot,x,y,x2,y2,subpriority,oamPriority,matrixNum,matrix}: battler owner slot + battler matrix"],
  ["*", /^(attackerCrySpecies)$/, "A", "species id"],
  ["MOVE_SHEER_COLD", /^restoreFadeEndAge$/, "A", "age const"],
  ["MOVE_SKILL_SWAP", /^(firstInactiveAge)$/, "A", "age const"],
  ["MOVE_SKILL_SWAP", /^abilityOutcome/, "E-OUT", "abilities after swap (resolution)"],
  ["MOVE_SKILL_SWAP", /^(orbAllocations|orbOam)$/, "A-SLOT+D-OAM", "orb slots + live OAM words"],
  ["MOVE_PSYWAVE", /^(ringAllocations|ringOam)$/, "A-SLOT+D-OAM", "ring slots + live OAM words"],
  ["MOVE_RETURN", /^(impactAllocations|traceAllocations)$/, "A-SLOT+F-AFFINE+D-TILE", "per-sprite allocation records"],
  ["MOVE_FLATTER", /^(confetti|spotlight)$/, "A-SLOT+F-AFFINE+D-TILE", "38 confetti + spotlight records"],
  ["MOVE_SIGNAL_BEAM", /^orbPairs$/, "A-SLOT+F-AFFINE", "orb pair allocations"],
  ["MOVE_SNORE", /^allocator$/, "D-TILE+B+F-AFFINE", "one-line inline {matrixBitmap,spriteOrder,activeOrderKeys} (snore.ts:33)"],
  ["MOVE_SNORE", /^effectAllocations/, "A-SLOT+F-AFFINE", "platform + Z allocations"],
  ["MOVE_SKY_ATTACK", /^bird$/, "A-SLOT+F-AFFINE", "SkyAttackBirdAllocation"],
  ["MOVE_NIGHTMARE", /^clone$/, "A-SLOT+F-AFFINE", "NightmareCloneAllocation"],
  ["MOVE_PSYCH_UP", /^spiral/, "A-SLOT+F-AFFINE+B", "spiral {slot,matrixSlot,subpriority,attr2,painterInsertionIndex}"],
  ["MOVE_EXTRASENSORY", /^clone/, "A-SLOT+F-AFFINE+D-OAM", "clone {slot,matrixNum,attr(OAM),subpriority,x,y,x2,y2}"],
  ["MOVE_PURSUIT", /^impact/, "A-SLOT+F-AFFINE+D-TILE+D-PAL", "impact {slot,matrixSlot,attr,subpriority,paletteSlot,tileSlot,allocator}"],
];
const split = (c) => c.split("+");
function finalClass(move, path) {
  const bare = path.replace(/^(animationInputs|animationProfile|animationGeometry)\./, "");
  let r = classify(bare);
  let cls = split(r.cls);
  let note = r.note;
  for (const [mv, re, c, n] of OVERRIDES) {
    if ((mv === "*" || mv === move) && re.test(bare)) { cls = split(c); note = n; }
  }
  return { cls, note };
}

const NEED_LABEL = {
  B: "ORDER", C: "RNG2", "D-PAL": "GPU-PAL", "D-TILE": "GPU-TILE", "D-BG": "GPU-BG", "D-OAM": "GPU-OAM", "D-VRAM": "GPU-VRAM",
  "D-SCAN": "GPU-SCAN", "E-TASK": "TASK", "E-OUT": "OUTCOME", "F-AFFINE": "AFFINE", "F-AUDIO": "AUDIO",
};
const ORDER = ["B", "C", "F-AFFINE", "E-TASK", "D-PAL", "D-TILE", "D-BG", "D-OAM", "D-VRAM", "D-SCAN", "E-OUT", "F-AUDIO"];

const rows = [];
for (const m of readiness.acceptedMoves) {
  if (!m.hostClass.includes("H_BUFFER") || implemented.has(m.move)) continue;
  const { cfgLine, fields } = enumerate(m);
  const classified = [];
  for (const f of fields) {
    const { cls, note } = finalClass(m.move, f.path);
    classified.push({ ...f, cls, note });
  }
  // move-level need set: only top-level-ish fields count once; nested duplicates share the same classes
  const need = new Set();
  const hasSlot = classified.some((f) => f.cls.includes("A-SLOT"));
  for (const f of classified) for (const c of f.cls) if (NEED_LABEL[c]) need.add(c);
  // H_OUTCOME / H_VARIANT combos carried by the readiness classification
  if (m.hostClass.includes("H_OUTCOME")) need.add("E-OUT");
  if (m.hostClass.includes("H_VARIANT")) need.add("E-OUT");
  const needs = ORDER.filter((c) => need.has(c));
  const verdict = needs.length === 0 ? "READY-NOW" : "NEEDS-" + needs.map((c) => NEED_LABEL[c]).join("+");
  const id = ids[m.move];
  rows.push({
    move: m.move, id, hostClass: m.hostClass, config: m.entryPoints.config.symbol, configCite: cfgLine,
    fieldProfile: m.requiredHostState.fieldProfileType, builder: null,
    needs, needsSpriteSlotPlan: hasSlot, verdict,
    carrier: { occurrences: carriers.counts?.[String(id)] ?? 0, species: carriers.species?.[String(id)] ?? [] },
    fields: classified,
  });
}
// Accepted fixture/verifier builder that fills the profile (first line mentioning the profile key).
const compareFiles = fs.readdirSync("tools/compare").filter((f) => f.endsWith(".ts"));
for (const r of rows) {
  const slug = r.move.replace("MOVE_", "").toLowerCase().replaceAll("_", "");
  const cands = compareFiles.filter((f) => f.toLowerCase().startsWith(slug) && /Framebuffer|ActualCore|Portable|Evidence|Reducer|Live/.test(f));
  for (const f of cands) {
    const lines = fs.readFileSync(`tools/compare/${f}`, "utf8").split("\n");
    const i = lines.findIndex((l) => /animationProfile|animationInputs|animationGeometry|allocatorProfile/.test(l) && /[:=]/.test(l));
    if (i >= 0) { r.builder = `tools/compare/${f}:${i + 1}`; break; }
  }
}

export { rows };
if (process.argv.includes("--summary")) {
  const byV = {};
  for (const r of rows) (byV[r.verdict] ??= []).push(r.move.replace("MOVE_", ""));
  for (const [k, v] of Object.entries(byV).sort((a, b) => b[1].length - a[1].length)) console.log(v.length, k, v.join(","));
}

// ---- orientation coverage (staged scenarios / accepted fixtures) -------------------------------------------------
const slugOf = (move) => move.replace("MOVE_", "").toLowerCase().replaceAll("_", "-");
const labFiles = fs.readdirSync("tools/battle-lab");
const fxFiles = fs.readdirSync("tools/compare/fixtures");
for (const r of rows) {
  const slug = slugOf(r.move);
  const sc = labFiles.filter((f) => f.startsWith(`mechanic-${slug}-`));
  const fx = fxFiles.filter((f) => f.startsWith(`${slug}-`));
  const names = [...sc, ...fx].join(" ");
  const both = /-player-/.test(names) && /-opponent-/.test(names);
  r.orientationCoverage = both ? "bilateral" : sc.length + fx.length === 0 ? "none" : "single-or-unnamed";
  r.stagingScenarios = sc;
}

// ---- provider unlock arithmetic ---------------------------------------------------------------------------------
const PROVIDERS = {
  "none (already A)": [],
  "order": ["B"],
  "rng2": ["C"],
  "order+rng2": ["B", "C"],
  "affine": ["F-AFFINE"],
  "task": ["E-TASK"],
  "affine+task (allocator plan v2)": ["F-AFFINE", "E-TASK"],
  "order+affine": ["B", "F-AFFINE"],
  "order+affine+task": ["B", "F-AFFINE", "E-TASK"],
  "order+rng2+affine": ["B", "C", "F-AFFINE"],
  "order+rng2+affine+task": ["B", "C", "F-AFFINE", "E-TASK"],
  "order+rng2+affine+palette": ["B", "C", "F-AFFINE", "D-PAL"],
  "order+rng2+affine+task+palette": ["B", "C", "F-AFFINE", "E-TASK", "D-PAL"],
  "task+outcome": ["E-TASK", "E-OUT"],
  "palette plan (GPU-PAL)": ["D-PAL"],
  "rng2+palette": ["C", "D-PAL"],
  "outcome": ["E-OUT"],
  "order+rng2+affine+task+palette+outcome": ["B", "C", "F-AFFINE", "E-TASK", "D-PAL", "E-OUT"],
};
export const unlocks = Object.fromEntries(Object.entries(PROVIDERS).map(([name, set]) => {
  const ok = rows.filter((r) => r.needs.every((n) => set.includes(n)));
  return [name, { total: ok.length, moves: ok.map((r) => r.move.replace("MOVE_", "")) }];
}));
const alone = {};
for (const key of ORDER) {
  alone[key] = rows.filter((r) => r.needs.length === 1 && r.needs[0] === key).map((r) => r.move.replace("MOVE_", ""));
}
export const onlyMissing = alone;
export const needFrequency = Object.fromEntries(ORDER.map((k) => [k, rows.filter((r) => r.needs.includes(k)).length]));

export const verdictGroups = {};
for (const r of rows) (verdictGroups[r.verdict] ??= []).push(r.move.replace("MOVE_", ""));

if (process.argv.includes("--summary")) {
  console.log("unlocks", JSON.stringify(Object.fromEntries(Object.entries(unlocks).map(([k, v]) => [k, v.total]))));
  console.log("onlyMissing", JSON.stringify(alone));
  console.log("freq", JSON.stringify(needFrequency));
  console.log("orientation", JSON.stringify(rows.filter((r) => r.verdict === "READY-NOW").map((r) => [r.move, r.orientationCoverage])));
}

for (const r of rows) {
  const bf = r.fields.filter((f) => f.cls.includes("B")).map((f) => f.path.replace(/^animation[A-Za-z]+\./, ""));
  r.orderKind = bf.length === 0 ? null
    : /^MOVE_(MEGA|GIGA)_DRAIN$|^MOVE_DREAM_EATER$/.test(r.move) ? "seed"
    : bf.every((p) => /Seed$|persistentOrder|(^|\.)orders?$|impactOrders|allocationOrder|OrderIndex/.test(p) || /^(ball|sparks|arcs|orb|bolts|flashes|rocks|hitsplats|droplets|impacts|splash|orbs|rings?|mud|dirt)$/.test(p)) ? "seed" : "full";
}

// ---- batches (hand-chosen from the READY-NOW set; carriers computed) ----------------------------------------------
const byMove = Object.fromEntries(rows.map((r) => [r.move, r]));
const carrier = (m) => byMove[m].carrier.occurrences;
export const batches = [
  {
    id: "S1", title: "anchors + constant subpriority/age profile (no allocator, no palette, both orientations staged)",
    moves: ["MOVE_EMBER", "MOVE_DRAGON_BREATH", "MOVE_DEFENSE_CURL", "MOVE_INGRAIN", "MOVE_MEAN_LOOK", "MOVE_SMELLING_SALT"],
    recipe: "attacker/target anchors from liveBattlerAnchors (picOffsetPoint / battlePositionCenter / pictureHeight / species coords yOffset), subpriority = 30 player / 40 opponent (target-relative offsets as in the accepted fixtures), animationAgeOffset/moveTextStartAge omitted or -1; no provider work. Per move: liveMoveAnimationDuration + config case + renderer species-gate generalization + opponent shadow row.",
  },
  {
    id: "S2", title: "mon-motion constant profile (sway/squeeze/ellipse/ages)",
    moves: ["MOVE_BIND", "MOVE_WRAP", "MOVE_DOUBLE_TEAM", "MOVE_FAINT_ATTACK"],
    recipe: "profile is script-argument constants only (bind.ts:3, wrap.ts:7, battleMenu.ts:1395, faintAttack.ts:58); fieldProfile = SceneOnFaintAttackFieldProfile (HP + player status). Bind/Wrap have bilateral staged scenarios; Double Team and Faint Attack have ONE Onix/Grovyle fixture and no staged scenario, so they need a bilateral staging scenario + probe first (a good staging-only unit).",
    caveat: "Double Team / Faint Attack: single orientation, no tools/battle-lab scenario",
  },
  {
    id: "S3", title: "sprite-slot-only plan (new wall-style allocator PLANS entries; no order seed in config)",
    moves: ["MOVE_SAFEGUARD", "MOVE_SWEET_SCENT", "MOVE_DRAGON_DANCE", "MOVE_FIRE_BLAST"],
    recipe: "add rows to PLANS in src/engine/liveMoveSpriteAllocator.ts (spawn age + lifetime per sprite from the script, like the wall sparkles) and feed ringSlots / spriteSlots / allocationSlots / battler slot (liveSpriteSlotForOwner). Dragon Dance / Sweet Scent slots are optional in the profile. Prereqs: net-zero audit rows (none of the 84 are in LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS) and a tie audit like docs/allocator-consumer-tie-audit.md.",
  },
].map((b) => ({ ...b, carrierOccurrences: Object.fromEntries(b.moves.map((m) => [m.replace("MOVE_", ""), carrier(m)])), carrierTotal: b.moves.reduce((n, m) => n + carrier(m), 0) }));

if (process.argv.includes("--write")) {
  const out = {
    schema: "h-buffer-triage/v1",
    note: "Static read of src/animation types + accepted builders; no oracle run, no renderer execution. Evidence only.",
    inputs: ["docs/animation-integration-readiness.json", "docs/animation-integration-live-status.json", "src/animation/*.ts", "src/animation/sceneOnPresentation.ts", "tools/integration/fixtures/h-buffer-carrier-census.json"],
    classes: {
      A: "derivable today (anchors, species tables, const, request/party data, opaque pass-through); A-SLOT = sprite slot via allocator plan (liveSpriteAllocator/liveMoveSpriteAllocator PLANS)",
      B: "sprite order seed / sorted order (needs the free-slot order provider; orderKind seed|full)",
      C: "Random2 / visual randomness (presentation provider)",
      "D-PAL": "palette snapshots / OBJ palette bank (palette resource plan + palette host extension)",
      "D-TILE": "OBJ tile/palette resource allocator (tag -> tileSlot/bank/range), not modeled",
      "D-BG": "BG regs / BLDCNT / monbg scroll", "D-OAM": "software/hardware OAM + affine buffers", "D-VRAM": "BG VRAM snapshots", "D-SCAN": "gScanlineEffect buffers",
      "E-TASK": "CreateTask slot / live task table", "E-OUT": "controller outcome or H_VARIANT selector",
      "F-AFFINE": "affine matrix allocator (AllocOamMatrix ids / matrixBitmap)", "F-AUDIO": "sound task / pan / current-song state",
    },
    counts: { moves: rows.length, verdict: Object.fromEntries(Object.entries(verdictGroups).map(([k, v]) => [k, v.length])), needFrequency },
    verdictGroups, unlocks, onlyMissing, batches,
    moves: rows.map((r) => ({
      move: r.move, id: r.id, hostClass: r.hostClass, config: r.config, configCite: r.configCite, fieldProfile: r.fieldProfile,
      acceptedBuilder: r.builder, orientationCoverage: r.orientationCoverage, stagingScenarios: r.stagingScenarios,
      carrier: r.carrier, needs: r.needs, needsSpriteSlotPlan: r.needsSpriteSlotPlan, orderKind: r.orderKind, verdict: r.verdict,
      fields: r.fields.map((f) => ({ path: f.path.replace(/^(animationInputs|animationProfile|animationGeometry)\./, "$1:"), cls: f.cls, cite: `${f.file}:${f.line}`, note: f.note })),
    })),
  };
  fs.writeFileSync("tools/integration/fixtures/h-buffer-triage.json", JSON.stringify(out, null, 1) + "\n");
  console.log("wrote tools/integration/fixtures/h-buffer-triage.json", rows.length, "moves");
}

// ---- markdown ---------------------------------------------------------------------------------------------------
function cell(r) {
  const groups = new Map();
  for (const f of r.fields) {
    const top = f.path.replace(/^(animationInputs|animationProfile|animationGeometry)\./, "").split(".")[0];
    for (const c of f.cls) {
      if (c === "A") continue;
      const g = groups.get(c) ?? new Map();
      if (!g.has(top)) g.set(top, `${top} (${f.file.replace(/^src\/(animation\/)?/, "")}:${f.line})`);
      groups.set(c, g);
    }
  }
  const order = ["A-SLOT", "B", "C", "F-AFFINE", "E-TASK", "D-PAL", "D-TILE", "D-BG", "D-OAM", "D-VRAM", "D-SCAN", "E-OUT", "F-AUDIO"];
  const parts = order.filter((c) => groups.has(c)).map((c) => {
    const items = [...groups.get(c).values()];
    const shown = items.slice(0, 4).join(", ") + (items.length > 4 ? `, +${items.length - 4}` : "");
    return `**${c}** ${shown}`;
  });
  return parts.length ? parts.join("; ") : "all A";
}
if (process.argv.includes("--md")) {
  const L = [];
  const mv = (m) => m.replace("MOVE_", "");
  for (const r of rows) {
    L.push(`| ${mv(r.move)} (${r.id}) | \`${r.config}:${r.configCite.split(":")[1]}\` | ${cell(r)} | ${r.verdict}${r.needsSpriteSlotPlan && r.needs.length === 0 ? " (slot plan)" : ""} | ${r.carrier.occurrences} | ${r.orientationCoverage === "bilateral" ? "2" : "1?"} | ${r.builder ?? "-"} |`);
  }
  console.log(L.join("\n"));
}

if (process.argv.includes("--doc")) {
  const mv = (m) => m.replace("MOVE_", "");
  const ready = rows.filter((r) => r.verdict === "READY-NOW");
  const seedN = rows.filter((r) => r.orderKind === "seed").length;
  const fullN = rows.filter((r) => r.orderKind === "full").length;
  const single = rows.filter((r) => r.needs.length === 1 && r.verdict !== "READY-NOW");
  const verdictLines = Object.entries(verdictGroups).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([k, v]) => `| ${k} | ${v.length} | ${v.join(", ")} |`).join("\n");
  const unlockLines = Object.entries(unlocks).map(([k, v]) => `| ${k} | ${v.total} | +${v.total - unlocks["none (already A)"].total} |`).join("\n");
  const batchLines = batches.map((b, i) => `### ${i + 1}. Batch ${b.id}: ${b.title}\n\nMoves: ${b.moves.map(mv).join(", ")} (${b.moves.length}); generated-rental carrier occurrences: ${Object.entries(b.carrierOccurrences).map(([k, v]) => `${k} ${v}`).join(", ")} (total ${b.carrierTotal}).\n\nRecipe: ${b.recipe}${b.caveat ? `\n\nCaveat: ${b.caveat}.` : ""}\n`).join("\n");
  const doc = `# H_BUFFER triage: decomposing the 84 unadapted buffer moves into production inputs (S10A, side lane)

Evidence/design only; new files, no tracked file edited. Format follows \`docs/next-adapters-prep.md\`.
Machine-readable twin: \`tools/integration/fixtures/h-buffer-triage.json\` (every field with class, cite, note). Generator:
\`node tools/integration/hBufferTriage.mjs --write|--md|--doc|--summary\` (pure node over \`docs/animation-integration-readiness.json\`,
\`docs/animation-integration-live-status.json\` and the typed sources). Carrier census: \`tools/integration/hBufferCarrierCensus.ts\` ->
\`tools/integration/fixtures/h-buffer-carrier-census.json\`.
Method: **static read** of each move's config type (\`src/animation/sceneOnPresentation.ts\` symbol:line from the readiness JSON), the
profile/inputs/geometry type it references (cites are \`file:line\` of the field), and the accepted builder that fills it (last column).
Nothing was executed against the oracle or the renderer; verdicts are therefore "config-complete", not "pixel-exact".

## 0. Numbers

* 90 accepted H_BUFFER moves minus the 6 live ones (BARRIER, LIGHT_SCREEN, MAGIC_COAT, MIRROR_COAT, PROTECT, REFLECT) = **84** (74 pure H_BUFFER + 10 combos;
  the 10 combos: H_BUFFER+H_VARIANT DIVE, RAZOR_WIND, LEECH_SEED, DIG, SKY_ATTACK; H_BUFFER+H_OUTCOME ABSORB, MEGA_DRAIN, GIGA_DRAIN, DREAM_EATER, SAND_ATTACK).
* **READY-NOW: ${ready.length}** (${ready.filter((r) => r.orientationCoverage === "bilateral").length} with bilateral staged scenarios/fixtures; ${ready.filter((r) => r.orientationCoverage !== "bilateral").map((r) => mv(r.move)).join(" + ")} have one Onix/Grovyle fixture only).
  ${ready.filter((r) => r.needsSpriteSlotPlan).length} of them (${ready.filter((r) => r.needsSpriteSlotPlan).map((r) => mv(r.move)).join(", ")}) still need a sprite-slot plan row (class A-SLOT, section 2).
* Single missing provider (exactly one non-A need): ${single.map((r) => `${mv(r.move)} (${r.needs[0]})`).join(", ")}.
* Order seed needed by ${rows.filter((r) => r.needs.includes("B")).length} moves (${seedN} free-slot *seed* shape, ${fullN} full \`spriteOrder\`/painter-keys shape); Random2 by ${needFrequency.C}; affine allocator by ${needFrequency["F-AFFINE"]}; task slots by ${needFrequency["E-TASK"]}; palette snapshots by ${needFrequency["D-PAL"]}; OBJ tile allocator by ${needFrequency["D-TILE"]}; BG/BLDCNT/monbg by ${needFrequency["D-BG"]}; full OAM/VRAM/scanline buffers by ${needFrequency["D-OAM"]}/${needFrequency["D-VRAM"]}/${needFrequency["D-SCAN"]}; outcome/variant by ${needFrequency["E-OUT"]}; audio by ${needFrequency["F-AUDIO"]}.

## 1. Class legend and what production has today

| Class | Meaning | Production source today |
|---|---|---|
| A | derivable now | \`liveBattlerAnchors\` (picOffsetPoint, spriteCenter, battlePositionCenter, pictureHeight, frontIdleRest; \`src/engine/liveMoveAnimation.ts:113-157\`), \`speciesFrontIdleRestOffsetOrZero\`, species coords yOffset, \`liveSceneOnBattlerArt\`, subpriority 30 player / 40 opponent (\`liveMoveAnimation.ts:762\`), party personality / displayed HP, engine \`rngValue\` / frozen state as opaque pass-through (never read), per-move script constants (ages, sway/squeeze/ellipse params) |
| A-SLOT | sprite slot | first-free under the known-entry history (\`liveSpriteAllocator.ts:89-98\`) **plus a per-move plan** of spawn ages/lifetimes (\`liveMoveSpriteAllocator.ts:25-39\` PLANS = the six walls only). Battler slots = owner \`battler\`. Plan rows need net-zero audit (\`LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS\`, none of the 84 are in it) and a tie audit (\`docs/allocator-consumer-tie-audit.md\`) or the order provider |
| B | sprite order | free-slot order provider, designed not built (\`docs/sprite-order-provider-design.md\` s3-4): \`seed\` shape = \`order.free.slice(0,n)\`; \`full\` shape = 64-entry array + occupied-prefix keys (design s3 last paragraph; keyless exact only for first actions / single-sprite prior bodies, 39/56 activations) |
| C | Random2 | presentation Random2 provider, designed not built (\`docs/visual-randomness-prep.md\` s4); per-frame \`gRng2Value\` advance is empirical, so exact only with a pinned seed (\`animationRngAtAge0\` / \`animationRngSeed\`) |
| D-PAL | palette snapshots / OBJ bank | \`prepareLiveMovePalette\` + \`live-animation-palette-resources.json\` plans (58 moves; only Shadow Punch scratch is returned in \`LiveMovePaletteInput\`, \`liveMoveAnimationPalette.ts:8-11,91\`). A plan row per move plus extending the returned input would cover unfaded/faded-after-load snapshots; \`hardwareAtAge0\` == previous faded is an unverified assumption |
| D-TILE | OBJ tile/palette resource allocator (tag -> tileSlot/range/bank) | not modeled anywhere in production |
| D-BG / D-OAM / D-VRAM / D-SCAN | BG regs, BLDCNT, monbg scroll / software+hardware OAM and affine buffers / BG VRAM snapshots / gScanlineEffect buffers | not modeled: this is the "A6 persistent graphics host" of \`docs/animation-integration-readiness.md\` |
| E-TASK | CreateTask slot / live task table | not modeled |
| E-OUT | controller outcome / H_VARIANT selector | resolution must hand the typed selector through (A5); \`B_DISPATCH\`/\`B_LIFECYCLE\` |
| F-AFFINE | affine matrix ids / \`matrixBitmap\` | not modeled (liveSpriteAllocator is sprites only); a sibling 32-entry bitmap fed by the same create/destroy events would do |
| F-AUDIO | sound task / pan / current-song state | not modeled |

## 2. Findings that shape the verdicts

1. **Two seams hide inside H_BUFFER.** (a) 52 moves with a *small profile* (slots, orders, a few constants; \`animationProfile\`/\`animationGeometry\`), and (b) 32 moves with a
   *LiveInputs* record (\`animationInputs\`: task slots, matrixBitmap, \`spriteOrder\`, palette \`unfaded/faded/hardware\`, \`registers\`, \`background\`, \`buffers.softwareOam/hardwareOam\`, VRAM,
   scanline). Seam (b) is all-or-nothing on the A6 graphics host; none of it is batchable before that exists.
2. **The six live H_BUFFER moves are the degenerate case**: their config takes only \`wall\` + \`sparkles[]\` slot numbers (\`liveMoveAnimation.ts:560-592\`), their draw order is key-determined by tie audit, and
   no palette/affine/task/RNG field exists. Any new consumer with that shape (S3 below) can follow the same route; any consumer with \`spriteOrderSeed\`/\`spriteOrder\` cannot.
3. **Slot fields are class A only through a plan.** Accepted values are measured RAM slots (e.g. Dragon Dance \`[3,4,5,7,9,10]\`, \`tools/compare/dragonDanceActualCore.ts:34\`; Frustration \`angerSlot 3, impactSlots [3,4]\`, \`frustrationFramebuffer.ts:63\`), i.e. first-free under the known-entry host
   at the sprite's spawn age. The wall plans show the mechanism (spawn age + lifetime tables); every other move would need its own table read from its script.
4. **ORDER alone is a small unlock, RNG2 alone unlocks nothing.** Every one of the ${needFrequency.C} Random2 moves also needs palette, affine, task, or order inputs; Random2 only pays off in combination (section 5).
5. **Affine and task slots are the hidden co-requisites.** ${needFrequency["F-AFFINE"]} moves carry matrix ids (\`matrixNum\`, \`matrixBitmap\`, \`*MatrixIds\`) and ${needFrequency["E-TASK"]} carry task slots; neither is in any provider. Both are lowest-free allocations over a known baseline,
   so one extended "allocator plan v2" (sprite + affine + task timelines from the same create/destroy events) is the natural provider, cheaper than the GPU host.
6. **Every renderer branch is species-pair gated** (\`docs/next-adapters-prep.md\` s0.1); each batch below still pays the per-move recipe of \`docs/next-adapters-prep2.md\` s0 (duration case, config case, gate generalization, #142 shadow row). Verdicts here are about *config inputs* only.
7. **Opaque fields** \`gameplayRng\`, \`gameplayState\`, \`immutableGameplayState\` are asserted-unchanged pass-throughs in the reducers (A: supply engine \`rngValue\` / a frozen snapshot, never read).
   \`moveTextStartAge\` / \`animationAgeOffset\` are fixture-window alignment: no live adapter sets either (they wrap the move's own text in \`if (!liveField)\`), so A.
8. **Ordering caveat for the ready set**: READY-NOW means the config is complete. Exactness after arbitrary history still needs the net-zero audit row (so the move does not invalidate the allocator history for later walls) and, for moves that create sprites, a tie audit. Neither exists for any of the 84.
9. **Hidden Power has zero generated-rental carriers** in the census (set exists in \`battle-frontier-mons.json\`; not in seeds 0..9999 x streaks 0..42/7 initial rentals).
10. **Mega/Giga Drain, Dream Eater, Absorb, Leech Seed** carry H_OUTCOME/H_VARIANT in readiness: the config has no HP field, but the drain-bar change and the \`main\`/\`residual\` body come from resolution (E-OUT).

## 3. Verdict summary (84 moves)

| Verdict | Count | Moves |
|---|---:|---|
${verdictLines}

## 4. Per-move table

Fields are grouped by class; **A** fields are omitted (see the JSON). \`A-SLOT\` = needs a plan row. Cites are \`file:line\` of the field in \`src/animation\` unless the config only names it inline (then \`sceneOnPresentation.ts:<config line>\`).
"Carr" = generated-rental occurrences (420000 rentals). "Or" = orientations with a staged scenario/fixture ("1?" = one or unnamed). "Builder" = accepted fixture/verifier line that fills the profile.

| Move (id) | Config | Buffer fields by class | Verdict | Carr | Or | Builder |
|---|---|---|---|---:|---|---|
${rows.map((r) => `| ${mv(r.move)} (${r.id}) | \`${r.config}:${r.configCite.split(":")[1]}\` | ${cell(r)} | ${r.verdict}${r.needsSpriteSlotPlan && r.needs.length === 0 ? " (slot plan)" : ""} | ${r.carrier.occurrences} | ${r.orientationCoverage === "bilateral" ? "2" : "1?"} | ${r.builder ?? "-"} |`).join("\n")}

## 5. Provider unlock counts (moves whose *only* missing inputs are in the set; baseline READY-NOW = ${unlocks["none (already A)"].total})

| Provider set | Moves live-ready | Increment |
|---|---:|---:|
${unlockLines}

Per provider, alone: ORDER +${unlocks.order.total - unlocks["none (already A)"].total} (${unlocks.order.moves.filter((m) => !unlocks["none (already A)"].moves.includes(m)).join(", ")}); RNG2 +0; AFFINE +0; TASK +${unlocks.task.total - unlocks["none (already A)"].total} (${unlocks.task.moves.filter((m) => !unlocks["none (already A)"].moves.includes(m)).join(", ")}); PALETTE plan +0; OUTCOME +${unlocks.outcome.total - unlocks["none (already A)"].total} (ENDEAVOR).
Order **together with A** (i.e. order alone, section above) = ${unlocks.order.total}/84; order + Random2 = ${unlocks["order+rng2"].total}; order + affine = ${unlocks["order+affine"].total}; order + Random2 + affine = ${unlocks["order+rng2+affine"].total}; adding task = ${unlocks["order+rng2+affine+task"].total}; adding palette plans = ${unlocks["order+rng2+affine+task+palette"].total}; plus outcome = ${unlocks["order+rng2+affine+task+palette+outcome"].total}.
The remaining ${rows.length - unlocks["order+rng2+affine+task+palette+outcome"].total} moves need the A6 graphics host (OBJ tile allocator, BG/BLDCNT/monbg, OAM/VRAM/scanline snapshots, audio): ${rows.filter((r) => !r.needs.every((n) => ["B", "C", "F-AFFINE", "E-TASK", "D-PAL", "E-OUT"].includes(n))).map((r) => mv(r.move)).join(", ")}.

## 6. Proposed batches (READY-NOW only), ranked by carrier availability then smallest new code

${batchLines}
Next after these: Swift + Trick (one extra input each: a task slot), Endeavor (HP before/after from resolution), then the ORDER-only five (Blaze Kick, Flamethrower, Rock Slide, Rock Throw, Magnitude) once the order provider's slices 1-3 exist; Blaze Kick/Flamethrower player-first need the live-key tracker (design s2 table).

## 7. Open questions

1. Is a bilateral staged scenario for Double Team / Faint Attack (and Rock Slide) in scope for this lane? It is pure deterministic staging and unblocks two of the highest-carrier moves (28469 and 16472 occurrences).
2. Do new slot-plan consumers (S3) get audited with the net-zero + tie audit (needs mGBA probes) or wait for the order provider? Until then adding them to \`LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS\` is not licensed (liveMoveSpriteAllocator.ts comment).
3. Should one "allocator plan v2" (sprite + affine + task timelines) be built before the order provider? Section 5: order+affine = ${unlocks["order+affine"].total} vs order alone = ${unlocks.order.total}.
4. Palette provider: is \`hardwarePaletteAtAge0\` equal to the preceding faded copy (needed for Hail, Rain Dance, Spikes, Lovely Kiss, Octazooka)? Unverified; \`LiveMovePaletteInput\` would also have to expose the snapshots.
5. \`spriteOrder\` "full" shape (${fullN} moves): the design only proves keyless exactness for first actions and single-sprite prior bodies; the occupied-prefix keys of the known-entry occupants are asserted (251/251 fresh sort) but no production consumer exists.
6. Random2 pin: staged \`animationRngAtAge0\` is available only in fixtures; production would need an unpinned presentation seed (ROM-faithful distribution, not bit-exact) - acceptable for the Scene ON product claim?
7. Hidden Power has no carrier in the census; is a Level-50 draft-swap or another tier needed to exercise it?
8. Static-read caveats: Rock Blast \`bodies[]\` was classified from \`rockBlast.ts:21-47\`; Dive/Dig/Razor Wind/Sky Attack/Leech Seed \`body\` selectors are assumed to come from resolution (A5); Snore/Sky Attack/Mach Punch one-line inline types were classified from their text, not expanded.
`;
  fs.writeFileSync("docs/h-buffer-triage.md", doc);
  console.log("wrote docs/h-buffer-triage.md", doc.length);
}
