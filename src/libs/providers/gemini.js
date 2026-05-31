const BaseProvider = require('./base');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiProvider extends BaseProvider {
  constructor(config, logger) {
    super(config, logger);
    this.genAI = null;
  }

  getClient() {
    if (!this.genAI) {
      const apiKey = this.resolveApiKey(this.config.api_key);
      if (!apiKey) {
        throw new Error('Gemini API key not provided. Set api_key or use env:GEMINI_API_KEY');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  async call(prompt, contextString) {
    const modelName = this.config.model || 'gemini-2.0-flash';
    const model = this.getClient().getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.max_tokens,
        topP: this.config.top_p,
        seed: this.config.seed,
      },
    });

    const promptWithContext = contextString || prompt;
    
    try {
      const result = await model.generateContent(promptWithContext);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (err) {
      this.logger.warn(`Gemini API error: ${err.message}`);
      return '';
    }
  }
}

module.exports = GeminiProvider;