//! Pure `B_SCR_OP_GIVEPAYDAYMONEY` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptGivepaydaymoneyOpcode.ts`, separated from that
//! module's opcode registration and generic Battle Script machine. The
//! canonical handler first suppresses the command for either link flag or a
//! zero source `gPaydayMoney`; otherwise it credits capped player money,
//! prepares the complete unsigned Pay Day bonus buffer, and calls the Pay Day
//! message script.
//!
//! Source authority is `Cmd_givepaydaymoney` in
//! `reference/pokeemerald/src/battle_script_commands.c:7450-7466`. It tests
//! `BATTLE_TYPE_LINK` (bit 1) and `BATTLE_TYPE_RECORDED_LINK` (bit 25), then
//! multiplies source `u16 gPaydayMoney` by source `u8
//! gBattleStruct->moneyMultiplier`. `AddMoney` in
//! `reference/pokeemerald/src/money.c:90-107` caps the decrypted save value
//! at `MAX_MONEY` (999999), while `PREPARE_HWORD_NUMBER_BUFFER` receives the
//! full `u32` bonus. The canonical TypeScript construction boundary validates
//! these exact durable domains in `battleScriptRulesContext.ts:2616-2620` and
//! `:2773-2776`.
//!
//! Absolute message-label program counters, the BattleScriptPush stack,
//! opcode registration, generic `BattleState`, ABI/WASM boundaries, RNG,
//! scheduling, and presentation deliberately remain machine-owned.

/// Source `BATTLE_TYPE_LINK` from `include/constants/battle.h:60`.
pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_BATTLE_TYPE_LINK: u32 = 1 << 1;

/// Source `BATTLE_TYPE_RECORDED_LINK` from `include/constants/battle.h:84`.
pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_BATTLE_TYPE_RECORDED_LINK: u32 = 1 << 25;

/// Source `MAX_MONEY` from `src/money.c:13`.
pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_MAX_MONEY: u32 = 999_999;

/// The two source battle-type bits which suppress this payout command.
pub const BATTLE_SCRIPT_GIVEPAYDAYMONEY_SUPPRESS_FLAGS: u32 =
    BATTLE_SCRIPT_GIVEPAYDAYMONEY_BATTLE_TYPE_LINK
        | BATTLE_SCRIPT_GIVEPAYDAYMONEY_BATTLE_TYPE_RECORDED_LINK;

/// Complete narrow projection read or written by `Cmd_givepaydaymoney`.
///
/// `battle_type_flags` retains every source `u32` bit rather than a
/// hand-reduced boolean. `payday_money` and `money_multiplier` retain their
/// source widths. `player_money` is the canonical TypeScript's already
/// validated `0..=MAX_MONEY` decrypted domain; it stays `u32` so its complete
/// source-width storage and cap boundary are both visible. The prepared
/// buffer is nullable before the opcode and retains its full `u32` domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGivepaydaymoneyRules {
    pub battle_type_flags: u32,
    pub payday_money: u16,
    pub money_multiplier: u8,
    pub player_money: u32,
    pub battle_text_buff1_payday_money: Option<u32>,
}

/// Machine-independent control result of this command.
///
/// `PayoutCall` intentionally carries neither an absolute label program
/// counter nor a pushed return address: those are the surrounding machine's
/// responsibilities. `Advance` similarly leaves the one-byte increment to
/// that layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptGivepaydaymoneyControl {
    Advance,
    PayoutCall,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGivepaydaymoneyOutcome {
    pub rules: BattleScriptGivepaydaymoneyRules,
    pub control: BattleScriptGivepaydaymoneyControl,
}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by the canonical `Cmd_givepaydaymoney` handler.
///
/// Source condition ordering is retained exactly: either link bit suppresses
/// before the zero-Pay-Day predicate is considered. Both suppression paths
/// preserve every projected field and advance. A payout uses source-width
/// unsigned multiplication, applies source `AddMoney`/`MAX_MONEY` capping,
/// overwrites the nullable prepared-money buffer with the full bonus, and
/// produces the typed message-call result. Repeated payout calls deliberately
/// continue to credit money until the cap; suppressed calls are value
/// idempotent.
#[must_use]
pub fn apply_battle_script_givepaydaymoney(
    rules: &BattleScriptGivepaydaymoneyRules,
) -> BattleScriptGivepaydaymoneyOutcome {
    if rules.battle_type_flags & BATTLE_SCRIPT_GIVEPAYDAYMONEY_SUPPRESS_FLAGS != 0
        || rules.payday_money == 0
    {
        return BattleScriptGivepaydaymoneyOutcome {
            rules: *rules,
            control: BattleScriptGivepaydaymoneyControl::Advance,
        };
    }

    let bonus_money = u32::from(rules.payday_money) * u32::from(rules.money_multiplier);
    // The canonical input cap plus the largest u16*u8 product is below u32::MAX.
    let player_money =
        (rules.player_money + bonus_money).min(BATTLE_SCRIPT_GIVEPAYDAYMONEY_MAX_MONEY);
    let next = BattleScriptGivepaydaymoneyRules {
        player_money,
        battle_text_buff1_payday_money: Some(bonus_money),
        ..*rules
    };
    BattleScriptGivepaydaymoneyOutcome {
        rules: next,
        control: BattleScriptGivepaydaymoneyControl::PayoutCall,
    }
}
