/**
 * The Battle Factory's level mode (`gSaveBlock2Ptr->frontier.lvlMode`, include/global.h:385; FRONTIER_LVL_50 = 0, FRONTIER_LVL_OPEN = 1,
 * include/constants/battle_frontier.h). The Lobby's level multichoice sets it before `factory_init` (BattleFactoryLobby scripts.inc:131-150).
 *
 * What the mode changes in the ROM (opl, docs/opl2-open-level-engine.md):
 * - the level every Factory Pokemon is built at: rentals and the battle party at `FRONTIER_MAX_LEVEL_50` (50) or
 *   `FRONTIER_MAX_LEVEL_OPEN` = `MAX_LEVEL` (100) (battle_factory_screen.c:1749-1752, battle_factory.c:422-425); opponents and Noland at
 *   `GetFrontierEnemyMonLevel` (battle_tower.c:3247-3265), which for Open Level is the highest level in the player's party with a floor of
 *   60, and the party is the level-100 rentals by then (battle_factory_screen.c:1820, battle_tower.c:2092-2096): 100 too;
 * - the set-id pools: `GetFactoryMonId` skips the eight Level 50 rows for Open Level (battle_factory.c:169-190, :834-837);
 * - the high-tier guard (sets above `FRONTIER_MONS_HIGH_TIER` = 849): Level 50 only (battle_factory.c:350, :783);
 * - the per-level streak and rent count slots (`factoryWinStreaks[battleMode][lvlMode]`, `factoryRentsCount[...]`) and win-streak-active
 *   flags (battle_factory.c:145-155, :198-264);
 * - the PreBattleRoom walk to the battle room (BattleFactoryPreBattleRoom scripts.inc:46-48).
 *
 * The engine's default is Level 50 everywhere: an absent mode is Level 50, and Level 50 records and carries keep their old shape (no
 * `level` / `lvlMode` field), so every Level 50 digest stays as it was.
 */

export type FactoryLvlMode = "50" | "open";

/** `FRONTIER_MAX_LEVEL_50`. */
export const FACTORY_LEVEL_50 = 50;
/** `FRONTIER_MAX_LEVEL_OPEN` = `MAX_LEVEL`. */
export const FACTORY_LEVEL_OPEN = 100;

export function isFactoryOpenLevel(mode: FactoryLvlMode | undefined): boolean {
  return mode === "open";
}

/** The level a Factory Pokemon of this mode is built at (see the module comment for why opponents are 100 at Open Level too). */
export function factoryMonLevel(mode: FactoryLvlMode | undefined): number {
  return mode === "open" ? FACTORY_LEVEL_OPEN : FACTORY_LEVEL_50;
}

/** The source `lvlMode` number (FRONTIER_LVL_50 = 0, FRONTIER_LVL_OPEN = 1). */
export function factoryLvlModeNumber(mode: FactoryLvlMode | undefined): 0 | 1 {
  return mode === "open" ? 1 : 0;
}

export function requireFactoryLvlMode(value: unknown, field: string): FactoryLvlMode {
  if (value === undefined || value === "50") return "50";
  if (value === "open") return "open";
  throw new Error(`${field} must be "50" or "open", got ${String(value)}`);
}

/**
 * The `level` field a generated Factory record carries: absent at Level 50 (the records' old shape), 100 at Open Level. Spread into the
 * record: `{ ...factoryRecordLevelField(mode) }`.
 */
export function factoryRecordLevelField(mode: FactoryLvlMode | undefined): Readonly<{ level?: number }> {
  return mode === "open" ? { level: FACTORY_LEVEL_OPEN } : {};
}
