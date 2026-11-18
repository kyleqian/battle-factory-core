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
           f"Sandstorm / Dig / Flash / Double Team). The script plays Flash (slot 2) {AI_TURNS} turns, then a Snorlax 826 switch ends the battle. Every AI Metronome call is a draw of one of the "
           f"336 callable moves (1 in 336). {what} Chance per seed about {chance}.")
    return design(f"{rule}-{slug}", [rule], why, 7, [528, 826, 565], [389, 431, 836], [{"prefer": 2}] * AI_TURNS + [{"preferSwitch": 1}], cover(rule), chance)


AI_TURNS = 16
if __name__ == "__main__":
    save(ai_clefable("R050", "ai-clefable-metronome-imprison", "R050: Metronome calls Imprison (it shares Double Team with the Shuckle); the AI's next scoring reads its own Imprison flag.", 0.03))
    save(ai_clefable("R051", "ai-clefable-metronome-mist", "R051: Metronome calls Mist, and Mist is still up when the AI next scores (5 turns).", 0.02))
    save(ai_clefable("R052", "ai-clefable-metronome-mud-sport", "R052: Metronome calls Mud Sport; the AI's next scoring reads the Mud Sport flag.", 0.03))
    save(ai_clefable("R053", "ai-clefable-metronome-focus-energy", "R053: Metronome calls Focus Energy; the AI's next scoring reads its own Focus Energy flag.", 0.03))
