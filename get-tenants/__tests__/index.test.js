const axios = require('axios');

jest.mock('axios');

global.process.env = {
  AWS_REGION: 'us-east-1',
  ENVIRONMENT: 'dev',
  DOMAIN: 'domain',
};

axios.mockImplementation(() => ({
  data: {
    result: [
      {
        name: 'Mock Tenant 1',
        id: '00000000-0000-0000-0000-000000000001',
      },
      {
        name: 'Mock Tenant 2',
        id: '00000000-0000-0000-0000-000000000002',
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
      QueueUrl: 'mock-beta-features-queue-url',
    }),
  }));

jest.mock('aws-sdk', () => ({
  config: {
    update: jest.fn(),
  },
  SQS: jest.fn().mockImplementation(() => ({
    getQueueUrl: mockGetQueueUrl,
    sendMessage: mockSendMessage,
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

const event = {
  feature: 'mock-feature',
  featureActiveFlag: true,
};

describe('get-tenants', () => {
  let result;
  beforeAll(async () => {
    result = await handler(event);
  });
  it('returns when the code runs without any error', async () => {
    expect(result).toEqual('Finished');
  });
  it('calls get secret value as expected', () => {
    expect(mockGetSecretValue.mock.calls).toMatchSnapshot();
  });
  it('calls get tenants as expected', () => {
    expect(axios.mock.calls).toMatchSnapshot();
  });
  it('puts events to update-beta-features queue as expected', () => {
    expect(mockSendMessage.mock.calls).toMatchSnapshot();
  });
});
