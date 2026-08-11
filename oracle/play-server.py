#!/usr/bin/env python3
"""Interactive browser player for the oracle — SEE the canonical state.

Serves play.html plus a tiny session API on its own port (default 8021), with
its OWN emulator core, so the trace service on :8011 is untouched. One live
session at a time (the core is singular): opening the page or pressing Reset
rewinds to the canonical bootstrap anchor. Startup replays the bootstrap
once (~3s for factory's 4k frames).

  ./run-play.sh     then open the printed URL.
"""

from __future__ import annotations

import json
import os
import sys
from base64 import b64encode
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

from emerald_core import GBA_BUTTONS, EmeraldOracle  # noqa: E402

MAX_STEP_FRAMES = 16

_REFERENCE = _HERE.parent / "reference" / "pokeemerald"
ORACLE = EmeraldOracle(
    rom_path=os.environ.get("POKEEMERALD_ROM", _REFERENCE / "pokeemerald.gba"),
    map_path=os.environ.get("POKEEMERALD_MAP", _REFERENCE / "pokeemerald.map"),
    bootstrap_path=_HERE / "bootstrap" / "factory.json",
)
PLAY_HTML = (_HERE / "play.html").read_bytes()


def frame_payload() -> dict:
    return {"frame": ORACLE.frame, "pngBase64": b64encode(ORACLE.screen_png()).decode("ascii")}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "oracle-play/1"

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("content-type", content_type)
        self.send_header("content-length", str(len(body)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, value) -> None:
        self._send(status, (json.dumps(value) + "\n").encode(), "application/json")

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            self._send(200, PLAY_HTML, "text/html; charset=utf-8")
        elif path == "/health":
            self._json(200, {"ok": True})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            size = int(self.headers.get("content-length", "0"))
            body = json.loads(self.rfile.read(size) or b"{}") if size else {}
            if path == "/v1/play/reset":
                ORACLE.new_session()
                self._json(200, frame_payload())
            elif path == "/v1/play/step":
                frames = body.get("frames", 1)
                if not isinstance(frames, int) or not 1 <= frames <= MAX_STEP_FRAMES:
                    raise ValueError(f"frames must be 1..{MAX_STEP_FRAMES}")
                buttons = body.get("buttons", [])
                for button in buttons:
                    if button not in GBA_BUTTONS:
                        raise ValueError(f"unknown button {button!r}")
                for _ in range(frames):
                    ORACLE.advance(buttons)
                self._json(200, frame_payload())
            else:
                self._json(404, {"error": "not found"})
        except (ValueError, KeyError) as error:
            self._json(400, {"error": str(error)})


def main() -> None:
    port = int(os.environ.get("PORT", "8022"))
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"oracle play server: http://127.0.0.1:{server.server_address[1]}/  "
          f"(canonical anchor loaded; one session at a time)", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
