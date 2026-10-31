// cff232: the three Castform classes of cff230, measured against the Scene OFF ROM. `romCommandStart` = the Scene OFF lab frame on which the
// morph command's first row is shown (its picture equals Scene ON's row 0: the 111-frame Castform-box hash run aligns 111/111 with the ON lab). `leadRows` = rows from the anchor command's first row (the weather print's first glyph) to that frame: 83 for the print
// alone, 86 where our command carries the battler-1 weather-loop rows (CASTFORM_CHANGE_WEATHER_LOOP_FRAMES) as extra lead.
export type Cff232Class = {
  name: string; seed: number; lab: string; anchorCommand: number; leadRows: number; tailRows: number;
  romCommandStart: number; box: [number, number, number, number]; note: string;
};
export const CFF232_CLASSES: readonly Cff232Class[] = [
  { name: "player-ice-after-hail", seed: 950, lab: "hail", anchorCommand: 10, leadRows: 83, tailRows: 85, romCommandStart: 341, box: [0, 40, 110, 70],
    note: "battle-scene-off mechanicLab: opponent SLAKOTH uses Hail, the player's CASTFORM turns ICE (back sprite)" },
  { name: "opponent-water-after-rain-dance", seed: 651, lab: "rain-opp", anchorCommand: 7, leadRows: 86, tailRows: 85, romCommandStart: 190, box: [130, 0, 110, 76],
    note: "battle-scene-off mechanicLab: the player's MANTINE uses Rain Dance, the foe CASTFORM turns WATER (front sprite, shadow)" },
  { name: "player-water-send-in", seed: 603, lab: "send-in", anchorCommand: 4, leadRows: 0, tailRows: 85, romCommandStart: 1471, box: [0, 40, 110, 70],
    note: "battle-scene-off mechanicLab: CASTFORM sent in during rain (from the first row of the morph command)" },
];
