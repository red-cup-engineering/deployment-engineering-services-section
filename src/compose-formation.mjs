import { acceptCustomerOffer, validateCutover, attestArtifact, authorExactEffectOffer, boundRequest, grantStorage } from "./formation.mjs";
import { settleRecordVector } from "./receipt-vector.mjs";

function rejected(result) { return result?.type === "DeploymentFormationRefusal"; }

export function composeDeploymentCreation({ solicitation: request, offer, acceptance, custodyGrant: storageGrant, artifact, providerReceipt: providerRecord, assay: check }) {
  const stages = [];
  const advance = (result) => {
    if (rejected(result)) return result;
    stages.push(result);
    return result.value;
  };

  const solicited = advance(boundRequest(request));
  if (rejected(solicited)) return solicited;
  const offered = advance(authorExactEffectOffer({ solicitation: solicited, offer }));
  if (rejected(offered)) return offered;
  const accepted = advance(acceptCustomerOffer({ offer: offered, acceptance }));
  if (rejected(accepted)) return accepted;
  const storage = advance(grantStorage({ acceptance: accepted, grant: storageGrant }));
  if (rejected(storage)) return storage;
  const attested = advance(attestArtifact({ custody: storage, artifact }));
  if (rejected(attested)) return attested;
  const record = settleRecordVector(providerRecord);
  if (rejected(record)) return record;
  const cutover = validateCutover({ artifact: attested, receipt: record, assay: check });
  if (rejected(cutover)) return cutover;
  stages.push(Object.freeze({ type: "DeploymentFormationStage", stage: "receipt-settled", value: record }), cutover);
  return Object.freeze({ type: "DeploymentFormation", closed: true, stages: Object.freeze(stages), cutover: cutover.value });
}
