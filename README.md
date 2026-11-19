# battle-factory-core

The Battle Factory, rebuilt in TypeScript and checked against the real game.
Play it at <https://battlefactory.app>.

It follows the [pret/pokeemerald](https://github.com/pret/pokeemerald)
decompilation, and whole battles are replayed in the real game (in mGBA) to check
that both come out the same. AI agents (Claude) wrote most of it. The commit
history is the full record, and the notes they worked from are in `workspace/`.

## Play

Needs Node 22. No ROM needed.

```sh
cd workspace && npm install && npm run dev
```

Then open <http://localhost:5173>.

## Test

```sh
cd workspace && npm test
```

About 500 test files need the decompilation, built into a ROM, and one needs
mGBA. Without them those tests fail, and the run says why. `oracle/SETUP.md`
sets up both; the same setup runs the real game for comparison.

The full run is long: about an hour on a laptop. Each test process may use up
to 8 GB of memory. To run a few tests, pass their files:
`npx vitest run tests/<name>.test.ts`. `npm run typecheck` needs `flock`,
which macOS does not ship (`brew install flock`).

## Layout

- `workspace/src`: the game
- `workspace/tests`, `workspace/tools`: tests, data extraction, comparison
- `workspace/AGENTS.md`: the rules the agents followed
- `oracle/`: the real game in mGBA, for comparison

## Legal

A fan project, not affiliated with the official owners of Pokémon.
