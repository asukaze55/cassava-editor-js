// #ifdef MODULE
// import { Environment, run } from './cassava_macro.js';
// import { GridData, Range, isNumber } from './cassava_grid_data.js';
// import { UndoGrid } from './cassava_undo_grid.js';
// import { button, createElement, dialog, div, label } from './cassava_dom.js'
// import { createFinder, toHankakuAlphabet, toHankakuKana, toZenkakuAlphabet, toZenkakuKana } from './cassava_replacer.js';
// #else
(() => {
const Environment = net.asukaze.cassava.macro.Environment;
const GridData = net.asukaze.cassava.GridData;
const Range = net.asukaze.cassava.Range;
const UndoGrid = net.asukaze.cassava.UndoGrid;
const button = net.asukaze.cassava.dom.button;
const createElement = net.asukaze.cassava.dom.createElement;
const createFinder = net.asukaze.cassava.createFinder;
const dialog = net.asukaze.cassava.dom.dialog;
const div = net.asukaze.cassava.dom.div;
const isNumber = net.asukaze.cassava.isNumber;
const label = net.asukaze.cassava.dom.label;
const run = net.asukaze.cassava.macro.run;
const toHankakuAlphabet = net.asukaze.cassava.toHankakuAlphabet;
const toHankakuKana = net.asukaze.cassava.toHankakuKana;
const toZenkakuAlphabet = net.asukaze.cassava.toZenkakuAlphabet;
const toZenkakuKana = net.asukaze.cassava.toZenkakuKana;
// #endif

let clipText = '';

function blurActiveElement() {
  /** @type {HTMLElement} */(document.activeElement).blur();
}

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
  /** @param {Grid} grid */
  constructor(grid) {
    const findTextInput = createElement('input');
    const replaceInput = createElement('input');
    const respectCaseInput =
        createElement('input', {checked: true, type: 'checkbox'});
    const wholeCellInput = createElement('input', {type: 'checkbox'});
    const isRegexInput = createElement('input', {type: 'checkbox'});
    const isUpwardInput = createElement('input', {
      name: 'cassava-find-direction',
      type: 'radio'
    });
    const isDownwardInput = createElement('input', {
      checked: true,
      name: 'cassava-find-direction',
      type: 'radio'
    });
    const buttonAttributes = {style: 'margin-bottom: 4px; width: 100%;'};
    this.element = dialog([
      createElement('div', {style: 'display: flex; margin-bottom: 8px'}, [
        createElement('span', {style: 'flex-grow: 1'}, ['検索・置換']),
        createElement('span', {
          onclick: () => this.element.close(),
          style: 'cursor: pointer; text-align: end;'
        }, ['×'])
      ]),
      createElement('div', {style: 'display: flex;'}, [
        div(div(createElement('fieldset', {}, [
              div(label('検索する文字列：', findTextInput)),
              div(label('置換後の文字列：', replaceInput)),
              div(label(respectCaseInput, '大文字と小文字を区別')),
              div(label(wholeCellInput, 'セル内容が完全に同一であるものを検索')),
              div(label(isRegexInput, '正規表現検索')),
            ])),
            div(createElement('fieldset', {}, [
              createElement('legend', {}, ['検索方向']),
              label(isUpwardInput, '左・上へ'),
              label(isDownwardInput, '右・下へ')
            ]))),
        createElement('div', {style: 'margin-left: 16px;'}, [
          div(button('先頭から検索', () => {
            if (isUpwardInput.checked) {
              grid.moveTo(grid.right(), grid.bottom());
            } else {
              grid.moveTo(1, 1);
            }
            grid.findNext(isUpwardInput.checked ? -1 : 1);
            grid.render();
          }, buttonAttributes)),
          div(button('次を検索', () => {
            grid.findNext(isUpwardInput.checked ? -1 : 1);
            grid.render();
          }, buttonAttributes)),
          div(button('置換して次に', () => {
            grid.replaceAll(
                findTextInput.value,
                replaceInput.value,
                !(respectCaseInput.checked),
                wholeCellInput.checked,
                isRegexInput.checked,
                new Range(grid.x, grid.y, grid.x, grid.y));
            grid.findNext(isUpwardInput.checked ? -1 : 1);
            grid.render();
          }, buttonAttributes)),
          div(button('すべて置換', () => {
            grid.replaceAll(
                findTextInput.value,
                replaceInput.value,
                !(respectCaseInput.checked),
                wholeCellInput.checked,
                isRegexInput.checked,
                grid.range());
            grid.render();
          }, buttonAttributes)),
          div(button('キャンセル', () => this.element.close(), buttonAttributes))
        ])
      ])
    ]);

    this.findText = () => findTextInput.value;
    this.setFindText = value => {
      findTextInput.value = value;
    };
    this.ignoreCase = () => !(respectCaseInput.checked);
    this.wholeCell = () => wholeCellInput.checked;
    this.isRegex = () => isRegexInput.checked;
  }

  show() {
    this.element.show();
    this.element.style.top = (window.innerHeight
        - this.element.getBoundingClientRect().height) / 2
        + window.scrollY + 'px';
  }
}

class FindPanel {
  /** @param {Grid} grid */
  constructor(grid) {
    const updateFindText = () => {
      grid.findDialog.setFindText(findTextInput.value);
    }
    const findTextInput = createElement('input', {onchange: updateFindText});
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
      findTextInput,
      button('⇩ 次', () => {
        updateFindText();
        grid.findNext(1);
      }, buttonAttributes),
      button('⇧ 前', () => {
        updateFindText();
        grid.findNext(-1);
      }, buttonAttributes),
      button('オプション', () => grid.findDialog.show(), buttonAttributes)
    ]);

    this.show = () => {
      findTextInput.value = grid.findDialog.findText();
      this.element.style.display = '';
      findTextInput.focus();
    }
  }
}

class Grid {
  constructor(element, gridData) {
    this.element = element;
    this.undoGrid = new UndoGrid(gridData);
    this.macroMap = new Map();
    this.findDialog = new FindDialog(this);
    this.findPanel = new FindPanel(this);
    this.suppressRender = 0;
    this.clear();
  }

  addMacro(macroName, macroText) {
    if (macroText == '') {
      this.macroMap.delete(macroName);
    } else {
      this.macroMap.set(macroName, macroText);
    }
  }

  beginMacro() {
    this.undoGrid.push();
    this.suppressRender++;
  }

  bottom() {
    return this.undoGrid.bottom();
  }

  cell(x, y) {
    return this.undoGrid.cell(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {HTMLTableCellElement}
   */
  cellNode(x, y) {
    const i = (y == 0) ? 0 : y - this.renderedTop + 1;
    return this.table().rows[i].cells[x];
  }

  clear() {
    this.undoGrid.clear();
    this.isEditing = false;
    this.isMouseDown = false;
    this.mouseDownX = 1;
    this.mouseDownY = 1;
    this.defaultColWidth = 48;
    this.colWidths = new Map();
    this.defaultRowHeight = 32;
    this.rowHeights = new Map();
    this.anchorX = 1;
    this.anchorY = 1;
    this.x = 1;
    this.y = 1;
    this.renderedTop = 1;
    this.renderedBottom = 0;
  }

  clearCells(range) {
    this.undoGrid.clearCells(range);
  }

  connectCells(range) {
    blurActiveElement();
    const l = range.left;
    const t = range.top;
    const r = range.right;
    const b = range.bottom;
    if (r > l || b > t) {
      this.undoGrid.push();
      let result = '';
      for (let y = t; y <= b; y++) {
        for (let x = l; x <= r; x++) {
          result += this.undoGrid.cell(x, y);
          this.undoGrid.setCell(x, y, '');
        }
      }
      this.undoGrid.setCell(l, t, result);
      this.undoGrid.pop(range, range);
      this.select(l, t, r, b);
    } else if (l > 1) {
      this.undoGrid.push();
      this.undoGrid.setCell(l - 1, t, this.undoGrid.cell(l - 1, t) + this.undoGrid.cell(l, t));
      this.undoGrid.deleteCellLeft(new Range(l, t, l, t));
      this.undoGrid.pop(range, new Range(l - 1, t, l - 1, t));
      this.moveTo(l - 1, t);
    } else if (t > 1) {
      this.undoGrid.push();
      const right = this.undoGrid.right();
      let ux = right;
      while(ux > 0 && this.undoGrid.cell(ux, t - 1) == '') {
        ux--;
      }
      for (let x = 1; x <= right; x++) {
        this.undoGrid.setCell(x + ux, t - 1, this.undoGrid.cell(x, t));
      }
      this.undoGrid.deleteRow(t, t);
      this.undoGrid.pop(range, new Range(ux + 1, t - 1, ux + 1, t - 1));
      this.moveTo(ux + 1, t - 1);
    } else {
      this.moveTo(l, t);
    }
  }

  deleteCellUp(range) {
    this.undoGrid.deleteCellUp(range);
  }

  deleteCellLeft(range) {
    this.undoGrid.deleteCellLeft(range);
  }

  deleteCol(l, r) {
    this.undoGrid.deleteCol(l, r);
  }

  deleteRow(t, b) {
    this.undoGrid.deleteRow(t, b);
  }

  endMacro() {
    const range = this.selection();
    this.undoGrid.pop(range, range);
    this.suppressRender--;
  }

  /** @param {number} step */
  findNext(step) {
    const finder = createFinder(
        this.findDialog.findText(),
        this.findDialog.ignoreCase(),
        this.findDialog.wholeCell(),
        this.findDialog.isRegex());
    let x = this.x + step;
    let y = this.y;
    const right = this.right();
    const bottom = this.bottom();
    while (y >= 1 && y <= bottom) {
      while (x >= 1 && x <= right) {
        if (finder(this.cell(x, y))) {
          this.moveTo(x, y);
          return;
        }
        x += step;
      }
      y += step;
      x = step > 0 ? 1 : right;
    }
  }

  getRowHeight(y) {
    const rowHeight = this.rowHeights.get(y - 0);
    return rowHeight != null ? rowHeight : this.defaultRowHeight;
  }

  gridData() {
    return this.undoGrid.gridData;
  }

  insertCellDown(range) {
    this.undoGrid.insertCellDown(range);
  }

  insertCellRight(range) {
    this.undoGrid.insertCellRight(range);
  }

  insertCol(l, r, move) {
    this.undoGrid.insertCol(l, r);
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

  insertRow(t, b, move) {
    this.undoGrid.insertRow(t, b);
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

  insertRowAtCursor(selAnchor, selFocus) {
    const isEditing = this.isEditing;
    const t = this.selTop();
    const l = this.selLeft();
    blurActiveElement();
    this.undoGrid.push();
    const cellText = this.undoGrid.cell(l, t);
    const selStart = Math.min(selAnchor, selFocus);
    this.undoGrid.insertRow(t + 1, t + 1);
    this.undoGrid.setCell(1, t + 1, cellText.substring(selStart));
    this.undoGrid.setCell(l, t, cellText.substring(0, selStart))
    for (let x = l + 1; x <= this.undoGrid.right(); x++) {
      this.undoGrid.setCell(x - l + 1, t + 1, this.undoGrid.cell(x, t));
      this.undoGrid.setCell(x, t, '');
    }
    this.undoGrid.pop(this.selection(), new Range(1, t + 1, this.selRight() - l + 1, t + 1));
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
  moveTo(x, y) {
    this.anchorX = x;
    this.anchorY = y;
    this.x = x;
    this.y = y;
    if (y < this.renderedTop || y > this.renderedBottom) {
      this.renderedTop = y;
      this.renderedBottom = 0;
      this.table().innerHTML = '';
    }
    if (this.suppressRender > 0) {
      return;
    }
    this.render();
    const cellNode = this.cellNode(x, y);
    cellNode.focus();
    setTimeout(() => window.getSelection()
        .setBaseAndExtent(cellNode, 0, cellNode,
            childrenCountWithoutBr(cellNode)));
  }

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
        this.undoGrid.pasteRepeat(clipData, targetRange);
        return;
      case 3:
        this.undoGrid.push();
        this.undoGrid.insertCellRight(targetRange);
        this.undoGrid.paste(clipData, targetRange);
        this.undoGrid.pop(targetRange, targetRange);
        return;
      case 4:
        this.undoGrid.push();
        this.undoGrid.insertCellDown(targetRange);
        this.undoGrid.paste(clipData, targetRange);
        this.undoGrid.pop(targetRange, targetRange);
        return;
      case 5:
        this.undoGrid.setCell(this.x, this.y, clipText);
        return;
      default:
        this.undoGrid.paste(clipData, targetRange);
        return;
    }
  }

  range() {
    return this.undoGrid.range();
  }

  redo() {
    blurActiveElement();
    const range = this.undoGrid.redo();
    this.render();
    this.select(range.left, range.top, range.right, range.bottom);
  }

  refresh() {
    this.rowHeights.clear();
  }

  render() {
    if (this.suppressRender > 0) {
      return;
    }
    const table = this.table();
    table.style.maxHeight = this.element.getAttribute('max-height')
        || (window.innerHeight - 16
            - this.findPanel.element.getBoundingClientRect().height
            - table.getBoundingClientRect().top) + 'px';
    table.style.width = this.element.getAttribute('width');
    const bottom = Math.max(4, this.undoGrid.bottom() + 1, this.y, this.anchorY);
    while (table.rows.length > bottom - this.renderedTop + 2) {
      table.deleteRow(-1);
    }
    const headerRow = (table.rows.length > 0) ? table.rows[0] : table.insertRow();
    const right = Math.max(4, this.undoGrid.right() + 1, this.x, this.anchorX);
    this.renderRow(headerRow, 0, right);
    const tableTop = table.getBoundingClientRect().top;
    this.renderedBottom = bottom;
    for (let y = this.renderedTop; y <= bottom; y++) {
      const i = y - this.renderedTop + 1;
      const row = (i < table.rows.length) ? table.rows[i] : table.insertRow();
      if (row.getBoundingClientRect().top - tableTop > screen.height * 2) {
        this.renderedBottom = y - 1;
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
      const count = Math.min(10, this.renderedTop - 1);
      let prerenderedHeight = 0;
      for (let i = 1; i <= count; i++) {
        const row = table.insertRow(1);
        this.renderRow(row, this.renderedTop - i, right);
        prerenderedHeight += row.getBoundingClientRect().height;
      }
      this.renderedTop -= count;
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
          cell.className = 'cassava-fixed-both';
        } else if (y == 0) {
          cell.className = 'cassava-fixed-row';
        } else if (x == 0) {
          cell.className = 'cassava-fixed-col';
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
        html = (x <= this.undoGrid.right()) ? x.toString() : '&nbsp;';
      } else if (x == 0) {
        html = (y <= this.undoGrid.bottom()) ? y.toString() : '&nbsp;';
      } else if (!isEditing) {
        html = this.undoGrid.cell(x, y).split('\n')
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

  replaceAll(str1, str2, ignoreCase, wholeCell, regex, range) {
    this.undoGrid.replaceAll(str1, str2, ignoreCase, wholeCell, regex, range);
  }

  right() {
    return this.undoGrid.right();
  }

  selBottom() {
    return Math.max(this.anchorY, this.y);
  }

  selLeft() {
    return Math.min(this.anchorX, this.x);
  }

  selRight() {
    return Math.max(this.anchorX, this.x);
  }

  selTop() {
    return Math.min(this.anchorY, this.y);
  }

  select(x1, y1, x2, y2) {
    if (x1 == this.anchorX && x2 == this.anchorY && x2 == this.x && y2 == this.y) {
      return;
    }
    if (x1 == x2 && y1 == y2) {
      this.moveTo(x1, y1);
      return;
    }
    blurActiveElement();
    this.table().focus();
    this.isEditing = false;
    this.anchorX = x1;
    this.anchorY = y1;
    this.x = x2;
    this.y = y2;
    this.render();
  }

  selectAll() {
    this.select(1, 1, this.undoGrid.right(), this.undoGrid.bottom());
  }

  selectCol(l, r) {
    this.select(l, 1, r, this.undoGrid.bottom());
  }

  selectRow(t, b) {
    this.select(1, t, this.undoGrid.right(), b);
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

  selection() {
    return new Range(
        Math.min(this.anchorX, this.x),
        Math.min(this.anchorY, this.y),
        Math.max(this.anchorX, this.x),
        Math.max(this.anchorY, this.y));
  }

  setBottom(b) {
    this.undoGrid.setBottom(b);
  }

  setCell(x, y, value) {
    this.undoGrid.setCell(x, y, value);
    this.render();
  }

  setRight(r) {
    this.undoGrid.setRight(r);
  }

  setRowHeight(y, h) {
    this.rowHeights.set(y - 0, h - 0);
  }

  sequenceC(range) {
    this.undoGrid.sequenceC(range);
  }

  sequenceS(range) {
    this.undoGrid.sequenceS(range);
  }

  sort(range, p, dir, num, ignoreCase, zenhan) {
    this.undoGrid.sort(range, p, dir, num, ignoreCase, zenhan);
  }

  sumAndAvr(range) {
    return this.undoGrid.sumAndAvr(range);
  }

  /** @returns {HTMLTableElement} */
  table() {
    const existingElement = this.element.firstElementChild;
    if (existingElement && existingElement.tagName == 'TABLE') {
      return existingElement;
    }
    const table = createElement('table', {tabindex: '-1'});
    this.element.innerHTML = '';
    this.element.append(table, this.findPanel.element, this.findDialog.element);
    table.addEventListener('scroll', () => this.render());
    return table;
  }

  undo() {
    blurActiveElement();
    const range = this.undoGrid.undo();
    this.render();
    this.select(range.left, range.top, range.right, range.bottom);
  }

  updateSelectedCells(callback) {
    const range = this.selection();
    this.undoGrid.push();
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = range.left; x <= range.right; x++) {
        this.undoGrid.setCell(x, y, callback(this.undoGrid.cell(x, y)));
      }
    }
    this.undoGrid.pop(range, range);
  }
}

function getCellNode(node) {
  while (node != null && node.tagName != 'TD' && node.tagName != 'TH') {
    node = node.parentElement;
  }
  return node;
}

function getEventTarget(event) {
  return getCellNode(event.target);
}

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

function gridInput(event, grid) {
  const target = getEventTarget(event);
  if (target == null) {
    return;
  }
  const x = parseInt(target.dataset.x, 10);
  const y = parseInt(target.dataset.y, 10);
  grid.setCell(x, y, parseCellInput(target));
}

function getTextContent(node) {
  if (node.tagName == 'BR') {
    return '\n';
  }
  return node.textContent;
}

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

function childrenCountWithoutBr(cellNode) {
  if (cellNode.childNodes.length == 0) {
    return 0;
  }
  return cellNode.lastChild.tagName == 'BR'
      ? cellNode.childNodes.length - 1
      : cellNode.childNodes.length;
}

function lastChildWithoutBr(cellNode) {
  if (cellNode.childNodes.length == 0) {
    return 0;
  }
  return cellNode.lastChild.tagName == 'BR'
      ? cellNode.lastChild.previousSibling
      : cellNode.lastChild;
}

function isFirstLine(node, offset, cellNode) {
  if (node == cellNode) {
    return offset == 0;
  } else {
    return node == cellNode.firstChild;
  }
}

function containsFirstLine(selection, cellNode) {
  return isFirstLine(selection.focusNode,
          selection.focusOffset, cellNode)
      || isFirstLine(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

function isFirstPosition(node, offset, cellNode) {
  return offset == 0
      && (node == cellNode
          || node == cellNode.firstChild);
}

function containsFirstPosition(selection, cellNode) {
  return isFirstPosition(selection.focusNode,
          selection.focusOffset, cellNode)
      || isFirstPosition(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

function isLastLine(node, offset, cellNode) {
  if (node == cellNode) {
    return offset
           >= childrenCountWithoutBr(cellNode);
  } else {
    return node == lastChildWithoutBr(cellNode);
  }
}

function containsLastLine(selection, cellNode) {
  return isLastLine(selection.focusNode,
          selection.focusOffset, cellNode)
      || isLastLine(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

function isLastPosition(node, offset, cellNode) {
  if (node == cellNode) {
    return offset
           >= childrenCountWithoutBr(cellNode);
  } else {
    return node == lastChildWithoutBr(cellNode)
        && offset == node.textContent.length;
  }
}

function containsLastPosition(selection, cellNode) {
  return isLastPosition(selection.focusNode,
          selection.focusOffset, cellNode)
      || isLastPosition(selection.anchorNode,
          selection.anchorOffset, cellNode);
}

/**
 * @param {KeyboardEvent} event
 * @param {Grid} grid
 */
function gridKeyDown(event, grid) {
  const selection = window.getSelection();
  let cellNode = grid.isEditing ? getCellNode(selection.focusNode) : null;
  let x = grid.x;
  let y = grid.y;
  if (cellNode != null
      && cellNode.dataset != null
      && cellNode.dataset.x != null
      && cellNode.dataset.y != null) {
    x = cellNode.dataset.x - 0;
    y = cellNode.dataset.y - 0;
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
    case 'f':
      if (event.ctrlKey) {
        grid.findPanel.show();
        event.preventDefault();
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
        grid.connectCells(selection);
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
      }
      return;
    case 'Enter':
      if (event.ctrlKey) {
        if (grid.isEditing) {
          const windowSelection = window.getSelection();
          const p1 = getInCellOffset(
              windowSelection.anchorNode, windowSelection.anchorOffset);
          const p2 = getInCellOffset(
              windowSelection.focusNode, windowSelection.focusOffset);
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
        grid.findNext(-1);
      } else {
        grid.findNext(1);
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

function gridMouseUp(event, grid) {
  gridMouseMove(event, grid);
  grid.isMouseDown = false;
}

function touchedCell(touch, element) {
  const table = element.firstElementChild;
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

/**
 * @param {string} message
 * @returns {Promise<string>}
 */
function inputBoxMultiLine(message) {
  return new Promise((resolve, reject) => {
    const textarea = createElement('textarea');
    const inputBox = dialog([
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
            reject('Cancelled.');
          }))
    ]);
    document.body.append(inputBox);
    inputBox.showModal();
  });
}

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

function open(file, encoding, grid) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.readAsText(file, encoding || 'UTF-8');
  reader.addEventListener('load', () => {
    grid.clear();
    parseCsv(reader.result, grid.gridData());
    grid.render();
  });
}

function saveAs(fileName, gridData) {
  const blob = new Blob(
      [toCsv(gridData, gridData.range())],
      {type: "text/csv"});
  if (/** @type {any} */(navigator).msSaveOrOpenBlob) {
    /** @type {any} */(navigator).msSaveOrOpenBlob(blob, fileName);
    return false;
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
  return false;
}

function toMacroParam(param) {
  if (typeof(param) == 'number') {
    return param;
  } else {
    return '"'
           + param.toString()
                  .replaceAll('"', '\\"')
                  .replaceAll('\n', '\\n')
           + '"';
  }
}

/**
 * @param {string} macro
 * @param {Grid} grid
 */
async function runMacro(macro, grid) {
  const env = new Environment();
  env.set('Bottom=/0', () => grid.bottom());
  env.set('Bottom=/1', a => grid.setBottom(a));
  env.set('Col=/0', () => grid.x);
  env.set('Col=/1', a => grid.moveTo(a, grid.y));
  env.set('ConnectCell/0', () => grid.connectCells(grid.selection()));
  env.set('Copy/0', () => clipText = toCsv(grid.gridData(), grid.selection()));
  env.set('CopyAvr/0', () => clipText = grid.sumAndAvr(grid.selection()).avr.toString());
  env.set('CopySum/0', () => clipText = grid.sumAndAvr(grid.selection()).sum.toString());
  env.set('Cut/0', () => {
    const range = grid.selection();
    clipText = toCsv(grid.gridData(), range);
    grid.clearCells(range);
  });
  env.set('CutCol/0', () => grid.deleteCol(grid.selLeft(), grid.selRight()));
  env.set('CutRow/0', () => grid.deleteRow(grid.selTop(), grid.selBottom()));
  env.set('DeleteCellLeft/0', () => grid.deleteCellLeft(grid.selection()));
  env.set('DeleteCellUp/0', () => grid.deleteCellUp(grid.selection()));
  env.set('DeleteCol/1', a => grid.deleteCol(a, a));
  env.set('DeleteRow/1', a => grid.deleteRow(a, a));
  env.set('Enter/0', () => grid.insertRowAtCursor(0, 0));
  env.set('Find/0', () => grid.findDialog.show());
  env.set('FindBack/0', () => grid.findNext(-1));
  env.set('FindNext/0', () => grid.findNext(1));
  env.set('GetColWidth/0', () => grid.defaultColWidth);
  env.set('GetColWidth/1', a => {
    const colWidth = grid.colWidths.get(a - 0);
    return colWidth != null
        ? colWidth : grid.defaultColWidth;
  });
  env.set('GetRowHeight/0', () => grid.defaultRowHeight);
  env.set('GetRowHeight/1', a => grid.getRowHeight(a));
  env.set('InputBox/1', a => prompt(a));
  env.set('InputBox/2', (a, b) => prompt(a, b));
  env.set('InputBoxMultiLine/1', a => inputBoxMultiLine(a));
  env.set('InsCol/0', () => grid.insertCol(grid.selLeft(), grid.selRight(), true));
  env.set('InsRow/0', () => grid.insertRow(grid.selTop(), grid.selBottom(), true));
  env.set('InsertCellDown/0', () => grid.insertCellDown(grid.selection()));
  env.set('InsertCellRight/0', () => grid.insertCellRight(grid.selection()));
  env.set('InsertCol/1', a => grid.insertCol(a, a, false));
  env.set('InsertCol/2', (a, b) => grid.insertCol(a, b, false));
  env.set('InsertRow/1', a => grid.insertRow(a, a, false));
  env.set('InsertRow/2', (a, b) => grid.insertRow(a, b, false));
  env.set('MessageBox/1', a => alert(a));
  env.set('New/0', () => grid.clear());
  env.set('NewLine/0', () => grid.setCell(grid.x, grid.y, '\n'));
  env.set('Paste/0', () => {
    const clipData = new GridData();
    parseCsv(clipText, clipData);
    grid.paste(clipText, clipData, grid.selection(), -1);
  });
  env.set('Paste/1', a => {
    const clipData = new GridData();
    parseCsv(clipText, clipData);
    grid.paste(clipText, clipData, grid.selection(), a);
  });
  env.set('QuickFind/0', () => grid.findPanel.show());
  env.set('Refresh/0', () => grid.refresh());
  env.set('ReplaceAll/2', (a, b) => grid.replaceAll(a, b, false, false, false, grid.range()));
  env.set('ReplaceAll/5', (a, b, c, d, e) => grid.replaceAll(a, b, c, d, e, grid.range()));
  env.set('ReplaceAll/9', (a, b, c, d, e, f, g, h, i) => grid.replaceAll(a, b, c, d, e, new Range(f, g, h, i)));
  env.set('Right=/0', () => grid.right());
  env.set('Right=/1', a => grid.setRight(a));
  env.set('Row=/0', () => grid.y);
  env.set('Row=/1', a => grid.moveTo(grid.x, a));
  env.set('SaveAs/1', a => saveAs(a, grid.gridData()));
  env.set('SelBottom=/0', () => grid.selBottom());
  env.set('SelBottom=/1', a => grid.select(grid.selLeft(), Math.min(a, grid.selTop()), grid.selRight(), a));
  env.set('SelLeft=/0', () => grid.selLeft());
  env.set('SelLeft=/1', a => grid.select(a, grid.selTop(), Math.max(a, grid.selRight()), grid.selBottom()));
  env.set('SelRight=/0', () => grid.selRight());
  env.set('SelRight=/1', a => grid.select(Math.min(a, grid.selLeft()), grid.selTop(), a, grid.selBottom()));
  env.set('SelTop=/0', () => grid.selTop());
  env.set('SelTop=/1', a => grid.select(grid.selLeft(), a, grid.selRight(), Math.max(a, grid.selBottom())));
  env.set('Select/4', (a, b, c, d) => grid.select(a, b, c, d));
  env.set('SelectAll/0', () => grid.selectAll());
  env.set('SelectCol/0', () => grid.selectCol(grid.selLeft(), grid.selRight()));
  env.set('SelectRow/0', () => grid.selectRow(grid.selTop(), grid.selBottom()));
  env.set('SequenceC/0', () => grid.sequenceC(grid.selection()));
  env.set('SequenceS/0', () => grid.sequenceS(grid.selection()));
  env.set('SetColWidth/1', a => {
    grid.colWidths.clear();
    grid.defaultColWidth = a;
  });
  env.set('SetColWidth/2', (a, b) => grid.colWidths.set(a - 0, b - 0));
  env.set('SetRowHeight/1', a => {
    grid.rowHeights.clear();
    grid.defaultRowHeight = a;
  });
  env.set('SetRowHeight/2', (a, b) => grid.setRowHeight(a, b));
  env.set('Sort/9', (a, b, c, d, e, f, g, h, i) => grid.sort(new Range(a, b, c, d), e, f, g, h, i));
  env.set('TransChar0/0', () => grid.updateSelectedCells(toHankakuAlphabet));
  env.set('TransChar1/0', () => grid.updateSelectedCells(toZenkakuAlphabet));
  env.set('TransChar2/0', () => grid.updateSelectedCells(value => value.toUpperCase()));
  env.set('TransChar3/0', () => grid.updateSelectedCells(value => value.toLowerCase()));
  env.set('TransChar4/0', () => grid.updateSelectedCells(toHankakuKana));
  env.set('TransChar5/0', () => grid.updateSelectedCells(toZenkakuKana));
  env.set('avr/4', (a, b, c, d) => grid.sumAndAvr(new Range(a, b, c, d)).avr);
  env.set('cell/2', (a, b) => {
    const value = grid.cell(a, b);
    if ((value - 0).toString() == value) {
      return value - 0;
    }
    return value;
  });
  env.set('cell=/3', (a, b, c) => grid.setCell(a, b, c));
  env.set('move/2', (a, b) => grid.moveTo(grid.x + a, grid.y + b));
  env.set('moveto/2', (a, b) => grid.moveTo(a, b));
  env.set('random/1', a => Math.floor(Math.random() * a));
  env.set('sum/4', (a, b, c, d) => grid.sumAndAvr(new Range(a, b, c, d)).sum);
  env.set('write/1', a => {
    grid.setCell(grid.x, grid.y, a);
    grid.moveTo(grid.x + 1, grid.y);
  });
  env.set('writeln/1', a => {
    grid.setCell(grid.x, grid.y, a);
    grid.moveTo(1, grid.y + 1);
  });
  if (macro) {
    grid.beginMacro();
    try {
      await run(macro, env, grid.macroMap);
    } catch(e) {
      alert(e);
      throw e;
    } finally {
      grid.endMacro();
    }
  }
  grid.render();
}

class CassavaGridElement extends HTMLElement {
  /**
   * @param {string} macroName
   * @param {string} macroText
   */
  addMacro(macroName, macroText) {}

  /** @returns IterableIterator<string> */
  getMacroNames() {}

  /**
   * @param {Blob} file
   * @param {string?} encoding
   */
  open(file, encoding) {}

  redo() {}

  /**
   * @param {string} command
   * @param  {...any} args
   */
  runCommand(command, ...args) {}

  /** @param {string} macroName */
  runNamedMacro(macroName) {}

  /** @param {string} macro */
  runMacro(macro) {}

  undo() {}
}

const onReadyCallbacks = [];
const gridElements = [];

function initGrid() {
  for (const element of /** @type {HTMLCollectionOf<CassavaGridElement>} */(
      document.getElementsByTagName('cassava-grid'))) {
    const grid = new Grid(element, new GridData());
    const table = grid.table();
    table.addEventListener('focusin', event => gridFocusIn(event, grid));
    table.addEventListener('focusout', event => gridFocusOut(event, grid));
    table.addEventListener('keydown', event => gridKeyDown(event, grid));
    table.addEventListener('mousedown', event => gridMouseDown(event, grid));
    table.addEventListener('mousemove', event => gridMouseMove(event, grid));
    table.addEventListener('mouseup', event => gridMouseUp(event, grid));
    table.addEventListener('input', event => gridInput(event, grid));
    table.addEventListener('touchmove',
        event => gridTouchMove(event, grid),
        {passive: true});
    table.addEventListener('touchend', event => gridTouchMove(event, grid));
    element.addMacro = (macroName, macroText) => grid.addMacro(macroName, macroText);
    element.getMacroNames = () => grid.macroMap.keys();
    element.open = (file, encoding) => open(file, encoding, grid);
    element.redo = () => grid.redo();
    element.runCommand = (command, ...args) =>
        runMacro(command + '('
                 + args.map(toMacroParam).join(',')
                 + ')',
                 grid);
    element.runNamedMacro = macroName => runMacro(grid.macroMap.get(macroName), grid);
    element.runMacro = macro => runMacro(macro, grid);
    element.undo = () => grid.undo();
    grid.render();

    for (const callback of onReadyCallbacks) {
      callback(element);
    }
    gridElements.push(element);
  }
}

function onReady(callback) {
  for (const element of gridElements) {
    callback(element);
  }
  onReadyCallbacks.push(callback);
}

window.net = /** @type {any} */(window.net || {});
net.asukaze = net.asukaze || {};
net.asukaze.cassava = net.asukaze.cassava || {};
net.asukaze.cassava.onReady = onReady;

// #ifdef MODULE
// export { CassavaGridElement, initGrid, onReady };
// #else
net.asukaze.cassava.initGrid = initGrid;
})();
// #endif
