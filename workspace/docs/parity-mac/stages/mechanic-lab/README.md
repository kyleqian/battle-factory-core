# Mechanic Lab ROM runs of fixes 42 and 43

These are not stage files for `romReplayWide.sh --stage` (that takes `factoryLegal` / `factoryBrain` stagings with real
sets). They are `mechanicLab` lab requests with custom parties, driven on the ROM only; the engine side of each fix is its
test, with the same numbers. The drive records the ROM's state (HP, status, PP, ...) at every decision under
`drive.wide`.

Drive one (from `workspace/`, with the mGBA Python of the probe in `POKEBENCH_MGBA_PYTHON`):

    python3 tools/run-mgba-probe.py --max-log-bytes 8192 OUT.drive.json -- \
      python3 tools/audio/soundEventProbe.py OUT.drive.json lab docs/parity-mac/stages/mechanic-lab/NAME.request.json \
      --profile off --drive docs/parity-mac/stages/mechanic-lab/NAME.decisions.json --drive-out OUT.frozen.json --frames 20000

(`run-mgba-probe.py` refuses to overwrite an existing output file.) Read the result:

    python3 -c "import json,sys; w=json.load(open(sys.argv[1]))['drive']['wide']; print([(b['battlers'][0]['species'], b['battlers'][0]['pp'], b['battlers'][0]['status1'], b['battlers'][1]['status1']) for b in w])" OUT.drive.json

| run | what | ROM result |
|---|---|---|
| `fix42-follow-me-curse` (lab seed 801) | the player's Snorlax uses Curse; the opponent's Dusclops (Pressure) uses Follow Me | Curse PP at the decisions 10, 8, 6 |
| `fix42-follow-me-curse-control` (801) | the same; Dusclops uses Splash | 10, 9, 8 |
| `fix43-pursuit-synchronize` (801; also 802) | the player switches Electabuzz (Static) out and in; the opponent's Umbreon (Synchronize) uses only Pursuit | decision 4: Umbreon paralysed (Static on the Pursuit hit); decision 5: Electabuzz back in, paralysed (Synchronize); every switch goes on, the last-move records stay 0. Seed 803 (Static never fires in eight switches) is the control: no status. |
