import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";

type BattleMon = {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
  readonly ivs: Readonly<Record<string, number>>;
  readonly evs: Readonly<Record<string, number>>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: "male" | "female";
  readonly shiny: boolean;
};

type Scenario = {
  readonly schemaVersion: number;
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly challengeNum: number;
  readonly battleNum: number;
  readonly trainerId: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly seed: number;
  readonly overrides: { readonly parties: Record<Side, readonly BattleMon[]> };
  readonly trace: {
    readonly segments: readonly { readonly frames: number; readonly buttons: readonly string[] }[];
    readonly captureFrames: readonly number[];
  };
};

type Window = {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
};

type SceneBattler = {
  readonly species: string;
  readonly geometry: {
    readonly side: Side;
    readonly spriteCorner: { readonly x: number; readonly y: number };
    readonly animationCenter: { readonly x: number; readonly y: number };
    readonly battlePositionCenter: { readonly x: number; readonly y: number };
  };
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly move?: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneBattler;
  readonly target: SceneBattler;
  readonly fieldProfile: Record<string, number | string>;
  readonly sourceWindow?: Window;
  readonly denseWindow?: Window;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256?: string;
  readonly rawRgbSha256: string;
  readonly changeMap?: string;
  readonly changeMapSha256?: string;
  readonly lifecycleCounts?: Readonly<Record<string, number>>;
  readonly acceptance?: {
    readonly status: string;
    readonly denseEvidenceFrames: number;
    readonly productionFramebufferFrames: number;
  };
};

type PartyIdentity = Pick<BattleMon,
  "species" | "nature" | "item" | "moves" | "abilitySlot" | "friendship" | "gender" | "shiny">;

type Receipt = {
  readonly path: string;
  readonly scenarioPath: string;
  readonly move: "MOVE_SANDSTORM" | "MOVE_HEAT_WAVE";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly windowField: "sourceWindow" | "denseWindow";
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly changeMap?: { readonly path: string; readonly sha256: string };
  readonly scenarioSha256: string;
  readonly scenario: {
    readonly challengeNum: number;
    readonly battleNum: number;
    readonly trainerId: number;
    readonly playerSetIds: readonly number[];
    readonly opponentSetIds: readonly number[];
    readonly seed: number;
    readonly segments: readonly { readonly frames: number; readonly buttons: readonly string[] }[];
    readonly captureFrames: readonly number[];
    readonly parties: Record<Side, readonly PartyIdentity[]>;
  };
  readonly scene: {
    readonly attacker: SceneBattler;
    readonly target: SceneBattler;
    readonly fieldProfile: Record<string, number | string>;
  };
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 3-component boundary is fulfilled only because MOVE_SANDSTORM and MOVE_HEAT_WAVE independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. Sandstorm independently owns its complete unthinned 168/168 player-back and opponent-front Move_SANDSTORM 0x082d1e7b..0x082d1f03 body: legal challenge-0 set-120 PHANPY, ANIM_TAG_FLYING_DIRT, FALSE LoadSandstormBackground, non-mirrored -6/-1 scroll/alpha/cleanup, and seven FlyingSandCrescent lives, retaining a06847b11c6089b18c26a238988b53cad04fcc393babb05fff4a666f41266c4d/2968b95f680be00e14cb3386487629b142eb0ac05910f1dad69da7dc885e9958 and 29e51b99d4e4a40be602a031dee4cfae037ff4b1471ee36e2bf17ceaf7e92ffc/151561fae96ddc3d919e3f0254b987162cd9e078e92c5e414b4e0a9689edd2e4. Heat Wave independently owns its complete unthinned 168/168 player-back and opponent-front Move_HEAT_WAVE 0x082cdbc6..0x082cdc76 body: legal challenge-4 set-526 NINETALES, red BlendParticle/BlendBackground, TRUE mirrored sandstorm background, H-flip/Q8.8 crescent layout, pan, and its move-owned RAM+2 target-motion axis, retaining 0a9e7a224193ab76b1ace7cd1c1479d72076b36daa1399604dc5b3bf3e7defbd/a22b496d0a8622a96e2cdc223b234976777914196d0add14a6c1a43867ef9446/map 29c4abde8bb9fcf6852b3c65a7878236f0b12c625ed184030cf45f59a9362bf8 and 71fc59d12b5971122802695cd5104be695b47b0f27ecd54a7ee537746c9e3097/5050e7a3c99a44a4ddfdef57ed5442c50ebfbb4fe9aef0020b25cc9e05b92db0/map 840d4f8b10d9419160c28db4bbf7202bf38435d1eff9ccb802f9dd832cd44ded. No sibling, component, or latch transfer is granted: shared FLYING_DIRT/FlyingSandCrescent/LoadSandstormBackground does not promote another move; Heat Wave's target-motion latch is not Sandstorm evidence; and neither move inherits timing from the other.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/sandstorm-player-phanpy-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-sandstorm-player-phanpy-opponent-onix.json",
    move: "MOVE_SANDSTORM", schema: "sandstorm-portable-evidence/v1",
    orientation: "player-back Phanpy -> opponent-front Onix", side: "player",
    windowField: "sourceWindow", window: { startFrame: 210, endFrame: 377, frameCount: 168 },
    evidence: "a06847b11c6089b18c26a238988b53cad04fcc393babb05fff4a666f41266c4d",
    raw: "2968b95f680be00e14cb3386487629b142eb0ac05910f1dad69da7dc885e9958",
    scenarioSha256: "b056698bd20ac1c0ce94f99ce50d455504b9a2a6cd092ff0566d459c3452e917",
    scenario: {
      challengeNum: 0, battleNum: 0, trainerId: 50, playerSetIds: [120, 138, 180],
      opponentSetIds: [156, 188, 184], seed: 305419896,
      segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 600, buttons: [] }],
      captureFrames: [0, 634],
      parties: {
        player: [
          { species: 231, nature: 4, item: 54, moves: [201, 201, 201, 201], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 95, nature: 0, item: 2, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 213, nature: 2, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
        opponent: [
          { species: 95, nature: 0, item: 2, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 198, nature: 0, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 2, nature: 0, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
      },
    },
    scene: {
      attacker: { species: "PHANPY", geometry: { side: "player", spriteCorner: { x: 40, y: 62 }, animationCenter: { x: 72, y: 94 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 185, playerMaxHp: 197, opponentHp: 131, opponentMaxHp: 131, playerGender: "male", opponentGender: "male" },
    },
  },
  {
    path: "tools/compare/fixtures/sandstorm-opponent-phanpy-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-sandstorm-opponent-phanpy-player-onix.json",
    move: "MOVE_SANDSTORM", schema: "sandstorm-portable-evidence/v1",
    orientation: "opponent-front Phanpy -> player-back Onix", side: "opponent",
    windowField: "sourceWindow", window: { startFrame: 305, endFrame: 472, frameCount: 168 },
    evidence: "29e51b99d4e4a40be602a031dee4cfae037ff4b1471ee36e2bf17ceaf7e92ffc",
    raw: "151561fae96ddc3d919e3f0254b987162cd9e078e92c5e414b4e0a9689edd2e4",
    scenarioSha256: "ffc24d0d2d460a4ecec2c75d816ecc482255d59b47b94cf12441c3c28f2aa998",
    scenario: {
      challengeNum: 0, battleNum: 0, trainerId: 50, playerSetIds: [156, 149, 180],
      opponentSetIds: [120, 188, 135], seed: 305419896,
      segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 600, buttons: [] }],
      captureFrames: [0, 634],
      parties: {
        player: [
          { species: 95, nature: 0, item: 2, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 198, nature: 0, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 213, nature: 2, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
        opponent: [
          { species: 231, nature: 4, item: 54, moves: [201, 201, 201, 201], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 198, nature: 0, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 2, nature: 0, item: 0, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
      },
    },
    scene: {
      attacker: { species: "PHANPY", geometry: { side: "opponent", spriteCorner: { x: 144, y: 24 }, animationCenter: { x: 176, y: 56 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 131, playerMaxHp: 131, opponentHp: 169, opponentMaxHp: 197, playerGender: "male", opponentGender: "male" },
    },
  },
  {
    path: "tools/compare/fixtures/heat-wave-player-ninetales-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-heat-wave-player-ninetales-opponent-onix.json",
    move: "MOVE_HEAT_WAVE", schema: "heat-wave-portable-evidence/v1",
    orientation: "player-back", side: "player", windowField: "denseWindow",
    window: { startFrame: 78, endFrame: 245, frameCount: 168 },
    evidence: "0a9e7a224193ab76b1ace7cd1c1479d72076b36daa1399604dc5b3bf3e7defbd",
    raw: "a22b496d0a8622a96e2cdc223b234976777914196d0add14a6c1a43867ef9446",
    changeMap: { path: "tools/compare/evidence/heat-wave-changemap-player.txt", sha256: "29c4abde8bb9fcf6852b3c65a7878236f0b12c625ed184030cf45f59a9362bf8" },
    scenarioSha256: "08a93842ea3ebb6a2b92198ab2888c0fe848dcfc457554643a620df7b5438976",
    scenario: {
      challengeNum: 4, battleNum: 0, trainerId: 150, playerSetIds: [526, 528, 468],
      opponentSetIds: [498, 499, 500], seed: 257,
      segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }],
      captureFrames: [0, 934],
      parties: {
        player: [
          { species: 38, nature: 24, item: 141, moves: [257, 257, 257, 257], abilitySlot: 0, friendship: 70, gender: "female", shiny: false },
          { species: 213, nature: 2, item: 2, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 51, nature: 0, item: 3, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
        opponent: [
          { species: 95, nature: 0, item: 4, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 198, nature: 0, item: 5, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 2, nature: 0, item: 6, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
      },
    },
    scene: {
      attacker: { species: "NINETALES", geometry: { side: "player", spriteCorner: { x: 40, y: 53 }, animationCenter: { x: 72, y: 85 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 148, playerMaxHp: 148, opponentHp: 131, opponentMaxHp: 131, playerGender: "female", opponentGender: "male" },
    },
  },
  {
    path: "tools/compare/fixtures/heat-wave-opponent-ninetales-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-heat-wave-opponent-ninetales-player-onix.json",
    move: "MOVE_HEAT_WAVE", schema: "heat-wave-portable-evidence/v1",
    orientation: "opponent-front", side: "opponent", windowField: "denseWindow",
    window: { startFrame: 82, endFrame: 249, frameCount: 168 },
    evidence: "71fc59d12b5971122802695cd5104be695b47b0f27ecd54a7ee537746c9e3097",
    raw: "5050e7a3c99a44a4ddfdef57ed5442c50ebfbb4fe9aef0020b25cc9e05b92db0",
    changeMap: { path: "tools/compare/evidence/heat-wave-changemap-opponent.txt", sha256: "840d4f8b10d9419160c28db4bbf7202bf38435d1eff9ccb802f9dd832cd44ded" },
    scenarioSha256: "d8a6d35a253d48c1cd0cc4c7b451b5281292f9253fc42b94e6d401c97432a876",
    scenario: {
      challengeNum: 4, battleNum: 0, trainerId: 150, playerSetIds: [498, 499, 500],
      opponentSetIds: [526, 528, 468], seed: 257,
      segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }],
      captureFrames: [0, 934],
      parties: {
        player: [
          { species: 95, nature: 0, item: 4, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 198, nature: 0, item: 5, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 2, nature: 0, item: 6, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
        opponent: [
          { species: 38, nature: 24, item: 141, moves: [257, 257, 257, 257], abilitySlot: 0, friendship: 70, gender: "female", shiny: false },
          { species: 213, nature: 2, item: 2, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
          { species: 51, nature: 0, item: 3, moves: [33, 33, 33, 33], abilitySlot: 0, friendship: 70, gender: "male", shiny: false },
        ],
      },
    },
    scene: {
      attacker: { species: "NINETALES", geometry: { side: "opponent", spriteCorner: { x: 144, y: 11 }, animationCenter: { x: 176, y: 43 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 131, playerMaxHp: 131, opponentHp: 148, opponentMaxHp: 148, playerGender: "male", opponentGender: "female" },
    },
  },
];

function receipt(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function scenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function partyIdentity(party: readonly BattleMon[]): PartyIdentity[] {
  return party.map((mon) => ({
    species: mon.species,
    nature: mon.nature,
    item: mon.item,
    moves: mon.moves,
    abilitySlot: mon.abilitySlot,
    friendship: mon.friendship,
    gender: mon.gender,
    shiny: mon.shiny,
  }));
}

function expectCompleteParty(party: readonly BattleMon[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual(monKeys.slice().sort());
    expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
    expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.abilitySlot).toBe(0);
    expect(mon.friendship).toBe(70);
    expect(mon.gender === "male" || mon.gender === "female").toBe(true);
    expect(mon.shiny).toBe(false);
  }
}

describe("flying-dirt-sandstorm standalone fulfilled component-track ratchet", () => {
  it("pins both distinct source bodies, ROM pointers, and source audits", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/sandstormSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "Move_SANDSTORM 0x082d1e7b..0x082d1f03 (0x88 bytes); lowest "
      + "challenge-0 Level-50 carrier set 120/FRONTIER_MON_PHANPY -> "
      + "SPECIES_PHANPY 231/move 201/LAX_INCENSE/ATTACK+HP/NAUGHTY; "
      + "7 gFlyingSandCrescentSpriteTemplate lifecycles; Heat Wave remains "
      + "distinct: red particle/background blends, mirrored background, pan "
      + "sweep, and target-motion task\n",
    );
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/heatWaveSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "Move_HEAT_WAVE 0x082cdbc6..0x082cdc76 (0xb0 bytes); sole/lowest "
      + "Level-50 carrier set 526 FRONTIER_MON_NINETALES_2, first legal in "
      + "challenge 4 range 468..563; red particle/background blends, mirrored "
      + "sandstorm BG, 7 flying-dirt crescents, pan sweep, bilateral target motion\n",
    );

    const nm = execFileSync("arm-none-eabi-nm", ["-a", "reference/pokeemerald/pokeemerald.elf"], {
      encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    });
    const pointer = (symbol: string): string => {
      const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
      if (!match) throw new Error(`missing ${symbol}`);
      return `0x${match[1]!.toLowerCase()}`;
    };
    expect({
      Move_SANDSTORM: pointer("Move_SANDSTORM"), Move_WHIRLPOOL: pointer("Move_WHIRLPOOL"),
      Move_HEAT_WAVE: pointer("Move_HEAT_WAVE"), Move_HAIL: pointer("Move_HAIL"),
    }).toEqual({
      Move_SANDSTORM: "0x082d1e7b", Move_WHIRLPOOL: "0x082d1f03",
      Move_HEAT_WAVE: "0x082cdbc6", Move_HAIL: "0x082cdc76",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const sourceBody = (start: string, end: string): string =>
      scripts.slice(scripts.indexOf(start), scripts.indexOf(end));
    const sandstorm = sourceBody("Move_SANDSTORM:", "Move_WHIRLPOOL:");
    const heatWave = sourceBody("Move_HEAT_WAVE:", "Move_HAIL:");
    expect(digest("reference/pokeemerald/data/battle_anim_scripts.s")).toMatch(/^[0-9a-f]{64}$/);
    expect(createHash("sha256").update(sandstorm).digest("hex"))
      .toBe("53f0188f49676edd32744edba4325b009f039b5b6af931cbb295d4ea07ebc8ac");
    expect(createHash("sha256").update(heatWave).digest("hex"))
      .toBe("be13b55d695e8176a4f2fa576911278a92e2613e69a3589d1f709e288571e550");
    expect(sandstorm).toContain("createvisualtask AnimTask_LoadSandstormBackground, 5, FALSE");
    expect(sandstorm).not.toContain("AnimTask_BlendParticle");
    expect(sandstorm).not.toContain("AnimTask_MoveHeatWaveTargets");
    expect((sandstorm.match(/gFlyingSandCrescentSpriteTemplate/g) ?? [])).toHaveLength(7);
    expect(heatWave).toContain("createvisualtask AnimTask_BlendParticle, 5, ANIM_TAG_FLYING_DIRT, 0, 6, 6, RGB_RED");
    expect(heatWave).toContain("createvisualtask AnimTask_LoadSandstormBackground, 5, TRUE");
    expect(heatWave).toContain("createvisualtask AnimTask_BlendBackground, 6, 6, RGB_RED");
    expect(heatWave).toContain("createvisualtask AnimTask_MoveHeatWaveTargets, 5");
    expect((heatWave.match(/gFlyingSandCrescentSpriteTemplate/g) ?? [])).toHaveLength(7);
  });

  it("pins the exact fulfilled goal and unchanged 242/276 Level-50 acceptance", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(255);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "staged"))
      .toHaveLength(0);
    expect(inventory.tiers.level50.moves).toHaveLength(276);
    expect(inventory.tiers.level50.moves.length - coverage.entries.length).toBe(21);
    expect(coverage.entries.filter((entry: { move: string }) =>
      ["MOVE_SANDSTORM", "MOVE_HEAT_WAVE"].includes(entry.move),
    )).toEqual([
      expect.objectContaining({ move: "MOVE_HEAT_WAVE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SANDSTORM", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "flying-dirt-sandstorm",
    )).toEqual([{
      id: "flying-dirt-sandstorm",
      components: [
        "asset:ANIM_TAG_FLYING_DIRT",
        "sprite:gFlyingSandCrescentSpriteTemplate",
        "task:AnimTask_LoadSandstormBackground",
      ],
      representatives: ["MOVE_SANDSTORM", "MOVE_HEAT_WAVE"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });

  it("pins all four complete unthinned semantic/raw-RGB receipts and Heat Wave maps", () => {
    const actual = receipts.map((expected) => {
      const fixture = receipt(expected.path);
      const retainedWindow = expected.windowField === "sourceWindow"
        ? fixture.sourceWindow : fixture.denseWindow;
      return [
        fixture.schema, fixture.oracleProfile ?? "battle-scene-on", fixture.orientation,
        retainedWindow, fixture.evidenceSha256, fixture.rawRgbSha256,
        fixture.secondFreshEvidenceSha256, fixture.changeMapSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema, "battle-scene-on", expected.orientation, expected.window,
      expected.evidence, expected.raw,
      expected.move === "MOVE_HEAT_WAVE" ? expected.evidence : undefined,
      expected.changeMap?.sha256,
    ]));
    for (const expected of receipts) {
      expect(expected.window.endFrame - expected.window.startFrame + 1)
        .toBe(expected.window.frameCount);
      if (expected.move === "MOVE_SANDSTORM") {
        expect(receipt(expected.path).lifecycleCounts).toEqual({
          gFlyingSandCrescentSpriteTemplate: 7,
        });
      } else {
        expect(receipt(expected.path).lifecycleCounts).toBeUndefined();
      }
      if (expected.changeMap) {
        expect(digest(expected.changeMap.path)).toBe(expected.changeMap.sha256);
      }
    }
    expect(receipts.filter((entry) => entry.move === "MOVE_SANDSTORM")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(336);
    expect(receipts.filter((entry) => entry.move === "MOVE_HEAT_WAVE")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(336);
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(672);
  });

  it("keeps every retained fixture a complete legal bilateral three-Pokemon scenario with immutable gameplay", () => {
    for (const expected of receipts) {
      const fixture = receipt(expected.path);
      const staged = scenario(expected.scenarioPath);
      const retainedWindow = expected.windowField === "sourceWindow"
        ? fixture.sourceWindow : fixture.denseWindow;
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(fixture).toMatchObject({
        schema: expected.schema,
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_SANDSTORM"
          ? "tools/compare/sandstormProbe.py"
          : "tools/compare/heatWaveProbe.py",
        appStage: { presentationAge: 0 },
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        attacker: expected.scene.attacker,
        target: expected.scene.target,
        fieldProfile: expected.scene.fieldProfile,
      });
      expect(retainedWindow).toEqual(expected.window);
      expect(fixture.oracleProfile ?? staged.profile).toBe("battle-scene-on");
      if (expected.move === "MOVE_HEAT_WAVE") {
        expect(fixture).toMatchObject({
          move: "HEAT_WAVE",
          acceptance: {
            status: "exact", denseEvidenceFrames: 168, productionFramebufferFrames: 168,
          },
          changeMap: expected.changeMap!.path,
          changeMapSha256: expected.changeMap!.sha256,
        });
      } else {
        expect(fixture.changeMap).toBeUndefined();
        expect(fixture.acceptance).toBeUndefined();
      }
      expect(staged).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: expected.scenario.challengeNum, battleNum: expected.scenario.battleNum,
        trainerId: expected.scenario.trainerId, playerSetIds: expected.scenario.playerSetIds,
        opponentSetIds: expected.scenario.opponentSetIds, seed: expected.scenario.seed,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.trace)).toEqual(["segments", "captureFrames"]);
      expectCompleteParty(staged.overrides.parties.player);
      expectCompleteParty(staged.overrides.parties.opponent);
      expect({
        player: partyIdentity(staged.overrides.parties.player),
        opponent: partyIdentity(staged.overrides.parties.opponent),
      }).toEqual(expected.scenario.parties);
      expect(staged.trace.segments).toEqual(expected.scenario.segments);
      expect(staged.trace.captureFrames).toEqual(expected.scenario.captureFrames);
      expect(staged.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(2);
      const attacker = staged.overrides.parties[expected.side][0]!;
      const target = staged.overrides.parties[expected.side === "player" ? "opponent" : "player"][0]!;
      expect(attacker.species).toBe(expected.move === "MOVE_SANDSTORM" ? 231 : 38);
      expect(target.species).toBe(95);
    }
  });

  it("keeps both portable verifiers, their zero-residual obligations, and per-move latch scope load-bearing", () => {
    const sandstormPortable = readFileSync("tools/compare/sandstormPortable.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "sandstormAtAge", "sceneOnSandstormView",
      "softwareOam", "hardwareOam", "hardwareMatrices", "fadedPalette", "hardwarePalette",
      "paletteTags", "tileTags", "se1", "se2", "rawRgbSha256", "render(engine)",
      "diff !== 0", "fresh proof diverged", "SANDSTORM_FRAME_COUNT",
    ]) expect(sandstormPortable).toContain(token);
    const heatWavePortable = readFileSync("tools/compare/heatWavePortable.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "frame-changemap.py", "heatWaveAtAge",
      "sceneOnHeatWaveView", "hardwareOam", "hardwareMatrices", "raw RGB", "render(engine)",
      "diff !== 0", "same(frame.battlers, initial.battlers)",
      "same(frame.parties, initial.parties)", "same(frame.immutableState, initial.immutableState)",
      "targetSprite.x2 === component.targetX2", "HEAT_WAVE_FRAME_COUNT",
    ]) expect(heatWavePortable).toContain(token);

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured: visible events display ONE");
    expect(latches).toContain("`AnimTask_MoveHeatWaveTargets` live-battler `x2` writes | RAM+2");
    expect(latches).toContain("Mirrored Heat Wave subsprites retain source table order but use the");
    expect(latches).toContain("HEAT_WAVE proves this bilaterally; SANDSTORM's non-mirrored control is");
    expect(trackGoal).toContain("Heat Wave's target-motion latch is not Sandstorm evidence");
    expect(trackGoal).toContain("No sibling, component, or latch transfer is granted");
  });
});
