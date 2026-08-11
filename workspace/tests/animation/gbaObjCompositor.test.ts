import { describe, expect, it } from "vitest";
import {
  compositeGbaObjScanlines,
  type GbaObjRaster,
} from "../../src/animation/gbaObjCompositor.ts";

function obj(
  overrides: Partial<GbaObjRaster<string>> & Pick<GbaObjRaster<string>, "oamIndex" | "mode">,
): GbaObjRaster<string> {
  return {
    priority: 2,
    declaredWidth: 1,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    pixels: ["ink"],
    ...overrides,
  };
}

describe("GBA OBJ/OBJ-window scanline compositor", () => {
  it("arbitrates normal and OBJ-window texels by priority then OAM index", () => {
    const higherPriorityNormal = compositeGbaObjScanlines(1, 1, [
      obj({ oamIndex: 9, mode: "normal", priority: 0 }),
      obj({ oamIndex: 2, mode: "objWindow", priority: 2 }),
    ]);
    expect(higherPriorityNormal.normalPixels).toEqual(["ink"]);
    expect([...higherPriorityNormal.objWindowMask]).toEqual([0]);

    const earlierWindow = compositeGbaObjScanlines(1, 1, [
      obj({ oamIndex: 10, mode: "normal" }),
      obj({ oamIndex: 9, mode: "objWindow" }),
    ]);
    expect(earlierWindow.normalPixels).toEqual(["ink"]);
    expect([...earlierWindow.objWindowMask]).toEqual([1]);

    const earlierNormal = compositeGbaObjScanlines(1, 1, [
      obj({ oamIndex: 9, mode: "normal" }),
      obj({ oamIndex: 10, mode: "objWindow" }),
    ]);
    expect([...earlierNormal.objWindowMask]).toEqual([0]);
  });

  it("lets transparent front objects reveal independently ranked pixels", () => {
    const result = compositeGbaObjScanlines(2, 1, [
      obj({
        oamIndex: 1,
        mode: "normal",
        priority: 0,
        width: 2,
        declaredWidth: 2,
        pixels: [null, "front"],
      }),
      obj({
        oamIndex: 2,
        mode: "objWindow",
        width: 2,
        declaredWidth: 2,
        pixels: ["mask", "mask"],
      }),
      obj({
        oamIndex: 3,
        mode: "normal",
        width: 2,
        declaredWidth: 2,
        pixels: ["back", "back"],
      }),
    ]);
    expect(result.normalPixels).toEqual(["back", "front"]);
    expect([...result.objWindowMask]).toEqual([1, 0]);
  });

  it("charges each intersecting OBJ once and keeps the budget-exhausting OBJ", () => {
    const result = compositeGbaObjScanlines(1, 2, [
      obj({
        oamIndex: 1,
        mode: "normal",
        declaredWidth: 2,
        height: 2,
        pixels: ["first", "first"],
      }),
      obj({
        oamIndex: 2,
        mode: "objWindow",
        declaredWidth: 1,
        height: 1,
        pixels: ["mask"],
      }),
      obj({
        oamIndex: 3,
        mode: "normal",
        declaredWidth: 1,
        height: 2,
        pixels: ["late", "late"],
      }),
    ], 3);
    expect(result.evaluatedOamByScanline).toEqual([[1, 2], [1, 3]]);
    expect([...result.objWindowMask]).toEqual([0, 0]);
  });

  it("uses the source affine-double fetch cost", () => {
    const result = compositeGbaObjScanlines(1, 1, [
      obj({
        oamIndex: 1,
        mode: "objWindow",
        declaredWidth: 8,
        affine: true,
        doubleSize: true,
      }),
      obj({ oamIndex: 2, mode: "normal" }),
    ], 42);
    // 10 + (8 * 2) * 2 = 42: the transformed OBJ is evaluated in full,
    // exhausts the line, and the later normal OBJ is omitted.
    expect(result.evaluatedOamByScanline).toEqual([[1]]);
    expect([...result.objWindowMask]).toEqual([1]);
  });
});
