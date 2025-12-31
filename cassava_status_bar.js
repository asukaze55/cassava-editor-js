net.asukaze.module((module, require) => {
const { createElement } = require('./cassava_dom.js');

const styleContent = `
:host {
  border-top: 1px solid #999;
  display: flex;
  flex-direction: row;
  font-size: 80%;
}

div {
  border-right: 1px solid #ccc;
  overflow: hidden;
  padding: 0 8px;
  white-space: pre;
  width: 50px;
}

div:last-child {
  flex: 1;
}

ul {
  margin: 0;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  z-index: 2;
}

li {
  background: #fff;
  border: 1px solid #000;
  cursor: default;
  list-style: none;
  margin: -1px 0 0 0;
  padding: 8px;
}
`;

class CassavaStatusBarElement extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({mode: 'open'});
    shadow.innerHTML = '';
    shadow.append(
        createElement('style', {textContent: styleContent}),
        createElement('div', {style: 'width: 200px;'}));
  }

  /**
   * @param {number} index
   * @returns {HTMLElement}
   */
  #panel(index) {
    const shadow = this.shadowRoot;
    while (shadow.children.length <= index + 1) {
      shadow.append(createElement('div'));
    }
    return /** @type {HTMLElement} */(shadow.children[index + 1]);
  }

  /** @param {number} count */
  setCount(count) {
    this.#panel(count);
    const shadow = this.shadowRoot;
    while (shadow.children.length > count + 2) {
      shadow.children[shadow.children.length - 1].remove();
    }
  }

  /**
   * @param {number} index
   * @param {string} items
   * @param {(item: string) => void} onclick
   */
  setPopUp(index, items, onclick) {
    const panel = this.#panel(index);
    panel.style.cursor = 'default';
    panel.onclick = event => {
      const ul = createElement('ul');
      const hide = () => {
        ul.remove();
        document.removeEventListener('click', hide, /* useCapture= */ true);
      }
      document.addEventListener('click', hide, /* useCapture= */ true);

      for (const item of items.split('\n')) {
        const li = createElement('li', {}, [item]);
        li.addEventListener('click', async e => {
          e.stopPropagation();
          hide();
          try {
            await onclick(item);
          } catch (e) {
            alert(e);
            throw e;
          }
        });
        ul.append(li);
      }
      panel.append(ul);
      ul.style.top = (event.pageY - ul.offsetHeight) + 'px';
      ul.style.left = event.pageX + 'px';
    };
  }

  /**
   * @param {number} index
   * @param {string} text
   */
  setText(index, text) {
    this.#panel(index).innerText = text.replaceAll('\n', ' ');
  }

  /**
   * @param {number} index
   * @param {number} width
   */
  setWidth(index, width) {
    this.#panel(index).style.width = width + 'px';
  }
}

customElements.define('cassava-status-bar', CassavaStatusBarElement);

module.exports = { CassavaStatusBarElement };
});
