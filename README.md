# pokeemerald-factory-core

Pokémon Emerald's Battle Factory, rebuilt in TypeScript and checked against the
real game. Play it at <https://battlefactory.app>.

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

## Layout

- `workspace/src`: the game
- `workspace/tests`, `workspace/tools`: tests, data extraction, comparison
- `workspace/AGENTS.md`: the rules the agents followed
- `oracle/`: the real game in mGBA, for comparison

## Legal

A fan project, not affiliated with Nintendo, Creatures, Game Freak or The Pokémon
Company, who own Pokémon. Like the decompilation, it includes pictures, sounds
and data from the game. No license is granted; all rights reserved.
