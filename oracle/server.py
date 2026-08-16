#!/usr/bin/env python3
"""HTTP oracle service for the pokeemerald-factory demo.

Same contract as pokered-pewter's oracle (GET /health, GET /v1/info,
POST /v1/run) plus GET /v1/symbols for linker-map symbol lookup and the
additive POST /v1/battle-lab/run semantic staging contract. Single threaded
on purpose: trace runs serialize, and every run starts from a deterministic
snapshot.

  PORT                          listen port (default 8012; 0 = OS-assigned)
  POKEBENCH_ORACLE_PROFILE      battle-scene-on (default) or battle-scene-off
  POKEBENCH_ORACLE_BOOTSTRAP    explicit bootstrap JSON override
  POKEBENCH_ORACLE_PORT_FILE    if set, the actual port is written here
  POKEEMERALD_ROM / POKEEMERALD_MAP   override reference ROM / linker map
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from base64 import b64encode
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

from emerald_core import GBA_BUTTONS, EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request as validate_battle_lab_request  # noqa: E402

MAX_BODY_BYTES = 1_000_000
MAX_FRAMES = 45_000
MAX_CAPTURES = 256

_REFERENCE = _HERE.parent / "reference" / "pokeemerald"
PROFILE = os.environ.get("POKEBENCH_ORACLE_PROFILE", "battle-scene-on")
PROFILE_BOOTSTRAPS = {
    "battle-scene-on": _HERE / "bootstrap" / "factory.json",
    "battle-scene-off": _HERE / "bootstrap" / "factory-battle-scene-off.json",
}
if PROFILE not in PROFILE_BOOTSTRAPS:
    raise SystemExit(
        f"unsupported POKEBENCH_ORACLE_PROFILE {PROFILE!r}; "
        f"expected one of {', '.join(PROFILE_BOOTSTRAPS)}"
    )
bootstrap_override = os.environ.get("POKEBENCH_ORACLE_BOOTSTRAP")
bootstrap_path = Path(bootstrap_override) if bootstrap_override else PROFILE_BOOTSTRAPS[PROFILE]
ORACLE = EmeraldOracle(
    rom_path=os.environ.get("POKEEMERALD_ROM", _REFERENCE / "pokeemerald.gba"),
    map_path=os.environ.get("POKEEMERALD_MAP", _REFERENCE / "pokeemerald.map"),
    bootstrap_path=bootstrap_path,
)
LAB = BattleLab(ORACLE, PROFILE)


def validate_trace(value):
    if not isinstance(value, dict) or not isinstance(value.get("segments"), list):
        raise ValueError("body must contain a segments array")
    segments = []
    for index, segment in enumerate(value["segments"]):
        if not isinstance(segment, dict):
            raise ValueError(f"segment {index} must be an object")
        frames = segment.get("frames")
        if (
            isinstance(frames, bool)
            or not isinstance(frames, int)
            or not 1 <= frames <= MAX_FRAMES
        ):
            raise ValueError(f"segment {index}.frames must be an integer from 1 to {MAX_FRAMES}")
        buttons = segment.get("buttons", [])
        if not isinstance(buttons, list) or len(buttons) > len(GBA_BUTTONS):
            raise ValueError(f"segment {index}.buttons must be an array of at most {len(GBA_BUTTONS)} entries")
        for button in buttons:
            if button not in GBA_BUTTONS:
                raise ValueError(f"segment {index}: unknown button {button!r} (valid: {', '.join(GBA_BUTTONS)})")
        segments.append({"frames": frames, "buttons": buttons})
    total_frames = sum(segment["frames"] for segment in segments)
    if total_frames > MAX_FRAMES:
        raise ValueError(f"trace exceeds {MAX_FRAMES} frames")
    capture_frames = value.get("captureFrames", [total_frames])
    if not isinstance(capture_frames, list) or not 1 <= len(capture_frames) <= MAX_CAPTURES:
        raise ValueError(f"captureFrames must contain 1 to {MAX_CAPTURES} entries")
    for frame in capture_frames:
        if (
            isinstance(frame, bool)
            or not isinstance(frame, int)
            or not 0 <= frame <= total_frames
        ):
            raise ValueError(f"capture frame {frame} is outside 0..{total_frames}")
    return {
        "segments": segments,
        "totalFrames": total_frames,
        "captureFrames": sorted(set(capture_frames)),
    }


def run_trace(trace, *, reset=True, capture_state=None):
    if reset:
        ORACLE.new_session()
    wanted = set(trace["captureFrames"])
    captures = []

    def capture():
        rgb = ORACLE.screen_rgb()
        value = {
            "frame": ORACLE.frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "pngBase64": b64encode(ORACLE.screen_png()).decode("ascii"),
        }
        if capture_state is not None:
            value["state"] = capture_state()
        captures.append(value)

    if 0 in wanted:
        capture()
    for segment in trace["segments"]:
        for _ in range(segment["frames"]):
            ORACLE.advance(segment["buttons"])
            if ORACLE.frame in wanted:
                capture()
    return {"schemaVersion": 1, "totalFrames": trace["totalFrames"], "captures": captures}


class Handler(BaseHTTPRequestHandler):
    server_version = "pokeemerald-oracle/1"

    def _json(self, status, value):
        body = (json.dumps(value) + "\n").encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):  # quiet the per-request stderr noise
        pass

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/health":
            self._json(200, {"ok": True})
        elif url.path == "/v1/info":
            self._json(200, ORACLE.info(extra={
                "profile": PROFILE,
                "limits": {"maxFrames": MAX_FRAMES, "maxCaptures": MAX_CAPTURES},
                "capabilities": {
                    "canonicalTrace": "/v1/run",
                    "battleLab": {
                        "schemaVersion": 1,
                        "endpoint": "/v1/battle-lab/run",
                        "modes": ["factoryLegal", "mechanicLab", "factoryBrain"],
                        "factoryBrainWalkup": True,
                    },
                },
            }))
        elif url.path == "/v1/symbols":
            query = parse_qs(url.query)
            names = query.get("name", [])
            prefix = (query.get("prefix", [None]))[0]
            if names:
                result = {n: ORACLE.symbols.get(n) for n in names}
            elif prefix:
                raw_limit = query.get("limit", ["100"])[0]
                try:
                    limit = int(raw_limit)
                except ValueError:
                    self._json(400, {"error": "limit must be a positive integer"})
                    return
                if limit < 1:
                    self._json(400, {"error": "limit must be a positive integer"})
                    return
                result = {n: a for n, a in ORACLE.symbols.items() if n.startswith(prefix)}
                result = dict(sorted(result.items())[:limit])
            else:
                self._json(400, {"error": "pass ?name=<symbol> (repeatable) or ?prefix=<p>&limit=N"})
                return
            self._json(200, {"symbols": {n: (hex(a) if a is not None else None) for n, a in result.items()}})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/v1/run", "/v1/battle-lab/run"):
            self._json(404, {"error": "not found"})
            return
        try:
            size = int(self.headers.get("content-length", "0"))
            if not 0 <= size <= MAX_BODY_BYTES:
                raise ValueError(
                    f"content-length must be from 0 to {MAX_BODY_BYTES}"
                )
            body = json.loads(self.rfile.read(size) or b"{}")
            if path == "/v1/run":
                self._json(200, run_trace(validate_trace(body)))
                return
            request = validate_battle_lab_request(body, PROFILE)
            trace = validate_trace(request["trace"])
            setup = LAB.prepare(request)
            result = run_trace(trace, reset=False, capture_state=LAB.snapshot)
            result["battleLab"] = setup
            self._json(200, result)
        except (ValueError, KeyError) as error:
            self._json(400, {"error": str(error)})
        except RuntimeError as error:
            self._json(409, {"error": str(error)})


def main():
    port = int(os.environ.get("PORT", "8012"))
    server = HTTPServer(("127.0.0.1", port), Handler)
    actual_port = server.server_address[1]
    port_file = os.environ.get("POKEBENCH_ORACLE_PORT_FILE")
    if port_file:
        Path(port_file).write_text(f"{actual_port}\n")
    print(
        f"pokeemerald factory oracle ({PROFILE}) listening on :{actual_port}",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
