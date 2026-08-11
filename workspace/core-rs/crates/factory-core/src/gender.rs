//! `GetGenderFromSpeciesAndPersonality`
//! (`reference/pokeemerald/src/pokemon.c:3471-3485`), ported from
//! `src/engine/monGender.ts`. `gender_ratio` is either a fixed literal
//! (`MON_MALE`=0x00 / `MON_FEMALE`=0xFE / `MON_GENDERLESS`=0xFF) or a
//! 0-254 threshold compared against the personality value's low byte.

const MON_MALE: u8 = 0x00;
const MON_FEMALE: u8 = 0xfe;
const MON_GENDERLESS: u8 = 0xff;

/// Mirrors the TS `MonGender` string union (`"male" | "female" |
/// "genderless"`, `src/engine/monGender.ts:7`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MonGender {
    /// TS `"male"`.
    Male,
    /// TS `"female"`.
    Female,
    /// TS `"genderless"`.
    Genderless,
}

/// Mirrors `getMonGender` (`src/engine/monGender.ts:13-18`).
#[must_use]
pub fn get_mon_gender(gender_ratio: u8, personality: u32) -> MonGender {
    if gender_ratio == MON_MALE {
        return MonGender::Male;
    }
    if gender_ratio == MON_FEMALE {
        return MonGender::Female;
    }
    if gender_ratio == MON_GENDERLESS {
        return MonGender::Genderless;
    }
    if gender_ratio > (personality & 0xff) as u8 {
        MonGender::Female
    } else {
        MonGender::Male
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Expected values generated from the real TS module (not hand-computed)
    // via:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/monGender.ts").then((m) => {
    //       console.log("genderless(255) p=0 ->", m.getMonGender(255, 0));
    //       console.log("genderless(255) p=0xffffffff ->", m.getMonGender(255, 0xffffffff));
    //       console.log("alwaysFemale(254) p=0 ->", m.getMonGender(254, 0));
    //       console.log("alwaysFemale(254) p=0xffffffff ->", m.getMonGender(254, 0xffffffff));
    //       console.log("alwaysMale(0) p=0 ->", m.getMonGender(0, 0));
    //       console.log("alwaysMale(0) p=0xffffffff ->", m.getMonGender(0, 0xffffffff));
    //       console.log("mixed(31) p=0 (low byte 0) ->", m.getMonGender(31, 0));
    //       console.log("mixed(31) p=31 (low byte 31) ->", m.getMonGender(31, 31));
    //       console.log("mixed(31) p=32 (low byte 32) ->", m.getMonGender(31, 32));
    //       console.log("mixed(127) p=100 (low byte 100) ->", m.getMonGender(127, 100));
    //       console.log("mixed(127) p=200 (low byte 200) ->", m.getMonGender(127, 200));
    //     });
    //   '
    // Output (run from the workspace root, 2026-08-11):
    //   genderless(255) p=0 -> genderless
    //   genderless(255) p=0xffffffff -> genderless
    //   alwaysFemale(254) p=0 -> female
    //   alwaysFemale(254) p=0xffffffff -> female
    //   alwaysMale(0) p=0 -> male
    //   alwaysMale(0) p=0xffffffff -> male
    //   mixed(31) p=0 (low byte 0) -> female
    //   mixed(31) p=31 (low byte 31) -> male
    //   mixed(31) p=32 (low byte 32) -> male
    //   mixed(127) p=100 (low byte 100) -> female
    //   mixed(127) p=200 (low byte 200) -> male
    // (31 is SPECIES_BULBASAUR's real genderRatio, 127 is
    // SPECIES_GRIMER's — src/data/gen/species-stats.json.)

    #[test]
    fn genderless_species_ignores_personality() {
        assert_eq!(get_mon_gender(255, 0), MonGender::Genderless);
        assert_eq!(get_mon_gender(255, 0xffff_ffff), MonGender::Genderless);
    }

    #[test]
    fn always_female_species_ignores_personality() {
        assert_eq!(get_mon_gender(254, 0), MonGender::Female);
        assert_eq!(get_mon_gender(254, 0xffff_ffff), MonGender::Female);
    }

    #[test]
    fn always_male_species_ignores_personality() {
        assert_eq!(get_mon_gender(0, 0), MonGender::Male);
        assert_eq!(get_mon_gender(0, 0xffff_ffff), MonGender::Male);
    }

    #[test]
    fn mixed_ratio_species_follows_personality_low_byte() {
        assert_eq!(get_mon_gender(31, 0), MonGender::Female);
        assert_eq!(get_mon_gender(31, 31), MonGender::Male);
        assert_eq!(get_mon_gender(31, 32), MonGender::Male);
        assert_eq!(get_mon_gender(127, 100), MonGender::Female);
        assert_eq!(get_mon_gender(127, 200), MonGender::Male);
    }
}
