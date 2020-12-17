const { lambda: { log } } = require('alonzo');
const axios = require('axios');
const AWS = require('aws-sdk');

const secretsClient = new AWS.SecretsManager();
const {
  AWS_REGION,
  ENVIRONMENT,
  DOMAIN,
} = process.env;

exports.handler = async (event) => {
  const body = JSON.parse(event.Records[0].body);
  const {
    tenantId, feature, featureActiveFlag,
  } = body;

  const logContext = { tenantId, feature, featureActiveFlag };

  let cxAuthSecret;
  try {
    cxAuthSecret = await secretsClient.getSecretValue({
      SecretId: `${AWS_REGION}-${ENVIRONMENT}-smooch-cx`,
    }).promise();
  } catch (error) {
    log.error(
      'An Error has occurred trying to retrieve cx credentials',
      logContext,
      error,
    );
    throw error;
  }

  const auth = JSON.parse(cxAuthSecret.SecretString);
  let betaFeaturesResult;
  try {
    betaFeaturesResult = await axios({
      method: 'get',
      url: `https://${ENVIRONMENT}-api.${DOMAIN}/v1/tenants/${tenantId}/settings/betaFeatures/value`,
      auth,
    });
  } catch (error) {
    log.error(
      'An Error has occurred trying to get beta features',
      logContext,
      error,
    );
    throw error;
  }

  const tenantBetaFeatures = betaFeaturesResult.data.result;

  log.info('get betaFeatures called', { ...logContext, tenantBetaFeatures });

  let featureFound = false;
  let featureState;
  for (const [key, value] of Object.entries(tenantBetaFeatures)) {
    if (key === feature) {
      featureFound = true;
      featureState = value;
    }
  }

  if (featureFound && featureState === featureActiveFlag) {
    log.info('Feature is already on tenant with the correct state', logContext);
  } else {
    const newBetaFeatures = {
      ...tenantBetaFeatures,
      [feature]: featureActiveFlag,
    };
    try {
      await axios({
        method: 'put',
        url: `https://${ENVIRONMENT}-api.${DOMAIN}/v1/tenants/${tenantId}/settings/betaFeatures/value`,
        auth,
        data: newBetaFeatures,
      });
    } catch (err) {
      log.error('Error', logContext, err);

      throw err;
    }
    log.info('update-beta-features called', { ...logContext, newBetaFeatures });
  }
  log.info('update-beta-features is complete');
  return 'Finished';
};
