(() => {

let exported = {};

window.net = window.net || {};
net.asukaze = net.asukaze || {};
net.asukaze.export = values => exported = {...exported, ...values};
net.asukaze.import = () => exported;

})();
