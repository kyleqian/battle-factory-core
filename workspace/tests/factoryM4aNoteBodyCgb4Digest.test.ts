import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Light default-suite pin for the Issue #55 CGB4 grind-evidence family
// (tests/factoryM4aNoteBodyCgb4V1..44.test.ts). That family is gated behind
// POKEBENCH_CGB4_EVIDENCE=1 (see factoryM4aNoteBodyCgb4Gate.ts) because it
// recomputes/re-derives evidence chains that dominate default `npm test`
// wall time. This test instead just reads and hashes the 88 files the
// family checks in (44 evidence JSONs + 44 markdown reports) so silent
// corruption or an accidental hand-edit of that evidence still fails the
// default suite, with no synthesis/recompute.
const VERSIONS: Record<number, { evidence: string; doc: string }> = {
  1: { evidence: "2a9a8e572d171ae8c47827f64e3227d234b909a74254fe00b7530e8f56c3b1a7", doc: "f8fb34d7c1a5868729f6c0df120151bf3b6bd96effd6b7a74b631d3821f1b721" },
  2: { evidence: "cd6030344b403b10bd5c39aa4e1b4a8cdf0c68ab3871b11a677570621dff46ac", doc: "347e2ae2fc3e0f32c03bb5b718e9cb12b9e55cffdfef6f9c48feed3bec23b8da" },
  3: { evidence: "558e043ae23308abf43f4642b9acb8d520c6d30f6efe0c0a5e188bb9e67a4cba", doc: "bad4f77dfb1734ad4521f61b3b5b430b7504ac4032bc7423a17e162bdac3b147" },
  4: { evidence: "a29476ae5e0f55c2a491513f0e6dad1c4e445f047c9f93a82f7b8723812cc423", doc: "0c50c9bbe12cce5a507257ad4833b67e32f802440baf5b67b6d7413c47fc46fb" },
  5: { evidence: "9a36fadbcc65cc6e31c173510a20081e0ce500380a6001ddde6e033fda2fd3b5", doc: "53f750edf7c72a4b41df8650d0362fdb4983750bf9966f752f5c4492cdaa26b4" },
  6: { evidence: "341be83906b17cd9ad972886a11e6f91270fc1eb3d66dc7cad4ff644daec468f", doc: "21227e6a766c9eff565e006e314369049853fbb47c042581534e18f0e7b70ad5" },
  7: { evidence: "bec89adb6ace334390a8fab6ba6dd839e1383dc78c7817a005067436144d8241", doc: "269cae4c5bb32258af62a1b7b22d3cc4a66eba0c022b96bcfe9d90032dd2412c" },
  8: { evidence: "9c0f6c687dab444970e50d11079b401da35e966a5f7f08e3e819dcf25871a8db", doc: "477451fd4a634905417c9242061b92b30f9f322ecee317463f50d3dd89ea567f" },
  9: { evidence: "2dd867648aa3ecb307a041a4868a2f06f934097dded180bc21c5afd1d8f52e4b", doc: "5bb9b64817298e6e75d6ae1b2778bd8c1d770024a05fa72cf4e8ddc0a075eef4" },
  10: { evidence: "3e3af127e2010c95189fde78aa2b77999c76b8026b48c65080a8da3b50bbb3b0", doc: "6daccae8737974d5e97ae05bf33f3c55ce631c1190dc83ffc0aee061540ec29f" },
  11: { evidence: "1ad73dc86d0f8b887b1050090f9384bb231858eea39c309209cd73f4686d8f6e", doc: "57eeed8e00d5efb5997e2d211d9b7df1d4634c3dd3fbea8952fa6b4a372998f8" },
  12: { evidence: "d8e94417b46caa520e42803343a9f24c4b71cfaeceb12df1959c18889587a766", doc: "821b488fb07cdee6c726e6e176451d81a3147cc0b5863e9f26a099d864def94d" },
  13: { evidence: "1bb3b2b680b4686b879ccb657816982ce0ad1f1c2d656f174bf8dd65193e60cd", doc: "d9a39158dda10745b4dbeab7469c5404d5133e6b85424bd50f8355b7cea5d674" },
  14: { evidence: "821386171e3caf4fadc916d18e88a9dda962768e39caa6144532cafa40be265a", doc: "189c21ac2f7a677389e5277c53b8ee112847d63394a944596538e087f04add7d" },
  15: { evidence: "28ec38e9339a19d576d77f6d0e2f809858757f8dcf23d6439b28543167c625c8", doc: "62038919910f00066dbd2180b14e74ed1bee236e98c8808b540aa50c0e4a653b" },
  16: { evidence: "f9d539accd76f00a489c0854c175db91269bf853764f4a7e8fd7a88c9219ec2c", doc: "3fbb25e2cabf12f9841d7821953630512306b2fc753629c5246e2537f9a53763" },
  17: { evidence: "e4ff5796f16be7304f7deb35daaf1a6aea753332d6ae450b08e7dfce5277d34a", doc: "884ad63d4b51300ea76d316943c927b4e91fbc10f5e025017632f3df93c20649" },
  18: { evidence: "812f3f497a7842f9d57e4c8bb54f89c0fcae5fae943faa1e0c59c9a39fe960b3", doc: "9e10b6d559a2d5764ce6e59ec0e9b2621671ba7ab6d41bfd829cd7169f0e0a01" },
  19: { evidence: "b52e6f3b894c3f63c84b49c04ad6a74317370eba13c8421569cc1375850b9ce6", doc: "4bdc08c66f5d8a6296a8e3649944ec64d661a6660126504a0ad0589fa4ce6ccf" },
  20: { evidence: "ba5fa1b0e0010ffeb65f77cbd91a6b136992f47d82300bed51dc36a4bd2014cc", doc: "741d8ab64f95019fd35188aa4661b1cc3777ff5802d313445d40d95788d42c41" },
  21: { evidence: "769bb40e135cea0fff5f450a844e7da1b9f63f9ba385785823d815350ae08586", doc: "297333080fac72fc87c8d44ff3252c0ece106d97c2bcf84bdff1c771dd5742b0" },
  22: { evidence: "fb345eca1778d2b2f4514f6a0eee33b4749d2ad0e2c3441195d332c8e2282ad0", doc: "b9c57628ead648a0426fa0068b24a0dfb0adb0839338d32983133c9d70bf1ea5" },
  23: { evidence: "4ae623c81d7a0d0345a672807a6ba20e1ac3bae812450e45824f26d5ee3346e4", doc: "1c28507bf165e6960a1293764cf192c6decd7619fd756610629edbef8c1011af" },
  24: { evidence: "288bb342ff0e321c1d09646998bb30fde48b564015f487b9ea293dd21245e491", doc: "be4b6a319ca0ac082b46629daf928640670e7e19ec4e5247c8d1b8b9d618e8ab" },
  25: { evidence: "26a2f0c9dfb5442f95c5813cf0f359c3e01ca389ad3f415118b480889a0900ab", doc: "4bd41b232aa24ec2b309aaac30bf07573abf73a614c62d44843a0fca603282bf" },
  26: { evidence: "a4cff030582607369f63bd70cb1ed6a3c5afad4d36997d0f3626684a9122bae1", doc: "2eb2f9e4ccb12149145a881d24d63e552caf05515d73fc1eb95ccf206803636c" },
  27: { evidence: "5e730d95829b186df347d6bfa2f4bc703e3b1e19f369397fb68efffae3026a85", doc: "827fe735000ead669189f29826b8a95003e80a407b44cbe9b1c9b94ea6fdcf54" },
  28: { evidence: "d09f0d3e33bd562898632d0bb13830c09d0b859610edf158bd5d8bb598ebaf8b", doc: "30e705f400f2e5da07f651f1e086c026748fa00d858b37f4a375c9c5c4625f2a" },
  29: { evidence: "c932813860e8d9dade9d7dd66891971a942c694b48ea75b255f6719eca20c91d", doc: "0bf37691f80c93c8c808e431750e97e2f13393f8a42cc1f805896a340c657d82" },
  30: { evidence: "dad6dbec1ab4956cecbe6041535f387ffd1d14107267504b70afaaf472242477", doc: "7651955909d56f707091baef60b1cd5cfb0f81b4b8d28d75a979fab9da940977" },
  31: { evidence: "ee0a10bb68685509c961d7b92edb8cfb8c1b22651fc6d97fa72784d65ba025af", doc: "57abe28a522d3ba643427a690184018be3252abb7fa9ef14b7ce4571317b30d8" },
  32: { evidence: "6301f67aef178a4284bf3f9f70cbf984d4fbe7d2a4cfbfe2f14f2fa93961b989", doc: "e818d931a21902a3d2b02a3a6ce280410dffb9a75997d841894f6daeaeaccbd2" },
  33: { evidence: "806b5582ceaca2c20fcf2f9d12e49d74fd20203a1e9cf796ee2e012d0fac9339", doc: "61fe1034995051f904ddaf2ea1860c44f072350a69314584d6f019aa6224759f" },
  34: { evidence: "49a6bd712f69f16f92f51c2058be7a1fe2d5b54fe277afec2be68b54df06690c", doc: "c7133ef394e44089521e318f461f89ea11ef097bdf00710fbc9b5ad7d20e01d1" },
  35: { evidence: "f2072d5ca523520f2dfe518bee674f3f69d9c14e528216266f4cebaaf45f260e", doc: "2fb614a5b37fa57f7d731dee132f21b9672184a031b33728aede91481d19f854" },
  36: { evidence: "58dc2bc3a5b9973684c6c9bf015e3c2e449d15da6fa446c6c09c555b88938410", doc: "847569d4455a7410eb879db3770b2eb5cac61300f00f9b02036ed068703b188e" },
  37: { evidence: "59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c", doc: "5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601" },
  38: { evidence: "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce", doc: "420b7b300d44302213b6c7ffe48f3ee2a5d63c8d3c8a3ede741839e56d266090" },
  39: { evidence: "86286add231fea7b33ddbd0b667dd53efd4831582d8aed6e3b87e3a70dcdc626", doc: "14fd2f23976dca78ce5f23f4bf3a9b0ae5ef13d050707239d1c90b5363b414e1" },
  40: { evidence: "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a", doc: "459acae2f4df10cf86072b96dbfef292b34c2a5aeaa55e783fa3f45bba67f0e3" },
  41: { evidence: "3d2c05c30543c69dd824826993213d6cf692a916c3d800d302cf46fbafbe0963", doc: "b3c1057fafe83de3eb7a17c32355f4a3bd4e83e9c60a1c9640b8b474b62ef36e" },
  42: { evidence: "b18d54cc288cb3f99df8de3f059ce499ac7254e2758f7770cf4a43deef6873c6", doc: "07e866c8fd5d98e5ddb277e9a7fd0dbef9dda24f06c910e62b90c6f9a0c194d4" },
  43: { evidence: "856457b15dc9e2424d92685bac2a96469c5d3cefffd9bce4b04e8008b3fcb5e7", doc: "709625f702cf00b7c5055a908fd6c8e44a36fa693fe3119764fc07e29b580c07" },
  44: { evidence: "f5dc524a896f764a224018b738b98397df0fb90f072107c3d25d06da89ba9b4d", doc: "a1cd155889da25e50ac03faf1dba728de4af72b3d0388cf094207a5f4ef21877" },
};

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 grind-evidence family digest pin", () => {
  it("covers every version v1..v44 with no gaps", () => {
    expect(Object.keys(VERSIONS).map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));
  });

  for (const [version, hashes] of Object.entries(VERSIONS)) {
    it(`pins checked-in evidence/report bytes for v${version}`, () => {
      expect(sha256(`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v${version}.json`)).toBe(hashes.evidence);
      expect(sha256(`docs/issue55-m4a-note-body-cgb4-v${version}.md`)).toBe(hashes.doc);
    });
  }
});
