import { afterEach, describe, expect, it } from "vitest";
import { oracleUrlForProfile } from "../tools/compare/oracleProfiles.ts";

const ORIGINAL_ENV = {
  legacy: process.env.POKEBENCH_ORACLE_URL,
  main: process.env.POKEBENCH_MAIN_ORACLE_URL,
  animation: process.env.POKEBENCH_ANIMATION_ORACLE_URL,
};

afterEach(() => {
  for (const [name, value] of [
    ["POKEBENCH_ORACLE_URL", ORIGINAL_ENV.legacy],
    ["POKEBENCH_MAIN_ORACLE_URL", ORIGINAL_ENV.main],
    ["POKEBENCH_ANIMATION_ORACLE_URL", ORIGINAL_ENV.animation],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("oracle profile routing", () => {
  it("routes explicit main and animation services independently", () => {
    process.env.POKEBENCH_ORACLE_URL = "http://legacy:9000/";
    process.env.POKEBENCH_MAIN_ORACLE_URL = "http://main:8014/";
    process.env.POKEBENCH_ANIMATION_ORACLE_URL = "http://animation:8012/";
    expect(oracleUrlForProfile("battle-scene-off")).toBe("http://main:8014");
    expect(oracleUrlForProfile("battle-scene-on")).toBe("http://animation:8012");
  });

  it("preserves the legacy override when profile-specific URLs are absent", () => {
    delete process.env.POKEBENCH_MAIN_ORACLE_URL;
    delete process.env.POKEBENCH_ANIMATION_ORACLE_URL;
    process.env.POKEBENCH_ORACLE_URL = "http://legacy:7777/";
    expect(oracleUrlForProfile("battle-scene-off")).toBe("http://legacy:7777");
    expect(oracleUrlForProfile("battle-scene-on")).toBe("http://legacy:7777");
  });
});
