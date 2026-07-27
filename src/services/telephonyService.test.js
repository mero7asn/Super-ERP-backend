const test = require('node:test');
const assert = require('node:assert/strict');
const { createTelephonyService } = require('./telephonyService');

test('supports SIP/WebRTC call routing with a dial URI', async () => {
  const service = createTelephonyService({
    provider: 'sip',
    serverUrl: 'wss://softphone.example.com',
    extension: '1001',
    username: 'crm-agent',
  });

  const result = await service.placeCall({ phoneNumber: '+15551234567', agentExtension: '1001' });

  assert.equal(result.provider, 'sip');
  assert.equal(result.status, 'queued');
  assert.match(result.callUri, /^sip:/);
  assert.match(result.message, /SIP/i);
});
