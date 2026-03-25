class VariableEngine {
  constructor(initial = {}, declared = []) {
    this.vars = { ...initial };
    this.declared = new Set(declared || []);
    this.allowUndeclared = false;
  }

  setAllowUndeclared(v) {
    this.allowUndeclared = !!v;
  }

  set(key, value) {
    if (!this.allowUndeclared && this.declared.size > 0 && !this.declared.has(key)) {
      // allow setting if declared list empty
      return;
    }
    this.vars[key] = value;
  }

  get(key) {
    return this.vars[key];
  }
}

module.exports = VariableEngine;
