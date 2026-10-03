import data from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import {
  allocSpritePalette, createSpritePaletteHost, freeAllSpritePalettes, freeSpritePaletteByTag,
  indexOfSpritePaletteTag, loadPalette, loadSpritePalette, writeFadedPalette, type SpritePaletteHost,
} from "../animation/spritePaletteHost.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";

export interface LiveMovePaletteInput {
  readonly historyKnown: boolean;
  readonly traceScratchUnfadedPalette?: readonly Readonly<{ r: number; g: number; b: number }>[];
}
export interface LiveMovePaletteHost {
  readonly memory: SpritePaletteHost;
  readonly historyKnown: boolean;
}
interface PaletteResource { readonly tag: number; readonly colors: readonly number[]; }
interface PalettePlan { readonly loads: readonly string[]; readonly taskLoads?: readonly string[]; readonly rainbowNotes?: boolean; }
interface PartyPaletteLifecycle {
  readonly menuLoads: readonly PaletteResource[];
  readonly returnReservedCount: number;
  readonly returnLoads: readonly PaletteResource[];
}
const resources: Readonly<Record<string, PaletteResource>> = data.resources;
const plans: Readonly<Record<string, PalettePlan>> = data.plans;
const ordinaryPartyCancel: PartyPaletteLifecycle = data.ordinaryPartyCancel;

/**
 * Source Factory startup retains wireless UI / healthbox tags in banks 4..6.
 * The first party-summary balls used bank 9, then freed the tag. Its HP-bar
 * colors remain there. Verified from normal draft/controller input as well
 * as the isolated mechanic route. Unmodeled rows remain private: this host
 * currently supplies only Shadow Punch's allocated scratch row.
 */
export function createLiveMovePaletteHost(): LiveMovePaletteHost {
  let memory = createSpritePaletteHost(4);
  memory = loadSpritePalette(memory, data.initial.wirelessTag, data.initial.wireless).host;
  memory = loadSpritePalette(memory, data.initial.healthboxTag, data.initial.healthbox).host;
  memory = loadSpritePalette(memory, data.initial.healthbarTag, data.initial.healthbar).host;
  memory = loadPalette(memory, 256 + 9 * 16, data.initial.healthbar);
  return Object.freeze({ memory, historyKnown: true });
}

export function invalidateLiveMovePaletteHost(host: LiveMovePaletteHost): LiveMovePaletteHost {
  return host.historyKnown ? Object.freeze({ ...host, historyKnown: false }) : host;
}

/**
 * Replays only the OBJ-palette ownership of ordinary singles party entry and
 * B-cancel return. ShowPartyMenu frees every tag, then loads held-item,
 * Pokeball, ailment, and all six icon-table rows. ReshowBattleScreenAfterMenu
 * frees them again, reserves private battler rows 0..3, and loads healthbox
 * and bar rows 4..5. Local Factory is not a wireless/link battle, so its
 * conditional wireless allocation is absent. Private battler reloads do not
 * touch the retained allocatable rows used by audited move plans.
 *
 * An unknown entry remains unknown: this bounded provider proves a transition
 * from an owned entry host, not recovery of arbitrary preceding graphics.
 */
export function returnLiveMovePaletteHostAfterOrdinaryPartyCancel(
  entry: LiveMovePaletteHost,
): LiveMovePaletteHost {
  if (!entry.historyKnown) return invalidateLiveMovePaletteHost(entry);
  let memory = freeAllSpritePalettes(entry.memory);
  for (const resource of ordinaryPartyCancel.menuLoads) {
    const loaded = loadSpritePalette(memory, resource.tag, resource.colors);
    if (loaded.index === 0xff) throw new Error("party menu exhausted OBJ palette banks");
    memory = loaded.host;
  }
  memory = freeAllSpritePalettes(memory);
  memory = createSpritePaletteHost(
    ordinaryPartyCancel.returnReservedCount,
    memory.tags,
    memory.unfaded,
    memory.faded,
  );
  for (const resource of ordinaryPartyCancel.returnLoads) {
    const loaded = loadSpritePalette(memory, resource.tag, resource.colors);
    if (loaded.index === 0xff) throw new Error("battle return exhausted OBJ palette banks");
    memory = loaded.host;
  }
  return Object.freeze({ memory, historyKnown: true });
}

/**
 * Apply one audited source body's resource lifetime. The returned input is
 * immutable for the active body; only the separate next host is retained for
 * later commands. Rendering cannot mutate memory or advance battle RNG.
 * Unknown bodies/switches invalidate the history claim, never synthesize
 * source values. Their graphics providers remain explicit follow-up work.
 */
export function prepareLiveMovePalette(
  host: LiveMovePaletteHost, request: BattleMoveAnimationRequest,
): Readonly<{ next: LiveMovePaletteHost; input: LiveMovePaletteInput }> {
  const plan = plans[String(request.moveId)];
  if (!plan) return Object.freeze({
    next: invalidateLiveMovePaletteHost(host), input: Object.freeze({ historyKnown: false }),
  });
  let memory = host.memory;
  const loaded: number[] = [];
  for (const name of [...plan.loads, ...(plan.taskLoads ?? [])]) {
    const resource = resources[name];
    if (!resource) throw new Error(`missing source palette resource ${name}`);
    const result = loadSpritePalette(memory, resource.tag, resource.colors);
    if (result.index === 0xff) throw new Error("live animation exhausted OBJ palette banks");
    memory = result.host;
    loaded.push(resource.tag);
  }
  if (plan.rainbowNotes) {
    // AnimTask_MusicNotesRainbowBlend finds the loaded first tag, then
    // AllocSpritePalette reserves the three remaining rows without loading.
    // Every task write targets only faded color indexes 1..5.
    for (const [rowIndex, row] of data.rainbowNotes.entries()) {
      const allocated = rowIndex === 0
        ? { host: memory, index: indexOfSpritePaletteTag(memory, row.tag) }
        : allocSpritePalette(memory, row.tag);
      memory = allocated.host;
      if (allocated.index !== 0xff) {
        memory = writeFadedPalette(memory, 256 + allocated.index * 16 + 1, row.colors);
        if (rowIndex !== 0) loaded.push(row.tag);
      }
    }
  }
  let input: LiveMovePaletteInput = Object.freeze({ historyKnown: host.historyKnown });
  if (request.moveId === 325) {
    const trace = allocSpritePalette(memory, data.bentSpoonTag);
    if (trace.index === 0xff) throw new Error("Shadow Punch exhausted OBJ palette banks");
    // Its faded-only attacker copy is overwritten by BlendPalette's read
    // from this same destination unfaded row (battle_anim_mons.c).
    if (host.historyKnown) {
      const expand = (v: number) => (v << 3) | (v >> 2);
      const row = trace.host.unfaded.slice(256 + trace.index * 16, 256 + (trace.index + 1) * 16);
      input = Object.freeze({
        historyKnown: true,
        traceScratchUnfadedPalette: Object.freeze(row.map(color => Object.freeze({
          r: expand(color & 31), g: expand((color >> 5) & 31), b: expand((color >> 10) & 31),
        }))),
      });
    }
    memory = freeSpritePaletteByTag(trace.host, data.bentSpoonTag);
  }
  for (const tag of loaded) memory = freeSpritePaletteByTag(memory, tag);
  return Object.freeze({
    next: Object.freeze({ memory, historyKnown: host.historyKnown }), input,
  });
}
