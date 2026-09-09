//! Shared hit-chain base-damage helper, the pure prerequisite the stockpile
//! family (0x86) and future damagecalc-chain leaves reuse.
//!
//! Native twin of exported `calculateBattleScriptBaseDamageForCurrentMove`
//! (`src/engine/battleScriptHitChainOpcode.ts:1507-1580`). This is
//! deliberately NOT a Battle Script opcode leaf: no registration, no
//! program/labels, no scheduler, no events, no RNG -- a pure function of a
//! rules slice returning a damage integer or a canonical error, shared by
//! `Cmd_damagecalc` (`battle_script_commands.c:1288-1301`) and
//! `Cmd_stockpiletobasedamage` (`:6868-6892`).
//!
//! ## Kernel input field-mapping decision (the opposite of
//! `battle_script_trysetfutureattack.rs`)
//! `battle_script_trysetfutureattack.rs` pre-applies every hold-item/ability
//! modifier by hand and always zeroes `hold_effect`/`species` before calling
//! the kernel, because its own `calculateFutureAttackBaseDamage` does the
//! same. This helper is the opposite: it forwards raw attacker/defender
//! stats plus a FILTERED ability id and a RESOLVED hold-effect id/param and
//! the REAL species straight into `crate::damage_calc::calculate_base_damage`,
//! which applies every modifier itself
//! (`pokemon.c:3106-3371`). Concretely:
//! - `ability` crosses as its raw id only when that id is one of the four
//!   keys `ABILITY_NAME_BY_ID` carries (`:155-160`) --
//!   `{8 SAND_VEIL, 14 COMPOUND_EYES, 55 HUSTLE, 62 GUTS}` -- else
//!   `ABILITY_NONE` (0). A Huge Power (37) or Pure Power (74) attacker
//!   therefore gets NO doubling through this helper; Marvel Scale (63) is
//!   inert on the defender; Plus (57) / Minus (58) never fire via
//!   `activeBattlerAbilities`.
//! - `hold_effect` crosses as its resolved id only when that id is one of
//!   the 26 keys `HOLD_EFFECT_NAME_BY_ID` carries (`:177-204`), else
//!   `HOLD_EFFECT_NONE` (0). Ids 41 (Scope Lens), 63 (Lucky Punch), and 66
//!   (Stick) resolve fine through the item catalog but are NOT in that map,
//!   so they cross as `HOLD_EFFECT_NONE` and are provably inert here.
//! - `species` crosses raw (unfiltered) on both sides.
//! - `hold_effect_param` crosses as the resolver's value unconditionally --
//!   independent of the hold-effect filter above, mirroring the TS exactly
//!   (`attacker.holdEffectParam` is always
//!   `resolveBattleScriptBattlerHoldEffectParam(...)`, never gated on
//!   whether `holdEffect` resolved to a mapped name). Only the attacker's
//!   param crosses; the defender object literal never sets one, so it is
//!   always 0.
//!
//! ## Other exact mirrors
//! - `resolveBattleScriptMoveType` (`battleScriptRulesContext.ts:1288-1300`,
//!   `GET_MOVE_TYPE` `include/battle.h:458-464`): a nonzero
//!   `dynamicMoveType` wins, masked with `BATTLE_SCRIPT_DYNAMIC_TYPE_MASK`
//!   `0x3f` (`F_DYNAMIC_TYPE_SET` `0x80` therefore masks down to "dynamic
//!   Normal", type id 0); zero falls back to the already-validated move
//!   row's type. `resolve_move_type` below folds in
//!   `resolveMoveTypeName`'s (`:139-144`) 18-name range check.
//! - `weatherHasEffectForBaseDamage` (`:2819-2832`,
//!   `WEATHER_HAS_EFFECT2` `include/battle_util.h:48`,
//!   `battle_util.c:3111-3138` `ABILITYEFFECT_FIELD_SPORT` default scan):
//!   battlers `[0..battlersCount)`, Cloud Nine (13) or Air Lock (77), with
//!   **no `hp != 0` gate** -- a fainted Cloud Nine still suppresses
//!   weather, unlike the hp-gated `WEATHER_HAS_EFFECT` (`:2802-2817`).
//! - Sport halvers (`:1519-1534`): `movePower` starts as
//!   `dynamicBasePower !== 0 ? dynamicBasePower : moveRow.power`; if the
//!   resolved type is `TYPE_ELECTRIC` (13) and ANY battler in
//!   `[0..battlersCount)` carries `status3` bit `1<<16`
//!   (`STATUS3_MUDSPORT`, `constants/battle.h:173`) -> `trunc(movePower/2)`;
//!   independently if the type is `TYPE_FIRE` (10) and any battler carries
//!   bit `1<<17` (`STATUS3_WATERSPORT`, `:174`) -> `trunc(movePower/2)`.
//!   Neither scan is hp-gated; each halver applies at most once.
//! - No `sideStatuses` (reflect/light screen), no spread-move flag: the
//!   canonical object literal never sets `sideStatusReflect`/
//!   `sideStatusLightScreen`/`isDoubleBattleSpreadMove`, so all three cross
//!   to the kernel as `false` unconditionally -- Cmd_damagecalc's own
//!   crit x2 and Cmd_typecalc's STAB/type scaling live outside this shared
//!   helper.
//! - Kernel call (`:1546-1578`): attacker crosses with `hp`/`maxHP` set,
//!   defender WITHOUT (the kernel's pinch-boost gate only ever reads the
//!   attacker's); `isCriticalHit = critMultiplier === 2`; `moveEffect` for
//!   the explosion check is `MOVES[move].effect == 7` (`EFFECT_EXPLOSION`,
//!   `constants/battle_move_effects.h:11`); `weather` is the raw `u32`
//!   bitfield; `currentMove` forwarded (Solar Beam exception,
//!   `MOVE_SOLAR_BEAM` 76); `isFrontierBattle =
//!   (battleTypeFlags & BATTLE_TYPE_FRONTIER) !== 0`; `flashFireBoosted =
//!   attacker.flashFireBoosted === 1`; `activeBattlerAbilities` is
//!   `battlers[0..battlersCount)` each through the SAME 4-key ability
//!   filter (no hp/absent gate, unlike the trysetfutureattack leaf's own
//!   Plus/Minus scan).

use crate::damage_calc::{
    calculate_base_damage, DamageBattler, DamageCalcInput, StatStages, ABILITY_COMPOUND_EYES,
    ABILITY_GUTS, ABILITY_HUSTLE, ABILITY_NONE, ABILITY_SAND_VEIL, HOLD_EFFECT_CHOICE_BAND,
    HOLD_EFFECT_DEEP_SEA_SCALE, HOLD_EFFECT_DEEP_SEA_TOOTH, HOLD_EFFECT_LIGHT_BALL,
    HOLD_EFFECT_METAL_POWDER, HOLD_EFFECT_NONE, HOLD_EFFECT_THICK_CLUB, TYPE_ELECTRIC, TYPE_FIRE,
};
use crate::gen_tables::MOVES;

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_BASE_DAMAGE_BATTLER_COUNT: usize = 4;
/// `battleScriptRulesContext.ts:140` -- `BATTLE_SCRIPT_DYNAMIC_TYPE_MASK`.
pub const BATTLE_SCRIPT_BASE_DAMAGE_DYNAMIC_TYPE_MASK: u8 = 0x3f;
/// `battleScriptRulesContext.ts:139` -- `BATTLE_SCRIPT_ITEM_ENIGMA_BERRY`.
pub const BATTLE_SCRIPT_BASE_DAMAGE_ITEM_ENIGMA_BERRY: u16 = 175;
/// `include/constants/battle.h:173` -- `STATUS3_MUDSPORT`.
pub const BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_MUDSPORT: u32 = 1 << 16;
/// `include/constants/battle.h:174` -- `STATUS3_WATERSPORT`.
pub const BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_WATERSPORT: u32 = 1 << 17;
/// `include/constants/battle.h:118` -- `STATUS1_BURN`.
pub const BATTLE_SCRIPT_BASE_DAMAGE_STATUS1_BURN: u32 = 1 << 4;
/// `include/abilities.h:17` -- `ABILITY_CLOUD_NINE`.
pub const ABILITY_CLOUD_NINE: u16 = 13;
/// `include/abilities.h:81` -- `ABILITY_AIR_LOCK`.
pub const ABILITY_AIR_LOCK: u16 = 77;
/// `include/constants/battle_move_effects.h:11` -- `EFFECT_EXPLOSION`.
pub const BATTLE_SCRIPT_BASE_DAMAGE_EFFECT_EXPLOSION: u16 = 7;
/// `BATTLE_TYPE_FRONTIER` (`include/constants/battle.h`): Battle Tower
/// (`1<<8`) | Dome (`1<<16`) | Palace (`1<<17`) | Arena (`1<<18`) | Factory
/// (`1<<19`) | Pike (`1<<20`) | Pyramid (`1<<21`) -- matches
/// `battle_script_tryswapitems.rs`'s own local definition.
pub const BATTLE_SCRIPT_BASE_DAMAGE_BATTLE_TYPE_FRONTIER: u32 =
    (1 << 8) | (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20) | (1 << 21);
/// Two hold-effect ids the 26-key `HOLD_EFFECT_NAME_BY_ID` map carries that
/// `damage_calc.rs` does not otherwise name (`:177-178`).
const HOLD_EFFECT_MACHO_BRACE: u16 = 24;
const HOLD_EFFECT_QUICK_CLAW: u16 = 26;
/// `battleScriptRulesContext.ts:177-204` -- the complete 26-key
/// `HOLD_EFFECT_NAME_BY_ID` domain a resolved hold-effect id must belong to
/// before it may cross to the kernel.
const ALLOWED_HOLD_EFFECTS: [u16; 26] = [
    HOLD_EFFECT_MACHO_BRACE,
    HOLD_EFFECT_QUICK_CLAW,
    HOLD_EFFECT_CHOICE_BAND,
    31,
    34,
    HOLD_EFFECT_DEEP_SEA_TOOTH,
    HOLD_EFFECT_DEEP_SEA_SCALE,
    42,
    HOLD_EFFECT_LIGHT_BALL,
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    HOLD_EFFECT_METAL_POWDER,
    HOLD_EFFECT_THICK_CLUB,
];
/// `battleScriptRulesContext.ts:155-160` -- the complete 4-key
/// `ABILITY_NAME_BY_ID` domain a raw ability id must belong to before it may
/// cross to the kernel (including the `activeBattlerAbilities` field scan).
const ALLOWED_ABILITIES: [u16; 4] = [
    ABILITY_SAND_VEIL,
    ABILITY_COMPOUND_EYES,
    ABILITY_HUSTLE,
    ABILITY_GUTS,
];

/// `pokemon.c` cross-source battler slot; every source-indexed array retains
/// four cells regardless of `battlersCount`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptBaseDamageBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptBaseDamageBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Battler0),
            1 => Some(Self::Battler1),
            2 => Some(Self::Battler2),
            3 => Some(Self::Battler3),
            _ => None,
        }
    }
}

/// The complete per-battler projection this helper reads. `item` is the
/// RAW source item id (never a pre-resolved hold effect) so
/// [`resolve_battler_hold_effect`]/[`resolve_battler_hold_effect_param`] can
/// mirror the canonical two-step resolution (Enigma Berry's per-battler
/// override included) exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBaseDamageBattlerState {
    pub item: u16,
    /// Raw source ability id -- the 4-key allow-list filter is applied
    /// inside this module, never by the caller.
    pub ability: u16,
    pub species: u16,
    pub types: [u8; 2],
    pub level: i32,
    pub attack: i32,
    pub defense: i32,
    pub sp_attack: i32,
    pub sp_defense: i32,
    /// `toDamageCalcStatStages` (`:1493-1500`): `statStages[1]`=atk,
    /// `[2]`=def, `[4]`=spAtk, `[5]`=spDef.
    pub stat_stages: StatStages,
    pub hp: i32,
    pub max_hp: i32,
    /// Raw `status1` bitfield; bit 4 is burn, `!= 0` is "has any status".
    pub status1: u32,
    /// Raw `status3` bitfield; bits 16/17 are Mud Sport / Water Sport.
    pub status3: u32,
    /// 0 or 1; only the attacker's is read.
    pub flash_fire_boosted: u8,
}

/// Canonical selector bindings. Only `attacker` and `target` are ever read,
/// in that order (`requireBattlerRole`, `:787-795`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBaseDamageRoles {
    pub attacker: Option<BattleScriptBaseDamageBattler>,
    pub target: Option<BattleScriptBaseDamageBattler>,
}

/// Complete narrow rules slice this pure helper reads. No scheduler, no
/// events, no RNG -- this is not an opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBaseDamageRules {
    pub battlers: [BattleScriptBaseDamageBattlerState; BATTLE_SCRIPT_BASE_DAMAGE_BATTLER_COUNT],
    /// `rules.battleTopology.battlersCount` -- bounds the sport-halver scan,
    /// the `WEATHER_HAS_EFFECT2` scan, and the `activeBattlerAbilities`
    /// projection (2 in singles, 4 in doubles).
    pub battlers_count: u8,
    /// `rules.battleTopology.battleTypeFlags`; only its `BATTLE_TYPE_FRONTIER`
    /// bits are read (Soul Dew's frontier gate, inside `calculate_base_damage`).
    pub battle_type_flags: u32,
    /// Source `u32 gBattleWeather` bitfield.
    pub weather: u32,
    pub current_move: u16,
    /// Source `gDynamicBasePower`; 0 selects `gBattleMoves[move].power`.
    pub dynamic_base_power: u16,
    /// Source `u8 gBattleStruct->dynamicMoveType`.
    pub dynamic_move_type: u8,
    /// Source `gCritMultiplier`; `2` is a confirmed critical hit.
    pub crit_multiplier: u8,
    pub selector_roles: BattleScriptBaseDamageRoles,
    /// Per-battler `BattleEnigmaBerry` override
    /// (`global.berry.h:55-61`), read only when a battler's resolved item
    /// id is `ITEM_ENIGMA_BERRY` (175).
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_BASE_DAMAGE_BATTLER_COUNT],
    pub enigma_berry_hold_effect_params: [i32; BATTLE_SCRIPT_BASE_DAMAGE_BATTLER_COUNT],
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptBaseDamageError {
    /// `requireBattlerRole(rulesContext, "attacker")` (`:787-795`).
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `requireMoveRow` (`:126-144`).
    UnknownMoveRow { move_id: u16 },
    /// `resolveMoveTypeName`'s own `TYPE_NAME_BY_ID` bound (`:139-144`).
    UnknownTypeId { type_id: u8 },
    /// `resolveBattleScriptBattlerHoldEffect(Param)` (`:1647-1677`).
    ItemOutOfRange { item: u16 },
}

impl fmt::Display for BattleScriptBaseDamageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::UnknownMoveRow { move_id } => write!(
                formatter,
                "accuracycheck/ppreduce: move {move_id} has no source-derived gBattleMoves row"
            ),
            Self::UnknownTypeId { type_id } => {
                write!(
                    formatter,
                    "accuracycheck: unknown numeric type id {type_id}"
                )
            }
            Self::ItemOutOfRange { item } => {
                write!(formatter, "item {item} is outside the source gItems corpus")
            }
        }
    }
}

impl std::error::Error for BattleScriptBaseDamageError {}

/// `resolveBattleScriptMoveType` + `resolveMoveTypeName`'s range check
/// collapsed into one call (`battleScriptRulesContext.ts:1288-1309`): a
/// nonzero `dynamic_move_type` wins, masked to its low six bits; zero falls
/// back to the already-resolved move row's type. Either way the result must
/// be a valid `TYPE_*` id (0..=17).
///
/// # Errors
/// Returns [`BattleScriptBaseDamageError::UnknownTypeId`] when the resolved
/// id falls outside the 18-entry `TYPE_NAME_BY_ID` domain.
pub fn resolve_move_type(
    move_row_type: u8,
    dynamic_move_type: u8,
) -> Result<u8, BattleScriptBaseDamageError> {
    let id = if dynamic_move_type != 0 {
        dynamic_move_type & BATTLE_SCRIPT_BASE_DAMAGE_DYNAMIC_TYPE_MASK
    } else {
        move_row_type
    };
    if id > 17 {
        return Err(BattleScriptBaseDamageError::UnknownTypeId { type_id: id });
    }
    Ok(id)
}

fn item_catalog_lookup(item: u16) -> Option<(u16, i32)> {
    crate::battle_script_base_damage_item_catalog_gen::BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG
        .iter()
        .find(|(id, _, _)| *id == item)
        .map(|(_, hold_effect, param)| (*hold_effect, *param))
}

/// `resolveBattleScriptBattlerHoldEffect` (`:1647-1658`,
/// `Cmd_moveend`'s source lookup `battle_script_commands.c:4228-4231`).
///
/// # Errors
/// Returns [`BattleScriptBaseDamageError::ItemOutOfRange`] when the
/// battler's item id is outside the 377-entry `gItems` corpus.
pub fn resolve_battler_hold_effect(
    rules: &BattleScriptBaseDamageRules,
    battler: BattleScriptBaseDamageBattler,
) -> Result<u16, BattleScriptBaseDamageError> {
    let item = rules.battlers[battler.index()].item;
    if item
        >= crate::battle_script_base_damage_item_catalog_gen::BATTLE_SCRIPT_BASE_DAMAGE_ITEMS_COUNT
    {
        return Err(BattleScriptBaseDamageError::ItemOutOfRange { item });
    }
    if item == BATTLE_SCRIPT_BASE_DAMAGE_ITEM_ENIGMA_BERRY {
        return Ok(rules.enigma_berry_hold_effects[battler.index()]);
    }
    Ok(item_catalog_lookup(item).map_or(0, |(hold_effect, _)| hold_effect))
}

/// `resolveBattleScriptBattlerHoldEffectParam` (`:1660-1677`,
/// `GetBattlerHoldEffectParam`'s source-shaped branch
/// `battle_script_commands.c:1160-1169`, `BattleEnigmaBerry`
/// `global.berry.h:55-61`).
///
/// # Errors
/// Returns [`BattleScriptBaseDamageError::ItemOutOfRange`] when the
/// battler's item id is outside the 377-entry `gItems` corpus.
pub fn resolve_battler_hold_effect_param(
    rules: &BattleScriptBaseDamageRules,
    battler: BattleScriptBaseDamageBattler,
) -> Result<i32, BattleScriptBaseDamageError> {
    let item = rules.battlers[battler.index()].item;
    if item
        >= crate::battle_script_base_damage_item_catalog_gen::BATTLE_SCRIPT_BASE_DAMAGE_ITEMS_COUNT
    {
        return Err(BattleScriptBaseDamageError::ItemOutOfRange { item });
    }
    if item == BATTLE_SCRIPT_BASE_DAMAGE_ITEM_ENIGMA_BERRY {
        return Ok(rules.enigma_berry_hold_effect_params[battler.index()]);
    }
    Ok(item_catalog_lookup(item).map_or(0, |(_, param)| param))
}

/// `weatherHasEffectForBaseDamage` (`:2819-2832`, `WEATHER_HAS_EFFECT2`
/// `include/battle_util.h:48`, `battle_util.c:3111-3138`
/// `ABILITYEFFECT_FIELD_SPORT` default scan): battlers `[0..battlersCount)`,
/// Cloud Nine (13) or Air Lock (77), with **no `hp != 0` gate** -- unlike
/// the hp-gated `WEATHER_HAS_EFFECT` (`:2802-2817`), a fainted Cloud Nine
/// still suppresses weather here.
#[must_use]
pub fn weather_has_effect_for_base_damage(rules: &BattleScriptBaseDamageRules) -> bool {
    let active_count =
        usize::from(rules.battlers_count).min(BATTLE_SCRIPT_BASE_DAMAGE_BATTLER_COUNT);
    !rules.battlers[..active_count]
        .iter()
        .any(|battler| battler.ability == ABILITY_CLOUD_NINE || battler.ability == ABILITY_AIR_LOCK)
}

/// `battleScriptRulesContext.ts:155-160`'s 4-key ability filter, applied to
/// every ability id this helper forwards to the kernel (attacker, defender,
/// and each `activeBattlerAbilities` cell).
#[must_use]
fn filter_ability(ability: u16) -> u16 {
    if ALLOWED_ABILITIES.contains(&ability) {
        ability
    } else {
        ABILITY_NONE
    }
}

/// `battleScriptRulesContext.ts:177-204`'s 26-key hold-effect filter,
/// applied to both battlers' resolved hold-effect ids before they cross to
/// the kernel.
#[must_use]
fn filter_hold_effect(hold_effect: u16) -> u16 {
    if ALLOWED_HOLD_EFFECTS.contains(&hold_effect) {
        hold_effect
    } else {
        HOLD_EFFECT_NONE
    }
}

/// Native twin of exported `calculateBattleScriptBaseDamageForCurrentMove`
/// (`battleScriptHitChainOpcode.ts:1507-1580`). See the module doc comment
/// for the complete field-mapping contract.
///
/// # Errors
/// See [`BattleScriptBaseDamageError`] for the exact ordered error set:
/// missing attacker/target role, unknown move row, unknown resolved type
/// id, or an out-of-range attacker/target item id.
pub fn calculate_battle_script_base_damage_for_current_move(
    rules: &BattleScriptBaseDamageRules,
) -> Result<i32, BattleScriptBaseDamageError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptBaseDamageError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptBaseDamageError::MissingTargetRole)?;

    let move_row = MOVES
        .get(usize::from(rules.current_move))
        .ok_or(BattleScriptBaseDamageError::UnknownMoveRow { move_id: rules.current_move })?;
    let move_type = resolve_move_type(move_row.move_type, rules.dynamic_move_type)?;

    let mut move_power = if rules.dynamic_base_power != 0 {
        i32::from(rules.dynamic_base_power)
    } else {
        i32::from(move_row.power)
    };
    let active_count =
        usize::from(rules.battlers_count).min(BATTLE_SCRIPT_BASE_DAMAGE_BATTLER_COUNT);
    let active_battlers = &rules.battlers[..active_count];
    if move_type == TYPE_ELECTRIC
        && active_battlers
            .iter()
            .any(|b| (b.status3 & BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_MUDSPORT) != 0)
    {
        move_power /= 2;
    }
    if move_type == TYPE_FIRE
        && active_battlers
            .iter()
            .any(|b| (b.status3 & BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_WATERSPORT) != 0)
    {
        move_power /= 2;
    }

    let attacker_hold_effect = resolve_battler_hold_effect(rules, attacker)?;
    let target_hold_effect = resolve_battler_hold_effect(rules, target)?;
    let attacker_hold_effect_param = resolve_battler_hold_effect_param(rules, attacker)?;

    let attacker_state = &rules.battlers[attacker.index()];
    let target_state = &rules.battlers[target.index()];

    let active_battler_abilities: Vec<u16> = active_battlers
        .iter()
        .map(|b| filter_ability(b.ability))
        .collect();

    let input = DamageCalcInput {
        attacker: DamageBattler {
            attack: attacker_state.attack,
            defense: attacker_state.defense,
            sp_attack: attacker_state.sp_attack,
            sp_defense: attacker_state.sp_defense,
            level: attacker_state.level,
            types: attacker_state.types,
            stat_stages: attacker_state.stat_stages,
            is_burned: (attacker_state.status1 & BATTLE_SCRIPT_BASE_DAMAGE_STATUS1_BURN) != 0,
            has_status1: attacker_state.status1 != 0,
            hp: Some(attacker_state.hp),
            max_hp: Some(attacker_state.max_hp),
            ability: filter_ability(attacker_state.ability),
            species: attacker_state.species,
            hold_effect: filter_hold_effect(attacker_hold_effect),
            hold_effect_param: attacker_hold_effect_param,
        },
        defender: DamageBattler {
            attack: target_state.attack,
            defense: target_state.defense,
            sp_attack: target_state.sp_attack,
            sp_defense: target_state.sp_defense,
            level: target_state.level,
            types: target_state.types,
            stat_stages: target_state.stat_stages,
            is_burned: false,
            has_status1: target_state.status1 != 0,
            hp: None,
            max_hp: None,
            ability: filter_ability(target_state.ability),
            species: target_state.species,
            hold_effect: filter_hold_effect(target_hold_effect),
            hold_effect_param: 0,
        },
        move_power,
        move_type,
        is_critical_hit: rules.crit_multiplier == 2,
        side_status_reflect: false,
        side_status_light_screen: false,
        is_double_battle_spread_move: false,
        is_explosion_effect: move_row.effect == BATTLE_SCRIPT_BASE_DAMAGE_EFFECT_EXPLOSION,
        weather: rules.weather,
        weather_has_effect: weather_has_effect_for_base_damage(rules),
        current_move: u32::from(rules.current_move),
        active_battler_abilities: Some(active_battler_abilities),
        is_frontier_battle: (rules.battle_type_flags
            & BATTLE_SCRIPT_BASE_DAMAGE_BATTLE_TYPE_FRONTIER)
            != 0,
        flash_fire_boosted: attacker_state.flash_fire_boosted == 1,
    };

    Ok(calculate_base_damage(&input))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plain_battler() -> BattleScriptBaseDamageBattlerState {
        BattleScriptBaseDamageBattlerState {
            item: 0,
            ability: 0,
            species: 1,
            types: [0, 0],
            level: 50,
            attack: 60,
            defense: 60,
            sp_attack: 60,
            sp_defense: 60,
            stat_stages: StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
            hp: 100,
            max_hp: 100,
            status1: 0,
            status3: 0,
            flash_fire_boosted: 0,
        }
    }

    fn rules() -> BattleScriptBaseDamageRules {
        BattleScriptBaseDamageRules {
            battlers: [
                plain_battler(),
                plain_battler(),
                plain_battler(),
                plain_battler(),
            ],
            battlers_count: 2,
            battle_type_flags: 0,
            weather: 0,
            current_move: 33, // TACKLE
            dynamic_base_power: 0,
            dynamic_move_type: 0,
            crit_multiplier: 1,
            selector_roles: BattleScriptBaseDamageRoles {
                attacker: Some(BattleScriptBaseDamageBattler::Battler0),
                target: Some(BattleScriptBaseDamageBattler::Battler1),
            },
            enigma_berry_hold_effects: [0, 0, 0, 0],
            enigma_berry_hold_effect_params: [0, 0, 0, 0],
        }
    }

    #[test]
    fn ability_filter_boundary() {
        assert_eq!(filter_ability(8), 8);
        assert_eq!(filter_ability(14), 14);
        assert_eq!(filter_ability(55), 55);
        assert_eq!(filter_ability(62), 62);
        assert_eq!(filter_ability(37), ABILITY_NONE);
        assert_eq!(filter_ability(63), ABILITY_NONE);
    }

    #[test]
    fn hold_effect_filter_boundary() {
        assert_eq!(filter_hold_effect(29), 29);
        assert_eq!(filter_hold_effect(41), HOLD_EFFECT_NONE);
    }

    #[test]
    fn resolve_move_type_masks_and_validates() {
        assert_eq!(resolve_move_type(TYPE_FIRE, 0), Ok(TYPE_FIRE));
        assert_eq!(resolve_move_type(TYPE_FIRE, 0x80), Ok(0));
        assert_eq!(
            resolve_move_type(TYPE_FIRE, 0x3f),
            Err(BattleScriptBaseDamageError::UnknownTypeId { type_id: 0x3f })
        );
    }

    #[test]
    fn enigma_berry_overrides_catalog_resolution() {
        let mut r = rules();
        r.battlers[0].item = BATTLE_SCRIPT_BASE_DAMAGE_ITEM_ENIGMA_BERRY;
        r.enigma_berry_hold_effects[0] = 57;
        r.enigma_berry_hold_effect_params[0] = 10;
        assert_eq!(
            resolve_battler_hold_effect(&r, BattleScriptBaseDamageBattler::Battler0),
            Ok(57)
        );
        assert_eq!(
            resolve_battler_hold_effect_param(&r, BattleScriptBaseDamageBattler::Battler0),
            Ok(10)
        );
    }

    #[test]
    fn item_out_of_range_is_exact() {
        let mut r = rules();
        r.battlers[0].item =
            crate::battle_script_base_damage_item_catalog_gen::BATTLE_SCRIPT_BASE_DAMAGE_ITEMS_COUNT;
        assert_eq!(
            resolve_battler_hold_effect(&r, BattleScriptBaseDamageBattler::Battler0),
            Err(BattleScriptBaseDamageError::ItemOutOfRange {
                item: crate::battle_script_base_damage_item_catalog_gen::BATTLE_SCRIPT_BASE_DAMAGE_ITEMS_COUNT
            })
        );
    }

    #[test]
    fn both_sport_halvers_apply_independently() {
        let mut r = rules();
        r.current_move = 84; // THUNDERBOLT (Electric, special)
        r.battlers[0].status3 = BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_MUDSPORT;
        let with_sport = calculate_battle_script_base_damage_for_current_move(&r).unwrap();
        r.battlers[0].status3 = 0;
        let without_sport = calculate_battle_script_base_damage_for_current_move(&r).unwrap();
        assert!(with_sport < without_sport);
    }

    #[test]
    fn weather_has_effect_ignores_hp() {
        let mut r = rules();
        r.battlers[1].ability = ABILITY_CLOUD_NINE;
        r.battlers[1].hp = 0;
        assert!(!weather_has_effect_for_base_damage(&r));
    }

    #[test]
    fn role_errors_are_exact() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        assert_eq!(
            calculate_battle_script_base_damage_for_current_move(&r),
            Err(BattleScriptBaseDamageError::MissingAttackerRole)
        );
        let mut r2 = rules();
        r2.selector_roles.target = None;
        assert_eq!(
            calculate_battle_script_base_damage_for_current_move(&r2),
            Err(BattleScriptBaseDamageError::MissingTargetRole)
        );
    }

    #[test]
    fn unknown_move_row_is_exact() {
        let mut r = rules();
        r.current_move = 60000;
        assert_eq!(
            calculate_battle_script_base_damage_for_current_move(&r),
            Err(BattleScriptBaseDamageError::UnknownMoveRow { move_id: 60000 })
        );
    }
}
