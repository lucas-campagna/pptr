const BaseProvider = require('./base');
const DockerProvider = require('./docker');
const GeminiProvider = require('./gemini');
const OpenAICompatibleProvider = require('./openai-compatible');
const AnthropicProvider = require('./anthropic');

const PROVIDERS = {
  docker: DockerProvider,
  gemini: GeminiProvider,
  openai: OpenAICompatibleProvider,
  anthropic: AnthropicProvider,
};

function createProvider(config, logger) {
  const providerName = config.provider || 'docker';
  const ProviderClass = PROVIDERS[providerName];
  
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerName}. Supported providers: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  
  return new ProviderClass(config, logger);
}

function isDockerProvider(config) {
  return !config.provider || config.provider === 'docker';
}

module.exports = {
  createProvider,
  isDockerProvider,
  PROVIDERS,
};