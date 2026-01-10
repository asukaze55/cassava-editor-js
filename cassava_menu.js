net.asukaze.module((module, require) => {
const { createElement } = require('./asukaze_dom.js');
const { CassavaGridElement } = require('./cassava_grid.js');
const { MacroDialog } = require('./cassava_macro_dialog.js');

/** @typedef {[string, (event: Event) => void, Array<MenuItemType>?]} MenuItemType */

/** @type MenuItemType */
const SEPARATOR = ['-', () => {}];

/**
 * @param {boolean} isSectionStart
 * @param {string} label
 * @param {(event: Event) => void} onclick
 * @param {Array<MenuItemType>=} children
 * @returns {HTMLLIElement}
 */
function menuItem(isSectionStart, label, onclick, children) {
  const li = createElement('li',
      isSectionStart ? {className: 'section-start'} : {}, [label]);
  if (onclick) {
    li.addEventListener('click', onclick);
  }
  if (children) {
    li.append(
        createElement('ul', {className: 'sub-menu'}, menuItems(children)));
  }
  return li;
}

/**
 * @param {Array<MenuItemType>} items
 * @returns {Array<HTMLLIElement>}
 */
function menuItems(items) {
  const result = [];
  let isSectionStart = true;
  for (const item of items) {
    if (item === SEPARATOR) {
      isSectionStart = true;
    } else {
      result.push(menuItem(isSectionStart, ...item));
      isSectionStart = false;
    }
  }
  return result;
}

const styleContent = `
.top-menu {
  border-bottom: 1px solid #000;
  margin: 0;
  padding: 0;
}

.top-menu > li {
  border: 0;
  cursor: default;
  display: inline-block;
  list-style: none;
  margin: 4px 8px;
  position: relative;
  vertical-align: top;
}

.sub-menu {
  border: 1px solid #000;
  margin: 4px 0;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  z-index: 2;
}

.sub-menu li {
  background: #fff;
  cursor: default;
  list-style: none;
  margin: -1px 0 0 0;
  padding: 8px;
}

.section-start {
  border-top: 1px solid #000;
}
`;

class CassavaMenuElement extends HTMLElement {
  constructor() {
    super();

    const grid = /** @type {CassavaGridElement} */(
        document.getElementById(this.getAttribute('for')));
    const macroDialog = new MacroDialog(grid);

    const toggleSubMenu = /** @type {(event: Event) => void} */(
        event => this.toggleSubMenu(event));
    const command = /** @type {(command: string) => () => void} */(
        command => () => grid.runMacro(command + '()'));

    const ul = createElement('ul', {className: 'top-menu'}, menuItems([
      ['ファイル', toggleSubMenu, [
        ['新規作成', command('New')],
        ['開く...', command('Open')],
        ['文字コード指定再読み込み ▶', toggleSubMenu, [
          ['UTF-8', command('ReloadCodeUTF8')],
          ['Shift-JIS', command('ReloadCodeShiftJIS')]
        ]],
        ['保存 (Ctrl+S)', command('Save')]
      ]],
      ['編集', toggleSubMenu, [
        ['元に戻す (Ctrl+Z)', command('Undo')],
        ['やり直し (Ctrl+Y)', command('Redo')],
        SEPARATOR,
        ['切り取り (Ctrl+X)', command('Cut')],
        ['コピー (Ctrl+C)', command('Copy')],
        ['貼り付け (Ctrl+V)', command('Paste')],
        ['すべて選択 (Ctrl+A)', command('SelectAll')],
        SEPARATOR,
        ['行選択 (Shift+Space)', command('SelectRow')],
        ['列選択 (Ctrl+Space)', command('SelectCol')],
        SEPARATOR,
        ['合計をコピー', command('CopySum')],
        ['平均をコピー', command('CopyAvr')],
        ['文字変換 ▶', toggleSubMenu, [
          ['英数・記号を半角に変換', command('TransChar0')],
          ['英数・記号を全角に変換', command('TransChar1')],
          ['英字を大文字に変換', command('TransChar2')],
          ['英字を小文字に変換', command('TransChar3')],
          ['カナを半角に変換', command('TransChar4')],
          ['カナを全角に変換', command('TransChar5')],
        ]],
        ['連続データ ▶', toggleSubMenu, [
          ['連番作成', command('SequenceS')],
          ['1 行目をコピー', command('SequenceC')],
        ]]
      ]],
      ['挿入・削除', toggleSubMenu, [
        ['行挿入 (Shift+Enter)', command('InsRow')],
        ['列挿入', command('InsCol')],
        ['行削除', command('CutRow')],
        ['列削除', command('CutCol')],
        ['行分割 (Ctrl+Enter)', command('Enter')],
        SEPARATOR,
        ['セル結合 (Ctrl+BkSp)', command('ConnectCell')],
        ['セル挿入 ▶', toggleSubMenu, [
          ['右向き (Ctrl+Ins)', command('InsertCellRight')],
          ['下向き', command('InsertCellDown')]
        ]],
        ['セル削除 ▶', toggleSubMenu, [
          ['左につめる (Ctrl+Del)', command('DeleteCellLeft')],
          ['上につめる (Shift+Ctrl+Del)', command('DeleteCellUp')]
        ]]
      ]],
      ['検索', toggleSubMenu, [
        ['簡易検索... (Ctrl+F)', command('QuickFind')],
        ['検索・置換...', command('Find')],
        ['次を検索 (F3)', command('FindNext')],
        ['前を検索 (Shift+F3)', command('FindBack')],
      ]],
      ['表示', toggleSubMenu, [
        ['１行目を固定', command('FixFirstRow')],
        ['１列目を固定', command('FixFirstCol')],
        ['カーソル位置までを固定', command('FixUpLeft')],
        ['固定を解除', command('UnFix')]
      ]],
      ['マクロ', event => this.toggleMacroMenu(event, grid, [
        ['マクロを編集...', () => macroDialog.show()],
        ['指定したマクロを実行...', command('MacroExecute')],
      ]), []],
      ['オプション', toggleSubMenu, [
        ['オプション...', command('OptionDlg')]
      ]],
      ['ヘルプ', toggleSubMenu, [
        ['掲示板', () => window.open('https://www.asukaze.net/soft/cassava/bbs/', '_blank')],
        ['GitHub', () => window.open('https://github.com/asukaze55/cassava-editor-js/', '_blank')]
      ]]
    ]));

    const shadow = this.attachShadow({mode: 'open'});
    shadow.innerHTML = '';
    shadow.append(
        createElement('style', {textContent: styleContent}), ul, macroDialog.element);

    this.closeMenus();
    document.body.addEventListener('click', () => this.closeMenus());
  }

  closeMenus() {
    for (const subMenu of
        this.shadowRoot.querySelectorAll('.sub-menu')) {
      /** @type {HTMLElement} */(subMenu).style.display = 'none';
    }
  }

  /** @param {Event} event */
  toggleSubMenu(event) {
    event.stopPropagation();
    const currentTarget = /** @type {Element} */(event.currentTarget);
    let subMenu = /** @type {HTMLElement} */(currentTarget.lastElementChild);
    const open = subMenu.style.display == 'none';
    this.closeMenus();
    if (open) {
      subMenu.style.display = '';
    } else if (event.target != currentTarget) {
      return;
    }
    subMenu = subMenu.parentElement;
    while (subMenu != null && subMenu.tagName != 'cassava-menu') {
      subMenu.style.display = '';
      subMenu = subMenu.parentElement;
    }
  }

  /**
   * @param {Event} event
   * @param {CassavaGridElement} grid
   * @param {Array<MenuItemType>} items
   */
  toggleMacroMenu(event, grid, items) {
    const currentTarget = /** @type {Element} */(event.currentTarget);
    const subMenu = currentTarget.lastElementChild;
    subMenu.innerHTML = '';
    subMenu.append(...menuItems(items));
    subMenu.append(...menuItems(grid.getMacroNames()
        .filter(name => !name.startsWith('lib/') &&
            !name.startsWith('tests/') && !name.startsWith('!'))
        .map(name => [name, () => grid.runNamedMacro(name)])));
    this.toggleSubMenu(event);
  }
}

customElements.define('cassava-menu', CassavaMenuElement);

});
