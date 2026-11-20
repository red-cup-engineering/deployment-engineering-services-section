import { acceptCustomerOffer, admitCutover, attestArtifact, authorExactEffectOffer, boundSolicitation, grantCustody } from "./formation.mjs";
import { settleReceiptVector } from "./receipt-vector.mjs";

function refused(result) { return result?.type === "DeploymentFormationRefusal"; }

export function composeDeploymentFormation({ solicitation, offer, acceptance, custodyGrant, artifact, providerReceipt, assay }) {
  const stages = [];
  const advance = (result) => {
    if (refused(result)) return result;
    stages.push(result);
    return result.value;
  };

  const solicited = advance(boundSolicitation(solicitation));
  if (refused(solicited)) return solicited;
  const offered = advance(authorExactEffectOffer({ solicitation: solicited, offer }));
  if (refused(offered)) return offered;
  const accepted = advance(acceptCustomerOffer({ offer: offered, acceptance }));
  if (refused(accepted)) return accepted;
  const custody = advance(grantCustody({ acceptance: accepted, grant: custodyGrant }));
  if (refused(custody)) return custody;
  const attested = advance(attestArtifact({ custody, artifact }));
  if (refused(attested)) return attested;
  const receipt = settleReceiptVector(providerReceipt);
  if (refused(receipt)) return receipt;
  const cutover = admitCutover({ artifact: attested, receipt, assay });
  if (refused(cutover)) return cutover;
  stages.push(Object.freeze({ type: "DeploymentFormationStage", stage: "receipt-settled", value: receipt }), cutover);
  return Object.freeze({ type: "DeploymentFormation", closed: true, stages: Object.freeze(stages), cutover: cutover.value });
}
