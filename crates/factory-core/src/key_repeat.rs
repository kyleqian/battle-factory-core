//! Pure port of `src/engine/keyRepeat.ts`'s `ReadKeys` model.
//!
//! The canonical TypeScript module already cites
//! `reference/pokeemerald/src/main.c`: `gKeyRepeatStartDelay = 40` and
//! `gKeyRepeatContinueDelay = 5`.  The important source-shaped detail is
//! that `gKeyRepeatCounter` is shared by the complete held combination, not
//! one counter per button.  A combination change, including release, resets
//! that counter; only an exact nonempty held-mask match decrements it.

use std::fmt;

/// The ten GBA buttons in the canonical `src/input.ts:GBA_BUTTONS` order.
/// Their discriminants are bit positions in `GbaButtonMask`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GbaButton {
    A = 0,
    B = 1,
    Select = 2,
    Start = 3,
    Right = 4,
    Left = 5,
    Up = 6,
    Down = 7,
    R = 8,
    L = 9,
}

/// Canonical `GBA_BUTTONS` order, retained as a native enumerable surface.
pub const GBA_BUTTONS: [GbaButton; 10] = [
    GbaButton::A,
    GbaButton::B,
    GbaButton::Select,
    GbaButton::Start,
    GbaButton::Right,
    GbaButton::Left,
    GbaButton::Up,
    GbaButton::Down,
    GbaButton::R,
    GbaButton::L,
];

impl GbaButton {
    /// One canonical bit for this button.
    pub const fn mask(self) -> u16 {
        1u16 << (self as u8)
    }
}

/// Invalid button byte at the checked ABI/native conversion seam.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GbaButtonError {
    pub value: u8,
}

impl fmt::Display for GbaButtonError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid GBA button index {}", self.value)
    }
}

impl std::error::Error for GbaButtonError {}

impl TryFrom<u8> for GbaButton {
    type Error = GbaButtonError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::A),
            1 => Ok(Self::B),
            2 => Ok(Self::Select),
            3 => Ok(Self::Start),
            4 => Ok(Self::Right),
            5 => Ok(Self::Left),
            6 => Ok(Self::Up),
            7 => Ok(Self::Down),
            8 => Ok(Self::R),
            9 => Ok(Self::L),
            _ => Err(GbaButtonError { value }),
        }
    }
}

/// Bits used by the ten canonical buttons.  Every other `u16` bit is
/// structurally invalid at boundaries rather than silently ignored.
pub const GBA_BUTTON_MASK_BITS: u16 = (1u16 << GBA_BUTTONS.len()) - 1;

/// Validated canonical button-set bitmask.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub struct GbaButtonMask(u16);

impl GbaButtonMask {
    pub const EMPTY: Self = Self(0);
    pub const ALL: Self = Self(GBA_BUTTON_MASK_BITS);

    pub const fn bits(self) -> u16 {
        self.0
    }

    pub const fn is_empty(self) -> bool {
        self.0 == 0
    }

    pub const fn contains(self, button: GbaButton) -> bool {
        (self.0 & button.mask()) != 0
    }

    /// Constructs a mask after a boundary has already verified unused bits.
    const fn from_valid_bits(bits: u16) -> Self {
        Self(bits)
    }
}

/// Invalid unused bits in a u16 button mask.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GbaButtonMaskError {
    pub bits: u16,
}

impl fmt::Display for GbaButtonMaskError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "GBA button mask has unused bits set: {:#06x}", self.bits)
    }
}

impl std::error::Error for GbaButtonMaskError {}

impl TryFrom<u16> for GbaButtonMask {
    type Error = GbaButtonMaskError;

    fn try_from(bits: u16) -> Result<Self, Self::Error> {
        if bits & !GBA_BUTTON_MASK_BITS != 0 {
            return Err(GbaButtonMaskError { bits });
        }
        Ok(Self::from_valid_bits(bits))
    }
}

/// `gKeyRepeatStartDelay` (`reference/pokeemerald/src/main.c`), also the
/// canonical TypeScript `REPEAT_START_DELAY`.
pub const KEY_REPEAT_START_DELAY: u8 = 40;
/// `gKeyRepeatContinueDelay` (`reference/pokeemerald/src/main.c`), also the
/// canonical TypeScript `REPEAT_CONTINUE_DELAY`.
pub const KEY_REPEAT_CONTINUE_DELAY: u8 = 5;

/// Reachable `gKeyRepeatCounter` state.  `ReadKeys` never stores zero: a
/// decrement from one fires immediately and stores the continue delay.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct KeyRepeatCounter(u8);

impl KeyRepeatCounter {
    pub const START: Self = Self(KEY_REPEAT_START_DELAY);
    pub const CONTINUE: Self = Self(KEY_REPEAT_CONTINUE_DELAY);

    pub const fn get(self) -> u8 {
        self.0
    }

    const fn decrement_or_repeat(self) -> (Self, bool) {
        if self.0 == 1 {
            (Self::CONTINUE, true)
        } else {
            (Self(self.0 - 1), false)
        }
    }
}

/// Value outside the reachable `1..=40` controller-state domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KeyRepeatCounterError {
    pub value: u8,
}

impl fmt::Display for KeyRepeatCounterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "key repeat counter must be in 1..={KEY_REPEAT_START_DELAY}, got {}",
            self.value
        )
    }
}

impl std::error::Error for KeyRepeatCounterError {}

impl TryFrom<u8> for KeyRepeatCounter {
    type Error = KeyRepeatCounterError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        if !(1..=KEY_REPEAT_START_DELAY).contains(&value) {
            return Err(KeyRepeatCounterError { value });
        }
        Ok(Self(value))
    }
}

/// Native `KeyRepeatState`, preserving the canonical source field order.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct KeyRepeatState {
    pub held_keys_raw: GbaButtonMask,
    pub key_repeat_counter: KeyRepeatCounter,
}

/// Exact native equivalent of `INITIAL_KEY_REPEAT_STATE`.
pub const INITIAL_KEY_REPEAT_STATE: KeyRepeatState = KeyRepeatState {
    held_keys_raw: GbaButtonMask::EMPTY,
    key_repeat_counter: KeyRepeatCounter::START,
};

/// `ReadKeys`' externally observable JOY_NEW / JOY_REPEAT result plus the
/// next controller state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct KeyFrame {
    /// JOY_NEW: per-bit rising edges.
    pub new_keys: GbaButtonMask,
    /// JOY_REPEAT: JOY_NEW, or the complete current held mask when the one
    /// shared repeat counter fires.
    pub new_and_repeated_keys: GbaButtonMask,
    pub next: KeyRepeatState,
}

/// Pure port of `readKeys` / Emerald `ReadKeys`.
pub fn read_keys(buttons: GbaButtonMask, prev: KeyRepeatState) -> KeyFrame {
    // `keyInput & ~heldKeysRaw`: a per-bit edge mask; `GbaButtonMask`'s
    // validation guarantees the inverted high bits cannot leak into it.
    let new_keys = GbaButtonMask::from_valid_bits(buttons.bits() & !prev.held_keys_raw.bits());
    let (new_and_repeated_keys, key_repeat_counter) =
        if !buttons.is_empty() && buttons == prev.held_keys_raw {
            let (next_counter, fires_repeat) = prev.key_repeat_counter.decrement_or_repeat();
            (if fires_repeat { buttons } else { new_keys }, next_counter)
        } else {
            // Any changed combination, including empty -> empty, stores the
            // start delay exactly like the canonical TypeScript source.
            (new_keys, KeyRepeatCounter::START)
        };

    KeyFrame {
        new_keys,
        new_and_repeated_keys,
        next: KeyRepeatState { held_keys_raw: buttons, key_repeat_counter },
    }
}

/// Pure port of `hasButton`.
pub const fn has_button(keys: GbaButtonMask, button: GbaButton) -> bool {
    keys.contains(button)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mask(bits: u16) -> GbaButtonMask {
        GbaButtonMask::try_from(bits).unwrap()
    }

    #[test]
    fn canonical_button_order_and_mask_are_stable() {
        assert_eq!(GBA_BUTTONS.len(), 10);
        assert_eq!(
            GBA_BUTTONS.map(GbaButton::mask),
            [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]
        );
        assert_eq!(GBA_BUTTON_MASK_BITS, 0x03ff);
        assert_eq!(GbaButtonMask::ALL.bits(), GBA_BUTTON_MASK_BITS);
        assert!(GbaButtonMask::try_from(0x0400).is_err());
    }

    #[test]
    fn initial_state_and_first_repeat_match_source_delays() {
        assert_eq!(INITIAL_KEY_REPEAT_STATE.held_keys_raw, GbaButtonMask::EMPTY);
        assert_eq!(INITIAL_KEY_REPEAT_STATE.key_repeat_counter.get(), 40);
        let held = mask(GbaButton::Right.mask());
        let mut state = INITIAL_KEY_REPEAT_STATE;
        let mut fires = Vec::new();
        for frame in 1..=51 {
            let result = read_keys(held, state);
            if result.new_and_repeated_keys == held {
                fires.push(frame);
            }
            state = result.next;
        }
        assert_eq!(fires, [1, 41, 46, 51]);
    }

    #[test]
    fn changing_or_releasing_the_complete_combination_resets_shared_counter() {
        let right = mask(GbaButton::Right.mask());
        let left = mask(GbaButton::Left.mask());
        let state = KeyRepeatState {
            held_keys_raw: right,
            key_repeat_counter: KeyRepeatCounter::try_from(1).unwrap(),
        };
        let changed = read_keys(left, state);
        assert_eq!(changed.new_keys, left);
        assert_eq!(changed.new_and_repeated_keys, left);
        assert_eq!(changed.next.key_repeat_counter, KeyRepeatCounter::START);
        let released = read_keys(GbaButtonMask::EMPTY, changed.next);
        assert_eq!(released.new_keys, GbaButtonMask::EMPTY);
        assert_eq!(released.next.key_repeat_counter, KeyRepeatCounter::START);
    }
}
