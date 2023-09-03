// #ifdef MODULE
// import { button, createElement, dialog, div, titleBar } from './cassava_dom.js'
// import { CassavaGridElement, initGrid } from './cassava_grid.js';
// #else
(() => {
const initGrid = net.asukaze.cassava.initGrid;
const button = net.asukaze.cassava.dom.button;
const createElement = net.asukaze.cassava.dom.createElement;
const dialog = net.asukaze.cassava.dom.dialog;
const div = net.asukaze.cassava.dom.div;
const titleBar = net.asukaze.cassava.dom.titleBar;
// #endif

function menuItem(label, onclick, children) {
  const li = createElement('li', {}, [label]);
  if (onclick) {
    li.addEventListener('click', onclick);
  }
  if (children) {
    li.append(createElement('ul', {
      className: 'cassava-sub-menu'
    }, menuItems(children)));
  }
  return li;
}

function menuItems(items) {
  return items.map(item => menuItem(...item));
}

function closeMenus() {
  for (const subMenu of
      document.getElementsByClassName('cassava-sub-menu')) {
    /** @type {HTMLElement} */(subMenu).style.display = 'none';
  }
}

function toggleSubMenu(event) {
  event.stopPropagation();
  const currentTarget = event.currentTarget;
  let subMenu = currentTarget.lastElementChild;
  const open = subMenu.style.display == 'none';
  closeMenus();
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

function toggleMacroMenu(event, grid, items) {
  const currentTarget = event.currentTarget;
  const subMenu = currentTarget.lastElementChild;
  subMenu.innerHTML = '';
  subMenu.append(...menuItems(items));
  for (const name of grid.getMacroNames()) {
    if (!name.startsWith('lib/') && !name.startsWith('tests/')) {
      subMenu.append(menuItem(name, () => grid.runNamedMacro(name)));
    }
  }
  toggleSubMenu(event);
}

function init() {
  initGrid();

  for (const element of document.getElementsByTagName('cassava-menu')) {
    const grid = /** @type {CassavaGridElement} */(
        document.getElementById(element.getAttribute('for')));

    const fileInput = createElement('input', {
      style: 'display: none;',
      type: 'file'
    });
    fileInput.addEventListener('change', () => {
      grid.open(fileInput.files[0], 'UTF-8');
      closeMenus();
    });

    const macroNameInput = createElement('input', {name: 'macro-name', value: '新規マクロ'});
    const macroTextarea = createElement('textarea', {cols: 40, name: 'macro-text', rows: 10});
    const macroDialog = dialog([
      titleBar('マクロを編集', () => macroDialog.close()),
      div(macroTextarea),
      div(button('実行', () => grid.runMacro(macroTextarea.value))),
      div('マクロ名：', macroNameInput, ' ',
          button('追加', () => {
            grid.addMacro(macroNameInput.value, macroTextarea.value);
            macroDialog.close();
          }))
    ]);

    const ul = createElement('ul', {}, menuItems([
      ['ファイル', toggleSubMenu, [
        ['新規作成', () => grid.runCommand('New')],
        ['開く...', () => fileInput.click()],
        ['文字コード指定再読み込み ▶', toggleSubMenu, [
          ['UTF-8', () => grid.open(fileInput.files[0], 'UTF-8')],
          ['Shift-JIS', () => grid.open(fileInput.files[0], 'Shift_JIS')]
        ]],
        ['保存', () => {
          const file = fileInput.files[0];
          const name = file ? file.name : '無題.csv';
          grid.runCommand('SaveAs', name);
        }]
      ]],
      ['編集', toggleSubMenu, [
        ['元に戻す (Ctrl+Z)', () => grid.undo()],
        ['やり直し (Ctrl+Y)', () => grid.redo()],
        ['切り取り (Ctrl+X)', () => grid.runCommand('Cut')],
        ['コピー (Ctrl+C)', () => grid.runCommand('Copy')],
        ['貼り付け (Ctrl+V)', () => grid.runCommand('Paste')],
        ['すべて選択 (Ctrl+A)', () => grid.runCommand('SelectAll')],
        ['行選択 (Shift+Space)', () => grid.runCommand('SelectRow')],
        ['列選択 (Ctrl+Space)', () => grid.runCommand('SelectCol')],
        ['文字変換 ▶', toggleSubMenu, [
          ['英数・記号を半角に変換', () => grid.runCommand('TransChar0')],
          ['英数・記号を全角に変換', () => grid.runCommand('TransChar1')],
          ['英字を大文字に変換', () => grid.runCommand('TransChar2')],
          ['英字を小文字に変換', () => grid.runCommand('TransChar3')],
          ['カナを半角に変換', () => grid.runCommand('TransChar4')],
          ['カナを全角に変換', () => grid.runCommand('TransChar5')],
        ]],
        ['連続データ ▶', toggleSubMenu, [
          ['連番作成', () => grid.runCommand('SequenceS')],
          ['1 行目をコピー', () => grid.runCommand('SequenceC')],
        ]]
      ]],
      ['挿入・削除', toggleSubMenu, [
        ['行挿入 (Shift+Enter)', () => grid.runCommand('InsRow')],
        ['列挿入', () => grid.runCommand('InsCol')],
        ['行削除', () => grid.runCommand('CutRow')],
        ['列削除', () => grid.runCommand('CutCol')],
        ['行分割 (Ctrl+Enter)', () => grid.runCommand('Enter')],
        ['セル結合 (Ctrl+BkSp)', () => grid.runCommand('ConnectCell')],
        ['セル挿入 ▶', toggleSubMenu, [
          ['右向き (Ctrl+Ins)', () => grid.runCommand('InsertCellRight')],
          ['下向き', () => grid.runCommand('InsertCellDown')]
        ]],
        ['セル削除 ▶', toggleSubMenu, [
          ['左につめる (Ctrl+Del)', () => grid.runCommand('DeleteCellLeft')],
          ['上につめる (Shift+Ctrl+Del)', () => grid.runCommand('DeleteCellUp')]
        ]]
      ]],
      ['検索', toggleSubMenu, [
        ['簡易検索... (Ctrl+F)', () => grid.runCommand('QuickFind')],
        ['検索・置換...', () => grid.runCommand('Find')],
        ['次を検索 (F3)', () => grid.runCommand('FindNext')],
        ['前を検索 (Shift+F3)', () => grid.runCommand('FindBack')],
      ]],
      ['マクロ', event => toggleMacroMenu(event, grid, [
        ['マクロを追加...', () => macroDialog.show()]
      ]), []],
      ['ヘルプ', toggleSubMenu, [
        ['掲示板', () => window.open('https://www.asukaze.net/soft/cassava/bbs/', '_blank')],
        ['GitHub', () => window.open('https://github.com/asukaze55/cassava-editor-js/', '_blank')]
      ]]
    ]));
    element.append(ul, macroDialog, fileInput);
  }

  closeMenus();
  document.body.addEventListener('click', closeMenus);
}

net.asukaze.cassava.init = init;
window.addEventListener('DOMContentLoaded', init);

// #ifdef MODULE
// export { init };
// #else
})();
// #endif
