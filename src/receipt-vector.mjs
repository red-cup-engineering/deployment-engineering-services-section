import { RESIDUE_DIMENSIONS, RESIDUE_STATUSES, digestBound, ensureClean, isRecord } from "./laws.mjs";
import { refuse } from "./refusal.mjs";

const recordBindings = ["formationDigest", "artifactDigest", "targetDigest", "artifactAttestationDigest", "receiptDigest"];
export function settleRecordVector(record) {
  const dirty = ensureClean(record, "receipt-vector"); if (dirty) return dirty;
  if (record.type !== "ProviderEffectReceipt" || !digestBound(record, recordBindings)) return refuse("receipt-vector", "unbound-receipt", "receipt requires formation, artifact, target, attestation, and receipt digests");
  const vector = record.residue;
  if (!isRecord(vector) || Object.keys(vector).length !== RESIDUE_DIMENSIONS.length || !RESIDUE_DIMENSIONS.every((key) => RESIDUE_STATUSES.includes(vector[key]))) return refuse("receipt-vector", "invalid-residue-vector", "receipt must settle every required dimension separately");
  const claimed = RESIDUE_DIMENSIONS.filter((key) => vector[key] === "pass" || vector[key] === "fail");
  const required = record.requiredResidues ?? claimed;
  const requiredSet = Array.isArray(required) ? new Set(required) : new Set();
  if (!Array.isArray(required) || required.length === 0 || requiredSet.size !== required.length || !required.every((key) => RESIDUE_DIMENSIONS.includes(key)) || required.length !== claimed.length || !claimed.every((key) => requiredSet.has(key))) return refuse("receipt-vector", "invalid-required-residue", "required residues must equal the complete nonempty set of pass/fail claimed dimensions");
  const delivered = !RESIDUE_DIMENSIONS.some((key) => vector[key] === "fail") && required.every((key) => vector[key] === "pass");
  return Object.freeze({ type: "SettledReceiptVector", formationDigest: record.formationDigest, artifactDigest: record.artifactDigest, targetDigest: record.targetDigest, artifactAttestationDigest: record.artifactAttestationDigest, receiptDigest: record.receiptDigest, requiredResidues: Object.freeze([...required]), residue: Object.freeze({ ...vector }), delivered, closed: true });
}
