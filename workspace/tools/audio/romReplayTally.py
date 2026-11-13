"""parity-mac fourth pass: the tally of what really took effect in battles that matched the ROM (docs/parity-mac/tally.md).

  python3 tools/audio/romReplayTally.py DIR [DIR ...] [--out tally.json] [--md tally.md] [--zero]

Reads every `*.facts.json.gz` under the DIRs (romReplayWide.sh writes one per MATCHING battle: decisions, the wide state at every decision, every turn's
events with the script label each event came from). A row counts only what the engine did in a battle whose every turn state, wide state and winner agreed
with the ROM, so a counted effect is one the ROM did too.

Rows (the Level 50 pool = Frontier sets 110..849, src/data/gen/battle-frontier-mons.json):
  move:EFFECT_X      used / worked (no miss, no failure, no immunity message in the move's span) / secondary (the move's added effect was applied, for the
                     effects listed in SECONDARY). The row is covered by `secondary` when the effect has one, else by `worked`.
  ability:ABILITY_X  the ability took effect. Evidence is either the ability's own script (label) or, for abilities that only change a number or a roll, the
                     situation in which they do (for example Thick Fat: its holder took damage from a Fire or Ice move). Each rule is in ABILITY_RULES below.
  hold:HOLD_EFFECT_X the same for held items.
  situation:...      switches, traps, refusals, statuses with their per-turn step, weather, screens.
A row whose rule names "none" has no effect in a Factory singles battle; the reason is in the rule text.
"""
import collections, glob, gzip, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GEN = ROOT / "src/data/gen"
REF = ROOT / "reference/pokeemerald"

MOVES = {m["id"]: m for m in json.loads((GEN / "moves.json").read_text())["moves"]}
MOVE_BY_NAME = {m["move"]: m for m in MOVES.values()}
ITEMS = {i["itemId"]: i for i in json.loads((GEN / "item-hold-effects.json").read_text())["items"]}
SPECIES = {s["name"]: s for s in json.loads((GEN / "species-stats.json").read_text())["species"]}
SPECIES_ID = {r["species"]: i for i, r in enumerate(json.loads((GEN / "species-names.json").read_text())["species"])}
ABILITY_NAME = {int(n): name for name, n in re.findall(r"#define (ABILITY_\w+) (\d+)", (REF / "include/constants/abilities.h").read_text())}
ABILITY_ID = {name: n for n, name in ABILITY_NAME.items()}
TYPES = ["TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND", "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
         "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC", "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK"]
PHYSICAL = set(TYPES[:9])
POOL = range(110, 850)

STATUS1_SLEEP, STATUS1_POISON, STATUS1_BURN, STATUS1_FREEZE, STATUS1_PARALYSIS, STATUS1_TOXIC = 0x7, 0x8, 0x10, 0x20, 0x40, 0x80
STATUS2_WRAPPED, STATUS2_ESCAPE_PREVENTION, STATUS2_TORMENT = 0xE000, 1 << 26, 1 << 31
STATUS3_ROOTED, STATUS3_IMPRISONED_OTHERS = 1 << 10, 1 << 13
WEATHER = {"rain": 0x7, "sandstorm": 0x18, "sun": 0x60, "hail": 0x80}
SIDE_REFLECT, SIDE_LIGHTSCREEN = 1 << 0, 1 << 1


def hold_effect(item):
    row = ITEMS.get(item)
    return row["holdEffect"] if row else "HOLD_EFFECT_NONE"


def ability(n):
    return ABILITY_NAME.get(n, f"ABILITY_{n}")


# ---- move spans ---------------------------------------------------------------------------------------------------------------------------------------
FAIL_MESSAGES = {"STRINGID_ATTACKMISSED", "STRINGID_AVOIDEDDAMAGE", "STRINGID_BUTITFAILED", "STRINGID_BUTNOEFFECT", "STRINGID_BUTNOTHINGHAPPENED",
                 "STRINGID_FAILEDTOSPITUP", "STRINGID_FAILEDTOSWALLOW", "STRINGID_ITDOESNTAFFECT", "STRINGID_MIRRORMOVEFAILED", "STRINGID_PKMNANCHORSITSELFWITH",
                 "STRINGID_PKMNAVOIDEDATTACK", "STRINGID_PKMNEVADEDATTACK", "STRINGID_PKMNMAKESGROUNDMISS", "STRINGID_PKMNPREVENTSCONFUSIONWITH",
                 "STRINGID_PKMNPREVENTSPARALYSISWITH", "STRINGID_PKMNPREVENTSPOISONINGWITH", "STRINGID_PKMNPREVENTSROMANCEWITH", "STRINGID_PKMNPREVENTSSTATLOSSWITH",
                 "STRINGID_PKMNPREVENTSUSAGE", "STRINGID_PKMNPROTECTEDBY", "STRINGID_PKMNPROTECTEDBYMIST", "STRINGID_PKMNPROTECTEDITSELF", "STRINGID_PKMNPROTECTEDITSELF2",
                 "STRINGID_PKMNSXBLOCKSY", "STRINGID_PKMNSXBLOCKSY2", "STRINGID_PKMNSXHADNOEFFECTONY", "STRINGID_PKMNSXMADEITINEFFECTIVE", "STRINGID_PKMNSXMADEYINEFFECTIVE",
                 "STRINGID_PKMNSXMADEYUSELESS", "STRINGID_PKMNSXPREVENTSBURNS", "STRINGID_PKMNSXPREVENTSYLOSS", "STRINGID_PKMNSXPREVENTSYSZ", "STRINGID_PKMNUNAFFECTED",
                 "STRINGID_PKMNWASNTAFFECTED", "STRINGID_STATSWONTDECREASE", "STRINGID_STATSWONTDECREASE2", "STRINGID_STATSWONTINCREASE", "STRINGID_STATSWONTINCREASE2"}
# Script labels (prefix match, without "BattleScript_") whose events belong to the end of the turn or to a switch, not to the last move used.
BOUNDARY_PREFIXES = ("RainContinuesOrEnds", "DamagingWeather", "SandStormHailEnds", "SunlightContinues", "SunlightFaded", "SideStatusWoreOff", "SafeguardEnds",
                     "LeechSeedTurn", "PoisonTurnDmg", "BurnTurnDmg", "DoStatusTurnDmg", "DoTurnDmg", "NightmareTurnDmg", "CurseTurnDmg", "WrapTurnDmg", "WrapEnds",
                     "PerishSongTakesLife", "PerishSongCountGoesDown", "WishComesTrue", "WishButFullHp", "IngrainTurnHeal", "MonTookFutureAttack", "CheckDoomDesireMiss",
                     "FutureAttack", "FutureHitAnim", "DoFutureAttackHit", "DisabledNoMore", "EncoredNoMore", "YawnMakesAsleep", "ShedSkinActivates", "SpeedBoostActivates",
                     "RainDishActivates", "ItemHealHP_End2", "BerryCurePrlzEnd2", "BerryCurePsnEnd2", "BerryCureBrnEnd2", "BerryCureFrzEnd2", "BerryCureSlpEnd2",
                     "BerryCureConfusionEnd2", "BerryCureChosenStatusEnd2", "WhiteHerbEnd2", "BerryPPHealEnd2", "BerryConfuseHealEnd2", "BerryStatRaiseEnd2",
                     "BerryFocusEnergyEnd2", "PrintUproarOverTurns", "ActionSwitch", "DoSwitchOut", "PursuitSwitchDmg", "PursuitDmgOnSwitchOut", "FaintedMonSendOutNew",
                     "FaintedMonTryChoose", "HandleFaintedMon", "FrontierTrainerBattleWon", "LocalBattleLost", "MoveUsedIs", "MoveUsedWokeUp", "MoveUsedUnfroze",
                     "MoveUsedFlinched", "MoveUsedMustRecharge", "MoveUsedLoafingAround", "IntimidateActivates", "DrizzleActivates", "SandstreamActivates", "DroughtActivates",
                     "TraceActivates", "SpikesOn", "PrintHurtBySpikes", "BideStoringEnergy", "FocusPunchSetUp", "NoMovesLeft")

FLINCH_EFFECTS = {"EFFECT_FLINCH_HIT", "EFFECT_FLINCH_MINIMIZE_HIT", "EFFECT_TWISTER", "EFFECT_SKY_ATTACK", "EFFECT_SNORE", "EFFECT_FAKE_OUT"}
# effect -> what must be seen in the move's span for its added effect to count: a label prefix, "stat-target" / "stat-user", or "flinch" (seen later in the turn)
SECONDARY = {
    "EFFECT_PARALYZE_HIT": "MoveEffectParalysis", "EFFECT_THUNDER": "MoveEffectParalysis", "EFFECT_BURN_HIT": "MoveEffectBurn", "EFFECT_BLAZE_KICK": "MoveEffectBurn",
    "EFFECT_THAW_HIT": "MoveEffectBurn", "EFFECT_FREEZE_HIT": "MoveEffectFreeze", "EFFECT_BLIZZARD": "MoveEffectFreeze", "EFFECT_POISON_HIT": "MoveEffectPoison",
    "EFFECT_TWINEEDLE": "MoveEffectPoison", "EFFECT_POISON_TAIL": "MoveEffectPoison", "EFFECT_POISON_FANG": "MoveEffectToxic", "EFFECT_CONFUSE_HIT": "MoveEffectConfusion",
    "EFFECT_TRI_ATTACK": ("MoveEffectParalysis", "MoveEffectBurn", "MoveEffectFreeze"),
    "EFFECT_ATTACK_DOWN_HIT": "stat-target", "EFFECT_DEFENSE_DOWN_HIT": "stat-target", "EFFECT_SPEED_DOWN_HIT": "stat-target", "EFFECT_SPECIAL_ATTACK_DOWN_HIT": "stat-target",
    "EFFECT_SPECIAL_DEFENSE_DOWN_HIT": "stat-target", "EFFECT_ACCURACY_DOWN_HIT": "stat-target", "EFFECT_DEFENSE_UP_HIT": "stat-user", "EFFECT_ATTACK_UP_HIT": "stat-user",
    "EFFECT_ALL_STATS_UP_HIT": "stat-user", "EFFECT_SECRET_POWER": "any-added",
    **{e: "flinch" for e in FLINCH_EFFECTS},
}
RECOIL_EFFECTS = {"EFFECT_RECOIL", "EFFECT_DOUBLE_EDGE"}
PINCH = {"ABILITY_OVERGROW": "TYPE_GRASS", "ABILITY_BLAZE": "TYPE_FIRE", "ABILITY_TORRENT": "TYPE_WATER", "ABILITY_SWARM": "TYPE_BUG"}
TYPE_POWER = {f"HOLD_EFFECT_{t[5:]}_POWER": t for t in TYPES}
# hit effects whose added status a defender's ability blocks without a message (SetMoveEffect returns before any script)
SILENT_BLOCK = {"ABILITY_LIMBER": {"EFFECT_PARALYZE_HIT", "EFFECT_THUNDER", "EFFECT_TRI_ATTACK"}, "ABILITY_IMMUNITY": {"EFFECT_POISON_HIT", "EFFECT_POISON_FANG", "EFFECT_POISON_TAIL", "EFFECT_TWINEEDLE"},
                "ABILITY_WATER_VEIL": {"EFFECT_BURN_HIT", "EFFECT_BLAZE_KICK", "EFFECT_THAW_HIT", "EFFECT_TRI_ATTACK"},
                "ABILITY_MAGMA_ARMOR": {"EFFECT_FREEZE_HIT", "EFFECT_BLIZZARD", "EFFECT_TRI_ATTACK"}, "ABILITY_OWN_TEMPO": {"EFFECT_CONFUSE_HIT"},
                "ABILITY_INNER_FOCUS": FLINCH_EFFECTS - {"EFFECT_FAKE_OUT"}}

# label prefix -> abilities it is evidence for (the one an active Pokemon has is credited)
ABILITY_LABELS = {
    "DrizzleActivates": ["ABILITY_DRIZZLE"], "SandstreamActivates": ["ABILITY_SAND_STREAM"], "DroughtActivates": ["ABILITY_DROUGHT"], "SpeedBoostActivates": ["ABILITY_SPEED_BOOST"],
    "TraceActivates": ["ABILITY_TRACE"], "RainDishActivates": ["ABILITY_RAIN_DISH"], "ShedSkinActivates": ["ABILITY_SHED_SKIN"], "WeatherFormChanges": ["ABILITY_FORECAST"],
    "CastformChange": ["ABILITY_FORECAST"], "DoCastformChange": ["ABILITY_FORECAST"], "IntimidateActivates": ["ABILITY_INTIMIDATE"], "SturdyPreventsOHKO": ["ABILITY_STURDY"],
    "DampStopsExplosion": ["ABILITY_DAMP"], "MoveHPDrain": ["ABILITY_VOLT_ABSORB", "ABILITY_WATER_ABSORB"], "MonMadeMoveUseless": ["ABILITY_VOLT_ABSORB", "ABILITY_WATER_ABSORB"],
    "FlashFireBoost": ["ABILITY_FLASH_FIRE"], "AbilityPreventsPhasingOut": ["ABILITY_SUCTION_CUPS"], "AbilityNoStatLoss": ["ABILITY_CLEAR_BODY", "ABILITY_WHITE_SMOKE"],
    "AbilityNoSpecificStatLoss": ["ABILITY_HYPER_CUTTER", "ABILITY_KEEN_EYE"], "BRNPrevention": ["ABILITY_WATER_VEIL"], "PRLZPrevention": ["ABILITY_LIMBER"],
    "PSNPrevention": ["ABILITY_IMMUNITY"], "ObliviousPreventsAttraction": ["ABILITY_OBLIVIOUS"], "FlinchPrevention": ["ABILITY_INNER_FOCUS"], "OwnTempoPrevents": ["ABILITY_OWN_TEMPO"],
    "TeeterDanceOwnTempoPrevents": ["ABILITY_OWN_TEMPO"], "SoundproofProtected": ["ABILITY_SOUNDPROOF"], "StickyHoldActivates": ["ABILITY_STICKY_HOLD"],
    "NoItemSteal": ["ABILITY_STICKY_HOLD"], "ColorChangeActivates": ["ABILITY_COLOR_CHANGE"], "RoughSkinActivates": ["ABILITY_ROUGH_SKIN"], "CuteCharmActivates": ["ABILITY_CUTE_CHARM"],
    "SynchronizeActivates": ["ABILITY_SYNCHRONIZE"], "MoveUsedLoafingAround": ["ABILITY_TRUANT"], "ImmunityProtected": ["ABILITY_IMMUNITY"], "LimberProtected": ["ABILITY_LIMBER"],
    "WaterVeilPrevents": ["ABILITY_WATER_VEIL"], "CantMakeAsleep": ["ABILITY_INSOMNIA", "ABILITY_VITAL_SPIRIT"], "RestCantSleep": ["ABILITY_INSOMNIA", "ABILITY_VITAL_SPIRIT"],
    "PrintBankAbilityMadeIneffective": ["ABILITY_INSOMNIA", "ABILITY_VITAL_SPIRIT"], "PrintAbilityMadeIneffective": ["ABILITY_INSOMNIA", "ABILITY_VITAL_SPIRIT"],
    "AbsorbLiquidOoze": ["ABILITY_LIQUID_OOZE"], "LeechSeedTurnPrintLiquidOoze": ["ABILITY_LIQUID_OOZE"],
}
ITEM_LABEL_PREFIXES = ("BerryCure", "WhiteHerb", "ItemHealHP", "BerryPPHeal", "FocusBandActivates", "BerryConfuseHeal", "BerryStatRaise", "BerryFocusEnergy")
# label prefix -> situation row
SITUATION_LABELS = {
    "BurnTurnDmg": "status:burn:end-turn-damage", "LeechSeedTurnDrain": "volatile:leech-seed:end-turn-drain",
    "NightmareTurnDmg": "volatile:nightmare:end-turn-damage", "CurseTurnDmg": "volatile:curse:end-turn-damage", "WrapTurnDmg": "volatile:wrap:end-turn-damage",
    "WrapEnds": "volatile:wrap:ends", "PerishSongCountGoesDown": "volatile:perish-song:count", "PerishSongTakesLife": "volatile:perish-song:faint",
    "WishComesTrue": "field:wish:comes-true", "WishButFullHp": "field:wish:full-hp", "IngrainTurnHeal": "volatile:ingrain:end-turn-heal",
    "DoFutureAttackHit": "field:future-sight:hits", "FutureAttackMiss": "field:future-sight:misses", "DisabledNoMore": "volatile:disable:ends", "EncoredNoMore": "volatile:encore:ends",
    "YawnMakesAsleep": "volatile:yawn:sleep", "SunlightContinues": "weather:sun:continues", "SunlightFaded": "weather:sun:ends", "SandStormHailEnds": "weather:sand-or-hail:ends",
    "SafeguardEnds": "screen:safeguard:ends", "PrintUproarOverTurns": "volatile:uproar:turn", "MonWokeUpInUproar": "volatile:uproar:wakes",
    "MoveUsedIsAsleep": "status:sleep:cannot-move", "MoveUsedWokeUp": "status:sleep:wakes", "MoveUsedIsFrozen": "status:freeze:cannot-move", "MoveUsedUnfroze": "status:freeze:thaws",
    "DefrostedViaFireMove": "status:freeze:thawed-by-fire-move", "MoveUsedIsParalyzed": "status:paralysis:cannot-move", "MoveUsedFlinched": "volatile:flinch:cannot-move",
    "MoveUsedIsConfusedNoMore": "volatile:confusion:ends", "DoSelfConfusionDmg": "volatile:confusion:hits-itself", "MoveUsedIsInLoveCantAttack": "volatile:infatuation:cannot-move",
    "MoveUsedIsInLove": "volatile:infatuation:turn", "MoveUsedMustRecharge": "volatile:recharge:turn", "MoveUsedIsDisabled": "volatile:disable:blocks-chosen-move",
    "MoveUsedIsTaunted": "volatile:taunt:blocks-chosen-move", "MoveUsedIsImprisoned": "volatile:imprison:blocks-chosen-move", "MoveUsedIsTormented": "volatile:torment:blocks-chosen-move",
    "ThrashConfuses": "volatile:rampage:confuses", "RageIsBuilding": "volatile:rage:builds", "BideStoringEnergy": "volatile:bide:stores", "BideAttack": "volatile:bide:attacks",
    "SpikesOn": "entry:spikes-damage", "PursuitDmgOnSwitchOut": "switch:pursuit-hits-the-switch", "PursuitSwitchDmg": "switch:pursuit-hits-the-switch",
    "SuccessForceOut": "switch:forced-out-by-roar", "TrainerBattleForceOut": "switch:forced-out-by-roar", "DestinyBondTakesLife": "volatile:destiny-bond:takes-life",
    "GrudgeTakesPP": "volatile:grudge:takes-pp", "MagicCoatBounce": "volatile:magic-coat:bounces", "SnatchedMove": "volatile:snatch:steals", "EnduredMsg": "volatile:endure:holds",
    "SubstituteFade": "volatile:substitute:breaks", "FocusPunchSetUp": "volatile:focus-punch:tightens", "MoveEffectSleep": "status:sleep:inflicted", "MoveEffectPoison": "status:poison:inflicted",
    "MoveEffectToxic": "status:toxic:inflicted", "MoveEffectBurn": "status:burn:inflicted", "MoveEffectFreeze": "status:freeze:inflicted", "MoveEffectParalysis": "status:paralysis:inflicted",
    "MoveEffectConfusion": "volatile:confusion:inflicted", "MoveEffectWrap": "volatile:wrap:inflicted", "IntimidateActivates": "entry:intimidate", "KnockedOff": "item:knocked-off",
    "ItemSteal": "item:stolen", "SafeguardProtected": "screen:safeguard:blocks-status", "MistProtected": "screen:mist:blocks-stat-drop", "RapidSpinAway": "field:rapid-spin:clears",
    "MoveUsedIsConfused": "volatile:confusion:turn", "NoMovesLeft": "move:forced-struggle",
}
SITUATION_ROWS = sorted(set(SITUATION_LABELS.values()) | {
    "status:poison:end-turn-damage",
    "switch:voluntary", "switch:forced-replacement", "switch:natural-cure-on-switch-out", "switch:baton-pass-passes-stages", "switch:refused:wrap", "switch:refused:mean-look",
    "switch:refused:ingrain", "switch:refused:shadow-tag", "switch:refused:arena-trap", "switch:refused:magnet-pull", "move-refused:no-pp", "move-refused:disable", "move-refused:torment",
    "move-refused:taunt", "move-refused:imprison", "move-refused:choice-band", "status:toxic:end-turn-damage", "weather:rain:continues", "weather:rain:ends", "weather:sandstorm:damage",
    "weather:hail:damage", "weather:rain:started-by-move", "weather:sun:started-by-move", "weather:sandstorm:started-by-move", "weather:hail:started-by-move",
    "screen:reflect:halves-a-hit", "screen:light-screen:halves-a-hit", "screen:reflect:ends", "screen:light-screen:ends", "screen:mist:ends", "outcome:player-won", "outcome:player-lost",
    "outcome:draw", "move:critical-hit", "move:super-effective", "move:not-very-effective", "move:multi-turn-forced-continuation", "move:forced-encore",
})
# abilities / hold effects with no battle effect in a Factory singles trainer battle (the "none" rows); see docs/parity-mac/tally.md for the source lines
NO_EFFECT = {
    "ability:ABILITY_ILLUMINATE": "field ability only (wild encounter rate)", "ability:ABILITY_PICKUP": "after-battle item pick-up; not in a Frontier battle",
    "ability:ABILITY_RUN_AWAY": "fleeing from a wild battle only", "ability:ABILITY_STENCH": "field ability only (wild encounter rate)",
    "ability:ABILITY_PLUS": "needs a partner with Minus on the field (doubles)", "ability:ABILITY_MINUS": "needs a partner with Plus on the field (doubles)",
    "ability:ABILITY_LIGHTNING_ROD": "redirects Electric moves to itself in doubles; no effect in singles (Gen 3)",
}


def pool_rows():
    mons = json.loads((GEN / "battle-frontier-mons.json").read_text())["entries"]
    items = {r["itemTableId"]: r for r in json.loads((GEN / "battle-frontier-held-items.json").read_text())["entries"]}
    rows = set()
    for i in POOL:
        s = mons[i]
        for mv in s["moves"]:
            if mv != "MOVE_NONE":
                rows.add("move:" + MOVE_BY_NAME[mv]["effect"])
        for a in SPECIES[s["species"]]["abilities"]:
            if a != "ABILITY_NONE":
                rows.add("ability:" + a)
        he = items[s["itemTableId"]]["holdEffect"]
        if he != "HOLD_EFFECT_NONE":
            rows.add("hold:" + he)
    return rows | {"situation:" + r for r in SITUATION_ROWS}


def tally_battle(facts):
    """{row: count} for one matching battle. move rows come back as "move:EFFECT_X#used" / "#worked" / "#secondary"."""
    hits = collections.Counter()
    hit = lambda row, n=1: hits.__setitem__(row, hits[row] + n)

    # --- decisions and the wide state at each of them ---
    for i, d in enumerate(facts["decisions"]):
        w = facts["wide"][i]
        me, foe = w["battlers"][0], w["battlers"][1]
        if d["kind"] == "switch":
            hit("situation:switch:voluntary" if d.get("voluntary") else "situation:switch:forced-replacement")
        elif d["kind"] == "switch-refused":
            types = [TYPES[t] for t in me["types"]]
            if me["status2"] & STATUS2_WRAPPED:
                hit("situation:switch:refused:wrap")
            if me["status2"] & STATUS2_ESCAPE_PREVENTION:
                hit("situation:switch:refused:mean-look")
            if me["status3"] & STATUS3_ROOTED:
                hit("situation:switch:refused:ingrain")
            if not (me["status2"] & (STATUS2_WRAPPED | STATUS2_ESCAPE_PREVENTION) or me["status3"] & STATUS3_ROOTED):
                if ability(foe["ability"]) == "ABILITY_SHADOW_TAG":
                    hit("situation:switch:refused:shadow-tag"); hit("ability:ABILITY_SHADOW_TAG")
                elif ability(foe["ability"]) == "ABILITY_ARENA_TRAP" and "TYPE_FLYING" not in types and ability(me["ability"]) != "ABILITY_LEVITATE":
                    hit("situation:switch:refused:arena-trap"); hit("ability:ABILITY_ARENA_TRAP")
                elif ability(foe["ability"]) == "ABILITY_MAGNET_PULL" and "TYPE_STEEL" in types:
                    hit("situation:switch:refused:magnet-pull"); hit("ability:ABILITY_MAGNET_PULL")
                else:
                    hit("situation:switch:refused:unclassified")
        elif d["kind"] == "move-refused":
            slot, move = d["slot"], me["moves"][d["slot"]]
            choiced = hold_effect(me["item"]) == "HOLD_EFFECT_CHOICE_BAND"
            if me["pp"][slot] == 0:
                hit("situation:move-refused:no-pp")
            elif me["disabledMove"] == move:
                hit("situation:move-refused:disable")
            elif me["tauntTimer"] and MOVES[move]["power"] == 0:
                hit("situation:move-refused:taunt")
            elif me["status2"] & STATUS2_TORMENT and not choiced:
                hit("situation:move-refused:torment")
            elif foe["status3"] & STATUS3_IMPRISONED_OTHERS and move in foe["moves"]:
                hit("situation:move-refused:imprison")
            elif choiced:
                hit("situation:move-refused:choice-band"); hit("hold:HOLD_EFFECT_CHOICE_BAND")
            else:
                hit("situation:move-refused:torment" if me["status2"] & STATUS2_TORMENT else "situation:move-refused:unclassified")
        elif d["kind"] == "move" and d.get("forced"):
            hit("situation:move:forced-encore" if me["encoredMove"] else "situation:move:multi-turn-forced-continuation")
    # battle-start entry abilities are before the first recorded turn: read them from the first wide state
    if facts["wide"]:
        w0 = facts["wide"][0]["battlers"]
        for b in (0, 1):
            if ability(w0[b]["ability"]) == "ABILITY_INTIMIDATE" and w0[1 - b]["statStages"][1] < 6:
                hit("ability:ABILITY_INTIMIDATE"); hit("situation:entry:intimidate")
            side = "player" if b == 0 else "opponent"
            start = facts["parties"][side][w0[b]["partyIndex"]]["ability"]
            if ability(start) == "ABILITY_TRACE" and w0[b]["ability"] != start:
                hit("ability:ABILITY_TRACE")

    # --- the turns ---
    for chunk in facts.get("turnEvents", []):
        before, wide = chunk.get("battlersBefore"), chunk.get("wideBefore")
        if not before or not wide:
            continue
        cur = [dict(ability=ability(b["ability"]), item=b["item"], types=list(b["types"]), status1=b["status1"], hp=b["hp"], maxHp=b["maxHP"], species=b["species"],
                    statStages=list(b["statStages"]), speed=b["speed"], partyIndex=b["partyIndex"], status2=b["status2"]) for b in before[:2]]
        weather = next((name for name, bits in WEATHER.items() if wide["weather"] & bits), None)
        sides = [wide["sides"][0]["status"], wide["sides"][1]["status"]]
        spans, span, last_label, run_items, poison_pending = [], None, None, None, False
        for b in (0, 1):
            if cur[b]["ability"] == "ABILITY_CLOUD_NINE" and weather:
                hit("ability:ABILITY_CLOUD_NINE")

        def close(s):
            if s is None:
                return
            mv = MOVES.get(s["move"])
            if mv is None or s["move"] == 0:
                return
            effect, a, t = mv["effect"], s["a"], s["t"]
            row = "move:" + effect
            hit(row + "#used")
            worked = not s["failed"]
            if worked:
                hit(row + "#worked")
            need = SECONDARY.get(effect)
            if need and worked:
                if need == "stat-target":
                    ok = any(b == s["target"] for b, _ in s["stats"])
                elif need == "stat-user":
                    ok = any(b == s["attacker"] for b, _ in s["stats"])
                elif need == "any-added":
                    ok = bool(s["stats"] or s["statuses"] or any(l.startswith("MoveEffect") for l in s["labels"]))
                elif need == "flinch":
                    ok = False  # credited when the target's flinch is seen (below)
                else:
                    ok = any(l.startswith(need) for l in s["labels"])
                if ok:
                    hit(row + "#secondary")
            if s["crit"]:
                hit("situation:move:critical-hit")
            if "STRINGID_SUPEREFFECTIVE" in s["messages"]:
                hit("situation:move:super-effective")
            if "STRINGID_NOTVERYEFFECTIVE" in s["messages"]:
                hit("situation:move:not-very-effective")
            mtype, physical = mv["type"], mv["type"] in PHYSICAL
            aimed = "MOVE_TARGET_USER" not in mv["target"]
            he_a, he_t = hold_effect(a["item"]), hold_effect(t["item"])
            if aimed and t["ability"] == "ABILITY_PRESSURE":
                hit("ability:ABILITY_PRESSURE")
            if aimed and mv["accuracy"] > 0:
                if a["ability"] == "ABILITY_COMPOUND_EYES":
                    hit("ability:ABILITY_COMPOUND_EYES")
                if a["ability"] == "ABILITY_HUSTLE" and physical:
                    hit("ability:ABILITY_HUSTLE")
                if t["ability"] == "ABILITY_SAND_VEIL" and weather == "sandstorm":
                    hit("ability:ABILITY_SAND_VEIL")
                if he_t == "HOLD_EFFECT_EVASION_UP":
                    hit("hold:HOLD_EFFECT_EVASION_UP")
            if mtype == "TYPE_GROUND" and t["ability"] == "ABILITY_LEVITATE" and "STRINGID_PKMNMAKESGROUNDMISS" in s["messages"]:
                hit("ability:ABILITY_LEVITATE")
            if s["damage"]:
                if t["ability"] in ("ABILITY_BATTLE_ARMOR", "ABILITY_SHELL_ARMOR"):
                    hit("ability:" + t["ability"])
                if physical and a["ability"] in ("ABILITY_HUGE_POWER", "ABILITY_PURE_POWER", "ABILITY_HUSTLE"):
                    hit("ability:" + a["ability"])
                if physical and a["ability"] == "ABILITY_GUTS" and a["status1"]:
                    hit("ability:ABILITY_GUTS")
                if physical and t["ability"] == "ABILITY_MARVEL_SCALE" and t["status1"]:
                    hit("ability:ABILITY_MARVEL_SCALE")
                if PINCH.get(a["ability"]) == mtype and a["hp"] * 3 <= a["maxHp"]:
                    hit("ability:" + a["ability"])
                if t["ability"] == "ABILITY_THICK_FAT" and mtype in ("TYPE_FIRE", "TYPE_ICE"):
                    hit("ability:ABILITY_THICK_FAT")
                if mv["secondaryEffectChance"] > 0:
                    if a["ability"] == "ABILITY_SERENE_GRACE":
                        hit("ability:ABILITY_SERENE_GRACE")
                    if t["ability"] == "ABILITY_SHIELD_DUST" and need not in ("stat-user", None):
                        hit("ability:ABILITY_SHIELD_DUST")
                if effect in SILENT_BLOCK.get(t["ability"], ()):
                    hit("ability:" + t["ability"])
                if a["ability"] == "ABILITY_ROCK_HEAD" and effect in RECOIL_EFFECTS and "STRINGID_PKMNHITWITHRECOIL" not in s["messages"]:
                    hit("ability:ABILITY_ROCK_HEAD")
                if TYPE_POWER.get(he_a) == mtype:
                    hit("hold:" + he_a)
                if he_a == "HOLD_EFFECT_CHOICE_BAND" and physical:
                    hit("hold:HOLD_EFFECT_CHOICE_BAND")
                if he_a == "HOLD_EFFECT_SCOPE_LENS":
                    hit("hold:HOLD_EFFECT_SCOPE_LENS")
                if he_a == "HOLD_EFFECT_THICK_CLUB" and a["species"] in (SPECIES_ID.get("SPECIES_CUBONE"), SPECIES_ID.get("SPECIES_MAROWAK")) and physical:
                    hit("hold:HOLD_EFFECT_THICK_CLUB")
                if he_a == "HOLD_EFFECT_STICK" and a["species"] == SPECIES_ID.get("SPECIES_FARFETCHD"):
                    hit("hold:HOLD_EFFECT_STICK")
                if he_t == "HOLD_EFFECT_DEEP_SEA_SCALE" and t["species"] == SPECIES_ID.get("SPECIES_CLAMPERL") and not physical:
                    hit("hold:HOLD_EFFECT_DEEP_SEA_SCALE")
                if physical and sides[s["target"]] & SIDE_REFLECT and not s["crit"]:
                    hit("situation:screen:reflect:halves-a-hit")
                if not physical and sides[s["target"]] & SIDE_LIGHTSCREEN and not s["crit"]:
                    hit("situation:screen:light-screen:halves-a-hit")
                if mv["flags"] and "FLAG_MAKES_CONTACT" in mv["flags"] and any(b == s["attacker"] and st for b, st in s["statuses"]) \
                        and t["ability"] in ("ABILITY_STATIC", "ABILITY_POISON_POINT", "ABILITY_FLAME_BODY", "ABILITY_EFFECT_SPORE"):
                    hit("ability:" + t["ability"])
            if worked and effect == "EFFECT_BATON_PASS" and (any(v != 6 for v in a["statStages"][1:]) or a["status2"] & 0x1F000007):
                hit("situation:switch:baton-pass-passes-stages")
            if worked and effect in ("EFFECT_RAIN_DANCE", "EFFECT_SUNNY_DAY", "EFFECT_SANDSTORM", "EFFECT_HAIL"):
                hit("situation:weather:" + {"EFFECT_RAIN_DANCE": "rain", "EFFECT_SUNNY_DAY": "sun", "EFFECT_SANDSTORM": "sandstorm", "EFFECT_HAIL": "hail"}[effect] + ":started-by-move")
            spans.append(s)

        for ev in chunk["events"]:
            kind, label = ev.get("kind"), (ev.get("label") or "").replace("BattleScript_", "")
            new_run = label != last_label
            if new_run:
                last_label = label
                run_items = [cur[0]["item"], cur[1]["item"]]
                if label.startswith(BOUNDARY_PREFIXES):
                    close(span); span = None
                for prefix, row in SITUATION_LABELS.items():
                    if label.startswith(prefix):
                        hit("situation:" + row)
                        break
                poison_pending = poison_pending or label.startswith("PoisonTurnDmg")
                for prefix, names in ABILITY_LABELS.items():
                    if label.startswith(prefix):
                        owners = [n for n in names if n in (cur[0]["ability"], cur[1]["ability"])]
                        for n in owners or names[:1]:
                            hit("ability:" + n)
                        break
                # the attack canceler's messages carry the attacker in their action snapshot (scriptingBattler is not it)
                canceled = (ev.get("actionSnapshot") or {}).get("attacker", ev.get("battler"))
                if label.startswith("MoveUsedIsAsleep") or label.startswith("MoveUsedWokeUp"):
                    b = canceled
                    if b in (0, 1) and cur[b]["ability"] == "ABILITY_EARLY_BIRD":
                        hit("ability:ABILITY_EARLY_BIRD")
                if label.startswith("MoveUsedFlinched"):
                    # the flinch came from the last move that hit this Pokemon this turn: its own flinch effect, or the attacker's King's Rock
                    b = canceled
                    src = next((s for s in reversed(spans) if s["target"] == b), None) if b in (0, 1) else None
                    if src is not None:
                        eff = MOVES[src["move"]]["effect"]
                        if eff in FLINCH_EFFECTS:
                            hit("move:" + eff + "#secondary")
                        elif hold_effect(src["a"]["item"]) == "HOLD_EFFECT_FLINCH":
                            hit("hold:HOLD_EFFECT_FLINCH")
                if label.startswith("DamagingWeatherLoop") and weather in ("sandstorm", "hail") and kind in ("hp-change", "health-bar-update", "message"):
                    hit(f"situation:weather:{weather}:damage")
                if label.startswith("RainContinuesOrEnds"):
                    hit("situation:weather:rain:ends" if ev.get("messageId") == "STRINGID_RAINSTOPPED" else "situation:weather:rain:continues")
                if label.startswith("SideStatusWoreOff"):
                    name = " ".join(str(x) for x in ev.get("substitutions", [])).upper()
                    hit("situation:screen:" + ("reflect" if "REFLECT" in name else "light-screen" if "LIGHT" in name else "mist" if "MIST" in name else "unknown") + ":ends")
            if poison_pending and kind == "hp-change" and ev.get("battler") in (0, 1):
                # the poison line names no battler; the HP change after it does
                hit("situation:status:toxic:end-turn-damage" if cur[ev["battler"]]["status1"] & STATUS1_TOXIC else "situation:status:poison:end-turn-damage")
                poison_pending = False
            if label.startswith(ITEM_LABEL_PREFIXES) and run_items is not None:
                b = ev.get("battler")
                if b in (0, 1):
                    he = hold_effect(run_items[b])
                    if he != "HOLD_EFFECT_NONE":
                        hit("hold:" + he)
                    run_items = None  # one credit per run
            if kind == "message" and ev.get("messageId") == "STRINGID_USEDMOVE":
                close(span)
                snap = ev.get("actionSnapshot") or {}
                atk = snap.get("attacker", ev.get("scriptingBattler", 0))
                span = dict(attacker=atk, target=1 - atk, move=snap.get("currentMove", 0), a=dict(cur[atk]), t=dict(cur[1 - atk]), labels=set(), messages=set(),
                            failed=False, damage=0, crit=False, stats=[], statuses=[])
            elif span is not None:
                span["labels"].add(label)
                if kind == "message":
                    span["messages"].add(ev.get("messageId"))
                    # "protected itself" is Protect's own success line when the user's span shows it; in the other Pokemon's span it is that move's failure
                    own_protect = ev.get("messageId", "").startswith("STRINGID_PKMNPROTECTEDITSELF") and MOVES.get(span["move"], {}).get("effect") == "EFFECT_PROTECT"
                    if ev.get("messageId") in FAIL_MESSAGES and not own_protect:
                        span["failed"] = True
                    if ev.get("messageId") == "STRINGID_CRITICALHIT":
                        span["crit"] = True
                if kind == "hp-change" and ev["battler"] == span["target"] and ev["to"] < ev["from"]:
                    span["damage"] += ev["from"] - ev["to"]
                if kind == "stat-stage-change":
                    span["stats"].append((ev["battler"], ev.get("stat")))
                if kind == "set-battler-status-data":
                    span["statuses"].append((ev["battler"], ev["status1"]))
            # tracked state
            b = ev.get("battler")
            if kind == "hp-change" and b in (0, 1):
                cur[b]["hp"] = ev["to"]
            elif kind == "set-battler-status-data" and b in (0, 1):
                cur[b]["status1"] = ev["status1"]
            elif kind == "set-battler-item" and b in (0, 1):
                cur[b]["item"] = ev["item"]
            elif kind == "stat-stage-change" and b in (0, 1):
                pass
            elif kind == "switch":
                side = 0 if ev.get("side") == "player" else 1
                out = cur[side]
                if out["ability"] == "ABILITY_NATURAL_CURE" and out["status1"] and out["hp"] > 0:
                    hit("ability:ABILITY_NATURAL_CURE"); hit("situation:switch:natural-cure-on-switch-out")
                to = ev.get("toPartyIndex")
                static = facts["parties"]["player" if side == 0 else "opponent"][to]
                member = wide["parties"][side][to]
                cur[side] = dict(ability=ability(static["ability"]), item=member["item"], types=[TYPES[x] for x in static["types"]], status1=member["status1"], hp=member["hp"],
                                 maxHp=member["hp"], species=static["species"], statStages=[6] * 8, speed=0, partyIndex=to, status2=0)
        close(span)
        # turn-order effects: both Pokemon used a move this turn
        movers = [s for s in spans if MOVES[s["move"]]["effect"] != "EFFECT_PURSUIT" or True]
        if len(movers) >= 2 and movers[0]["attacker"] != movers[1]["attacker"]:
            first, second = movers[0], movers[1]
            for s in (first, second):
                ab = s["a"]["ability"]
                if (ab == "ABILITY_SWIFT_SWIM" and weather == "rain") or (ab == "ABILITY_CHLOROPHYLL" and weather == "sun"):
                    hit("ability:" + ab)
            if MOVES[first["move"]]["priority"] == MOVES[second["move"]]["priority"] and hold_effect(first["a"]["item"]) == "HOLD_EFFECT_QUICK_CLAW":
                def speed(x):
                    stage = x["statStages"][3]
                    v = x["speed"] * (2 + max(stage - 6, 0)) // (2 + max(6 - stage, 0))
                    if (x["ability"] == "ABILITY_SWIFT_SWIM" and weather == "rain") or (x["ability"] == "ABILITY_CHLOROPHYLL" and weather == "sun"):
                        v *= 2
                    return v // 4 if x["status1"] & STATUS1_PARALYSIS else v
                if speed(first["a"]) < speed(second["a"]):
                    hit("hold:HOLD_EFFECT_QUICK_CLAW")
    outcome = facts.get("outcome")
    if outcome in (1, 2, 3):
        hit("situation:outcome:" + {1: "player-won", 2: "player-lost", 3: "draw"}[outcome])
    return hits


def covered(row, counts):
    """The count that covers a row: for a move effect, its added effect when it has one, else `worked`."""
    if row.startswith("move:"):
        return counts.get(row + ("#secondary" if SECONDARY.get(row[5:]) else "#worked"), 0)
    return counts.get(row, 0)


def main(argv):
    dirs = [a for a in argv if not a.startswith("--")]
    opt = lambda name: argv[argv.index(name) + 1] if name in argv else None
    total, by_policy, first, battles = collections.Counter(), collections.defaultdict(collections.Counter), {}, collections.Counter()
    for d in dirs:
        for path in sorted(glob.glob(str(Path(d) / "*.facts.json.gz"))):
            with gzip.open(path, "rt") as f:
                facts = json.load(f)
            policy = facts["policy"] + ("+brain" if facts.get("mode") == "factoryBrain" else "")
            battles[facts["policy"]] += 1
            for row, n in tally_battle(facts).items():
                total[row] += n
                by_policy[facts["policy"]][row] += n
                first.setdefault(row, facts["id"])
    rows = pool_rows()
    extra = {r.split("#")[0] for r in total} - rows
    policies = sorted(battles)
    table = []
    for row in sorted(rows | extra):
        table.append({"row": row, "inPool": row in rows, "covered": covered(row, total), "byPolicy": {p: covered(row, by_policy[p]) for p in policies},
                      **({"used": total.get(row + "#used", 0), "worked": total.get(row + "#worked", 0)} if row.startswith("move:") else {}),
                      "note": NO_EFFECT.get(row), "firstBattle": first.get(row) or first.get(row + "#worked") or first.get(row + "#used")})
    result = {"battles": dict(battles), "rows": table}
    zero = [r for r in table if r["inPool"] and r["covered"] == 0 and not r["note"]]
    print(json.dumps({"battles": dict(battles), "rows": len(table), "poolRows": len(rows), "zeroRows": len(zero), "noEffectRows": sum(1 for r in table if r["note"])}))
    if "--zero" in argv:
        for r in zero:
            print("  ZERO", r["row"], f"(used {r.get('used')}, worked {r.get('worked')})" if r["row"].startswith("move:") else "")
    if opt("--out"):
        Path(opt("--out")).write_text(json.dumps(result, indent=1))
    if opt("--md"):
        lines = ["| row | covered | " + " | ".join(policies) + " | used / worked | first battle |", "|---|---|" + "---|" * len(policies) + "---|---|"]
        for r in table:
            lines.append(f"| {r['row']} | {r['note'] or r['covered']} | " + " | ".join(str(r["byPolicy"][p]) for p in policies)
                         + f" | {str(r.get('used', '')) + ' / ' + str(r.get('worked', '')) if 'used' in r else ''} | {r['firstBattle'] or ''} |")
        Path(opt("--md")).write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main(sys.argv[1:])
