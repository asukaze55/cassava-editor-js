(() => {

let exports = {};

window.net = window.net || {};
net.asukaze = net.asukaze || {};
net.asukaze.module = (callback) => {
  const module = {exports: {}};
  callback(module, () => exports);
  exports = {...exports, ...module.exports};
};

})();
