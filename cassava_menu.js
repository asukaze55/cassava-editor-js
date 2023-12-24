(() => {
const { createElement } = net.asukaze.import('./cassava_dom.js');
const { CassavaGridElement } = net.asukaze.import('./cassava_grid.js');
const { MacroDialog } = net.asukaze.import('./cassava_macro_dialog.js');

function menuItem(label, onclick, children) {
  const li = createElement('li', {}, [label]);
  if (onclick) {
    li.addEventListener('click', onclick);
  }
  if (children) {
    li.append(
        createElement('ul', {className: 'sub-menu'}, menuItems(children)));
  }
  return li;
}

function menuItems(items) {
  return items.map(item => menuItem(...item));
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
  margin: 5px 0;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  z-index: 2;
}

.sub-menu li {
  background: #fff;
  border: 1px solid #000;
  cursor: default;
  list-style: none;
  margin: -1px 0 0 0;
  padding: 8px;
}
`;

class CassavaMenuElement extends HTMLElement {
  constructor() {
    super();

    const grid = /** @type {CassavaGridElement} */(
        document.getElementById(this.getAttribute('for')));
    const macroDialog = new MacroDialog(grid);

    const toggleSubMenu = event => this.toggleSubMenu(event);
    const command = command => () => {
      grid.runMacro(command + '()');
    };

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
        ['切り取り (Ctrl+X)', command('Cut')],
        ['コピー (Ctrl+C)', command('Copy')],
        ['貼り付け (Ctrl+V)', command('Paste')],
        ['すべて選択 (Ctrl+A)', command('SelectAll')],
        ['行選択 (Shift+Space)', command('SelectRow')],
        ['列選択 (Ctrl+Space)', command('SelectCol')],
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
      ['マクロ', event => this.toggleMacroMenu(event, grid, [
        ['マクロを編集...', () => macroDialog.show()]
      ]), []],
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

  toggleSubMenu(event) {
    event.stopPropagation();
    const currentTarget = event.currentTarget;
    let subMenu = currentTarget.lastElementChild;
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

  toggleMacroMenu(event, grid, items) {
    const currentTarget = event.currentTarget;
    const subMenu = currentTarget.lastElementChild;
    subMenu.innerHTML = '';
    subMenu.append(...menuItems(items));
    for (const name of grid.getMacroNames()) {
      if (!name.startsWith('lib/') && !name.startsWith('tests/') &&
          !name.startsWith('!')) {
        subMenu.append(menuItem(name, () => grid.runNamedMacro(name)));
      }
    }
    this.toggleSubMenu(event);
  }
}

customElements.define('cassava-menu', CassavaMenuElement);

})();
