import assert from "node:assert/strict";
import test from "node:test";
import { composeDeploymentFormation } from "../src/compose-formation.mjs";

const digest = (tail) => `ni:///sha-256;${tail}`;
const formationDigest = digest("formation"), artifactDigest = digest("artifact"), targetDigest = digest("target"), attestationDigest = digest("attestation"), receiptDigest = digest("receipt");
const binding = { formationDigest, artifactDigest, targetDigest };
const residue = { artifactByteParity: "pass", requestedProviderRoute: "pass", effectScopeAndCustody: "pass", dnsTlsPath: "not-applicable", accessPolicy: "pass", rollback: "pass" };

function input(overrides = {}) {
  return {
    solicitation: { type: "PublicDeliverySolicitation", formationType: "PublicDeliveryFormation", customer: "urn:customer:test", ...binding, executionMode: "live", exactEffects: ["stage exact artifact"] },
    offer: { type: "ProviderExactEffectOffer", author: "provider", ...binding, executionMode: "live", exactEffects: ["stage exact artifact"], offerDigest: digest("offer") },
    acceptance: { type: "CustomerOfferAcceptance", author: "customer", ...binding, offerDigest: digest("offer") },
    custodyGrant: { type: "CustodyGrantReference", ...binding, grantDigest: digest("grant") },
    artifact: { type: "DigestBoundArtifact", ...binding, attestationDigest },
    providerReceipt: { type: "ProviderEffectReceipt", ...binding, artifactAttestationDigest: attestationDigest, receiptDigest, residue },
    assay: { type: "IndependentExternalAssay", independent: true, stage: "staging", passed: true, ...binding, artifactAttestationDigest: attestationDigest, effectReceiptDigest: receiptDigest, assayDigest: digest("assay") },
    ...overrides,
  };
}

test("composer closes the complete provider-neutral deployment formation", () => {
  const result = composeDeploymentFormation(input());
  assert.equal(result.type, "DeploymentFormation");
  assert.equal(result.closed, true);
  assert.equal(result.cutover.type, "CutoverAdmission");
  assert.deepEqual(result.stages.map(({ stage }) => stage), ["solicited", "offered", "accepted", "custody-granted", "artifact-attested", "receipt-settled", "cutover-admitted"]);
});

test("composer returns the first typed refusal without attempting later seams", () => {
  const result = composeDeploymentFormation(input({ offer: { type: "ProviderExactEffectOffer", author: "provider" } }));
  assert.equal(result.type, "DeploymentFormationRefusal");
  assert.equal(result.seam, "offer");
});
