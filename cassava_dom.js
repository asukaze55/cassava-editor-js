(() => {

/**
 * @template {string} K
 * @param {K} name
 * @param {Omit<Partial<HTMLElementTagNameMap[K]>, 'style'> & {
 *         onclick?: (event: PointerEvent) => void,
 *         onmousedown?: (event: MouseEvent) => void,
 *         onmousemove?: (event: MouseEvent) => void,
 *         style?: string}=} attributes
 * @param {Array<Node|string>=} children
 * @returns {HTMLElementTagNameMap[K]}
 */
function createElement(name, attributes, children) {
  const element = /** @type {any} */(document.createElement(name));
  if (attributes) {
    for (const key of Object.keys(attributes)) {
      element[key] = /** @type {any} */(attributes)[key];
    }
  }
  if (children) {
    element.append(...children);
  }
  return element;
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
 * @param {{}=} attributes
 * @returns {HTMLButtonElement}
 */
function button(content, onclick, attributes) {
  const element = createElement('button', attributes, [content]);
  element.addEventListener('click', onclick);
  return element;
}

/**
 * @param  {...(Node|string)} children
 * @returns {HTMLLabelElement}
 */
function label(...children) {
  return createElement('label', {}, children);
}

/**
 * @param {Element} element
 * @param {Element} root
 * @return {boolean}
 */
function isInputElement(element, root) {
  while (element != null && element != root) {
    if (element.tagName == 'BUTTON' || element.tagName == 'INPUT' ||
        element.tagName == 'SELECT' || element.tagName == 'TEXTAREA') {
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
    style: 'margin-top: 8px; z-index: 3;'
  }, children);

  const eventOption = /** @type {EventListenerOptions} */({passive: true});
  element.addEventListener('mousedown', event => {
    if (isInputElement(/** @type {Element} */(event.target), element)) {
      return;
    }
    const x = element.offsetLeft - event.clientX;
    const y = element.offsetTop - event.clientY;

    /** @type {(e: MouseEvent) => void} */
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

    /** @type {(e: TouchEvent) => void} */
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

/**
 * @param {string} title
 * @param {() => any} onClose
 * @returns {HTMLDivElement}
 */
function titleBar(title, onClose) {
  const closeButton = createElement('span',
      {style: 'cursor: pointer; text-align: end;'}, ['×']);
  closeButton.addEventListener('click', onClose);
  return createElement('div', {style: 'display: flex; margin-bottom: 8px'}, [
    createElement('span', {style: 'flex-grow: 1'}, [title]),
    closeButton
  ]);
}

net.asukaze.export({ button, createElement, dialog, div, label, titleBar });
})();
