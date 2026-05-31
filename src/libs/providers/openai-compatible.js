const BaseProvider = require('./base');
const OpenAI = require('openai');

class OpenAICompatibleProvider extends BaseProvider {
  constructor(config, logger) {
    super(config, logger);
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      const apiKey = this.resolveApiKey(this.config.api_key);
      if (!apiKey) {
        throw new Error('OpenAI-compatible API key not provided. Set api_key or use env:OPENAI_API_KEY');
      }
      this.client = new OpenAI({
        apiKey,
        baseURL: this.config.base_url || 'https://api.openai.com/v1',
      });
    }
    return this.client;
  }

  async call(prompt, contextString) {
    const modelName = this.config.model || 'gpt-4o';
    const client = this.getClient();

    const messages = this.buildMessages(contextString || prompt);

    try {
      const response = await client.chat.completions.create({
        model: modelName,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        top_p: this.config.top_p,
        seed: this.config.seed,
      });
      return response.choices[0]?.message?.content || '';
    } catch (err) {
      this.logger.warn(`OpenAI-compatible API error: ${err.message}`);
      return '';
    }
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
        messages.push({ role: 'system', content: line.slice(8) });
        currentRole = null;
        currentContent = [];
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

module.exports = OpenAICompatibleProvider;