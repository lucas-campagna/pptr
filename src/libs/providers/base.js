class BaseProvider {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async call(prompt, contextString) {
    throw new Error('call() must be implemented by subclass');
  }

  supportsStreaming() {
    return false;
  }

  resolveApiKey(apiKey) {
    if (typeof apiKey !== 'string') return apiKey;
    if (apiKey.startsWith('env:')) {
      const envVar = apiKey.slice(4);
      return process.env[envVar] || null;
    }
    return apiKey;
  }
}

module.exports = BaseProvider;