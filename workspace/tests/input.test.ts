import { describe, expect, it } from "vitest";
import { GBA_BUTTONS, buttonForKey, normalizeButtons } from "../src/input.ts";

describe("input mapping", () => {
  it("exposes the full GBA button set in oracle order", () => {
    expect(GBA_BUTTONS).toEqual([
      "A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L",
    ]);
  });

  it("maps arrows, WASD, and shoulder keys", () => {
    expect(buttonForKey("ArrowUp")).toBe("UP");
    expect(buttonForKey("W")).toBe("UP");
    expect(buttonForKey("z")).toBe("A");
    expect(buttonForKey("q")).toBe("L");
    expect(buttonForKey("e")).toBe("R");
    expect(buttonForKey("F1")).toBeUndefined();
  });

  it("normalizes and dedupes trace buttons, rejecting unknown names", () => {
    expect(normalizeButtons(["A", "A", "UP"])).toEqual(["A", "UP"]);
    expect(() => normalizeButtons(["X"])).toThrow(/unknown GBA button/);
  });
});
