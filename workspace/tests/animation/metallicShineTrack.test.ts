import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly move: string;
  readonly orientation?: "player-to-opponent" | "opponent-to-player";
  readonly attackerSide?: "player" | "opponent";
  readonly targetSide?: "player" | "opponent";
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount?: number;
  };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly acceptance?: {
    readonly status: string;
    readonly framebufferMatching?: number;
    readonly componentMatching?: number;
  };
  readonly evidenceSchema?: string;
  readonly evidenceSha256?: string;
  readonly secondFreshEvidenceSha256?: string;
  readonly rawRgbSha256?: string;
};

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function receiptSummary(path: string) {
  const entry = fixture(path);
  return {
    path,
    schema: entry.schema,
    oracleProfile: entry.oracleProfile,
    move: entry.move,
    orientation: entry.orientation ?? entry.attackerSide ?? entry.attacker.geometry.side,
    targetSide: entry.targetSide ?? null,
    scenario: entry.scenario,
    probe: entry.probe,
    attacker: [entry.attacker.species, entry.attacker.geometry.side],
    target: [entry.target.species, entry.target.geometry.side],
    denseWindow: {
      startFrame: entry.denseWindow.startFrame,
      endFrame: entry.denseWindow.endFrame,
      frameCount: entry.denseWindow.frameCount
        ?? entry.denseWindow.endFrame - entry.denseWindow.startFrame + 1,
    },
    presentationAge: entry.appStage.presentationAge,
    acceptance: entry.acceptance
      ? {
        status: entry.acceptance.status,
        framebufferMatching: entry.acceptance.framebufferMatching ?? null,
        componentMatching: entry.acceptance.componentMatching ?? null,
      }
      : null,
    evidenceSchema: entry.evidenceSchema ?? null,
    evidenceSha256: entry.evidenceSha256 ?? null,
    secondFreshEvidenceSha256: entry.secondFreshEvidenceSha256 ?? null,
    rawRgbSha256: entry.rawRgbSha256 ?? null,
    fixtureSha256: sha256(path),
  };
}

function sourceBody(source: string, start: string, end: string): string {
  const startAt = source.indexOf(start);
  expect(startAt).toBeGreaterThanOrEqual(0);
  const endAt = source.indexOf(end, startAt);
  expect(endAt).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
}

const fulfilledGoal = "FULFILLED: MOVE_HARDEN, MOVE_STEEL_WING, MOVE_IRON_TAIL, MOVE_METAL_CLAW, MOVE_IRON_DEFENSE, and MOVE_POISON_TAIL each retain independent complete legal bilateral Scene-ON windows through first inactive cleanup and are twice-fresh exact: HARDEN 101/101, STEEL_WING 197/197, IRON_TAIL 135/135, METAL_CLAW 140/140, IRON_DEFENSE 101/101, POISON_TAIL 187/187. Their source bodies distinguish non-permanent/permanent MetallicShine, Iron Defense's BG-only pulse, Steel Wing gust/slide, Iron Tail's permanent grayscale/contact, Metal Claw's two-strike claw sequence, and Poison Tail's custom RGB poison/bubbles. Palette writes retain the measured RAM+1 display latch in each move's own maps; shared visualCommand:metallic_shine never waives a move-owned latch, source body, orientation, branch, receipt, framebuffer, or acceptance.";

describe("metallic-shine component-track receipt ratchet", () => {
  it("pins all twelve independently exact fixtures, bilateral windows, statuses, and receipts", () => {
    const paths = [
      "tools/compare/fixtures/harden-player-relicanth-opponent-onix.json",
      "tools/compare/fixtures/harden-opponent-relicanth-player-onix.json",
      "tools/compare/fixtures/steel-wing-player-wingull-opponent-onix.json",
      "tools/compare/fixtures/steel-wing-opponent-wingull-player-onix.json",
      "tools/compare/fixtures/iron-tail-player-azumarill-opponent-onix.json",
      "tools/compare/fixtures/iron-tail-opponent-azumarill-player-onix.json",
      "tools/compare/fixtures/metal-claw-player-charmander-opponent-onix.json",
      "tools/compare/fixtures/metal-claw-opponent-charmander-player-onix.json",
      "tools/compare/fixtures/iron-defense-player-clamperl-opponent-onix.json",
      "tools/compare/fixtures/iron-defense-opponent-clamperl-player-onix.json",
      "tools/compare/fixtures/poison-tail-player-seviper-opponent-onix.json",
      "tools/compare/fixtures/poison-tail-opponent-seviper-player-onix.json",
    ];

    expect(paths.map(receiptSummary)).toEqual([
      {
        path: paths[0], schema: "scene-on-portable-component/v1", oracleProfile: "battle-scene-on", move: "HARDEN", orientation: "player", targetSide: null,
        scenario: "tools/battle-lab/mechanic-harden-player-relicanth-opponent-onix.json", probe: "tools/compare/hardenProbe.py", attacker: ["RELICANTH", "player"], target: ["ONIX", "opponent"],
        denseWindow: { startFrame: 292, endFrame: 392, frameCount: 101 }, presentationAge: -1, acceptance: null, evidenceSchema: null, evidenceSha256: null, secondFreshEvidenceSha256: null, rawRgbSha256: null,
        fixtureSha256: "81bc991368a31a6c84a73233ca6a436b78ed13262201cc601accc44a6860fc18",
      },
      {
        path: paths[1], schema: "scene-on-portable-component/v1", oracleProfile: "battle-scene-on", move: "HARDEN", orientation: "opponent", targetSide: null,
        scenario: "tools/battle-lab/mechanic-harden-opponent-relicanth-player-onix.json", probe: "tools/compare/hardenProbe.py", attacker: ["RELICANTH", "opponent"], target: ["ONIX", "player"],
        denseWindow: { startFrame: 292, endFrame: 392, frameCount: 101 }, presentationAge: -1, acceptance: null, evidenceSchema: null, evidenceSha256: null, secondFreshEvidenceSha256: null, rawRgbSha256: null,
        fixtureSha256: "e9948b2694c96a30c7d41f7eacde9377749b9c8c6ed392fcc40d6e8a2e28a6ff",
      },
      {
        path: paths[2], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "STEEL_WING", orientation: "player-to-opponent", targetSide: null,
        scenario: "tools/battle-lab/mechanic-steel-wing-player-wingull-opponent-onix.json", probe: "tools/compare/steelWingProbe.py", attacker: ["WINGULL", "player"], target: ["ONIX", "opponent"],
        denseWindow: { startFrame: 77, endFrame: 273, frameCount: 197 }, presentationAge: 0, acceptance: { status: "exact", framebufferMatching: 197, componentMatching: null }, evidenceSchema: "steel-wing-dense-evidence/v1", evidenceSha256: "e321040c649b29c2d7e1a9702aae0cae11d4d3e42215ccabbc318ba0f8ef5f52", secondFreshEvidenceSha256: "e321040c649b29c2d7e1a9702aae0cae11d4d3e42215ccabbc318ba0f8ef5f52", rawRgbSha256: "2f44c8117fc921c59575f2dcc38503d47c6df569bc57afaaa6d55b9d3b6b3b69",
        fixtureSha256: "52961596fbc1ccfb640f48ae8ec4ba80397327951268ccf205daa4561e273c29",
      },
      {
        path: paths[3], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "STEEL_WING", orientation: "opponent-to-player", targetSide: null,
        scenario: "tools/battle-lab/mechanic-steel-wing-opponent-wingull-player-onix.json", probe: "tools/compare/steelWingProbe.py", attacker: ["WINGULL", "opponent"], target: ["ONIX", "player"],
        denseWindow: { startFrame: 81, endFrame: 277, frameCount: 197 }, presentationAge: 0, acceptance: { status: "exact", framebufferMatching: 197, componentMatching: null }, evidenceSchema: "steel-wing-dense-evidence/v1", evidenceSha256: "7af04b3579d84e48d6a7a46c2a9f06c2920ef09a615a4ad8dbd1830f66302659", secondFreshEvidenceSha256: "7af04b3579d84e48d6a7a46c2a9f06c2920ef09a615a4ad8dbd1830f66302659", rawRgbSha256: "25c8e06b17b643baea699189d5a43eab782089346673b49cb320c4cc8d4654e1",
        fixtureSha256: "89f7c8b5701e2c0e5a4266269bee304c00ed26f018ad3cddc79958900cc2c347",
      },
      {
        path: paths[4], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "IRON_TAIL", orientation: "player-to-opponent", targetSide: null,
        scenario: "tools/battle-lab/mechanic-iron-tail-player-azumarill-opponent-onix.json", probe: "tools/compare/ironTailProbe.py", attacker: ["AZUMARILL", "player"], target: ["ONIX", "opponent"],
        denseWindow: { startFrame: 216, endFrame: 350, frameCount: 135 }, presentationAge: 0, acceptance: { status: "exact", framebufferMatching: 135, componentMatching: 135 }, evidenceSchema: "iron-tail-dense-evidence/v1", evidenceSha256: "d443cdb327070da66335a7771c8ec9c94413dcc5aa88338977018b490cbf79a8", secondFreshEvidenceSha256: "d443cdb327070da66335a7771c8ec9c94413dcc5aa88338977018b490cbf79a8", rawRgbSha256: "952808facb59f17298b90cbbcef4000f909e64da37e9950bedeca0b74558c428",
        fixtureSha256: "8248f34ca6ec952915b8f364f4a41498739f105c1c242f49b1686f463edb4390",
      },
      {
        path: paths[5], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "IRON_TAIL", orientation: "opponent-to-player", targetSide: null,
        scenario: "tools/battle-lab/mechanic-iron-tail-opponent-azumarill-player-onix.json", probe: "tools/compare/ironTailProbe.py", attacker: ["AZUMARILL", "opponent"], target: ["ONIX", "player"],
        denseWindow: { startFrame: 215, endFrame: 349, frameCount: 135 }, presentationAge: 0, acceptance: { status: "exact", framebufferMatching: 135, componentMatching: 135 }, evidenceSchema: "iron-tail-dense-evidence/v1", evidenceSha256: "7bebcfb3957b428f0d5537339ba4dbe514aa1fc8edbd49a508523d12111d916b", secondFreshEvidenceSha256: "7bebcfb3957b428f0d5537339ba4dbe514aa1fc8edbd49a508523d12111d916b", rawRgbSha256: "bea1745ae3fc99cbe57d543b6e27a4a88bdea379c7ecaf4760d754c665f565f5",
        fixtureSha256: "063841b09f68c53337e600acbfd1f60717153b6930f81b50445a6544e8648423",
      },
      {
        path: paths[6], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "METAL_CLAW", orientation: "player-to-opponent", targetSide: null,
        scenario: "tools/battle-lab/mechanic-metal-claw-player-charmander-opponent-onix.json", probe: "tools/compare/metalClawProbe.py", attacker: ["CHARMANDER", "player"], target: ["ONIX", "opponent"],
        denseWindow: { startFrame: 227, endFrame: 366, frameCount: 140 }, presentationAge: -1, acceptance: { status: "exact", framebufferMatching: 140, componentMatching: null }, evidenceSchema: "metal-claw-dense-evidence/v1", evidenceSha256: "db095360d4c2d1aec4cdb5e91ba7f1cb3b52b9116d161eb5a482616b07d54431", secondFreshEvidenceSha256: "db095360d4c2d1aec4cdb5e91ba7f1cb3b52b9116d161eb5a482616b07d54431", rawRgbSha256: "55859416a8568592de0271ae4b72270d72dc379e08d042e3eb856f4022e92778",
        fixtureSha256: "3a6be13a4e5f0fb46bf8b97b6806eefcb373c9872fcb77fab39cf0939b61c02e",
      },
      {
        path: paths[7], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "METAL_CLAW", orientation: "opponent-to-player", targetSide: null,
        scenario: "tools/battle-lab/mechanic-metal-claw-opponent-charmander-player-onix.json", probe: "tools/compare/metalClawProbe.py", attacker: ["CHARMANDER", "opponent"], target: ["ONIX", "player"],
        denseWindow: { startFrame: 229, endFrame: 368, frameCount: 140 }, presentationAge: -1, acceptance: { status: "exact", framebufferMatching: 140, componentMatching: null }, evidenceSchema: "metal-claw-dense-evidence/v1", evidenceSha256: "21a1e2aed7de2e6ee682c6238c49ee48aedca0732dd77d31f284f5a6d733ebba", secondFreshEvidenceSha256: "21a1e2aed7de2e6ee682c6238c49ee48aedca0732dd77d31f284f5a6d733ebba", rawRgbSha256: "0ff639d17a8bd39279807f12c6ce58da4be6ea746a102d85747c3aa9452a2e1a",
        fixtureSha256: "1b30169e948c964fd4dfffc9011ba50faae8fc7d5a018c23eb56c19e90a222ef",
      },
      {
        path: paths[8], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "IRON_DEFENSE", orientation: "player-to-opponent", targetSide: null,
        scenario: "tools/battle-lab/mechanic-iron-defense-player-clamperl-opponent-onix.json", probe: "tools/compare/ironDefenseProbe.py", attacker: ["CLAMPERL", "player"], target: ["ONIX", "opponent"],
        denseWindow: { startFrame: 215, endFrame: 315, frameCount: 101 }, presentationAge: -1, acceptance: { status: "exact", framebufferMatching: 101, componentMatching: null }, evidenceSchema: "iron-defense-dense-evidence/v1", evidenceSha256: "6da0086cdd53a8aeb75772ddf4c8671905fb90f1b1cae26f13ea5f0af7e5571d", secondFreshEvidenceSha256: "6da0086cdd53a8aeb75772ddf4c8671905fb90f1b1cae26f13ea5f0af7e5571d", rawRgbSha256: "a2b2a60adb7bc8924e9beead705b04ab0995f1ae720de23d2f98167df1719d0e",
        fixtureSha256: "6f730e216980eecaa5948c95cbccb059ef10bb914bd5032a9ecb74f18260d7ca",
      },
      {
        path: paths[9], schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "IRON_DEFENSE", orientation: "opponent-to-player", targetSide: null,
        scenario: "tools/battle-lab/mechanic-iron-defense-opponent-clamperl-player-onix.json", probe: "tools/compare/ironDefenseProbe.py", attacker: ["CLAMPERL", "opponent"], target: ["ONIX", "player"],
        denseWindow: { startFrame: 215, endFrame: 315, frameCount: 101 }, presentationAge: -1, acceptance: { status: "exact", framebufferMatching: 101, componentMatching: null }, evidenceSchema: "iron-defense-dense-evidence/v1", evidenceSha256: "4390cfb3e8b87e4cca85cad96feb199eee542902398cc668d795b97515431a94", secondFreshEvidenceSha256: "4390cfb3e8b87e4cca85cad96feb199eee542902398cc668d795b97515431a94", rawRgbSha256: "32987f6ea503a9a7259c69e61eec3f0cf7cebd39d852754fd4f4e9ea7684fc7e",
        fixtureSha256: "d051bf42b2343a025a630987f98a4febfe34b614420d6ccd43611b17aa038c23",
      },
      {
        path: paths[10], schema: "scene-on-portable-component/v1", oracleProfile: "battle-scene-on", move: "POISON_TAIL", orientation: "player", targetSide: "opponent",
        scenario: "tools/battle-lab/mechanic-poison-tail-player-seviper-opponent-onix.json", probe: "tools/compare/poisonTailProbe.py", attacker: ["SEVIPER", "player"], target: ["ONIX", "opponent"],
        denseWindow: { startFrame: 226, endFrame: 412, frameCount: 187 }, presentationAge: 0, acceptance: null, evidenceSchema: null, evidenceSha256: null, secondFreshEvidenceSha256: null, rawRgbSha256: null,
        fixtureSha256: "7789746f906b8db42cb134881179e6eccc51d866d5d0b628af4f78f5718d0ed5",
      },
      {
        path: paths[11], schema: "scene-on-portable-component/v1", oracleProfile: "battle-scene-on", move: "POISON_TAIL", orientation: "opponent", targetSide: "player",
        scenario: "tools/battle-lab/mechanic-poison-tail-opponent-seviper-player-onix.json", probe: "tools/compare/poisonTailProbe.py", attacker: ["SEVIPER", "opponent"], target: ["ONIX", "player"],
        denseWindow: { startFrame: 226, endFrame: 412, frameCount: 187 }, presentationAge: 0, acceptance: null, evidenceSchema: null, evidenceSha256: null, secondFreshEvidenceSha256: null, rawRgbSha256: null,
        fixtureSha256: "bfd55e0a096d7a1f9aea7a51727973eb248cdb2c903d2870df06af0de4dddf5f",
      },
    ]);
  });

  it("keeps every move-owned source body distinct despite the shared command", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const harden = sourceBody(source, "Move_HARDEN:", "Move_BELLY_DRUM:");
    const ironDefense = sourceBody(source, "Move_IRON_DEFENSE:", "Move_BLOCK:");
    const steelWing = sourceBody(source, "Move_STEEL_WING:", "Move_IRON_TAIL:");
    const ironTail = sourceBody(source, "Move_IRON_TAIL:", "Move_POISON_TAIL:");
    const poisonTail = sourceBody(source, "Move_POISON_TAIL:", "Move_METAL_CLAW:");
    const metalClaw = sourceBody(source, "Move_METAL_CLAW:", "Move_NIGHT_SHADE:");

    expect(harden).toContain("loopsewithpan SE_M_HARDEN, SOUND_PAN_ATTACKER, 28, 2");
    expect(harden).toContain("metallic_shine permanent=FALSE");
    expect(harden).not.toContain("complex_palette_blend");

    expect(ironDefense).toContain("loopsewithpan SE_SHINY, SOUND_PAN_ATTACKER, 28, 2");
    expect(ironDefense).toContain("metallic_shine permanent=FALSE");
    expect(ironDefense).toContain("selector=F_PAL_BG, delay=8, num_blends=2, color1=RGB_WHITEALPHA");
    expect(ironDefense).not.toContain("set_original_pal");

    expect(steelWing).toContain("loadspritegfx ANIM_TAG_GUST");
    expect(steelWing).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(steelWing).toContain("metallic_shine permanent=FALSE");
    expect(steelWing).toContain("createvisualtask AnimTask_TranslateMonElliptical, 2, 0, 12, 4, 1, 4");
    expect(steelWing).toContain("createsprite gSlideMonToOriginalPosSpriteTemplate");

    expect(ironTail).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(ironTail).toContain("metallic_shine permanent=TRUE");
    expect(ironTail).toContain("createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 6, 1");
    expect(ironTail).toContain("set_original_pal battler=ANIM_ATTACKER");
    expect(ironTail).not.toContain("ANIM_TAG_POISON_BUBBLE");
    expect(ironTail).not.toContain("PoisonBubblesEffect");

    expect(poisonTail).toContain("loadspritegfx ANIM_TAG_POISON_BUBBLE");
    expect(poisonTail).toContain("metallic_shine permanent=TRUE, color=RGB(24, 6, 23)");
    expect(poisonTail).toContain("call PoisonBubblesEffect");
    expect(poisonTail).toContain("set_original_pal battler=ANIM_ATTACKER");

    expect(metalClaw).toContain("loadspritegfx ANIM_TAG_CLAW_SLASH");
    expect(metalClaw).toContain("metallic_shine permanent=FALSE");
    expect(metalClaw.match(/createsprite gHorizontalLungeSpriteTemplate/g)).toHaveLength(2);
    expect(metalClaw.match(/create_claw_slash_sprite/g)).toHaveLength(4);
    expect(metalClaw).toContain("shake_mon_or_platform velocity=-4, shake_timer=1, shake_duration=10");
  });

  it("requires the per-move latch contracts and the measured palette RAM+1 rule", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM (per source task, per sprite class), never");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("When a ledger entry and a change map disagree, the change map wins.");
    expect(latches).toContain("Bank change maps per orientation during staging");
    expect(latches).toContain("visible events display ONE\n   frame after the RAM write.");
    expect(latches).toContain("Palette writes (`gPlttBufferFaded`), incl. metallic-shine pulse and BlendPalette ramps | RAM+1 | STEEL_WING/IRON_TAIL shine; TORMENT anger-mark blend");

    const contracts: ReadonlyArray<readonly [string, readonly string[]]> = [
      ["tools/compare/hardenPortable.ts", ["fixture.probe", "hardwareOam", "hardwarePalette", "componentMatches", "framebufferMatches"]],
      ["tools/compare/steelWingPortable.ts", ["fixture.probe", "evidenceHash !== fixture.evidenceSha256", "actualRgbHash !== fixture.rawRgbSha256", "framebufferMatching"]],
      ["tools/compare/ironTailPortable.ts", ["fixture.secondFreshEvidenceSha256", "const hwRow", "componentMatches", "framebufferMatches"]],
      ["tools/compare/metalClawPortable.ts", ["fixture.secondFreshEvidenceSha256", "semanticMatching", "framebufferMatching"]],
      ["tools/compare/ironDefensePortable.ts", ["fixture.secondFreshEvidenceSha256", "Task_LoopAndPlaySE", "framebufferMatching"]],
      ["tools/compare/poisonTailPortable.ts", ["prior?.fadedPalette", "hardwareOamShape", "hardwareAffineShape", "componentMatches", "framebufferMatches"]],
    ];
    for (const [path, required] of contracts) {
      const portable = readFileSync(path, "utf8");
      for (const needle of required) expect(portable).toContain(needle);
    }
  });

  it("fulfills only the six independently exact metallic-shine representatives", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      readonly entries: readonly { readonly move: string; readonly status: string }[];
      readonly componentTracks: readonly unknown[];
    };
    const moves = new Set([
      "MOVE_HARDEN", "MOVE_STEEL_WING", "MOVE_IRON_TAIL", "MOVE_METAL_CLAW",
      "MOVE_IRON_DEFENSE", "MOVE_POISON_TAIL",
    ]);
    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(236);
    expect(coverage.entries.filter((entry) => moves.has(entry.move)).map((entry) => [
      entry.move, entry.status,
    ]).sort(([left], [right]) => left.localeCompare(right))).toEqual([
      ["MOVE_HARDEN", "exact"],
      ["MOVE_IRON_DEFENSE", "exact"],
      ["MOVE_IRON_TAIL", "exact"],
      ["MOVE_METAL_CLAW", "exact"],
      ["MOVE_POISON_TAIL", "exact"],
      ["MOVE_STEEL_WING", "exact"],
    ]);
    expect(coverage.componentTracks.filter((track: unknown) =>
      (track as { readonly id?: string }).id === "metallic-shine",
    )).toEqual([
      {
        id: "metallic-shine",
        components: ["visualCommand:metallic_shine"],
        representatives: [
          "MOVE_HARDEN",
          "MOVE_STEEL_WING",
          "MOVE_IRON_TAIL",
          "MOVE_METAL_CLAW",
          "MOVE_IRON_DEFENSE",
          "MOVE_POISON_TAIL",
        ],
        fulfilled: true,
        goal: fulfilledGoal,
      },
    ]);
  });
});
