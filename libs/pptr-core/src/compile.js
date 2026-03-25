const Parser = require('./parser');
const Importer = require('./importer');
const yaml = require('js-yaml');

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
