import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const components = [
  "asset:ANIM_TAG_SPIDER_WEB", "asset:ANIM_TAG_WEB_THREAD", "sprite:gSpiderWebSpriteTemplate",
  "subroutine:SpiderWebThread", "visualCommand:clearmonbg", "visualCommand:create_web_thread_sprite",
  "visualCommand:monbg", "visualCommand:simple_palette_blend", "visualCommand:splitbgprio",
];
let cached: Json | undefined;
const audit = (): Json => cached ??= JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/spiderWebSourceAudit.ts"], { cwd: root, encoding: "utf8" }));

function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}

function validateStage(path: string) {
  return spawnSync("python3", ["-c", [
    "import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_SPIDER_WEB authoritative source and staging checkpoint", () => {
  it("pins the complete half-open ROM/source body, graph, resources, callbacks, and macro bodies", () => {
    const result = audit();
    expect(result).toMatchObject({
      schema: "spider-web-source-audit/v1", move: "MOVE_SPIDER_WEB", moveId: 169, status: "exact", coverageCredit: false,
      source: { pointerOwnedRoot: { rom: { start: "0x082d38e0", endExclusive: "0x082d3981", byteLength: 161, romSha256: "1ff0a2a0387c164efa6fdd30345d487fa3a469a8bbeead007ca53dfc048bfc34" }, source: { byteLength: 1121, sha256: "36422332f68aeb4d133b2913ed8028736e7ba5ead8d81d46ff1a2810da3f5887" } } },
      graph: { root: "Move_SPIDER_WEB", blocks: ["Move_SPIDER_WEB", "SpiderWebThread"], components },
      resources: { tags: { ANIM_TAG_WEB_THREAD: 10180, ANIM_TAG_SPIDER_WEB: 10181 }, sourceFiles: ["graphics/battle_anims/sprites/web_thread.png", "graphics/battle_anims/sprites/spider_web.png"] },
      templates: ["gWebThreadSpriteTemplate", "gSpiderWebSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"],
      visualCommands: ["clearmonbg", "create_web_thread_sprite", "monbg", "simple_palette_blend", "splitbgprio"],
    });
    expect(result.source.subroutine.source).toMatchObject({ path: "data/battle_anim_scripts.s", byteLength: 131, sha256: "0ab6a7a155dca8e27779185c041f9fb39d00ee4273a28fbb0a12a3ce921c6650" });
    expect(Object.keys(result.source.direct.callbacks)).toEqual([
      "AnimTranslateWebThread", "AnimTranslateWebThread_Step", "AnimSpiderWeb", "AnimSpiderWeb_Step", "AnimSpiderWeb_End", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step", "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_LoopAndPlaySE", "Cmd_monbg", "Cmd_clearmonbg", "Cmd_splitbgprio", "Cmd_loopsewithpan", "Cmd_end",
    ]);
    expect(Object.keys(result.source.macros)).toEqual(["monbg", "clearmonbg", "splitbgprio", "simple_palette_blend", "create_web_thread_sprite"]);
  });

  it("derives both level-50 carriers and keeps String Shot outside Factory", () => {
    const result = audit();
    expect(result.carriers).toEqual([
      { setId: 27, label: "FRONTIER_MON_SPINARAK", species: "SPECIES_SPINARAK", moves: ["MOVE_SIGNAL_BEAM", "MOVE_NIGHT_SHADE", "MOVE_SPIDER_WEB", "MOVE_SCARY_FACE"], itemName: "BATTLE_FRONTIER_ITEM_LIECHI_BERRY", ppUps: [0, 0, 0, 0] },
      { setId: 160, label: "FRONTIER_MON_ARIADOS", species: "SPECIES_ARIADOS", moves: ["MOVE_SIGNAL_BEAM", "MOVE_SPIDER_WEB", "MOVE_NIGHT_SHADE", "MOVE_TOXIC"], itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", ppUps: [0, 0, 0, 0] },
    ]);
    const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
    expect(graph.moves.find((entry: Json) => entry.move === "MOVE_STRING_SHOT")).toMatchObject({ tier: "outsideFactory" });
    expect(graph.moves.find((entry: Json) => entry.move === "MOVE_STRING_SHOT").componentIds).toEqual([
      "asset:ANIM_TAG_STRING", "asset:ANIM_TAG_WEB_THREAD", "subroutine:StringShotThread", "visualCommand:clearmonbg", "visualCommand:create_string_wrap_sprite", "visualCommand:create_web_thread_sprite", "visualCommand:monbg", "visualCommand:simple_palette_blend",
    ]);
    expect(JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"))).toMatchObject({ queue: ["MOVE_SHOCK_WAVE"] });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-spider-web-player-spinarak-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-spider-web-opponent-spinarak-player-onix.json", false],
  ])("validates the %s complete legal transient-free bilateral party stage", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path as string), "utf8")) as Json;
    const validated = validateStage(path as string);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0, trainerId: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]); expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1800, buttons: [] }] });
    const all = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent];
    expect(new Set(all.map((mon: Json) => mon.species)).size).toBe(6); expect(new Set(all.map((mon: Json) => mon.item)).size).toBe(6);
    for (const party of Object.values(stage.overrides.parties) as Json[][]) for (const mon of party) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys); expect(Object.keys(mon.ivs).sort()).toEqual(statKeys); expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.level).toBe(50); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    const attacker = playerAttacker ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    expect(attacker).toMatchObject({ species: 167, level: 50, moves: [169, 169, 169, 169], item: 219, abilitySlot: 0, friendship: 70, gender: "female", shiny: false });
  });
});
