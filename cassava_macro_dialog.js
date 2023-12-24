(() => {
const { button, createElement, dialog, div, titleBar } = net.asukaze.import('./cassava_dom.js');
const { CassavaGridElement } = net.asukaze.import('./cassava_grid.js');

class MacroDialog {
  /** @type {CassavaGridElement} */
  #grid;
  /** @type {string} */
  #macroName = '';
  /** @type {HTMLInputElement} */
  #macroNameInput;
  /** @type {HTMLSelectElement} */
  #macroSelect;
  /** @type {HTMLTextAreaElement} */
  #macroTextarea;
  /** @type {HTMLDivElement} */
  #warningDiv;

  /** @param {CassavaGridElement} grid */
  constructor(grid) {
    const smallScreen = document.documentElement.clientWidth <= 480;
    this.#grid = grid;
    this.#macroNameInput = createElement('input', {
      name: 'macro-name',
      oninput: () => this.#rename(this.#macroNameInput.value)
    });
    this.#macroSelect = createElement('select', {
      size: smallScreen ? 0: 10,
      style: 'margin-right: 10px;',
      oninput: () => this.#load(this.#macroSelect.value)
    });
    this.#macroTextarea = createElement('textarea', {
      cols: 40,
      name: 'macro-text',
      rows: 15,
      oninput: () => this.#save()
    });
    this.#warningDiv =
        createElement('div', {style: 'color: #f00; font-size: 70%'});
    this.element = dialog([
      titleBar('マクロを編集', () => this.element.close()),
      createElement('div', smallScreen ? {} : {style: 'display: flex'}, [
        div(button('新規作成', () => this.#addNew()),
            smallScreen ? ' ' : createElement('br'),
            this.#macroSelect),
        div(div(this.#macroTextarea),
            div(button('実行', () => grid.runMacro(this.#macroTextarea.value))),
            div('名前変更：', this.#macroNameInput),
            this.#warningDiv)
      ])
    ]);
  }

  show() {
    if (this.#macroName) {
      this.#renderMacroSelect();
      this.#load(this.#macroName);
    } else {
      this.#addNew();
    }
    this.element.show();
    this.#macroTextarea.focus();
  }

  #addNew() {
    for (let i = 1;; i++) {
      const name = '新規マクロ' + i;
      if (!this.#grid.getMacro(name)) {
        this.#macroName = name;
        this.#macroNameInput.value = name;
        this.#macroTextarea.value = '';
        this.#renderMacroSelect();
        return;
      }
    }
  }

  #load(macroName) {
    this.#macroName = macroName;
    this.#macroNameInput.value = macroName;
    this.#macroTextarea.value = this.#grid.getMacro(macroName) || '';
    this.#warningDiv.innerText = '';
  }

  #rename(newName) {
    if (newName == '') {
      this.#warningDiv.innerText = '名前を入力してください。';
      return;
    }
    if (this.#macroName == newName) {
      return;
    }
    if (this.#grid.getMacro(newName)) {
      this.#warningDiv.innerText = '同名のマクロがあります。他の名前を入力してください。';
      return;
    }
    this.#warningDiv.innerText = '';
    this.#grid.addMacro(this.#macroName, '');
    this.#macroName = newName;
    this.#save();
  }

  #renderMacroSelect() {
    this.#macroSelect.innerHTML = '';
    const macroNames = Array.from(this.#grid.getMacroNames()).sort();
    for (const name of macroNames) {
      this.#macroSelect.append(
          createElement('option', {selected: name == this.#macroName}, [name]));
    }
    if (!macroNames.includes(this.#macroName)) {
      this.#macroSelect.append(
          createElement('option', {selected: true}, [this.#macroName]));
    }
  }

  #save() {
    const macroText = this.#macroTextarea.value;
    this.#grid.addMacro(this.#macroName, macroText);
    this.#renderMacroSelect();
  }
}

net.asukaze.export({ MacroDialog });

})();
