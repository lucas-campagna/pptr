const BaseProvider = require('./base');
const Anthropic = require('@anthropic-ai/sdk');

class AnthropicProvider extends BaseProvider {
  constructor(config, logger) {
    super(config, logger);
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      const apiKey = this.resolveApiKey(this.config.api_key);
      if (!apiKey) {
        throw new Error('Anthropic API key not provided. Set api_key or use env:ANTHROPIC_API_KEY');
      }
      this.client = new Anthropic({
        apiKey,
        baseURL: this.config.base_url || 'https://api.anthropic.com/v1',
      });
    }
    return this.client;
  }

  async call(prompt, contextString) {
    const modelName = this.config.model || 'claude-sonnet-4-20250514';
    const client = this.getClient();

    const messages = this.buildMessages(contextString || prompt);

    try {
      const response = await client.messages.create({
        model: modelName,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens || 4096,
        system: this.extractSystemPrompt(messages),
      });
      return response.content[0]?.text || '';
    } catch (err) {
      this.logger.warn(`Anthropic API error: ${err.message}`);
      return '';
    }
  }

  extractSystemPrompt(messages) {
    const systemMsgs = messages.filter(m => m.role === 'system');
    return systemMsgs.map(m => m.content).join('\n');
  }

  buildMessages(promptWithContext) {
    const messages = [];
    const lines = promptWithContext.split('\n');
    let currentRole = null;
    let currentContent = [];

    for (const line of lines) {
      if (line.startsWith('System: ')) {
        if (currentRole && currentContent.length) {
          messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
        }
        currentRole = 'system';
        currentContent = [line.slice(8)];
      } else if (line.startsWith('User: ')) {
        if (currentRole && currentContent.length) {
          messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
        }
        currentRole = 'user';
        currentContent = [line.slice(6)];
      } else if (line.startsWith('Assistant: ')) {
        if (currentRole && currentContent.length) {
          messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
        }
        currentRole = 'assistant';
        currentContent = [line.slice(11)];
      } else {
        currentContent.push(line);
      }
    }

    if (currentRole && currentContent.length) {
      messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
    }

    return messages;
  }
}

module.exports = AnthropicProvider;