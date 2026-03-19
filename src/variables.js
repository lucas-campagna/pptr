class VariableEngine {
  constructor(vars = {}) {
    this.vars = { ...vars };
  }

  set(name, value) {
    this.vars[name] = value;
  }

  get(name) {
    return this.vars[name];
  }

  delete(name) {
    delete this.vars[name];
  }

  getAll() {
    return { ...this.vars };
  }

  interpolate(template) {
    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      const trimmed = expr.trim();
      
      if (trimmed.startsWith('env.')) {
        const envVar = trimmed.substring(4);
        return process.env[envVar] || '';
      }

      if (trimmed.includes('.')) {
        const parts = trimmed.split('.');
        let value = this.vars[parts[0]];
        for (let i = 1; i < parts.length; i++) {
          if (value && typeof value === 'object') {
            value = value[parts[i]];
          } else {
            return match;
          }
        }
        return value !== undefined ? String(value) : match;
      }

      return this.vars[trimmed] !== undefined ? String(this.vars[trimmed]) : match;
    });
  }

  interpolateDeep(obj) {
    if (typeof obj === 'string') {
      return this.interpolate(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateDeep(item));
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateDeep(value);
      }
      return result;
    }

    return obj;
  }

  evaluateCondition(condition) {
    const interpolated = this.interpolate(condition);
    
    const comparisons = ['==', '!=', '>=', '<=', '>', '<'];
    for (const op of comparisons) {
      if (interpolated.includes(op)) {
        const [left, right] = interpolated.split(op).map(s => s.trim());
        const leftVal = this.parseValue(left);
        const rightVal = this.parseValue(right);
        
        switch (op) {
          case '==': return leftVal == rightVal;
          case '!=': return leftVal != rightVal;
          case '>=': return leftVal >= rightVal;
          case '<=': return leftVal <= rightVal;
          case '>': return leftVal > rightVal;
          case '<': return leftVal < rightVal;
        }
      }
    }

    return interpolated === 'true' || interpolated === true;
  }

  parseValue(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    if (!isNaN(Number(val))) return Number(val);
    if ((val.startsWith('"') && val.endsWith('"')) || 
        (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  }
}

module.exports = VariableEngine;