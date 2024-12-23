(() => {
const { Range } = net.asukaze.import('./cassava_grid_data.js');
const { button, createElement, dialog, div, label, titleBar } = net.asukaze.import('./cassava_dom.js');
const { createFinder } = net.asukaze.import('./cassava_replacer.js');

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   allCells(): Range,
 *   bottom(): number,
 *   cell(x: number, y: number): string, 
 *   moveTo(x: number, y: number): Promise<void>,
 *   render(): Promise<void>
 *   replaceAll(str1: string, str2: string, ignoreCase: boolean,
 *       wholeCell: boolean, isRegex: boolean, range: Range): void
 *   right(): number
 * }} Grid
 */

class FindDialog {
  #findTextInput = createElement('input');
  #replaceInput = createElement('input');
  #respectCaseInput = createElement('input', {checked: true, type: 'checkbox'});
  #wholeCellInput = createElement('input', {type: 'checkbox'});
  #isRegexInput = createElement('input', {type: 'checkbox'});
  #isUpwardInput = createElement('input', {
    name: 'cassava-find-direction',
    type: 'radio'
  });
  #isDownwardInput = createElement('input', {
    checked: true,
    name: 'cassava-find-direction',
    type: 'radio'
  });

  /** @type {Grid} */
  #grid;

  /** @param {Grid} grid */
  constructor(grid) {
    this.#grid = grid;

    const buttonAttributes = {style: 'margin-bottom: 4px; width: 100%;'};
    this.element = dialog([
      titleBar('検索・置換', () => this.element.close()),
      createElement('div', {style: 'display: flex;'}, [
        div(div(createElement('fieldset', {}, [
              div(label('検索する文字列：', this.#findTextInput)),
              div(label('置換後の文字列：', this.#replaceInput)),
              div(label(this.#respectCaseInput, '大文字と小文字を区別')),
              div(label(this.#wholeCellInput,
                  'セル内容が完全に同一であるものを検索')),
              div(label(this.#isRegexInput, '正規表現検索')),
            ])),
            div(createElement('fieldset', {}, [
              createElement('legend', {}, ['検索方向']),
              label(this.#isUpwardInput, '左・上へ'),
              label(this.#isDownwardInput, '右・下へ')
            ]))),
        createElement('div', {style: 'margin-left: 16px;'}, [
          div(button('先頭から検索', () => {
            if (this.#isUpwardInput.checked) {
              grid.moveTo(grid.right(), grid.bottom());
            } else {
              grid.moveTo(1, 1);
            }
            this.findNext(this.#isUpwardInput.checked ? -1 : 1);
            grid.render();
          }, buttonAttributes)),
          div(button('次を検索', () => {
            this.findNext(this.#isUpwardInput.checked ? -1 : 1);
            grid.render();
          }, buttonAttributes)),
          div(button('置換して次に', () => {
            grid.replaceAll(
              this.#findTextInput.value,
              this.#replaceInput.value,
                !(this.#respectCaseInput.checked),
                this.#wholeCellInput.checked,
                this.#isRegexInput.checked,
                new Range(grid.x, grid.y, grid.x, grid.y));
            this.findNext(this.#isUpwardInput.checked ? -1 : 1);
            grid.render();
          }, buttonAttributes)),
          div(button('すべて置換', () => {
            grid.replaceAll(
                this.#findTextInput.value,
                this.#replaceInput.value,
                !(this.#respectCaseInput.checked),
                this.#wholeCellInput.checked,
                this.#isRegexInput.checked,
                grid.allCells());
            grid.render();
          }, buttonAttributes)),
          div(button('キャンセル', () => this.element.close(), buttonAttributes))
        ])
      ])
    ]);
  }

  /** @param {number} step */
  findNext(step) {
    const grid = this.#grid;
    const finder = createFinder(
        this.#findTextInput.value,
        !(this.#respectCaseInput.checked),
        this.#wholeCellInput.checked,
        this.#isRegexInput.checked);
    let x = grid.x + step;
    let y = grid.y;
    const right = grid.right();
    const bottom = grid.bottom();
    while (y >= 1 && y <= bottom) {
      while (x >= 1 && x <= right) {
        if (finder(grid.cell(x, y))) {
          grid.moveTo(x, y);
          return;
        }
        x += step;
      }
      y += step;
      x = step > 0 ? 1 : right;
    }
  }

  /** @returns {string} */
  findText() {
    return this.#findTextInput.value;
  }

  /** @param {string} value */
  setFindText(value) {
    this.#findTextInput.value = value;
  };

  show() {
    this.element.show();
    this.element.style.top = (window.innerHeight
        - this.element.getBoundingClientRect().height) / 2
        + window.scrollY + 'px';
  }
}

class FindPanel {
  #findTextInput = createElement('input');

  /** @type {Grid} */
  #grid;
  /** @type {FindDialog} */
  #findDialog;

  /**
   * @param {Grid} grid
   * @param {FindDialog} findDialog
   */
  constructor(grid, findDialog) {
    this.#grid = grid;
    this.#findDialog = findDialog;

    const updateFindText = () => {
      findDialog.setFindText(this.#findTextInput.value);
    }
    this.#findTextInput.addEventListener('change', updateFindText);
    const buttonAttributes = {style: 'margin: 4px 0 4px 4px;'};
    this.element = createElement('div', {style: 'display: none;'}, [
      createElement('span', {
        onclick: () => {
          this.element.style.display = 'none';
          grid.render();
        },
        style: 'cursor: pointer; padding: 8px;'
      }, ['×']),
      '検索：',
      this.#findTextInput,
      button('⇩ 次', () => {
        updateFindText();
        findDialog.findNext(1);
      }, buttonAttributes),
      button('⇧ 前', () => {
        updateFindText();
        findDialog.findNext(-1);
      }, buttonAttributes),
      button('オプション', () => findDialog.show(), buttonAttributes)
    ]);
  }

  show() {
    this.#findTextInput.value = this.#findDialog.findText();
    this.element.style.display = '';
    this.#grid.render();
    this.#findTextInput.focus();
  }
}

net.asukaze.export({ FindDialog, FindPanel });
})();
