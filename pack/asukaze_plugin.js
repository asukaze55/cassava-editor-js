const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'AsukazePlugin';

class AsukazePluginHelper {
  /** @type {import('webpack').Compilation} */
  #compilation;
  /** @type {string} */
  #entryBaseName;
  /** @type {string} */
  #entryPath;
  /** @type {string} */
  #outputBaseName;
  /** @type {string} */
  #outputPath;
  /** @type {boolean} */
  #strict;

  /**
   * @param {import('webpack').WebpackOptionsNormalized} options
   * @param {import('webpack').Compilation} compilation
   * @param {boolean} strict
   */
  constructor(options, compilation, strict) {
    this.#compilation = compilation;
    const entry = options.entry.main.import[0];
    this.#entryPath = path.dirname(entry);
    this.#entryBaseName = path.basename(entry);
    this.#outputPath = options.output.path;
    this.#outputBaseName = options.output.filename;
    this.#strict = strict;
  }

  /**
   * @param {Iterable<import('webpack').Module>} modules
   * @param {string} dirName
   */
  dumpModules(modules, dirName) {
    for (const module of modules) {
      const buffer = module.originalSource().buffer();
      fs.writeFileSync(
          path.resolve(dirName, path.basename(module.resource)), buffer);

      const importedTsFiles =
          buffer.toString().matchAll(/import\("([\w\.\/]+\.ts)"\)/g);
      for (const ts of importedTsFiles) {
        fs.copyFileSync(
            path.resolve(path.dirname(module.resource), ts[1]),
            path.resolve(dirName, path.basename(ts[1])));
      }
    }
  }

  /**
   * @param {string} srcDirName
   * @param {{error: (...args: string[]) => void}} logger
   * @param {string=} declDirName
   */
  runTsc(srcDirName, logger, declDirName) {
    const emitParams = (declDirName != null)
        ? `--declaration --emitDeclarationOnly --outDir ${declDirName}`
        : '--noEmit'
    const strictParam = this.#strict ? '--strict' : '--noImplicitAny';
    const tscResult = spawnSync(
        `npx tsc ${path.resolve(srcDirName, this.#entryBaseName)} \
        --target es2022 --checkJs ${emitParams} ${strictParam} \
        --module NodeNext --moduleResolution NodeNext`, {shell: true});
    if (tscResult.error && tscResult.error.toString()) {
      logger.error(tscResult.error.toString());
    }
    if (tscResult.stdout && tscResult.stdout.toString()) {
      logger.error('tsc error:\n' + tscResult.stdout.toString());
    }
  }

  /** @param {Array<string>} extraJs */
  addHtml(extraJs) {
    for (const file of this.globEntryPath('*.html')) {
      const html = fs.readFileSync(file).toString().replaceAll(
          /(<script src=")(\w+.js)("><\/script>\r?\n?)/g,
          (match, p1, p2, p3) => (p2 == this.#entryBaseName)
              ? p1 + this.#outputBaseName + p3
              : extraJs.includes(p2) ? match : '');
      this.addAsset(path.basename(file), html);
    }
  }

  addCss() {
    for (const file of this.globEntryPath('*.css')) {
      this.addAsset(path.basename(file), fs.readFileSync(file));
    }
  }


  /** @param {Array<string>} extraJs */
  addExtraJs(extraJs) {
    if (extraJs.length > 0) {
      fs.mkdirSync(this.#outputPath, {recursive: true});
      for (const file of extraJs) {
        fs.copyFileSync(path.resolve(this.#entryPath, file),
            path.resolve(this.#outputPath, file));
      }
    }
  }

  /** @param {{module: string, output: string, strip?: string}} declOptions */
  addDeclaration(declOptions) {
    const declFileName = `${declOptions.module}.d.ts`;
    let decl = fs.readFileSync(path.resolve('decl', declFileName)).toString();
    if (declOptions.strip != null) {
      decl = decl.split('\n')
          .filter(line => !line.includes(declOptions.strip))
          .join('\n');
    }
    this.addAsset(declOptions.output, decl);
  }

  /**
   * @param {string} name
   * @param {string|import('buffer').Buffer} content
   */
  addAsset(name, content) {
    this.#compilation.assets[name] = {
      source: () => content,
      size: () => content.length
    };
  }

  /** @param {string} fileName */
  globEntryPath(fileName) {
    return fs.globSync(path.resolve(this.#entryPath, fileName));
  }
}

class AsukazePlugin {
  /** @type {{module: string, output: string, strip?: string}?} */
  #decl;
  /** @type {Array<string>} */
  #extraJs;
  /** @type {boolean} */
  #strict

  /** @param {{decl?: {module: string, output: string, strip?: string}, extraJs?: string[], strict?: boolean}?} options */
  constructor(options) {
    this.#decl = options?.decl;
    this.#extraJs = options?.extraJs ?? [];
    this.#strict = options?.strict ?? true;
  }

  /** @param {import('webpack').Compiler} compiler */
  apply(compiler) {
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
      const helper =
          new AsukazePluginHelper(compiler.options, compilation, this.#strict);

      compilation.hooks.finishModules.tap(PLUGIN_NAME, modules => {
        fs.mkdirSync('src', {recursive: true});
        helper.dumpModules(modules, 'src');
        if (this.#decl != null) {
          fs.mkdirSync('decl', {recursive: true});
          helper.runTsc('src', logger, 'decl');
        } else {
          helper.runTsc('src', logger);
        }
        fs.rmSync('src', {recursive: true});
      });

      compilation.hooks.processAssets.tap({
        name: PLUGIN_NAME,
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      }, () => {
        helper.addHtml(this.#extraJs);
        helper.addCss();
        helper.addExtraJs(this.#extraJs);
        if (this.#decl != null) {
          helper.addDeclaration(this.#decl);
          fs.rmSync('decl', {recursive: true});
        }
      });
    });
  }
}

module.exports = AsukazePlugin;
