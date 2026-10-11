#!/usr/bin/env python3
"""Live audit 23 (docs/live-audit-23.md): doll-cell labs with species OTHER than doll81 / doll90 / ctl95's, as species-substituted copies of
the doll81 labs (doll81Stage.py's format and traces; lab seed 305419897 pinned in every file, ISSUES #154). The move user keeps slot 0's
moves / EVs / IVs (fast: EV 252 / IV 31 speed), the foe slot 0's (slow, Tackle 33 or Substitute 164); only species + gender change. Every
user here is faster than its foe at L50 (checked by hand: base speed x the template's EVs / IVs / nature). Internal ids, all < 252.
JIGGLYPUFF's foe is WOBBUFFET (Attack 33): a first try with SNORLAX broke the doll with every Tackle, so no Sing played behind it.
Recover LATER bodies (after the swap-back): in the doll81 trace every later Recover fails (the doll absorbs the foe's Tackle, so the user is
at full HP); the `-sandstorm` labs give the foe Sandstorm 201 x4 (a Rock / Steel foe, immune) so the weather chips the user behind the doll
and the later Recovers play (MILTANK: 3 swap bodies).
  self  Double Team 104 (doll81-self-double-team-*) and Recover 105 (doll81-self-recover-*): the subbed ATTACKER swap composite;
  att   Sing 47 opponent (doll81-att-sing-opponent): the subbed ATTACKER swap composite;
  def   Psych Up 244 (doll81-def-psych-up-*): the subbed DEFENDER (the foe's doll), prep38's control / test bodies.
Writes <out>/<name>.json + <out>/list.tsv (doll81's 7 columns: name, MOVE, id, side, user, foe, family).
usage: audit23DollStage.py <out-dir>"""
import copy, json, sys
from pathlib import Path

D81 = Path("tools/integration/fixtures/doll81/scenarios")
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
SP = {"SNEASEL": 215, "MAGCARGO": 219, "TAUROS": 128, "YANMA": 193, "SNORLAX": 143, "MILTANK": 241, "AERODACTYL": 142, "GIRAFARIG": 203,
      "RAICHU": 26, "JIGGLYPUFF": 39, "BUTTERFREE": 12, "PICHU": 172, "STEELIX": 208, "HITMONTOP": 237, "ESPEON": 196, "WOBBUFFET": 202}
FOE_MOVES = {"sandstorm": 201}
FEMALE = {"MILTANK"}
MOVE = {"double-team": ("DOUBLE_TEAM", 104, "self"), "recover": ("RECOVER", 105, "self"), "sing": ("SING", 47, "att"),
        "psych-up": ("PSYCH_UP", 244, "def")}
# (template doll81 lab, move user, foe[, the foe's move x4]); the template's own side is the move user's side
CELLS = [("self-double-team-player", "SNEASEL", "MAGCARGO"), ("self-double-team-player", "TAUROS", "YANMA"),
         ("self-double-team-opponent", "YANMA", "SNORLAX"), ("self-double-team-opponent", "SNEASEL", "MAGCARGO"),
         ("self-recover-player", "MILTANK", "AERODACTYL"), ("self-recover-player", "GIRAFARIG", "MAGCARGO"),
         ("self-recover-opponent", "AERODACTYL", "MAGCARGO"), ("self-recover-opponent", "RAICHU", "SNORLAX"),
         ("att-sing-opponent", "JIGGLYPUFF", "WOBBUFFET"), ("att-sing-opponent", "BUTTERFREE", "PICHU"),
         ("def-psych-up-player", "RAICHU", "STEELIX"), ("def-psych-up-player", "HITMONTOP", "BUTTERFREE"),
         ("def-psych-up-opponent", "ESPEON", "SNORLAX"), ("def-psych-up-opponent", "YANMA", "PICHU"),
         ("self-recover-player", "MILTANK", "AERODACTYL", "sandstorm"), ("self-recover-opponent", "RAICHU", "STEELIX", "sandstorm")]
rows = []
for tmpl, user, foe, *foe_move in CELLS:
    s = json.loads((D81 / f"doll81-{tmpl}.json").read_text())
    assert s["seed"] == 305419897
    side = "player" if tmpl.endswith("-player") else "opponent"
    other = "opponent" if side == "player" else "player"
    P = s["overrides"]["parties"]
    for slot, name in ((P[side][0], user), (P[other][0], foe)):
        slot.update(species=SP[name], gender="female" if name in FEMALE else "male")
    if foe_move:
        P[other][0]["moves"] = [FOE_MOVES[foe_move[0]]] * 4
    key = tmpl.split("-", 1)[1].rsplit("-", 1)[0]
    mv, mid, fam = MOVE[key]
    stem = f"audit23-{tmpl.split('-')[0]}-{key}-{side}-{user.lower()}-{foe.lower()}" + "".join(f"-{m}" for m in foe_move)
    (out / f"{stem}.json").write_text(json.dumps(s) + "\n")
    rows.append(f"{stem}\t{mv}\t{mid}\t{side}\t{user}\t{foe}\t{fam}\n")
(out / "list.tsv").write_text("".join(rows))
print(len(rows), "scenarios")
