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
    tenantId, featureFlag, value, description,
  } = body;

  const logContext = {
    tenantId, featureFlag, value, description,
  };
  log.info('set-feature-flag called', logContext);

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
  const newTenantFeature = {
    name: featureFlag,
    description,
    value,
  };
  try {
    await axios({
      method: 'post',
      url: `https://${AWS_REGION}-${ENVIRONMENT}-api.${DOMAIN}/v1/tenants/${tenantId}/settings`,
      auth,
      data: newTenantFeature,
    });
  } catch (err) {
    log.error('An error occurred trying to call the tenant settings API', logContext, err);
    throw err;
  }

  log.info('set-feature-flag is complete', logContext);
  return 'Finished';
};
