import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Sha256, sha256Hex } from "../src/engine/sha256.ts";

describe("sha256 (pure JS, used for the challenge digest)", () => {
  it("matches node:crypto on known vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("matches node:crypto across block boundaries and incremental updates", () => {
    for (const length of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000, 4097]) {
      const bytes = randomBytes(length);
      expect(sha256Hex(bytes), `length ${length}`).toBe(createHash("sha256").update(bytes).digest("hex"));
      const incremental = new Sha256();
      const reference = createHash("sha256");
      let offset = 0;
      while (offset < length) {
        const take = Math.min(length - offset, 1 + ((offset * 7) % 37));
        incremental.update(bytes.subarray(offset, offset + take));
        reference.update(bytes.subarray(offset, offset + take));
        offset += take;
      }
      expect(incremental.digest(), `incremental length ${length}`).toBe(reference.digest("hex"));
    }
  });

  it("clone() reads a mid-stream digest without disturbing the original", () => {
    const hash = new Sha256().update("hello ");
    expect(hash.clone().digest()).toBe(sha256Hex("hello "));
    hash.update("world");
    expect(hash.clone().digest()).toBe(sha256Hex("hello world"));
    expect(hash.digest()).toBe(sha256Hex("hello world"));
  });

  it("hashes strings as UTF-8, like createHash().update(string)", () => {
    const text = JSON.stringify({ move: "Fire Punch", battler: 1, damage: 42, note: "ピカチュウ" });
    expect(sha256Hex(text)).toBe(createHash("sha256").update(text).digest("hex"));
  });
});
