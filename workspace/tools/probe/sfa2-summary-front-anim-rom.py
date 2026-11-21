"""sfa2 (docs/sfa2-summary-front-animations.md): the summary screen's front-sprite animation on the real ROM, every species of a plan.

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUTDIR/done.json -- python3 tools/probe/sfa2-summary-front-anim-rom.py PLAN.json OUTDIR [--batches A:B]
      [--down-after N] [--page N]

--down-after N presses DOWN N frames after each rental's sprite is up instead of after its animation, and --page N moves N pages right
after the first rental (Skills, Battle Moves, Contest Moves). Both are dispatch-timing experiments, not whole-animation receipts.

PLAN.json (tools/probe/sfa2SummaryFrontAnim.mjs plan) lists batches of six rentals ({species, setId, personality, otId}). For each batch the
draft is staged as the frame catcher stages it (tools/frame-catcher/romRun.py: the six set ids written to rentalMons, the select screen entered
again, its six re-stored with the plan's personality and OT id), then:
  * A on the first ball, A on SUMMARY (frame 0 of the batch's recording is the frame that A is held);
  * the first rental's summary opens (the initial path); once its sprite callback is SpriteCallbackDummy (WaitAnimEnd saw the frame program
    end) and no delay task is left, 3 frames later DOWN is pressed (the replacement path), and so on through the sixth rental.
Every frame from frame 0 on records the mon sprite's struct (oam attrs, callback, x / y / x2 / y2, centerToCornerVec, anim fields, data[0..7],
flags), its gOamMatrices entry, its 16 OBJ colours in gPlttBufferFaded, the hardware OAM entry that carries its tiles, and a crop of the
picture (x 0..111, y 0..127; each distinct crop once, zlib, as the frame catcher's frame store). Writes OUTDIR/batch-NN.json and
OUTDIR/crops.bin + crops.idx.json, then OUTDIR/done.json.
"""
import hashlib, json, struct, sys, zlib
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WORKSPACE / "tools/frame-catcher"))
import romRun  # noqa: E402  (Rom, nm_table, resolve, patch_select_mons, SB2 offsets; puts oracle/ on sys.path)

CROP_W, CROP_H = 112, 128
SPRITE_SIZE = 0x44
SUMMARY_SPRITE_ID_MON = 0x40D3  # sMonSummaryScreen->spriteIds[SPRITE_ARR_ID_MON] (pokemon_summary_screen.c's struct; the MAGBY probe spec)
SUMMARY_CUR_MON = 0x40BE
EXTRA_FUNCS = {
    "SpriteCallbackDummy": None, "SpriteCB_Pokemon": None, "WaitAnimEnd": None, "Task_ChangeSummaryMon": None,
    "Task_PokemonSummaryAnimateAfterDelay": None, "MonAnimDummySpriteCallback": None, "Select_Task_OpenSummaryScreen": None,
}
EXTRA_DATA = {"sMonSummaryScreen": None}


def s16(v):
    return v - 0x10000 if v & 0x8000 else v


def s8(v):
    return v - 0x100 if v & 0x80 else v


class CropStore:
    def __init__(self, out):
        self.fd = open(Path(out) / "crops.bin", "wb")
        self.index, self.ids, self.offset = [], {}, 0
        self.out = Path(out)

    def add(self, rgb):
        rows = b"".join(rgb[y * 240 * 3:(y * 240 + CROP_W) * 3] for y in range(CROP_H))
        h = hashlib.sha1(rows).hexdigest()
        i = self.ids.get(h)
        if i is None:
            z = zlib.compress(rows, 6)
            self.fd.write(z)
            self.index.append([h, self.offset, len(z)])
            self.offset += len(z)
            i = self.ids[h] = len(self.index) - 1
        return i

    def close(self):
        self.fd.close()
        (self.out / "crops.idx.json").write_text(json.dumps(self.index))


def main():
    plan = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    lo, hi = 0, len(plan["batches"])
    if "--batches" in sys.argv:
        a, b = sys.argv[sys.argv.index("--batches") + 1].split(":")
        lo, hi = int(a), min(hi, int(b))
    down_after = int(sys.argv[sys.argv.index("--down-after") + 1]) if "--down-after" in sys.argv else None
    page = int(sys.argv[sys.argv.index("--page") + 1]) if "--page" in sys.argv else 0
    rom = romRun.Rom(plan.get("profile", "off"))
    nm, map_text = romRun.nm_table(), (romRun.REF / "pokeemerald.map").read_text()
    f = romRun.resolve(nm, map_text, EXTRA_FUNCS, (".text",))
    d = romRun.resolve(nm, map_text, EXTRA_DATA, (".bss", "ewram_data", ".data", "COMMON"))
    o, s = rom.o, rom.s
    crops = CropStore(out)
    names = {v: k for k, v in {**f, **{n: rom.f[n] for n in ("Task_HandleInput", "Select_Task_HandleMenu", "Select_Task_HandleChooseMons")}}.items()}

    def summary_ptr():
        return rom.u32(d["sMonSummaryScreen"])

    def palette_fade_active():
        return bool(rom.u8(s["gPaletteFade"] + 7) & 0x80)  # bool16 active:1 at bit 15 of the u16 at +6

    def task_state(func):
        t = s["gTasks"]
        for i in range(romRun.TASK_COUNT):
            if rom.u8(t + i * romRun.TASK_SIZE + 4) and (rom.u32(t + i * romRun.TASK_SIZE) & ~1) == func:
                return struct.unpack_from("<h", rom.read(t + i * romRun.TASK_SIZE + 8, 2))[0]
        return None

    def mon_record():
        p = summary_ptr()
        if not p:
            return None
        sid = rom.u8(p + SUMMARY_SPRITE_ID_MON)
        if sid >= 64:
            return {"spriteId": sid}
        base = s["gSprites"] + sid * SPRITE_SIZE
        raw = rom.read(base, SPRITE_SIZE)
        attr0, attr1, attr2 = struct.unpack_from("<HHH", raw, 0)
        cb = struct.unpack_from("<I", raw, 0x1C)[0] & ~1
        x, y, x2, y2 = struct.unpack_from("<hhhh", raw, 0x20)
        rec = {
            "spriteId": sid, "curMon": rom.u8(p + SUMMARY_CUR_MON), "attr": [attr0, attr1, attr2],
            "cb": names.get(cb, hex(cb)), "x": x, "y": y, "x2": x2, "y2": y2, "c2c": [s8(raw[0x28]), s8(raw[0x29])],
            "animNum": raw[0x2A], "animCmdIndex": raw[0x2B], "animFlags": raw[0x2C], "data": list(struct.unpack_from("<8h", raw, 0x2E)),
            "flags": struct.unpack_from("<H", raw, 0x3E)[0], "inUse": bool(raw[0x3E] & 1),
        }
        # the frame command the anim interpreter sits on: anims[animNum][animCmdIndex].frame.imageValue (u16; 0xFFFF = END etc.)
        anims = struct.unpack_from("<I", raw, 0x08)[0]
        if 0x08000000 <= anims < 0x0A000000:
            seq = rom.u32(anims + raw[0x2A] * 4)
            if 0x08000000 <= seq < 0x0A000000:
                rec["imageValue"] = rom.u16(seq + raw[0x2B] * 4)
        if attr0 & 0x100:
            m = (attr1 >> 9) & 0x1F
            rec["matrixNum"] = m
            rec["matrix"] = list(struct.unpack_from("<4h", rom.read(s["gOamMatrices"] + m * 8, 8)))
        pal = attr2 >> 12
        rec["pal"] = pal
        faded = rom.read(s["gPlttBufferFaded"] + 0x200 + pal * 32, 32)
        unfaded = rom.read(s["gPlttBufferUnfaded"] + 0x200 + pal * 32, 32)
        if faded != unfaded:
            rec["blended"] = list(struct.unpack("<16H", faded))
        # the hardware OAM entry with the mon's tiles (what the next scanned-out picture uses once VBlank copied the buffer)
        tile = attr2 & 0x3FF
        hw = rom.read(0x07000000, 1024)
        for i in range(128):
            a0, a1, a2 = struct.unpack_from("<HHH", hw, i * 8)
            if (a2 & 0x3FF) == tile and (a0 & 0x300) != 0x200:
                rec["hw"] = [a0, a1, a2]
                if a0 & 0x100:
                    mm = (a1 >> 9) & 0x1F
                    rec["hwMatrix"] = [s16(struct.unpack_from("<H", hw, mm * 32 + 6 + 8 * k)[0]) for k in range(4)]
                break
        rec["hwPal"] = list(struct.unpack("<16H", rom.read(0x05000200 + pal * 32, 32))) if "blended" in rec else None
        return rec

    for bi in range(lo, hi):
        batch = plan["batches"][bi]
        rentals = batch["rentals"]
        staging = []
        o.new_session()
        save2 = rom.save2()
        o.write_u8(save2 + romRun.SB2_LVL_MODE, rom.u8(save2 + romRun.SB2_LVL_MODE) & ~0x3)
        for off in (romRun.SB2_BATTLE_NUM, romRun.SB2_FACTORY_STREAK, romRun.SB2_TOWER_STREAK, romRun.SB2_FACTORY_RENTS):
            o.write_u16(save2 + off, 0)
        for i, r in enumerate(rentals):
            base = save2 + romRun.SB2_RENTAL_MONS + i * romRun.RENTAL_MON_SIZE
            o.write_u16(base, r["setId"])
            o.write_u32(base + 4, r["personality"])
            o.write_u8(base + 8, r.get("fixedIv", 3))
            o.write_u8(base + 9, r.get("abilitySlot", 0))
        o.write_u32(s["gMain"] + 4, s["DoBattleFactorySelectScreen"] | 1)
        lead, ready = 0, None
        while True:
            o.advance([])
            lead += 1
            sel = rom.u32(rom.d["sFactorySelectScreen"])
            if ready is None and lead > 8 and sel and rom.f["Select_Task_HandleChooseMons"] in rom.live_tasks():
                ready = lead
                romRun.patch_select_mons(rom, rentals, staging)
            if ready is not None and lead - ready > 30 and not palette_fade_active():
                break
            if lead > 2000:
                raise SystemExit(f"batch {bi}: the select screen did not come back")
        # A on the first ball: the menu (its mon pic opens first, STATE_MENU_HANDLE_INPUT = 3 takes input, battle_factory_screen.c:1123)
        o.advance(["A"])
        menu_wait = 0
        while task_state(rom.f["Select_Task_HandleMenu"]) != 3:
            o.advance([])
            menu_wait += 1
            if menu_wait > 300:
                raise SystemExit(f"batch {bi}: the select menu did not open")
        for _ in range(10):
            o.advance([])
        frames, presses, slot_events = [], [], []
        j = 0

        def step(buttons):
            nonlocal j
            o.advance(buttons)
            rec = {"j": j, "buttons": buttons, "crop": crops.add(o.screen_rgb()), "fade": palette_fade_active()}
            live = set(rom.live_tasks())
            rec["tasks"] = sorted(names.get(t, hex(t)) for t in live if t in names)
            m = mon_record()
            if m is not None:
                rec["mon"] = m
            frames.append(rec)
            j += 1
            return rec

        step(["A"])  # SUMMARY
        presses.append({"j": 0, "button": "A"})
        if f["Select_Task_OpenSummaryScreen"] not in rom.live_tasks():
            staging.append({"what": "SUMMARY A not taken"})
        for slot in range(6):
            waited, done_at = 0, None
            while True:
                rec = step([])
                waited += 1
                m = rec.get("mon")
                settled = (m is not None and m.get("cb") == "SpriteCallbackDummy" and m.get("curMon") == slot
                           and "Task_PokemonSummaryAnimateAfterDelay" not in rec["tasks"] and "Task_HandleInput" in rec["tasks"]
                           and not rec["fade"])
                if down_after is not None:
                    # --down-after N: DOWN N frames after this rental's sprite exists on Task_HandleInput (the cry and the motion
                    # may still run; a timing experiment, not a whole-animation receipt)
                    settled = (m is not None and m.get("curMon") == slot and "Task_HandleInput" in rec["tasks"] and not rec["fade"])
                    if settled and done_at is None:
                        done_at = rec["j"] + down_after - 3
                if settled and done_at is None:
                    done_at = rec["j"]
                if done_at is not None and rec["j"] >= done_at + 3:
                    break
                if waited > 1500:
                    (out / f"batch-{bi:02d}.partial.json").write_text(json.dumps({"frames": frames, "staging": staging}))
                    raise SystemExit(f"batch {bi} slot {slot}: the animation did not end")
            slot_events.append({"slot": slot, "species": rentals[slot]["species"], "settledAt": done_at})
            if slot == 0 and page > 0:
                # --page N: RIGHT N times after the first rental's animation (Skills, Battle Moves, Contest Moves), each once
                # Task_HandleInput is back; the replacements then run on that page
                for _ in range(page):
                    rec = step(["RIGHT"])
                    presses.append({"j": rec["j"], "button": "RIGHT"})
                    back = 0
                    while True:
                        rec = step([])
                        back = back + 1 if "Task_HandleInput" in rec["tasks"] else 0
                        if back >= 5:
                            break
                        if len(frames) > 20000:
                            raise SystemExit(f"batch {bi}: the page change did not finish")
            if slot < 5:
                rec = step(["DOWN"])
                presses.append({"j": rec["j"], "button": "DOWN"})
                if "Task_ChangeSummaryMon" not in rec["tasks"]:
                    # the mon change task replaces Task_HandleInput's func on the frame the press is read
                    staging.append({"what": "DOWN not seen on its frame", "j": rec["j"], "tasks": rec["tasks"]})
        (out / f"batch-{bi:02d}.json").write_text(json.dumps({
            "batch": bi, "rentals": rentals, "staging": staging, "presses": presses, "slots": slot_events, "frames": frames,
        }))
        print(f"batch {bi}: {len(frames)} frames, slots {[e['settledAt'] for e in slot_events]}", flush=True)
    crops.close()
    (out / "done.json").write_text(json.dumps({"batches": [lo, hi], "crops": len(crops.index)}))


if __name__ == "__main__":
    main()
