// #ifdef MODULE
// import { GridData, Range } from './cassava_grid_data.js';
// #else
(() => {
const GridData = net.asukaze.cassava.GridData;
const Range = net.asukaze.cassava.Range;  
// #endif

class Action {
  /** @type {Range} */
  redoRange;
  /** @type {Range} */
  undoRange;
  /** @param {GridData} gridData */
  redo(gridData) {}
  /** @param {GridData} gridData */
  undo(gridData) {}
}

/** @extends {Action} */
class BatchUndoAction {
  constructor(actions, undoRange, redoRange) {
    this.actions = actions;
    this.undoRange = undoRange;
    this.redoRange = redoRange;
  }

  redo(gridData) {
    for (const action of this.actions) {
      action.redo(gridData);
    }
  }

  undo(gridData) {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo(gridData);
    }
  }
}

/** @extends {Action} */
class SetCellUndoAction {
  constructor(x, y, from, to, right, bottom) {
    this.x = x;
    this.y = y;
    this.from = from;
    this.to = to;
    this.right = right;
    this.bottom = bottom;
    const range = new Range(this.x, this.y, this.x, this.y);
    this.undoRange = range;
    this.redoRange = range;
  }

  redo(gridData) {
    gridData.setCell(this.x, this.y, this.to);
  }

  undo(gridData) {
    gridData.setRight(this.right);
    gridData.setBottom(this.bottom);
    gridData.setCell(this.x, this.y, this.from);
  }
}

/** @extends {Action} */
class UndoAction {
  constructor(undo, redo, range) {
    this.undo = undo;
    this.redo = redo;
    this.undoRange = range;
    this.redoRange = range;
  }
}

class UndoGrid {
  constructor(gridData) {
    this.gridData = gridData;
    this.redoList = [];
    this.undoList = [];
    this.undoGroups = [];
  }

  bottom() {
    return this.gridData.bottom();
  }

  cell(x, y) {
    return this.gridData.cell(x, y);
  }

  clear() {
    this.gridData.clear();
    this.redoList = [];
    this.undoList = [];
    this.undoGroups = [];
  }

  clearCells(range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.clearCells(range),
        range));
  }

  deleteCellLeft(range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertCellRight(range);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteCellLeft(range),
        range));
  }

  deleteCellUp(range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertCellDown(range);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteCellUp(range),
        range));
  }

  deleteCol(l, r) {
    const range = new Range(l, 1, r, this.gridData.bottom());
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertCol(l, r);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteCol(l, r),
        range));
  }

  deleteRow(t, b) {
    const range = new Range(1, t, this.gridData.right(), b);
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertRow(t, b);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteRow(t, b),
        range));
  }

  /** @param {Action} action */
  do(action) {
    action.redo(this.gridData);
    this.undoList.push(action);
    this.redoList = [];
  }

  insertCellDown(range) {
    this.do(new UndoAction(
        gridData => gridData.deleteCellUp(range),
        gridData => gridData.insertCellDown(range),
        range));
  }

  insertCellRight(range) {
    this.do(new UndoAction(
        gridData => gridData.deleteCellLeft(range),
        gridData => gridData.insertCellRight(range),
        range));
  }

  insertCol(l, r) {
    this.do(new UndoAction(
        gridData => gridData.deleteCol(l, r),
        gridData => gridData.insertCol(l, r),
        new Range(l, 1, r, this.gridData.bottom())));
  }

  insertRow(t, b) {
    this.do(new UndoAction(
        gridData => gridData.deleteRow(t, b),
        gridData => gridData.insertRow(t, b),
        new Range(1, t, this.gridData.right(), b)));
  }

  paste(clipData, range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.paste(clipData, range),
        range));
  }

  pasteRepeat(clipData, range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.pasteRepeat(clipData, range),
        range));
  }

  pop(undoRange, redoRange) {
    if (this.undoList.length == 0) {
      this.undoList = this.undoGroups.pop() || [];
    } else {
      const action = new BatchUndoAction(this.undoList, undoRange, redoRange);
      this.undoList = this.undoGroups.pop() || [];
      this.undoList.push(action);
    }
  }

  push() {
    this.undoGroups.push(this.undoList);
    this.undoList = [];
  }

  range() {
    return this.gridData.range();
  }

  /** @returns {Range?} */
  redo() {
    if (this.redoList.length == 0) {
      return;
    }
    const action = this.redoList.pop();
    this.undoList.push(action);
    action.redo(this.gridData);
    return action.redoRange;
  }

  replaceAll(str1, str2, ignoreCase, wholeCell, regex, range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.replaceAll(str1, str2, ignoreCase, wholeCell, regex, range),
        range));
  }

  right() {
    return this.gridData.right();
  }

  sequenceC(range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.sequenceC(range),
        range));
  }

  sequenceS(range) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.sequenceS(range),
        range));
  }

  setBottom(b) {
    const originalBottom = this.gridData.bottom();
    if (b < originalBottom) {
      this.deleteRow(b + 1, originalBottom);
    } else if (b > originalBottom) {
      this.insertRow(originalBottom + 1, b);
    }
  }

  setCell(x, y, value) {
    const stringValue = value.toString();
    const prevAction = this.undoList.at(-1);
    if (prevAction instanceof SetCellUndoAction && prevAction.x == x && prevAction.y == y) {
      prevAction.to = stringValue;
      this.gridData.setCell(x, y, stringValue);
    } else {
      this.do(new SetCellUndoAction(x, y,
          this.gridData.cell(x, y), stringValue,
          this.gridData.right(), this.gridData.bottom()));
    }
  }

  setRight(r) {
    const originalRight = this.gridData.right();
    if (r < originalRight) {
      this.deleteCol(r + 1, originalRight);
    } else if (r > originalRight) {
      this.insertCol(originalRight + 1, r);
    }
  }

  sort(range, p, dir, num, ignoreCase, zenhan) {
    const deletedData = this.gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.sort(range, p, dir, num, ignoreCase, zenhan),
        range));
  }

  sumAndAvr(range) {
    return this.gridData.sumAndAvr(range);
  }

  /** @returns {Range?} */
  undo() {
    let action;
    if (this.undoList.length > 0) {
      action = this.undoList.pop();
    } else if (this.undoGroups.length > 0
               && this.undoGroups.at(-1).length > 0) {
      action = this.undoGroups.at(-1).pop();
    } else {
      return;
    }
    this.redoList.push(action);
    action.undo(this.gridData);
    return action.undoRange;
  }
}

// #ifdef MODULE
// export { UndoGrid };
// #else
window.net = window.net || {};
net.asukaze = net.asukaze || {};
net.asukaze.cassava = net.asukaze.cassava || {};
net.asukaze.cassava.UndoGrid = UndoGrid;
})();
// #endif
