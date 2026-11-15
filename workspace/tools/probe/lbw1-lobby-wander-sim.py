#!/usr/bin/env python3
"""lbw1: hand simulation of the Lobby woman (WANDER_AROUND) and fat man (LOOK_AROUND) against the ROM probe.

usage: python3 tools/probe/lbw1-lobby-wander-sim.py ROM.json [--order vblank-first|npc-first] [--seed spawn|lock] [--quiet]
ROM.json is the output of tools/probe/lbw1-lobby-wander-rom.py (plain python3, no emulator needed here).

The simulator ports MovementType_WanderAround_Step0-6 / MovementType_LookAround_Step0-4
(reference/pokeemerald/src/event_object_movement.c:2566-2630, 2860-2890), the per-frame sprite-callback loop
(UpdateObjectEventCurrentMovement :4929: while(callback()) unless frozen), the 16-frame WALK_NORMAL step, the
delay counter (SetMovementDelay / WaitForMovementDelay :8532-8543), GetCollisionAtCoords (:4658) with range,
map grid (collision / elevation), and other object events (current + previous tile), and the VBlank Random()
(main.c:366). Inputs it takes from the probe instead of modelling: the per-frame frozen flag, whether the field
callback runs this frame, and the player / static-NPC tiles. After every frame it compares the full 32-bit
gRngValue, the draw counter, and each NPC's tile, previous tile, facing, sTypeFuncId and delay with the probe.
It stops at the first mismatch and prints it. Exit code 0 = every frame matched.
"""
from __future__ import annotations
import json, sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = {a.split("=")[0]: (a.split("=")[1] if "=" in a else True) for a in sys.argv[1:] if a.startswith("--")}
if len(args) != 1:
    raise SystemExit(__doc__)
ORDER = opts.get("--order", "vblank-first")
SEED = opts.get("--seed", "spawn")
QUIET = bool(opts.get("--quiet"))
doc = json.loads(Path(args[0]).read_text())
rows = doc["rows"]
grid = doc["grid"]
by = {r["f"]: r for r in rows}

CB2_OVERWORLD = 0x8085E5D
SOUTH, NORTH, WEST, EAST = 1, 2, 3, 4
STANDARD_DIRECTIONS = [SOUTH, NORTH, WEST, EAST]  # gStandardDirections
DELAYS_MEDIUM = [32, 64, 96, 128]  # sMovementDelaysMedium
WALK_NORMAL_FRAMES = 16  # sStepTimes[MOVE_SPEED_NORMAL]
MASK = 0xFFFFFFFF


class Rng:
    def __init__(self, v):
        self.v = v
        self.draws = 0

    def step(self):
        self.v = (1103515245 * self.v + 24691) & MASK
        self.draws += 1
        return self.v >> 16


def move_coords(d, x, y):
    return {SOUTH: (x, y + 1), NORTH: (x, y - 1), WEST: (x - 1, y), EAST: (x + 1, y)}[d]


def block_at(x, y):
    w, h = grid["width"], grid["height"]
    if 0 <= x < w and 0 <= y < h:
        return grid["blocks"][y * w + x]
    return 0x3FF  # border block: not present in the dump, treated as MAPGRID_UNDEFINED


def collision_at(x, y):
    b = block_at(x, y)
    return 1 if b == 0x3FF else (b >> 10) & 3


def elevation_at(x, y):
    b = block_at(x, y)
    return 0 if b == 0x3FF else b >> 12


class Npc:
    def __init__(self, ev, kind):
        self.kind = kind
        self.slot, self.spr = ev["slot"], ev["spr"]
        self.ini = tuple(ev["ini"])
        self.range = tuple(ev["range"])
        self.elev = ev["elev"]
        self.cur = tuple(ev["ini"])
        self.prv = tuple(ev["ini"])
        self.face = ev["face"] if SEED == "spawn" else ev["face"]
        self.mdir = ev["mdir"]
        self.ty = 0
        self.dl = 0
        self.walk_timer = None  # None = no single movement in flight
        self.action = None  # None | "face" | "walk"
        self.draws = []

    def outside_range(self, x, y):
        rx, ry = self.range
        if rx and (self.ini[0] - rx > x or self.ini[0] + rx < x):
            return True
        if ry and (self.ini[1] - ry > y or self.ini[1] + ry < y):
            return True
        return False

    def collides(self, d, others):
        x, y = move_coords(d, *self.cur)
        if self.outside_range(x, y):
            return 1
        if collision_at(x, y) or block_at(x, y) == 0x3FF:
            return 2
        me = elevation_at(x, y)
        if self.elev != 0 and me not in (0, 15) and me != self.elev:
            return 3
        for o in others:
            if o is self:
                continue
            if (o["cur"] == (x, y) or o["prv"] == (x, y)) and (
                self.elev == 0 or o["elev"] == 0 or self.elev == o["elev"]
            ):
                return 4
        return 0

    def set_direction(self, d):
        self.face = d
        self.mdir = d

    def tick(self, rng, others):
        """One UpdateObjectEventCurrentMovement while(callback()) loop for an unfrozen NPC."""
        guard = 0
        while True:
            guard += 1
            assert guard < 20
            if self.kind == "woman":
                again = self.woman_step(rng, others)
            else:
                again = self.fat_step(rng)
            if not again:
                return

    def face_action(self):
        # MovementAction_Face*_Step0: FaceDirection(): SetObjectEventDirection + ShiftStillObjectEventCoords
        self.set_direction(self.face)
        self.prv = self.cur

    def woman_step(self, rng, others):
        t = self.ty
        if t == 0:
            self.ty = 1
            return True
        if t == 1:
            self.action = "face"
            self.ty = 2
            return True
        if t == 2:
            # ObjectEventExecSingleMovementAction: the face action finishes at once
            self.face_action()
            self.action = None
            r = rng.step()
            self.draws.append(("delay", r))
            self.dl = DELAYS_MEDIUM[r % 4]
            self.ty = 3
            return True
        if t == 3:
            self.dl -= 1
            if self.dl == 0:
                self.ty = 4
                return True
            return False
        if t == 4:
            r = rng.step()
            d = STANDARD_DIRECTIONS[r & 3]
            self.draws.append(("dir", r))
            self.set_direction(d)
            self.ty = 5
            c = self.collides(d, others)
            self.draws.append(("collision", c))
            if c:
                self.ty = 1
            return True
        if t == 5:
            self.action = "walk"
            self.walk_timer = None
            self.ty = 6
            return True
        if t == 6:
            if self.walk_timer is None:  # MovementAction_WalkNormal*_Step0: InitMovementNormal
                self.set_direction(self.mdir)
                nx, ny = move_coords(self.mdir, *self.cur)
                self.prv = self.cur
                self.cur = (nx, ny)
                self.walk_timer = 0
            self.walk_timer += 1  # NpcTakeStep
            if self.walk_timer >= WALK_NORMAL_FRAMES:
                self.prv = self.cur  # ShiftStillObjectEventCoords
                self.walk_timer = None
                self.action = None
                self.ty = 1
            return False
        raise AssertionError(t)

    def fat_step(self, rng):
        t = self.ty
        if t == 0:
            self.ty = 1
            return True
        if t == 1:
            self.action = "face"
            self.ty = 2
            return True
        if t == 2:
            self.face_action()
            self.action = None
            r = rng.step()
            self.draws.append(("delay", r))
            self.dl = DELAYS_MEDIUM[r % 4]
            self.ty = 3
            return False  # LookAround_Step2 returns FALSE
        if t == 3:
            self.dl -= 1
            if self.dl == 0:  # (ObjectEventIsTrainerAndCloseToPlayer is FALSE: trainerType NONE)
                self.ty = 4
                return True
            return False
        if t == 4:
            r = rng.step()  # TryGetTrainerEncounterDirection -> DIR_NONE, so directions[Random() & 3]
            self.draws.append(("dir", r))
            self.set_direction(STANDARD_DIRECTIONS[r & 3])
            self.ty = 1
            return True
        raise AssertionError(t)


def ev_of(row, gfx):
    for e in row["ev"]:
        if e["gfx"] == gfx and not e["player"]:
            return e
    return None


def others_from(row, woman, fat):
    out = []
    for e in row["ev"]:
        if e["gfx"] in (16, 17) and not e["player"]:
            continue
        out.append({"cur": tuple(e["cur"]), "prv": tuple(e["prv"]), "elev": e["elev"]})
    for n in (woman, fat):
        out.append({"cur": n.cur, "prv": n.prv, "elev": n.elev})
    return out


def compare(n, e):
    got = {"cur": list(n.cur), "prv": list(n.prv), "face": n.face, "ty": n.ty}
    want = {"cur": e["cur"], "prv": e["prv"], "face": e["face"], "ty": e["data"][1]}
    if n.ty == 3:
        got["dl"], want["dl"] = n.dl, e["data"][3]
    return got, want


lobby_frames = [r["f"] for r in rows if "ev" in r and len(r["ev"]) >= 7]
if not lobby_frames:
    raise SystemExit("no lobby rows")
# spawn seed: the first frame both NPCs exist with sTypeFuncId 0 (before the field callback ever ran them)
spawn = next(f for f in lobby_frames if all(ev_of(by[f], g) for g in (16, 17)))
lock = next(f for f in lobby_frames if by[f]["st"] == 0)  # first script-running frame (lockall)
seed_frame = spawn if SEED == "spawn" else lock - 1
seed = by[seed_frame]
woman = Npc(ev_of(seed, 16), "woman")
fat = Npc(ev_of(seed, 17), "fat")
rng = Rng(seed["rng"])
if SEED == "lock":
    for n in (woman, fat):
        e = ev_of(seed, 16 if n.kind == "woman" else 17)
        n.cur, n.prv, n.face, n.mdir = tuple(e["cur"]), tuple(e["prv"]), e["face"], e["mdir"]
        n.ty, n.dl = e["data"][1], e["data"][3]
cnt0 = seed["cnt"]
last_lobby = max(f for f in lobby_frames)
first_bad = None
stats = {"womanDelay": 0, "womanDir": 0, "womanWalks": 0, "womanBlocked": 0, "fatDelay": 0, "fatDir": 0, "frames": 0}
release = None
for f in range(seed_frame + 1, last_lobby + 1):
    row, prev = by[f], by[f - 1]
    run = (prev["cb2"] == CB2_OVERWORLD) and "ev" in row
    if "ev" not in row:
        break
    w_ev, f_ev = ev_of(row, 16), ev_of(row, 17)
    frozen = bool(w_ev["frozen"])
    if prev.get("ev") and ev_of(prev, 16) and ev_of(prev, 16)["frozen"] and not frozen and by[f]["st"] != 0 and f > lock:
        release = release or f
    if ORDER == "vblank-first":
        rng.step()
    if run and not frozen:
        others = others_from(row, woman, fat)
        before = (len(woman.draws), len(fat.draws))
        woman.tick(rng, others)
        fat.tick(rng, others)
    if ORDER == "npc-first":
        rng.step()
    stats["frames"] += 1
    problems = []
    if rng.v != row["rng"]:
        problems.append(f"rng sim {rng.v:#010x} rom {row['rng']:#010x} (draws sim {rng.draws} rom {row['cnt'] - cnt0})")
    if rng.draws != row["cnt"] - cnt0:
        problems.append(f"draw count sim {rng.draws} rom {row['cnt'] - cnt0}")
    for n, e in ((woman, w_ev), (fat, f_ev)):
        got, want = compare(n, e)
        if got != want:
            problems.append(f"{n.kind} sim {got} rom {want}")
    if problems:
        first_bad = (f, problems)
        break

for n in (woman, fat):
    for k, _ in n.draws:
        if k == "delay":
            stats[("womanDelay" if n.kind == "woman" else "fatDelay")] += 1
        elif k == "dir":
            stats[("womanDir" if n.kind == "woman" else "fatDir")] += 1
        elif k == "collision" and n.kind == "woman":
            pass
stats["womanBlocked"] = sum(1 for k, v in woman.draws if k == "collision" and v)
stats["blockedByReason"] = {}
for k, v in woman.draws:
    if k == "collision" and v:
        name = {1: "range", 2: "map-grid", 3: "elevation", 4: "object"}[v]
        stats["blockedByReason"][name] = stats["blockedByReason"].get(name, 0) + 1
stats["dirsDrawn"] = sorted({STANDARD_DIRECTIONS[v & 3] for k, v in woman.draws if k == "dir"})
stats["womanWalks"] = sum(1 for k, v in woman.draws if k == "collision" and not v)
result = {
    "file": Path(args[0]).name,
    "order": ORDER,
    "seed": SEED,
    "seedFrame": seed_frame,
    "lastLobbyFrame": last_lobby,
    "match": first_bad is None,
    "firstMismatch": first_bad,
    "stats": stats,
    "womanDraws": woman.draws[:6],
}
if not QUIET or first_bad:
    print(json.dumps(result))
sys.exit(0 if first_bad is None else 1)
