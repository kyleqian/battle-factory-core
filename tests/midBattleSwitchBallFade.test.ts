import { describe, expect, it } from "vitest";
import {
  midBattleSwitchFadeAt,
  MID_BATTLE_SWITCH_FADE_BASE_TRACE,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { blendComponentToWhite } from "../src/engine/paletteFade.ts";

/**
 * ISSUES #78 residual (1): the mid-battle switch white ball-fade's per-frame
 * coefficient schedule, pinned against `docs/mid-battle-switch-presentation-
 * ground-truth.md` §8.3's committed per-frame tables (verified byte-exact
 * 144/144 against RAM). The projection returns the RENDERED coefficients for
 * the given trace frame: the oracle's rendered frame lags the §8.3 per-tick
 * tables by one frame (white = `y[traceFrame-2]`, ball = the task ramp one
 * tick earlier), so every assertion below checks `table[N-1]`.
 */
describe("midBattleSwitchFadeAt (ISSUES #78 ball-fade schedule)", () => {
  it("anchors the base trace clock at the resolution's first render", () => {
    // The null-handoff confirm phase's first tick is the staged fixture's
    // frame 1035 (field idle after the party-menu close, ground truth §2).
    expect(MID_BATTLE_SWITCH_FADE_BASE_TRACE).toBe(1035);
  });

  it("returns null outside the two fade windows", () => {
    expect(midBattleSwitchFadeAt(1087)).toBeNull();
    expect(midBattleSwitchFadeAt(1140)).toBeNull();
    expect(midBattleSwitchFadeAt(1186)).toBeNull();
    expect(midBattleSwitchFadeAt(1232)).toBeNull();
  });

  it("reproduces the recall white-in/plateau/white-out rendered coefficients (§8.3 + render lag)", () => {
    // §8.3 recall `y` column, rendered one frame late: white-in 1088-1104
    // steps 0,2,2,4,...,16; plateau 1105-1109 holds 16; white-out 1110-1126
    // steps 16,14,14,...,0; the frame-1121 stolen tick holds y=6 for three
    // ticks (rendered 1121-1123); finishing 1128-1131 renders 0.
    const expected: Readonly<Record<number, number>> = {
      1088: 0, 1089: 0, 1090: 0,
      1091: 2, 1092: 2, 1093: 4, 1094: 4,
      1095: 6, 1096: 6, 1097: 8, 1098: 8,
      1099: 10, 1100: 10, 1101: 12, 1102: 12,
      1103: 14, 1104: 14,
      1105: 16, 1106: 16, 1107: 16, 1108: 16,
      1109: 16, 1110: 16, 1111: 16, 1112: 16,
      1113: 14, 1114: 14, 1115: 12, 1116: 12,
      1117: 10, 1118: 10, 1119: 8, 1120: 8,
      1121: 6, 1122: 6, 1123: 6,
      1124: 4, 1125: 4, 1126: 2, 1127: 2,
      1128: 0, 1129: 0, 1130: 0, 1131: 0,
    };
    for (const [frame, coeff] of Object.entries(expected)) {
      const fade = midBattleSwitchFadeAt(Number(frame));
      expect(fade).not.toBeNull();
      expect(fade!.bg, `recall frame ${frame}`).toBe(coeff);
    }
  });

  it("reproduces the recall ball ramp 0->16, held through 1139 (§8.3)", () => {
    const expected: Readonly<Record<number, number>> = {
      1088: 0, 1089: 0, 1090: 0, 1091: 1,
      1092: 2, 1093: 3, 1094: 4, 1095: 5,
      1096: 6, 1097: 7, 1098: 8, 1099: 9,
      1100: 10, 1101: 11, 1102: 12, 1103: 13,
      1104: 14, 1105: 15, 1106: 16,
    };
    for (const [frame, coeff] of Object.entries(expected)) {
      expect(midBattleSwitchFadeAt(Number(frame))!.obj, `recall frame ${frame}`).toBe(coeff);
    }
    for (let frame = 1107; frame <= 1139; frame += 1) {
      expect(midBattleSwitchFadeAt(frame)!.obj, `recall hold frame ${frame}`).toBe(16);
    }
    expect(midBattleSwitchFadeAt(1140)).toBeNull();
  });

  it("reproduces the send-in white coefficients (§8.3 + render lag, incl. the 6-tick plateau)", () => {
    const expected: Readonly<Record<number, number>> = {
      1187: 0, 1188: 0, 1189: 2, 1190: 2,
      1191: 4, 1192: 4, 1193: 6, 1194: 6,
      1195: 8, 1196: 8, 1197: 10, 1198: 10,
      1199: 12, 1200: 12, 1201: 14, 1202: 14,
      // plateau 1203-1208 (stolen tick extends it) renders 1203-1211
      1203: 16, 1204: 16, 1205: 16, 1206: 16,
      1207: 16, 1208: 16, 1209: 16, 1210: 16, 1211: 16,
      1212: 14, 1213: 14, 1214: 12, 1215: 12,
      1216: 10, 1217: 10, 1218: 8, 1219: 8,
      1220: 6, 1221: 6, 1222: 4, 1223: 4,
      1224: 2, 1225: 2, 1226: 0, 1227: 0,
      1228: 0, 1229: 0, 1230: 0, 1231: 0,
    };
    for (const [frame, coeff] of Object.entries(expected)) {
      const fade = midBattleSwitchFadeAt(Number(frame));
      expect(fade).not.toBeNull();
      expect(fade!.bg, `send-in frame ${frame}`).toBe(coeff);
    }
  });

  it("reproduces the send-in ball ramp held 16 then 16->0 (§8.3)", () => {
    for (let frame = 1187; frame <= 1211; frame += 1) {
      expect(midBattleSwitchFadeAt(frame)!.obj, `send-in hold frame ${frame}`).toBe(16);
    }
    const expected: Readonly<Record<number, number>> = {
      1212: 15, 1213: 14, 1214: 13, 1215: 12,
      1216: 11, 1217: 10, 1218: 9, 1219: 8,
      1220: 7, 1221: 6, 1222: 5, 1223: 4,
      1224: 3, 1225: 2, 1226: 1, 1227: 0,
    };
    for (const [frame, coeff] of Object.entries(expected)) {
      expect(midBattleSwitchFadeAt(Number(frame))!.obj, `send-in frame ${frame}`).toBe(coeff);
    }
    expect(midBattleSwitchFadeAt(1232)).toBeNull();
  });

  it("runs the §8.4 blend arithmetic with BlendPalette's exact formula", () => {
    // faded = c + (((target - c) * coeff) >> 4) per 5-bit channel, `<<3 | >>2`
    // re-expansion. BG white: (23,23,19) at coeff 4 -> (206,206,181).
    expect(blendComponentToWhite(189, 4)).toBe(206);
    expect(blendComponentToWhite(189, 4)).toBe(206);
    expect(blendComponentToWhite(156, 4)).toBe(181);
    // A saturated target channel is untouched at any coeff (white on white).
    expect(blendComponentToWhite(255, 16)).toBe(255);
  });
});
