// btn1 (ISSUES #223; docs/subp1m-battle-text-pause.md "btn1"): in a Factory battle a `\p` / `\l` / PAUSE_UNTIL_PRESS holds until a NEW A or B
// press (text.c:865-882; BattlePutTextOnWindow's autoScroll is link / recorded only). START does nothing, a press while the text types is not
// remembered, and the segment's `turn-end` is still emitted. Each class below runs a census battle (seed i = the off108 loop) to its first gated
// message and feeds its own presses.
import { describe, expect, it } from "vitest";
import {
  PROMPT_SCROLL_ROWS,
  messageCommandTypedRows,
  promptGatedMessageCommands,
} from "../src/engine/battleResolutionPresentation";
import { GATE_ACCEPT_LEAD_ROWS } from "../src/engine/battleResolutionPresentationRender";
import { battleStringPromptGates } from "../src/engine/battleStringResolver";
import templates from "../src/data/gen/battle-message-templates.json" with { type: "json" };
import { currentMessage, playCensusBattleUntil, stopAtGatedMessage } from "./helpers/btn1Battle";
import type { GbaButton } from "../src/input";

const HOLD_ROWS = 400;

type Gated = { cursor: ReturnType<typeof playCensusBattleUntil>["cursor"]; typedRows: number };

function reach(seed: number, scene: "on" | "off", messageId: string, piece = 0): Gated {
  const { cursor, found } = playCensusBattleUntil(seed, scene, stopAtGatedMessage(messageId, piece));
  expect(found, `${messageId} piece ${piece} reached in seed ${seed} ${scene}`).toBe(true);
  return { cursor, typedRows: messageCommandTypedRows(currentMessage(cursor.state())!.command) };
}

const phaseOf = (g: Gated) => (g.cursor.state().battleResolutionPresentation as any).lifecycle.phase as string;
const indexOf = (g: Gated) => (g.cursor.state().battleResolutionPresentation as any).commandIndex as number;
const segmentOf = (g: Gated) => (g.cursor.state().battleResolutionPresentation as any).segmentIndex as number;

/** Steps `rows` presenting rows with no input; returns whether the battle is still on the same command. */
function stall(g: Gated, rows: number, buttons: readonly GbaButton[] = []): boolean {
  const index = indexOf(g);
  const segment = segmentOf(g);
  for (let row = 0; row < rows; row += 1) {
    g.cursor.step(buttons.length > 0 && row === rows - 1 ? buttons : []);
    if (g.cursor.ended() || indexOf(g) !== index || segmentOf(g) !== segment) return false;
  }
  return true;
}

/** The row (counted from the piece's first row) a press made on that row releases the piece; null = it never does within the cap. */
function releaseRow(g: Gated, button: GbaButton, pressRow: number): number | null {
  const index = indexOf(g);
  const segment = segmentOf(g);
  for (let row = 0; row < pressRow + 40; row += 1) {
    g.cursor.step(row === pressRow ? [button] : []);
    if (g.cursor.ended() || indexOf(g) !== index || segmentOf(g) !== segment) return row;
  }
  return null;
}

const CLASSES: ReadonlyArray<Readonly<{ name: string; id: string; seed: number }>> = [
  { name: "Substitute damaged", id: "STRINGID_SUBSTITUTEDAMAGED", seed: 177 },
  { name: "Substitute faded", id: "STRINGID_PKMNSUBSTITUTEFADED", seed: 177 },
  { name: "dragged out (Roar)", id: "STRINGID_PKMNWASDRAGGEDOUT", seed: 95 },
  { name: "Taunt (MoveUsedIs*)", id: "STRINGID_PKMNCANTUSEMOVETAUNT", seed: 344 },
  { name: "Disable (MoveUsedIs*)", id: "STRINGID_PKMNMOVEISDISABLED", seed: 881 },
];

describe("btn1: a `\\p` message holds until a new A or B press", () => {
  for (const scene of ["off", "on"] as const) {
    for (const { name, id, seed } of CLASSES) {
      it(`${name}: stalls with no press, START is a no-op (${scene})`, () => {
        const gated = reach(seed, scene, id);
        expect(stall(gated, gated.typedRows + HOLD_ROWS)).toBe(true);
        expect(phaseOf(gated)).toBe("awaiting-message-dismiss");
        expect(stall(gated, 120, ["START"])).toBe(true);
        expect(stall(gated, 3, ["SELECT"])).toBe(true);
      });
    }
  }

  for (const { name, id, seed } of CLASSES) {
    for (const button of ["A", "B"] as const) {
      it(`${name}: ${button} releases at the first accepted row, a press while typing is not remembered`, () => {
        const early = reach(seed, "off", id);
        // btn2: a press before the last glyph is on screen is dropped; the first row that can accept is typedRows + 1 - GATE_ACCEPT_LEAD_ROWS.
        for (let row = 0; row < early.typedRows + 1 - GATE_ACCEPT_LEAD_ROWS; row += 1) early.cursor.step([button]);
        const index = indexOf(early);
        expect(stall(early, 60)).toBe(true);
        expect(indexOf(early)).toBe(index);

        const ready = reach(seed, "off", id);
        const row = releaseRow(ready, button, ready.typedRows + 1 - GATE_ACCEPT_LEAD_ROWS);
        expect(row).toBe(ready.typedRows + 1 - GATE_ACCEPT_LEAD_ROWS);

        const late = reach(seed, "off", id);
        expect(releaseRow(late, button, ready.typedRows + 300)).toBe(ready.typedRows + 300);
      });
    }
  }

  it("the segment still ends with its turn-end (a gated message is not a faint)", () => {
    for (const { id, seed } of CLASSES) {
      const { cursor } = reach(seed, "off", id);
      const resolution = cursor.state().battleResolutionPresentation as any;
      const segment = resolution.segments[resolution.segmentIndex];
      const hasFaint = segment.commands.some((command: any) => command.type === "message" && command.advance === "button" && command.promptGate !== true);
      if (!hasFaint) expect(segment.commands.at(-1).type).toBe("turn-end");
    }
  });

  it("MoveUsedIs* keeps its 64-row waitmessage after the release", () => {
    for (const { id, seed } of CLASSES.filter((c) => /TAUNT|DISABLED/.test(c.id))) {
      const { cursor } = reach(seed, "off", id);
      const resolution = cursor.state().battleResolutionPresentation as any;
      const commands = resolution.segments[resolution.segmentIndex].commands;
      const hold = commands[resolution.commandIndex + 1];
      expect(hold.type).toBe("message");
      expect(hold.advance).toBe("automatic");
      expect(hold.timing.holdFrames).toBe(64);
      expect(messageCommandTypedRows(hold)).toBe(0);
    }
  });
});

describe("btn1: mid-string gates (`\\l` scroll, `\\p` clear)", () => {
  it("Static's paralysis text types two lines, waits, scrolls and types the third, then holds 64 rows", () => {
    const { cursor } = reach(200, "off", "STRINGID_PKMNWASPARALYZEDBY");
    const resolution = cursor.state().battleResolutionPresentation as any;
    const commands = resolution.segments[resolution.segmentIndex].commands;
    const first = commands[resolution.commandIndex];
    const rest = commands[resolution.commandIndex + 1];
    expect(first.advance).toBe("button");
    expect(first.lines).toHaveLength(2);
    expect(rest.advance).toBe("automatic");
    expect(rest.leadFrames).toBe(PROMPT_SCROLL_ROWS);
    expect(rest.lines[1]).toBe("It may be unable to move!");
    expect(rest.timing.holdFrames).toBe(64);
    const g: Gated = { cursor, typedRows: messageCommandTypedRows(first) };
    expect(stall(g, g.typedRows + HOLD_ROWS)).toBe(true);
    expect(releaseRow(g, "B", g.typedRows + 1 - GATE_ACCEPT_LEAD_ROWS)).toBe(g.typedRows + 1 - GATE_ACCEPT_LEAD_ROWS);
  });

  it("Trick with both items waits on the mid-string `\\p`, then types the second page", () => {
    const { cursor } = reach(177, "off", "STRINGID_PKMNOBTAINEDXYOBTAINEDZ");
    const resolution = cursor.state().battleResolutionPresentation as any;
    const commands = resolution.segments[resolution.segmentIndex].commands;
    const first = commands[resolution.commandIndex];
    const second = commands[resolution.commandIndex + 1];
    expect(first.advance).toBe("button");
    expect(first.lines).toHaveLength(2);
    expect(second.advance).toBe("automatic");
    expect(second.lines).toHaveLength(2);
    expect(second.startChars ?? 0).toBe(0);
    const g: Gated = { cursor, typedRows: messageCommandTypedRows(first) };
    expect(stall(g, g.typedRows + HOLD_ROWS)).toBe(true);
  });

  it("the ability-prevention strings gate on their `\\l` and have no trailing prompt", () => {
    for (const id of ["STRINGID_PREVENTEDFROMWORKING", "STRINGID_PKMNPREVENTSUSAGE", "STRINGID_PKMNSXPREVENTSYSZ"]) {
      const gates = battleStringPromptGates(id);
      expect(gates.map((gate) => gate.kind)).toEqual(["scroll"]);
      const lines = ["A's Ability", "prevented B's", "X from working!"];
      const pieces = promptGatedMessageCommands({
        type: "message", eventSequence: 1, lines, advance: "automatic", noCursor: false,
        timing: { minimumFrames: 24, holdFrames: 0 },
      } as any, id);
      expect(pieces.map((piece) => piece.advance)).toEqual(["button", "automatic"]);
      expect(pieces[1]!.lines).toEqual(["prevented B's", "X from working!"]);
      expect(pieces[1]!.startChars).toBe("prevented B's".length);
    }
  });
});

describe("btn1: the gate set is read from the templates", () => {
  it("every template with a `\\p` / `\\l` / PAUSE_UNTIL_PRESS marker has gates, and no other template does", () => {
    for (const entry of (templates as any).stringTable) {
      const marked = entry.segments.some((s: any) => (s.type === "linebreak" && (s.code === "\\p" || s.code === "\\l"))
        || (s.type === "control" && s.name === "PAUSE_UNTIL_PRESS"));
      expect(battleStringPromptGates(entry.symbol).length > 0, entry.symbol).toBe(marked);
    }
  });

  it("the Factory-reachable gate classes are in the set", () => {
    const gated = (id: string) => battleStringPromptGates(id).length > 0;
    for (const id of [
      "STRINGID_SUBSTITUTEDAMAGED", "STRINGID_PKMNSUBSTITUTEFADED", "STRINGID_PKMNWASDRAGGEDOUT", "STRINGID_PKMNMOVEISDISABLED",
      "STRINGID_PKMNCANTUSEMOVETORMENT", "STRINGID_PKMNCANTUSEMOVETAUNT", "STRINGID_PKMNCANTUSEMOVESEALED", "STRINGID_PKMNOBTAINEDXYOBTAINEDZ",
      "STRINGID_PKMNWASPARALYZEDBY", "STRINGID_PREVENTEDFROMWORKING", "STRINGID_PKMNPREVENTSUSAGE", "STRINGID_PKMNSXPREVENTSYSZ",
    ]) expect(gated(id), id).toBe(true);
    for (const id of ["STRINGID_USEDMOVE", "STRINGID_SUPEREFFECTIVE", "STRINGID_SWITCHINMON"]) expect(gated(id), id).toBe(false);
  });
});
