(() => {
const { button, createElement, dialog, div, label, titleBar } = net.asukaze.import('./cassava_dom.js');
const { CassavaGridElement } = net.asukaze.import('./cassava_grid.js');

/**
 * @param {string} defaultName
 * @param {Set<string>} managedMacroNames
 * @returns {Promise<string>}
 */
function showRenameDialog(defaultName, managedMacroNames) {
  return new Promise(resolve => {
    const warningDiv =
        createElement('div', {style: 'color: #f00; font-size: 70%'});
    const macroNameInput = createElement('input', {
      name: 'macro-name',
      value: defaultName
    });
    const renameDialog = dialog([
      titleBar('マクロの名前', () => renameDialog.close()),
      createElement('form', {method: 'dialog'}, [
        warningDiv,
        div(macroNameInput),
        createElement('button', {
          onclick: event => {
            const newName = macroNameInput.value;
            if (!newName) {
              warningDiv.innerText = '名前を入力してください。';
              event.preventDefault();
              return;
            }
            if (managedMacroNames.has(newName)) {
              warningDiv.innerText =
                  '同名のマクロがあります。他の名前を入力してください。';
              event.preventDefault();
              return;
            }
          },
          value: 'submit'
        }, ['OK']),
        createElement('button', {value: 'cancel'}, ['Cancel'])
      ])
    ]);
    renameDialog.addEventListener('close', () => {
      document.body.removeChild(renameDialog);
      if (renameDialog.returnValue == 'submit') {
        resolve(macroNameInput.value);
      } else {
        resolve(null);
      }
    });
    document.body.append(renameDialog);
    renameDialog.showModal();
  });
}

class MacroDialog {
  /** @type {CassavaGridElement} */
  #grid;
  /** @type {string} */
  #macroName = '';
  /** @type {HTMLButtonElement} */
  #renameButton = button('名前変更', () => this.#rename());
  /** @type {HTMLButtonElement} */
  #deleteButton = button('削除', () => this.#delete());
  /** @type {HTMLSelectElement} */
  #macroSelect;
  /** @type {HTMLTextAreaElement} */
  #macroTextarea;
  /** @type {Set<string>} */
  #managedMacroNames = new Set();

  /** @param {CassavaGridElement} grid */
  constructor(grid) {
    const smallScreen = document.documentElement.clientWidth <= 480;
    this.#grid = grid;
    this.#macroSelect = createElement('select', {
      size: smallScreen ? 0: 10,
      style: 'width: 100%;',
      oninput: () => this.#load(this.#macroSelect.value)
    });
    this.#macroTextarea = createElement('textarea', {
      cols: 40,
      name: 'macro-text',
      rows: 15,
      style: 'width: 100%;',
      oninput: () => this.#save()
    });
    this.element = dialog([
      titleBar('マクロを編集', () => this.element.close()),
      createElement('div', smallScreen ? {} : {style: 'display: flex'}, [
        createElement('div', {style: 'margin-right: 10px;'}, [
          button('新規作成', () => this.#addNew()),
          this.#renameButton,
          this.#deleteButton,
          smallScreen ? ' ' : createElement('br'),
          this.#macroSelect
        ]),
        div(div(this.#macroTextarea),
            div(button('実行', () => grid.runMacro(this.#macroTextarea.value))))
      ])
    ]);

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('Macro/')) {
          const macroName = key.substring(6);
          grid.addMacro(macroName, localStorage.getItem(key));
          this.#managedMacroNames.add(macroName);
        }
      }
    } catch {}
  }

  show() {
    this.#render();
    this.#load(this.#macroName);
    this.element.show();
    this.#macroTextarea.focus();
  }

  async #addNew() {
    const newName =
        await showRenameDialog(this.#newName(), this.#managedMacroNames);
    if (!newName) {
      return;
    }
    this.#macroName = newName;
    this.#managedMacroNames.add(newName);
    this.#macroTextarea.value = '';
    this.#render();
    this.#macroTextarea.focus();
  }

  #newName() {
    for (let i = 1;; i++) {
      const name = '新規マクロ' + i;
      if (!this.#grid.getMacro(name)) {
        return name;
      }
    }
  }

  /**
   * @param {string} macroName 
   * @returns {string}
   */
  #key(macroName) {
    return 'Macro/' + macroName;
  }

  /** @param {string} macroName */
  #load(macroName) {
    this.#macroName = macroName;
    this.#macroTextarea.value = this.#grid.getMacro(macroName) || '';
    this.#render();
  }

  async #rename() {
    const oldName = this.#macroName;
    const newName = await showRenameDialog(oldName, this.#managedMacroNames);
    if (!newName || newName == oldName) {
      return;
    }

    if (this.#managedMacroNames.has(oldName)) {
      this.#managedMacroNames.delete(oldName);
    }
    this.#managedMacroNames.add(newName);
    this.#grid.addMacro(oldName, '');
    this.#macroName = newName;
    this.#save();
    this.#macroTextarea.focus();
  }

  #render() {
    this.#renameButton.disabled = (this.#macroName == '');
    this.#deleteButton.disabled = (this.#macroName == '');

    if (this.#macroSelect.children.length > 0 &&
        this.#macroSelect.value == this.#macroName) {
      return;
    }
    this.#macroSelect.innerHTML = '';
    const userMacroNames = Array.from(this.#managedMacroNames).sort();
    const appMacroNames = Array.from(this.#grid.getMacroNames())
        .filter(name => !this.#managedMacroNames.has(name))
        .sort();
    this.#macroSelect.append(createElement('option', {value: ''}, ['📂 ユーザー']));
    for (const name of userMacroNames) {
      this.#macroSelect.append(
          createElement('option', {selected: name == this.#macroName}, [name]));
    }
    this.#macroSelect.append(createElement('option'));
    this.#macroSelect.append(
        createElement('option', {value: ''}, ['📂 アプリケーション']));
    for (const name of appMacroNames) {
      this.#macroSelect.append(
          createElement('option', {selected: name == this.#macroName}, [name]));
    }
  }

  #save() {
    const macroText = this.#macroTextarea.value;
    if (macroText && !this.#macroName) {
      this.#macroName = this.#newName();
    }
    this.#grid.addMacro(this.#macroName, macroText);    
    try {
      if (macroText == '') {
        localStorage.removeItem(this.#key(this.#macroName));
      } else {
        this.#managedMacroNames.add(this.#macroName);
        localStorage.setItem(this.#key(this.#macroName), macroText);
      }
    } catch {}
    this.#render();
  }

  #delete() {
    if (!confirm(this.#macroName + ' を削除します')) {
      return;
    }
    this.#macroTextarea.value = '';
    this.#save();
    this.#managedMacroNames.delete(this.#macroName);
    this.#macroName = '';
    this.#render();
  }
}

net.asukaze.export({ MacroDialog });

})();
