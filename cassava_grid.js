// #ifdef MODULE
// import { Environment, run } from './cassava_macro.js';
// import { createReplacer, toHankakuAlphabet, toHankakuKana, toZenkakuAlphabet, toZenkakuKana } from './cassava_replacer.js';
// #else
(() => {
const createReplacer = net.asukaze.cassava.createReplacer;
const Environment = net.asukaze.cassava.macro.Environment;
const run = net.asukaze.cassava.macro.run;
const toHankakuAlphabet = net.asukaze.cassava.toHankakuAlphabet;
const toHankakuKana = net.asukaze.cassava.toHankakuKana;
const toZenkakuAlphabet = net.asukaze.cassava.toZenkakuAlphabet;
const toZenkakuKana = net.asukaze.cassava.toZenkakuKana;
// #endif

function isNumber(value) {
  return value != '' && !isNaN(value - 0);
}

function increment(value) {
  const c = value.at(-1);
  if (c >= '0' && c < '9') {
    return value.substring(0, value.length - 1)
           + ((c - 0) + 1);
  } else if (c == '9') {
    return increment(
        value.substring(0, value.length - 1)) + '0';
  }
  return value + '1';
}

class Range {
  constructor(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }
}

class GridData {
  constructor() {
    this.clear();
  }

  bottom() {
    return this.data.length;
  }

  cell(x, y) {
    if (this.data[y - 1] == null) {
      return '';
    }
    const value = this.data[y - 1][x - 1];
    if (value == null) {
      return '';
    }
    return value;
  }

  clear() {
    this.data = [['']];
    this.maxColCount = 1;
  }

  clearCells(range) {
    for (let y = range.top; y <= range.bottom; y++) {
      const row = this.data[y - 1];
      if (!row) {
        continue;
      }
      for (let x = range.left; x <= range.right; x++) {
        row[x - 1] = '';
      }
    }    
  }

  deleteCellLeft(range) {
    const cols = range.right - range.left + 1;
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = range.left; x <= this.maxColCount; x++) {
        this.setCell(x, y, this.cell(x + cols, y));
      }
    }
  }

  deleteCellUp(range) {
    const rows = range.bottom - range.top + 1;
    const bottom = this.bottom();
    for (let x = range.left; x <= range.right; x++) {
      for (let y = range.top; y <= bottom; y++) {
        this.setCell(x, y, this.cell(x, y + rows));
      }
    }    
  }

  deleteCol(l, r) {
    this.maxColCount -= (r - l + 1);
    for (let y = 1; y <= this.data.length; y++) {
      const row = this.data[y - 1];
      if (!row || row.length < l) {
        continue;
      }
      row.splice(l - 1, r - l + 1);
    }
  }

  deleteRow(t, b) {
    this.data.splice(t - 1, b - t + 1);
  }

  insertCellDown(range) {
    const rows = range.bottom - range.top + 1;
    for (let x = range.left; x <= range.right; x++) {
      for (let y = this.bottom() + rows; y > range.bottom; y--) {
        this.setCell(x, y, this.cell(x, y - rows));
      }
      for (let y = range.bottom; y >= range.top; y--) {
        this.setCell(x, y, '');
      }
    }
  }

  insertCellRight(range) {
    const cols = range.right - range.left + 1;
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = this.right() + cols; x > range.right; x--) {
        this.setCell(x, y, this.cell(x - cols, y));
      }
      for (let x = range.right; x >= range.left; x--) {
        this.setCell(x, y, '');
      }
    }
  }

  insertCol(l, r) {
    this.maxColCount += (r - l + 1);
    const newCells = [];
    for (let x = l; x <= r; x++) {
      newCells.push('');
    }
    for (let y = 1; y <= this.data.length; y++) {
      const row = this.data[y - 1];
      if (!row || row.length < l) {
        continue;
      }
      row.splice(l - 1, 0, ...newCells);
    }
  }

  insertRow(t, b) {
    for (let y = t; y <= b; y++) {
      this.data.splice(y - 1, 0, []);
    }
  }

  paste(clipText, clipData, range, way) {
    if (way == 5) {
      this.setCell(this.x, this.y, clipText);
      return;
    }
    const l = range.left;
    const t = range.top;
    const r = range.right;
    const b = range.bottom;
    const clipCols = clipData.right();
    const clipRows = clipData.bottom();
    if (way == 3) {
      this.insertCellRight(new Range(l, t, l + clipCols - 1, t + clipRows - 1));
    } else if (way == 4) {
      this.insertCellDown(new Range(l, t, l + clipCols - 1, t + clipRows - 1));
    }
    const targetCols =
        way <= 0 ? Math.min(clipCols, r - l + 1)
                 : way == 1 ? r - l + 1 : clipCols;
    const targetRows =
        way <= 0 ? Math.min(clipRows, b - t + 1)
                 : way == 1 ? b - t + 1 : clipRows;
    for (let y = 0; y < targetRows ; y++) {
      for (let x = 0; x < targetCols; x++) {
        this.setCell(l + x, t + y, clipData.cell(
            (x % clipCols) + 1,
            (y % clipRows) + 1));
      }
    }
  }

  range() {
    return new Range(1, 1, this.maxColCount, this.data.length);
  }

  replaceAll(str1, str2, ignoreCase, wholeCell, regex, range) {
    str1 = str1.toString();
    str2 = str2.toString();
    const l = Math.max(range.left, 1);
    const t = Math.max(range.top, 1);
    const r = Math.min(range.right, this.maxColCount);
    const b = Math.min(range.bottom, this.data.length);
    const replacer = createReplacer(str1.toString(), str2.toString(), ignoreCase, wholeCell, regex);
    for (let y = t; y <= b; y++) {
      if (this.data[y - 1] == null) {
        continue;
      }
      for (let x = l; x <= r; x++) {
        const value = this.data[y - 1][x - 1];
        if (value == null) {
          continue;
        }
        this.data[y - 1][x - 1] = replacer(value);
      }
    }
  }

  right() {
    return this.maxColCount;
  }

  sequenceC(range) {
    for (let x = range.left; x <= range.right; x++) {
      const value = this.cell(x, range.top);
      for (let y = range.top + 1; y <= range.bottom; y++) {
        this.setCell(x, y, value);
      }
    }
  }

  sequenceS(range) {
    for (let x = range.left; x <= range.right; x++) {
      const first = this.cell(x, range.top);
      const second = this.cell(x, range.top + 1);
      if (isNumber(first) && isNumber(second)) {
        const step = second - first;
        for (let y = range.top + 2; y <= range.bottom; y++) {
          this.setCell(x, y,
              (first - 0) + (step * (y - range.top)));
        }
      } else {
        for (let y = range.top + 1; y <= range.bottom; y++) {
          this.setCell(x, y,
              increment(this.cell(x, y - 1)));
        }
      }
    }
  }

  setBottom(b) {
    while (this.data.length < b) {
      this.data.push([]);
    }
    if (this.data.length > b) {
      this.data.splice(b);
    }
  }

  setCell(x, y, value) {
    if (value != '' && x > this.maxColCount) {
      this.maxColCount = x - 0;
    }
    if (this.data[y - 1] == null) {
      if (value == '') {
        return;
      }
      this.data[y - 1] = [];
    }
    this.data[y - 1][x - 1] = value.toString();
  }

  setRight(r) {
    r = r - 0;
    if (this.maxColCount <= r) {
      this.maxColCount = r;
      return;
    }
    this.maxColCount = r;
    for (const row of this.data) {
      if (row && row.length > r) {
        row.splice(r);
      }
    }
  }

  sort(range, p, dir, num, ignoreCase, zenhan) {
    const rangeData = [];
    for (let y = range.top; y <= range.bottom; y++) {
      rangeData.push(this.data[y - 1].slice(range.left - 1, range.right));
    }
    rangeData.sort((row1, row2) => {
      let val1 = row1[p - 1];
      let val2 = row2[p - 1]; 
      if (num) {
        const isNum1 = isNumber(val1);
        const isNum2 = isNumber(val2);
        if (isNum1 && !isNum2) {
          return -1;
        } else if (!isNum1 && isNum2) {
          return 1;
        } else if (isNum1 && isNum2) {
          return val1 - val2
        }
      }
      if (zenhan) {
        val1 = val1.normalize('NFKC');
        val2 = val2.normalize('NFKC');
      }
      if (ignoreCase) {
        val1 = val1.toLowerCase();
        val2 = val2.toLowerCase();
      }
      if (val1 < val2) {
        return dir ? 1 : -1;
      } else if (val1 > val2) {
        return dir ? -1 : 1;
      }
      return 0;
    });
    for (let y = range.top; y <= range.bottom; y++) {
      const target = this.data[y - 1];
      const sorted = rangeData[y - range.top];
      for (let x = range.left; x <= range.right; x++) {
        target[x - 1] = sorted[x - range.left];
      }
    }
  }

  sumAndAvr(range) {
    let sum = 0;
    let count = 0;
    for (let y = range.top; y <= range.bottom; y++) {
      if (this.data[y - 1] == null) {
        continue;
      }
      for (let x = range.left; x <= range.right; x++) {
        const value = this.data[y - 1][x - 1];
        if (value == null || !isNumber(value)) {
          continue;
        }
        sum += value - 0;
        count++;
      }
    }
    return (count == 0) ? {sum :0, avr: 0}
                        : {sum, avr: sum / count};
  }
}

let clipText = '';

function blurActiveElement() {
  document.activeElement.blur();
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

class Grid {
  constructor(element, gridData) {
    this.element = element;
    this.gridData = gridData;
    this.suppressRender = 0;
    this.clear();
  }

  clear() {
    this.gridData.clear();
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
  }

  connectCells(range) {
    blurActiveElement();
    const l = range.left;
    const t = range.top;
    const r = range.right;
    const b = range.bottom;
    if (r > l || b > t) {
      let result = '';
      for (let y = t; y <= b; y++) {
        for (let x = l; x <= r; x++) {
          result += this.gridData.cell(x, y);
          this.gridData.setCell(x, y, '');
        }
      }
      this.gridData.setCell(l, t, result);
      this.select(l, t, r, b);
    } else if (l > 1) {
      this.gridData.setCell(l - 1, t, this.gridData.cell(l - 1, t) + this.gridData.cell(l, t));
      this.gridData.deleteCellLeft(new Range(l, t, l, t));
      this.moveTo(l - 1, t);
    } else if (t > 1) {
      const right = this.gridData.right();
      let ux = right;
      while(ux > 0 && this.gridData.cell(ux, t - 1) == '') {
        ux--;
      }
      for (let x = 1; x <= right; x++) {
        this.gridData.setCell(x + ux, t - 1, this.gridData.cell(x, t));
      }
      this.gridData.deleteRow(t, t);
      this.moveTo(ux + 1, t - 1);
    } else {
      this.moveTo(l, t);
    }
  }

  getRowHeight(y) {
    const rowHeight = this.rowHeights.get(y - 0);
    return rowHeight != null ? rowHeight : this.defaultRowHeight;
  }

  insertCol(l, r, move) {
    this.gridData.insertCol(l, r);
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
    this.gridData.insertRow(t, b);
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
    const cellText = this.gridData.cell(l, t);
    const selStart = Math.min(selAnchor, selFocus);
    this.gridData.insertRow(t + 1, t + 1);
    this.gridData.setCell(1, t + 1, cellText.substring(selStart));
    this.gridData.setCell(l, t, cellText.substring(0, selStart))
    for (let x = l + 1; x <= this.gridData.right(); x++) {
      this.gridData.setCell(x - l + 1, t + 1, this.gridData.cell(x, t));
      this.gridData.setCell(x, t, '');
    }
    if (isEditing) {
      this.selectText(1, t + 1, selAnchor - selStart, selFocus - selStart);
    } else {
      this.select(1, t + 1, this.selRight() - l + 1, t + 1);
    }
  }

  moveTo(x, y) {
    this.anchorX = x;
    this.anchorY = y;
    this.x = x;
    this.y = y;
    if (this.suppressRender > 0) {
      return;
    }
    this.render();
    const cellNode = this.element.firstElementChild.rows[y].cells[x];
    cellNode.focus();
    setTimeout(() => window.getSelection()
        .setBaseAndExtent(cellNode, 0, cellNode,
            childrenCountWithoutBr(cellNode)));
  }

  refresh() {
    this.rowHeights.clear();
  }

  render() {
    if (this.suppressRender > 0) {
      return;
    }
    const r = this.gridData.right();
    const w = Math.max(5, r + 2, this.x + 1, this.anchorX + 1);
    const b = this.gridData.bottom();
    const h = Math.max(5, b + 2, this.y + 1, this.anchorY + 1);
    let table = this.element.firstElementChild;
    if (!table || table.tagName != 'TABLE') {
      table = document.createElement('table');
      table.setAttribute('tabindex', '-1');
      this.element.innerHTML = '';
      this.element.appendChild(table);
      table.style.maxHeight =
          this.element.getAttribute('max-height')
          || (window.innerHeight - 8
              - this.element.getBoundingClientRect().top)
             + 'px';
      table.style.width =
          this.element.getAttribute('width');
      table.addEventListener('scroll', () => this.render());
    }
    while (table.rows.length > h) {
      table.deleteRow(-1);
    }
    const tableTop =
        table.getBoundingClientRect().top;
    for (let y = 0; y < h; y++) {
      const row = (y < table.rows.length)
          ? table.rows[y] : table.insertRow();
      if (row.getBoundingClientRect().top - tableTop
          > screen.height * 2) {
        break;
      }
      const rowHeight = this.getRowHeight(y);
      if (rowHeight == 0) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
      if (row.getBoundingClientRect().bottom
          < tableTop) {
        continue;
      }
      while (row.cells.length > w) {
        row.deleteCell(-1);
      }
      for (let x = 0; x < w; x++) {
        let cell;
        if (x < row.cells.length) {
          cell = row.cells[x];
        } else {
          cell = document.createElement(
              (x == 0 || y == 0) ? 'th' : 'td');
          cell.dataset.x = x;
          cell.dataset.y = y;            
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
        this.renderCell(cell, x, y);
      }
    }
  }

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
        html = (x <= this.gridData.right()) ? x.toString() : '&nbsp;';
      } else if (x == 0) {
        html = (y <= this.gridData.bottom()) ? y.toString() : '&nbsp;';
      } else if (!isEditing) {
        html = this.gridData.cell(x, y).split('\n')
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
    if (x1 != x2 || y1 != y2) {
      blurActiveElement();
      this.element.firstElementChild.focus();
      this.isEditing = false;
    }
    this.anchorX = x1;
    this.anchorY = y1;
    this.x = x2;
    this.y = y2;
    this.render();
  }

  selectAll() {
    this.select(1, 1, this.gridData.right(), this.gridData.bottom());
  }

  selectCol(l, r) {
    this.select(l, 1, r, this.gridData.bottom());
  }

  selectRow(t, b) {
    this.select(1, t, this.gridData.right(), b);
  }

  selectText(x, y, selAnchor, selFocus) {
    this.anchorX = x;
    this.anchorY = y;
    this.x = x;
    this.y = y;
    this.render();
    const cellNode = this.element.firstElementChild.rows[y].cells[x];
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

  setCell(x, y, value) {
    this.gridData.setCell(x, y, value);
    this.render();
  }

  setRowHeight(y, h) {
    this.rowHeights.set(y - 0, h - 0);
  }

  updateSelectedCells(callback) {
    const l = this.selLeft();
    const t = this.selTop();
    const r = this.selRight();
    const b = this.selBottom();
    for (let y = t; y <= b; y++) {
      for (let x = l; x <= r; x++) {
        this.gridData.setCell(x, y, callback(this.gridData.cell(x, y)));
      }
    }
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

function gridKeyDown(event, grid) {
  const key = event.key;
  if (event.ctrlKey) {
    if (key == ' ') {
      grid.selectCol(grid.selLeft(), grid.selRight());
      event.preventDefault();
    } else if (key == 'a') {
      grid.selectAll()
      event.preventDefault();
    } else if (key == 'Backspace') {
      grid.connectCells(grid.selection());
      event.preventDefault();
    } else if (key == 'Delete') {
      const isEditing = grid.isEditing;
      if (isEditing) {
        blurActiveElement();
      }
      if (event.shiftKey) {
        grid.gridData.deleteCellUp(grid.selection());
      } else {
        grid.gridData.deleteCellLeft(grid.selection());
      }
      grid.render();
      if (isEditing) {
        grid.moveTo(grid.selLeft(), grid.selTop());
      }
      event.preventDefault();
    } else if (key == 'Enter') {
      if (grid.isEditing) {
        const selection = window.getSelection();
        const p1 = getInCellOffset(selection.anchorNode, selection.anchorOffset);
        const p2 = getInCellOffset(selection.focusNode, selection.focusOffset);
        grid.insertRowAtCursor(p1, p2);
      } else {
        grid.insertRowAtCursor(0, 0);
      }
      event.preventDefault();
    } else if (key == 'Insert') {
      const isEditing = grid.isEditing;
      if (isEditing) {
        blurActiveElement();
      }
      if (event.shiftKey) {
        grid.gridData.insertCellDown(grid.selection());
      } else {
        grid.gridData.insertCellRight(grid.selection());
      }
      grid.render();
      if (isEditing) {
        grid.moveTo(grid.selLeft(), grid.selTop());
      }
      event.preventDefault();
    }
    return;
  } else if (event.shiftKey) {
    if (key == ' ') {
      grid.selectRow(grid.selTop(), grid.selBottom());
      event.preventDefault();
    } else if (key == 'Enter') {
      grid.insertRow(grid.selTop(), grid.selBottom(), true);
      event.preventDefault();
    }
  }

  if (key != "ArrowDown" && key != "ArrowLeft"
      && key != "ArrowRight" && key != "ArrowUp"
      && key != "Enter") {
    return;
  }
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

  if (key == "ArrowDown") {
    if (cellNode == null || containsLastLine(selection, cellNode)) {
      if (event.shiftKey) {
        grid.select(grid.anchorX, grid.anchorY, x, y + 1);
      } else {
        grid.moveTo(x, y + 1);
      }
      event.preventDefault();
    }
  } else if (key == "ArrowLeft") {
    if (x > 1 && (cellNode == null || containsFirstPosition(selection, cellNode))) {
      if (event.shiftKey) {
        grid.select(grid.anchorX, grid.anchorY, x - 1, y);
      } else {
        grid.moveTo(x - 1, y);
      }
      event.preventDefault();
    }
  } else if (key == "ArrowRight") {
    if (cellNode == null || containsLastPosition(selection, cellNode)) {
      if (event.shiftKey) {
        grid.select(grid.anchorX, grid.anchorY, x + 1, y);
      } else {
        grid.moveTo(x + 1, y);
      }
      event.preventDefault();
    }
  } else if (key == "ArrowUp") {
    if (y > 1 && (cellNode == null || containsFirstLine(selection, cellNode))) {
      if (event.shiftKey) {
        grid.select(grid.anchorX, grid.anchorY, x, y - 1);
      } else {
        grid.moveTo(x, y - 1);
      }
      event.preventDefault();
    }
  } else if (key == "Enter") {
    if (event.altKey) {
      if (cellNode == null) {
        return;
      }
      selection.deleteFromDocument();
      const focusNode = selection.focusNode;
      if (focusNode == cellNode) {
        const focusOffset = selection.focusOffset;
        cellNode.insertBefore(
            document.createElement('br'),
            cellNode.childNodes[focusOffset]);
        selection.setBaseAndExtent(
            cellNode, focusOffset + 1, cellNode,
            focusOffset + 1);
      } else {
        cellNode.insertBefore(
            document.createTextNode(
                focusNode.textContent.substring(
                    0, selection.focusOffset)),
            focusNode);
        cellNode.insertBefore(
           document.createElement('br'), focusNode);
        focusNode.textContent =
           focusNode.textContent.substring(
               selection.focusOffset);
        if (focusNode.textContent == ''
            && focusNode.nextSibling == null) {
          cellNode.appendChild(
              document.createElement('br'));
        }
      }
      grid.setCell(x, y, parseCellInput(cellNode));
    } else if (cellNode != null
        && containsFirstPosition(selection,
                                 cellNode)
        && containsLastPosition(selection,
                                cellNode)) {
      selection.collapseToEnd();
    } else {
      grid.moveTo(x, y);
    }
    event.preventDefault();
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

function inputBoxMultiLine(message, element) {
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    const divMessage =
        document.createElement('div');
    divMessage.append(message);
    const divTextarea =
        document.createElement('div');
    const textarea =
        document.createElement('textarea');
    divTextarea.append(textarea);
    const divButtons =
        document.createElement('div');
    const ok = document.createElement('button');
    ok.value = 'ok';
    ok.append('OK');
    const cancel = document.createElement('button');
    cancel.value = 'cancel';
    cancel.append('Cancel');
    divButtons.append(ok, cancel);
    dialog.append(
        divMessage, divTextarea, divButtons);
    element.append(dialog);

    ok.addEventListener('click', () => {
      dialog.close();
      element.removeChild(dialog);
      resolve(textarea.value);
    });
    cancel.addEventListener('click', () => {
      dialog.close();
      element.removeChild(dialog);    
      reject('Cancelled.');
    });
    dialog.showModal();
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
    parseCsv(reader.result, grid.gridData);
    grid.render();
  });  
}

function saveAs(fileName, gridData) {
  const blob = new Blob(
      [toCsv(gridData, gridData.range())],
      {type: "text/csv"});
  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, fileName);
    return false;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.download = fileName;
  a.href = url;
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

async function runMacro(macro, macroMap, grid) {
  const gridData = grid.gridData;
  const env = new Environment();
  env.set('Bottom=/0', () => gridData.bottom());
  env.set('Bottom=/1',
      a => gridData.setBottom(a));
  env.set('Col=/0', () => grid.x);
  env.set('Col=/1', a => grid.moveTo(a, grid.y));
  env.set('ConnectCell/0', () => grid.connectCells(grid.selection()));
  env.set('Copy/0', () => clipText =
      toCsv(gridData, grid.selection()));
  env.set('CopyAvr/0', () => clipText =
      gridData.sumAndAvr(grid.selection()).avr.toString());
  env.set('CopySum/0', () => clipText =
      gridData.sumAndAvr(grid.selection()).sum.toString());
  env.set('Cut/0', () => {
    const range = grid.selection();
    clipText = toCsv(gridData, range);
    gridData.clearCells(range);
  });
  env.set('CutCol/0', () => gridData.deleteCol(
      grid.selLeft(), grid.selRight()));
  env.set('CutRow/0', () => gridData.deleteRow(
      grid.selTop(), grid.selBottom()));
  env.set('DeleteCellLeft/0', () =>
      gridData.deleteCellLeft(grid.selection()));
  env.set('DeleteCellUp/0', () =>
      gridData.deleteCellUp(grid.selection()));
  env.set('DeleteCol/1',
      a => gridData.deleteCol(a, a));
  env.set('DeleteRow/1',
      a => gridData.deleteRow(a, a));
  env.set('Enter/0',
      () => grid.insertRowAtCursor(0, 0));
  env.set('GetColWidth/0', () => grid.defaultColWidth);
  env.set('GetColWidth/1', a => {
    const colWidth = grid.colWidths.get(a - 0);
    return colWidth != null
        ? colWidth : grid.defaultColWidth;
  });
  env.set('GetRowHeight/0',
      () => gridData.defaultRowHeight);
  env.set('GetRowHeight/1', a => grid.getRowHeight(a));
  env.set('InputBox/1', a => prompt(a));
  env.set('InputBox/2', (a, b) => prompt(a, b));
  env.set('InputBoxMultiLine/1',
      a => inputBoxMultiLine(a, grid));
  env.set('InsCol/0', () => grid.insertCol(grid.selLeft(), grid.selRight(), true));
  env.set('InsRow/0', () => grid.insertRow(grid.selTop(), grid.selBottom(), true));
  env.set('InsertCellDown/0', () => gridData.insertCellDown(grid.selection()));
  env.set('InsertCellRight/0', () => gridData.insertCellRight(grid.selection()));
  env.set('InsertCol/1', a => grid.insertCol(a, a, false));
  env.set('InsertCol/2', (a, b) => grid.insertCol(a, b, false));
  env.set('InsertRow/1', a => grid.insertRow(a, a, false));
  env.set('InsertRow/2', (a, b) => grid.insertRow(a, b, false));
  env.set('MessageBox/1', a => alert(a));
  env.set('New/0', () => grid.clear());
  env.set('NewLine/0', () => gridData.setCell(
      grid.x, grid.y, '\n'));
  env.set('Paste/0', () => {
    const clipData = new GridData();
    parseCsv(clipText, clipData);
    gridData.paste(clipText, clipData, grid.selection(), -1);
  });
  env.set('Paste/1', a => {
    const clipData = new GridData();
    parseCsv(clipText, clipData);
    gridData.paste(clipText, clipData, grid.selection(), a);
  });
  env.set('Refresh/0', () => grid.refresh());
  env.set('ReplaceAll/2', (a, b) => gridData.replaceAll(a, b, false, false, false, gridData.range()));
  env.set('ReplaceAll/5', (a, b, c, d, e) => gridData.replaceAll(a, b, c, d, e, gridData.range()));
  env.set('ReplaceAll/9', (a, b, c, d, e, f, g, h, i) => gridData.replaceAll(a, b, c, d, e, new Range(f, g, h, i)));
  env.set('Right=/0', () => gridData.right());
  env.set('Right=/1', a => gridData.setRight(a));
  env.set('Row=/0', () => grid.y);
  env.set('Row=/1', a => grid.moveTo(grid.x, a));
  env.set('SaveAs/1', a => saveAs(a, gridData));
  env.set('SelBottom=/0',
      () => grid.selBottom());
  env.set('SelBottom=/1', a => grid.select(
      grid.selLeft(),
      Math.min(a, grid.selTop()),
      grid.selRight(), a));
  env.set('SelLeft=/0',
      () => grid.selLeft());
  env.set('SelLeft=/1', a => grid.select(
      a, grid.selTop(),
      Math.max(a, grid.selRight()),
      grid.selBottom()));
  env.set('SelRight=/0',
      () => grid.selRight());
  env.set('SelRight=/1', a => grid.select(
      Math.min(a, grid.selLeft()),
      grid.selTop(),
      a, grid.selBottom()));
  env.set('SelTop=/0', () => grid.selTop());
  env.set('SelTop=/1', a => grid.select(
      grid.selLeft(), a,
      grid.selRight(),
      Math.max(a, grid.selBottom())));
  env.set('Select/4',
      (a, b, c, d) => grid.select(a, b, c, d));
  env.set('SelectAll/0', () => grid.selectAll());
  env.set('SelectCol/0', () => grid.selectCol(grid.selLeft(), grid.selRight()));
  env.set('SelectRow/0', () => grid.selectRow(grid.selTop(), grid.selBottom()));
  env.set('SequenceS/0', () => gridData.sequenceS(grid.selection()));
  env.set('SequenceC/0', () => gridData.sequenceC(grid.selection()));
  env.set('SetColWidth/1', a => {
    grid.colWidths.clear();
    grid.defaultColWidth = a;
  });
  env.set('SetColWidth/2', (a, b) =>
      grid.colWidths.set(a - 0, b - 0));
  env.set('SetRowHeight/1', a => {
    grid.rowHeights.clear();
    grid.defaultRowHeight = a;
  });
  env.set('SetRowHeight/2',
      (a, b) => grid.setRowHeight(a, b));
  env.set('Sort/9', (a, b, c, d, e, f, g, h, i) => gridData.sort(new Range(a, b, c, d), e, f, g, h, i));
  env.set('TransChar0/0', () => grid.updateSelectedCells(toHankakuAlphabet));
  env.set('TransChar1/0', () => grid.updateSelectedCells(toZenkakuAlphabet));
  env.set('TransChar2/0',
      () => grid.updateSelectedCells(
          value => value.toUpperCase()));
  env.set('TransChar3/0',
      () => grid.updateSelectedCells(
          value => value.toLowerCase()));    
  env.set('TransChar4/0', () => grid.updateSelectedCells(toHankakuKana));
  env.set('TransChar5/0', () => grid.updateSelectedCells(toZenkakuKana));
  env.set('avr/4', (a, b, c, d) => gridData.sumAndAvr(new Range(a, b, c, d)).avr);
  env.set('cell/2', (a, b) => {
    const value = gridData.cell(a, b);
    if ((value - 0).toString() == value) {
      return value - 0;
    }
    return value;
  });
  env.set('cell=/3',
      (a, b, c) => gridData.setCell(a, b, c));
  env.set('move/2', (a, b) => grid.moveTo(grid.x + a, grid.y + b));
  env.set('moveto/2', (a, b) => grid.moveTo(a, b));
  env.set('random/1',
      a => Math.floor(Math.random() * a));
  env.set('sum/4', (a, b, c, d) => gridData.sumAndAvr(new Range(a, b, c, d)).sum);
  env.set('write/1', a => {
    gridData.setCell(grid.x, grid.y, a);
    grid.moveTo(grid.x + 1, grid.y);
  });
  env.set('writeln/1', a => {
    gridData.setCell(grid.x, grid.y, a);
    grid.moveTo(1, grid.y + 1);
  });
  if (macro) {
    grid.suppressRender++;
    try {
      await run(macro, env, macroMap);
    } catch(e) {
      alert(e);
      throw e;
    } finally {
      grid.suppressRender--;
    }
  }
  grid.render();
}

function init() {
  for (const element of document
      .getElementsByTagName('cassava-grid')) {
    const grid = new Grid(element, new GridData());
    element.addEventListener('focusin', event => gridFocusIn(event, grid));
    element.addEventListener('focusout', event => gridFocusOut(event, grid));
    element.addEventListener('keydown', event => gridKeyDown(event, grid));
    element.addEventListener('mousedown', event => gridMouseDown(event, grid));
    element.addEventListener('mousemove', event => gridMouseMove(event, grid));
    element.addEventListener('mouseup', event => gridMouseUp(event, grid));
    element.addEventListener('input', event => gridInput(event, grid));
    element.addEventListener('touchmove',
        event => gridTouchMove(event, grid),
        {passive: true});
    element.addEventListener('touchend', event => gridTouchMove(event, grid));
    element.open = (file, encoding) => open(file, encoding, grid);
    element.runCommand = (command, ...args) =>
        runMacro(command + '('
                 + args.map(toMacroParam).join(',')
                 + ')',
                 macroMap, grid);
    element.runMacro = (macro, macroMap) =>
        runMacro(macro, macroMap, grid);
    grid.render();
  }
}

window.net = window.net || {};
net.asukaze = net.asukaze || {};
net.asukaze.cassava = net.asukaze.cassava || {};
net.asukaze.cassava.init = init;

window.addEventListener('DOMContentLoaded', init);

// #ifdef MODULE
// export { init };
// #else
})();
// #endif
