// Scratch: render the app's mid-battle party menu for the ISSUES #78 switch
// scenario's settled state (3x ONIX, cursor on slot index 1, submenu closed,
// "Choose a POKéMON.") and write a PNG for ISSUES #80 region inventory.
// Run: node --experimental-strip-types tools/scratch-render-party-menu.ts <out.png>
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderBattlePartySelect, type BattlePartySelectState } from "../src/engine/battlePartySelect.ts";
import { createFramebuffer, SCREEN_WIDTH, SCREEN_HEIGHT } from "../src/engine/framebuffer.ts";

const state: BattlePartySelectState = Object.freeze({
  requestId: 1,
  rows: Object.freeze([
    Object.freeze({
      partyIndex: 0, species: 95, speciesKey: "SPECIES_ONIX", name: "ONIX",
      level: 50, hp: 110, maxHP: 110, fainted: false, active: true, legal: false,
    }),
    Object.freeze({
      partyIndex: 1, species: 95, speciesKey: "SPECIES_ONIX", name: "ONIX",
      level: 50, hp: 110, maxHP: 110, fainted: false, active: false, legal: true,
    }),
    Object.freeze({
      partyIndex: 2, species: 95, speciesKey: "SPECIES_ONIX", name: "ONIX",
      level: 50, hp: 110, maxHP: 110, fainted: false, active: false, legal: true,
    }),
  ]),
  cursor: 1,
  rightColumnCursor: 1,
  submenuOpen: false,
  message: "Choose a POKéMON.",
  outcome: null,
  elapsed: 0,
});

const fb = createFramebuffer();
renderBattlePartySelect(fb, state);
const png = new PNG({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
for (let i = 0; i < fb.length; i += 1) png.data[i] = fb[i];
writeFileSync(process.argv[2], PNG.sync.write(png));
console.log(`wrote ${process.argv[2]}`);
