// sub183 (ISSUES #153; docs/sub183-substitute-turn-timing.md): the Substitute turn's HP command started 6 frames early (G+91 against the
// ROM's G+97, both scenes). BattleScript_EffectSubstitute is `attackstring; waitstate; jumpifstatus2; setsubstitute; jumpifbyte; attackanimation;
// waitanimation; healthbarupdate; datahpupdate; printfromtable; waitmessage`: the 4 script rows between the used print's release and the
// body (scriptLeadFrames), the body's universal post rows (164 in LIVE_MOVE_POST_ROW_SIDES), and the 3 rows between the bar and the next
// print's first glyph (tailFrames). Verified against four fresh ROM windows (tools/integration/fixtures/sub183/dense-*.json: 291 / 291 rows,
// 0 px each, both scenes x both sides). A Tackle turn in the same harness is the control: none of the three fields appears.
import { describe, expect, it } from "vitest";
import { battleHealthBarAnimationFrames } from "../src/engine/healthboxAssembly";
import { battleResolutionCommandDuration } from "../src/engine/battleResolutionPresentationRender";
import { sub183Production } from "../tools/integration/sub183Production";
import denseOffOpponent from "../tools/integration/fixtures/sub183/dense-off-opponent.json";
import denseOffPlayer from "../tools/integration/fixtures/sub183/dense-off-player.json";
import denseOnOpponent from "../tools/integration/fixtures/sub183/dense-on-opponent.json";
import denseOnPlayer from "../tools/integration/fixtures/sub183/dense-on-player.json";

const PERSIAN = { name: "PERSIAN", id: 53, hp: 172 };
const SLOWBRO = { name: "SLOWBRO", id: 80, hp: 202 };

type Timeline = { commands: any[]; durations: number[]; starts: number[] };
function timeline(scene: "on" | "off", side: "player" | "opponent"): Timeline {
  const prod = sub183Production({ scene, side, attacker: PERSIAN, other: SLOWBRO });
  const durations = prod.commands.map((c) => battleResolutionCommandDuration(c, prod.field));
  const starts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));
  return { commands: prod.commands, durations, starts };
}

const CASES = [
  { scene: "off", side: "opponent", dense: denseOffOpponent, usedFrames: 27, hpStart: 123, printStart: 170 },
  { scene: "off", side: "player", dense: denseOffPlayer, usedFrames: 23, hpStart: 119, printStart: 166 },
  { scene: "on", side: "opponent", dense: denseOnOpponent, usedFrames: 27, hpStart: 123, printStart: 170 },
  { scene: "on", side: "player", dense: denseOnPlayer, usedFrames: 23, hpStart: 119, printStart: 166 },
] as const;

describe("sub183 Substitute turn timing", () => {
  for (const c of CASES) {
    it(`${c.scene} ${c.side} attacker: body 96 frames, HP at the ROM's G+97, print at its first glyph`, () => {
      const t = timeline(c.scene, c.side);
      const body = t.commands.findIndex((x) => x.type === "move-animation" && x.animation?.moveId === 164);
      const hp = t.commands.findIndex((x, i) => i > body && x.type === "hp");
      expect(body).toBe(1);
      expect(t.commands[body].timing.scriptLeadFrames).toBe(4);
      expect(t.durations[body]).toBe(96);
      expect(t.starts[body]).toBe(c.usedFrames);
      expect(t.starts[hp]).toBe(c.hpStart);
      expect(t.commands[hp].timing.tailFrames).toBe(3);
      expect(t.durations[hp]).toBe(battleHealthBarAnimationFrames({ maxHp: PERSIAN.hp, from: t.commands[hp].from, to: t.commands[hp].to }) + 1 + 3);
      expect(t.starts[hp + 1]).toBe(c.printStart);
      // The receipts: the ROM's first-glyph spike and the production's land on the same dt, the whole window 291 / 291 rows.
      expect(c.dense.hpStart).toBe(c.hpStart);
      expect(c.dense.romSpikes[1]).toBe(c.printStart);
      expect(c.dense.prodSpikes.map((s: { dt: number }) => s.dt)).toEqual(c.dense.romSpikes.slice(1));
      expect(c.dense.window.allRegionsExactRows).toBe(c.dense.window.rows);
      expect(c.dense.window.totalPx).toEqual({ box: 0, opp: 0, ply: 0, other: 0 });
    });
  }

  it("the other mon's Tackle in the same turn (control) carries none of the Substitute fields", () => {
    for (const side of ["player", "opponent"] as const) {
      const prod = sub183Production({ scene: "on", side, attacker: PERSIAN, other: SLOWBRO });
      const tackle = prod.commands.filter((c) => c.type === "move-animation" && c.animation?.moveId === 33);
      expect(tackle.length).toBeGreaterThan(0);
      for (const c of tackle) expect(c.timing.scriptLeadFrames).toBeUndefined();
      const hps = prod.commands.filter((c) => c.type === "hp");
      expect(hps.filter((c) => c.timing.tailFrames !== undefined).length).toBe(1);
      for (const c of hps.filter((x) => x.timing.tailFrames === undefined)) {
        expect(c.timing).toEqual({ minimumFrames: 28 });
        expect(battleResolutionCommandDuration(c, prod.field)).toBe(
          battleHealthBarAnimationFrames({ maxHp: c.battler === (side === "player" ? 0 : 1) ? PERSIAN.hp : SLOWBRO.hp, from: c.from, to: c.to }) + 1,
        );
      }
    }
  });
});
