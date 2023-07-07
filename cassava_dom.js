// #ifndef MODULE
(() => {
// #endif

/**
 * @template {string} K
 * @param {K} name
 * @param {{}=} attributes
 * @param {Array<Node|string>=} children
 * @returns {HTMLElementTagNameMap[K]}
 */
function createElement(name, attributes, children) {
  const element = document.createElement(name);
  if (attributes) {
    for (const key of Object.keys(attributes)) {
      element[key] = attributes[key];
    }
  }
  if (children) {
    element.append(...children);
  }
  return /** @type {any} */(element);
}

/**
 * @param  {...(Node|string)} children
 * @returns {HTMLDivElement}
 */
function div(...children) {
  return createElement('div', {}, children);
}

/**
 * @param {Node|string} content
 * @param {(this: HTMLButtonElement, event: MouseEvent) => any} onclick
 * @returns {HTMLButtonElement}
 */
function button(content, onclick) {
  const element = createElement('button', {}, [content]);
  element.addEventListener('click', onclick);
  return element;
}

/**
 * @param {Element} element
 * @param {Element} root
 * @return {boolean}
 */
function isInputElement(element, root) {
  while (element != null && element != root) {
    if (element.tagName == 'BUTTON' || element.tagName == 'INPUT' || element.tagName == 'TEXTAREA') {
      return true;
    }
    element = element.parentElement;
  }
  return false;
}

/**
 * @param {Array<Node|string>} children
 * @returns {HTMLDialogElement}
 */
function dialog(children) {
  const element = createElement('dialog', {
    className: 'cassava-dialog',
  }, children);

  const eventOption = /** @type {EventListenerOptions} */({passive: true});
  element.addEventListener('mousedown', event => {
    if (isInputElement(/** @type {Element} */(event.target), element)) {
      return;
    }
    const x = element.offsetLeft - event.clientX;
    const y = element.offsetTop - event.clientY;

    const onMouseMove = e => {
      element.style.left = (x + e.clientX) + 'px';
      element.style.top = (y + e.clientY) + 'px';
      element.style.right = 'unset';
    };
    document.body.addEventListener('mousemove', onMouseMove, eventOption);
    document.body.addEventListener('mouseup', () => {
      document.body.removeEventListener('mousemove', onMouseMove, eventOption);
    }, eventOption);
  }, eventOption);

  element.addEventListener('touchstart', event => {
    if (isInputElement(/** @type {Element} */(event.target), element)) {
      return;
    }
    const touch = event.changedTouches[0];
    const x = element.offsetLeft - touch.screenX;
    const y = element.offsetTop - touch.screenY;

    const onTouchMove = e => {
      const touch = e.changedTouches[0];
      element.style.left = (x + touch.screenX) + 'px';
      element.style.top = (y + touch.screenY) + 'px';
      element.style.right = 'unset';
    }
    document.body.addEventListener('touchmove', onTouchMove, eventOption);
    document.body.addEventListener('touchend', () => {
      document.body.removeEventListener('touchmove', onTouchMove, eventOption);
    }, eventOption);
  }, eventOption);
  return element;
}

// #ifdef MODULE
// export { button, createElement, dialog, div };
// #else
window.net = window.net || {};
net.asukaze = net.asukaze || {};
net.asukaze.cassava = net.asukaze.cassava || {};
net.asukaze.cassava.dom = net.asukaze.cassava.dom || {};
net.asukaze.cassava.dom.button = button;
net.asukaze.cassava.dom.createElement = createElement;
net.asukaze.cassava.dom.dialog = dialog;
net.asukaze.cassava.dom.div = div;
})();
// #endif
