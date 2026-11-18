// dl3: thrown when a render reads a battle picture whose file has not arrived (monPicSpriteStore.ts). The lib loop catches it, fetches the
// species and holds. Containment (presentationContainment.ts) rethrows it so a pending picture is never recorded as a presentation error.
export class MonPicPending extends Error {
  override readonly name = "MonPicPending";
  readonly species: string;
  constructor(species: string) {
    super(`mon pic for ${species} has not loaded`);
    this.species = species;
  }
}
