const Parser = require('./parser');
const Importer = require('./importer');
let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  yaml = require('./vendor/js-yaml');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function generateUniqueName(existingObj, base) {
  let name = base;
  let i = 1;
  while (existingObj && existingObj[name]) {
    name = `${base}_${i++}`;
  }
  return name;
}

function mergeImportedFunctions(compiledDoc, importsRegistry) {
  const nameMap = {};
  compiledDoc.functions = compiledDoc.functions || {};
  for (const [alias, imported] of Object.entries(importsRegistry || {})) {
    if (!imported || typeof imported !== 'object') continue;
    const funcs = imported.functions || {};
    for (const [name, def] of Object.entries(funcs)) {
      const pref = `${alias}_${name}`;
      const newName = generateUniqueName(compiledDoc.functions, pref);
      compiledDoc.functions[newName] = deepClone(def);
      nameMap[`${alias}.functions.${name}`] = newName;
      nameMap[`${alias}.${name}`] = newName;
    }
  }
  return nameMap;
}

function flattenActions(actions, importsRegistry, compiledDoc, nameMap = {}) {
  const out = [];

  for (const action of actions || []) {
    if (typeof action === 'string') {
      if (action.includes('.')) {
        const parts = action.split('.');
        const alias = parts[0];
        const rest = parts.slice(1);
        const imported = importsRegistry && importsRegistry[alias];
        if (imported) {
          let cursor = imported;
          for (const seg of rest) {
            if (cursor && typeof cursor === 'object' && cursor[seg] !== undefined) {
              cursor = cursor[seg];
            } else {
              cursor = undefined;
              break;
            }
          }
          if (cursor === undefined) {
            throw new Error(`Imported path not found: ${action}`);
          }
          if (Array.isArray(cursor)) {
            out.push(...flattenActions(cursor, importsRegistry, compiledDoc));
            continue;
          }
          if (cursor && Array.isArray(cursor.actions)) {
            out.push(...flattenActions(cursor.actions, importsRegistry, compiledDoc));
            continue;
          }
          if (cursor && typeof cursor === 'object' && cursor.params && cursor.actions) {
            const idx = rest[0] === 'functions' ? 1 : 0;
            const functionName = rest.slice(idx).join('.');
            const key1 = `${alias}.functions.${functionName}`;
            const key2 = `${alias}.${functionName}`;
            const mapped = nameMap[key1] || nameMap[key2];
            let finalName = mapped;
            if (!finalName) {
              const pref = `${alias}_${functionName}`;
              finalName = generateUniqueName(compiledDoc.functions, pref);
              compiledDoc.functions[finalName] = deepClone(cursor);
              nameMap[key1] = finalName;
              nameMap[key2] = finalName;
            }
            out.push({ type: 'func', name: finalName, args: {} });
            continue;
          }
          out.push(deepClone(cursor));
          continue;
        }
      }
      out.push(deepClone(action));
      continue;
    }

    const keys = Object.keys(action);

    let importKey = null;
    let importVal = null;
    if (!action.type && keys.length === 1 && keys[0].includes('.')) {
      importKey = keys[0];
      importVal = action[importKey];
    } else if (action.type && typeof action.type === 'string' && action.type.includes('.')) {
      importKey = action.type;
      importVal = action.value !== undefined ? action.value : null;
    }

    if (importKey) {
      const key = importKey;
      const val = importVal;
      const parts = key.split('.');
      const alias = parts[0];
      const rest = parts.slice(1);
      const imported = importsRegistry && importsRegistry[alias];
      if (imported) {
        let cursor = imported;
        for (const seg of rest) {
          if (cursor && typeof cursor === 'object' && cursor[seg] !== undefined) {
            cursor = cursor[seg];
          } else {
            cursor = undefined;
            break;
          }
        }

        if (cursor === undefined) {
          throw new Error(`Imported path not found: ${key}`);
        }

        if (Array.isArray(cursor)) {
          for (const sub of cursor) {
            const flattened = flattenActions([sub], importsRegistry, compiledDoc);
            out.push(...flattened);
          }
          continue;
        }

        if (cursor && Array.isArray(cursor.actions)) {
          for (const sub of cursor.actions) {
            const flattened = flattenActions([sub], importsRegistry, compiledDoc);
            out.push(...flattened);
          }
          continue;
        }

        if (cursor && typeof cursor === 'object' && cursor.params && cursor.actions) {
          const idx = rest[0] === 'functions' ? 1 : 0;
          const functionName = rest.slice(idx).join('.');
          if (!functionName) {
            throw new Error(`Invalid function reference: ${key}`);
          }
          const key1 = `${alias}.functions.${functionName}`;
          const key2 = `${alias}.${functionName}`;
          const mapped = nameMap[key1] || nameMap[key2];
          let finalName = mapped;
          if (!finalName) {
            const pref = `${alias}_${functionName}`;
            finalName = generateUniqueName(compiledDoc.functions, pref);
            compiledDoc.functions[finalName] = deepClone(cursor);
            nameMap[key1] = finalName;
            nameMap[key2] = finalName;
          }
          const call = { type: 'func', name: finalName, args: deepClone(val || {}) };
          out.push(call);
          continue;
        }

        out.push(deepClone(cursor));
        continue;
      }
    }

    const a = deepClone(action);
    if (Array.isArray(a.actions)) a.actions = flattenActions(a.actions, importsRegistry, compiledDoc);
    if (Array.isArray(a.then)) a.then = flattenActions(a.then, importsRegistry, compiledDoc);
    if (Array.isArray(a.else)) a.else = flattenActions(a.else, importsRegistry, compiledDoc);
    if (Array.isArray(a.action)) a.action = flattenActions(a.action, importsRegistry, compiledDoc);
    if (Array.isArray(a.catch)) a.catch = flattenActions(a.catch, importsRegistry, compiledDoc);
    if (Array.isArray(a.branches)) {
      a.branches = a.branches.map(b => {
        const nb = deepClone(b);
        if (Array.isArray(nb.actions)) nb.actions = flattenActions(nb.actions, importsRegistry, compiledDoc);
        return nb;
      });
    }

    out.push(a);
  }

  return out;
}

function inlineImports(doc, importsRegistry) {
  if (!doc || typeof doc !== 'object') return doc;

  const compiled = deepClone(doc);
  if (compiled.import) delete compiled.import;

  compiled.functions = compiled.functions || {};

  const nameMap = mergeImportedFunctions(compiled, importsRegistry);

  if (Array.isArray(compiled.actions)) compiled.actions = flattenActions(compiled.actions, importsRegistry, compiled, nameMap);

  if (compiled.functions && typeof compiled.functions === 'object') {
    for (const [name, fn] of Object.entries(compiled.functions)) {
      if (fn && Array.isArray(fn.actions)) {
        fn.actions = flattenActions(fn.actions, importsRegistry, compiled, nameMap);
      }
    }
  }

  if (Array.isArray(compiled.tabs)) {
    compiled.tabs = compiled.tabs.map(tab => {
      const t = deepClone(tab);
      if (Array.isArray(t.actions)) t.actions = flattenActions(t.actions, importsRegistry, compiled, nameMap);
      return t;
    });
  }

  function recurseSubcommands(map) {
    if (!map || typeof map !== 'object') return;
    for (const [k, v] of Object.entries(map)) {
      if (v && Array.isArray(v.actions)) v.actions = flattenActions(v.actions, importsRegistry, compiled, nameMap);
      if (v && v.functions) {
        for (const [fnName, fnDef] of Object.entries(v.functions)) {
          if (fnDef && Array.isArray(fnDef.actions)) fnDef.actions = flattenActions(fnDef.actions, importsRegistry, compiled, nameMap);
        }
      }
      if (v && v.subcommands) recurseSubcommands(v.subcommands);
    }
  }

  recurseSubcommands(compiled.subcommands);

  return compiled;
}

async function compileYamlString(yamlContent, baseDir) {
  const parser = new Parser();
  const raw = yaml.load(yamlContent);
  const doc = parser.normalize(raw);

  // Ensure we have a clean mapping alias -> path for imports. Some YAML
  // fallback parsers may mis-parse the import block; prefer string values and
  // fall back to a simple textual parser when needed.
  let importsRegistry = {};
  let importsMap = null;
  if (raw && raw.import && typeof raw.import === 'object') {
    const allStrings = Object.values(raw.import).every(v => typeof v === 'string');
    if (allStrings) {
      importsMap = raw.import;
    } else {
      // textual parse: find the import: block and extract alias: path lines
      const lines = String(yamlContent).split(/\r?\n/);
      let inImport = false;
      const map = {};
      for (const rawLine of lines) {
        if (!inImport) {
          if (/^\s*import\s*:\s*$/.test(rawLine)) { inImport = true; }
          continue;
        }
        // stop when next top-level key encountered
        if (/^\S/.test(rawLine)) break;
        const m = rawLine.match(/^\s*([^:\s]+)\s*:\s*(.*)$/);
        if (m) map[m[1]] = m[2] || '';
      }
      if (Object.keys(map).length > 0) importsMap = map;
    }
  }

  if (importsMap) {
    importsRegistry = await Importer.loadImports(importsMap, baseDir);
  }

  const inlined = inlineImports(doc, importsRegistry);
  // Convert normalized action objects back into short-form strings when
  // possible so a simple YAML dumper (or our vendor shim) preserves the
  // human-friendly compact notation (e.g. `- log: message`).
  function shortifyAction(a) {
    if (!a || typeof a !== 'object') return a;
    if (a.type === 'log' && typeof a.message === 'string') return `log: ${a.message}`;
    if (a.type === 'open' && typeof a.url === 'string') return `open: ${a.url}`;
    if (a.type === 'click' && typeof a.selector === 'string') return `click: ${a.selector}`;
    if (a.type === 'type' && typeof a.selector === 'string' && a.text !== undefined) return `type: ${a.selector}`;
    if (a.type === 'fill' && typeof a.selector === 'string') return `fill: ${a.selector}`;
    if (a.type === 'screenshot' && typeof a.path === 'string') return `screenshot: ${a.path}`;
    if (a.type === 'pdf' && typeof a.path === 'string') return `pdf: ${a.path}`;
    // fallback: try to reconstruct a simple mapping when action has a single
    // string-valued meaningful property.
    const keys = Object.keys(a).filter(k => k !== 'type' && a[k] !== undefined && typeof a[k] !== 'object');
    if (keys.length === 1) return `${a.type}: ${String(a[keys[0]])}`;
    return a;
  }

  function recurse(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => recurse(v));
    const out = { ...obj };
    if (Array.isArray(out.actions)) out.actions = out.actions.map(a => recurse(shortifyAction(a)));
    if (Array.isArray(out.tabs)) out.tabs = out.tabs.map(t => ({ ...t, actions: Array.isArray(t.actions) ? t.actions.map(a => recurse(shortifyAction(a))) : t.actions }));
    if (out.functions && typeof out.functions === 'object') {
      for (const [k, fn] of Object.entries(out.functions)) {
        if (fn && Array.isArray(fn.actions)) fn.actions = fn.actions.map(a => recurse(shortifyAction(a)));
      }
    }
    if (out.subcommands && typeof out.subcommands === 'object') {
      for (const [k, sc] of Object.entries(out.subcommands)) {
        out.subcommands[k] = recurse(sc);
      }
    }
    return out;
  }

  const safe = recurse(inlined);
  const dumped = yaml.dump(safe, { noRefs: true, sortKeys: false });
  return dumped;
}

module.exports = { inlineImports, compileYamlString };
