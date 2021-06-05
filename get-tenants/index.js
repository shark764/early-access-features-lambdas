const { lambda: { log } } = require('alonzo');
const axios = require('axios');
const AWS = require('aws-sdk');

const secretsClient = new AWS.SecretsManager();
const {
  AWS_REGION,
  ENVIRONMENT,
  DOMAIN,
} = process.env;

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

exports.handler = async (event) => {
  const { feature, featureActiveFlag } = event;
  const logContext = { feature, featureActiveFlag };

  log.info('get-tenants called', logContext);

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

  let getTenantsResults;
  try {
    getTenantsResults = await axios({
      method: 'get',
      url: `https://${AWS_REGION}-${ENVIRONMENT}-edge.${DOMAIN}/v1/tenants?regionId=00000000-0000-0000-0000-0000000000`,
      auth,
    });
  } catch (error) {
    log.error(
      'An Error has occurred trying to get-tenants',
      logContext,
      error,
    );
    throw error;
  }

  const tenantData = getTenantsResults.data.result;
  log.info('Got tenants to update', { ...logContext, numberOfTenants: tenantData.length });

  try {
    await Promise.all(tenantData.map(async (tenant) => {
      const tenantId = tenant.id;
      const tenantName = tenant.name;
      const QueueName = `${AWS_REGION}-${ENVIRONMENT}-update-beta-features`;
      const { QueueUrl } = await sqs.getQueueUrl({ QueueName }).promise();

      const payload = JSON.stringify({
        tenantId,
        feature,
        featureActiveFlag,
      });

      log.debug('calling update-beta-features for tenant', {
        ...logContext,
        tenantName,
        tenantId,
        payload,
      });

      const sqsMessageAction = {
        MessageBody: payload,
        QueueUrl,
      };

      await sqs.sendMessage(sqsMessageAction).promise();
    }));
  } catch (error) {
    log.error(
      'An Error has occurred trying send payload',
      logContext,
      error,
    );
    throw error;
  }

  log.info('get-tenants is complete', logContext);
  return 'Finished';
};
