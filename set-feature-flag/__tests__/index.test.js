const axios = require('axios');

jest.mock('axios');

global.Date.now = jest.fn(() => 1588787136364);
global.Date.prototype.getTime = jest.fn(() => '00:00:00');

global.process.env = {
  AWS_REGION: 'us-east-1',
  ENVIRONMENT: 'qe',
  DOMAIN: 'domain',
};

axios.mockImplementation(() => ({
  data: {
    result: {
      name: 'mockName',
      value: false,
    },
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

const body = {
  tenantId: '679236b5-c4d0-49b6-bcf9-871c35a3e4af',
  featureFlag: 'mockFeatureFlag',
  description: 'mock description',
  value: true,
};

const event = (bodyParam = body) => ({
  Records: [{
    body: JSON.stringify(bodyParam),
  }],
});

const mockSqsSendMessage = jest.fn()
  .mockImplementation(() => ({
    promise: () => ({}),
  }));

jest.mock('aws-sdk', () => ({
  config: {
    update: jest.fn(),
  },
  SQS: jest.fn().mockImplementation(() => ({
    sendMessage: mockSqsSendMessage,
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

describe('set-feature-flag', () => {
  it('throws an error when there is a problem retrieving cx credentials', async () => {
    mockGetSecretValue.mockRejectedValueOnce(new Error());
    try {
      await handler(event());
    } catch (error) {
      expect(Promise.reject(new Error('An Error has occurred trying to retrieve cx credentials'))).rejects.toThrowErrorMatchingSnapshot();
    }
  });

  it('returns when the code runs without any error', async () => {
    axios.mockImplementationOnce(() => Promise.resolve(event()));
    await expect(handler(event())).resolves.toEqual('Finished');
    expect(axios.mock.calls).toMatchSnapshot();
  });
});
