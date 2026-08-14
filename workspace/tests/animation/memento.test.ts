import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  reduceMemento,
  type MementoBattlerConfig,
  type MementoConfig,
  type MementoState,
} from "../../src/animation/memento.ts";

type SourceRow = Record<string, any>;

const archives = [
  ["player-back", "tools/compare/evidence/memento-player-dense-state.json.gz"],
  ["opponent-front", "tools/compare/evidence/memento-opponent-dense-state.json.gz"],
] as const;

function battlerConfig(row: SourceRow, which: "attacker" | "target"): MementoBattlerConfig {
  const battler = row.animationBattlers[which] as 0 | 1;
  const opponent = (battler & 1) !== 0;
  const sprite = row.battlerSprites[which];
  const isWeezing = sprite.data[2] === 110;
  // These are source battler-coordinate/monbg values retained at the move
  // boundary, not fitted framebuffer coordinates.
  const shadowTop = isWeezing ? (opponent ? -3 : 59) : (opponent ? 3 : 49);
  const shadowBottom = isWeezing ? (opponent ? 71 : 111) : (opponent ? 71 : 111);
  const bg = opponent ? "BG1" : "BG2";
  return {
    battlerId: battler,
    side: opponent ? "opponent" : "player",
    bg,
    bgPriorityRank: opponent ? 1 : 2,
    x: sprite.x,
    shadowTop,
    shadowBottom,
    bgX: opponent ? (isWeezing ? -144 : -145) : -40,
    bgY: isWeezing ? (opponent ? -4 : -54) : (opponent ? -10 : -48),
    bgPaletteId: opponent ? 8 : 9,
  };
}

function configFrom(first: SourceRow): MementoConfig {
  return {
    attacker: battlerConfig(first, "attacker"),
    target: battlerConfig(first, "target"),
    initialScanlineSourceBuffer: first.scanline.srcBuffer,
    initialScanlineBuffers: first.scanlineBuffers,
    initialWindow: { win0h: first.registers.win0h, win0v: first.registers.win0v },
  };
}

function sourceProjection(row: SourceRow, config: MementoConfig): Omit<MementoState, "age" | "phase"> {
  const task = row.tasks[0]
    ? { name: row.tasks[0].func.symbol, data: row.tasks[0].data }
    : null;
  const blackBgPaletteIds = [8, 9].filter((id) =>
    row.unfadedPalette.slice(id * 16, id * 16 + 16).every((value: number) => value === 0));
  return {
    active: row.gAnimScriptActive,
    scriptOffset: row.scriptOffset,
    visualTaskCount: row.visualTaskCount,
    task,
    scanline: {
      srcBuffer: row.scanline.srcBuffer,
      state: row.scanline.state,
      dmaDest: row.scanline.dmaDest,
      dmaControl: row.scanline.dmaControl,
      setFirstScanlineReg: row.scanline.setFirstScanlineReg,
      buffers: row.scanlineBuffers,
    },
    battleBg: {
      bg1X: row.battleBg.gBattle_BG1_X,
      bg1Y: row.battleBg.gBattle_BG1_Y,
      bg2X: row.battleBg.gBattle_BG2_X,
      bg2Y: row.battleBg.gBattle_BG2_Y,
      win0h: row.battleBg.gBattle_WIN0H,
      win0v: row.battleBg.gBattle_WIN0V,
    },
    monbg: {
      attacker: config.attacker.bg === "BG1"
        ? row.battleBg.gBattle_BG1_X === config.attacker.bgX && row.battleBg.gBattle_BG1_Y === config.attacker.bgY
        : row.battleBg.gBattle_BG2_X === config.attacker.bgX && row.battleBg.gBattle_BG2_Y === config.attacker.bgY,
      target: config.target.bg === "BG1"
        ? row.battleBg.gBattle_BG1_X === config.target.bgX && row.battleBg.gBattle_BG1_Y === config.target.bgY
        : row.battleBg.gBattle_BG2_X === config.target.bgX && row.battleBg.gBattle_BG2_Y === config.target.bgY,
    },
    registers: {
      win0h: row.registers.win0h,
      win0v: row.registers.win0v,
      winin: row.registers.winin,
      winout: row.registers.winout,
      bldcnt: row.registers.bldcnt,
      bldalpha: row.registers.bldalpha,
    },
    battlerPriority: {
      attacker: (row.battlerSprites.attacker.attr[2] >>> 10) & 3,
      target: (row.battlerSprites.target.attr[2] >>> 10) & 3,
    },
    blackBgPaletteIds,
  } as Omit<MementoState, "age" | "phase">;
}

function reducerProjection(state: MementoState): Omit<MementoState, "age" | "phase"> {
  const { age: _age, phase: _phase, ...projection } = state;
  return projection;
}

function assertRowEqual(age: number, actual: unknown, expected: unknown): void {
  const stable = (value: any): any => Array.isArray(value) ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
  if (JSON.stringify(stable(actual)) === JSON.stringify(stable(expected))) return;
  const actualRow = actual as Record<string, unknown>;
  const expectedRow = expected as Record<string, unknown>;
  const fields = Object.keys(expectedRow).filter((key) =>
    JSON.stringify(actualRow[key]) !== JSON.stringify(expectedRow[key]));
  throw new Error(`Memento reducer mismatch at age ${age}: ${fields.map((key) =>
    `${key}=${JSON.stringify(actualRow[key])} != ${JSON.stringify(expectedRow[key])}`).join("; ")}`);
}

describe("MOVE_MEMENTO source-relative reducer", () => {
  for (const [orientation, path] of archives) {
    it(`matches every retained ${orientation} source row explicitly`, () => {
      const probe = JSON.parse(gunzipSync(readFileSync(path)).toString("utf8"));
      const rows = probe.frames as SourceRow[];
      const config = configFrom(rows[0]!);
      const states = reduceMemento(config);
      expect(states).toHaveLength(rows.length);
      let matching = 0;
      for (const [age, row] of rows.entries()) {
        assertRowEqual(age, reducerProjection(states[age]!), sourceProjection(row, config));
        matching += 1;
      }
      expect(matching).toBe(orientation === "player-back" ? 178 : 175);
      expect(states.at(-1)).toMatchObject({ active: false, phase: "inactive", task: null });
    });
  }

  it("fails closed when a retained source surface is mutated", () => {
    const probe = JSON.parse(gunzipSync(readFileSync(archives[0][1])).toString("utf8"));
    const rows = structuredClone(probe.frames) as SourceRow[];
    rows[53]!.scanlineBuffers[0][17] ^= 1;
    const states = reduceMemento(configFrom(rows[0]!));
    expect(() => assertRowEqual(53, reducerProjection(states[53]!), sourceProjection(rows[53]!, configFrom(rows[0]!)))).toThrow();
  });

  it("does not mutate reducer configuration or battle-facing retained state", () => {
    const probe = JSON.parse(gunzipSync(readFileSync(archives[1][1])).toString("utf8"));
    const first = probe.frames[0] as SourceRow;
    const config = configFrom(first);
    const beforeConfig = structuredClone(config);
    const immutable = structuredClone({ battlers: first.battlers, parties: first.parties, immutableState: first.immutableState, animationRng: first.animationRng });
    reduceMemento(config);
    expect(config).toEqual(beforeConfig);
    expect({ battlers: first.battlers, parties: first.parties, immutableState: first.immutableState, animationRng: first.animationRng }).toEqual(immutable);
  });
});
