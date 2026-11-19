"""luck6: writes the luck-designs of the luck6 step (cwd = workspace/): python3 tools/replay-hunt/makeLuck6.py [OUTDIR] (default tools/replay-hunt/luck-designs).
Markers come from docs/parity-mac/rule-coverage-c-rules.json (the first piece of the rule unless a design names another)."""
import json, os, sys
W = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else W + "/tools/replay-hunt/luck-designs"
rules = {r["id"]: r for r in json.load(open(W + "/docs/parity-mac/rule-coverage-c-rules.json"))}


def cover(rule, pieces=None):
    ps = rules[rule]["pieces"]
    return [{"file": "src/engine/" + p["file"] if "/" not in p["file"] else p["file"], "text": p["cover"]["text"], "at": p["cover"].get("at", 0)} for i, p in enumerate(ps) if pieces is None or i in pieces]


def design(name, rule_ids, why, ch, player, opp, actions, covers, chance, trainer=200, replacements=None):
    ch = int(ch)
    script = {"actions": actions, "then": "census"}
    if replacements:
        script["replacements"] = replacements
    d = {"name": name, "rules": rule_ids, "why": why, "seed": 0, "challengeNum": ch, "battleNum": 0, "trainerId": trainer, "playerSetIds": player,
         "opponentSetIds": opp, "script": script, "expect": [], "cover": covers, "coverAny": True, "chance": chance, "seeds": 200}
    return d


def save(d, outdir=OUT):
    os.makedirs(outdir, exist_ok=True)
    json.dump(d, open(f"{outdir}/{d['name']}.json", "w"), indent=1)
    print("wrote", d["name"])


def ai_clefable(rule, slug, what, chance):
    why = (f"Challenge 7. The AI's Clefable (389: Metronome, Double Team, Reflect, Follow Me; Leftovers) is the foe of the player's Shuckle 528 (Attack 10, cannot hurt it; "
           f"Sandstorm / Dig / Flash / Double Team). The script plays Flash (slot 2) {AI_TURNS} turns, then Salamence 753 (Aerial Ace never misses, so no Double Team stack stalls the end) is switched in and plays Aerial Ace. Every AI Metronome call is a draw of one of the "
           f"336 callable moves (1 in 336). {what} Chance per seed about {chance}.")
    return design(f"{rule}-{slug}", [rule], why, 7, [528, 753, 565], [389, 431, 836], [{"prefer": 2}] * AI_TURNS + [{"preferSwitch": 1}] + [{"prefer": 2}] * 8, cover(rule), chance)


AI_TURNS = 16
if __name__ == "__main__":
    save(ai_clefable("R050", "ai-clefable-metronome-imprison", "R050: Metronome calls Imprison (it shares Double Team with the Shuckle); the AI's next scoring reads its own Imprison flag.", 0.03))
    save(ai_clefable("R051", "ai-clefable-metronome-mist", "R051: Metronome calls Mist, and Mist is still up when the AI next scores (5 turns).", 0.02))
    save(ai_clefable("R052", "ai-clefable-metronome-mud-sport", "R052: Metronome calls Mud Sport; the AI's next scoring reads the Mud Sport flag.", 0.03))
    save(ai_clefable("R053", "ai-clefable-metronome-focus-energy", "R053: Metronome calls Focus Energy; the AI's next scoring reads its own Focus Energy flag.", 0.03))
    save(design("R100-ai-clefable-metronome-weather-ball-cloud-nine", ["R100"],
                "Challenge 7. The AI's Clefable (389) opposite the player's Golduck 418 (Cloud Nine; Light Screen, slot 3, played %d turns; Hydro Pump / Dig are never used) then Salamence 753 (Aerial Ace, never misses). Every AI Metronome call is a draw of one of the 336 callable moves; Weather Ball while Cloud Nine is on the field leaves it a 50-power Normal move (the weather-has-no-effect arm, any weather or none). About 8 AI Metronome calls a battle. Chance per seed about 8/336 = 2.4%%." % AI_TURNS,
                7, [418, 753, 565], [389, 431, 836], [{"prefer": 3}] * AI_TURNS + [{"preferSwitch": 1}] + [{"prefer": 2}] * 8, cover("R100"), 0.02))
    CH1 = dict(ch=1, player=[227, 244, 171], trainer=86)
    save(design("R091-chansey-metronome-transform-then-spite", ["R091"],
                "Challenge 1. The player's Chansey 227 calls Metronome 14 turns (slot 0); the foe is Banette 237 (Night Shade, Will-O-Wisp, Spite, Knock Off). A Metronome call of Transform copies Banette's moves (slot 0 becomes Night Shade, still played with prefer 0); Banette's Spite on the transformed Chansey's last move then takes the PP from the copy only (the party record is untouched). Chance per seed about 11/336 x 0.7 = 2%.",
                opp=[237, 215, 204], actions=[{"prefer": 0}] * 14 + [{"preferSwitch": 1}], covers=cover("R091"), chance=0.02, **CH1))
    save(design("R064-chansey-metronome-transform-ends-encore", ["R064"],
                "Challenge 1. The player's Chansey 227 calls Metronome 14 turns (slot 0); the foe is Minun 187 (Spark, Charm, Encore, Helping Hand; Spark does about 7% of Chansey's HP). The game's Encore keeps the Metronome slot (Metronome is the last move used: battle_script_commands.c:4407); while it holds, a Metronome call of Transform replaces slot 0 and the Encore ends silently at the next end-of-turn check (battle_util.c:1724). Chance per seed about 1%.",
                opp=[187, 215, 204], actions=[{"prefer": 0}] * 14 + [{"preferSwitch": 1}], covers=cover("R064"), chance=0.01, **CH1))
    save(design("R063-chansey-metronome-transform-ends-disable", ["R063"],
                "Challenge 1. The player's Chansey 227 plays Defense Curl (slot 2) once, then Metronome (slot 0) 12 turns; the foe is Wigglytuff 207 (Sing, Disable, Wish, Secret Power). A Disable on the Defense Curl slot (Disable takes the last move used, battle_script_commands.c:4407) and then a Metronome call of Transform replace the disabled slot: the Disable ends silently (battle_util.c:1700). Chance per seed about 0.3%.",
                opp=[207, 215, 204], actions=[{"prefer": 2}] + [{"prefer": 0}] * 12 + [{"preferSwitch": 1}], covers=cover("R063"), chance=0.003, **CH1))
    save(design("R099-chansey-metronome-uproar-yawn", ["R099"],
                "Challenge 1. The player's Chansey 227 calls Metronome 14 turns; the foe is Wartortle 176 (Water Pulse, Bite, Mud Slap, Yawn). Yawn lands, and its sleep tick falls while a Metronome-called Uproar is running (Uproar keeps the drowsy Pokemon awake, battle_util.c:1759). Chance per seed about 0.3%.",
                opp=[176, 215, 204], actions=[{"prefer": 0}] * 14 + [{"preferSwitch": 1}], covers=cover("R099"), chance=0.003, **CH1))
