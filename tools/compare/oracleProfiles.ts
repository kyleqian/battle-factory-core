export type OracleProfile = "battle-scene-on" | "battle-scene-off";

export function oracleUrlForProfile(profile: OracleProfile): string {
  const legacyUrl = process.env.POKEBENCH_ORACLE_URL;
  const url = profile === "battle-scene-off"
    ? process.env.POKEBENCH_MAIN_ORACLE_URL ?? legacyUrl ?? "http://127.0.0.1:8014"
    : process.env.POKEBENCH_ANIMATION_ORACLE_URL ?? legacyUrl ?? "http://127.0.0.1:8012";
  return url.replace(/\/$/, "");
}
