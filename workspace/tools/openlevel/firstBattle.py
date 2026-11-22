"""Open Level: the PreBattleRoom walk and battle 1's parties on the ROM (tools/openlevel/README.md, docs/opl1-open-level-rom.md).

Usage (cwd = workspace/):
  python3 tools/run-mgba-probe.py OUTDIR/PROFILE.json -- python3 tools/openlevel/firstBattle.py OUTDIR PROFILE
  python3 tools/run-mgba-probe.py OUTDIR/PROFILE-summary.json -- python3 tools/openlevel/firstBattle.py OUTDIR PROFILE --summary
PROFILE: lv50-on, lv50-off, open-on, open-off (one per process).

From the profile's anchor (the bootstrap replayed), the lab's canonical route oracle/battle_lab.py SELECT_TO_ACTION_MENU (rent slots 1, 2, 3,
YES, A on "Right this way, please!", A on the opponent's speech, A on "... would like to battle!") is played to battle 1's first action
menu. Nothing is written into the ROM. Recorded:
  * walk: every frame from route frame 390 until 40 frames after the warp into the battle room, after the frame ran: the player's and the
    attendant's object events (coords, facing, movement action, invisible), their sprites (x, y, x2, y2, centre-to-corner, anim number and
    command, the anim command's picture index and flip, OAM flip), gSpriteCoordOffsetX/Y, gTotalCameraPixelOffsetX/Y, SaveBlock1's
    position and map, and the screen sha256 (and the screen as walk-PROFILE-tT.png at the route frames in WALK_SHOTS);
  * the enemy party build: the frames around the first change of gEnemyParty are run again instruction by instruction with traps at
    FillFactoryTrainerParty's entry and return, GetHighestLevelInPlayerParty's return, and CreateMonWithEVSpreadNatureOTID's entry (its
    species, level, nature, fixed IV and EV spread arguments); gEnemyParty is read at FillFactoryTrainerParty's return;
  * at the first action menu: gPlayerParty and gEnemyParty (all of each record), the player's EXP bar struct (battleBars[0]), the
    healthbox's EXP-bar tiles in OBJ VRAM, and the screen (PNG + a crop of the player's healthbox).
--summary instead opens the draft's SUMMARY for rental slot 1 and screenshots its first two pages (the second shows EXP).
"""
import json, struct, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from romlib import Rom, write_json, decode_mon, POKEMON_SIZE  # noqa: E402
from battle_lab import SELECT_TO_ACTION_MENU  # noqa: E402

OBJ_EVENTS, OBJ_SIZE, OBJ_COUNT = 0x02037350, 0x24, 16
SPRITE_SIZE = 0x44
WALK_FROM = 390
WALK_SHOTS = (400, 402, 418, 434, 450, 466, 482, 499, 519)  # route frames whose screen is saved (walk-PROFILE-tT.png)


def expand(route):
    out = []
    for frames, buttons in route:
        out += [tuple(buttons)] * frames
    return out


def obj_event(rom, i):
    a = OBJ_EVENTS + OBJ_SIZE * i
    flags = rom.u32(a)
    fd = rom.u8(a + 0x18)
    return {
        "slot": i, "active": flags & 1, "invisible": (flags >> 13) & 1, "heldMovementActive": (flags >> 6) & 1,
        "heldMovementFinished": (flags >> 7) & 1, "spriteId": rom.u8(a + 4), "localId": rom.u8(a + 8),
        "current": [rom.s16(a + 0x10), rom.s16(a + 0x12)], "previous": [rom.s16(a + 0x14), rom.s16(a + 0x16)],
        "facing": fd & 0xF, "movementDirection": fd >> 4, "movementActionId": rom.u8(a + 0x1C),
    }


def sprite(rom, sid):
    a = rom.s["gSprites"] + SPRITE_SIZE * sid
    c2cx, c2cy = rom.u8(a + 0x28), rom.u8(a + 0x29)
    anim_num, cmd_idx = rom.u8(a + 0x2A), rom.u8(a + 0x2B)
    anims = rom.u32(a + 8)
    cmd = rom.u32(rom.u32(anims + 4 * anim_num) + 4 * cmd_idx) if anims else 0
    attr1 = rom.u16(a + 2)
    f3e = rom.u16(a + 0x3E)
    return {
        "x": rom.s16(a + 0x20), "y": rom.s16(a + 0x22), "x2": rom.s16(a + 0x24), "y2": rom.s16(a + 0x26),
        "c2cX": c2cx - 256 if c2cx & 0x80 else c2cx, "c2cY": c2cy - 256 if c2cy & 0x80 else c2cy,
        "animNum": anim_num, "animCmdIndex": cmd_idx, "animDelay": rom.u8(a + 0x2C) & 0x3F,
        "cmdImage": cmd & 0xFFFF if not (cmd & 0x8000) else None, "cmdHFlip": (cmd >> 22) & 1,
        "oamHFlip": (attr1 >> 12) & 1, "spriteInvisible": (f3e >> 2) & 1, "spriteHFlip": (f3e >> 8) & 1,
    }


def walk_row(rom):
    s = rom.s
    pid = rom.u8(s["gPlayerAvatar"] + 5)
    objs = [obj_event(rom, i) for i in range(OBJ_COUNT)]
    player = objs[pid]
    others = [o for o in objs if o["active"] and o["slot"] != pid]
    sb1 = rom.sb1()
    row = {
        "frame": rom.frameno - 1, "sha": rom.screen_sha()[:16],
        "pos": [rom.s16(sb1), rom.s16(sb1 + 2)], "map": [rom.u8(sb1 + 4), rom.u8(sb1 + 5)],
        "spriteCoordOffset": [rom.s16(s["gSpriteCoordOffsetX"]), rom.s16(s["gSpriteCoordOffsetY"])],
        "totalCameraPixelOffset": [rom.u16(s["gTotalCameraPixelOffsetX"]), rom.u16(s["gTotalCameraPixelOffsetY"])],
        "player": dict(player, sprite=sprite(rom, player["spriteId"])),
        "others": [dict(o, sprite=sprite(rom, o["spriteId"])) for o in others],
    }
    return row


def enemy_sig(rom):
    return rom.read(rom.s["gEnemyParty"], 3 * POKEMON_SIZE)


def at_action_menu(rom):
    return rom.u32(rom.s["gBattlerControllerFuncs"]) & ~1 == rom.f["HandleInputChooseAction"]


def battle_bars(rom):
    p = rom.u32(rom.s["gBattleSpritesDataPtr"])
    if not p:
        return None
    bars = rom.u32(p + 0xC)
    out = []
    for b in range(2):
        a = bars + 20 * b
        out.append({"healthboxSpriteId": rom.u8(a), "maxValue": struct.unpack("<i", rom.read(a + 4, 4))[0],
                    "oldValue": struct.unpack("<i", rom.read(a + 8, 4))[0], "receivedValue": struct.unpack("<i", rom.read(a + 12, 4))[0],
                    "currValue": struct.unpack("<i", rom.read(a + 16, 4))[0]})
    return out


def exp_tiles(rom, healthbox_sprite):
    """The eight EXP-bar tiles MoveBattleBarGraphically copies (battle_interface.c:2312-2321), read back from OBJ VRAM."""
    a = rom.s["gSprites"] + SPRITE_SIZE * healthbox_sprite
    tile_num = rom.u16(a + 4) & 0x3FF
    out = []
    for i in range(8):
        addr = 0x06010000 + (tile_num + 0x24 + i) * 32 if i < 4 else 0x06010000 + 0xB80 + (i + tile_num) * 32
        out.append(rom.read(addr, 32).hex())
    return {"tileNum": tile_num, "tiles": out}


def run_battle(rom, outdir, profile):
    route = expand(SELECT_TO_ACTION_MENU)
    walk, build, ring = [], {"events": [], "creates": []}, []
    warp_frame, enemy_changed_at, menu_first = None, None, None
    traps = {}

    def entry(name, on_entry=None):
        def cb():
            lr = rom.reg(14)
            rec = {"fn": name, "at": "entry", "frame": rom.frameno, "rng": hex(rom.rng())}
            if on_entry:
                rec.update(on_entry())
            build["events"].append(rec)
            ret = (lr & ~1) + 2

            def at_ret():
                build["events"].append({"fn": name, "at": "return", "frame": rom.frameno, "rng": hex(rom.rng()), "result": rom.reg(0)})
                if name == "FillFactoryTrainerParty" and "enemyAtFillReturn" not in build:
                    build["enemyAtFillReturn"] = rom.party("gEnemyParty")
                traps.pop(ret, None)
            traps[ret] = at_ret
        return cb

    def create_args():
        sp = rom.reg(13)
        return {"args": {"species": rom.reg(1) & 0xFFFF, "level": rom.reg(2) & 0xFF, "nature": rom.reg(3) & 0xFF,
                         "fixedIV": rom.u32(sp) & 0xFF, "evSpread": rom.u32(sp + 4) & 0xFF, "otId": rom.u32(sp + 8)}}
    traps[rom.f["FillFactoryTrainerParty"] + 2] = entry("FillFactoryTrainerParty")
    traps[rom.f["CreateMonWithEVSpreadNatureOTID"] + 2] = entry("CreateMonWithEVSpreadNatureOTID", create_args)
    traps[rom.f["GetHighestLevelInPlayerParty"] + 2] = entry("GetHighestLevelInPlayerParty")

    t = 0
    base = rom.frameno
    sig = enemy_sig(rom)
    stepped_until = -1
    while t < len(route):
        buttons = route[t]
        if t <= stepped_until:
            rom.frame(buttons, traps)
        else:
            ring.append((t, rom.state()))
            del ring[:-64]
            rom.fast(buttons)
            new = enemy_sig(rom)
            if enemy_changed_at is None and new != sig:
                enemy_changed_at = t
                t0, st = ring[0]
                rom.load(st, base + t0)
                walk[:] = [w for w in walk if w["t"] < t0]
                stepped_until = t + 60
                t = t0
                continue
            sig = new
        if t >= WALK_FROM and (warp_frame is None or t < warp_frame + 40):
            row = walk_row(rom)
            row["t"] = t
            walk.append(row)
            if warp_frame is None and row["map"] != [26, 32]:
                warp_frame = t
            if t in WALK_SHOTS:
                (outdir / f"walk-{profile}-t{t}.png").write_bytes(rom.screen_png())
        if menu_first is None and at_action_menu(rom):
            menu_first = t
        t += 1
    # a few idle frames more if the menu is not up yet (the route is generous; this should not be needed)
    extra = 0
    while not at_action_menu(rom) and extra < 600:
        rom.fast(())
        extra += 1
    shot = outdir / f"action-menu-{profile}.png"
    shot.write_bytes(rom.screen_png())
    from PIL import Image
    img = Image.open(shot).convert("RGB")
    crop = img.crop((120, 64, 240, 116))
    crop.resize((crop.width * 6, crop.height * 6), Image.NEAREST).save(outdir / f"healthbox-{profile}-x6.png")
    rgb = img.tobytes()
    bars = battle_bars(rom)
    res = {
        "profile": profile, "routeFrames": len(route), "extraIdle": extra, "atActionMenu": at_action_menu(rom),
        "frameAtMenu": rom.frameno, "rngAtMenu": hex(rom.rng()),
        "frontier": rom.frontier(), "enemyChangedAtRouteFrame": enemy_changed_at, "warpRouteFrame": warp_frame,
        "actionMenuFirstRouteFrame": menu_first,
        "build": build, "playerParty": rom.party("gPlayerParty"), "enemyParty": rom.party("gEnemyParty"),
        "battleBars": bars, "expTiles": exp_tiles(rom, bars[0]["healthboxSpriteId"]) if bars else None,
        "healthboxRows": {str(y): [list(rgb[(y * 240 + x) * 3:(y * 240 + x) * 3 + 3]) for x in range(120, 240)] for y in range(64, 116)},
        "screenshot": str(shot), "walk": walk,
    }
    return res


def run_summary(rom, outdir, profile):
    shots = {}
    seq = [(2, ("A",)), (28, ()), (2, ("A",)), (90, ())]
    for frames, buttons in seq:
        for _ in range(frames):
            rom.fast(buttons)
    (outdir / f"summary-p1-{profile}.png").write_bytes(rom.screen_png())
    shots["page1"] = str(outdir / f"summary-p1-{profile}.png")
    for frames, buttons in [(2, ("RIGHT",)), (60, ())]:
        for _ in range(frames):
            rom.fast(buttons)
    (outdir / f"summary-p2-{profile}.png").write_bytes(rom.screen_png())
    shots["page2"] = str(outdir / f"summary-p2-{profile}.png")
    return {"profile": profile, "shots": shots, "selectMons": rom.select_mons()}


def main():
    outdir, profile = Path(sys.argv[1]), sys.argv[2]
    outdir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    rom = Rom(profile)
    rom.replay()
    if "--summary" in sys.argv:
        res = run_summary(rom, outdir, profile)
        name = f"{profile}-summary.json"
    else:
        res = run_battle(rom, outdir, profile)
        name = f"{profile}.json"
    res["seconds"] = round(time.time() - t0, 1)
    write_json(outdir / name, res)


if __name__ == "__main__":
    main()
