//! Gen-3 LCG, matching `reference/pokeemerald/src/random.c` exactly and
//! ported from `src/engine/rng.ts`:
//!   gRngValue = ISO_RANDOMIZE1(gRngValue) = 1103515245 * gRngValue + 24691 (mod 2^32)
//!   Random() returns the upper 16 bits of the new gRngValue.
//! Per main.c:366, Random() advances once per VBlank EXCEPT during frontier/
//! link/recorded battles, which consume RNG only on demand (see the TS
//! ROADMAP.md Domain notes). The draft screen always advances once/frame.

pub const RNG_MULTIPLIER: u32 = 1103515245;
pub const RNG_INCREMENT: u32 = 24691;

/// RAM-verified gRngValue at the anchor draft screen's frame 0
/// (ROADMAP.md Domain notes; mirrors `ANCHOR_RNG_VALUE` in rng.ts).
pub const ANCHOR_RNG_VALUE: u32 = 0xd2ddeec8;

/// One step of the LCG: returns the next raw 32-bit gRngValue.
#[must_use]
pub fn advance_rng_value(rng_value: u32) -> u32 {
    rng_value
        .wrapping_mul(RNG_MULTIPLIER)
        .wrapping_add(RNG_INCREMENT)
}

/// The gen-3 RNG stream: wraps a mutable gRngValue and yields Random()'s
/// u16 outputs. Mirrors `GbaRng` in `src/engine/rng.ts`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GbaRng {
    value: u32,
}

impl GbaRng {
    #[must_use]
    pub fn new(seed: u32) -> Self {
        Self { value: seed }
    }

    /// Current raw gRngValue (what the RAM-inspection recipe reads as
    /// `gRngValue`).
    #[must_use]
    pub fn rng_value(&self) -> u32 {
        self.value
    }

    pub fn set_rng_value(&mut self, value: u32) {
        self.value = value;
    }

    /// Advances the LCG once and returns the new value's upper 16 bits,
    /// like Random().
    // Mirrors `GbaRng.next()` in src/engine/rng.ts by name; this is a
    // stateful stream-advance, not `Iterator::next`, so it doesn't adopt
    // the trait's `Option<Item>` signature.
    #[allow(clippy::should_implement_trait)]
    pub fn next(&mut self) -> u16 {
        self.value = advance_rng_value(self.value);
        (self.value >> 16) as u16
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Expected values generated from the TS implementation on 2026-08-11
    // (node --experimental-strip-types over src/engine/rng.ts), NOT
    // hand-computed — the TS engine is the spec.

    #[test]
    fn matches_ts_stream_from_zero_seed() {
        let mut rng = GbaRng::new(0x0000_0000);
        let outputs: Vec<u16> = (0..8).map(|_| rng.next()).collect();
        assert_eq!(
            outputs,
            [0x0000, 0xe97e, 0x5271, 0x31b0, 0x8e42, 0xe2cc, 0xafc5, 0x67db]
        );
        assert_eq!(rng.rng_value(), 0x67db_b608);
    }

    #[test]
    fn matches_ts_stream_from_anchor_seed() {
        let mut rng = GbaRng::new(ANCHOR_RNG_VALUE);
        let outputs: Vec<u16> = (0..8).map(|_| rng.next()).collect();
        assert_eq!(
            outputs,
            [0xddef, 0x92b9, 0xfc5d, 0xd492, 0xfc14, 0x74af, 0x49ee, 0xc41f]
        );
        assert_eq!(rng.rng_value(), 0xc41f_b5d0);
    }

    #[test]
    fn advance_wraps_mod_2_pow_32() {
        assert_eq!(advance_rng_value(0xffff_ffff), 0xbe3a_1206);
    }

    #[test]
    fn set_rng_value_rejoins_the_stream() {
        let mut a = GbaRng::new(ANCHOR_RNG_VALUE);
        a.next();
        let mut b = GbaRng::new(0);
        b.set_rng_value(a.rng_value());
        assert_eq!(a.next(), b.next());
        assert_eq!(a.rng_value(), b.rng_value());
    }
}
