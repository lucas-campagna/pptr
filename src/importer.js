const path = require('path');
const fs = require('fs');
const Parser = require('./parser');

class ImportError extends Error {}

class ImportPathError extends ImportError {
  constructor(alias, p) {
    super(`Import path for alias '${alias}' not found: ${p}`);
    this.name = 'ImportPathError';
    this.alias = alias;
    this.path = p;
  }
}

class CircularImportError extends ImportError {
  constructor(chain) {
    super(`Circular import detected: ${chain.join(' -> ')}`);
    this.name = 'CircularImportError';
    this.chain = chain;
  }
}

class ImportAliasConflictError extends ImportError {
  constructor(alias, existing, attempted) {
    super(`Import alias conflict for '${alias}': already mapped to '${existing}', attempted '${attempted}'`);
    this.name = 'ImportAliasConflictError';
    this.alias = alias;
    this.existing = existing;
    this.attempted = attempted;
  }
}

function resolveImportPath(baseDir, importPath) {
  if (!importPath || typeof importPath !== 'string') return null;
  if (path.isAbsolute(importPath)) return path.resolve(importPath);
  if (!baseDir) baseDir = process.cwd();
  return path.resolve(baseDir, importPath);
}

async function loadImports(importsMap = {}, baseDir, options = {}, _processing = new Set(), _global = {}) {
  const parser = new Parser();
  const logger = options.logger || console;

  // shallow guard
  if (!importsMap || typeof importsMap !== 'object') return _global;

  for (const [alias, rawPath] of Object.entries(importsMap)) {
    if (!rawPath || typeof rawPath !== 'string') {
      throw new ImportPathError(alias, String(rawPath));
    }

    const resolved = resolveImportPath(baseDir, rawPath);
    if (!resolved || !fs.existsSync(resolved)) {
      throw new ImportPathError(alias, rawPath);
    }

    let real;
    try {
      real = fs.realpathSync(resolved);
    } catch (e) {
      real = resolved;
    }

    if (_processing.has(real)) {
      // build chain for message
      const chain = Array.from(_processing).concat([real]);
      throw new CircularImportError(chain);
    }

    // If alias already exists and points to a different file, error
    if (_global[alias]) {
      let existingReal;
      try {
        existingReal = fs.realpathSync(_global[alias].__importPath || _global[alias].__file || '');
      } catch (e) {
        existingReal = _global[alias].__importPath || _global[alias].__file || '';
      }
      if (existingReal && existingReal !== real) {
        throw new ImportAliasConflictError(alias, existingReal, real);
      }
      // if same file, allow and continue
      continue;
    }

    _processing.add(real);

    // parse the imported file
    let parsed;
    try {
      parsed = parser.parseFile(resolved);
    } catch (e) {
      _processing.delete(real);
      throw e;
    }

    // attach metadata about source path for diagnostics
    parsed.__importPath = resolved;
    parsed.__file = real;

    _global[alias] = parsed;
    logger.debug && logger.debug(`Imported '${alias}' => ${resolved}`);

    // recursively load nested imports (flattened into global namespace)
    if (parsed.import) {
      await loadImports(parsed.import, path.dirname(resolved), options, _processing, _global);
    }

    _processing.delete(real);
  }

  return _global;
}

module.exports = {
  loadImports,
  ImportError,
  ImportPathError,
  CircularImportError,
  ImportAliasConflictError,
};
