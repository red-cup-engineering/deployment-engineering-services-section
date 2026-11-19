import { closedStage, digestBound, ensureClean, isRecord, sameBinding } from "./laws.mjs";
import { refuse } from "./refusal.mjs";

const bindings = ["formationDigest", "artifactDigest", "targetDigest"];
const success = (stage, value) => Object.freeze({ type: "DeploymentFormationStage", stage, value: closedStage(value) });
const cleanPair = (seam, predecessor, next) => !isRecord(predecessor) || !isRecord(next) ? refuse(seam, "malformed-record", "the seam requires predecessor and successor record objects") : ensureClean({ predecessor, next }, seam);

export function boundRequest(request) {
  const dirty = ensureClean(request, "solicitation"); if (dirty) return dirty;
  if (request.type !== "PublicDeliverySolicitation" || request.formationType !== "PublicDeliveryFormation" || typeof request.customer !== "string" || request.customer.length === 0 || request.executionMode !== "dry-run" && request.executionMode !== "live") return refuse("solicitation", "invalid-request", "a customer-specific PublicDeliveryFormation needs a bounded execution mode");
  if (!digestBound(request, bindings) || !Array.isArray(request.exactEffects) || request.exactEffects.length === 0 || !request.exactEffects.every((effect) => typeof effect === "string" && effect.length > 0)) return refuse("solicitation", "unbounded-request", "request needs digest bindings and a non-empty exact string effect set");
  if (request.executionMode === "dry-run" && request.exactEffects.some((effect) => /authority|dns|deliver|publish|upload|deploy|serve|route|header|rollback|runtime|actuat|mutat|cutover|tls|access|execut|apply|change|bind|provision|endpoint|preview[- ]?policy/iu.test(effect))) return refuse("solicitation", "dry-run-overclaim", "dry run cannot claim authority or runtime delivery effects");
  return success("solicited", request);
}
export function authorExactEffectOffer(input) {
  const solicitation = isRecord(input) ? input.solicitation : undefined; const offer = isRecord(input) ? input.offer : undefined;
  const dirty = cleanPair("offer", solicitation, offer); if (dirty) return dirty;
  if (solicitation.closed !== true || offer.type !== "ProviderExactEffectOffer" || offer.author !== "provider" || !sameBinding(solicitation, offer, bindings)) return refuse("offer", "offer-not-exact", "only the provider may author an exactly bound offer after a closed solicitation");
  if (!digestBound(offer, [...bindings, "offerDigest"]) || offer.executionMode !== solicitation.executionMode || JSON.stringify(offer.exactEffects) !== JSON.stringify(solicitation.exactEffects)) return refuse("offer", "offer-effect-drift", "offer effects and digests must exactly equal the solicitation");
  return success("offered", { ...offer, solicitationDigest: solicitation.formationDigest });
}
export function acceptCustomerOffer(input) {
  const offer = isRecord(input) ? input.offer : undefined; const acceptance = isRecord(input) ? input.acceptance : undefined;
  const dirty = cleanPair("acceptance", offer, acceptance); if (dirty) return dirty;
  if (offer.closed !== true || acceptance.type !== "CustomerOfferAcceptance" || acceptance.author !== "customer" || !sameBinding(offer, acceptance, bindings)) return refuse("acceptance", "invalid-acceptance", "customer acceptance must close the exact provider offer");
  if (!digestBound(acceptance, [...bindings, "offerDigest"]) || acceptance.offerDigest !== offer.offerDigest) return refuse("acceptance", "offer-digest-mismatch", "acceptance must bind the offered digest");
  return success("accepted", acceptance);
}
export function grantStorage(input) {
  const acceptance = isRecord(input) ? input.acceptance : undefined; const grant = isRecord(input) ? input.grant : undefined;
  const dirty = cleanPair("custody", acceptance, grant); if (dirty) return dirty;
  if (acceptance.closed !== true || grant.type !== "CustodyGrantReference" || !sameBinding(acceptance, grant, bindings) || !digestBound(grant, [...bindings, "grantDigest"])) return refuse("custody", "invalid-custody-grant", "custody is a digest-bound reference after acceptance");
  return success("custody-granted", grant);
}
export function attestArtifact(input) {
  const storage = isRecord(input) ? input.custody : undefined; const artifact = isRecord(input) ? input.artifact : undefined;
  const dirty = cleanPair("artifact", storage, artifact); if (dirty) return dirty;
  if (storage.closed !== true || artifact.type !== "DigestBoundArtifact" || !sameBinding(storage, artifact, bindings) || !digestBound(artifact, [...bindings, "attestationDigest"])) return refuse("artifact", "artifact-not-attested", "artifact must be attested for the same custody, target, and digest");
  return success("artifact-attested", artifact);
}
export function validateCutover(input) {
  const artifact = isRecord(input) ? input.artifact : undefined; const record = isRecord(input) ? input.receipt : undefined; const check = isRecord(input) ? input.assay : undefined;
  const dirty = ensureClean({ artifact, receipt: record, assay: check }, "cutover"); if (dirty) return dirty;
  if (!isRecord(artifact) || !isRecord(record) || !isRecord(check)) return refuse("cutover", "malformed-record", "cutover requires artifact, settled receipt, and assay records");
  if (artifact.closed !== true || record.type !== "SettledReceiptVector" || record.closed !== true || record.delivered !== true || !sameBinding(artifact, record, bindings) || record.artifactAttestationDigest !== artifact.attestationDigest || !digestBound(record, [...bindings, "artifactAttestationDigest", "receiptDigest"])) return refuse("cutover", "effect-receipt-not-closed", "cutover requires a delivered provider receipt bound to the attested artifact");
  if (check.type !== "IndependentExternalAssay" || check.independent !== true || !sameBinding(artifact, check, bindings) || check.artifactAttestationDigest !== artifact.attestationDigest || check.effectReceiptDigest !== record.receiptDigest || !digestBound(check, [...bindings, "artifactAttestationDigest", "effectReceiptDigest", "assayDigest"])) return refuse("cutover", "assay-not-independent-or-bound", "independent assay must bind the same formation, target, attestation, and provider receipt");
  if (check.stage !== "staging" || check.passed !== true) return refuse("cutover", "staging-not-assayed", "cutover requires a passed artifact-attested staging assay");
  return success("cutover-admitted", { type: "CutoverAdmission", formationDigest: artifact.formationDigest, artifactDigest: artifact.artifactDigest, targetDigest: artifact.targetDigest, artifactAttestationDigest: artifact.attestationDigest, effectReceiptDigest: record.receiptDigest, assayDigest: check.assayDigest });
}
