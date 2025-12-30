/**
 * @param {string} source
 * @returns {string}
 */
module.exports = (source) => {
  return source.split(/\r?\n/)
      .map(line => line
          .replace(/const (\{.*\}) = net\.asukaze\.import\(('.*')\);/,
              'import $1 from $2;')
          .replace(/net\.asukaze\.export\((\{.*\})\);/, 'export $1;')
          .replace(/^\(\(\) => \{$/, '')
          .replace(/^\}\)\(\);$/, ''))
      .join('\n');
};
