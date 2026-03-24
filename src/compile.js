const Parser = require('./parser');
const Importer = require('./importer');
const yaml = require('js-yaml');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeImportedFunctions(compiledDoc, importsRegistry) {
  compiledDoc.functions = compiledDoc.functions || {};
  for (const [alias, imported] of Object.entries(importsRegistry || {})) {
    if (!imported || typeof imported !== 'object') continue;
    const funcs = imported.functions || {};
    for (const [name, def] of Object.entries(funcs)) {
      if (compiledDoc.functions[name]) {
        throw new Error(`Function name conflict when inlining imports: '${name}' already defined in importing script`);
      }
      compiledDoc.functions[name] = deepClone(def);
    }
  }
}

function flattenActions(actions, importsRegistry, compiledDoc) {
  const out = [];

  for (const action of actions || []) {
    // handle scalar import references like 'scr1.actions'
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
            compiledDoc.functions = compiledDoc.functions || {};
            if (!compiledDoc.functions[functionName]) {
              compiledDoc.functions[functionName] = deepClone(cursor);
            }
            out.push({ type: 'func', name: functionName, args: {} });
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

    // support both raw import-ref (no 'type' key) and normalized (has 'type')
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
        // walk remainder
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

        // If cursor is an actions array -> inline
        if (Array.isArray(cursor)) {
          for (const sub of cursor) {
            const flattened = flattenActions([sub], importsRegistry, compiledDoc);
            out.push(...flattened);
          }
          continue;
        }

        // If cursor has .actions
        if (cursor && Array.isArray(cursor.actions)) {
          for (const sub of cursor.actions) {
            const flattened = flattenActions([sub], importsRegistry, compiledDoc);
            out.push(...flattened);
          }
          continue;
        }

        // If cursor looks like a function def
        if (cursor && typeof cursor === 'object' && cursor.params && cursor.actions) {
          // function name is remainder after 'functions.'
          const idx = rest[0] === 'functions' ? 1 : 0;
          const functionName = rest.slice(idx).join('.');
          if (!functionName) {
            throw new Error(`Invalid function reference: ${key}`);
          }
          // ensure function is present in compiledDoc (mergeImportedFunctions should have copied, but be defensive)
          compiledDoc.functions = compiledDoc.functions || {};
          if (!compiledDoc.functions[functionName]) {
            compiledDoc.functions[functionName] = deepClone(cursor);
          }
          // create normalized func invocation
          const call = { type: 'func', name: functionName, args: deepClone(val || {}) };
          out.push(call);
          continue;
        }

        // Fallback: inline the object itself
        out.push(deepClone(cursor));
        continue;
      }
    }

    // Otherwise, deep clone and recurse into known nested action containers
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
  // remove import key
  if (compiled.import) delete compiled.import;

  compiled.functions = compiled.functions || {};

  // merge imported functions (fail on conflict)
  mergeImportedFunctions(compiled, importsRegistry);

  // process top-level actions
  if (Array.isArray(compiled.actions)) compiled.actions = flattenActions(compiled.actions, importsRegistry, compiled);

  // process functions bodies
  if (compiled.functions && typeof compiled.functions === 'object') {
    for (const [name, fn] of Object.entries(compiled.functions)) {
      if (fn && Array.isArray(fn.actions)) {
        fn.actions = flattenActions(fn.actions, importsRegistry, compiled);
      }
    }
  }

  // process tabs
  if (Array.isArray(compiled.tabs)) {
    compiled.tabs = compiled.tabs.map(tab => {
      const t = deepClone(tab);
      if (Array.isArray(t.actions)) t.actions = flattenActions(t.actions, importsRegistry, compiled);
      return t;
    });
  }

  // process subcommands recursively
  function recurseSubcommands(map) {
    if (!map || typeof map !== 'object') return;
    for (const [k, v] of Object.entries(map)) {
      if (v && Array.isArray(v.actions)) v.actions = flattenActions(v.actions, importsRegistry, compiled);
      if (v && v.functions) {
        for (const [fnName, fnDef] of Object.entries(v.functions)) {
          if (fnDef && Array.isArray(fnDef.actions)) fnDef.actions = flattenActions(fnDef.actions, importsRegistry, compiled);
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
  // load raw YAML to preserve top-level `import` mapping (Parser.normalize drops it)
  const raw = require('js-yaml').load(yamlContent);
  const doc = parser.normalize(raw);
  let importsRegistry = {};
  if (raw && raw.import && typeof raw.import === 'object') {
    importsRegistry = await Importer.loadImports(raw.import, baseDir);
  }
  const inlined = inlineImports(doc, importsRegistry);
  const dumped = yaml.dump(inlined, { noRefs: true, sortKeys: false });
  return dumped;
}

module.exports = { inlineImports, compileYamlString };
