/**
 * @param {string} source
 * @returns {string}
 */
module.exports = (source) => {
  return source
      .replace(/net.asukaze.module\([\(\w\s,\)]+=>\s*\{(.*)\}\);/s, '$1')
      .replaceAll(/const (\{.*\}) = require\(('.*')\);/g, 'import $1 from $2;')
      .replaceAll(/module.exports\s*=/g, 'export ');
};
