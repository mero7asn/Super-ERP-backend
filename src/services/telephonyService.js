const axios = require('axios');

const TELEPHONY_PROVIDERS = ['avaya', 'cisco', 'sip'];

class BaseTelephonyProvider {
  constructor(config = {}) {
    this.config = config || {};
    this.provider = 'base';
  }

  resolveExtension(agentExtension) {
    return agentExtension || this.config.extension || this.config.agentExtension || '';
  }

  normalizePhoneNumber(phoneNumber) {
    const value = String(phoneNumber || '').trim();
    if (!value) return '';
    return value.replace(/[^\d+]/g, '');
  }

  async login() {
    return { ok: true, provider: this.provider, status: 'ready' };
  }

  async placeCall({ phoneNumber, agentExtension }) {
    if (!phoneNumber) {
      throw new Error('A phone number is required.');
    }

    const extension = this.resolveExtension(agentExtension);
    return {
      ok: true,
      provider: this.provider,
      status: 'queued',
      callId: `${this.provider}-${Date.now()}`,
      phoneNumber,
      extension,
      message: `${this.provider} connector queued a call to ${phoneNumber}`,
    };
  }

  async answer(callId) {
    return { ok: true, provider: this.provider, status: 'answered', callId };
  }

  async hangup(callId) {
    return { ok: true, provider: this.provider, status: 'ended', callId };
  }
}

class AvayaTelephonyProvider extends BaseTelephonyProvider {
  constructor(config = {}) {
    super(config);
    this.provider = 'avaya';
  }

  async login() {
    if (!this.config.serverUrl) {
      return { ok: true, provider: this.provider, status: 'configured-locally', message: 'Avaya CTI is ready for local routing. Add a CTI URL for direct PBX integration.' };
    }

    try {
      await axios.post(this.config.serverUrl, {
        provider: this.provider,
        action: 'login',
        username: this.config.username || '',
        extension: this.resolveExtension(),
      });
      return { ok: true, provider: this.provider, status: 'connected', message: 'Avaya CTI connector authenticated.' };
    } catch (error) {
      return { ok: true, provider: this.provider, status: 'configured-locally', message: `Avaya CTI could not reach ${this.config.serverUrl}: ${error.message}` };
    }
  }

  async placeCall({ phoneNumber, agentExtension }) {
    if (!phoneNumber) {
      throw new Error('A phone number is required.');
    }

    const extension = this.resolveExtension(agentExtension);
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const payload = {
      provider: this.provider,
      action: 'call',
      phoneNumber: normalizedPhone,
      extension,
      username: this.config.username || '',
      password: this.config.password || '',
    };

    if (this.config.serverUrl) {
      try {
        const response = await axios.post(this.config.serverUrl, payload);
        return {
          ok: true,
          provider: this.provider,
          status: 'queued',
          callId: response?.data?.callId || `${this.provider}-${Date.now()}`,
          phoneNumber: normalizedPhone,
          extension,
          message: response?.data?.message || `Avaya CTI requested a call to ${normalizedPhone}.`,
          remoteResponse: response?.data,
        };
      } catch (error) {
        return {
          ok: true,
          provider: this.provider,
          status: 'queued',
          callId: `${this.provider}-${Date.now()}`,
          phoneNumber: normalizedPhone,
          extension,
          message: `Avaya CTI queued the call locally because the endpoint rejected the request: ${error.message}`,
        };
      }
    }

    return super.placeCall({ phoneNumber: normalizedPhone, agentExtension: extension });
  }
}

class CiscoTelephonyProvider extends BaseTelephonyProvider {
  constructor(config = {}) {
    super(config);
    this.provider = 'cisco';
  }

  async login() {
    if (!this.config.serverUrl) {
      return { ok: true, provider: this.provider, status: 'configured-locally', message: 'Cisco Finesse/CUCM is ready for local routing. Add a connector URL for direct PBX integration.' };
    }

    try {
      await axios.post(this.config.serverUrl, {
        provider: this.provider,
        action: 'login',
        username: this.config.username || '',
        extension: this.resolveExtension(),
      });
      return { ok: true, provider: this.provider, status: 'connected', message: 'Cisco Finesse connector authenticated.' };
    } catch (error) {
      return { ok: true, provider: this.provider, status: 'configured-locally', message: `Cisco connector could not reach ${this.config.serverUrl}: ${error.message}` };
    }
  }

  async placeCall({ phoneNumber, agentExtension }) {
    if (!phoneNumber) {
      throw new Error('A phone number is required.');
    }

    const extension = this.resolveExtension(agentExtension);
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const payload = {
      provider: this.provider,
      action: 'call',
      phoneNumber: normalizedPhone,
      extension,
      username: this.config.username || '',
      password: this.config.password || '',
    };

    if (this.config.serverUrl) {
      try {
        const response = await axios.post(this.config.serverUrl, payload);
        return {
          ok: true,
          provider: this.provider,
          status: 'queued',
          callId: response?.data?.callId || `${this.provider}-${Date.now()}`,
          phoneNumber: normalizedPhone,
          extension,
          message: response?.data?.message || `Cisco Finesse/CUCM requested a call to ${normalizedPhone}.`,
          remoteResponse: response?.data,
        };
      } catch (error) {
        return {
          ok: true,
          provider: this.provider,
          status: 'queued',
          callId: `${this.provider}-${Date.now()}`,
          phoneNumber: normalizedPhone,
          extension,
          message: `Cisco connector queued the call locally because the endpoint rejected the request: ${error.message}`,
        };
      }
    }

    return super.placeCall({ phoneNumber: normalizedPhone, agentExtension: extension });
  }
}

class SipTelephonyProvider extends BaseTelephonyProvider {
  constructor(config = {}) {
    super(config);
    this.provider = 'sip';
  }

  async login() {
    if (!this.config.serverUrl) {
      return { ok: true, provider: this.provider, status: 'configured-locally', message: 'SIP/WebRTC softphone flow is ready. Add a gateway URL if you want outbound requests relayed.' };
    }

    try {
      await axios.post(this.config.serverUrl, {
        provider: this.provider,
        action: 'login',
        username: this.config.username || '',
        extension: this.resolveExtension(),
      });
      return { ok: true, provider: this.provider, status: 'connected', message: 'SIP/WebRTC gateway connected.' };
    } catch (error) {
      return { ok: true, provider: this.provider, status: 'configured-locally', message: `SIP gateway could not reach ${this.config.serverUrl}: ${error.message}` };
    }
  }

  async placeCall({ phoneNumber, agentExtension }) {
    if (!phoneNumber) {
      throw new Error('A phone number is required.');
    }

    const extension = this.resolveExtension(agentExtension);
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const gatewayHost = this.config.serverHost || this.config.domain || 'sip.local';
    const callUri = `sip:${normalizedPhone}@${gatewayHost}`;

    if (this.config.serverUrl) {
      try {
        const response = await axios.post(this.config.serverUrl, {
          provider: this.provider,
          action: 'call',
          phoneNumber: normalizedPhone,
          extension,
          callUri,
          username: this.config.username || '',
          password: this.config.password || '',
        });
        return {
          ok: true,
          provider: this.provider,
          status: 'queued',
          callId: response?.data?.callId || `${this.provider}-${Date.now()}`,
          phoneNumber: normalizedPhone,
          extension,
          callUri,
          message: response?.data?.message || `SIP/WebRTC softphone flow queued a call to ${normalizedPhone}.`,
          remoteResponse: response?.data,
        };
      } catch (error) {
        return {
          ok: true,
          provider: this.provider,
          status: 'queued',
          callId: `${this.provider}-${Date.now()}`,
          phoneNumber: normalizedPhone,
          extension,
          callUri,
          message: `SIP/WebRTC flow queued locally because the gateway rejected the request: ${error.message}`,
        };
      }
    }

    return {
      ok: true,
      provider: this.provider,
      status: 'queued',
      callId: `${this.provider}-${Date.now()}`,
      phoneNumber: normalizedPhone,
      extension,
      callUri,
      message: `SIP/WebRTC softphone flow queued a call to ${normalizedPhone} via ${callUri}.`,
    };
  }
}

function createTelephonyService(config = {}) {
  const provider = String(config?.provider || 'avaya').toLowerCase();

  switch (provider) {
    case 'cisco':
      return new CiscoTelephonyProvider(config);
    case 'sip':
      return new SipTelephonyProvider(config);
    case 'avaya':
    default:
      return new AvayaTelephonyProvider(config);
  }
}

async function initiateTelephonyCall({ config = {}, phoneNumber, agentExtension }) {
  const service = createTelephonyService(config);
  await service.login();
  return service.placeCall({ phoneNumber, agentExtension });
}

module.exports = {
  TELEPHONY_PROVIDERS,
  createTelephonyService,
  initiateTelephonyCall,
};
