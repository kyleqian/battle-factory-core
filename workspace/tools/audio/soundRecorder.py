#!/usr/bin/env python3
"""Dev-time sound recorder (aud244a): capture the real mixed mGBA output for one ROM sound at a time.

  /srv/pokebench/vendor/mgba-venv/bin/python tools/audio/soundRecorder.py ASSET_LIST.json OUT_DIR
      [--rate HZ] [--shard I/N] [--only KEY[,KEY]] [--limit N] [--kinds se,cry,bgm,fanfare,seloop] [--passes N]

Method (docs/aud244a-recorder-assets.md). The oracle's canonical Factory state is silenced (`m4aMPlayAllStop`, then frames
until the output is digital silence) and snapshotted once. Every sound then starts from that snapshot with a REGISTER-POKE
call of the ROM's own entry point (dev tool only, never parity evidence): the CPU is woken from its VBlankIntrWait halt,
registers / prefetch / stack are set up for `PlaySE*` / `PlayCryInternal`, the function runs to its return, the register file
is restored and the emulator is advanced frame by frame while `core.get_audio_channels()` is drained. Recording starts at the
frame the call was made in; leading silence (the ROM's own ~1-2 frame mixer latency, kept as `onsetSamples`) is trimmed. Recording stops when
every music player / PCM / PSG channel is inactive AND the output has been silent for SILENT_FRAMES frames; trailing silence is
trimmed. Output per sound: OUT_DIR/<key>.wav (16-bit, mono for cries after a centre-pan L == R check, stereo for SEs) and
OUT_DIR/<key>.json (lengthFrames = frames from the call to the first all-inactive frame, lengthSamples, onset, peak, rms ...).

aud244b kinds: `bgm` (PlayBGM -> m4aSongNumStart), `fanfare` (m4aSongNumStart, one-shot like an SE) and `seloop`
(the two SEs that never go inactive, se:90:none / se:132:63). Looping songs are recorded for `--passes` passes of the ROM loop (stop clock from
songTicks.py) with the player's per-frame tick `clock` and `tempoC` logged next to the audio (`clockFrames`, `tempoC`, `frameSamples`), so
tools/audio/loopCut.py can find the loop boundaries in frames and then in samples. Untrimmed except for the leading near-silence.
"""
import argparse, array, hashlib, json, os, struct, sys, time, wave
from pathlib import Path

# mGBA writes its log to fd 1 / 2 at C level; keep fd 1 for our own report lines only
_REPORT = os.fdopen(os.dup(1), "w")
_LOG = open(os.environ.get("MGBA_LOG", "/dev/null"), "w")
os.dup2(_LOG.fileno(), 1)


def say(*a):
    _REPORT.write(" ".join(str(x) for x in a) + "\n")
    _REPORT.flush()


ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from mgba import ffi  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import songTicks  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
BOOTSTRAP = HARNESS / "oracle/bootstrap/factory.json"
CRY_MODE_ID = {"NORMAL": 0, "DOUBLES": 1, "ENCOUNTER": 2, "HIGH_PITCH": 3, "ECHO_START": 4, "FAINT": 5, "ECHO_END": 6,
               "ROAR_1": 7, "ROAR_2": 8, "GROWL_1": 9, "GROWL_2": 10, "WEAK": 11, "WEAK_DOUBLES": 12}
CRY_VOLUME, CRY_PRIORITY = 120, 10
SE_FN = {"PlaySE": "PlaySE", "PlaySE12WithPanning": "PlaySE12WithPanning", "PlaySE1WithPanning": "PlaySE1WithPanning", "PlaySE2WithPanning": "PlaySE2WithPanning"}
DEFAULT_RATE = 26758
SILENT_FRAMES = 12   # frames of |sample| <= SILENT_PEAK required after the last channel stops (covers the mixer DMA ring)
SILENT_PEAK = 2
MAX_FRAMES = 1500    # 25 s hard cap; a sound still active here is flagged `capped`
LOAD_WARMUP = 24     # frames discarded after each state load: the output keeps a x0.42/frame decaying residual of the previous recording
STEP_CAP = 4_000_000
RETURN_SENTINEL = 0x08001000
SOUND_CHANNEL_ON = 0xC7
SOUND_INFO_CHANS, SOUND_CHANNEL_SIZE, SOUND_CHANNELS = 0x50, 0x40, 12
CGB_CHANNEL_SIZE, CGB_CHANNELS = 0x40, 4
PLAYER_CLOCK, PLAYER_TEMPO_C = 0x0C, 0x22   # MusicPlayerInfo.clock (u32 ticks) / tempoC (u16 tick accumulator)
LOOP_SE_IDS = (90, 132)
TAIL_TICKS = 96      # ticks recorded past the last loop boundary (the seam window needs audio after loopEnd)


def s8(v):
    v &= 0xFF
    return v - 256 if v & 0x80 else v


class Recorder:
    def __init__(self, rate):
        self.rate = rate
        self.o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", BOOTSTRAP)
        self.core = self.o.core
        self.cpu = self.core.cpu._native
        self.native = self.core._core
        self.gpr = self.cpu.gprs
        self.sym = self.o.symbols
        self.audio = self.core.get_audio_channels()
        self.audio.set_rate(rate)
        si = self.sym["gSoundInfo"]
        self.players = [self.sym[f"gMPlayInfo_{n}"] for n in ("BGM", "SE1", "SE2", "SE3")] + [self.sym["gPokemonCryMusicPlayers"] + 0x40 * i for i in range(2)]
        self.dsound = [si + SOUND_INFO_CHANS + SOUND_CHANNEL_SIZE * i for i in range(SOUND_CHANNELS)]
        self.si = si
        self.clean = None

    # -- register-poke call ---------------------------------------------------------------------------------------------
    def call(self, name, args=(), stack=()):
        o, c, gpr = self.o, self.cpu, self.gpr
        fn = self.sym[name] & ~1
        saved = ([gpr[i] for i in range(16)], c.cpsr.packed, c.prefetch[0], c.prefetch[1], c.halted)
        for i, a in enumerate(args):
            gpr[i] = a & 0xFFFFFFFF if a >= 0 else (a & 0xFFFFFFFF)
        sp = (gpr[13] & 0xFFFFFFFF) - 8 * ((len(stack) + 1) // 2)
        for i, v in enumerate(stack):
            o.write_u32(sp + 4 * i, v)
        gpr[13] = sp
        gpr[14] = RETURN_SENTINEL | 1
        c.cpsr.packed |= 0xA0  # Thumb, IRQs masked while the call runs
        c.halted = 0
        gpr[15] = fn + 2
        c.prefetch[0], c.prefetch[1] = o.read_u16(fn), o.read_u16(fn + 2)
        steps = 0
        while (gpr[15] & 0xFFFFFFFF) != RETURN_SENTINEL + 2 and steps < STEP_CAP:
            self.native.step(self.native)
            steps += 1
        done = (gpr[15] & 0xFFFFFFFF) == RETURN_SENTINEL + 2
        for i in range(16):
            gpr[i] = saved[0][i]
        c.cpsr.packed, c.prefetch[0], c.prefetch[1], c.halted = saved[1], saved[2], saved[3], saved[4]
        if not done:
            raise RuntimeError(f"call {name}{tuple(args)} did not return within {STEP_CAP} steps")
        return steps

    # -- emulation ------------------------------------------------------------------------------------------------------
    def frame(self):
        self.o.advance([])
        n = self.audio.available
        if n <= 0:
            return b""
        buf = ffi.new("short[%i]" % (2 * n))  # StereoBuffer.read() returns a slice that does not keep its buffer alive
        got = self.audio.read_into(buf, n)
        return bytes(ffi.buffer(buf, 4 * got))

    def active(self, players=True):
        o = self.o
        for p in self.players if players else ():
            status = o.read_u32(p + 4)
            if status & 0xFFFF and not status & 0x80000000:  # a stopped player keeps its track bits but sets the PAUSE bit
                return True
        for a in self.dsound:
            if o.read_u8(a) & SOUND_CHANNEL_ON:
                return True
        cgb = o.read_u32(self.si + 28)
        for i in range(CGB_CHANNELS):
            if o.read_u8(cgb + CGB_CHANNEL_SIZE * i) & SOUND_CHANNEL_ON:
                return True
        return False

    def why_active(self):
        o = self.o
        return {"players": [hex(o.read_u32(p + 4)) for p in self.players],
                "ds": [hex(o.read_u8(a)) for a in self.dsound],
                "cgb": [hex(o.read_u8(o.read_u32(self.si + 28) + CGB_CHANNEL_SIZE * i)) for i in range(CGB_CHANNELS)]}

    def prepare(self):
        for _ in range(3):
            self.frame()
        self.call("m4aMPlayAllStop")
        quiet = 0
        for _ in range(400):
            pcm = self.frame()
            if os.environ.get("REC_DEBUG"):
                say("prepare peak", max((abs(x) for x in array.array("h", pcm)), default=0), self.active())
            if max((abs(x) for x in array.array("h", pcm)), default=0) <= SILENT_PEAK and not self.active():
                quiet += 1
                if quiet >= SILENT_FRAMES + 8:
                    break
            else:
                quiet = 0
        else:
            raise RuntimeError("baseline never went silent: " + json.dumps(self.why_active()))
        self.clean = bytes(ffi.buffer(self.core.save_raw_state()))

    def start_clean(self):
        self.core.load_raw_state(self.clean)
        self.audio.clear()
        self.audio.set_rate(self.rate)
        for _ in range(LOAD_WARMUP):  # the first frames after a state load carry mixer/blip leftovers
            pcm = self.frame()
        if max((abs(x) for x in array.array("h", pcm)), default=0) != 0:
            raise RuntimeError("clean state not digitally silent after warm-up")

    def player_of(self, song):
        """MusicPlayerInfo address of the song's player (gSongTable entry: header u32, ms u16, me u16)."""
        return self.players[self.o.read_u16(self.sym["gSongTable"] + 8 * song + 4)]

    def record_song(self, start, player, stop_clock=None, max_frames=MAX_FRAMES):
        """Like record(), but logs the player's tick clock / tempoC per frame; with stop_clock the recording ends once the clock reaches it (looping songs)."""
        self.start_clean()
        start()
        chunks, frame_samples, clocks, tempo_c, first_inactive, silent_run = [], [], [], [], None, 0
        for f in range(1, max_frames + 1):
            pcm = self.frame()
            chunks.append(pcm)
            frame_samples.append(len(pcm) // 4)
            clocks.append(self.o.read_u32(player + PLAYER_CLOCK))
            tempo_c.append(self.o.read_u16(player + PLAYER_TEMPO_C))
            if stop_clock is not None:
                if clocks[-1] >= stop_clock:
                    break
                continue
            peak = max((abs(x) for x in array.array("h", pcm)), default=0)
            silent_run = silent_run + 1 if peak <= SILENT_PEAK else 0
            if first_inactive is None and f > 3 and not self.active():  # a song's player only reports its tracks from the 2nd frame on
                first_inactive = f
            if first_inactive is not None and silent_run >= SILENT_FRAMES:
                break
        capped = (first_inactive is None) if stop_clock is None else clocks[-1] < stop_clock
        return array.array("h", b"".join(chunks)), frame_samples, first_inactive, capped, clocks, tempo_c

    # -- one recording --------------------------------------------------------------------------------------------------
    def record(self, start, players=True, max_frames=MAX_FRAMES):
        self.start_clean()
        start()
        chunks, frame_samples, first_inactive, silent_run = [], [], None, 0
        for f in range(1, max_frames + 1):
            pcm = self.frame()
            chunks.append(pcm)
            frame_samples.append(len(pcm) // 4)
            peak = max((abs(x) for x in array.array("h", pcm)), default=0)
            silent_run = silent_run + 1 if peak <= SILENT_PEAK else 0
            if first_inactive is None and not self.active(players):
                first_inactive = f
            if first_inactive is not None and silent_run >= SILENT_FRAMES:
                break
        capped = first_inactive is None
        data = array.array("h", b"".join(chunks))
        return data, frame_samples, first_inactive, capped


def trim_tail(data):
    """Drop trailing near-silence (|s| <= SILENT_PEAK on both channels); returns the stereo array without leading/trailing near-silence and the leading-silent sample count."""
    n = len(data) // 2
    last = n
    while last > 0 and abs(data[2 * last - 2]) <= SILENT_PEAK and abs(data[2 * last - 1]) <= SILENT_PEAK:
        last -= 1
    first = 0
    while first < last and abs(data[2 * first]) <= SILENT_PEAK and abs(data[2 * first + 1]) <= SILENT_PEAK:
        first += 1
    return array.array("h", data[2 * first: 2 * last]), first


def trim_head(data):
    """Drop only the leading near-silence (a looping recording is cut to its loop later); returns (stereo array, leading-silent sample count)."""
    n = len(data) // 2
    first = 0
    while first < n and abs(data[2 * first]) <= SILENT_PEAK and abs(data[2 * first + 1]) <= SILENT_PEAK:
        first += 1
    return array.array("h", data[2 * first:]), first


def write_wav(path, samples, channels, rate):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(samples.tobytes())


def stats(samples):
    n = len(samples)
    if not n:
        return {"peak": 0, "rms": 0.0, "clipped": 0}
    peak = max(max(samples), -min(samples))
    rms = (sum(x * x for x in samples) / n) ** 0.5
    return {"peak": peak, "rms": round(rms, 2), "clipped": sum(1 for x in samples if x >= 32767 or x <= -32768)}


def key_of(kind, row):
    if kind == "se":
        return f"se:{row['id']}:{'none' if row['pan'] is None else row['pan']}"
    return f"cry:{row['species']}:{row['mode']}"


def file_stem(key):
    k = key.split(":")
    if k[0] == "se":
        return f"se-{int(k[1]):03d}-" + ("nopan" if k[2] == "none" else f"pan{'m' if int(k[2]) < 0 else 'p'}{abs(int(k[2])):02d}")
    return f"cry-{int(k[1]):03d}-{k[2].lower()}"


def song_loop_info(kind, row):
    if kind == "seloop":
        return songTicks.parse_se_track(row["name"].lower())
    r = songTicks.song_loops()[row["id"]]
    return {"loops": r["loops"], "loopStartTick": r["loopStartTick"], "loopEndTick": r["loopEndTick"], "totalTicks": r["totalTicks"],
            "tempoBpm": r["tempoBpm"][-1][1] if r["tempoBpm"] else 150}


def record_song_job(rec, a, out, kind, key, row):
    """bgm / fanfare / seloop: one song, recorded to OUT/<stem>-full.wav + <stem>.json (stereo, leading near-silence trimmed into onsetSamples)."""
    stem = key.replace(":", "-") if kind != "seloop" else file_stem(key)
    if (out / f"{stem}.json").exists() and not a.force:
        return
    info = song_loop_info(kind, row)
    song = row["id"]
    player = rec.player_of(song)
    if kind == "fanfare":
        start = lambda: rec.call("m4aSongNumStart", (song,))  # PlayFanfare = m4aMPlayStop(BGM) + this + a task that resumes the BGM; the BGM is silenced here
    elif kind == "bgm":
        start = lambda: rec.call("PlayBGM", (song,))
    else:
        pan = row["pan"]
        start = (lambda: rec.call("PlaySE", (song,))) if row["vias"][0] == "PlaySE" else (lambda: rec.call(row["vias"][0], (song, pan & 0xFF)))
    stop_clock = None
    max_frames = MAX_FRAMES
    if info["loops"]:
        stop_clock = info["loopStartTick"] + a.passes * (info["loopEndTick"] - info["loopStartTick"]) + TAIL_TICKS
        max_frames = int(stop_clock * 150 / info["tempoBpm"]) + 600
    else:
        max_frames = 6000
    data, frame_samples, first_inactive, capped, clocks, tempo_c = rec.record_song(start, player, stop_clock, max_frames)
    trimmed, onset = trim_tail(data) if stop_clock is None else trim_head(data)
    meta = {"key": key, "kind": kind, "via": "PlayBGM" if kind == "bgm" else "m4aSongNumStart" if kind == "fanfare" else row["vias"][0], "file": f"{stem}-full.wav",
            "rate": a.rate, "channels": 2, "songId": song, "name": row["name"], "player": (rec.players.index(player)), "passes": a.passes, "loop": info,
            "framesRecorded": len(frame_samples), "lengthFrames": first_inactive, "capped": capped, "lengthSamples": len(trimmed) // 2, "onsetSamples": onset,
            "frameSamples": frame_samples, "clockFrames": clocks, "tempoC": tempo_c}
    meta.update(stats(trimmed))
    meta["sha256"] = hashlib.sha256(trimmed.tobytes()).hexdigest()
    write_wav(out / f"{stem}-full.wav", trimmed, 2, a.rate)
    (out / f"{stem}.json").write_text(json.dumps(meta) + "\n")
    say(f"{key} {row['name']}: {len(frame_samples)} frames, {len(trimmed) // 2} samples, onset {onset}, capped {capped}, clock {clocks[-1]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("assets")
    ap.add_argument("out")
    ap.add_argument("--rate", type=int, default=DEFAULT_RATE)
    ap.add_argument("--shard", default="0/1")
    ap.add_argument("--only", default="")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--kinds", default="se,cry")
    ap.add_argument("--passes", type=int, default=4, help="loop passes recorded after the intro (bgm / seloop)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    assets = json.loads(Path(a.assets).read_text())
    jobs = []
    kinds = a.kinds.split(",")
    if "se" in kinds:
        for r in assets["se"]:
            jobs.append(("se", key_of("se", r), r))
    if "cry" in kinds:
        for r in assets["cry"]:
            jobs.append(("cry", key_of("cry", r), r))
    for kind in ("bgm", "fanfare"):
        if kind in kinds:
            for r in assets["songs"]:
                if r["kind"] == kind:
                    jobs.append((kind, f"{kind}:{r['id']}", r))
    if "seloop" in kinds:
        for r in assets["se"]:
            if r["id"] in LOOP_SE_IDS:
                jobs.append(("seloop", key_of("se", r), r))
    if a.only:
        want = set(a.only.split(","))
        jobs = [j for j in jobs if j[1] in want]
    si, sn = (int(x) for x in a.shard.split("/"))
    jobs = [j for n, j in enumerate(jobs) if n % sn == si]
    if a.limit:
        jobs = jobs[: a.limit]
    t0 = time.time()
    rec = Recorder(a.rate)
    rec.prepare()
    say(f"shard {a.shard}: booted + silenced in {time.time() - t0:.1f}s, {len(jobs)} jobs, rate {a.rate}")
    for n, (kind, key, row) in enumerate(jobs):
        if kind in ("bgm", "fanfare", "seloop"):
            record_song_job(rec, a, out, kind, key, row)
            continue
        stem = file_stem(key)
        variants = []
        if kind == "se":
            for via in row["vias"]:
                pan = row["pan"]
                if via == "PlaySE":
                    variants.append((via, lambda: rec.call("PlaySE", (row["id"],))))
                else:
                    variants.append((via, (lambda via=via, pan=pan: rec.call(via, (row["id"], pan & 0xFF)))))
        else:
            variants.append(("PlayCryInternal", lambda: rec.call("PlayCryInternal", (row["species"], 0, CRY_VOLUME, CRY_PRIORITY), (CRY_MODE_ID[row["mode"]],))))
        for vi, (via, start) in enumerate(variants[:1]):  # wrapper variants of one (id, pan) tuple render the same audio
            vstem = stem if vi == 0 else f"{stem}-via{via}"
            if (out / f"{vstem}.json").exists() and not a.force:
                continue
            data, frame_samples, first_inactive, capped = rec.record(start, players=kind == "se")
            trimmed, onset = trim_tail(data)
            meta = {"key": key, "kind": kind, "via": via, "viasInLogs": [v for v, _ in variants], "file": f"{vstem}.wav", "rate": a.rate,
                    "framesRecorded": len(frame_samples), "lengthFrames": first_inactive, "capped": capped,
                    "lengthSamples": len(trimmed) // 2, "onsetSamples": onset, "samplesPerFrame": frame_samples[:8]}
            if kind == "se":
                meta.update(id=row["id"], name=row["name"], pan=row["pan"])
                stereo = trimmed
            else:
                meta.update(species=row["species"], name=row["name"], mode=row["mode"])
                diff = max((abs(trimmed[i] - trimmed[i + 1]) for i in range(0, len(trimmed), 2)), default=0)
                meta["maxLeftRightDiff"] = diff
                stereo = array.array("h", [(trimmed[i] + trimmed[i + 1]) // 2 for i in range(0, len(trimmed), 2)])
            meta["channels"] = 2 if kind == "se" else 1
            meta.update(stats(stereo))
            meta["sha256"] = hashlib.sha256(stereo.tobytes()).hexdigest()
            write_wav(out / f"{vstem}.wav", stereo, meta["channels"], a.rate)
            (out / f"{vstem}.json").write_text(json.dumps(meta) + "\n")
        if n % 25 == 0:
            say(f"{n + 1}/{len(jobs)} {key} {time.time() - t0:.0f}s")
    say(f"done {len(jobs)} jobs in {time.time() - t0:.0f}s")
    _REPORT.flush()
    os._exit(0)  # the binding can segfault at interpreter teardown (tools/run-mgba-probe.py)


if __name__ == "__main__":
    main()
