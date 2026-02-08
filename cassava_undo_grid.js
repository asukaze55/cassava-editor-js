net.asukaze.module((module, require) => {
const { GridData, Range } = require('./cassava_grid_data.js');

/**
 * @typedef {{redo(gridData: GridData): Range, undo(gridData: GridData): Range}} Action
 */

/** @extends {Action} */
class BatchUndoAction {
  /** @type {Array<Action>} */
  #actions;
  /** @type {Range} */
  #undoRange;
  /** @type {Range} */
  #redoRange;

  /**
   * @param {Array<Action>} actions
   * @param {Range} undoRange
   * @param {Range} redoRange
   */
  constructor(actions, undoRange, redoRange) {
    this.#actions = actions;
    this.#undoRange = undoRange;
    this.#redoRange = redoRange;
  }

  /** @param {GridData} gridData */
  redo(gridData) {
    for (const action of this.#actions) {
      action.redo(gridData);
    }
    return this.#redoRange;
  }

  /** @param {GridData} gridData */
  undo(gridData) {
    for (let i = this.#actions.length - 1; i >= 0; i--) {
      this.#actions[i].undo(gridData);
    }
    return this.#undoRange;
  }
}

/** @extends {Action} */
class SetCellUndoAction {
  /** @type {string} */
  #from;
  /** @type {number} */
  #right;
  /** @type {number} */
  #bottom;
  /** @type {Range} */
  #range;

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} from
   * @param {string} to
   * @param {number} right
   * @param {number} bottom
   */
  constructor(x, y, from, to, right, bottom) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
    this.#from = from;
    /** @type {string} */
    this.to = to;
    this.#right = right;
    this.#bottom = bottom;
    this.#range = new Range(x, y, x, y);
  }

  /** @param {GridData} gridData */
  redo(gridData) {
    gridData.setCell(this.x, this.y, this.to);
    return this.#range;
  }

  /** @param {GridData} gridData */
  undo(gridData) {
    gridData.setRight(this.#right);
    gridData.setBottom(this.#bottom);
    gridData.setCell(this.x, this.y, this.#from);
    return this.#range;
  }
}

/** @extends {Action} */
class UndoAction {
  /** @type {(gridData: GridData) => void} */
  #undo;
  /** @type {(gridData: GridData) => void} */
  #redo;
  /** @type {Range} */
  #range;

  /**
   * @param {(gridData: GridData) => void} undo
   * @param {(gridData: GridData) => void} redo
   * @param {Range} range
   */
  constructor(undo, redo, range) {
    this.#undo = undo;
    this.#redo = redo;
    this.#range = range;
  }

  /**
   * @param {GridData} gridData
   * @returns {Range}
   */
  redo(gridData) {
    this.#redo(gridData);
    return this.#range;
  }

  /**
   * @param {GridData} gridData
   * @returns {Range}
   */
  undo(gridData) {
    this.#undo(gridData);
    return this.#range;
  }
}

class UndoGrid {
  /** @type {GridData} */
  #gridData;
  /** @type {Array<Action>} */
  #redoList = [];
  /** @type {Array<Action>} */
  #undoList = [];
  /** @type {Array<Array<Action>>} */
  #undoGroups = [];

  /** @param {GridData} gridData */
  constructor(gridData) {
    this.#gridData = gridData;
  }

  /** @returns {number} */
  bottom() {
    return this.#gridData.bottom();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  cell(x, y) {
    return this.#gridData.cell(x, y);
  }

  clear() {
    this.#gridData.clear();
    this.#redoList = [];
    this.#undoList = [];
    this.#undoGroups = [];
  }

  /** @param {Range} range */
  clearCells(range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.clearCells(range),
        range));
  }

  /** @param {Range} range */
  deleteCellLeft(range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertCellRight(range);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteCellLeft(range),
        range));
  }

  /** @param {Range} range */
  deleteCellUp(range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertCellDown(range);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteCellUp(range),
        range));
  }

  /**
   * @param {number} l
   * @param {number} r
   */
  deleteCol(l, r) {
    const range = new Range(l, 1, r, this.#gridData.bottom());
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => {
          gridData.insertCol(l, r);
          gridData.paste(deletedData, range);
        },
        gridData => gridData.deleteCol(l, r),
        range));
  }

  /**
   * @param {number} t
   * @param {number} b
   */
  deleteRow(t, b) {
    const range = new Range(1, t, this.#gridData.right(), b);
    const deletedData = this.#gridData.copy(range);
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
    action.redo(this.#gridData);
    this.#undoList.push(action);
    this.#redoList = [];
  }

  gridData() {
    return this.#gridData;
  }

  /** @param {Range} range */
  insertCellDown(range) {
    this.do(new UndoAction(
        gridData => gridData.deleteCellUp(range),
        gridData => gridData.insertCellDown(range),
        range));
  }

  /** @param {Range} range */
  insertCellRight(range) {
    this.do(new UndoAction(
        gridData => gridData.deleteCellLeft(range),
        gridData => gridData.insertCellRight(range),
        range));
  }

  /**
   * @param {number} l
   * @param {number} r
   */
  insertCol(l, r) {
    this.do(new UndoAction(
        gridData => gridData.deleteCol(l, r),
        gridData => gridData.insertCol(l, r),
        new Range(l, 1, r, this.#gridData.bottom())));
  }

  /**
   * @param {number} t
   * @param {number} b
   */
  insertRow(t, b) {
    this.do(new UndoAction(
        gridData => gridData.deleteRow(t, b),
        gridData => gridData.insertRow(t, b),
        new Range(1, t, this.#gridData.right(), b)));
  }

  /**
   * @param {GridData} clipData
   * @param {Range} range
   */
  paste(clipData, range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.paste(clipData, range),
        range));
  }

  /**
   * @param {GridData} clipData
   * @param {Range} range
   */
  pasteRepeat(clipData, range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.pasteRepeat(clipData, range),
        range));
  }

  /**
   * @param {Range} undoRange
   * @param {Range} redoRange
   */
  pop(undoRange, redoRange) {
    if (this.#undoList.length == 0) {
      this.#undoList = this.#undoGroups.pop() || [];
    } else {
      const action = new BatchUndoAction(this.#undoList, undoRange, redoRange);
      this.#undoList = this.#undoGroups.pop() || [];
      this.#undoList.push(action);
    }
  }

  push() {
    this.#undoGroups.push(this.#undoList);
    this.#undoList = [];
  }

  /** @returns {Range} */
  range() {
    return this.#gridData.range();
  }

  /** @returns {Range?} */
  redo() {
    if (this.#redoList.length == 0) {
      return;
    }
    const action = this.#redoList.pop();
    this.#undoList.push(action);
    return action.redo(this.#gridData);
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
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.replaceAll(
            str1, str2, ignoreCase, wholeCell, isRegex, range),
        range));
  }

  /** @returns {number} */
  right() {
    return this.#gridData.right();
  }

  /** @param {Range} range */
  sequenceC(range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.sequenceC(range),
        range));
  }

  /** @param {Range} range */
  sequenceS(range) {
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.sequenceS(range),
        range));
  }

  /** @param {number} b */
  setBottom(b) {
    const originalBottom = this.#gridData.bottom();
    if (b < originalBottom) {
      this.deleteRow(b + 1, originalBottom);
    } else if (b > originalBottom) {
      this.insertRow(originalBottom + 1, b);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {any} value
   */
  setCell(x, y, value) {
    const stringValue = String(value).replaceAll('\r\n', '\n');
    const prevAction = this.#undoList.at(-1);
    if (prevAction instanceof SetCellUndoAction && prevAction.x == x && prevAction.y == y) {
      prevAction.to = stringValue;
      this.#gridData.setCell(x, y, stringValue);
    } else {
      this.do(new SetCellUndoAction(x, y,
          this.#gridData.cell(x, y), stringValue,
          this.#gridData.right(), this.#gridData.bottom()));
    }
  }

  /** @param {number} r */
  setRight(r) {
    const originalRight = this.#gridData.right();
    if (r < originalRight) {
      this.deleteCol(r + 1, originalRight);
    } else if (r > originalRight) {
      this.insertCol(originalRight + 1, r);
    }
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
    const deletedData = this.#gridData.copy(range);
    this.do(new UndoAction(
        gridData => gridData.paste(deletedData, range),
        gridData => gridData.sort(range, p, dir, num, ignoreCase, zenhan),
        range));
  }

  /** @param {Range} range */
  sumAndAvr(range) {
    return this.#gridData.sumAndAvr(range);
  }

  /** @returns {Range?} */
  undo() {
    let action;
    if (this.#undoList.length > 0) {
      action = this.#undoList.pop();
    } else if (this.#undoGroups.length > 0
               && this.#undoGroups.at(-1).length > 0) {
      action = this.#undoGroups.at(-1).pop();
    } else {
      return;
    }
    this.#redoList.push(action);
    return action.undo(this.#gridData);
  }
}

module.exports = { UndoGrid };
});
