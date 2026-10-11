import assert from "node:assert/strict";
import test from "node:test";
import { sealDeploymentRecord, verifyDeploymentRecord } from "../src/canonical-record.mjs";

test("canonical deployment identity is independent of object insertion order", () => {
  const left = sealDeploymentRecord({ type: "ProviderEffectReceipt", nested: { z: 2, a: 1 }, values: [true, null, "x"] });
  const right = sealDeploymentRecord({ values: [true, null, "x"], nested: { a: 1, z: 2 }, type: "ProviderEffectReceipt" });
  assert.equal(left.recordDigest, right.recordDigest);
  assert.equal(verifyDeploymentRecord(left), true);
});

test("verification refuses mutation, malformed digests, and non-JSON values", () => {
  const sealed = sealDeploymentRecord({ type: "IndependentExternalAssay", passed: true });
  assert.equal(verifyDeploymentRecord({ ...sealed, passed: false }), false);
  assert.equal(verifyDeploymentRecord({ ...sealed, recordDigest: "sha256:not-ni" }), false);
  assert.throws(() => sealDeploymentRecord({ value: () => undefined }), /unsupported/u);
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => sealDeploymentRecord(cyclic), /must not be cyclic/u);
});
