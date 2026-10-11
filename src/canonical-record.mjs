import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

/** A deployment record's identity: its semiotic content address. */
export function identifyDeploymentRecord(record) {
  return semanticId(record);
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
  if (typeof claimed !== "string" || !isNiUri(claimed)) return false;
  const unsigned = Object.fromEntries(Object.entries(record).filter(([key]) => key !== digestField));
  try { return identifyDeploymentRecord(unsigned) === claimed; } catch { return false; }
}
