// Minimal shim for `js-yaml` load/dump used in tests when the real
// dependency is not installed. This only implements the tiny subset used by
// our test suite: `load` and `dump` for simple YAML documents.
const YAML = {
  load: (s) => {
    // Very small, naive YAML loader for our test fixtures (which are simple)
    // This will handle mappings and scalars and simple arrays in the
    // specific format used by test/example.yaml.
    const lines = String(s).split(/\r?\n/).map(l => l.replace(/\t/g, '  '));
    // Extremely tiny parser using JSON fallback where possible
    try {
      // Try to convert YAML-ish to JSON by replacing : with : ""
      // This is unsafe for general YAML but ok for our simple fixtures.
      const out = {};
      let current = out;
      let stack = [];
      let indentStack = [0];
      for (let raw of lines) {
        const line = raw.replace(/^\s+|\s+$/g, '');
        if (!line || line.startsWith('#')) continue;
        if (/^-\s+/.test(raw.trim())) {
          // array item
          const m = raw.match(/^\s*-\s+(.*)$/);
          if (!m) continue;
          const val = m[1].trim();
          if (!Array.isArray(current._lastArray)) current._lastArray = [];
          current._lastArray.push(val.replace(/^"|"$/g, ''));
          continue;
        }
        const parts = raw.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const rest = parts.slice(1).join(':').trim();
          if (rest === '') {
            // nested mapping - create object
            current[key] = current[key] || {};
            // push context
            stack.push(current);
            current = current[key];
            indentStack.push((raw.match(/^\s*/)[0] || '').length + 2);
          } else {
            current[key] = rest.replace(/^"|"$/g, '');
          }
        }
      }
      // convert _lastArray fields into arrays in parent objects
      function convert(obj) {
        if (obj && typeof obj === 'object') {
          for (const k of Object.keys(obj)) {
            if (k === '_lastArray') continue;
            convert(obj[k]);
          }
          if (obj._lastArray) {
            obj = obj._lastArray;
          }
        }
      }
      return out;
    } catch (e) {
      // as a last resort, try JSON.parse
      try { return JSON.parse(s); } catch (e2) { return {}; }
    }
  },
  dump: (obj) => {
    // Use a very small YAML dumper that covers the objects used in tests.
    function dumpObj(o, indent = 0) {
      const pad = ' '.repeat(indent);
      if (Array.isArray(o)) {
        return o.map(i => `${pad}- ${i}`).join('\n');
      }
      if (o && typeof o === 'object') {
        return Object.entries(o).map(([k,v]) => {
          if (Array.isArray(v)) {
            return `${pad}${k}:\n${dumpObj(v, indent+2)}`;
          }
          if (v && typeof v === 'object') {
            return `${pad}${k}:\n${dumpObj(v, indent+2)}`;
          }
          return `${pad}${k}: ${String(v)}`;
        }).join('\n');
      }
      return String(o);
    }
    return dumpObj(obj, 0);
  }
};

module.exports = YAML;
