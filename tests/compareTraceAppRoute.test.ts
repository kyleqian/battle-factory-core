// Ratchet: every committed compare trace must declare its app routing.
//
// A trace without "appRoute" silently replays the app on the default
// generated-orchestrator route; for canonical-recorded traces that reads as
// a wholesale renderer mismatch (0/N) or a crash on an unported resolver —
// misdiagnosed as a renderer bug four separate times on 2026-07-31 alone
// (PAPERCUTS.md). New traces must set the field explicitly; the legacy
// allowlist below pins the pre-appRoute status quo and only shrinks.
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSourceTracePath } from "../tools/compare/paths.ts";

const TRACE_DIR = "tools/compare/traces";
const VALID_APP_ROUTES = new Set(["generated-orchestrator", "canonical-recorded"]);

// Committed before appRoute existed; each replays correctly on the default
// route (pre-battle windows, staged mechanicLab fixtures, or canonical
// windows the generated orchestrator reproduces). Remove entries as traces
// gain the field or are retired — never add to this list.
const LEGACY_TRACES_WITHOUT_APP_ROUTE = new Set([
  "anchor.json",
  "battle1-postwin-decline.json",
  "battle1-postwin-heal.json",
  "battle1-postwin-next-prompt.json",
  "battle1-postwin-scout-a.json",
  "battle1-postwin-scout-b.json",
  "battle1-swap-enemy-accept-b-return.json",
  "battle1-swap-enemy-accept-exit.json",
  "battle1-swap-enemy-accept-no-return.json",
  "battle1-swap-enemy-accept-prompt.json",
  "battle1-swap-enemy-cancel-quit-yes.json",
  "battle1-swap-enemy-picker.json",
  "battle1-swap-enemy-pkmn-return.json",
  "battle1-swap-enemy-quit-b-no-return.json",
  "battle1-swap-enemy-quit-b-return.json",
  "battle1-swap-enemy-quit-b-yes.json",
  "battle1-swap-player-cancel-quit-yes.json",
  "battle1-swap-player-options-b-close.json",
  "battle1-swap-player-options-popup.json",
  "battle1-swap-player-options.json",
  "battle1-swap-player-picker.json",
  "battle1-swap-player-quit-b-return.json",
  "battle1-swap-player-quit-no-return.json",
  "battle1-swap-player-quit-yes.json",
  "battle1-swap-player-summary-return.json",
  "confirm-decline.json",
  "confirm-flow.json",
  "draft-cursor.json",
  "draft-menu-slot6.json",
  "draft-menu.json",
  "example.json",
  "fight-submenu-reopen.json",
  "fight-submenu.json",
  "oracle-off-anchor.json",
  "rent-3picks.json",
  "rent-slot1.json",
  "summary-battle-move-select.json",
  "summary-battle-moves-mon-down-up.json",
  "summary-battle-to-contest-moves.json",
  "summary-contest-move-select.json",
  "summary-contest-moves-mon-down-up.json",
  "summary-info-magby-front-animation.json",
  "summary-info-magby.json",
  "summary-info-mon-down-up.json",
  "summary-info-mon-down.json",
  "summary-info-onix.json",
  "summary-info-to-skills.json",
  "summary-page-transition-install.json",
  "summary-skills-to-battle-moves.json",
  "summary-skills-to-info.json",
  "turn15-sendout-rung2-delayed.json",
  "turn15-sendout-rung2.json",
  "turn15-sendout-rung3-delayed.json",
  "turn15-sendout-rung3.json",
  "turn15-sendout-rung4a-delayed.json",
  "turn15-sendout-rung4a.json",
  "turn15-sendout-rung5-delayed.json",
  "turn15-sendout-rung5.json",
  "turn16-rung1-delayed.json",
  "turn16-rung1.json",
  "turn16-rung2a.json",
  "turn16-rung2b.json",
  "turn16-rung3.json",
  "turn16-rung4.json",
  "turn2-dragonbreath-projectiles.json",
]);

interface TraceFile {
  readonly appRoute?: unknown;
  readonly sourceTrace?: string;
}

function readTrace(path: string): TraceFile {
  return JSON.parse(readFileSync(path, "utf8")) as TraceFile;
}

/** A derived trace inherits its source's appRoute through the spread merge. */
function effectiveAppRoute(path: string, trace: TraceFile): unknown {
  if (trace.appRoute !== undefined) return trace.appRoute;
  if (trace.sourceTrace === undefined) return undefined;
  return readTrace(resolveSourceTracePath(trace.sourceTrace, path)).appRoute;
}

describe("compare trace appRoute ratchet", () => {
  const traceNames = readdirSync(TRACE_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort();

  it("declares a valid appRoute wherever the field is present", () => {
    for (const name of traceNames) {
      const trace = readTrace(join(TRACE_DIR, name));
      if (trace.appRoute !== undefined) {
        expect(
          VALID_APP_ROUTES.has(trace.appRoute as string),
          `${name}: invalid appRoute ${JSON.stringify(trace.appRoute)}`,
        ).toBe(true);
      }
    }
  });

  it("pins the exact legacy set lacking an effective appRoute (shrink only)", () => {
    const missing = traceNames.filter((name) => {
      const path = join(TRACE_DIR, name);
      return effectiveAppRoute(path, readTrace(path)) === undefined;
    });
    const unexpected = missing.filter(
      (name) => !LEGACY_TRACES_WITHOUT_APP_ROUTE.has(name),
    );
    const retired = [...LEGACY_TRACES_WITHOUT_APP_ROUTE].filter(
      (name) => !missing.includes(basename(name)),
    );
    expect(
      unexpected,
      "new compare traces must declare appRoute explicitly "
      + '("canonical-recorded" or "generated-orchestrator") — a missing field '
      + "silently replays the default route and reads as a renderer bug",
    ).toEqual([]);
    expect(
      retired,
      "these allowlist entries no longer lack appRoute (or were deleted) — "
      + "remove them from LEGACY_TRACES_WITHOUT_APP_ROUTE so the ratchet only shrinks",
    ).toEqual([]);
  });
});
