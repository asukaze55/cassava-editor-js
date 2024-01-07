(() => {
const { CassavaStatusBarElement } = net.asukaze.import('./cassava_status_bar.js');
const { Environment, run } = net.asukaze.import('./cassava_macro.js');
const { GridData, Range, isNumber } = net.asukaze.import('./cassava_grid_data.js');
const { UndoGrid } = net.asukaze.import('./cassava_undo_grid.js');
const { button, createElement, dialog, div, label, titleBar } = net.asukaze.import('./cassava_dom.js');
const { createFinder, toHankakuAlphabet, toHankakuKana, toZenkakuAlphabet, toZenkakuKana } = net.asukaze.import('./cassava_replacer.js');

class Clipboard {
  /** @type {string} */
  #clipText = '';

  /** @returns {Promise<string>} */
  async readText() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return this.#clipText;
    }
  }

  /** @param {string} text */
  async writeText(text) {
    this.#clipText = text;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }
}

const clipboard = new Clipboard();

function blurActiveElement() {
  /** @type {HTMLElement} */(document.activeElement).blur();
}

/** @param {string} text */
function sanitize(text) {
  if (text == null) {
    return '';
  }
  return text.replaceAll('&', '&amp;')
             .replaceAll('<', '&lt;')
             .replaceAll('>', '&gt;')
             .replaceAll('"', '&quot;')
             .replaceAll(' ', '&nbsp;');
}

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

class Grid {
  /** @type {UndoGrid} */
  #undoGrid;
  /** @type {number} */
  #suppressRender;
  /** @type {number} */
  #renderedTop;
  /** @type {number} */
  #renderedBottom;
  /** @type {Function} */
  #onRender;

  /**
   * @param {GridData} gridData
   * @param {Function} onRender
   */
  constructor(gridData, onRender) {
    this.element = createElement('table', {tabIndex: -1});
    this.#undoGrid = new UndoGrid(gridData);
    this.#suppressRender = 0;
    this.#onRender = onRender;
    this.clear();
  }

  /** @returns {Range} */
  allCells() {
    return this.#undoGrid.range();
  }

  beginMacro() {
    this.#undoGrid.push();
    this.#suppressRender++;
  }

  /** @returns {number} */
  bottom() {
    return this.#undoGrid.bottom();
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  cell(x, y) {
    return this.#undoGrid.cell(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {HTMLTableCellElement}
   */
  cellNode(x, y) {
    const i = (y == 0) ? 0 : y - this.#renderedTop + 1;
    return this.element.rows[i].cells[x];
  }

  /** @param {string=} fileName */
  clear(fileName = '') {
    this.#undoGrid.clear();
    this.fileName = fileName;
    this.isEditing = false;
    this.isMouseDown = false;
    this.mouseDownX = 1;
    this.mouseDownY = 1;
    this.defaultColWidth = 48;
    /** @type {Map<number, number>} */
    this.colWidths = new Map();
    this.defaultRowHeight = 32;
    /** @type {Map<number, number>} */
    this.rowHeights = new Map();
    /** @type {number} */
    this.anchorX = 1;
    this.anchorY = 1;
    this.x = 1;
    this.y = 1;
    this.#renderedTop = 1;
    this.#renderedBottom = 0;
  }

  /** @param {Range} range */
  clearCells(range) {
    this.#undoGrid.clearCells(range);
  }

  /** @param {Range} range */
  connectCells(range) {
    blurActiveElement();
    const l = range.left;
    const t = range.top;
    const r = range.right;
    const b = range.bottom;
    if (r > l || b > t) {
      this.#undoGrid.push();
      let result = '';
      for (let y = t; y <= b; y++) {
        for (let x = l; x <= r; x++) {
          result += this.#undoGrid.cell(x, y);
          this.#undoGrid.setCell(x, y, '');
        }
      }
      this.#undoGrid.setCell(l, t, result);
      this.#undoGrid.pop(range, range);
      this.select(l, t, r, b);
    } else if (l > 1) {
      this.#undoGrid.push();
      this.#undoGrid.setCell(l - 1, t, this.#undoGrid.cell(l - 1, t) + this.#undoGrid.cell(l, t));
      this.#undoGrid.deleteCellLeft(new Range(l, t, l, t));
      this.#undoGrid.pop(range, new Range(l - 1, t, l - 1, t));
      this.moveTo(l - 1, t);
    } else if (t > 1) {
      this.#undoGrid.push();
      const right = this.#undoGrid.right();
      let ux = right;
      while(ux > 0 && this.#undoGrid.cell(ux, t - 1) == '') {
        ux--;
      }
      for (let x = 1; x <= right; x++) {
        this.#undoGrid.setCell(x + ux, t - 1, this.#undoGrid.cell(x, t));
      }
      this.#undoGrid.deleteRow(t, t);
      this.#undoGrid.pop(range, new Range(ux + 1, t - 1, ux + 1, t - 1));
      this.moveTo(ux + 1, t - 1);
    } else {
      this.moveTo(l, t);
    }
  }

  /** @param {Range} range */
  deleteCellUp(range) {
    this.#undoGrid.deleteCellUp(range);
  }

  /** @param {Range} range */
  deleteCellLeft(range) {
    this.#undoGrid.deleteCellLeft(range);
  }

  /**
   * @param {number} l
   * @param {number} r
   */
  deleteCol(l, r) {
    this.#undoGrid.deleteCol(l, r);
  }

  /**
   * @param {number} t
   * @param {number} b
   */
  deleteRow(t, b) {
    this.#undoGrid.deleteRow(t, b);
  }

  endMacro() {
    const range = this.selection();
    this.#undoGrid.pop(range, range);
    this.#suppressRender--;
  }

  /**
   * @param {number} y
   * @returns {number}
   */
  getRowHeight(y) {
    const rowHeight = this.rowHeights.get(y);
    return rowHeight != null ? rowHeight : this.defaultRowHeight;
  }

  /** @returns {GridData} */
  gridData() {
    return this.#undoGrid.gridData;
  }

  /** @param {Range} range */
  insertCellDown(range) {
    this.#undoGrid.insertCellDown(range);
  }

  /** @param {Range} range */
  insertCellRight(range) {
    this.#undoGrid.insertCellRight(range);
  }

  /**
   * @param {number} l
   * @param {number} r
   * @param {boolean} move
   */
  insertCol(l, r, move) {
    this.#undoGrid.insertCol(l, r);
    if (move) {
      this.moveTo(l, 1);
    } else {
      if (this.anchorX >= l) {
        this.anchorX += r - l + 1;
      }
      if (this.x >= l) {
        this.x += r - l + 1;
      }
    }
  }

  /**
   * @param {number} t
   * @param {number} b
   * @param {boolean} move
   */
  insertRow(t, b, move) {
    this.#undoGrid.insertRow(t, b);
    if (move) {
      this.moveTo(1, t);
    } else {
      if (this.anchorY >= t) {
        this.anchorY += b - t + 1;
      }
      if (this.y >= t) {
        this.y += b - t + 1;
      }
    }
  }

  /**
   * @param {number} selAnchor
   * @param {number} selFocus
   */
  insertRowAtCursor(selAnchor, selFocus) {
    const isEditing = this.isEditing;
    const t = this.selTop();
    const l = this.selLeft();
    blurActiveElement();
    this.#undoGrid.push();
    const cellText = this.#undoGrid.cell(l, t);
    const selStart = Math.min(selAnchor, selFocus);
    this.#undoGrid.insertRow(t + 1, t + 1);
    this.#undoGrid.setCell(1, t + 1, cellText.substring(selStart));
    this.#undoGrid.setCell(l, t, cellText.substring(0, selStart))
    for (let x = l + 1; x <= this.#undoGrid.right(); x++) {
      this.#undoGrid.setCell(x - l + 1, t + 1, this.#undoGrid.cell(x, t));
      this.#undoGrid.setCell(x, t, '');
    }
    this.#undoGrid.pop(this.selection(), new Range(1, t + 1, this.selRight() - l + 1, t + 1));
    if (isEditing) {
      this.selectText(1, t + 1, selAnchor - selStart, selFocus - selStart);
    } else {
      this.select(1, t + 1, this.selRight() - l + 1, t + 1);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  async moveTo(x, y) {
    this.anchorX = x;
    this.anchorY = y;
    this.x = x;
    this.y = y;
    if (y < this.#renderedTop || y > this.#renderedBottom) {
      this.#renderedTop = y;
      this.#renderedBottom = 0;
      this.element.innerHTML = '';
    }
    if (this.#suppressRender > 0) {
      return;
    }
    await this.render();
    const cellNode = this.cellNode(x, y);
    cellNode.focus();
    setTimeout(() => window.getSelection()
        .setBaseAndExtent(cellNode, 0, cellNode,
            childrenCountWithoutBr(cellNode)));
  }

  /**
   * @param {string} clipText
   * @param {GridData} clipData
   * @param {Range} range
   * @param {number} way
   */
  paste(clipText, clipData, range, way) {
    const l = range.left;
    const t = range.top;
    const r = range.right;
    const b = range.bottom;
    const clipCols = clipData.right();
    const clipRows = clipData.bottom();
    const targetCols =
        way <= 0 ? Math.min(clipCols, r - l + 1)
                 : way == 1 ? r - l + 1 : clipCols;
    const targetRows =
        way <= 0 ? Math.min(clipRows, b - t + 1)
                 : way == 1 ? b - t + 1 : clipRows;
    const targetRange = new Range(l, t, l + targetCols - 1, t + targetRows - 1);
    switch (way) {
      case 1:
        this.#undoGrid.pasteRepeat(clipData, targetRange);
        return;
      case 3:
        this.#undoGrid.push();
        this.#undoGrid.insertCellRight(targetRange);
        this.#undoGrid.paste(clipData, targetRange);
        this.#undoGrid.pop(targetRange, targetRange);
        return;
      case 4:
        this.#undoGrid.push();
        this.#undoGrid.insertCellDown(targetRange);
        this.#undoGrid.paste(clipData, targetRange);
        this.#undoGrid.pop(targetRange, targetRange);
        return;
      case 5:
        this.#undoGrid.setCell(this.x, this.y, clipText);
        return;
      default:
        this.#undoGrid.paste(clipData, targetRange);
        return;
    }
  }

  redo() {
    blurActiveElement();
    const range = this.#undoGrid.redo();
    if (range) {
      this.render();
      this.select(range.left, range.top, range.right, range.bottom);
    }
  }

  refresh() {
    this.rowHeights.clear();
  }

  async render() {
    if (this.#suppressRender > 0) {
      return;
    }
    if (this.#onRender) {
      this.#suppressRender++;
      await this.#onRender();
      this.#suppressRender--;
    }
    const table = this.element;
    const bottom = Math.max(4, this.#undoGrid.bottom() + 1, this.y, this.anchorY);
    while (table.rows.length > bottom - this.#renderedTop + 2) {
      table.deleteRow(-1);
    }
    const headerRow = (table.rows.length > 0) ? table.rows[0] : table.insertRow();
    const right = Math.max(4, this.#undoGrid.right() + 1, this.x, this.anchorX);
    this.renderRow(headerRow, 0, right);
    const tableTop = table.getBoundingClientRect().top;
    this.#renderedBottom = bottom;
    for (let y = this.#renderedTop; y <= bottom; y++) {
      const i = y - this.#renderedTop + 1;
      const row = (i < table.rows.length) ? table.rows[i] : table.insertRow();
      if (row.getBoundingClientRect().top - tableTop > screen.height * 2) {
        this.#renderedBottom = y - 1;
        break;
      }
      const rowHeight = this.getRowHeight(y);
      if (rowHeight == 0) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
      if (row.getBoundingClientRect().bottom < tableTop) {
        continue;
      }
      this.renderRow(row, y, right);
    }
    if (table.rows[1].getBoundingClientRect().bottom > tableTop) {
      const count = Math.min(10, this.#renderedTop - 1);
      let prerenderedHeight = 0;
      for (let i = 1; i <= count; i++) {
        const row = table.insertRow(1);
        this.renderRow(row, this.#renderedTop - i, right);
        prerenderedHeight += row.getBoundingClientRect().height;
      }
      this.#renderedTop -= count;
      if (table.scrollTop == 0) {
        table.scrollTop = prerenderedHeight;
      }
    }
  }

  /**
   * @param {HTMLTableRowElement} row
   * @param {number} y
   * @param {number} right
   */
  renderRow(row, y, right) {
    while (row.cells.length > right + 1) {
      row.deleteCell(-1);
    }
    for (let x = 0; x <= right; x++) {
      let cell;
      if (x < row.cells.length) {
        cell = row.cells[x];
      } else {
        cell = createElement((x == 0 || y == 0) ? 'th' : 'td');
        cell.dataset.x = String(x);
        if (x == 0 && y == 0) {
          cell.className = 'fixed-both';
        } else if (y == 0) {
          cell.className = 'fixed-row';
        } else if (x == 0) {
          cell.className = 'fixed-col';
        } else {
          cell.contentEditable = 'true';
        }
        row.appendChild(cell);
      }
      cell.dataset.y = String(y);
      this.renderCell(cell, x, y);
    }
  }

  /**
   * @param {HTMLTableCellElement} cell
   * @param {number} x
   * @param {number} y
   */
  renderCell(cell, x, y) {
    const isFixed = x == 0 || y == 0;
    const isSelected = x >= this.selLeft()
        && x <= this.selRight()
        && y >= this.selTop()
        && y <= this.selBottom();
    const isEditing = this.isEditing
        && x == this.x && y == this.y;

    if (!isEditing) {
      let html = '';
      if (x == 0 && y == 0) {
      } else if (y == 0) {
        html = (x <= this.#undoGrid.right()) ? x.toString() : '&nbsp;';
      } else if (x == 0) {
        html = (y <= this.#undoGrid.bottom()) ? y.toString() : '&nbsp;';
      } else if (!isEditing) {
        html = this.#undoGrid.cell(x, y).split('\n')
            .map(line => sanitize(line) + '<br>')
            .join('')
      }
      if (cell.innerHTML !== html) {
        cell.innerHTML = html;
      }
    }

    if (isFixed) {
      cell.style.backgroundColor = '#eee';
      cell.style.color = '#000';
    } else if (isSelected && !isEditing) {
      cell.style.backgroundColor = '#00f';
      cell.style.color = '#fff';
    } else {
      cell.style.backgroundColor = '#fff';
      cell.style.color = '#000';
    }
  }

  /**
   * @param {string} str1
   * @param {string} str2
   * @param {boolean} ignoreCase
   * @param {boolean} wholeCell
   * @param {boolean} isRegex
   * @param {Range} range
   */
  replaceAll(str1, str2, ignoreCase, wholeCell, isRegex, range) {
    this.#undoGrid.replaceAll(
        str1, str2, ignoreCase, wholeCell, isRegex, range);
  }

  /** @returns {number} */
  right() {
    return this.#undoGrid.right();
  }

  /** @returns {number} */
  selBottom() {
    return Math.max(this.anchorY, this.y);
  }

  /** @returns {number} */
  selLeft() {
    return Math.min(this.anchorX, this.x);
  }

  /** @returns {number} */
  selRight() {
    return Math.max(this.anchorX, this.x);
  }

  /** @returns {number} */
  selTop() {
    return Math.min(this.anchorY, this.y);
  }

  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   */
  select(x1, y1, x2, y2) {
    if (x1 == this.anchorX && x2 == this.anchorY && x2 == this.x && y2 == this.y) {
      return;
    }
    if (x1 == x2 && y1 == y2) {
      this.moveTo(x1, y1);
      return;
    }
    blurActiveElement();
    this.element.focus();
    this.isEditing = false;
    this.anchorX = x1;
    this.anchorY = y1;
    this.x = x2;
    this.y = y2;
    this.render();
  }

  selectAll() {
    this.select(1, 1, this.#undoGrid.right(), this.#undoGrid.bottom());
  }

  /**
   * @param {number} l
   * @param {number} r
   */
  selectCol(l, r) {
    this.select(l, 1, r, this.#undoGrid.bottom());
  }

  /**
   * @param {number} t
   * @param {number} b
   */
  selectRow(t, b) {
    this.select(1, t, this.#undoGrid.right(), b);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} selAnchor
   * @param {number} selFocus
   */
  selectText(x, y, selAnchor, selFocus) {
    this.anchorX = x;
    this.anchorY = y;
    this.x = x;
    this.y = y;
    this.render();
    const cellNode = this.cellNode(x, y);
    this.renderCell(cellNode, x, y);
    cellNode.focus();
    setTimeout(() => {
      let anchorNode = null;
      let anchorOffset;
      let focusNode = null;
      let focusOffset;
      for (const child of cellNode.childNodes) {
        const length = getTextContent(child).length;
        if (!anchorNode && selAnchor <= length) {
          anchorNode = child;
          anchorOffset = selAnchor;
        } else {
          selAnchor -= length;
        }
        if (!focusNode && selFocus <= length) {
          focusNode = child;
          focusOffset = selFocus;
        } else {
          selFocus -= length;
        }
      }
      if (anchorNode && focusNode) {
        window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
      } else {
        window.getSelection().setBaseAndExtent(cellNode, 0, cellNode, childrenCountWithoutBr(cellNode));
      }
    });
  }

  /** @returns {Range} */
  selection() {
    return new Range(
        Math.min(this.anchorX, this.x),
        Math.min(this.anchorY, this.y),
        Math.max(this.anchorX, this.x),
        Math.max(this.anchorY, this.y));
  }

  /** @param {number} b */
  setBottom(b) {
    this.#undoGrid.setBottom(b);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {any} value
   */
  setCell(x, y, value) {
    this.#undoGrid.setCell(x, y, value);
    this.render();
  }

  /** @param {number} r */
  setRight(r) {
    this.#undoGrid.setRight(r);
  }

  /**
   * @param {number} y
   * @param {number} h
   */
  setRowHeight(y, h) {
    this.rowHeights.set(y, h);
  }

  /** @param {Range} range */
  sequenceC(range) {
    this.#undoGrid.sequenceC(range);
  }

  /** @param {Range} range */
  sequenceS(range) {
    this.#undoGrid.sequenceS(range);
  }

  /**
   * @param {Range} range
   * @param {number} p
   * @param {boolean} dir
   * @param {boolean} num
   * @param {boolean} ignoreCase
   * @param {boolean} zenhan
   */
  sort(range, p, dir, num, ignoreCase, zenhan) {
    this.#undoGrid.sort(range, p, dir, num, ignoreCase, zenhan);
  }

  /** @param {Range} range */
  sumAndAvr(range) {
    return this.#undoGrid.sumAndAvr(range);
  }

  undo() {
    blurActiveElement();
    const range = this.#undoGrid.undo();
    if (range) {
      this.render();
      this.select(range.left, range.top, range.right, range.bottom);
    }
  }

  /** @param {(value: string) => string} callback */
  updateSelectedCells(callback) {
    const range = this.selection();
    this.#undoGrid.push();
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = range.left; x <= range.right; x++) {
        this.#undoGrid.setCell(x, y, callback(this.#undoGrid.cell(x, y)));
      }
    }
    this.#undoGrid.pop(range, range);
  }
}

/**
 * @param {Element} node
 * @returns {HTMLTableCellElement?}
 */
function getCellNode(node) {
  while (node != null && node.tagName != 'TD' && node.tagName != 'TH') {
    node = node.parentElement;
  }
  return /** @type {HTMLTableCellElement?} */(node);
}

/**
 * @param {Event|Touch} event
 * @returns {HTMLTableCellElement?}
 */
function getEventTarget(event) {
  return getCellNode(/** @type {Element} */(event.target));
}

/**
 * @param {Event} event
 * @param {Grid} grid
 */
function gridFocusIn(event, grid) {
  const target = getEventTarget(event);
  if (target == null) {
    return;
  }
  const x = parseInt(target.dataset.x, 10);
  const y = parseInt(target.dataset.y, 10);
  grid.isEditing = true;
  grid.renderCell(target, x, y);
}

/**
 * @param {Event} event
 * @param {Grid} grid
 */
function gridFocusOut(event, grid) {
  const target = getEventTarget(event);
  if (target == null) {
    return;
  }
  const x = parseInt(target.dataset.x, 10);
  const y = parseInt(target.dataset.y, 10);
  grid.isEditing = false;
  grid.renderCell(target, x, y);
}

/**
 * @param {Element} cellNode
 * @returns {string}
 */
function parseCellInput(cellNode) {
  return cellNode.innerHTML
      .replaceAll(/<\/div>/gi, '\n')
      .replaceAll(/<br>/gi, '\n')
      .replaceAll(/<.*?>/g, '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&quot;', '"')
      .replaceAll('&gt;', '>')
      .replaceAll('&lt;', '<')
      .replaceAll('&amp;', '&')
      .replaceAll(/\n$/g, '');
}

/**
 * @param {Event} event
 * @param {Grid} grid
 */
function gridInput(event, grid) {
  const target = getEventTarget(event);
  if (target == null) {
    return;
  }
  const x = parseInt(target.dataset.x, 10);
  const y = parseInt(target.dataset.y, 10);
  grid.setCell(x, y, parseCellInput(target));
}

/**
 * @param {Node} node
 * @returns {string}
 */
function getTextContent(node) {
  if (/** @type {Element} */(node).tagName == 'BR') {
    return '\n';
  }
  return node.textContent;
}

/**
 * @param {Element} node
 * @param {number} offset
 * @returns {number}
 */
function getInCellOffset(node, offset) {
  const cellNode = getCellNode(node);
  if (node == cellNode) {
    let result = 0;
    for (let i = 0; i < offset; i++) {
      result += getTextContent(cellNode.childNodes[i]).length;
    }
    return result;
  } else {
    let result = 0;
    for (const child of cellNode.childNodes) {
      if (child == node) {
        break;
      }
      result += getTextContent(child).length;
    }
    return result + offset;
  }
}

/**
 * @param {Node} cellNode
 * @returns {number}
 */
function childrenCountWithoutBr(cellNode) {
  if (cellNode.childNodes.length == 0) {
    return 0;
  }
  return /** @type {Element} */(cellNode.lastChild).tagName == 'BR'
      ? cellNode.childNodes.length - 1
      : cellNode.childNodes.length;
}

/**
 * @param {Node} cellNode
 * @returns {Node?}
 */
function lastChildWithoutBr(cellNode) {
  if (cellNode.childNodes.length == 0) {
    return null;
  }
  return /** @type {Element} */(cellNode.lastChild).tagName == 'BR'
      ? cellNode.lastChild.previousSibling
      : cellNode.lastChild;
}

/**
 * @param {Node} node
 * @param {number} offset
 * @param {Node} cellNode
 * @returns {boolean}
 */
function isFirstLine(node, offset, cellNode) {
  if (node == cellNode) {
    return offset == 0;
  } else {
    return node == cellNode.firstChild;
  }
}

/**
 * @param {Selection} selection
 * @param {Node} cellNode
 * @returns {boolean}
 */
function containsFirstLine(selection, cellNode) {
  return isFirstLine(selection.focusNode,
          selection.focusOffset, cellNode)
      || isFirstLine(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

/**
 * @param {Node} node
 * @param {number} offset
 * @param {Node} cellNode
 * @returns {boolean}
 */
function isFirstPosition(node, offset, cellNode) {
  return offset == 0
      && (node == cellNode
          || node == cellNode.firstChild);
}

/**
 * @param {Selection} selection
 * @param {Node} cellNode
 * @returns {boolean}
 */
function containsFirstPosition(selection, cellNode) {
  return isFirstPosition(selection.focusNode,
          selection.focusOffset, cellNode)
      || isFirstPosition(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

/**
 * @param {Node} node
 * @param {number} offset
 * @param {Node} cellNode
 * @returns {boolean}
 */
function isLastLine(node, offset, cellNode) {
  if (node == cellNode) {
    return offset
           >= childrenCountWithoutBr(cellNode);
  } else {
    return node == lastChildWithoutBr(cellNode);
  }
}

/**
 * @param {Selection} selection
 * @param {Node} cellNode
 * @returns {boolean}
 */
function containsLastLine(selection, cellNode) {
  return isLastLine(selection.focusNode,
          selection.focusOffset, cellNode)
      || isLastLine(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

/**
 * @param {Node} node
 * @param {number} offset
 * @param {Node} cellNode
 * @returns {boolean}
 */
function isLastPosition(node, offset, cellNode) {
  if (node == cellNode) {
    return offset
           >= childrenCountWithoutBr(cellNode);
  } else {
    return node == lastChildWithoutBr(cellNode)
        && offset == node.textContent.length;
  }
}

/**
 * @param {Selection} selection
 * @param {Node} cellNode
 * @returns {boolean}
 */
function containsLastPosition(selection, cellNode) {
  return isLastPosition(selection.focusNode,
          selection.focusOffset, cellNode)
      || isLastPosition(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

/**
 * @param {KeyboardEvent} event
 * @param {Grid} grid
 * @param {FindDialog} findDialog
 * @param {FindPanel} findPanel
 * @param {ShadowRoot} shadow
 */
function gridKeyDown(event, grid, findDialog, findPanel, shadow) {
  const selection = /** @type {any} */(shadow).getSelection
      ? /** @type {any} */(shadow).getSelection() : document.getSelection();
  let cellNode = grid.isEditing ? getCellNode(selection.focusNode) : null;
  let x = grid.x;
  let y = grid.y;
  if (cellNode != null
      && cellNode.dataset != null
      && cellNode.dataset.x != null
      && cellNode.dataset.y != null) {
    x = Number(cellNode.dataset.x);
    y = Number(cellNode.dataset.y);
  }

  switch (event.key) {
    case ' ':
      if (event.ctrlKey) {
        grid.selectCol(grid.selLeft(), grid.selRight());
        event.preventDefault();
      } else if (event.shiftKey) {
        grid.selectRow(grid.selTop(), grid.selBottom());
        event.preventDefault();
      }
      return;
    case 'a':
      if (event.ctrlKey) {
        grid.selectAll()
        event.preventDefault();
      }
      return;
    case 'c':
      if (event.ctrlKey) {
        if (!grid.isEditing) {
          copy(grid, /* cut= */ false);
          event.preventDefault();
        }
      }
      return;
    case 'f':
      if (event.ctrlKey) {
        findPanel.show();
        event.preventDefault();
      }
      return;
    case 's':
      if (event.ctrlKey) {
        saveAs(grid.fileName || '無題.csv', grid);
        event.preventDefault();
      }
    case 'v':
      if (event.ctrlKey) {
        if (!grid.isEditing) {
          paste(grid, -1);
          event.preventDefault();
        }
      }
      return;
    case 'x':
      if (event.ctrlKey) {
        if (!grid.isEditing) {
          copy(grid, /* cut= */ true);
          event.preventDefault();
        }
      }
      return;
    case 'y':
      if (event.ctrlKey) {
        grid.redo();
        event.preventDefault();
      }
      return;
    case 'z':
      if (event.ctrlKey) {
        grid.undo();
        event.preventDefault();
      }
      return;
    case 'ArrowDown':
      if (cellNode == null || containsLastLine(selection, cellNode)) {
        if (event.shiftKey) {
          grid.select(grid.anchorX, grid.anchorY, x, y + 1);
        } else {
          grid.moveTo(x, y + 1);
        }
        event.preventDefault();
      }
      return;
    case 'ArrowLeft':
      if (x > 1 && (cellNode == null
                    || containsFirstPosition(selection, cellNode))) {
        if (event.shiftKey) {
          grid.select(grid.anchorX, grid.anchorY, x - 1, y);
        } else {
          grid.moveTo(x - 1, y);
        }
        event.preventDefault();
      }
      return;
    case 'ArrowRight':
      if (cellNode == null || containsLastPosition(selection, cellNode)) {
        if (event.shiftKey) {
          grid.select(grid.anchorX, grid.anchorY, x + 1, y);
        } else {
          grid.moveTo(x + 1, y);
        }
        event.preventDefault();
      }
      return;
    case 'ArrowUp':
      if (y > 1 && (cellNode == null
                    || containsFirstLine(selection, cellNode))) {
        if (event.shiftKey) {
          grid.select(grid.anchorX, grid.anchorY, x, y - 1);
        } else {
          grid.moveTo(x, y - 1);
        }
        event.preventDefault();
      }
      return;
    case 'Backspace':
      if (event.ctrlKey) {
        grid.connectCells(grid.selection());
        event.preventDefault();
      }
      return;
    case 'Delete':
      if (event.ctrlKey) {
        const isEditing = grid.isEditing;
        if (isEditing) {
          blurActiveElement();
        }
        if (event.shiftKey) {
          grid.deleteCellUp(selection);
        } else {
          grid.deleteCellLeft(selection);
        }
        grid.render();
        if (isEditing) {
          grid.moveTo(grid.selLeft(), grid.selTop());
        }
        event.preventDefault();
      } else if (!grid.isEditing) {
        grid.clearCells(grid.selection());
        grid.render();
        event.preventDefault();
      }
      return;
    case 'Enter':
      if (event.ctrlKey) {
        if (grid.isEditing) {
          const p1 =
              getInCellOffset(selection.anchorNode, selection.anchorOffset);
          const p2 =
              getInCellOffset(selection.focusNode, selection.focusOffset);
          grid.insertRowAtCursor(p1, p2);
        } else {
          grid.insertRowAtCursor(0, 0);
        }
      } else if (event.shiftKey) {
        grid.insertRow(grid.selTop(), grid.selBottom(), true);
      } else if (event.altKey) {
        if (cellNode == null) {
          return;
        }
        selection.deleteFromDocument();
        const focusNode = selection.focusNode;
        if (focusNode == cellNode) {
          const focusOffset = selection.focusOffset;
          cellNode.insertBefore(
              createElement('br'), cellNode.childNodes[focusOffset]);
          selection.setBaseAndExtent(
              cellNode, focusOffset + 1, cellNode, focusOffset + 1);
        } else {
          cellNode.insertBefore(
              document.createTextNode(
                  focusNode.textContent.substring(0, selection.focusOffset)),
              focusNode);
          cellNode.insertBefore(createElement('br'), focusNode);
          focusNode.textContent =
              focusNode.textContent.substring(selection.focusOffset);
          if (focusNode.textContent == '' && focusNode.nextSibling == null) {
            cellNode.appendChild(createElement('br'));
          }
        }
        grid.setCell(x, y, parseCellInput(cellNode));
      } else if (cellNode != null
                 && containsFirstPosition(selection, cellNode)
                 && containsLastPosition(selection, cellNode)) {
        selection.collapseToEnd();
      } else {
        grid.moveTo(x, y);
      }
      event.preventDefault();
      return;
    case 'F2':
      if (cellNode != null) {
        const offset = childrenCountWithoutBr(cellNode);
        setTimeout(() => selection.setBaseAndExtent(cellNode, offset, cellNode, offset));
        event.preventDefault();
      }
      return;
    case 'F3':
      if (event.shiftKey) {
        findDialog.findNext(-1);
      } else {
        findDialog.findNext(1);
      }
      event.preventDefault();
      return;
    case 'Insert':
      if (event.ctrlKey) {
        const isEditing = grid.isEditing;
        if (isEditing) {
          blurActiveElement();
        }
        if (event.shiftKey) {
          grid.insertCellDown(selection);
        } else {
          grid.insertCellRight(selection);
        }
        grid.render();
        if (isEditing) {
          grid.moveTo(grid.selLeft(), grid.selTop());
        }
        event.preventDefault();
      }
      return;
  }
}

/**
 * @param {MouseEvent} event
 * @param {Grid} grid
 */
function gridMouseDown(event, grid) {
  const target = getEventTarget(event);
  if (target == null) {
    return;
  }
  const x = parseInt(target.dataset.x, 10);
  const y = parseInt(target.dataset.y, 10);
  grid.isMouseDown = true;
  grid.mouseDownX = x;
  grid.mouseDownY = y;
  gridMouseMove(event, grid);
}

/**
 * @param {MouseEvent} event
 * @param {Grid} grid
 */
function gridMouseMove(event, grid) {
  if (!grid.isMouseDown) {
    return;
  }
  const target = getEventTarget(event);
  if (target == null) {
    return;
  }
  const x = parseInt(target.dataset.x, 10);
  const y = parseInt(target.dataset.y, 10);
  const anchorX = event.shiftKey ? grid.anchorX : grid.mouseDownX;
  const anchorY = event.shiftKey ? grid.anchorY : grid.mouseDownY;
  if (x != grid.x || y != grid.y) {
    if (x == 0 && y == 0) {
      grid.selectAll();
      event.preventDefault();
    } else if (x == 0) {
      grid.selectRow(anchorY, y);
      event.preventDefault();
    } else if (y == 0) {
      grid.selectCol(anchorX, x);
      event.preventDefault();
    } else {
      grid.select(anchorX, anchorY, x, y);
      event.preventDefault();
    }
  }
}

/**
 * @param {MouseEvent} event
 * @param {Grid} grid
 */
function gridMouseUp(event, grid) {
  gridMouseMove(event, grid);
  grid.isMouseDown = false;
}

/**
 * @param {Touch} touch
 * @param {HTMLTableElement} table
 * @returns {HTMLTableCellElement?}
 */
function touchedCell(touch, table) {
  let y = 0;
  for (const row of table.rows) {
    if (touch.clientY
        <= row.getBoundingClientRect().bottom) {
      for (const cell of row.cells) {
        if (touch.clientX
            <= cell.getBoundingClientRect().right) {
          return cell;
        }
      }
      return null;
    }
  }
  return null;
}

/**
 * @param {TouchEvent} event
 * @param {Grid} grid
 */
function gridTouchMove(event, grid) {
  const touch = event.changedTouches[0];
  const from = getEventTarget(touch);
  const to = touchedCell(touch, grid.element);
  if (from == null || to == null) {
    return;
  }
  const x1 = parseInt(from.dataset.x, 10);
  const y1 = parseInt(from.dataset.y, 10);
  const x2 = parseInt(to.dataset.x, 10);
  const y2 = parseInt(to.dataset.y, 10);
  if (x1 != x2 || y1 != y2) {
    blurActiveElement();
  }
  if ((x1 == 0 || x2 == 0)
      && (y1 == 0 || y2 == 0)) {
    grid.selectAll();
  } else if (x1 == 0 || x2 == 0) {
    grid.selectRow(y1, y2);
  } else if (y1 == 0 || y2 == 0) {
    grid.selectCol(x1, x2);
  } else {
    grid.select(x1, y1, x2, y2);
  }
}

const macroTerminated = {};

/**
 * @param {string} message
 * @param {string=} title
 * @param {string=} defaultValue
 * @returns {Promise<string>}
 */
function inputBoxMultiLine(message, title, defaultValue) {
  return new Promise((resolve, reject) => {
    const textarea = createElement('textarea', {
      cols: 40,
      rows: 10,
      value: defaultValue || ''
    });
    const inputBox = dialog([
      titleBar(title || 'Cassava Macro', () => {
        inputBox.close();
        document.body.removeChild(inputBox);
        reject(macroTerminated);
      }),
      div(message),
      div(textarea),
      div(button('OK', () => {
            inputBox.close();
            document.body.removeChild(inputBox);
            resolve(textarea.value);
          }),
          button('Cancel', () => {
            inputBox.close();
            document.body.removeChild(inputBox);
            reject(macroTerminated);
          }))
    ]);
    document.body.append(inputBox);
    inputBox.showModal();
  });
}

/**
 * @param {string} data
 * @param {GridData} gridData
 */
function parseCsv(data, gridData) {
  gridData.clear();
  let x = 1;
  let y = 1;
  let current = '';
  let quoted = false;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (quoted) {
      if (c == '"') {
        if (data[i + 1] == '"') {
          current += '"';
          i++;
        } else {
          quoted = false;
        }
      } else if (c == '\r') {
        current += '\n';
        if (data[i + 1] == '\n') {
          i++;
        }
      } else {
        current += c;
      }
    } else if (c == '"') {
      quoted = true;
    } else if (c == ',') {
      gridData.setCell(x, y, current);
      current = '';
      x++;
    } else if (c == '\r' || c == '\n') {
      gridData.setCell(x, y, current);
      current = '';
      x = 1;
      y++;
      if (c == '\r' && data[i + 1] == '\n') {
        i++;
      }
    } else {
      current += c;
    }
  }
  if (current != '') {
    gridData.setCell(x, y, current);
  }
}

/**
 * @param {GridData} gridData
 * @param {Range} range
 * @returns {string}
 */
function toCsv(gridData, range) {
  let result = '';
  for (let y = range.top; y <= range.bottom; y++) {
    for (let x = range.left; x <= range.right; x++) {
      if (x > range.left) {
        result += ',';
      }
      const cell = gridData.cell(x, y);
      if (cell == '' || isNumber(cell)) {
        result += cell;
      } else {
        result += '"' + cell.replaceAll('"', '""')
                  + '"';
      }
    }
    result += '\n';
  }
  return result;
}

class OpenDialog {
  #encoding = 'UTF-8';
  /** @type {HTMLInputElement} */
  #fileInput;
  /** @type {Grid} */
  #grid;

  /** @param {Grid} grid */
  constructor(grid) {
    this.#grid = grid;
    this.#fileInput = createElement('input', {
      style: 'display: none;',
      type: 'file'
    });
  }

  /**  @returns {Promise<void>?} */
  load() {
    const file = this.#fileInput.files[0];
    if (!file) {
      return;
    }
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.readAsText(file, this.#encoding);
      reader.addEventListener('load', () => {
        this.#grid.clear(file.name);
        parseCsv(/** @type {string} */(reader.result), this.#grid.gridData());
        this.#grid.render();
        resolve();
      });
    });
  }

  /** @param {string} encoding */
  async reload(encoding) {
    this.#encoding = encoding;
    await this.load();
  }

  /**  @returns {Promise<void>} */
  show() {
    return new Promise(resolve => {
      this.#fileInput.value = '';
      const listener = async () => {
        this.#fileInput.removeEventListener('change', listener);
        await this.load();
        resolve();
      };
      this.#fileInput.addEventListener('change', listener);
      this.#fileInput.click();
    });
  }
}

/**
 * @param {string} fileName
 * @param {Grid} grid
 */
function saveAs(fileName, grid) {
  grid.fileName = fileName;
  const gridData = grid.gridData();
  const blob = new Blob(
      [toCsv(gridData, gridData.range())],
      {type: "text/csv"});
  if (/** @type {any} */(navigator).msSaveOrOpenBlob) {
    /** @type {any} */(navigator).msSaveOrOpenBlob(blob, fileName);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = createElement("a", {
    download: fileName,
    href: url
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * @param {Grid} grid
 * @param {string} clipText
 * @param {GridData} clipData
 * @returns {Promise<void>}
 */
function showPasteDialog(grid, clipText, clipData) {
  return new Promise((resolve, reject) => {
    const selection = grid.selection();
    const textarea = createElement('textarea', {
      cols: 40,
      name: 'clip-text',
      rows: 10,
      value: clipText
    })
    /** @type {(c: any) => HTMLInputElement} */
    const radioInput = c => createElement('input', {
      checked: !!c,
      name: 'cassava-paste',
      type: 'radio'
    });
    const option0Input = radioInput();
    const option1Input = radioInput();
    const option2Input = radioInput(true);
    const option3Input = radioInput();
    const option4Input = radioInput();
    const option5Input = radioInput();
    const pasteDialog = dialog([
      titleBar('貼り付けオプション', () => {
        pasteDialog.close();
        document.body.removeChild(pasteDialog);
        resolve();
      }),
      div('選択サイズ： ' + (selection.right - selection.left + 1) +
          ' × ' + (selection.bottom - selection.top + 1)),
      div(createElement('details', {}, [
        createElement('summary', {}, ['クリップボードサイズ： ' + clipData.right() +
                      ' × ' + clipData.bottom()]),
        textarea
      ])),
      div(createElement('fieldset', {}, [
        createElement('legend', {}, ['貼り付け方法']),
        div(label(option0Input, '選択領域と重なった部分のみに貼り付け')),
        div(label(option1Input, '選択領域にくり返し処理をして貼り付け')),
        div(label(option2Input, 'データのサイズで上書き')),
        div(label(option3Input, '内容を右に移動させてデータを挿入')),
        div(label(option4Input, '内容を下に移動させてデータを挿入')),
        div(label(option5Input, 'テキストとして1セル内に貼り付け')),
      ])),
      div(button('OK', async () => {
        const text = textarea.value;
        const data = new GridData();
        parseCsv(text, data);
        const option = option1Input.checked ? 1
                     : option2Input.checked ? 2
                     : option3Input.checked ? 3
                     : option4Input.checked ? 4
                     : option5Input.checked ? 5
                     : 0;
        grid.paste(text, data, grid.selection(), option);
        pasteDialog.close();
        document.body.removeChild(pasteDialog);
        resolve();
      }))
    ]);
    document.body.append(pasteDialog);
    pasteDialog.showModal();
  });
}

/**
 * @param {Grid} grid
 * @param {boolean} cut
 */
async function copy(grid, cut) {
  const range = grid.selection();
  await clipboard.writeText(toCsv(grid.gridData(), range));
  if (cut) {
    grid.clearCells(range);
    grid.render();
  }
}

/**
 * @param {Grid} grid
 * @param {number} option
 */
async function paste(grid, option) {
  const clipText = await clipboard.readText();
  const clipData = new GridData();
  parseCsv(clipText, clipData);
  const selection = grid.selection();
  if (option >= 0) {
    grid.paste(clipText, clipData, selection, option);
  } else if (selection.right - selection.left + 1 == clipData.right() &&
             selection.bottom - selection.top + 1 == clipData.bottom()) {
    grid.paste(clipText, clipData, selection, 2);
  } else {
    await showPasteDialog(grid, clipText, clipData);
  }
  grid.render();
}

const styleContent = `
:host {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

div {
  flex: none;
}

table {
  border-collapse: collapse;
  display: inline-block;
  flex: 1;
  max-width: 100%;
  overflow: auto;
  white-space: nowrap;
}

td, th {
  border: 1px solid #ddd;
  min-width: 32px;
}

.fixed-both {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 1;
}

.fixed-col {
  position: sticky;
  left: 0;
}

.fixed-row {
  position: sticky;
  top: 0;
}
`;

/**
 * @typedef {number|string|MacroFunction|RegExp} ValueType
 * @typedef {((a: ValueType?, b: ValueType?, c: ValueType?, d: ValueType?, e: ValueType?, f: ValueType?, g: ValueType?, h: ValueType?, i: ValueType?) => ValueType|Promise<ValueType>|void|Promise<void>)} MacroFunction
 */

class CassavaGridElement extends HTMLElement {
  /** @type {FindDialog} */
  #findDialog;
  /** @type {FindPanel} */
  #findPanel;
  /** @type {Grid} */
  #grid;
  /** @type {Map<string, string>} */
  #macroMap;
  /** @type {OpenDialog} */
  #openDialog;
  /** @type {CassavaStatusBarElement} */
  #statusBarPanel;

/** @type {Map<string, MacroFunction>} */
#api = new Map(Object.entries({
    'Bottom=/0': () => this.#grid.bottom(),
    'Bottom=/1': a => this.#grid.setBottom(Number(a)),
    'Col=/0': () => this.#grid.x,
    'Col=/1': a => this.#grid.moveTo(Number(a), this.#grid.y),
    'ConnectCell/0': () => this.#grid.connectCells(this.#grid.selection()),
    'Copy/0': () => copy(this.#grid, /* cut= */ false),
    'CopyAvr/0': () => clipboard.writeText(
        this.#grid.sumAndAvr(this.#grid.selection()).avr.toString()),
    'CopySum/0': () => clipboard.writeText(
        this.#grid.sumAndAvr(this.#grid.selection()).sum.toString()),
    'Cut/0': () => copy(this.#grid, /* cut= */ true),
    'CutCol/0': () =>
        this.#grid.deleteCol(this.#grid.selLeft(), this.#grid.selRight()),
    'CutRow/0': () =>
        this.#grid.deleteRow(this.#grid.selTop(), this.#grid.selBottom()),
    'DeleteCellLeft/0': () =>
        this.#grid.deleteCellLeft(this.#grid.selection()),
    'DeleteCellUp/0': () => this.#grid.deleteCellUp(this.#grid.selection()),
    'DeleteCol/1': a => this.#grid.deleteCol(Number(a), Number(a)),
    'DeleteRow/1': a => this.#grid.deleteRow(Number(a), Number(a)),
    'Enter/0': () => this.#grid.insertRowAtCursor(0, 0),
    'Find/0': () => this.#findDialog.show(),
    'FindBack/0': () => this.#findDialog.findNext(-1),
    'FindNext/0': () => this.#findDialog.findNext(1),
    'GetActiveDataType/0': () => 'CSV',
    'GetCharCode/0': () => 'UTF-8',
    'GetColWidth/0': () => this.#grid.defaultColWidth,
    'GetColWidth/1':
        a => this.#grid.colWidths.get(Number(a)) ?? this.#grid.defaultColWidth,
    'GetDataTypes/0': () => 'CSV',
    'GetFilePath/0': () => '',
    'GetFileName/0': () => this.#grid.fileName,
    'GetRowHeight/0': () => this.#grid.defaultRowHeight,
    'GetRowHeight/1': a => this.#grid.getRowHeight(Number(a)),
    'InputBox/1': a => prompt(a.toString()),
    'InputBox/2': (a, b) => prompt(a.toString(), b.toString()),
    'InputBoxMultiLine/1': a => inputBoxMultiLine(a.toString()),
    'InputBoxMultiLine/2': (a, b) =>
        inputBoxMultiLine(a.toString(), /* title= */null, b.toString()),
    'InputBoxMultiLine/3': (a, b, c) =>
        inputBoxMultiLine(a.toString(), b.toString(), c.toString()),
    'InsCol/0': () => this.#grid.insertCol(
        this.#grid.selLeft(), this.#grid.selRight(), true),
    'InsRow/0': () => this.#grid.insertRow(
        this.#grid.selTop(), this.#grid.selBottom(), true),
    'InsertCellDown/0':
        () => this.#grid.insertCellDown(this.#grid.selection()),
    'InsertCellRight/0':
        () => this.#grid.insertCellRight(this.#grid.selection()),
    'InsertCol/1': a => this.#grid.insertCol(Number(a), Number(a), false),
    'InsertCol/2': (a, b) => this.#grid.insertCol(Number(a), Number(b), false),
    'InsertRow/1': a => this.#grid.insertRow(Number(a), Number(a), false),
    'InsertRow/2': (a, b) => this.#grid.insertRow(Number(a), Number(b), false),
    'MacroTerminate/0': () => {
      throw macroTerminated;
    },
    'MessageBox/1': a => alert(a),
    'New/0': () => this.#grid.clear(),
    'NewLine/0': () => this.#grid.setCell(this.#grid.x, this.#grid.y, '\n'),
    'Open/0': () => this.#openDialog.show(),
    'Open/1': () => this.#openDialog.show(),
    'Paste/0': () => paste(this.#grid, -1),
    'Paste/1': a => paste(this.#grid, Number(a)),
    'QuickFind/0': () => this.#findPanel.show(),
    'Redo/0': () => this.#grid.redo(),
    'Refresh/0': () => this.#grid.refresh(),
    'ReloadCodeShiftJIS/0': () => this.#openDialog.reload('Shift_JIS'),
    'ReloadCodeUTF8/0': () => this.#openDialog.reload('UTF-8'),
    'ReplaceAll/2': (a, b) => this.#grid.replaceAll(
        a.toString(), b.toString(), false, false, false, this.#grid.allCells()),
    'ReplaceAll/5': (a, b, c, d, e) => this.#grid.replaceAll(
        a.toString(), b.toString(), !!c, !!d, !!e, this.#grid.allCells()),
    'ReplaceAll/9': (a, b, c, d, e, f, g, h, i) => this.#grid.replaceAll(
        a.toString(), b.toString(), !!c, !!d, !!e,
        new Range(Number(f), Number(g), Number(h), Number(i))),
    'Right=/0': () => this.#grid.right(),
    'Right=/1': a => this.#grid.setRight(Number(a)),
    'Row=/0': () => this.#grid.y,
    'Row=/1': a => this.#grid.moveTo(this.#grid.x, Number(a)),
    'Save/0': () => saveAs(this.#grid.fileName || '無題.csv', this.#grid),
    'SaveAs/0': () => {
      const fileName = prompt("ファイル名を入力してください。");
      if (fileName) {
        saveAs(fileName, this.#grid);
      }
    },
    'SaveAs/1': a => saveAs(a.toString(), this.#grid),
    'SelBottom=/0': () => this.#grid.selBottom(),
    'SelBottom=/1': a => this.#grid.select(
        this.#grid.selLeft(), Math.min(Number(a), this.#grid.selTop()),
        this.#grid.selRight(), Number(a)),
    'SelLeft=/0': () => this.#grid.selLeft(),
    'SelLeft=/1': a => this.#grid.select(Number(a), this.#grid.selTop(),
        Math.max(Number(a), this.#grid.selRight()), this.#grid.selBottom()),
    'SelRight=/0': () => this.#grid.selRight(),
    'SelRight=/1': a => this.#grid.select(
        Math.min(Number(a), this.#grid.selLeft()), this.#grid.selTop(),
        Number(a), this.#grid.selBottom()),
    'SelTop=/0': () => this.#grid.selTop(),
    'SelTop=/1': a => this.#grid.select(this.#grid.selLeft(), Number(a),
        this.#grid.selRight(), Math.max(Number(a), this.#grid.selBottom())),
    'Select/4': (a, b, c, d) =>
        this.#grid.select(Number(a), Number(b), Number(c), Number(d)),
    'SelectAll/0': () => this.#grid.selectAll(),
    'SelectCol/0': () =>
        this.#grid.selectCol(this.#grid.selLeft(), this.#grid.selRight()),
    'SelectRow/0': () =>
        this.#grid.selectRow(this.#grid.selTop(), this.#grid.selBottom()),
    'SequenceC/0': () => this.#grid.sequenceC(this.#grid.selection()),
    'SequenceS/0': () => this.#grid.sequenceS(this.#grid.selection()),
    'SetActiveDataType/1': dataType => {
      if (dataType != 'CSV') {
        throw 'Unsupported data type: ' + dataType;
      }
    },
    'SetCharCode/1': charCode => {
      if (charCode != 'UTF-8') {
        throw 'Unsupported encoding: ' + charCode;
      }
    },
    'SetColWidth/1': a => {
      this.#grid.colWidths.clear();
      this.#grid.defaultColWidth = Number(a);
    },
    'SetColWidth/2': (a, b) => {
      this.#grid.colWidths.set(Number(a), Number(b));
    },
    'SetRowHeight/1': a => {
      this.#grid.rowHeights.clear();
      this.#grid.defaultRowHeight = Number(a);
    },
    'SetRowHeight/2': (a, b) => this.#grid.setRowHeight(Number(a), Number(b)),
    'SetStatusBarCount/1': a => this.#statusBarPanel.setCount(Number(a)),
    'SetStatusBarPopUp/3': (a, b, c) => this.#statusBarPanel.setPopUp(
        Number(a), b.toString(), /** @type {(item: string) => any} */(c)),
    'SetStatusBarText/2':
        (a, b) => this.#statusBarPanel.setText(Number(a), b.toString()),
    'SetStatusBarWidth/2':
        (a, b) => this.#statusBarPanel.setWidth(Number(a), Number(b)),
    'Sort/9': (a, b, c, d, e, f, g, h, i) => this.#grid.sort(
        new Range(Number(a), Number(b), Number(c), Number(d)),
        Number(e), !!f, !!g, !!h, !!i),
    'TransChar0/0': () => this.#grid.updateSelectedCells(toHankakuAlphabet),
    'TransChar1/0': () => this.#grid.updateSelectedCells(toZenkakuAlphabet),
    'TransChar2/0':
        () => this.#grid.updateSelectedCells(value => value.toUpperCase()),
    'TransChar3/0':
        () => this.#grid.updateSelectedCells(value => value.toLowerCase()),
    'TransChar4/0': () => this.#grid.updateSelectedCells(toHankakuKana),
    'TransChar5/0': () => this.#grid.updateSelectedCells(toZenkakuKana),
    'Undo/0': () => this.#grid.undo(),
    'avr/4': (a, b, c, d) => this.#grid.sumAndAvr(
        new Range(Number(a), Number(b), Number(c), Number(d))).avr,
    'cell/2': (a, b) => {
      const value = this.#grid.cell(Number(a), Number(b));
      if ((Number(value)).toString() == value) {
        return Number(value);
      }
      return value;
    },
    'cell=/3': (a, b, c) => this.#grid.setCell(Number(a), Number(b), c),
    'move/2': (a, b) =>
        this.#grid.moveTo(this.#grid.x + Number(a), this.#grid.y + Number(b)),
    'moveto/2': (a, b) => this.#grid.moveTo(Number(a), Number(b)),
    'sum/4': (a, b, c, d) => this.#grid.sumAndAvr(
        new Range(Number(a), Number(b), Number(c), Number(d))).sum,
    'write/1': a => {
      this.#grid.setCell(this.#grid.x, this.#grid.y, a);
      this.#grid.moveTo(this.#grid.x + 1, this.#grid.y);
    },
    'writeln/1': a => {
      this.#grid.setCell(this.#grid.x, this.#grid.y, a);
      this.#grid.moveTo(1, this.#grid.y + 1);
    }
  }));

  constructor() {
    super();

    this.#grid = new Grid(new GridData(),
        /* onRender= */ () => this.runNamedMacro('!statusbar.cms'));
    this.#findDialog = new FindDialog(this.#grid);
    this.#findPanel = new FindPanel(this.#grid, this.#findDialog);
    this.#macroMap = new Map();
    this.#openDialog = new OpenDialog(this.#grid);
    this.#statusBarPanel = /** @type {CassavaStatusBarElement} */(
        createElement('cassava-status-bar', {style: 'display: none;'}));

    const table = this.#grid.element;
    const shadow = this.attachShadow({mode: 'open'});
    shadow.innerHTML = '';
    shadow.append(
        createElement('style', {textContent: styleContent}),
        table,
        this.#findPanel.element,
        this.#findDialog.element,
        this.#statusBarPanel);

    table.addEventListener('focusin', event => gridFocusIn(event, this.#grid));
    table.addEventListener('focusout',
        event => gridFocusOut(event, this.#grid));
    table.addEventListener('input', event => gridInput(event, this.#grid));
    table.addEventListener('keydown', event => gridKeyDown(event, this.#grid,
        this.#findDialog, this.#findPanel, shadow));
    table.addEventListener('mousedown',
        event => gridMouseDown(event, this.#grid));
    table.addEventListener('mousemove',
        event => gridMouseMove(event, this.#grid));
    table.addEventListener('mouseup', event => gridMouseUp(event, this.#grid));
    table.addEventListener('scroll', () => this.#grid.render());
    table.addEventListener('touchend',
        event => gridTouchMove(event, this.#grid));
    table.addEventListener('touchmove',
        event => gridTouchMove(event, this.#grid), {passive: true});
    this.#grid.render();
  }

  /**
   * @param {string} macroName
   * @param {string} macroText
   */
  async addMacro(macroName, macroText) {
    if (macroText == '') {
      this.#macroMap.delete(macroName);
      if (macroName == '!statusbar.cms') {
        this.#statusBarPanel.style.display = 'none';
      }
    } else {
      this.#macroMap.set(macroName, macroText);
      if (macroName == '!statusbar.cms') {
        this.#statusBarPanel.style.display = '';
        try {
          await this.runMacro('import{init}from"!statusbar.cms";init();',
              /* ignoreErrors= */ true);
        } catch {}
        await this.#grid.render();
      }
    }
  }

  /**
   * @param {string} macroName
   * @returns {string}
   */
  getMacro(macroName) {
    return this.#macroMap.get(macroName);
  }

  /** @returns IterableIterator<string> */
  getMacroNames() {
    return this.#macroMap.keys();
  }

  /** @param {string} macroName */
  runNamedMacro(macroName) {
    return this.runMacro(this.#macroMap.get(macroName));
  }

  /**
   * @param {string} macro
   * @param {boolean=} ignoreErrors
   */
  async runMacro(macro, ignoreErrors) {
    if (!macro) {
      return;
    }
    this.#grid.beginMacro();
    try {
      const env = new Environment(/* parent= */ null, this.#api);
      await run(macro, env, this.#macroMap);
    } catch(e) {
      if (e != macroTerminated && !ignoreErrors) {
        alert(e);
        throw e;
      }
    } finally {
      this.#grid.endMacro();
    }
    await this.#grid.render();
  }
}

customElements.define('cassava-grid', CassavaGridElement);

net.asukaze.export({ CassavaGridElement });
})();
