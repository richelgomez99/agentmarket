// Cleanverse compliance stack adapter (SERVER-SIDE ONLY — api-key never reaches the client
// and is never committed; lives in .env.local). Verified Finance hackathon, Track 02.
//
// Auth: every request carries the `api-id` header (App ID). Write/issuance endpoints AES-encrypt
// the JSON body and send {"data":"<base64>"}; query/verify endpoints send plaintext.
// AES: AES-256-CBC, PKCS5/PKCS7 padding, fixed 16 zero-byte IV, key = Base64-decoded api-key.
import crypto from "crypto";

const API_ID = process.env.CLEANVERSE_API_ID || "";
const API_KEY_B64 = process.env.CLEANVERSE_API_KEY || "";
const BASE = process.env.CLEANVERSE_BASE_URL || "https://uatapi.cleanverse.com/api/cooperate";
// Chain identifier for Monad on Cleanverse (override via env once confirmed against the API).
export const CV_CHAIN = process.env.CLEANVERSE_CHAIN || "monad";

// Live-validated Cleanverse Monad contract addresses (SPEC §3 — sandbox-confirmed).
// Single source of truth so no address is hardcoded ad hoc.
export const AUSDC_MONAD = "0xaC0893567D43C3E7e6e35a72803df05416C1f20D";
export const APASS_MONAD = "0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9";
export const ACCESSCORE_MONAD = "0x8F118338a1fa41E7Fa86Be19A4e8B99Ed58A6EcC";
export const USDC_MONAD = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

export function cvConfigured() {
  return !!API_ID && !!API_KEY_B64;
}

/** AES-256-CBC encrypt a JSON string -> base64 (for the {"data":...} envelope). */
export function cvEncrypt(json: string): string {
  const key = Buffer.from(API_KEY_B64, "base64"); // 32 bytes -> AES-256
  const iv = Buffer.alloc(16, 0); // fixed zero IV per spec
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv); // PKCS7 padding (default)
  return Buffer.concat([cipher.update(json, "utf8"), cipher.final()]).toString("base64");
}

/** AES-256-CBC decrypt a base64 payload -> string (some responses come back encrypted). */
export function cvDecrypt(b64: string): string {
  const key = Buffer.from(API_KEY_B64, "base64");
  const iv = Buffer.alloc(16, 0);
  const d = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([d.update(Buffer.from(b64, "base64")), d.final()]).toString("utf8");
}

export type CvResponse<T = unknown> = { code: string; message: string; data?: T };

/**
 * Call a Cleanverse cooperate endpoint.
 * @param path e.g. "/verify_apass" (leading slash)
 * @param body plaintext request object
 * @param encrypted true for write/issuance endpoints that require the AES {"data":...} envelope
 */
export async function cvFetch<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  encrypted = false,
  signal?: AbortSignal
): Promise<CvResponse<T>> {
  const payload = encrypted ? { data: cvEncrypt(JSON.stringify(body)) } : body;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-id": API_ID,
      "X-Request-ID": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: CvResponse<T>;
  try {
    json = JSON.parse(text) as CvResponse<T>;
  } catch {
    return { code: String(res.status), message: text.slice(0, 200) };
  }
  // Some endpoints return an encrypted data string; transparently decrypt to an object.
  if (typeof (json as { data?: unknown }).data === "string" && /^[A-Za-z0-9+/=]+$/.test((json as { data: string }).data) && (json as { data: string }).data.length > 24) {
    try {
      (json as { data: unknown }).data = JSON.parse(cvDecrypt((json as { data: string }).data));
    } catch {
      /* leave as-is if it wasn't actually encrypted */
    }
  }
  return json;
}

export const isOk = (r: CvResponse) => r.code === "0000";

// ── Common Queries (plaintext) ──────────────────────────────────────────────
/** Supported A-Tokens on a chain (discovers the aUSDC contract address). */
export const cvSupportedATokens = (chain = CV_CHAIN, symbol?: string) =>
  cvFetch("/query_deposit_atoken_list", symbol ? { chain, symbol } : { chain });

/** Verify a wallet holds a valid A-Pass for a given A-Token (the compliance gate). */
export const cvVerifyApass = (address: string, atoken: string, chain = CV_CHAIN) =>
  cvFetch<{ verified?: boolean; status?: string; chain: string; atoken: string; address: string }>("/verify_apass", { address, atoken, chain });

/** Query an A-Pass record for a wallet. */
export const cvQueryApass = (address: string, chain = CV_CHAIN) => cvFetch("/query_apass", { address, chain });

/** Faucet test tokens (usdc / ausdc) to a deposit address. */
export const cvFaucet = (depositAddress: string, symbol: string, amount: string, chain = CV_CHAIN) =>
  cvFetch("/faucet", { chain, symbol, depositAddress, amount });

/** On-chain transactions for an address (audit trail). */
export const cvQueryTxs = (body: Record<string, unknown>) => cvFetch("/query_txs", body);

/** Travel Rule export (audit-ready report). */
export const cvDownloadTravelRule = (body: Record<string, unknown>) => cvFetch("/download_travel_rule", body);
