//! Species-backed `GetGenderFromSpeciesAndPersonality` resolver, ported from
//! `src/engine/battleScriptGender.ts`.
//!
//! The TypeScript public seam accepts JavaScript `number` values. The native
//! battle-script boundary uses the actual source storage domains instead:
//! species ids are `u16` (the checked-in generated species table's key) and a
//! Gen-3 personality is `u32` (the `gender::get_mon_gender` primitive's
//! domain). Fractional, non-finite, and negative JavaScript `number` values
//! cannot arise from `MON_DATA_SPECIES`/`MON_DATA_PERSONALITY`, so this pure
//! native leaf deliberately has no lossy `f64` facade and does not widen WASM.

use crate::{
    gender::{get_mon_gender, MonGender},
    species_gender_ratios_gen,
};
use core::fmt;

/// Exact native error for a species id absent from the canonical generated
/// `species-stats.json` lookup. Its display text mirrors the TypeScript
/// resolver exactly for the native `u16` species-id domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGenderError {
    pub species: u16,
}

impl fmt::Display for BattleScriptGenderError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "no genderRatio data for species id {}",
            self.species
        )
    }
}

impl std::error::Error for BattleScriptGenderError {}

/// Native twin of `resolveBattleScriptMonGender`.
///
/// It performs the same species-id lookup before delegating all fixed-ratio
/// and low-personality-byte handling to `gender::get_mon_gender`.
pub fn resolve_battle_script_mon_gender(
    species: u16,
    personality: u32,
) -> Result<MonGender, BattleScriptGenderError> {
    let gender_ratio = species_gender_ratios_gen::species_gender_ratio(species)
        .ok_or(BattleScriptGenderError { species })?;
    Ok(get_mon_gender(gender_ratio, personality))
}
