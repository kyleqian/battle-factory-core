// spn242: the species-name family. Every Factory species draws a portrait on the summary (the front-pic key is the SPECIES_*
// constant, not the display name: FARFETCH'D, MR. MIME and NIDORAN♀/♂ had none), and every species name renders every character
// through the charmap with a drawn glyph in both fonts (charmap.txt:88's escaped apostrophe was never parsed, so "FARFETCH'D"
// printed as "FARFETCHD" on the party card and "FARFETCH D" on the summary; KING'S ROCK lost its apostrophe the same way).
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import speciesNamesData from "../src/data/gen/species-names.json" with { type: "json" };
import charmapData from "../src/data/gen/charmap.json" with { type: "json" };
import fontNormalData from "../src/data/gen/font-normal.json" with { type: "json" };
import fontSmallData from "../src/data/gen/font-small.json" with { type: "json" };
import battleHealthbox from "../src/assets/gen/battle-healthbox.json" with { type: "json" };
import { createFactoryRentalPresentation, type FactoryRentalPresentation } from "../src/engine/factoryRentalPresentation.ts";
import { renderSummaryInfoPage, renderSummarySkillsPage } from "../src/engine/summaryInfoPage.ts";
import { codeForChar, drawText, measureText, type FontData } from "../src/engine/font.ts";
import { composePlayerHealthbox } from "../src/engine/healthboxAssembly.ts";
import { renderBattlePartySelect, type BattlePartySelectState } from "../src/engine/battlePartySelect.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { BATTLE_COMMAND_ACTION_PROMPT_PREFIX } from "../src/engine/battleCommandPresentationRender.ts";
import { MESSAGE_PALETTE, MESSAGE_TEXT_COLORS } from "../src/engine/prebattleRoomRender.ts";

const NATURE_INDEX = new Map(naturesData.natures.map((row) => [row.name, row.index]));
const SPECIES_NAMES = new Map((speciesNamesData as { species: Array<{ species: string; name: string }> }).species.map((row) => [row.species, row.name]));
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const fontNormal = fontNormalData as unknown as FontData;
const fontSmall = fontSmallData as unknown as FontData;

const firstSetBySpecies = new Map<string, number>();
frontierMonsData.entries.forEach((entry, setId) => {
  if (!firstSetBySpecies.has(entry.species)) firstSetBySpecies.set(entry.species, setId);
});

function rental(setId: number): FactoryRentalPresentation {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryRentalPresentation({ setId, personality: NATURE_INDEX.get(set.nature)!, fixedIv: 3, abilitySlot: 0, otId: 0 });
}

function differingPixels(a: Uint8Array, b: Uint8Array, x0 = 0, y0 = 0, x1 = 240, y1 = 160): number {
  let count = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    const o = (y * 240 + x) * 4;
    if (a[o] !== b[o] || a[o + 1] !== b[o + 1] || a[o + 2] !== b[o + 2]) count += 1;
  }
  return count;
}

/** A glyph is drawn when its bitmap is not the font's space glyph. */
function glyphDrawn(font: FontData, code: number): boolean {
  const glyph = font.glyphs[code];
  const space = font.glyphs[0];
  if (!glyph || !space) return false;
  return glyph.some((value, index) => value !== space[index]);
}

const PUNCTUATED = [
  { species: "SPECIES_FARFETCHD", id: 83, gender: "male" as const },
  { species: "SPECIES_MR_MIME", id: 122, gender: "male" as const },
  { species: "SPECIES_NIDORAN_F", id: 29, gender: "female" as const },
  { species: "SPECIES_NIDORAN_M", id: 32, gender: "male" as const },
];
const stripped = (name: string): string => name.replace(/['.♀♂]/g, "");

describe("spn242: every Factory species name renders every character", () => {
  it("covers all 376 Factory species", () => {
    expect(firstSetBySpecies.size).toBe(376);
    for (const species of firstSetBySpecies.keys()) expect(SPECIES_NAMES.has(species)).toBe(true);
  });

  it("maps the ASCII apostrophe like the ROM (charmap.txt:88, the same glyph as the curly one)", () => {
    expect(codeForChar(charmap, "'")).toBe(0xb4);
    expect(codeForChar(charmap, "’")).toBe(0xb4);
    expect(codeForChar(charmap, ".")).toBe(0xad);
    expect(codeForChar(charmap, "♂")).toBe(0xb5);
    expect(codeForChar(charmap, "♀")).toBe(0xb6);
  });

  it("gives every character of every species name a charmap code and a drawn glyph in FONT_NORMAL and FONT_SMALL", () => {
    const missing: string[] = [];
    for (const species of firstSetBySpecies.keys()) {
      const name = SPECIES_NAMES.get(species)!;
      for (const ch of name) {
        const code = codeForChar(charmap, ch);
        if (code === undefined) {
          missing.push(`${name}: ${JSON.stringify(ch)} has no charmap code`);
          continue;
        }
        if (ch === " ") continue;
        if (!glyphDrawn(fontNormal, code)) missing.push(`${name}: ${JSON.stringify(ch)} (${code}) is blank in FONT_NORMAL`);
        if (!glyphDrawn(fontSmall, code)) missing.push(`${name}: ${JSON.stringify(ch)} (${code}) is blank in FONT_SMALL`);
      }
      // Nothing dropped: the measured width is the sum of every character's own width (plus letter spacing).
      const expectedWidth = [...name].reduce((sum, ch) => sum + (fontNormal.widths[codeForChar(charmap, ch)!] ?? fontNormal.cellSize) + fontNormal.letterSpacing, 0) - fontNormal.letterSpacing;
      if (measureText(fontNormal, charmap, name) !== expectedWidth) missing.push(`${name}: width ${measureText(fontNormal, charmap, name)} != ${expectedWidth}`);
    }
    expect(missing).toEqual([]);
  });

  it("draws the apostrophe, the period and the gender symbols on the party card, the summary, the healthbox and the action prompt", () => {
    const playerAssets = {
      frame: battleHealthbox.singlesPlayer,
      hpbar: battleHealthbox.hpbar,
      hpbarAnim: battleHealthbox.hpbarAnim,
      expbar: battleHealthbox.expbar,
      statusIcons: battleHealthbox.status,
      textPalette: battleHealthbox.singlesPlayer.palette,
    };
    for (const { species, id, gender } of PUNCTUATED) {
      const name = SPECIES_NAMES.get(species)!;
      const plain = stripped(name);
      expect(plain).not.toBe(name);

      // Party card (DisplayPartyPokemonNickname, FONT_SMALL): row 1's wide card.
      const card = (rowName: string): Uint8Array => {
        const fb = createFramebuffer();
        renderBattlePartySelect(fb, cardState(id, species, rowName, gender));
        return fb;
      };
      expect(differingPixels(card(name), card(plain), 96, 8, 240, 32)).toBeGreaterThan(0);

      // Summary nickname / species lines (FONT_NORMAL) and the Skills page's item name.
      const presentation = rental(firstSetBySpecies.get(species)!);
      expect(presentation.name).toBe(name);
      const info = renderSummaryInfoPage([presentation], 0);
      const infoPlain = renderSummaryInfoPage([{ ...presentation, name: plain }], 0);
      expect(differingPixels(info, infoPlain, 0, 96, 88, 128)).toBeGreaterThan(0);

      // Battle healthbox (UpdateNickInHealthbox, FONT_SMALL window printer).
      const box = (boxName: string) => composePlayerHealthbox(playerAssets, {
        name: boxName, level: 50, gender, hpFraction: 1, status: "none", currentHp: 100, maxHp: 100,
      });
      const a = box(name).pixels;
      const b = box(plain).pixels;
      expect(a.some((pixel, index) => JSON.stringify(pixel) !== JSON.stringify(b[index]))).toBe(true);

      // Battle text ("What will FARFETCH'D do?", FONT_NORMAL through the message charmap).
      const prompt = (text: string): Uint8Array => {
        const fb = createFramebuffer();
        drawText(fb, fontNormal, charmap, `${BATTLE_COMMAND_ACTION_PROMPT_PREFIX}${text}`, 8, 120, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
        return fb;
      };
      expect(differingPixels(prompt(name), prompt(plain))).toBeGreaterThan(0);
      expect(measureText(fontNormal, charmap, name)).toBeGreaterThan(measureText(fontNormal, charmap, plain));
    }
  });

  it("prints KING'S ROCK with its apostrophe on the Skills page", () => {
    const kingsRockSet = frontierMonsData.entries.findIndex((entry) => entry.itemTableId === 1);
    expect(kingsRockSet).toBeGreaterThanOrEqual(0);
    const presentation = rental(kingsRockSet);
    expect(presentation.item.name).toBe("KING'S ROCK");
    const skills = renderSummarySkillsPage([presentation], 0);
    const plain = renderSummarySkillsPage([{ ...presentation, item: { ...presentation.item, name: "KINGS ROCK" } }], 0);
    expect(differingPixels(skills, plain, 80, 32, 160, 48)).toBeGreaterThan(0);
  });
});

describe("spn242: every Factory species draws its portrait on the summary", () => {
  it("keys the front pic by the species constant and draws it for all 376 species", () => {
    const blank: string[] = [];
    for (const [species, setId] of firstSetBySpecies) {
      const presentation = rental(setId);
      expect(presentation.frontPicSpecies).toBe(species.replace(/^SPECIES_/, ""));
      const drawn = renderSummaryInfoPage([presentation], 0);
      const without = renderSummaryInfoPage([{ ...presentation, frontPicSpecies: "NO_SUCH_SPECIES" }], 0);
      // CreateMonSprite(..., 40, 64, ...): the 64x64 portrait is centred at (40,64).
      if (differingPixels(drawn, without, 8, 32, 72, 96) < 100) blank.push(species);
    }
    expect(blank).toEqual([]);
  }, 120_000);
});

function cardState(speciesId: number, speciesKey: string, name: string, gender: "male" | "female"): BattlePartySelectState {
  const filler = (partyIndex: 0 | 2, slot: 0 | 2) => Object.freeze({
    partyIndex, slot, species: 19, speciesKey: "SPECIES_RATTATA", name: "RATTATA", level: 50, hp: 105, maxHP: 105,
    fainted: false, active: partyIndex === 0, legal: partyIndex !== 0, gender: "female" as const, item: 0, status: null,
  });
  return Object.freeze({
    requestId: 1,
    rows: Object.freeze([
      filler(0, 0),
      Object.freeze({
        partyIndex: 1 as const, slot: 1 as const, species: speciesId, speciesKey, name, level: 50, hp: 90, maxHP: 90,
        fainted: false, active: false, legal: true, gender, item: 0, status: null,
      }),
      filler(2, 2),
    ]) as BattlePartySelectState["rows"],
    cursor: 0,
    rightColumnCursor: 1,
    submenuOpen: false,
    submenuOpened: false,
    submenuOpenElapsed: 0,
    actions: "shift",
    actionCursor: 0,
    summaryMons: null,
    summary: null,
    message: null,
    outcome: null,
    elapsed: 0,
    openElapsed: 0,
    selectedSinceElapsed: 30,
    closeElapsed: null,
  });
}
