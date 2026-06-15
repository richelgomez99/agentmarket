// Pure unit test for mapApassVerdict — the centralized A-Pass verdict mapper (OQ-1 change point).
// No live network. Run: `cd app && npx tsx lib/cleanverse.mapApassVerdict.test.ts`
// (tsc also type-checks it via `npx tsc --noEmit`.)
import { mapApassVerdict, type CvResponse } from "./cleanverse";

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
const observedUnverified: CvResponse<any> = {
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

// 2) Synthesized VERIFIED payload (OQ-1 unobserved): outer 0000, inner code 0.
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
