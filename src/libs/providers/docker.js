const BaseProvider = require('./base');
const { spawn } = require('child_process');

class DockerProvider extends BaseProvider {
  async call(prompt) {
    const modelName = this.config.model;

    let releaseLock = () => {};
    const lockPromise = new Promise(resolve => { releaseLock = resolve; });
    
    return new Promise((resolve, reject) => {
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      const cmd = `docker model run ${modelName} "${escapedPrompt}"`;
      this.logger.debug(`Executing: ${cmd}`);

      const child = spawn('bash', ['-c', cmd], { stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        releaseLock();
        if (code !== 0) {
          this.logger.warn(`Model command exited with code ${code}: ${stderr}`);
        }
        let result = stdout.trim();
        const userMatch = result.match(/^(.*?)(?=\nUser:|$)/s);
        if (userMatch) {
          result = userMatch[1].trim();
        }
        const lastAssistant = result.split(/\nAssistant:/).pop().trim();
        resolve(lastAssistant || result);
      });

      child.on('error', (err) => {
        releaseLock();
        this.logger.warn(`Model command failed: ${err.message}`);
        resolve('');
      });
    });
  }
}

module.exports = DockerProvider;