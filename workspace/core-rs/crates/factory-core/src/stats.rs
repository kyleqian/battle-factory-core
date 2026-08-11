//! Gen-3 stat formulas, ported from `src/engine/stats.ts`, which matches
//! `reference/pokeemerald/src/pokemon.c`'s `CalculateMonStats` / `CALC_STAT`
//! macro exactly (verified there against a RAM dump of the anchor's six
//! rental mons — see the TS module's tests for the cross-check).

/// A nature's per-stat modifier: -1 (hindered, x0.9), 0 (neutral), or 1
/// (boosted, x1.1). Mirrors `NatureModifier` (`src/engine/stats.ts:5`) and
/// `gen_tables::NatureModifierRow`'s field domain.
pub type NatureModifier = i8;

/// Mirrors `calculateHpStat` (`src/engine/stats.ts:7-9`).
#[must_use]
pub fn calculate_hp_stat(base: u32, iv: u32, ev: u32, level: u32) -> u32 {
    (2 * base + iv + ev / 4) * level / 100 + level + 10
}

/// Mirrors `calculateOtherStat` (`src/engine/stats.ts:11-16`).
#[must_use]
pub fn calculate_other_stat(
    base: u32,
    iv: u32,
    ev: u32,
    level: u32,
    nature_modifier: NatureModifier,
) -> u32 {
    let raw = (2 * base + iv + ev / 4) * level / 100 + 5;
    match nature_modifier {
        1 => raw * 110 / 100,
        -1 => raw * 90 / 100,
        _ => raw,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Expected values generated from the real TS module (not hand-computed)
    // via:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/stats.ts").then((m) => {
    //       console.log("hp base=80 iv=31 ev=170 level=50 ->", m.calculateHpStat(80, 31, 170, 50));
    //       console.log("other neutral base=80 iv=31 ev=170 level=50 nature=0 ->", m.calculateOtherStat(80, 31, 170, 50, 0));
    //       console.log("other boosted base=80 iv=31 ev=170 level=50 nature=1 ->", m.calculateOtherStat(80, 31, 170, 50, 1));
    //       console.log("other hindered base=80 iv=31 ev=170 level=50 nature=-1 ->", m.calculateOtherStat(80, 31, 170, 50, -1));
    //     });
    //   '
    // Output (run from the workspace root, 2026-08-11):
    //   hp base=80 iv=31 ev=170 level=50 -> 176
    //   other neutral base=80 iv=31 ev=170 level=50 nature=0 -> 121
    //   other boosted base=80 iv=31 ev=170 level=50 nature=1 -> 133
    //   other hindered base=80 iv=31 ev=170 level=50 nature=-1 -> 108
    // (base/iv/ev here are SPECIES_GRIMER's base HP, a max fixed IV, and
    // GRIMER's real Factory set's derived HP EV at level 50 — see
    // `mon_construction::tests` for the end-to-end set this ties to.)

    #[test]
    fn calculate_hp_stat_matches_ts() {
        assert_eq!(calculate_hp_stat(80, 31, 170, 50), 176);
    }

    #[test]
    fn calculate_other_stat_neutral_matches_ts() {
        assert_eq!(calculate_other_stat(80, 31, 170, 50, 0), 121);
    }

    #[test]
    fn calculate_other_stat_boosted_matches_ts() {
        assert_eq!(calculate_other_stat(80, 31, 170, 50, 1), 133);
    }

    #[test]
    fn calculate_other_stat_hindered_matches_ts() {
        assert_eq!(calculate_other_stat(80, 31, 170, 50, -1), 108);
    }
}
