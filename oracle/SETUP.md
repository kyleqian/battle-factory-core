# Setting up the real-game side

The oracle runs the real game in mGBA through Python bindings. Everything lives
in a `vendor/` folder next to this repo (`../vendor`), and the oracle finds it
there. The steps below are for macOS on Apple silicon. For Linux on ARM, see
`workspace/docs/cax31-arm-runner.md`.

```sh
brew install libpng arm-none-eabi-binutils arm-none-eabi-gcc mgba
mkdir -p ../vendor && cd ../vendor

# The decompilation, built into a byte-identical ROM (no original ROM needed).
git clone https://github.com/pret/agbcc.git
git clone https://github.com/pret/pokeemerald.git
git -C pokeemerald checkout 83df84e40
(cd agbcc && ./build.sh && ./install.sh ../pokeemerald)
(cd pokeemerald && make -j8 && make compare)   # pokeemerald.gba, SHA-1 f3ae088181bf583e55daf962a92bb46f4f1d07b7

# mGBA 0.10 Python bindings.
curl -sLO https://github.com/hanzi/libmgba-py/releases/download/0.2.0-2/libmgba-py_0.2.0_macos-arm64.zip
mkdir -p libmgba-py && (cd libmgba-py && unzip -oq ../libmgba-py_0.2.0_macos-arm64.zip \
  && cp /opt/homebrew/lib/libmgba.0.10.5.dylib mgba/ \
  && ln -sf libmgba.0.10.5.dylib mgba/libmgba.0.10.dylib \
  && install_name_tool -add_rpath @loader_path mgba/_pylib.abi3.so \
  && codesign -f -s - mgba/_pylib.abi3.so)
```

Then, from this repo's root, link the decompilation where the oracle and the tests
look for it, and start the oracle (it creates `../vendor/mgba-venv` on first use):

```sh
mkdir -p reference workspace/reference
ln -s ../../vendor/pokeemerald reference/pokeemerald
[ -e workspace/reference/pokeemerald ] || ln -s ../../../vendor/pokeemerald workspace/reference/pokeemerald
./run-oracle.sh
```

The oracle starts from a saved game at the Battle Frontier, `oracle/bootstrap/factory.sav`;
`oracle/BOOTSTRAP.md` explains it and the rest of the bootstrap.
