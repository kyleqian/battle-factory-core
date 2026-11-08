// Installs the battle sprite pixel tables for every suite (bnd256c): tests call render() on real battles. The headless graph does not
// install them (tests/bnd256cPixelProvider.test.ts pins the uninstalled behaviour through the provider module itself).
import "../../src/engine/monPicPixelsInstall.ts";
