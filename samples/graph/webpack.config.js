const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PLUGIN_NAME = 'CassavaGraphPlugin';

const now = new Date();
const date = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`;
const finalFileName = `graph_${date}.js`;

class CassavaGraphPlugin {
  apply(compiler) {
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
        const tscResult = spawnSync('npx tsc graph.js --target es2022 ' +
            '--checkJs --noImplicitAny --noEmit --module NodeNext ' +
            '--moduleResolution NodeNext', {shell: true});
        if (tscResult.error && tscResult.error.toString()) {
          logger.error(tscResult.error.toString());
        }
        if (tscResult.stdout && tscResult.stdout.toString()) {
          logger.error('tsc error:\n' + tscResult.stdout.toString());
        }
      });

      compilation.hooks.processAssets.tap({
        name: PLUGIN_NAME,
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      },
      () => {
        const html = fs.readFileSync('index.html')
            .toString()
            .replaceAll(/graph.js/g, finalFileName);
        compilation.assets['index.html'] = {
          source: () => html,
          size: () => html.length
        };
      });
    });
  }
}

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'graph.js'),
  plugins: [new CassavaGraphPlugin()],
  output: {
    path: path.resolve(__dirname, 'out/'),
    filename: finalFileName
  }
};
