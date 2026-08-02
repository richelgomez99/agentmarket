// Pure unit test for mapApassVerdict — the centralized A-Pass verdict mapper (OQ-1 change point).
// No live network. Run: `cd app && npx tsx lib/cleanverse.mapApassVerdict.test.ts`
// (tsc also type-checks it via `npx tsc --noEmit`.)
import { mapApassVerdict } from "./cleanverse";

// The mapper's argument type (CvResponse<ApassInner>), without importing the internal alias.
type ApassResponse = Parameters<typeof mapApassVerdict>[0];

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

// 1) Observed UNVERIFIED payload (SPEC §3): outer 0000, inner code 2 "apass not exist".
const observedUnverified: ApassResponse = {
  code: "0000",
  message: "ok",
  data: {
    chain: "monad",
    atoken: "0xaC0893567D43C3E7e6e35a72803df05416C1f20D",
    address: "0x261B000000000000000000000000000000000CF95",
    code: 2,
    message: "apass not exist",
    magickLink: "https://test-magiclink.cleanverse.com/",
  },
};
{
  const v = mapApassVerdict(observedUnverified);
  assert(v.verified === false, "observed unverified ⇒ verified:false");
  assert(v.status === "unverified", "observed unverified ⇒ status 'unverified'");
  assert(v.onboardUrl === "https://test-magiclink.cleanverse.com/", "observed unverified ⇒ onboardUrl = magickLink");
  assert(typeof v.checkedAt === "number", "observed unverified ⇒ checkedAt stamped");
}

// 2) CONFIRMED VERIFIED payload (OQ-1 RESOLVED, live sandbox): outer 0000, inner code 4
//    "apass verify success". magickLink is present in BOTH states, so it must NOT flip the verdict.
const observedVerified: ApassResponse = {
  code: "0000",
  message: "ok",
  data: {
    chain: "monad",
    atoken: "0xaC0893567D43C3E7e6e35a72803df05416C1f20D",
    address: "0xAf5E06f8924d4480EfEeA1122485a8e9C63c2Abd",
    code: 4,
    message: "apass verify success",
    magickLink: "https://test-magiclink.cleanverse.com/",
  },
};
{
  const v = mapApassVerdict(observedVerified);
  assert(v.verified === true, "observed verified (code 4) ⇒ verified:true");
  assert(v.status === "verified", "observed verified (code 4) ⇒ status 'verified'");
  assert(v.onboardUrl === undefined, "verified ⇒ no onboardUrl despite magickLink present");
  assert(typeof v.checkedAt === "number", "observed verified ⇒ checkedAt stamped");
}
// 2a) Defensive: inner code 0 also treated as success (shape-drift fallback).
{
  const v = mapApassVerdict({ code: "0000", message: "ok", data: { code: 0, message: "ok" } });
  assert(v.verified === true, "inner code 0 ⇒ verified:true");
  assert(v.status === "verified", "inner code 0 ⇒ status 'verified'");
  assert(v.onboardUrl === undefined, "verified ⇒ no onboardUrl");
}
// 2b) Alternate defensive success signals.
{
  const a = mapApassVerdict({ code: "0000", message: "ok", data: { verified: true } });
  assert(a.verified === true && a.status === "verified", "inner verified:true ⇒ verified");
  const b = mapApassVerdict({ code: "0000", message: "ok", data: { status: "valid" } });
  assert(b.verified === true && b.status === "verified", "inner status 'valid' ⇒ verified");
}

// 3) Transport/outer failure ⇒ unavailable (NOT a hard unverified).
{
  const v = mapApassVerdict({ code: "500", message: "Internal Server Error" });
  assert(v.verified === false, "non-0000 outer ⇒ verified:false");
  assert(v.status === "unavailable", "non-0000 outer ⇒ status 'unavailable'");
  assert(v.onboardUrl === undefined, "unavailable ⇒ no onboardUrl");
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) FAILED`);
  process.exit(1);
}
console.log("\nAll mapApassVerdict assertions passed.");
