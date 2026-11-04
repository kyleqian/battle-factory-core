import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import data from "../src/data/gen/audio-sound-sources.json" with { type: "json" };

// Pins for the S11 audio sound-source table (aud238): every sound op in the
// move-animation scripts, the C-side PlaySE/PlayCry sites, the battle
// script/controller/screen call sites, the GetBattleBGM mapping, Factory map
// music, and BGM/fanfare loop points. Reads only the committed JSON; the
// regeneration check needs reference/ and skips cleanly without it.

type Row = Record<string, unknown>;
const sources = data as unknown as {
  schema: string;
  counts: Record<string, Record<string, unknown>>;
  animScripts: { soundOps: Row[]; otherSoundOps: Row[]; entries: Row[] };
  cAnimSites: { rows: Row[] };
  sites: { rows: Row[]; battleScriptUses: Row[] };
  battleBgm: {
    flagBranches: Row[];
    trainerClassSwitch: Row[];
    defaultTrainerSong: Row;
    factory: { brain: Row; songs: Row[]; unknownFacilityClasses: unknown[] };
  };
  mapMusic: { maps: Row[]; scriptOps: Row[]; stdScripts: Row[]; followedCalls: Row[] };
  songLoops: Row[];
};

const count = (rows: Row[], key: string) => {
  const out: Record<string, number> = {};
  for (const row of rows) out[row[key] as string] = (out[row[key] as string] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
};

describe("audio sound-source table", () => {
  it("pins the move-animation script sound ops", () => {
    const ops = sources.animScripts.soundOps;
    expect(sources.schema).toBe("audio-sound-sources/v1");
    expect(ops).toHaveLength(1042);
    expect(count(ops, "op")).toEqual({
      loopsewithpan: 97,
      panse: 20,
      panse_adjustall: 1,
      panse_adjustnone: 1,
      playsewithpan: 873,
      setpan: 2,
      waitplaysewithpan: 48,
    });
    const ids = new Set(ops.filter((op) => op.songId !== undefined).map((op) => op.songId));
    expect(ids.size).toBe(129);
    expect(sources.counts.animScripts!.distinctSongIds).toBe(129);
    expect(sources.counts.animScripts!.distinctSongIdsPlayLoopWait).toBe(122);
    expect(sources.counts.animScripts!.distinctSongIdsInclPlayseAndSoundTasks).toBe(132);
    expect(sources.counts.animScripts!.movesTableEntriesReachable).toBe(355);
    expect(ops.every((op) => typeof op.line === "number" && typeof op.label === "string")).toBe(true);
    expect(count(sources.animScripts.otherSoundOps, "op")).toEqual({ createsoundtask: 8, playse: 2 });
  });

  it("pins a loopsewithpan row with its args", () => {
    const row = sources.animScripts.soundOps.find((op) => op.op === "loopsewithpan" && op.label === "Move_POISON_POWDER");
    expect(row).toMatchObject({
      song: "SE_M_POISON_POWDER",
      songId: 169,
      args: { pan: "SOUND_PAN_TARGET", wait: "10", times: "6" },
      values: { pan: 63, wait: 10, times: 6 },
      line: 460,
    });
  });

  it("pins the C-side anim sound sites", () => {
    const rows = sources.cAnimSites.rows;
    expect(rows).toHaveLength(59);
    expect(count(rows, "file")).toEqual({
      "src/battle_anim.c": 7,
      "src/battle_anim_effects_1.c": 5,
      "src/battle_anim_effects_2.c": 3,
      "src/battle_anim_effects_3.c": 10,
      "src/battle_anim_electric.c": 1,
      "src/battle_anim_fire.c": 1,
      "src/battle_anim_ghost.c": 2,
      "src/battle_anim_psychic.c": 1,
      "src/battle_anim_rock.c": 2,
      "src/battle_anim_sound_tasks.c": 13,
      "src/battle_anim_throw.c": 12,
      "src/battle_anim_utility_funcs.c": 2,
    });
    expect(count(rows, "call")).toEqual({
      PlayCry_ByMode: 6,
      PlayCry_DuckNoRestore: 2,
      PlaySE: 12,
      PlaySE12WithPanning: 36,
      PlaySE1WithPanning: 2,
      PlaySE2WithPanning: 1,
    });
  });

  it("pins per-family call-site counts", () => {
    const rows = sources.sites.rows;
    expect(rows).toHaveLength(378);
    expect(count(rows, "family")).toEqual({
      ball: 21,
      "battle-controller": 56,
      "battle-gfx": 6,
      "battle-interface": 3,
      "battle-main": 18,
      "battle-script": 30,
      "factory-screen": 24,
      field: 31,
      menu: 39,
      "party-menu": 72,
      "sound-core": 53,
      "summary-screen": 19,
      text: 6,
    });
    expect(sources.counts.sites!.selectPerFile).toMatchObject({
      "src/battle_factory_screen.c": 24,
      "src/party_menu.c": 56,
      "src/menu.c": 32,
      "src/pokemon_summary_screen.c": 12,
    });
    expect(sources.counts.sites!.failurePerFile).toEqual({
      "src/party_menu.c": 8,
      "src/pokemon_summary_screen.c": 2,
    });
  });

  it("pins the Cmd_effectivenesssound songs", () => {
    const rows = sources.sites.rows.filter((row) => row.fn === "Cmd_effectivenesssound");
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((row) => row.song))).toEqual(
      new Set(["SE_SUPER_EFFECTIVE", "SE_NOT_EFFECTIVE", "SE_EFFECTIVE"]),
    );
    expect(rows.map((row) => [row.line, row.songId])).toEqual([
      [2012, 14],
      [2016, 12],
      [2029, 14],
      [2034, 12],
      [2039, 13],
    ]);
    expect(sources.sites.battleScriptUses.filter((use) => use.op === "effectivenesssound")).toHaveLength(18);
  });

  it("pins SE_FAINT's two controller sites with their pan expressions", () => {
    const rows = sources.sites.rows
      .filter((row) => row.song === "SE_FAINT")
      .sort((a, b) => ((a.file as string) < (b.file as string) ? -1 : 1));
    expect(rows.map((row) => [row.file, row.line, row.fn, row.args, row.pan, row.panValue])).toEqual([
      [
        "src/battle_controller_opponent.c",
        1421,
        "OpponentHandleFaintAnimation",
        ["SE_FAINT", "SOUND_PAN_TARGET"],
        "SOUND_PAN_TARGET",
        63,
      ],
      [
        "src/battle_controller_player.c",
        2422,
        "PlayerHandleFaintAnimation",
        ["SE_FAINT", "SOUND_PAN_ATTACKER"],
        "SOUND_PAN_ATTACKER",
        -64,
      ],
    ]);
    expect(rows.every((row) => row.songId === 16)).toBe(true);
  });

  it("pins Factory map music and the battle BGM mapping", () => {
    expect(sources.mapMusic.maps.map((map) => [map.map, map.music, map.musicId])).toEqual([
      ["BattleFrontier_BattleFactoryLobby", "MUS_B_FACTORY", 469],
      ["BattleFrontier_BattleFactoryPreBattleRoom", "MUS_B_FACTORY", 469],
      ["BattleFrontier_BattleFactoryBattleRoom", "MUS_B_FACTORY", 469],
    ]);
    expect(sources.battleBgm.flagBranches).toHaveLength(5);
    expect(sources.battleBgm.defaultTrainerSong).toMatchObject({ song: "MUS_VS_TRAINER", songId: 476 });
    expect(sources.battleBgm.factory.brain).toMatchObject({
      trainer: "TRAINER_NOLAND",
      song: "MUS_VS_FRONTIER_BRAIN",
      songId: 471,
    });
    expect(sources.battleBgm.factory.songs).toHaveLength(1);
    expect(sources.battleBgm.factory.songs[0]).toMatchObject({ song: "MUS_VS_TRAINER", trainers: 300, reachableTrainers: 300 });
    expect(sources.battleBgm.factory.unknownFacilityClasses).toEqual([]);
  });

  it("follows std msgbox scripts and shared call targets (aud240d)", () => {
    const { mapMusic, counts } = sources;
    expect(counts.mapMusic).toMatchObject({
      scriptOps: 18,
      scriptOpsPerOp: { playfanfare: 4, playse: 5, waitfanfare: 4, waitse: 5 },
      scriptOpsViaStd: 2,
      stdScripts: 6,
      stdScriptsWithSound: 1,
      followedCalls: 9,
      followedCallsWithSound: 2,
    });
    const viaStd = mapMusic.scriptOps.filter((row) => row.via !== undefined);
    expect(viaStd.map((row) => [row.map, row.line, row.op, row.song, row.songId, row.via, row.stdLabel, row.stdLine])).toEqual([
      ["BattleFrontier_BattleFactoryLobby", 54, "playfanfare", "MUS_OBTAIN_B_POINTS", 459, "msgbox MSGBOX_GETPOINTS", "Std_MsgboxGetPoints", 32],
      ["BattleFrontier_BattleFactoryLobby", 54, "waitfanfare", undefined, undefined, "msgbox MSGBOX_GETPOINTS", "Std_MsgboxGetPoints", 33],
    ]);
    expect(mapMusic.stdScripts.filter((row) => (row.ops as Row[]).length > 0).map((row) => row.type)).toEqual(["MSGBOX_GETPOINTS"]);
    const withSound = mapMusic.followedCalls.filter((row) => (row.ops as Row[]).length > 0);
    expect(withSound.map((row) => [row.map, row.line, row.target, (row.ops as Row[]).map((op) => [op.op, op.songId])])).toEqual([
      ["BattleFrontier_BattleFactoryLobby", 88, "BattleFrontier_EventScript_SaveBattle", [["playse", 55]]],
      ["BattleFrontier_BattleFactoryPreBattleRoom", 118, "BattleFrontier_EventScript_SaveBattle", [["playse", 55]]],
    ]);
  });

  it("pins loop points for the referenced songs", () => {
    const byName = new Map(sources.songLoops.map((song) => [song.song as string, song]));
    expect(byName.get("MUS_B_FACTORY")).toMatchObject({ songId: 469, loops: true, loopStartTick: 168, loopEndTick: 3720 });
    expect(byName.get("MUS_VS_FRONTIER_BRAIN")).toMatchObject({ songId: 471, loops: true, loopStartTick: 300, loopEndTick: 7116 });
    expect(byName.get("MUS_VS_TRAINER")).toMatchObject({ songId: 476, loops: true, loopStartTick: 960, loopEndTick: 7104 });
    expect(byName.get("MUS_HEAL")).toMatchObject({ songId: 368, loops: false, totalTicks: 120 });
    expect(byName.get("MUS_OBTAIN_B_POINTS")).toMatchObject({ songId: 459, loops: false });
    expect(sources.counts.songLoops).toEqual({ songs: 24, withLoop: 17, oneShot: 7 });
  });
});

const referenceAvailable = existsSync("reference/pokeemerald/data/battle_anim_scripts.s");

describe("audio sound-source table regeneration", () => {
  it.skipIf(!referenceAvailable)("re-running the extractor reproduces the committed JSON byte-for-byte", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "audio-sound-sources-"));
    try {
      execFileSync(
        process.execPath,
        ["--experimental-strip-types", "tools/extract/extract-audio-sound-sources.ts", "--out-dir", outputDirectory],
        { stdio: "pipe" },
      );
      const regenerated = readFileSync(join(outputDirectory, "audio-sound-sources.json"), "utf8");
      const committed = readFileSync("src/data/gen/audio-sound-sources.json", "utf8");
      expect(
        regenerated === committed,
        "src/data/gen/audio-sound-sources.json is stale — rerun `npm run extract:audio-sound-sources` and commit the result",
      ).toBe(true);
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  }, 120_000);
});
