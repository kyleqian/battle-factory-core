/**
 * Compare production live-field adapters to complete fresh source move bodies.
 * The tool supplies a displayed field and typed request, never a captured
 * per-frame host/config. Ordinary command selection is tested independently.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { prepareLiveMoveSpriteAllocator, prepareLiveMoveSpriteOrder } from "../../src/engine/liveMoveSpriteAllocator.ts";
import {
  applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState, spriteOrderPlanTableFromFixture,
  type SpriteOrderPlan,
} from "../../src/engine/spriteOrderProvider.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { SceneOnDragonRageFieldProfile } from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

export interface Fixture {
  sourceFixture?: string;
  move: string;
  denseWindow?: { startFrame: number; endFrame: number; ageOffset?: number };
  /** Ordered inclusive source-frame segments of one body whose rows are not contiguous. */
  denseSegments?: [number, number][];
  sourceWindow?: { startFrame: number; endFrame: number };
  probeMoveId?: number;
  probe: string;
  /** Extra probe CLI arguments (for example a defensive-wall mode). */
  probeArgs?: string[];
  scenario: string;
  attacker: { species: string; geometry: { side: "player" | "opponent" } };
  target: { species: string; geometry: { side: "player" | "opponent" } };
  fieldProfile: SceneOnDragonRageFieldProfile;
  /** Displayed status of each battler at the body (presentation field only; default none, e.g. the sleeping Sleep Talk user). */
  displayedStatus?: { player?: "none" | "sleep" | "burn" | "poison" | "paralysis" | "freeze"; opponent?: "none" | "sleep" | "burn" | "poison" | "paralysis" | "freeze" };
  /** Real attacker party personality (Spinda spots); presentation-only. */
  attackerPersonality?: number;
  /** Self-target moves: the species displayed on the other side of the field. */
  bystander?: { species: string };
  body?: "normal" | "shattered-wall";
  /** Controller arguments the ROM held at this body (gAnimMoveTurn/Power/Dmg). */
  /** Source text box content during this body (default: the move-used banner). */
  messageLines?: [string, string];
  requestFields?: { turn?: number; power?: number; damage?: number };
  /**
   * Units that ran before this body in the scenario (docs/sprite-order-body-plans.md §2/§5): bodies by move id and
   * ATTACKER side, in order. Omitted = this is the scenario's first body after the known entry. The harness replays
   * them with the plan applier (gap tables between units) and asserts the resulting free order equals the
   * per-fixture value in order-consumer-seeds.json (provider == accepted literal == observed); never capture rows.
   */
  precedingBodies?: { moveId: number; side: "player" | "opponent" }[];
}
interface Probe {
  frames?: { frame: number; sha256: string }[];
  rows?: { frame: number; sha256: string }[];
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ids = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.id]));
const names = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.name]));
const SELF_TARGET_MOVES = new Set(["LIGHT_SCREEN", "BARRIER", "MAGIC_COAT", "PROTECT", "REFLECT", "SOFT_BOILED"]);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

let planCache: ReturnType<typeof spriteOrderPlanTableFromFixture> | undefined;
const planFixture = (): ReturnType<typeof spriteOrderPlanTableFromFixture> => planCache ??= spriteOrderPlanTableFromFixture(
  JSON.parse(readFileSync(resolve(root, "tools/integration/fixtures/sprite-order-body-plans.json"), "utf8")));
interface SeedRow { scenario: string; move: number; attackerSide: string; observedFreeAtEdge?: number[];
  providerValid?: boolean; unitIndex: number }
let seedsCache: { scenarios: SeedRow[] } | undefined;
const seedsFixture = (): { scenarios: SeedRow[] } => seedsCache ??=
  JSON.parse(readFileSync(resolve(root, "tools/integration/fixtures/order-consumer-seeds.json"), "utf8"));

/** Order cursor at the fixture body's activation edge: known entry + the declared preceding bodies' plans. */
export function fixtureSpriteOrder(f: Fixture, request: BattleMoveAnimationRequest) {
  // POKEBENCH_LIVE_ORDER_INPUT=first-body: ignore precedingBodies and lend the known-entry order, exactly what
  // production supplies when the move is the battle's first body (the oracle frames still come from the scenario).
  if (process.env.POKEBENCH_LIVE_ORDER_INPUT === "first-body") f = { ...f, precedingBodies: [] };
  const table = planFixture();
  const entry = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove.occupants.map(o => o.slot);
  let cursor = createSpriteOrderPlanCursor(knownEntrySpriteOrderState("battle-lab-ordinary-singles"), entry);
  const keys = [...(f.precedingBodies ?? []).map(u => `${u.moveId}:${u.side}`),
    `${request.moveId}:${f.attacker.geometry.side}`];
  let previous = "entry";
  keys.forEach((key, index) => {
    const gap: SpriteOrderPlan | undefined = table.gaps.get(`${previous}>${key}`) ?? table.gapAfterBody.get(previous)
      ?? (previous === "entry" ? [] : undefined);
    cursor = applySpriteOrderUnitPlan(cursor, gap);
    if (index < keys.length - 1) cursor = applySpriteOrderUnitPlan(cursor, table.bodies.get(key));
    previous = key;
  });
  if (!cursor.order.known) throw new Error(`Sprite order unknown for ${f.move}`);
  const scenarioName = basename(f.scenario, ".json").replace(/^mechanic-/, "");
  const row = seedsFixture().scenarios.find(s => s.scenario === scenarioName && s.move === request.moveId
    && s.attackerSide === f.attacker.geometry.side && s.unitIndex === 1 + 2 * (f.precedingBodies?.length ?? 0));
  if (row && process.env.POKEBENCH_LIVE_ORDER_INPUT !== "first-body") {
    if (!row.providerValid || JSON.stringify(row.observedFreeAtEdge) !== JSON.stringify(cursor.order.free)) {
      throw new Error(`Plan-replayed order differs from order-consumer-seeds.json for ${scenarioName}`);
    }
  }
  return cursor;
}

export function liveView(f: Fixture, age: number): BattleResolutionPresentationRenderView {
  const profile = f.fieldProfile;
  const makeBattler = (side: "player" | "opponent") => {
    const mon = f.attacker.geometry.side === side ? f.attacker : f.bystander ?? f.target;
    const species = speciesStats.species.find(s => s.name === `SPECIES_${mon.species}`)?.id;
    if (species === undefined) throw new Error(`Unknown species ${mon.species}`);
    return {
      ...(f.attacker.geometry.side === side && f.attackerPersonality !== undefined
        ? { personality: f.attackerPersonality } : {}),
      species, name: mon.species, side: side === "player" ? "player" as const : "trainer" as const,
      battler: side === "player" ? 0 as const : 1 as const, partyIndex: 0 as const, level: 50,
      hp: side === "player" ? profile.playerHp : profile.opponentHp,
      maxHP: side === "player" ? profile.playerMaxHp : profile.opponentMaxHp,
      gender: (side === "player" ? profile.playerGender : profile.opponentGender) ?? "male",
      status: f.displayedStatus?.[side] ?? "none" as const, moveIds: [0, 0, 0, 0] as const,
      currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    };
  };
  const field: BattleResolutionDisplayedField = { player: makeBattler("player"), opponent: makeBattler("opponent") };
  const attacker = f.attacker.geometry.side === "player" ? 0 : 1;
  const request: BattleMoveAnimationRequest = {
    moveId: ids[f.move]!, attacker,
    target: SELF_TARGET_MOVES.has(f.move) ? attacker : attacker === 0 ? 1 : 0,
    turn: f.body === "shattered-wall" ? 1 : 0, power: 0, damage: 0, friendship: 70, multihit: 0,
    ...f.requestFields,
  };
  if (liveMoveAnimationDuration(request) === null) throw new Error(`No live adapter for ${f.move}`);
  const healthbox = (mon: typeof field.player) => ({
    name: mon.name, level: mon.level, gender: mon.gender === "genderless" ? "none" as const : mon.gender, status: mon.status,
    hpFraction: mon.hp / mon.maxHP, currentHp: mon.hp, maxHp: mon.maxHP,
  });
  // Battle text uses the source's display spelling (for example VICEGRIP,
  // not a synthesized "VICE GRIP"). This remains fixture-independent.
  const name = names[f.move] ?? f.move.replaceAll("_", " ");
  return {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: { player: healthbox(field.player), opponent: healthbox(field.opponent) },
    message: { lines: f.messageLines ?? [`${attacker === 1 ? "Foe " : ""}${f.attacker.species} used`, `${name}!`], visibleCharacters: 99 },
    effect: {
      type: "move", request, age,
      // Plans exist only for audited moves; every other move yields no input.
      spriteAllocatorInput: prepareLiveMoveSpriteAllocator(
        createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove,
        request,
      ).input,
      // Every fixture body is the scenario's first move body after the known entry: supply the order exactly as
      // production does there (known-entry F, checked against the allocator occupancy), never from capture rows.
      // POKEBENCH_LIVE_ORDER_INPUT=none withholds it (order-independent adapters must stay exact without a host order).
      spriteOrderInput: process.env.POKEBENCH_LIVE_ORDER_INPUT === "none" ? undefined
        : prepareLiveMoveSpriteOrder(fixtureSpriteOrder(f, request).order, request).input,
    },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null,
    midBattleSwitchIn: null, switchOut: null, partySummary: null, midBattleSwitchFade: null,
    midBattleSwitchParticles: null, trainerSlide: null,
  };
}

export function verifyLiveAdapterFramebuffer(path: string, freshRuns = 2) {
  const source = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const fixture: Fixture = source.sourceFixture
    ? { ...JSON.parse(readFileSync(resolve(root, source.sourceFixture), "utf8")), ...source }
    : source;
  // These shared source probes require the selected move as a CLI argument.
  const moveArgumentProbes = [
    "tools/compare/poisonFangProbe.py", "tools/compare/crunchProbe.py",
    "tools/compare/crushClawProbe.py", "tools/compare/takeDownProbe.py",
  ];
  const probeMoveId = fixture.probeMoveId
    ?? (moveArgumentProbes.includes(fixture.probe) ? ids[fixture.move] : undefined);
  // These probes take the first source frame to record as a fourth argument.
  const startFrameProbes = ["tools/compare/synthesisProbe.py", "tools/compare/milkDrinkProbe.py",
    "tools/compare/acidProbe.py", "tools/compare/waterGunProbe.py", "tools/compare/earthquakeProbe.py"];
  const probeStartFrame = startFrameProbes.includes(fixture.probe)
    ? (fixture.denseWindow ?? fixture.sourceWindow)?.startFrame : undefined;
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const results: Array<{ digest: string; exactRows: number; rows: number; expectedDuration: number | null; ageOffset: number;
    residualPixels: number } & Record<string, unknown>> = [];
  for (let run = 0; run < freshRuns; run++) {
    const scratch = createScratchDir("pokebench-live-adapter-");
    const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
    const probeRun = spawnSync("python3", [
      join(root, "tools/run-mgba-probe.py"), output, "--",
      join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
      resolve(root, fixture.scenario), output, rgbDir,
      ...(probeMoveId === undefined ? [] : [String(probeMoveId)]),
      ...(probeStartFrame === undefined ? [] : [String(probeStartFrame)]),
      ...(fixture.probeArgs ?? []),
    ], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    if (probeRun.status !== 0) throw new Error(probeRun.stderr || probeRun.stdout);
    const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
    // Use the previously accepted complete source-owned window; some probes
    // also retain pre-body text and post-body stat banners. Never pick matching rows.
    const window = fixture.denseWindow ?? fixture.sourceWindow;
    const probeFrames = probe.frames ?? probe.rows;
    if (!probeFrames) throw new Error("Probe omitted framebuffer rows");
    const segments = fixture.denseSegments;
    const frames = segments
      ? segments.flatMap(([start, end]) => {
          const part = probeFrames.filter(f => f.frame >= start && f.frame <= end);
          if (part.length !== end - start + 1) throw new Error("Probe omitted part of a source segment");
          return part;
        })
      : window
      ? probeFrames.filter(f => f.frame >= window.startFrame && f.frame <= window.endFrame)
      : probeFrames;
    if (!segments && window && (frames.length !== window.endFrame - window.startFrame + 1
      || frames.some((f, i) => f.frame !== window.startFrame + i))) {
      throw new Error("Probe omitted part of the complete source window");
    }
    const ageOffset = fixture.denseWindow?.ageOffset ?? 0;
    const rows = frames.map((frame, rowIndex) => {
      const age = rowIndex + ageOffset;
      const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
      if (rgb.length !== 240 * 160 * 3 || hash(rgb) !== frame.sha256) throw new Error("Source RGB receipt drift");
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, liveView(fixture, age));
      let residualPixels = 0;
      const regions = { field: 0, chrome: 0 };
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
          residualPixels++;
          regions[p < 240 * 112 ? "field" : "chrome"]++;
        }
      }
      return { age, frame: frame.frame, residualPixels, regions, source: hash(rgb), live: hash(rgba) };
    });
    const expectedDuration = liveMoveAnimationDuration((liveView(fixture, 0).effect as { request: BattleMoveAnimationRequest }).request);
    const receipt = {
      fixture: path, run, scratch, expectedDuration, ageOffset, rows: rows.length,
      exactRows: rows.filter(r => r.residualPixels === 0).length,
      residualPixels: rows.reduce((a, r) => a + r.residualPixels, 0),
      digest: hash(Buffer.from(JSON.stringify(rows))), firstMismatches: rows.filter(r => r.residualPixels > 0).slice(0, 5),
    };
    writeFileSync(join(scratch, "live-comparison.json"), JSON.stringify({ ...receipt, comparisons: rows }, null, 2) + "\n");
    const retainedRoot = process.env.POKEBENCH_LIVE_EVIDENCE_DIR;
    if (retainedRoot) {
      mkdirSync(retainedRoot, { recursive: true });
      cpSync(scratch, join(retainedRoot, `${basename(path, ".json")}-run${run}`), {
        recursive: true,
        errorOnExist: true,
      });
    }
    results.push(receipt);
  }
  if (results.some(r => r.digest !== results[0]!.digest)) throw new Error("Fresh source/live results differ");
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const path of process.argv.slice(2)) {
    const results = verifyLiveAdapterFramebuffer(path);
    console.log(JSON.stringify(results, null, 2));
    if (results.some(r => r.exactRows !== r.rows || r.expectedDuration !== r.rows + r.ageOffset)) process.exitCode = 1;
  }
}
