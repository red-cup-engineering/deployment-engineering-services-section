import { createHash } from "node:crypto";

const NI_SHA256 = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

function canonicalValue(value, seen) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("deployment record numbers must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("deployment records must not be cyclic");
    seen.add(value);
    const result = `[${value.map((item) => canonicalValue(item, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }
  if (value === null || typeof value !== "object") throw new TypeError("deployment records must contain only JSON values");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError("deployment records must contain only plain JSON objects");
  if (seen.has(value)) throw new TypeError("deployment records must not be cyclic");
  seen.add(value);
  const result = `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key], seen)}`).join(",")}}`;
  seen.delete(value);
  return result;
}

export function canonicalDeploymentRecord(record) {
  return canonicalValue(record, new Set());
}

export function identifyDeploymentRecord(record) {
  const digest = createHash("sha256").update(canonicalDeploymentRecord(record)).digest("base64url");
  return `ni:///sha-256;${digest}`;
}

export function sealDeploymentRecord(record, digestField = "recordDigest") {
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new TypeError("deployment record must be a JSON object");
  if (typeof digestField !== "string" || !/^[A-Za-z][A-Za-z0-9]*Digest$/u.test(digestField)) throw new TypeError("deployment digest field must be a named Digest field");
  if (Object.hasOwn(record, digestField)) throw new TypeError(`deployment record already contains ${digestField}`);
  const digest = identifyDeploymentRecord(record);
  return Object.freeze({ ...record, [digestField]: digest });
}

export function verifyDeploymentRecord(record, digestField = "recordDigest") {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return false;
  const claimed = record[digestField];
  if (typeof claimed !== "string" || !NI_SHA256.test(claimed)) return false;
  const unsigned = Object.fromEntries(Object.entries(record).filter(([key]) => key !== digestField));
  try { return identifyDeploymentRecord(unsigned) === claimed; } catch { return false; }
}
