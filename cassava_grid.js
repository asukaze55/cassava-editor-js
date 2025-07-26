(() => {
const { CassavaStatusBarElement } = net.asukaze.import('./cassava_status_bar.js');
const { DataFormat } = net.asukaze.import('./cassava_data_format.js');
const { Environment, FunctionValue, ObjectValue, run } = net.asukaze.import('./cassava_macro.js');
const { FindDialog, FindPanel } = net.asukaze.import('./cassava_find_dialog.js');
const { GridData, Range } = net.asukaze.import('./cassava_grid_data.js');
const { OptionDialog } = net.asukaze.import('./cassava_option_dialog.js');
const { Options } = net.asukaze.import('./cassava_options.js');
const { UndoGrid } = net.asukaze.import('./cassava_undo_grid.js');
const { createButton, createElement, createDialog, createDiv, createLabel, createTitleBar } = net.asukaze.import('./cassava_dom.js');
const { toHankakuAlphabet, toHankakuKana, toZenkakuAlphabet, toZenkakuKana } = net.asukaze.import('./cassava_replacer.js');

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

class Grid {
  /** @type {UndoGrid} */
  #undoGrid;
  /** @type {Options} */
  #options;
  /** @type {boolean} */
  #isMouseDown;
  /** @type {number} */
  #mouseDownX;
  /** @type {number} */
  #mouseDownY;
  /** @type {boolean} */
  #isTouchStarted;
  /** @type {boolean} */
  #isTouchCurentCell;
  /** @type {number} */
  #suppressRender;
  /** @type {number} */
  #renderedTop;
  /** @type {number} */
  #renderedBottom;
  /** @type {Function} */
  #onRender;
  /** @type {(x: number, y: number) => Promise<ValueType?>} */
  #onRenderCell;

  /**
   * @param {GridData} gridData
   * @param {Options} options
   * @param {Function} onRender
   * @param {(x: number, y: number) => Promise<ValueType?>} onRenderCell
   */
  constructor(gridData, options, onRender, onRenderCell) {
    this.element = createElement('table', {tabIndex: -1});
    this.#undoGrid = new UndoGrid(gridData);
    this.#options = options;
    this.#suppressRender = 0;
    this.#onRender = onRender;
    this.#onRenderCell = onRenderCell;
    this.clear();

    this.element.tabIndex = 0;
    this.element.addEventListener('focusin', event => this.#onFocusIn(event));
    this.element.addEventListener('focusout', event => this.#onFocusOut(event));
    this.element.addEventListener('input', event => this.#onInput(event));
    this.element.addEventListener(
        'mousedown', event => this.#onMouseDown(event));
    this.element.addEventListener(
        'mousemove', event => this.#onMouseMove(event));
    this.element.addEventListener('mouseup', event => this.#onMouseUp(event));
    this.element.addEventListener('scroll', () => this.render());
    this.element.addEventListener(
        'touchend', event => this.#onTouchEnd(event));
    this.element.addEventListener(
        'touchmove', event => this.#onTouchMove(event), {passive: true});
    this.element.addEventListener(
        'touchstart', event => this.#onTouchStart(event));
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
   * @returns {string}
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

  /**
   * @param {string=} fileName
   * @param {DataFormat=} dataFormat
   */
  clear(fileName = '', dataFormat = this.#options.dataFormats[0]) {
    this.#undoGrid.clear();
    this.dataFormat = dataFormat;
    this.fileName = fileName;
    this.isEditing = false;
    this.#isMouseDown = false;
    this.#mouseDownX = 1;
    this.#mouseDownY = 1;
    this.#isTouchCurentCell = false;
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
    return this.#undoGrid.gridData();
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
    cellNode.contentEditable = 'true';
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

  async redo() {
    blurActiveElement();
    const range = this.#undoGrid.redo();
    if (range) {
      await this.render();
      this.select(range.left, range.top, range.right, range.bottom);
    }
  }

  refresh() {
    this.rowHeights.clear();
  }

  /** @param {boolean=} force */
  async render(force) {
    if (this.#suppressRender > 0 && !force) {
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
    await this.renderRow(headerRow, 0, right);
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
      await this.renderRow(row, y, right);
    }
    if (table.rows[1].getBoundingClientRect().bottom > tableTop) {
      const count = Math.min(10, this.#renderedTop - 1);
      let prerenderedHeight = 0;
      for (let i = 1; i <= count; i++) {
        const row = table.insertRow(1);
        await this.renderRow(row, this.#renderedTop - i, right);
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
  async renderRow(row, y, right) {
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
        }
        row.appendChild(cell);
      }
      cell.dataset.y = String(y);
      await this.#renderFormattedCell(cell, x, y);
    }
  }

  /**
   * @param {HTMLTableCellElement} cell
   * @param {number} x
   * @param {number} y
   */
  async #renderFormattedCell(cell, x, y) {
    if (this.isEditing && x == this.x && y == this.y) {
      return;
    }
    if (x <= this.right() && y <= this.bottom()) {
      this.#suppressRender++;
      let cellToRender = await this.#onRenderCell(x, y);
      this.#suppressRender--;
      if (cellToRender instanceof ObjectValue) {
        /** @type {(value: ValueType?) => string?} */
        const toString = value => value != null ? value.toString() : null;
        this.#renderCell(cell, x, y,
            toString(cellToRender.get('text')),
            toString(cellToRender.get('align')),
            toString(cellToRender.get('color')),
            toString(cellToRender.get('background')));
        return;
      } else if (cellToRender) {
        this.#renderCell(cell, x, y, cellToRender.toString());
        return;
      }
    }
    this.#renderCell(cell, x, y, /* value= */ null);
  }

  /**
   * @param {HTMLTableCellElement} cell
   * @param {number} x
   * @param {number} y
   */
  #renderRawCell(cell, x, y) {
    this.#renderCell(cell, x, y, /* value= */ null);
  }

  /**
   * @param {HTMLTableCellElement} cell
   * @param {number} x
   * @param {number} y
   * @param {string?} value
   * @param {string=} align
   * @param {string=} color
   * @param {string=} background
   */
  #renderCell(cell, x, y, value, align, color, background) {
    const isFixed = x == 0 || y == 0;
    const isSelected = x >= this.selLeft()
        && x <= this.selRight()
        && y >= this.selTop()
        && y <= this.selBottom();
    const isEditing = this.isEditing && x == this.x && y == this.y;

    if (value == null) {
      if (x == 0 && y == 0) {
        value = '';
      } else if (y == 0) {
        value = (x <= this.#undoGrid.right()) ? x.toString() : ' ';
      } else if (x == 0) {
        value = (y <= this.#undoGrid.bottom()) ? y.toString() : ' ';
      } else {
        value = this.#undoGrid.cell(x, y);
      }
    }
    const html =
        value.split('\n').map(line => sanitize(line) + '<br>').join('');
    if (cell.innerHTML !== html) {
      cell.innerHTML = html;
    }
    cell.style.textAlign = align || '';

    if (isFixed) {
      cell.style.backgroundColor = this.#options.get('Font/FixedColor');
      cell.style.color = this.#options.get('Font/FixFgColor');
    } else if (isSelected && !isEditing) {
      cell.style.backgroundColor = '#00f';
      cell.style.color = '#fff';
    } else {
      cell.style.backgroundColor = background || this.#getBackgroundColor(x, y);
      cell.style.color = color || this.#options.get('Font/FgColor');
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  #getBackgroundColor(x, y) {
    const bgColor = this.#options.get('Font/BgColor');
    const currentRowBgColor = this.#options.get('Font/CurrentRowBgColor');
    if (y == this.y && currentRowBgColor != bgColor) {
      return currentRowBgColor;
    }
    const currentColBgColor = this.#options.get('Font/CurrentColBgColor');
    if (x == this.x && currentColBgColor != bgColor) {
      return currentColBgColor;
    }
    const isDummyCell =
        (x > this.#undoGrid.right() || y > this.#undoGrid.bottom());
    const isCurrentCell = (x == this.x && y == this.y);
    if (isDummyCell && !isCurrentCell) {
      return this.#options.get('Font/DummyBgColor');
    }
    return (y % 2) ? bgColor : this.#options.get('Font/EvenRowBgColor');
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
  async select(x1, y1, x2, y2) {
    if (x1 == x2 && y1 == y2 && !this.#isTouchStarted) {
      await this.moveTo(x1, y1);
      return;
    }
    blurActiveElement();
    this.element.focus();
    this.isEditing = false;
    this.anchorX = x1;
    this.anchorY = y1;
    this.x = x2;
    this.y = y2;
    await this.render();
  }

  selectAll() {
    return this.select(1, 1, this.#undoGrid.right(), this.#undoGrid.bottom());
  }

  /**
   * @param {number} l
   * @param {number} r
   */
  selectCol(l, r) {
    return this.select(l, 1, r, this.#undoGrid.bottom());
  }

  /**
   * @param {number} t
   * @param {number} b
   */
  selectRow(t, b) {
    return this.select(1, t, this.#undoGrid.right(), b);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} selAnchor
   * @param {number} selFocus
   */
  async selectText(x, y, selAnchor, selFocus) {
    this.anchorX = x;
    this.anchorY = y;
    this.x = x;
    this.y = y;
    await this.render();
    const cellNode = this.cellNode(x, y);
    this.#renderRawCell(cellNode, x, y);
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

  /**
   * @param {GridData} gridData
   * @param {string} fileName
   * @param {DataFormat} dataFormat
   */
  setGridData(gridData, fileName, dataFormat) {
    this.clear(fileName, dataFormat);
    this.#undoGrid = new UndoGrid(gridData);
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

  async undo() {
    blurActiveElement();
    const range = this.#undoGrid.undo();
    if (range) {
      await this.render();
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

  /** @param {Event} event */
  #onFocusIn(event) {
    const target = getEventTarget(event);
    if (target == null) {
      return;
    }
    target.contentEditable = 'true';
    this.x = parseInt(target.dataset.x, 10);
    this.y = parseInt(target.dataset.y, 10);
    this.isEditing = true;
    this.#renderRawCell(target, this.x, this.y);
  }

  /** @param {Event} event */
  #onFocusOut(event) {
    const target = getEventTarget(event);
    if (target == null) {
      return;
    }
    target.contentEditable = 'false';
    const x = parseInt(target.dataset.x, 10);
    const y = parseInt(target.dataset.y, 10);
    this.isEditing = false;
    this.#renderFormattedCell(target, x, y);
  }

  /** @param {Event} event */
  #onInput(event) {
    const target = getEventTarget(event);
    if (target == null) {
      return;
    }
    const x = parseInt(target.dataset.x, 10);
    const y = parseInt(target.dataset.y, 10);
    this.setCell(x, y, parseCellInput(target));
  }

  /** @param {MouseEvent} event */
  async #onMouseDown(event) {
    const target = getEventTarget(event);
    if (target == null) {
      return;
    }
    const x = parseInt(target.dataset.x, 10);
    const y = parseInt(target.dataset.y, 10);
    this.#isMouseDown = true;
    this.#mouseDownX = x;
    this.#mouseDownY = y;
    await this.#onMouseMove(event);
  }

  /** @param {MouseEvent} event */
  async #onMouseMove(event) {
    if (!this.#isMouseDown) {
      return;
    }
    const target = getEventTarget(event);
    if (target == null) {
      return;
    }
    const x = parseInt(target.dataset.x, 10);
    const y = parseInt(target.dataset.y, 10);
    const anchorX = event.shiftKey ? this.anchorX : this.#mouseDownX;
    const anchorY = event.shiftKey ? this.anchorY : this.#mouseDownY;
    if (this.isEditing && x == this.x && y == this.y) {
      return;
    }
    event.preventDefault();
    if (x == 0 && y == 0) {
      await this.selectAll();
    } else if (x == 0) {
      await this.selectRow(anchorY, y);
    } else if (y == 0) {
      await this.selectCol(anchorX, x);
    } else {
      await this.select(anchorX, anchorY, x, y);
    }
  }

  /** @param {MouseEvent} event */
  async #onMouseUp(event) {
    await this.#onMouseMove(event);
    this.#isMouseDown = false;
  }

  /** @param {TouchEvent} event */
  async #onTouchStart(event) {
    this.#isTouchStarted = true;
    if (this.isEditing || this.x != this.anchorX || this.y != this.anchorY) {
      return;
    }
    const target = getEventTarget(event.changedTouches[0]);
    if (target == null) {
      return;
    }
    const x = parseInt(target.dataset.x, 10);
    const y = parseInt(target.dataset.y, 10);
    if (x == this.x && y == this.y) {
      this.#isTouchCurentCell = true;
    }
    await this.#onTouchMove(event);
  }

  /** @param {TouchEvent} event */
  async #onTouchMove(event) {
    const touch = event.changedTouches[0];
    const from = getEventTarget(touch);
    const to = this.#touchedCell(touch, this.element);
    if (from == null || to == null) {
      return;
    }
    const x1 = parseInt(from.dataset.x, 10);
    const y1 = parseInt(from.dataset.y, 10);
    const x2 = parseInt(to.dataset.x, 10);
    const y2 = parseInt(to.dataset.y, 10);
    if (this.isEditing && x2 == this.x && y2 == this.y) {
      return;
    }
    if ((x1 == 0 || x2 == 0) && (y1 == 0 || y2 == 0)) {
      await this.selectAll();
    } else if (x1 == 0 || x2 == 0) {
      await this.selectRow(y1, y2);
    } else if (y1 == 0 || y2 == 0) {
      await this.selectCol(x1, x2);
    } else {
      await this.select(x1, y1, x2, y2);
    }
  }

  /** @param {TouchEvent} event */
  async #onTouchEnd(event) {
    await this.#onTouchMove(event);
    if (this.#isTouchCurentCell && this.x == this.anchorX &&
        this.y == this.anchorY) {
      this.moveTo(this.x, this.y);
    }
    this.#isTouchCurentCell = false;
    // Clean up #isTouchStarted after mouse events complete.
    setTimeout(() => {
      this.#isTouchStarted = false;
    });
  }

  /**
   * @param {Touch} touch
   * @param {HTMLTableElement} table
   * @returns {HTMLTableCellElement?}
   */
  #touchedCell(touch, table) {
    let y = 0;
    for (const row of table.rows) {
      if (touch.clientY <= row.getBoundingClientRect().bottom) {
        for (const cell of row.cells) {
          if (touch.clientX <= cell.getBoundingClientRect().right) {
            return cell;
          }
        }
        return null;
      }
    }
    return null;
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
 * @param {Element} cellNode
 * @returns {string}
 */
function parseCellInput(cellNode) {
  return cellNode.innerHTML
      .replaceAll(/<\/div>/gi, '\n')
      .replaceAll(/<br(\s[^>]*)?>/gi, '\n')
      .replaceAll(/<.*?>/g, '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&quot;', '"')
      .replaceAll('&gt;', '>')
      .replaceAll('&lt;', '<')
      .replaceAll('&amp;', '&')
      .replaceAll(/\n$/g, '');
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
    case 'Tab':
      if (event.shiftKey) {
        if (grid.x == 1) {
          if (grid.y == 1) {
            return;
          }
          grid.moveTo(grid.right() + 1, grid.y - 1);
        } else {
          grid.moveTo(grid.x - 1, grid.y);
        }
      } else {
        if (grid.x > grid.right()) {
          if (grid.y > grid.bottom()) {
            return;
          }
          grid.moveTo(1, grid.y + 1);
        } else {
          grid.moveTo(grid.x + 1, grid.y);
        }
      }
      event.preventDefault();
      return;
  }
}

const macroTerminated = {};

/**
 * @param {ValueType} content
 * @returns {HTMLElement|string}
 */
function convertDialogContent(content) {
  if (!(content instanceof ObjectValue)) {
    return content.toString();
  }

  const attributes = {};
  if (content.has('cols')) {
    attributes.cols = Number(content.get('cols'));
  }
  if (content.has('rows')) {
    attributes.rows = Number(content.get('rows'));
  }
  if (content.has('size')) {
    attributes.size = Number(content.get('size'));
  }
  if (content.has('value')) {
    attributes.value = content.get('value').toString();
  }

  const children = [];
  const childNodes = content.get('childNodes');
  if (childNodes instanceof ObjectValue) {
    for (let i = 0; i < Number(childNodes.get('length')); i++) {
      children.push(convertDialogContent(childNodes.get(i)));
    }
  }

  const tagName = content.get('tagName').toString().toUpperCase();
  if (tagName == 'BUTTON') {
    return createElement('button', attributes, children);
  } else if (tagName == 'INPUT') {
    const element = createElement('input', attributes, children);
    element.addEventListener(
        'input', () => content.set('value', element.value));
    content.set('value', element.value);
    return element;
  } else if (tagName == 'TEXTAREA') {
    const element = createElement('textarea', {}, children);
    element.addEventListener(
        'input', () => content.set('value', element.value));
    content.set('value', element.value);
    return element;
  } else {
    return createElement('div', {}, children);
  }
}

/**
 * @param {ValueType} content
 * @param {string=} title
 * @returns {Promise<string>}
 */
function showUserDialog(content, title) {
  return new Promise((resolve, reject) => {
    const dialog = createDialog([
      createTitleBar(title || 'Cassava Macro', () => {
        document.body.removeChild(dialog);
        reject(macroTerminated);
      }),
      createElement('form', {method: 'dialog'}, [
        convertDialogContent(content)
      ])
    ]);
    dialog.addEventListener('close', () => {
      document.body.removeChild(dialog);
      resolve(dialog.returnValue);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

/**
 * @param {string} message
 * @param {string=} title
 * @param {number=} flag
 * @returns {Promise<number>}
 */
function messageBox(message, title, flag = 0) {
  return new Promise(resolve => {
    const buttons = createDiv();
    const dialog = createDialog([
      createTitleBar(title || 'Cassava Macro', () => {
        if (flag == 2 || flag == 4) {
          return;
        }
        dialog.close();
        document.body.removeChild(dialog);
        resolve(flag == 0 ? 1 : 2);
      }),
      createElement('div', {innerText: message}),
      buttons
    ]);
    for (const button of [
      {l: 'OK', v: 1, f: [0, 1]},
      {l: 'はい', v: 6, f: [3, 4]},
      {l: 'いいえ', v: 7, f: [3, 4]},
      {l: '中断', v: 3, f: [2]},
      {l: '再試行', v: 4, f: [2, 5]},
      {l: '無視', v: 5, f: [2]},
      {l: 'キャンセル', v: 2, f: [1, 3, 5]}
    ]) {
      if (button.f.includes(flag)) {
        buttons.append(createButton(button.l, () => {
          dialog.close();
          document.body.removeChild(dialog);
          resolve(button.v);
        }));
      }
    }
    document.body.append(dialog);
    dialog.showModal();
  });
}

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
    const dialog = createDialog([
      createTitleBar(title || 'Cassava Macro', () => {
        dialog.close();
        document.body.removeChild(dialog);
        reject(macroTerminated);
      }),
      createElement('div', {innerText: message}),
      createDiv(textarea),
      createDiv(createButton('OK', () => {
            dialog.close();
            document.body.removeChild(dialog);
            resolve(textarea.value);
          }),
          createButton('Cancel', () => {
            dialog.close();
            document.body.removeChild(dialog);
            reject(macroTerminated);
          }))
    ]);
    document.body.append(dialog);
    dialog.showModal();
  });
}

class OpenDialog {
  #encoding = 'UTF-8';
  /** @type {HTMLInputElement} */
  #fileInput;
  /** @type {(content: string, name: string) => Promise<ValueType>|void} */
  #onLoad;

  /** @param {(content: string, name: string) => Promise<ValueType>|void} onLoad */
  constructor(onLoad) {
    this.#onLoad = onLoad;
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
      reader.addEventListener('load', async () => {
        try {
          await this.#onLoad(/** @type {string} */(reader.result), file.name);
        } catch {}
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
      /** @type {EventListener} */
      let changeListener;
      /** @type {EventListener} */
      let cancelListener;
      changeListener = async () => {
        this.#fileInput.removeEventListener('change', changeListener);
        this.#fileInput.removeEventListener('cancel', cancelListener);
        await this.load();
        resolve();
      };
      cancelListener = () => {
        this.#fileInput.removeEventListener('change', changeListener);
        this.#fileInput.removeEventListener('cancel', cancelListener);
        resolve();
      }
      this.#fileInput.addEventListener('change', changeListener);
      this.#fileInput.addEventListener('cancel', cancelListener);
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
      [grid.dataFormat.stringify(gridData, gridData.range())],
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
    const dialog = createDialog([
      createTitleBar('貼り付けオプション', () => {
        dialog.close();
        document.body.removeChild(dialog);
        resolve();
      }),
      createDiv('選択サイズ： ' + (selection.right - selection.left + 1) +
          ' × ' + (selection.bottom - selection.top + 1)),
      createDiv(createElement('details', {}, [
        createElement('summary', {}, ['クリップボードサイズ： ' + clipData.right() +
                      ' × ' + clipData.bottom()]),
        textarea
      ])),
      createDiv(createElement('fieldset', {}, [
        createElement('legend', {}, ['貼り付け方法']),
        createDiv(createLabel(option0Input, '選択領域と重なった部分のみに貼り付け')),
        createDiv(createLabel(option1Input, '選択領域にくり返し処理をして貼り付け')),
        createDiv(createLabel(option2Input, 'データのサイズで上書き')),
        createDiv(createLabel(option3Input, '内容を右に移動させてデータを挿入')),
        createDiv(createLabel(option4Input, '内容を下に移動させてデータを挿入')),
        createDiv(createLabel(option5Input, 'テキストとして1セル内に貼り付け')),
      ])),
      createDiv(createButton('OK', async () => {
        const text = textarea.value;
        const data =  grid.dataFormat.parse(text);
        const option = option1Input.checked ? 1
                     : option2Input.checked ? 2
                     : option3Input.checked ? 3
                     : option4Input.checked ? 4
                     : option5Input.checked ? 5
                     : 0;
        grid.paste(text, data, grid.selection(), option);
        dialog.close();
        document.body.removeChild(dialog);
        resolve();
      }))
    ]);
    document.body.append(dialog);
    dialog.showModal();
  });
}

/**
 * @param {Grid} grid
 * @param {boolean} cut
 */
async function copy(grid, cut) {
  const range = grid.selection();
  await clipboard.writeText(grid.dataFormat.stringify(grid.gridData(), range));
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
  const clipData = grid.dataFormat.parse(clipText);
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

/** @typedef {import("./cassava_macro.js").ValueType} ValueType */
/** @typedef {import("./cassava_macro.js").MacroFunction} MacroFunction */

/** The custom element used for <cassava-grid>. */
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
  /** @type {OptionDialog} */
  #optionDialog;
  /** @type {Options} */
  #options;
  /** @type {OpenDialog} */
  #macroExecuteDialog;
  /** @type {CassavaStatusBarElement} */
  #statusBarPanel;

  /** @type {Map<string, MacroFunction>} */
  #api = new Map(Object.entries({
    'Bottom=/0': () => this.#grid.bottom(),
    'Bottom=/1': a => this.#grid.setBottom(Number(a)),
    'Clear/0': () => this.#grid.clear(),
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
    'End/0': () => {
      this.#grid.clear();
      throw macroTerminated;
    },
    'Enter/0': () => this.#grid.insertRowAtCursor(0, 0),
    'Find/0': () => this.#findDialog.show(),
    'FindBack/0': () => this.#findDialog.findNext(-1),
    'FindNext/0': () => this.#findDialog.findNext(1),
    'GetActiveDataType/0': () => this.#grid.dataFormat.name,
    'GetCharCode/0': () => 'UTF-8',
    'GetColWidth/0': () => this.#grid.defaultColWidth,
    'GetColWidth/1':
        a => this.#grid.colWidths.get(Number(a)) ?? this.#grid.defaultColWidth,
    'GetDataTypes/0':
        () => this.#options.dataFormats.map(f => f.name).join('\n'),
    'GetFilePath/0': () => '',
    'GetFileName/0': () => this.#grid.fileName,
    'GetRowHeight/0': () => this.#grid.defaultRowHeight,
    'GetRowHeight/1': a => this.#grid.getRowHeight(Number(a)),
    'InputBox/1': a => {
      this.#grid.render(/* force= */ true);
      return prompt(a.toString());
    },
    'InputBox/2': (a, b) => {
      this.#grid.render(/* force= */ true);
      return prompt(a.toString(), b.toString());
    },
    'InputBoxMultiLine/1': a => {
      this.#grid.render(/* force= */ true);
      return inputBoxMultiLine(a.toString());
    },
    'InputBoxMultiLine/2': (a, b) => {
      this.#grid.render(/* force= */ true);
      return inputBoxMultiLine(a.toString(), /* title= */null, b.toString());
    },
    'InputBoxMultiLine/3': (a, b, c) => {
      this.#grid.render(/* force= */ true);
      return inputBoxMultiLine(a.toString(), b.toString(), c.toString());
    },
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
    'MacroExecute/0': () => this.#macroExecuteDialog.show(),
    'MacroTerminate/0': () => {
      throw macroTerminated;
    },
    'MessageBox/0': () => {
      this.#grid.render(/* force= */ true);
      return messageBox('ブレークポイントです');
    },
    'MessageBox/1': a => {
      this.#grid.render(/* force= */ true);
      return messageBox(a.toString());
    },
    'MessageBox/2': (a, b) => {
      this.#grid.render(/* force= */ true);
      return messageBox(a.toString(), undefined, Number(b));
    },
    'MessageBox/3': (a, b, c) => {
      this.#grid.render(/* force= */ true);
      return messageBox(a.toString(), b.toString(), Number(c));
    },
    'New/0': () => this.#grid.clear(),
    'NewLine/0': () => this.#grid.setCell(this.#grid.x, this.#grid.y, '\n'),
    'Open/0': () => this.#openDialog.show(),
    'Open/1': () => this.#openDialog.show(),
    'OptionDlg/0': () => this.#optionDialog.show(),
    'Paste/0': () => paste(this.#grid, -1),
    'Paste/1': a => paste(this.#grid, Number(a)),
    'QuickFind/0': () => this.#findPanel.show(),
    'QuickFind/1': a => {
      this.#findDialog.setFindText(a.toString());
      this.#findPanel.show();
    },
    'Redo/0': () => this.#grid.redo(),
    'Refresh/0': () => this.#grid.refresh(),
    'ReloadCodeShiftJIS/0': () => this.#openDialog.reload('Shift_JIS'),
    'ReloadCodeUTF8/0': () => this.#openDialog.reload('UTF-8'),
    'ReplaceAll/2': (a, b) => {
      const isRegex = a instanceof RegExp;
      this.#grid.replaceAll(isRegex ? a.source : a.toString(), b.toString(),
          isRegex && a.ignoreCase, false, isRegex, this.#grid.allCells());
    },
    'ReplaceAll/5': (a, b, c, d, e) => this.#grid.replaceAll(
        (a instanceof RegExp) ? a.source : a.toString(), b.toString(),
        !!c, !!d, !!e, this.#grid.allCells()),
    'ReplaceAll/9': (a, b, c, d, e, f, g, h, i) => this.#grid.replaceAll(
        (a instanceof RegExp) ? a.source : a.toString(), b.toString(),
        !!c, !!d, !!e, new Range(Number(f), Number(g), Number(h), Number(i))),
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
      const format = this.#options.dataFormats.find(f => f.name == dataType);
      if (format == null) {
        throw 'Unsupported data type: ' + dataType;
      }
      this.#grid.dataFormat = format;
      this.#grid.render();
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
    'SetStatusBarPopUp/3': (a, b, c) => {
      if (!(c instanceof FunctionValue)) {
        throw 'Not a function: ' + c;
      }
      this.#statusBarPanel.setPopUp(
          Number(a), b.toString(), item => c.run([item]));
    },
    'SetStatusBarText/2':
        (a, b) => this.#statusBarPanel.setText(Number(a), b.toString()),
    'SetStatusBarWidth/2':
        (a, b) => this.#statusBarPanel.setWidth(Number(a), Number(b)),
    'ShowDialog/1': a => {
      this.#grid.render(/* force= */ true);
      return showUserDialog(a);
    },
    'ShowDialog/2': (a, b) => {
      this.#grid.render(/* force= */ true);
      return showUserDialog(a, b.toString());
    },
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

    this.#options = new Options();
    this.#grid = new Grid(new GridData(), this.#options,
        /* onRender= */ () => this.runNamedMacro('!statusbar.cms'),
        /* onRenderCell= */ (x, y) => this.#runFormatMacro(x, y));
    this.#findDialog = new FindDialog(this.#grid);
    this.#findPanel = new FindPanel(this.#grid, this.#findDialog);
    this.#macroMap = new Map();
    this.#openDialog = new OpenDialog((content, fileName) => {
      const dataFormats = this.#options.dataFormats;
      const dataFormat = dataFormats
          .find(f => f.extensions.some(ext => fileName.endsWith('.' + ext)))
          ?? dataFormats[0];
      this.#grid.setGridData(dataFormat.parse(content), fileName, dataFormat);
    });
    this.#optionDialog = new OptionDialog(this.#grid, this.#options);
    this.#macroExecuteDialog =
        new OpenDialog(content => this.#runMacro(content));
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

    table.addEventListener('keydown', event => gridKeyDown(event, this.#grid,
        this.#findDialog, this.#findPanel, shadow));
    this.#grid.render();
  }

  /**
   * Registers a new macro. If macroText is empty, the macro will be deleted.
   *
   * If the macroName is '!statusbar.cms', a status bar will be shown and the
   * macro will be executed every time the status bar may need to be updated.
   *
   * If the macroName is '!format.cms', the macro will be executed for each cell
   * rendering, and the result will be displayed instead of the raw data.
   *
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
          await this.#runMacro('import{init}from"!statusbar.cms";init();',
              /* ignoreErrors= */ true);
        } catch {}
        await this.#grid.render();
      }
    }
  }

  /**
   * Gets the number of rows.
   *
   * @returns {number}
   */
  bottom() {
    return this.#grid.bottom();
  }

  /**
   * Gets the cell data.
   *
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  cell(x, y) {
    return this.#grid.cell(x, y);
  }

  /**
   * Gets the macro text for the given name.
   *
   * @param {string} macroName
   * @returns {string?}
   */
  getMacro(macroName) {
    return this.#macroMap.get(macroName);
  }

  /**
   * Gets all registered macro names.
   *
   * @returns {Array<string>}
   */
  getMacroNames() {
    return Array.from(this.#macroMap.keys());
  }

  /**
   * Runs the registered macro for the given name.
   *
   * @param {string} macroName
   */
  async runNamedMacro(macroName) {
    await this.#runMacro(this.#macroMap.get(macroName));
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {Promise<ValueType?>}
   */
  #runFormatMacro(x, y) {
    const macro = this.#macroMap.get('!format.cms');
    if (!macro) {
      return;
    }
    return this.#runMacro(`x=${x};y=${y};${macro}`, /* ignoreErrors= */ true);
  }

  /**
   * Runs the given script as a macro.
   *
   * @param {string} macro
   */
  async runMacro(macro) {
    await this.#runMacro(macro);
  }

  /**
   * @param {string} macro
   * @param {boolean=} ignoreErrors
   * @returns {Promise<ValueType?>}
   */
  async #runMacro(macro, ignoreErrors) {
    if (!macro) {
      return null;
    }
    this.#grid.beginMacro();
    let result = null;
    try {
      const env = new Environment(/* parent= */ null, this.#api);
      result = await run(macro, env, this.#macroMap);
    } catch(e) {
      if (e != macroTerminated && !ignoreErrors) {
        alert(e);
        throw e;
      }
    } finally {
      this.#grid.endMacro();
    }
    await this.#grid.render();
    return result;
  }

  /**
   * Gets the number of columns.
   *
   * @returns {number}
   */
  right() {
    return this.#grid.right();
  }

  /**
   * Sets the cell data.
   * The value will be converted to a string using toString().
   *
   * @param {number} x
   * @param {number} y
   * @param {any} value
   */
  setCell(x, y, value) {
    this.#grid.setCell(x, y, value);
  }
}

customElements.define('cassava-grid', CassavaGridElement);

net.asukaze.export({ CassavaGridElement });
})();
