// sa125 (docs/sa125-status-animation-command.md): the Scene ON status-animation command's rows and the SA3 status rule, test side.
// The test-side copy of production's STATUS_ANIMATION_ADDED_ROWS (sta123 rom-r1.json controllerRows), so a pin never reads the code it
// checks. A moved pin moves by exactly sa125RouteDelta(...) of the commands its route crosses.

export const SA125_STATUS_ANIMATION_ROWS: Readonly<Record<string, number>> = Object.freeze({
  PSN: 71, CONFUSION: 100, BRN: 39, INFATUATION: 97, SLP: 97, PRZ: 39, FRZ: 117, CURSED: 75, NIGHTMARE: 75,
});
/** The base (pre-sa125) Scene ON `status` command length. */
export const SA125_BASE_STATUS_FRAMES = 32;

type Command = Readonly<{ type: string; animation?: string; timing?: Readonly<{ minimumFrames: number }> }>;

/** Frames sa125 adds to a Scene ON route: every status-animation command's rows, less each SA3 status command's 32 - frames. */
export function sa125RouteDelta(commands: readonly Command[]): { animations: number; animationFrames: number; sa3Statuses: number; sa3Frames: number; total: number } {
  let animations = 0, animationFrames = 0, sa3Statuses = 0, sa3Frames = 0;
  for (const command of commands) {
    if (command.type === "status-animation") {
      animations += 1;
      animationFrames += SA125_STATUS_ANIMATION_ROWS[command.animation!]!;
    } else if (command.type === "status" && command.timing!.minimumFrames !== SA125_BASE_STATUS_FRAMES) {
      sa3Statuses += 1;
      sa3Frames += SA125_BASE_STATUS_FRAMES - command.timing!.minimumFrames;
    }
  }
  return { animations, animationFrames, sa3Statuses, sa3Frames, total: animationFrames - sa3Frames };
}
