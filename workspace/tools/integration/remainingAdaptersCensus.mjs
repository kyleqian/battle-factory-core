// Remaining-adapters census (S10A, side lane; evidence only). Pure node, no oracle, no network. Run from workspace/:
//   node tools/integration/remainingAdaptersCensus.mjs [--write] [--doc] [--summary]
// Inputs : docs/animation-integration-live-status.json (live set), docs/animation-integration-readiness.json (+ -merged- delta: the 276
//          accepted Factory moves and host classes), tools/integration/fixtures/h-buffer-triage.json (per-field classes/cites of the
//          H_BUFFER moves), tools/integration/fixtures/sprite-order-body-plans-ext.json (own-body order verdicts), src/data/gen/* (set
//          pools for the usage weight, the same model as tools/integration/spriteOrderPlanCoverageRank.py), typed sources for the
//          LiveInputs of the nine newest accepted moves.
// Outputs: tools/integration/fixtures/remaining-adapters-census.json (--write), docs/remaining-adapters-census.md (--doc).
// Invariant (asserted): live + in-flight + remaining == 276 accepted Factory moves, each exactly once; every blocker cite resolves
//          to an existing file and an in-range, non-empty line.
import fs from "node:fs";
import cp from "node:child_process";

const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const live = rd("docs/animation-integration-live-status.json");
const readiness = rd("docs/animation-integration-readiness.json");
const merged = rd("docs/animation-integration-merged-readiness.json");
const triage = rd("tools/integration/fixtures/h-buffer-triage.json");
const plans = rd("tools/integration/fixtures/sprite-order-body-plans-ext.json");
const palRes = rd("src/data/gen/live-animation-palette-resources.json");
const moveRows = rd("src/data/gen/moves.json").moves;
const ids = Object.fromEntries(moveRows.map((m) => [m.move, m.id]));
const nameOf = Object.fromEntries(moveRows.map((m) => [m.move, m.name]));

// ---- scope sets ------------------------------------------------------------------------------------------------------
// In-flight batches named by the supervisor (ANIMATION_INTEGRATION_PROGRESS.md "Running: order-consumer batch" + prep6 READY list).
const ORDER_BATCH = []; // all landed (live = 198); kept for the in-flight bucket, which is now empty
const PREP6_READY = []; // all landed
// stl109: additionalRequiredBodies (Struggle 165) are live adapters outside the 276; they never enter the identity below.
const additionalBodies = new Set(Object.keys(live.additionalRequiredBodies ?? {}));
const liveSet = new Set(live.implementedAdapters.map((x) => x.move).filter((m) => !additionalBodies.has(m)));
// Faithful-random adapters (D3, docs/presentation-rng.md): a disjoint bucket, neither scoped-exact live nor remaining.
const faithfulSet = new Set((live.faithfulRandomAdapters ?? []).map((x) => x.move));
// Faithful-timing adapters (D4, docs/faithful-timing.md): a third disjoint bucket. A D3+D4 adapter (d3: true) is counted here only.
const timingSet = new Set((live.faithfulTimingAdapters ?? []).map((x) => x.move));
const inflight = new Map();
for (const m of ORDER_BATCH) inflight.set(`MOVE_${m}`, "order-consumer batch");
for (const m of PREP6_READY) inflight.set(`MOVE_${m}`, "prep6 READY batch");
const accepted = new Set([...readiness.acceptedMoves.map((x) => x.move), ...merged.acceptedMoves.map((x) => x.move)]);
const readinessByMove = Object.fromEntries(readiness.acceptedMoves.map((x) => [x.move, x]));
const mergedByMove = Object.fromEntries(merged.acceptedMoves.map((x) => [x.move, x]));
const triageByMove = Object.fromEntries(triage.moves.map((x) => [x.move, x]));

const liveIn = [...accepted].filter((m) => liveSet.has(m));
const faithfulIn = [...accepted].filter((m) => faithfulSet.has(m));
const timingIn = [...accepted].filter((m) => timingSet.has(m));
const inflightIn = [...accepted].filter((m) => !liveSet.has(m) && !faithfulSet.has(m) && !timingSet.has(m) && inflight.has(m));
const remaining = [...accepted].filter((m) => !liveSet.has(m) && !faithfulSet.has(m) && !timingSet.has(m) && !inflight.has(m)).sort();
if (accepted.size !== live.currentAcceptedFactoryMoves) throw new Error(`accepted ${accepted.size} != live-status currentAcceptedFactoryMoves ${live.currentAcceptedFactoryMoves}`);
for (const m of liveSet) if (!accepted.has(m)) throw new Error(`live adapter ${m} is not an accepted Factory move`);
if (liveIn.length !== live.implementedCount - additionalBodies.size) throw new Error(`live ${liveIn.length} != implementedCount ${live.implementedCount} - ${additionalBodies.size} additional required bodies`);
for (const m of faithfulSet) {
  if (!accepted.has(m)) throw new Error(`faithful-random adapter ${m} is not an accepted Factory move`);
  if (liveSet.has(m)) throw new Error(`faithful-random adapter ${m} is also scoped-exact live`);
}
if (faithfulIn.length !== (live.faithfulRandomCount ?? 0)) throw new Error(`faithful ${faithfulIn.length} != faithfulRandomCount ${live.faithfulRandomCount}`);
for (const m of timingSet) {
  if (!accepted.has(m)) throw new Error(`faithful-timing adapter ${m} is not an accepted Factory move`);
  if (liveSet.has(m) || faithfulSet.has(m)) throw new Error(`faithful-timing adapter ${m} is also scoped-exact or faithful-random`);
}
if (timingIn.length !== (live.faithfulTimingCount ?? 0)) throw new Error(`faithful timing ${timingIn.length} != faithfulTimingCount ${live.faithfulTimingCount}`);
if (liveIn.length + faithfulIn.length + timingIn.length + inflightIn.length + remaining.length !== accepted.size) throw new Error("live + faithful-random + faithful-timing + in-flight + remaining != accepted");
if (new Set([...liveIn, ...faithfulIn, ...timingIn, ...inflightIn, ...remaining]).size !== accepted.size) throw new Error("a move is counted twice");

// ---- cite checking -----------------------------------------------------------------------------------------------------
const fileCache = new Map();
const linesOf = (f) => fileCache.get(f) ?? (fileCache.set(f, fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n") : null), fileCache.get(f));
const citeErrors = [];
function checkCite(c) {
  const m = /^(.+?):(\d+)(?:-(\d+))?$/.exec(c);
  if (!m) { citeErrors.push(`bad cite ${c}`); return; }
  const ls = linesOf(m[1]);
  if (!ls) { citeErrors.push(`missing file ${c}`); return; }
  const a = Number(m[2]), b = Number(m[3] ?? m[2]);
  if (a < 1 || b > ls.length || b < a) { citeErrors.push(`line out of range ${c} (file has ${ls.length})`); return; }
  if (!ls.slice(a - 1, b).some((l) => l.trim().length)) citeErrors.push(`empty line ${c}`);
}
const R = "reference/pokeemerald/";

// ---- usage weight (same model as spriteOrderPlanCoverageRank.py: Level-50 rental ranges 0..6, 4 moves per set, both sides) -------------
function weights() {
  const mons = rd("src/data/gen/battle-frontier-mons.json").entries;
  const ranges = rd("src/data/gen/factory-round-policy.json").rentalSelection.ranges.level50.slice(0, 7);
  const w = {};
  for (const r of ranges) {
    const sets = mons.filter((m) => m.index >= r.start && m.index <= r.end);
    for (const m of sets) for (const mv of m.moves) w[mv] = (w[mv] ?? 0) + 1 / sets.length / ranges.length;
  }
  return w;
}
const W = weights();
const wTotal = Object.values(W).reduce((a, b) => a + b, 0);
const share = (m) => (W[m] ?? 0) / wTotal; // fraction of all Factory move uses (each side identical)

// ---- provider vocabulary -----------------------------------------------------------------------------------------------
// Needs codes. B is satisfied (first body) by the wired provider; A / A-SLOT are recipe work. Everything else is a blocker.
const CODES = {
  B: "sSpriteOrder: SATISFIED by the lend (src/engine/liveSpriteOrderHost.ts + spriteOrderProvider.ts) incl. the cross-body tracker while the history is modelled; falls back after an unmodelled graphics command",
  C: "Random2 surrogate (presentation-only gRng2Value stream)",
  "F-AFFINE": "affine matrix allocator (AllocOamMatrix ids / matrixBitmap)",
  "E-TASK": "task-slot allocator (CreateTask slots / live task table)",
  "D-PAL": "palette snapshot provider (unfaded/faded/hardware per move plan)",
  "D-TILE": "OBJ tile / palette-bank resource allocator",
  "D-BG": "BG regs / BLDCNT / monbg state",
  "D-OAM": "software/hardware OAM + affine buffer host",
  "D-VRAM": "BG VRAM snapshots",
  "D-SCAN": "gScanlineEffect buffers",
  "F-AUDIO": "sound task / pan / current-song state",
  "E-OUT": "outcome selector from resolution not on the request",
  "X-DISABLE": "DisableStruct counter snapshot on the MOVE_ANIMATION request (fury/rollout/stockpile counters)",
  "X-SWITCH": "switch / forced-switch flow owner (post-body field, return-to-ball, slide-off)",
  "X-SUBST": "persistent Substitute doll sprite state",
  "X-POWER": "dynamic gBattleMovePower / gDynamicBasePower on the MOVE_ANIMATION request (production emits the static move-table power)",
  "X-AGE": "accepted evidence lacks the early source ages (age basis)",
  "X-REDUCER": "accepted reducer hard-codes values production can derive; reducer parameterization needed",
  "X-SCHED": "scheduler/callback-advance state",
  "X-TWOTURN": "semi-invulnerable two-turn state (hidden battler between turns)",
};
const A6 = ["D-OAM", "D-VRAM", "D-SCAN", "D-BG", "D-PAL", "D-TILE", "F-AUDIO"];
const BUNDLES = { "A6 graphics host (OAM+VRAM+scanline+BG+palette+tile+audio)": A6 };
const SMALL = new Set(["X-DISABLE", "X-REDUCER", "X-SCHED", "E-OUT", "X-POWER"]);
const OUT = new Set(["X-AGE"]);
const LENT = new Set(["B", "F-AFFINE", "E-TASK"]);

// ---- per-move overrides ------------------------------------------------------------------------------------------------
const SCP = "src/animation/sceneOnPresentation.ts";
const scLines = linesOf(SCP);
const SC = (sym) => { const i = scLines.findIndex((l) => new RegExp(`^export (interface|function|type) ${sym}\\b`).test(l)); if (i < 0) throw new Error(`symbol ${sym} not in ${SCP}`); return `${SCP}:${i + 1}`; };
// (a) E-OUT resolution for triage moves: the old triage lumped every H_VARIANT/H_OUTCOME move into E-OUT.
const REQ_TURN = "src/engine/battleScriptHitChainOpcode.ts:2276-2289"; // MOVE_ANIMATION args: move, animTurn, power, damage, friendship, multihit
const DISABLE = [`${R}src/battle_script_commands.c:1787`, "src/engine/battleScriptRulesContext.ts:251-252", "src/engine/battleScriptRulesContext.ts:325-326"];
const EOUT_FIX = {
  MOVE_DIG: { drop: ["E-OUT"], add: ["X-TWOTURN"], note: "body selector is request.turn (choosetwoturnanim, battle_anim_scripts.s:2653); the blocker is the hidden-battler state between turns", cites: [REQ_TURN, `${R}data/battle_anim_scripts.s:2653`] },
  MOVE_DIVE: { drop: ["E-OUT"], add: ["X-TWOTURN"], note: "request.turn selects setup/attack (choosetwoturnanim, battle_anim_scripts.s:9225); setup body is order-consumer READY-WITH-PROVIDER; attack body NEEDS-KEYS (docs/order-consumer-prep.md)", cites: [REQ_TURN, `${R}data/battle_anim_scripts.s:9225`] },
  MOVE_RAZOR_WIND: { drop: ["E-OUT"], add: [], note: "visible charge turn selected by request.turn like live Solar Beam (turn bit 0)", cites: [REQ_TURN, `${R}data/battle_anim_scripts.s:7515`] },
  MOVE_SKY_ATTACK: { drop: ["E-OUT"], add: [], note: "visible charge turn selected by request.turn like live Solar Beam", cites: [REQ_TURN, `${R}data/battle_anim_scripts.s:2918`] },
  MOVE_ABSORB: { drop: ["E-OUT"], add: [], note: "STALE triage verdict: the config carries no HP field (h-buffer-triage.md s2.10); the HP bar belongs to the ordinary queue", cites: [SC("SceneOnAbsorbConfig")] },
  MOVE_MEGA_DRAIN: { drop: ["E-OUT"], add: [], note: "same as Absorb (no HP field in the config)", cites: ["src/animation/megaDrain.ts:85"] },
  MOVE_GIGA_DRAIN: { drop: ["E-OUT"], add: [], note: "same as Absorb", cites: ["src/animation/gigaDrain.ts:86"] },
  MOVE_DREAM_EATER: { drop: ["E-OUT"], add: [], note: "same as Absorb", cites: ["src/animation/dreamEater.ts:44"] },
  MOVE_ROCK_BLAST: { drop: ["E-OUT"], add: [], note: "bodies[] = one body per hit; request.multihit/turn exist and the per-hit machinery is live for Double Slap/Comet Punch/Triple Kick", cites: [REQ_TURN, "src/animation/rockBlast.ts:21"] },
  MOVE_ROLLOUT: { drop: ["E-OUT"], add: ["X-DISABLE"], note: "counter = rolloutTimerStartValue - rolloutTimer - 1 from the DisableStruct snapshot, not on the request", cites: DISABLE },
  MOVE_SAND_ATTACK: { drop: ["E-OUT"], add: [], note: "STALE triage verdict: the accuracy banner is body (sandAttackAccuracyBannerAtAge); controllerProfile only feeds resultText/currentMove HUD fields (sceneOnPresentation.ts sceneOnSandAttackView)", cites: [SC("sceneOnSandAttackView")] },
  MOVE_MAGNITUDE: { drop: [], add: ["X-POWER"], note: "STALE order-consumer-prep verdict (BLOCKED / unsupported-evidence): ANIMATION_COVERAGE.json now records MOVE_MAGNITUDE exact (764/764 zero-residual, all four bodies). The regular/intense branch is movePower > 99 (magnitude.ts:88) and the request emits the static move-table power", cites: ["src/animation/magnitude.ts:88", "src/engine/battleScriptHitChainOpcode.ts:2285"] },
  MOVE_ROCK_SLIDE: { drop: ["B"], add: ["B"], note: "order input = GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE.spriteOrderSeed (64) = occupied prefix + free order (first action: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER `4,3,21,20,5,...`, spriteOrderProvider.ts:38); accepted opponent-attacker only (rock-slide-grovyle-onix.json), no player-attacker evidence", cites: [`${SCP}:${scLines.findIndex((l) => /^export const GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE/.test(l)) + 1}`, "src/engine/spriteOrderProvider.ts:38"] },
  MOVE_DRAGON_DANCE: { drop: [], add: ["B"], note: "STALE triage READY-NOW (no order field): prep6 measured one order bit (relative sSpriteOrder position of slots 3/4 at window age 20); first-body provider supplies it", cites: ["src/animation/dragonDance.ts:157"] },
  MOVE_FIRE_BLAST: { drop: [], add: ["B"], note: "STALE triage READY-NOW: the reducer replays a persistent 64-pool order from the hard-coded FIRE_BLAST_ORDER_SEED; prep6 NEEDS-ORDER (1..35 of 197 frames change for arbitrary seeds)", cites: ["src/animation/fireBlast.ts:34", "src/animation/fireBlast.ts:319"] },
  MOVE_DOUBLE_TEAM: { drop: [], add: ["B"], note: "STALE triage READY-NOW: frontClone a|b is the persistent-order tie winner of slots 3/4 (1 bit; seed shape A measured = a); opponent-attacker evidence missing", cites: ["src/animation/sceneOnPresentation.ts:6082", "src/animation/sceneOnPresentation.ts:13510"] },
};
const EXTRA_CITE = { // blocker cites for needs codes that the triage fields do not carry
  "X-DISABLE": DISABLE,
};
// (b) curated entries: moves outside the triage (H_BASIC / H_DERIVED / H_RANDOM / H_OUTCOME leftovers).
const CURATED = {
  MOVE_BATON_PASS: { needs: ["X-SWITCH"], blockers: { "X-SWITCH": ["attackanimation; openpartyscreen; switchoutabilities; returntoball; switchinanim after the body", [`${R}data/battle_scripts_1.s:1700-1714`, SC("SceneOnBatonPassConfig")]] }, note: "body ends in a Pokeball sprite hand-off with no live switch owner (docs/next-adapters-prep2.md row 2)" },
  MOVE_ROAR: { needs: ["X-SWITCH"], blockers: { "X-SWITCH": ["AnimTask_SlideOffScreen leaves the target off-screen, then returntoball + BattleScript_TrainerBattleForceOut", [`${R}data/battle_scripts_1.s:3324-3338`, SC("SceneOnRoarConfig")]] }, note: "the animation runs only inside BattleScript_SuccessForceOut" },
  MOVE_WHIRLWIND: { needs: ["X-SWITCH"], blockers: { "X-SWITCH": ["same forced-switch continuation as Roar (slide-off on the target)", [`${R}data/battle_scripts_1.s:3324-3338`, SC("SceneOnWhirlwindConfig")]] }, note: "same provider as Roar" },
  MOVE_SLEEP_TALK: { needs: [], blockers: {}, note: "STALE verdict (prep2 BLOCKED: called-move flow): Metronome is live with the called move as a separate request (liveMoveAnimation.ts:417,1043), so only the renderer's hard-coded HUD block (battleScene.ts:34256 branch) must go behind !liveField; SceneOnSleepTalkConfig has no profile (sceneOnPresentation.ts:3352). Measured prep exists (1356/4570 windows, row 0, 186 rows)", cites: ["src/engine/liveMoveAnimation.ts:417", "src/engine/battleScene.ts:34256", SC("SceneOnSleepTalkConfig")] },
  MOVE_SUBSTITUTE: { needs: ["X-SUBST"], blockers: { "X-SUBST": ["body ends with the battler shown as the doll (AnimTask_MonToSubstitute); field art view has no behind-substitute state", [`${R}data/battle_scripts_1.s:1085-1103`, "src/engine/battleCommandFieldArt.ts:1", SC("SceneOnSubstituteConfig")]] }, note: "persistent doll sprite after the body" },
  MOVE_PAIN_SPLIT: { needs: ["X-REDUCER"], blockers: { "X-REDUCER": ["reducer hard-codes the four accepted (species,side) y2 constants (4/2/2, 5/3/3, 5/2/2); production liveBattlerCoordAttrs.yOffset reproduces them exactly (prep6 pins) but is not a reducer input", ["src/animation/painSplit.ts:76-90", "src/engine/liveMoveAnimation.ts:209"]] }, note: "SMALL-INPUT: per-side coords.yOffset into painSplit.ts:76-90 (+ species-typed renderer branch battleScene.ts:44895-44940); all other prep6 facts READY (docs/next-adapters-prep6.md s0)" },
  MOVE_EXTREME_SPEED: { needs: ["X-AGE"], blockers: { "X-AGE": ["evidence covers ages 48..350 only (window starts mid-body: activation 78, window 87, ageOffset 48, row 39); ages 0..47 never accepted; 1 rental species (Arcanine)", [SC("SceneOnExtremeSpeedConfig"), "src/animation/extremeSpeed.ts:1"]] }, note: "OUT: needs animation-lane dense evidence for the first 48 source ages (docs/next-adapters-prep2.md row 20)" },
  MOVE_MEMENTO: { needs: ["D-SCAN"], blockers: { "D-SCAN": ["reducer.initialScanlineSourceBuffer / initialScanlineBuffers[2][320] captured from RAM (HDMA scanline state)", ["src/animation/memento.ts:31-32", "src/animation/memento.ts:269"]] }, note: "self-KO displayed HP 0 is the same input proven for Self-Destruct (prep6); the scanline buffer has no production owner" },
  MOVE_METEOR_MASH: { needs: ["C"], blockers: { C: ["twinkles: 48 Random2-resolved variants (optional field; geometry.twinkles)", ["src/animation/meteorMash.ts:46", "src/animation/meteorMash.ts:195"]] }, note: "everything else is anchors + faint-attack-style profile" },
  MOVE_WISH: { needs: ["C"], blockers: { C: ["twinkles: 21 Random2-resolved variants, reducer throws on any other count", ["src/animation/wish.ts:104-107", "src/animation/wish.ts:136"]] }, note: "no species gate in the renderer (art lookup by species)" },
  MOVE_SPARK: { needs: ["B", "X-SCHED"], blockers: { B: ["hardwareTieSlotOrder [12,7,3,4,5,9,10,11] (order provider first body may supply)", ["src/animation/spark.ts:19", SC("SceneOnSparkConfig")]], "X-SCHED": ["flashingInitialCallbackAdvances / flashingInitialAffineAdvances (scheduler advances before the first accepted frame; unmeasured whether derivable from spawn timing)", ["src/animation/spark.ts:19-21", "src/animation/spark.ts:261-267"]] }, note: "accepted targetPictureOffset (176,40) is not the pic point (176,49); window starts 9 frames after activation (row -9)" },
  MOVE_REVERSAL: { needs: ["X-REDUCER", "X-POWER"], blockers: { "X-POWER": ["amplitude clamp(power/12,1,16) needs the dynamic power (Reversal power is gDynamicBasePower, not the static table power)", ["src/engine/battleScriptHitChainOpcode.ts:2285", "src/animation/reversal.ts:6-10"]], "X-REDUCER": ["accepted reducer toggles A/0 while the source toggles +ceil(A/2)/-floor(A/2) (exact only at A=1); evidence banked in docs/reversal-shake-evidence.md", ["src/animation/reversal.ts:6-10", "src/engine/battleScriptHitChainOpcode.ts:2276-2289"]] }, note: "SMALL-INPUT: reducer toggle fix + A>1 tests from tools/integration/fixtures/reversal-shake-evidence.json, then amplitude from request.power (caveat: HP lowered by Super Fang from a non-learner)" },
  MOVE_ASTONISH: { needs: ["C"], blockers: { C: ["dropletRandom: 4 Random2 words (AnimSprayWaterDroplet 0x1ff&, 0x7f&)", ["src/animation/astonish.ts:151", `${R}src/battle_anim_flying.c:1106-1107`]] }, note: "targetPictureYOffset is coords-derivable" },
  MOVE_DOUBLE_KICK: { needs: ["C"], blockers: { C: ["fistRandom: 4 Random2 words (x, y, two sign bits)", ["src/animation/doubleKick.ts:17", `${R}src/battle_anim_fight.c:487-492`]] }, note: "targetDimensions is coords-derivable; two hits -> per-hit windows as in multihit-prep" },
  MOVE_FLAIL: { needs: ["C", "X-POWER"], blockers: { C: ["visualRandom: 2 Random2 words (x%48-24, y%24-12)", ["src/animation/flail.ts:171-181", `${R}src/battle_anim_normal.c:1062-1063`]], "X-POWER": ["movePower: AnimTask_ShakeTargetBasedOnMovePowerOrDmg divides gAnimMovePower by 12 (battle_anim_mon_movement.c:970-998; AnimTask_FlailMovement is the RNG-free attacker motion); the request emits the static table power, Flail power is gDynamicBasePower (ROM passes gBattleMovePower)", ["src/engine/battleScriptHitChainOpcode.ts:2285", `${R}src/battle_anim_mon_movement.c:975`]] }, note: "AnimTask_FlailMovement is RNG-free" },
  MOVE_LUSTER_PURGE: { needs: ["C", "D-BG"], blockers: { C: ["visualRandom: 12 Random2 words (6 hitsplats x 2)", ["src/animation/lusterPurge.ts:29", `${R}src/battle_anim_normal.c:1062-1063`]], "D-BG": ["monbgCenter / monbgPosition (monbg state)", [SC("SceneOnLusterPurgeConfig")]] }, note: "also attackerBattlerId, sprite slots, circleCenter (A/A-SLOT)" },
  MOVE_THRASH: { needs: ["C"], blockers: { C: ["fistRandom: 12 Random2 words (three fist sprites x 4)", ["src/animation/thrash.ts:1", `${R}src/battle_anim_fight.c:487-492`]] }, note: "lock-in / confusion end flow is gameplay, not presentation" },
  MOVE_AERIAL_ACE: { needs: [], blockers: {}, note: "STALE readiness H_OUTCOME verdict: the body (aerialAceAnimationAtAge) does not read controllerProfile; it feeds only hitReaction / displayedTargetHp / resultText / currentMove (HUD fields the ordinary queue owns). Recipe: pass displayed HP (before, before-damage) + dummy ages, retire the PIDGEOTTO/ONIX gate and hard-coded HUD under !liveField", cites: [SC("sceneOnAerialAceView")] },
  MOVE_QUICK_ATTACK: { needs: [], blockers: {}, note: "STALE H_OUTCOME verdict: afterimage body independent of controllerProfile (HUD/result text only); same recipe as Aerial Ace; renderer branch battleScene.ts:48615 draws PIDGEOTTO/ONIX art + HUD. Afterimage slots 3/4 carry an explicit OAM-tie suppression (battleScene.ts:20847): slot plan = first-free plus a tie audit (docs/allocator-consumer-tie-audit.md)", cites: [SC("sceneOnQuickAttackView"), "src/engine/battleScene.ts:48615", "src/engine/battleScene.ts:20847"] },
  MOVE_FIRE_PUNCH: { needs: ["E-OUT"], blockers: { "E-OUT": ["view.burnFlames depend on resolution.secondaryRollSucceeded and resolution.faint (burn roll + target faint outcomes), which the MOVE_ANIMATION request does not carry; the view bundles status-animation flames with the move body", [SC("sceneOnFirePunchView"), SC("SceneOnFirePunchConfig")]] }, note: "SMALL-INPUT: secondary-effect (burn applied) + faint outcome, or a body-only split that leaves flames to the ordinary status animation" },
  MOVE_ICE_PUNCH: { needs: [], blockers: {}, note: "STALE H_OUTCOME verdict: overlay/crystals/hitCrystals read only the target animationCenter/side; hpDrain/status/held-item/action-menu are HUD fields. Freeze status is a separate ordinary-queue status animation", cites: [SC("sceneOnIcePunchView")] },
  MOVE_FEATHER_DANCE: { needs: [], blockers: {}, note: "STALE H_OUTCOME verdict: feathers depend on battlePositionCenter/side/ageOffset only; stat-stage message is controllerDisplay (HUD). The stat change itself is a separate ordinary-queue event", cites: [SC("sceneOnFeatherDanceView")] },
  MOVE_FAKE_TEARS: { needs: [], blockers: {}, note: "STALE H_OUTCOME verdict: sceneOnFakeTearsView reads only attackerPictureBounds (derivable from liveBattlerAnchors picture rect); controllerPresentation is not read by the view (renderer HUD only). The stat drop is a separate queue event", cites: [SC("sceneOnFakeTearsView")] },
  MOVE_BOUNCE: { needs: ["X-TWOTURN"], blockers: { "X-TWOTURN": ["turn selector (BounceTurn) + strikeEffectDelay / strikeAttackerRestoreAge: attacker hidden between turns", [SC("SceneOnBounceConfig"), REQ_TURN]] }, note: "controllerProfile is HUD only; paralysis status is a separate queue event" },
  MOVE_FLY: { needs: ["X-TWOTURN"], blockers: { "X-TWOTURN": ["turn selector (FlyTurn): attacker hidden between turns (semi-invulnerable ON_AIR)", [SC("SceneOnFlyConfig"), REQ_TURN]] }, note: "controllerProfile is HUD only (charge / strike message ages)" },
};
// (c) the nine newest accepted moves (LiveInputs shape, no triage row): classified from the typed source fields.
const NEW9 = { MOVE_WILL_O_WISP: ["willOWisp", "WillOWispLiveInputs", 2740], MOVE_MEGAHORN: ["megaHorn", "MegaHornLiveInputs", 2751], MOVE_SUPERPOWER: ["superpower", "SuperpowerLiveInputs", 2761], MOVE_REVENGE: ["revenge", "RevengeLiveInputs", 2771], MOVE_SPIT_UP: ["spitUp", "SpitUpLiveInputs", 2781], MOVE_FURY_CUTTER: ["furyCutter", "FuryCutterLiveInputs", 2792], MOVE_ICE_BALL: ["iceBall", "IceBallLiveInputs", 2803], MOVE_CURSE: ["curse", "CurseLiveInputs", 2814], MOVE_OUTRAGE: ["outrage", "OutrageLiveInputs", 2350] };

// field extraction for the nine (copy of the hBufferTriage.mjs field walker, depth-limited)
function fieldsOfFile(file, typeName) {
  const lines = linesOf(file);
  if (!lines) return [];
  const start = lines.findIndex((l) => new RegExp(`^export (interface|type) ${typeName}\\b`).test(l));
  if (start < 0) return [];
  const out = [];
  let depth = 0, seen = false;
  const stack = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i], line = raw.trim();
    const m = /^(?:readonly )?([A-Za-z0-9_]+)\??:\s*(.*)$/.exec(line);
    if (m && depth >= 1 && stack.length <= 1) {
      out.push({ path: [...stack, m[1]].join("."), line: i + 1, type: m[2].slice(0, 80) });
      if (/Readonly<\{\s*$/.test(m[2]) || /\{\s*$/.test(m[2])) stack.push(m[1]);
    } else if (m && depth >= 1) { /* deeper: skip */ }
    // single-line inline objects also carry sub-fields (e.g. `readonly taskSlots: Readonly<{ updateMonBg: number; ... }>`)
    for (const ch of raw) { if (ch === "{") { depth++; seen = true; } if (ch === "}") { depth--; if (stack.length > depth - 1 && depth >= 1) stack.length = Math.max(0, depth - 1); } }
    if (seen && depth <= 0) break;
  }
  return out;
}
const RULES = [ // same precedence as tools/integration/hBufferTriage.mjs RULES (subset used by the LiveInputs records)
  [/^(gameplayRng|gameplayState|immutableGameplayState)$/, "A"],
  [/Rng|AtAge0/i, "C"],
  [/spriteOrder|orderSeed|painterOrder|activeOrderKeys|initialOrder|persistentOrder/, "B"],
  [/taskSlots?$|TaskSlot|(^|\.)tasks(\.|$)|sharedTaskData|liveTasks|liveCounts/i, "E-TASK"],
  [/softwareOam|hardwareOam|buffers|softwareMatrices|hardwareMatrices/, "D-OAM"],
  [/vram|Vram/, "D-VRAM"],
  [/scanline|Scanline/i, "D-SCAN"],
  [/registers|monbg|background|bgOffset/, "D-BG"],
  [/palette|Palette|unfaded|faded|hardware/, "D-PAL"],
  [/tileSlot|resources?$|allocator/, "D-TILE"],
  [/matrix|Matrix/, "F-AFFINE"],
  [/audio|Pan$/, "F-AUDIO"],
  [/Slot|Slots|slot$|^art|Art$|sprites?$/, "A-SLOT"],
];
const classify1 = (p) => { for (const [re, c] of RULES) if (re.test(p)) return c; return "A"; };

// ---- per-move build ----------------------------------------------------------------------------------------------------
const palPlanMoves = new Set(Object.values(palRes.plans).map((p) => p.move));
const activationNames = new Set();
for (const f of ["issue142-shadow-rows.json", "issue142-shadow-rows-extra.json", "multihit-shadow-rows.json", "prep6-summary.json", "prep5-summary.json", "order-consumer-summary.json"]) {
  const p = `tools/integration/fixtures/${f}`;
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, "utf8");
  for (const m of text.matchAll(/"move"\s*:\s*"([A-Z_0-9]+)"/g)) activationNames.add(`MOVE_${m[1].replace(/^MOVE_/, "")}`);
}
const actSummary = fs.existsSync("tools/integration/fixtures/census-activation/summary.json") ? rd("tools/integration/fixtures/census-activation/summary.json").rows : [];
const actByMove = {};
for (const r of actSummary) (actByMove[`MOVE_${r.move}`] ??= []).push({ probe: r.probe, staged: !!r.staged, activation: r.activation, scriptFrames: r.scriptFrames, windowStart: r.window?.start ?? null, windowEnd: r.window?.end ?? null, activationMinusWindowStart: r.activationMinusWindowStart ?? null, windowEndMinusScriptEnd: r.windowEndMinusScriptEnd ?? null, reducerAgeAtActivation: r.reducerAgeAtActivation ?? null, note: r.note ?? null });
const bodyVerdict = (id, side) => plans.bodies[`${id}:${side}`]?.verdict ?? "NOT-OBSERVED";

const cfgCite = (m) => { const e = readinessByMove[m]; const sym = e ? e.entryPoints.config.symbol : (mergedByMove[m]?.entryPoints?.config ?? null); return sym ? SC(sym) : null; };
const triageDrift = [];
const rows = [];
for (const m of remaining) {
  const r = readinessByMove[m], mg = mergedByMove[m];
  const hostClass = (r ?? mg).hostClass;
  const t = triageByMove[m], c = CURATED[m];
  const row = { move: m, id: ids[m], name: nameOf[m], hostClass, weightShare: share(m), config: null, needs: [], blockers: [], notes: [], staleCorrections: [] };
  row.config = cfgCite(m);
  const add = (code, text, cites) => { if (!row.needs.includes(code)) row.needs.push(code); row.blockers.push({ code, text, cites }); for (const x of cites) checkCite(x); };
  if (t) {
    const fx = EOUT_FIX[m];
    const need = t.needs.filter((n) => !(fx?.drop ?? []).includes(n));
    for (const n of need) {
      const f = t.fields.find((x) => x.cls.includes(n));
      // triage cites into sceneOnPresentation.ts are stale config-line numbers: re-resolve through the config symbol
      const stale = f && f.cite.startsWith(SCP);
      const nodeCites = f && !stale ? [f.cite.replace(/^\.\//, "")] : [];
      if (f && !stale) { const [file, ln] = f.cite.split(":"); const seg = f.path.split(".").pop().replace(/^animation(Inputs|Profile|Geometry):/, ""); const text = linesOf(file)?.[Number(ln) - 1] ?? ""; if (!text.includes(seg.split(":").pop())) triageDrift.push(`${m} ${f.path} ${f.cite}`); }
      add(n, f ? `${f.path} (${f.note})` : n, nodeCites.length ? nodeCites : [row.config]);
    }
    for (const n of fx?.add ?? []) add(n, CODES[n], EXTRA_CITE[n] ?? fx.cites);
    if (fx) { row.notes.push(fx.note); row.staleCorrections.push(fx.note); for (const x of fx.cites) checkCite(x); }
    row.consumedInputs = t.fields.map((f) => {
      const cls = f.cls.filter((x) => x !== "A"), stale = f.cite.startsWith(SCP);
      const status = cls.length === 0 ? "derivable-now" : cls.every((x) => x === "A-SLOT" || x === "B") ? (cls.includes("B") ? "first-body-order" : "slot-plan (recipe)") : `blocked: ${cls.filter((x) => x !== "A-SLOT" && x !== "B").join("+")}`;
      return { path: f.path, classes: f.cls, status, cite: stale ? null : f.cite };
    });
    row.staleFieldCites = row.consumedInputs.filter((x) => x.cite && (() => { const [file, ln] = x.cite.split(":"); return !(linesOf(file)?.[Number(ln) - 1] ?? "").trim(); })()).length;
    row.slotPlanNeeded = !!t.needsSpriteSlotPlan;
    row.orderKind = t.orderKind ?? null;
    row.carrierOccurrences = t.carrier?.occurrences ?? 0;
    row.stagedOrientations = t.orientationCoverage;
  } else if (c) {
    for (const n of c.needs) { const [text, cites] = c.blockers[n]; add(n, text, cites); }
    row.notes.push(c.note);
    if (c.cites) for (const x of c.cites) checkCite(x);
    row.staleCorrections = /STALE/.test(c.note) ? [c.note] : [];
  } else if (NEW9[m]) {
    const [file, type, cfgLine] = NEW9[m];
    const path = `src/animation/${file}.ts`;
    const fields = fieldsOfFile(path, type).filter((f) => !/^(attackerSide|targetSide|defenderSide|attackerSpecies|targetSpecies|defenderSpecies|attackerCenter|targetCenter|defenderCenter|attackerPictureOrigin|targetPictureOrigin|attackerPictureOffset|targetPictureOffset)$/.test(f.path));
    const seenCls = new Set();
    for (const f of fields) {
      const cls = classify1(f.path);
      if (cls === "A" || cls === "A-SLOT" || seenCls.has(cls)) continue;
      seenCls.add(cls);
      add(cls, `${f.path} (${f.type.slice(0, 50)})`, [`${path}:${f.line}`]);
    }
    row.slotPlanNeeded = fields.some((f) => classify1(f.path) === "A-SLOT");
    row.consumedInputs = fields.map((f) => { const cls = classify1(f.path); return { path: f.path, classes: [cls], status: cls === "A" ? "derivable-now" : cls === "A-SLOT" ? "slot-plan (recipe)" : cls === "B" ? "first-body-order" : `blocked: ${cls}`, cite: `${path}:${f.line}` }; });
    if (!seenCls.size) row.notes.push("no buffer fields found");
    const sel = { MOVE_SPIT_UP: ["X-DISABLE", "stockpiles 1/2/3 branch = DisableStruct.stockpileCounter (Cmd_stockpiletohpheal sets animTurn only for Swallow; Spit Up reads the counter from the DisableStruct snapshot)", [`${R}src/battle_script_commands.c:1787`, "src/animation/spitUp.ts:14"]], MOVE_FURY_CUTTER: ["X-DISABLE", "counter 1..4 = DisableStruct.furyCutterCounter (AnimTask_IsFuryCutterHitRight)", [`${R}src/battle_anim_effects_2.c:3824`, "src/animation/furyCutter.ts:14"]], MOVE_ICE_BALL: ["X-DISABLE", "counter 0..4 = rolloutTimerStartValue - rolloutTimer - 1 (AnimTask_GetIceBallCounter)", [`${R}src/battle_anim_ice.c:1613`, "src/animation/iceBall.ts:9"]], MOVE_CURSE: ["E-OUT", "branch ghost|stats = request.turn (choosetwoturnanim, battle_anim_scripts.s:7641); the request already carries it, so this is recipe, not a provider", [`${R}data/battle_anim_scripts.s:7641`, "src/animation/curse.ts:22"]] }[m];
    if (sel && sel[0] === "E-OUT") { row.notes.push(sel[1]); sel[2].forEach(checkCite); row.staleCorrections.push("Curse selector is request.turn"); }
    else if (sel) add(sel[0], sel[1], sel[2]);
    row.notes.push("accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs");
  } else throw new Error(`no data source for ${m}`);
  row.config && checkCite(row.config);
  // Production TODAY supplies these (gated on the lent order, so first bodies and tracked later bodies; docs/allocator-plan-v2-evidence.md):
  //   B = sSpriteOrder via the lend + cross-body tracker; F-AFFINE/E-TASK = the constant 0x6 bitmap / no-task baseline at every known-entry body.
  row.orderFirstBodyOnly = row.needs.includes("B"); // kept key name: now means "consumes the lent order"
  row.lentConstants = row.needs.filter((n) => LENT.has(n));
  row.providerNeeds = row.needs.filter((n) => !LENT.has(n));
  row.palettePlan = palPlanMoves.has(m);
  row.activationMeasured = activationNames.has(m) || !!actByMove[m];
  row.activationReceipts = actByMove[m] ?? [];
  row.ownBodyOrder = { opponent: bodyVerdict(row.id, "opponent"), player: bodyVerdict(row.id, "player") };
  const p = row.providerNeeds;
  row.group = p.length === 0 ? "READY-NOW"
    : p.every((x) => OUT.has(x)) ? "OUT"
    : p.every((x) => SMALL.has(x)) ? "SMALL-INPUT"
    : p.length === 1 ? `PROVIDER-${p[0]}`
    : "MULTI";
  rows.push(row);
}

// ---- provider ranking --------------------------------------------------------------------------------------------------
const providers = Object.keys(CODES).filter((c) => !LENT.has(c));
const need = (r) => new Set(r.providerNeeds);
function unlocked(provided) { return rows.filter((r) => r.providerNeeds.length && r.providerNeeds.every((n) => provided.has(n))); }
function cover(provided) {
  const rs = rows.filter((r) => r.providerNeeds.every((n) => provided.has(n)));
  return { moves: rs.length, weight: rs.reduce((a, r) => a + r.weightShare, 0) };
}
const base = new Set(); // nothing provided: READY-NOW rows are the floor
const floor = cover(base);
const ranking = [];
const candidates = [...providers.map((p) => ({ key: p, label: CODES[p], codes: [p] })), ...Object.entries(BUNDLES).map(([k, v]) => ({ key: k, label: k, codes: v }))];
for (const c of candidates) {
  const s = new Set(c.codes), cv = cover(s);
  const alone = cv.moves - floor.moves, aloneWeight = cv.weight - floor.weight;
  const touching = rows.filter((r) => r.providerNeeds.some((n) => c.codes.includes(n)));
  ranking.push({ provider: c.key, label: c.label, codes: c.codes, aloneMoves: alone, aloneWeightPct: +(aloneWeight * 100).toFixed(3), aloneNames: unlocked(s).filter((r) => r.providerNeeds.every((n) => s.has(n))).map((r) => r.move.replace("MOVE_", "")), touchingMoves: touching.length, touchingWeightPct: +(touching.reduce((a, r) => a + r.weightShare, 0) * 100).toFixed(3) });
}
ranking.sort((a, b) => b.aloneMoves - a.aloneMoves || b.aloneWeightPct - a.aloneWeightPct);
// greedy marginal sequence over singletons + bundles (each step: max newly fully-unlocked moves, then weight)
const greedy = [];
{
  const have = new Set();
  let cur = cover(have);
  const left = candidates.filter((c) => c.codes.some((x) => rows.some((r) => r.providerNeeds.includes(x))));
  for (let step = 0; step < 14 && left.length; step++) {
    let best = null;
    for (const c of left) {
      const s = new Set([...have, ...c.codes]), cv = cover(s);
      const dm = cv.moves - cur.moves, dw = cv.weight - cur.weight;
      if (!best || dm > best.dm || (dm === best.dm && dw > best.dw)) best = { c, dm, dw, s, cv };
    }
    if (!best) break;
    greedy.push({ step: step + 1, provider: best.c.key, newMoves: best.dm, newWeightPct: +(best.dw * 100).toFixed(3), cumulativeRemainingUnlocked: best.cv.moves, newNames: rows.filter((r) => r.providerNeeds.length && r.providerNeeds.every((n) => best.s.has(n)) && !r.providerNeeds.every((n) => have.has(n))).map((r) => r.move.replace("MOVE_", "")) });
    for (const x of best.c.codes) have.add(x);
    cur = best.cv;
    left.splice(left.indexOf(best.c), 1);
  }
}


// ---- provider metadata + recommended batches -----------------------------------------------------------------------------
const PROVIDER_META = {
  "allocator plan v2 (affine+task)": { cost: "new provider (sibling affine-bitmap + task table fed by the same create/destroy events as src/engine/liveSpriteAllocator.ts:89-123; per-move timelines like src/engine/liveMoveSpriteAllocator.ts:28)", claim: "exact from a known baseline (lowest-free allocations); baseline of gOamMatrix bitmap and gTasks at move activation must be measured" },
  "F-AFFINE": { cost: "new provider (matrixBitmap lowest-free over a known baseline)", claim: "exact from a known baseline" },
  "E-TASK": { cost: "new provider (CreateTask slot table)", claim: "exact from a known baseline" },
  C: { cost: "new provider (presentation-only LCG ISO_RANDOMIZE1 stream, docs/visual-randomness-prep.md s4)", claim: "NON-EXACT per play: gRng2Value also advances once per rendered frame plus every earlier animation's draws (not reconstructible from battle state); exact only with a pinned seed. Claim-boundary question: ROM-faithful in distribution and draw order, not bit-exact" },
  "A6 graphics host (OAM+VRAM+scanline+BG+palette+tile+audio)": { cost: "new large host (docs/animation-integration-readiness.md A6)", claim: "only as exact as the persisted graphics history; per-move retained oracle rows are verifier-only today" },
  "D-PAL": { cost: "extend existing (src/engine/liveMoveAnimationPalette.ts:8-11,91 returns only the Shadow Punch scratch; plans in src/data/gen/live-animation-palette-resources.json cover 58 moves)", claim: "exact for audited plan rows from a known entry; actual status animations/switches invalidate" },
  "X-SWITCH": { cost: "new flow owner (switch / forced-switch presentation; shares the pending 'actual switches' graphics ownership)", claim: "separate S10x program: forced replacement and summaries are explicitly pending in docs/animation-integration-live-status.json" },
  "E-OUT": { cost: "per-move plumbing from resolution (secondary-effect / HP / stale-power values)", claim: "exact outcome data; no RNG ownership" },
  "X-TWOTURN": { cost: "hidden-battler state across the two turns in the field art view", claim: "exact once the semi-invulnerable state is rendered" },
  "X-DISABLE": { cost: "add a DisableStruct counter snapshot to the MOVE_ANIMATION request (rules context already holds the counters)", claim: "exact (presentation-only copy of rules state)" },
  "X-POWER": { cost: "emit the dynamic gBattleMovePower/gDynamicBasePower on the request instead of the static table power (src/engine/battleScriptHitChainOpcode.ts:2285)", claim: "exact; must not alter damage" },
};
// Batches are DERIVED from the groups (no hard-coded move lists: N1-N3 landed and every pick is recomputed each run).
const BATCH_PICKS = (() => {
  const byGroup = (g) => rows.filter((r) => r.group === g).sort((x, y) => y.weightShare - x.weightShare).map((r) => r.move.replace("MOVE_", ""));
  const top = greedy[0];
  const mk = (id, title, names, why) => ({ id, title, moves: names, prep: Object.fromEntries(names.map((n) => [n, why(n)])) });
  const rowOf = (n) => rows.find((r) => r.move === `MOVE_${n}`);
  const short = (n) => { const r = rowOf(n); return r.activationReceipts.length ? `activation measured (${r.activationReceipts.length} receipt${r.activationReceipts.length === 1 ? "" : "s"}); ` : "no activation receipt; "; };
  const blk = (n) => rowOf(n).blockers.map((b) => `${b.code}: ${b.text}`).join(" | ") || "none (recipe work only)";
  const p1 = byGroup("READY-NOW"), p2 = byGroup("SMALL-INPUT");
  // A move already picked by P1/P2 is not repeated in P3 (the greedy provider's newly unlocked names can include a READY-NOW move).
  const p3 = top ? top.newNames.filter((n) => !p1.includes(n) && !p2.includes(n)) : [];
  return [
    mk("P1", "READY-NOW (derived): no provider dependency", p1, (n) => short(n) + blk(n)),
    mk("P2", "SMALL-INPUT (derived): one named input / reducer parameter each (docs/next-adapters-prep10.md measures them)", p2, (n) => short(n) + blk(n)),
    mk("P3", `first provider build (derived from the greedy order): ${top ? top.provider : "none"}`, p3, (n) => short(n) + blk(n)),
  ].filter((b) => b.moves.length);
})();

const STALE_CODES = [
  "B (sSpriteOrder): was 'first body only'; production now lends the order and tracks it across bodies (liveSpriteOrderHost.ts / spriteOrderProvider.ts, merged cross-body tracker + post-KO rung 1), so B no longer blocks anything; recipe work only (falls back after an unmodelled graphics command)",
  "F-AFFINE / E-TASK: were provider blockers; docs/allocator-plan-v2-evidence.md measured gOamMatrixAllocBitmap 0x6 + no tasks at all 481 known-entry bodies, so the accepted constants gated on the lent order suffice for first bodies (invalidated after a faint/switch)",
  "D-PAL: prep9 (docs/next-adapters-prep9.md) showed Absorb/Mega Drain/Giga Drain/Dream Eater/Sunny Day consume only age-derived blend schedules, no snapshot; those five are not in the remaining set. D-PAL on the remaining moves is NOT re-measured here and stays a blocker",
  "C (Random2): gRng2Value is not trackable across real play (docs/random2-trackability.md) but D3 (2026-10-06) approved a deterministic presentation-only surrogate; C now means \"needs the presentation RNG + the move's draw plan\" (docs/next-adapters-prep12-random2.md). Hidden Power / Ice Beam / Water Spout draw no Random2 at all (their animationRng is an echo): C is stale there",
  "Fire Punch accepted-window phase: not a mismatch (prep10: opponent window starts after the body; player reducer age at activation 27); Flail/Reversal X-POWER cite corrected (the power divide is AnimTask_ShakeTargetBasedOnMovePowerOrDmg, not FlailMovement)",
  "Batches N1-N3 (hard-coded) all landed except the one-input moves; batch picks are now derived from the groups each run",
  "SMALL-INPUT now means every needed code is a small input (X-REDUCER, X-POWER, E-OUT, X-DISABLE, X-SCHED), several allowed",
];
// ---- summary -----------------------------------------------------------------------------------------------------------
const groupCount = {};
for (const r of rows) { const g = r.group.startsWith("PROVIDER-") ? "PROVIDER-x" : r.group; (groupCount[g] ??= { moves: 0, weightPct: 0 }); groupCount[g].moves++; groupCount[g].weightPct += r.weightShare * 100; }
for (const g of Object.values(groupCount)) g.weightPct = +g.weightPct.toFixed(3);
const sumW = (ms) => +(ms.reduce((a, m) => a + share(m), 0) * 100).toFixed(3);
const summary = {
  accepted: accepted.size,
  live: liveIn.length, faithfulRandom: faithfulIn.length, faithfulRandomMoves: [...faithfulIn].sort(),
  faithfulTiming: timingIn.length, faithfulTimingMoves: [...timingIn].sort(), inFlight: inflightIn.length, remaining: remaining.length,
  inFlightBreakdown: { orderConsumerBatch: inflightIn.filter((m) => inflight.get(m) === "order-consumer batch").length, prep6Ready: inflightIn.filter((m) => inflight.get(m) === "prep6 READY batch").length },
  weightPct: { live: sumW(liveIn), faithfulRandom: sumW(faithfulIn), faithfulTiming: sumW(timingIn), inFlight: sumW(inflightIn), remaining: sumW(remaining) },
  remainingByGroup: groupCount,
  remainingByHostClass: Object.fromEntries([...new Set(rows.flatMap((r) => r.hostClass))].sort().map((h) => [h, rows.filter((r) => r.hostClass.includes(h)).length])),
  orderFirstBodyOnlyMoves: rows.filter((r) => r.orderFirstBodyOnly).length,
  slotPlanNeededMoves: rows.filter((r) => r.slotPlanNeeded).length,
  // live (scoped exact) + faithful-random + faithful-timing + in-flight + remaining = accepted.
  sumsTo: `${liveIn.length}+${faithfulIn.length}+${timingIn.length}+${inflightIn.length}+${remaining.length}=${liveIn.length + faithfulIn.length + timingIn.length + inflightIn.length + remaining.length}`,
};
if (citeErrors.length) { console.error("CITE ERRORS:\n" + citeErrors.join("\n")); process.exit(2); }
if (rows.some((r) => r.needs.length && !r.blockers.length)) throw new Error("a need without a blocker cite");
for (const r of rows) for (const b of r.blockers) if (!b.cites.length) throw new Error(`blocker without cite ${r.move} ${b.code}`);

const batches = BATCH_PICKS.map((b) => {
  const picked = b.moves.map((n) => { const r = rows.find((x) => x.move === `MOVE_${n}`); if (!r) throw new Error(`batch ${b.id}: ${n} is not a remaining move`); return r; });
  for (const n of b.moves) if (!b.prep[n]) throw new Error(`batch ${b.id}: no prep text for ${n}`);
  return { id: b.id, title: b.title, count: picked.length, weightPct: +(picked.reduce((a, r) => a + r.weightShare, 0) * 100).toFixed(3), moves: picked.map((r) => ({ move: r.move, group: r.group, providerNeeds: r.providerNeeds, orderFirstBodyOnly: r.orderFirstBodyOnly, weightPct: +(r.weightShare * 100).toFixed(3), prep: b.prep[r.move.replace("MOVE_", "")] })) };
});
const batchSeen = batches.flatMap((b) => b.moves.map((m) => m.move));
if (new Set(batchSeen).size !== batchSeen.length) throw new Error("a move is in two batches");
for (const r of ranking) r.meta = PROVIDER_META[r.provider] ?? null;
const out = { schema: "remaining-adapters-census/v1", generatedBy: "tools/integration/remainingAdaptersCensus.mjs", inputs: ["docs/animation-integration-live-status.json", "docs/animation-integration-readiness.json", "docs/animation-integration-merged-readiness.json", "tools/integration/fixtures/h-buffer-triage.json", "tools/integration/fixtures/sprite-order-body-plans-ext.json", "src/data/gen/battle-frontier-mons.json", "src/data/gen/factory-round-policy.json"], liveStatusImplementedCount: live.implementedCount, staleCodesCorrected: STALE_CODES, inFlightMoves: Object.fromEntries([...inflight].filter(([m]) => accepted.has(m)).map(([m, k]) => [m, liveSet.has(m) ? "now live" : k])), summary: { ...summary, triageCiteDrift: triageDrift.length, triageCiteDriftList: triageDrift }, codes: CODES, bundles: BUNDLES, ranking, greedy, batches, rows };
export { out, rows, summary, ranking, greedy, batches, CODES };

if (process.argv.includes("--write")) fs.writeFileSync("tools/integration/fixtures/remaining-adapters-census.json", JSON.stringify(out, null, 1) + "\n");
if (process.argv.includes("--summary")) console.log(JSON.stringify({ summary, ranking: ranking.slice(0, 10).map((r) => [r.provider, r.aloneMoves, r.aloneWeightPct]), greedy: greedy.map((g) => [g.provider, g.newMoves, g.newWeightPct]) }, null, 1));
if (process.argv.includes("--doc")) {
  const { renderDoc } = await import("./remainingAdaptersCensusDoc.mjs");
  const doc = renderDoc(out);
  for (const mm of doc.matchAll(/`((?:src|tools|docs|reference)\/[\w./-]+\.(?:ts|mjs|json|py|c|s|md)):(\d+)(?:-(\d+))?`/g)) checkCite(mm[3] ? `${mm[1]}:${mm[2]}-${mm[3]}` : `${mm[1]}:${mm[2]}`);
  if (citeErrors.length) { console.error("DOC CITE ERRORS:\n" + citeErrors.join("\n")); process.exit(3); }
  fs.writeFileSync("docs/remaining-adapters-census.md", doc);
}
