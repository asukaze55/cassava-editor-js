const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PLUGIN_NAME = 'ToonedPlugin';

const now = new Date();
const date = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`;
const finalFileName = `tooned_min_${date}.js`;

class ToonedPlugin {
  apply(compiler) {
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.finishModules.tap(PLUGIN_NAME, modules => {
        fs.mkdirSync('src', {recursive: true});
        for (const module of modules) {
          const match = module.resource.match(/(\w+\.js)$/);
          if (match) {
            const tempFileName = 'src/' + match[1];
            fs.writeFileSync(tempFileName, module.originalSource().buffer());
          }
        }
        for (const decl of fs.globSync('../*.d.ts')) {
          fs.copyFileSync(decl, decl.replace('..', 'src'));
        }
        const tscResult = spawnSync('npx tsc src/tooned.js --target es2022 ' +
            '--checkJs --noImplicitAny --noEmit --module NodeNext ' +
            '--moduleResolution NodeNext', {shell: true});
        if (tscResult.error && tscResult.error.toString()) {
          logger.error(tscResult.error.toString());
        }
        if (tscResult.stdout && tscResult.stdout.toString()) {
          logger.error('tsc error:\n' + tscResult.stdout.toString());
        }
        fs.rmSync('src', {recursive: true});
      });

      compilation.hooks.processAssets.tap({
        name: PLUGIN_NAME,
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      },
      () => {
        const html = fs.readFileSync('../index.html')
            .toString()
            .replaceAll(/<script src="dom.js"><\/script>\r?\n?/g, '')
            .replaceAll(/<script src="module.js"><\/script>\r?\n?/g, '')
            .replaceAll(/<script src="tooned.js"><\/script>/g,
                `<script src="${finalFileName}"></script>`);
        compilation.assets['index.html'] = {
          source: () => html,
          size: () => html.length
        };

        const css = fs.readFileSync('../tooned_20251124.css');
        compilation.assets['tooned_20251124.css'] = {
          source: () => css,
          size: () => css.length
        };
      });
    });
  }
}

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, '../tooned.js'),
  module: {
    rules: [{
      test: /.js$/,
      loader: path.resolve(__dirname, 'asukazeLoader.js'),
    }],
  },
  plugins: [new ToonedPlugin()],
  output: {
    path: path.resolve(__dirname, 'out/'),
    filename: finalFileName
  }
};
