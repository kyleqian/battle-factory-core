import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  RETURN_IMPACT_TAG,
  RETURN_SOURCE_START,
  returnAtAge,
  returnBranchForFriendship,
  returnFirstInactiveAge,
  returnPowerLevelForFriendship,
  returnSourceAtAge,
  type ReturnLiveInputs,
} from "../../src/animation/return.ts";
import {
  sceneOnReturnView,
  type SceneOnReturnPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  returnConfigFor,
  returnInputsFor,
  verifyReturnReducer,
} from "../../tools/compare/verifyReturnReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (path: string): Json => JSON.parse(execFileSync(
  process.execPath,
  ["--experimental-strip-types", path],
  { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
)) as Json;

describe("MOVE_RETURN source-relative reducer and narrow Scene-ON seam", () => {
  it("replays all 1,190 retained bilateral selector rows twice through the reducer and seam", () => {
    const first = verifyReturnReducer();
    expect(verifyReturnReducer()).toEqual(first);
    expect(first).toEqual({
      weak: {
        "player-back": { retainedRows: 88, reducerRows: 176, seamRows: 176, reducerSha256: "9b610798ddeca380228b29b0ee0f3ef40566441b328b84bda21639263171b388", seamSha256: "9b610798ddeca380228b29b0ee0f3ef40566441b328b84bda21639263171b388", framebufferCompared: false, coverageCredit: false },
        "opponent-front": { retainedRows: 88, reducerRows: 176, seamRows: 176, reducerSha256: "45e2190f59fbaf936eb790b23723565c14f8846cd13540d2527c137784f1eca5", seamSha256: "45e2190f59fbaf936eb790b23723565c14f8846cd13540d2527c137784f1eca5", framebufferCompared: false, coverageCredit: false },
      },
      medium: {
        "player-back": { retainedRows: 100, reducerRows: 200, seamRows: 200, reducerSha256: "8e1046e392b64cc39b5318d96705736a17b17365047ea2aa47d34a41b94ab9b3", seamSha256: "8e1046e392b64cc39b5318d96705736a17b17365047ea2aa47d34a41b94ab9b3", framebufferCompared: false, coverageCredit: false },
        "opponent-front": { retainedRows: 100, reducerRows: 200, seamRows: 200, reducerSha256: "0299f96cf03f734b9b22a7b66ad0d24d215c45ac743d165c95f14a392ee55ce5", seamSha256: "0299f96cf03f734b9b22a7b66ad0d24d215c45ac743d165c95f14a392ee55ce5", framebufferCompared: false, coverageCredit: false },
      },
      strong: {
        "player-back": { retainedRows: 125, reducerRows: 250, seamRows: 250, reducerSha256: "c74c50d2e87308248bbb6f28103d3339babf3587ae7a40f6c0c836f10d8c6502", seamSha256: "c74c50d2e87308248bbb6f28103d3339babf3587ae7a40f6c0c836f10d8c6502", framebufferCompared: false, coverageCredit: false },
        "opponent-front": { retainedRows: 125, reducerRows: 250, seamRows: 250, reducerSha256: "c55374aeeea20fa4588aad14459127b6f9b67640afe6b460473cc55911e76d1c", seamSha256: "c55374aeeea20fa4588aad14459127b6f9b67640afe6b460473cc55911e76d1c", framebufferCompared: false, coverageCredit: false },
      },
      strongest: {
        "player-back": { retainedRows: 282, reducerRows: 564, seamRows: 564, reducerSha256: "70927ca7087d7379e623d84f91a88b73eae69e233c8fd60b9a2d8c17d206c971", seamSha256: "70927ca7087d7379e623d84f91a88b73eae69e233c8fd60b9a2d8c17d206c971", framebufferCompared: false, coverageCredit: false },
        "opponent-front": { retainedRows: 282, reducerRows: 564, seamRows: 564, reducerSha256: "fff2a03b5f2d43a51bfe2eb7cd53385e8d9d1ecd947f38d10225ad2e9676b53a", seamSha256: "fff2a03b5f2d43a51bfe2eb7cd53385e8d9d1ecd947f38d10225ad2e9676b53a", framebufferCompared: false, coverageCredit: false },
      },
      allBranches: { retainedRows: 1190, passes: 2, reducerRows: 2380, seamRows: 2380, reducerSha256: "544a53440e6d44092117f29ea5d25b605ed1cea98759ff5947c8b56cdea66f43", seamSha256: "544a53440e6d44092117f29ea5d25b605ed1cea98759ff5947c8b56cdea66f43", framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps the source friendship selector, overlapping shake lifecycle, resource lifetime, latches, and first-inactive cleanup source-owned", () => {
    expect([0, 60, 61, 91, 92, 200, 201, 255].map(returnPowerLevelForFriendship))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect([0, 60, 61, 91, 92, 200, 201, 255].map(returnBranchForFriendship))
      .toEqual(["weak", "weak", "medium", "medium", "strong", "strong", "strongest", "strongest"]);
    expect([60, 61, 200, 255].map(returnFirstInactiveAge)).toEqual([87, 99, 124, 281]);
    expect(returnSourceAtAge(0, 255)).toEqual({ owner: "Move_RETURN", branch: "strongest", pointer: RETURN_SOURCE_START, pointerOffset: 0, active: true, wait: 0 });
    expect(returnSourceAtAge(7, 61)).toEqual({ owner: "Move_RETURN", branch: "medium", pointer: RETURN_SOURCE_START + 17, pointerOffset: 17, active: true, wait: 2 });
    expect(returnSourceAtAge(281, 255)).toMatchObject({ active: false, pointer: RETURN_SOURCE_START + 53, pointerOffset: 53, wait: 1 });

    const strong = returnInputsFor("strong", "player-back", undefined, 85);
    expect(returnAtAge(85, strong)).toMatchObject({
      selector: { friendship: 200, powerLevel: 2, branch: "strong" },
      source: { pointer: RETURN_SOURCE_START + 422, pointerOffset: 422, wait: 8 },
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_ShakeMon_Step", data: [strong.targetArt.slot, 2, 1, 1, 6, 0] }),
        expect.objectContaining({ callback: "AnimTask_ShakeMon_Step", data: [strong.targetArt.slot, 7, 1, 1, 6, 0] }),
      ]),
      impacts: [expect.objectContaining({ start: 85, animation: 2 })],
      battlers: { target: { offset: { x2: 6, y2: 0 } } },
      resources: { loaded: true, tag: RETURN_IMPACT_TAG },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palette: "preceding-faded" },
    });
    const medium = returnInputsFor("medium", "opponent-front", undefined, 75);
    expect(returnAtAge(75, medium)).toMatchObject({
      monbg: { active: true, clear: true, layer: "bg2" },
      background: { phase: "restoring-battle" },
    });
    const final = returnAtAge(281, returnInputsFor("strongest", "opponent-front", undefined, 281));
    expect(final).toMatchObject({
      active: false,
      tasks: [], verticalDips: [], impacts: [], traces: [],
      resources: { loaded: false, tag: null },
      cleanup: { firstInactive: true, resourcesReleased: true, ownedTasks: 0, ownedSprites: 0, visualTasks: 0, soundTasks: 0 },
    });
  });

  it("materially consumes altered live presentation input through the typed seam without owning gameplay state or gameplay RNG", () => {
    const input = returnInputsFor("strongest", "player-back", undefined, 157);
    const gameplayRng = Object.freeze({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    const gameplayState = Object.freeze({ opaque: "gameplay-state", turn: 7 });
    const altered: ReturnLiveInputs = {
      ...input,
      attackerSide: "opponent",
      targetSide: "player",
      attackerSpecies: "CROBAT",
      targetSpecies: "BLISSEY",
      attackerCenter: { x: 202, y: 46 },
      targetCenter: { x: 37, y: 116 },
      attackerInitialOffset: { x2: 2, y2: -3 },
      targetInitialOffset: { x2: -4, y2: 2 },
      attackerArt: { displaySpecies: "CROBAT", slot: 21, attr: [114, 0xc0a9, 0x6d23], subpriority: 54, matrixNum: 5, matrix: [256, 4, -4, 256] },
      targetArt: { displaySpecies: "BLISSEY", slot: 22, attr: [116, 0xc0aa, 0x6d24], subpriority: 55, matrixNum: 6, matrix: [384, -4, 4, 384] },
      taskSlots: { monbg: 8, clearMonbg: 9, shake: Array.from({ length: 9 }, (_, index) => index + 1), trace: Array.from({ length: 7 }, (_, index) => index + 9) },
      motionSlots: { verticalDip: Array.from({ length: 9 }, (_, index) => index + 23), horizontalLunge: 32 },
      impactAllocations: input.impactAllocations.map((allocation, index) => ({
        ...allocation, slot: 33 + index, matrixNum: index + 7,
        attr: [120 + index, 0xc0b0 + index, 0x6d30 + index] as const, subpriority: 60 + index,
      })),
      traceAllocations: input.traceAllocations.map((allocation, index) => ({ ...allocation, slot: 50 + index })),
      spriteOrder: Array.from({ length: 64 }, (_, slot) => 63 - slot),
      buffers: {
        softwareOam: Array.from({ length: 128 }, (_, slot) => ({ slot, source: "software" })),
        hardwareOam: Array.from({ length: 128 }, (_, slot) => ({ slot, source: "hardware" })),
        softwareMatrices: Array.from({ length: 32 }, (_, slot) => [256 + slot, slot, -slot, 256 + slot] as const),
        hardwareMatrices: Array.from({ length: 32 }, (_, slot) => [384 - slot, -slot, slot, 384 - slot] as const),
      },
      palette: {
        unfaded: Array.from({ length: 512 }, (_, slot) => (slot * 17) & 0x7fff),
        faded: Array.from({ length: 512 }, (_, slot) => (slot * 29) & 0x7fff),
        hardware: Array.from({ length: 512 }, (_, slot) => (slot * 47) & 0x7fff),
      },
      registers: { callerOwnedRegister: 0x2468, bldcnt: 0x3f40, bldalpha: 0x080c },
      background: {
        current: { id: "altered-monbg" }, battle: { id: "altered-battle" },
        sourceScroll: { x: -173, y: -24 }, layer: "bg2",
        monbgTaskData: Array.from({ length: 16 }, (_, slot) => slot + 1),
        clearTaskData: Array.from({ length: 16 }, (_, slot) => slot + 17),
      },
      resources: { impactTag: RETURN_IMPACT_TAG, tileSlot: 91, paletteSlot: 14, paletteBank: 30, tileRange: [17, 32], allocator: { allocation: "switch-ui-history" } },
      audio: { current: { output: "altered-audio" }, attackerPan: 63, targetPan: -64 },
      liveCounts: { visualTasks: 4, soundTasks: 2, matrixBitmap: 0x41 },
      animationRng: 0x1234_5678,
      gameplayRng,
      gameplayState,
    };
    const baseline = returnAtAge(157, input);
    const source = returnAtAge(157, altered);
    expect(source).not.toEqual(baseline);
    expect(source).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CROBAT", center: { x: 202, y: 46 }, art: { slot: 21 } },
        target: { side: "player", species: "BLISSEY", center: { x: 37, y: 116 }, art: { slot: 22 } },
      },
      verticalDips: [expect.objectContaining({ slot: 28, duration: 4, deltaY: 3, attackerOffset: { x2: 2, y2: 0 } })],
      impacts: [expect.objectContaining({ slot: 38, matrixNum: 12, x: 37, y: 116, animation: 2 })],
      traces: expect.arrayContaining([expect.objectContaining({ taskSlot: 12, cloneSlot: 53, start: 157 })]),
      resources: { loaded: true, tileSlot: 91, paletteSlot: 14, paletteBank: 30, matrixBitmap: 0x41, allocator: { allocation: "switch-ui-history" } },
      painterOrder: altered.spriteOrder,
      buffers: altered.buffers,
      palette: altered.palette,
      registers: altered.registers,
      background: { current: { id: "altered-monbg" } },
      audio: { live: { output: "altered-audio" }, events: expect.arrayContaining([{ channel: "SE2", sound: "SE_M_TAIL_WHIP", pan: 63 }, { channel: "SE1", sound: "SE_M_VITAL_THROW2", pan: -64 }]) },
      rng: { animation: 0x1234_5678, gameplay: gameplayRng, gameplayUnchanged: true },
      gameplay: gameplayState,
    });
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(gameplayRng).toEqual({ opaque: "gameplay-rng", value: 0x0bad_c0de });
    expect(gameplayState).toEqual({ opaque: "gameplay-state", turn: 7 });

    const config = returnConfigFor("strongest", "player-back", undefined, 157);
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = altered;
    const seam = sceneOnReturnView({
      age: 157,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", spriteCorner: { x: 170, y: 14 }, animationCenter: altered.attackerCenter, battlePositionCenter: altered.attackerCenter } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", spriteCorner: { x: 8, y: 82 }, animationCenter: altered.targetCenter, battlePositionCenter: altered.targetCenter } },
        animationInputs,
      },
    } as SceneOnReturnPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(source);
    expect(attacker.geometry.side).toBe("opponent");
    expect(target.geometry.side).toBe("player");
  });

  it("keeps retained evidence outside production, runs the source/evidence/reducer receipts twice, and leaves RETURN unsupported", () => {
    const source = readFileSync(resolve(root, "src/animation/return.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party|reference)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const audit = run("tools/compare/returnSourceAudit.ts");
    expect(run("tools/compare/returnSourceAudit.ts")).toEqual(audit);
    const evidence = run("tools/compare/returnEvidence.ts");
    expect(run("tools/compare/returnEvidence.ts")).toEqual(evidence);
    const reducer = run("tools/compare/verifyReturnReducer.ts");
    expect(run("tools/compare/verifyReturnReducer.ts")).toEqual(reducer);
    expect(reducer.allBranches).toMatchObject({ retainedRows: 1190, passes: 2, reducerRows: 2380, seamRows: 2380, framebufferCompared: false, coverageCredit: false });
    const data = coverage as Json;
    expect(data.entries.some((entry: Json) => entry.move === "MOVE_RETURN")).toBe(false);
    expect(data.entries.some((entry: Json) => entry.move === "MOVE_FLATTER")).toBe(false);
  });
});
