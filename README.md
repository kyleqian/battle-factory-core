# pokeemerald-factory-core

Pokémon Emerald's Battle Factory, rebuilt in TypeScript and checked against the
real game.

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

About 500 test files read the decompilation's source. Without it they fail, and
the run says how to get it:

```sh
cd workspace
git clone https://github.com/pret/pokeemerald reference/pokeemerald
git -C reference/pokeemerald checkout 83df84e40
```

Comparing with the real game also needs mGBA and a ROM built from the
decompilation; see `oracle/SETUP.md`.

## Layout

- `workspace/src`: the game
- `workspace/tests`, `workspace/tools`: tests, data extraction, comparison
- `workspace/AGENTS.md`: the rules the agents followed
- `oracle/`: the real game in mGBA, for comparison

## Legal

A fan project, not affiliated with Nintendo, Creatures, Game Freak or The Pokémon
Company, who own Pokémon. Like the decompilation, it includes pictures, sounds
and data from the game. No license is granted; all rights reserved.
