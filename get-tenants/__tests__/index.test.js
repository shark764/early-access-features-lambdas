const axios = require('axios');

jest.mock('axios');

global.Date.now = jest.fn(() => 1588787136364);
global.Date.prototype.getTime = jest.fn(() => '00:00:00');

global.process.env = {
  AWS_REGION: 'us-east-1',
  ENVIRONMENT: 'dev',
  DOMAIN: 'domain',
};

axios.mockImplementation(() => ({
  data: {
    result: [
      {
        description: null,
        parentIds: [
          'd5713300-0f99-11ea-9e38-9440dab83f25',
        ],
        timezone: 'US/Eastern',
        regionId: '9780e900-0d64-11ea-9e38-9440dab83f25',
        createdBy: 'd3f30510-1126-11ea-9dea-25d8fc8b2383',
        parent: {
          id: 'd5713300-0f99-11ea-9e38-9440dab83f25',
          name: 'Platform',
        },
        defaultIdentityProvider: null,
        updated: '2021-01-19T14:33:11Z',
        name: 'Chris DEV Tenant',
        clientLogLevel: null,
        adminUserId: 'd3f30510-1126-11ea-9dea-25d8fc8b2383',
        created: '2020-01-14T15:32:40Z',
        outboundIntegrationId: '19d99f30-36e3-11ea-abc3-fbe325d6ed9d',
        updatedBy: '3fb95c90-36e3-11ea-abc3-fbe325d6ed9d',
        active: true,
        id: '679236b5-c4d0-49b6-bcf9-871c35a3e4af',
        capacityRuleId: null,
        defaultSlaId: '0829d4b0-0f9e-11ea-9e38-9440dab83f25',
        cxengageIdentityProvider: 'enabled',
        childIds: [
          '08e2edee-0810-4ead-972b-b6db355b6d80',
        ],
        parentId: 'd5713300-0f99-11ea-9e38-9440dab83f25',
      },
    ],
  },
}));

const mockGet = jest.fn()
  .mockImplementation(() => ({
    promise: () => ({
      Body: '',
    }),
  }));

const mockGetSecretValue = jest.fn()
  .mockImplementation(() => ({
    promise: () => ({
      SecretString: JSON.stringify({
        id: 'mock-secret-id',
        secret: 'mock-secret',
      }),
    }),
  }));

const mockSendMessage = jest.fn()
  .mockImplementation(() => ({
    promise: () => ({}),
  }));

const mockGetQueueUrl = jest.fn()
  .mockImplementation(() => ({
    promise: () => ({
      QueueUrl: 'url://testurl',
    }),
  }));

jest.mock('aws-sdk', () => ({
  config: {
    update: jest.fn(),
  },
  SQS: jest.fn().mockImplementation(() => ({
    getQueueUrl: mockGetQueueUrl,
    sendMessage: mockSendMessage, // mockSendMessage,
  })),
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      get: mockGet,
    })),
  },
  SecretsManager: jest.fn().mockImplementation(() => ({
    getSecretValue: mockGetSecretValue,
  })),
}));

const index = require('../index');

const { handler } = index;

const body = {
  regionId: '9780e900-0d64-11ea-9e38-9440dab83f25',
  feature: 'test1',
  featureActiveFlag: false,
};

const event = (bodyParam = body) => ({
  Records: [{
    body: JSON.stringify(bodyParam),
  }],
});

describe('get-tenants', () => {
  it('returns when the code runs without any error', async () => {
    const result = await handler(event);
    expect(result).toEqual('Finished');
  });

  it('throws an error when there is a problem retrieving cx credentials', async () => {
    mockGetSecretValue.mockRejectedValueOnce(new Error());
    try {
      await handler(event());
    } catch (error) {
      expect(Promise.reject(new Error('An Error has occurred trying to retrieve cx credentials'))).rejects.toThrowErrorMatchingSnapshot();
    }
  });

  it('throws an error when there is a problem calling get-tenants', async () => {
    try {
      const error = new Error();
      error.response = {
        status: 404,
      };
      axios.mockImplementationOnce(() => ({
        data: {
          method: 'get',
          url: 'https://dev-api.cxengagelabs.net/v1/tenants?regionId=00000000-0000-0000-0000-0000000000',
        },
      }));
      axios.mockImplementationOnce(error);
    } catch (error) {
      expect('An Error has occurred trying to get-tenants').rejects.toThrowErrorMatchingSnapshot();
    }
  });

  it('throws an error when trying to send payload', async () => {
    try {
      const error = new Error();
      error.response = {
        status: 404,
      };
      axios.mockImplementationOnce(() => ({
        data: {
          method: 'get',
          url: 'https://dev-api.cxengagelabs.net/v1/tenants?regionId=00000000-0000-0000-0000-0000000000',
        },
      }));
      axios.mockImplementationOnce(error);
    } catch (error) {
      expect('An Error has occurred trying send payload').rejects.toThrowErrorMatchingSnapshot();
    }
    const result = await handler(event);
    expect(result).toMatchSnapshot();
  });
});
