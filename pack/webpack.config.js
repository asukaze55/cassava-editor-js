const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PLUGIN_NAME = 'CassavaJsPlugin';

const now = new Date();
const date = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`;
const finalFileName = `cassava_min_${date}.js`;

class CassavaJsPlugin {
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
        fs.mkdirSync('decl', {recursive: true});
        const tscResult = spawnSync('npx tsc src/cassava_menu.js ' +
            '--target es2022 --checkJs --noImplicitAny --declaration ' +
            '--emitDeclarationOnly --outDir decl --module NodeNext ' +
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
            .replaceAll(/<script src="cassava_\w+.js"><\/script>\r?\n?/g, '')
            .replaceAll(/<script src="module.js"><\/script>/g,
                `<script src="${finalFileName}"></script>`);
        compilation.assets['index.html'] = {
          source: () => html,
          size: () => html.length
        };

        const decl = fs.readFileSync('decl/cassava_grid.d.ts')
            .toString()
            .replaceAll(/[^\n]*cassava_macro\.js[^\n]*\n/g, '');
        compilation.assets[`cassava_min_${date}.d.ts`] = {
          source: () => decl,
          size: () => decl.length
        };
        fs.rmSync('decl', {recursive: true});
      });
    });
  }
}

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, '../cassava_menu.js'),
  module: {
    rules: [{
      test: /.js$/,
      loader: path.resolve(__dirname, 'asukazeLoader.js'),
    }],
  },
  plugins: [new CassavaJsPlugin()],
  output: {
    path: path.resolve(__dirname, 'out/'),
    filename: finalFileName
  }
};
