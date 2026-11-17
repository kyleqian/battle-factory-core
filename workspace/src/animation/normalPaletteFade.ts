/** palette.c UpdateNormalPaletteFade: BlendPalette y of a normal palette fade (deltaY 2) `frame` frames after its creation frame; `plane` selects the BG or OBJ pass (the OBJ pass runs one frame after the BG pass). One step is delay + 2 frames. */
export function normalPaletteFadeY(
  frame: number, delay: number, startY: number, targetY: number, plane: "bg" | "obj",
): number {
  if (frame < (plane === "bg" ? 0 : 1)) return startY;
  const period = delay + 2;
  const passes = Math.floor((frame - (plane === "bg" ? 0 : 1)) / period);
  const distance = Math.abs(targetY - startY);
  const moved = Math.min(passes * 2, distance);
  return targetY > startY ? startY + moved : startY - moved;
}
