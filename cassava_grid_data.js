(() => {
const { createReplacer } = net.asukaze.import('./cassava_replacer.js');

function isNumber(value) {
  return value != '' && !isNaN(Number(value));
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

  copy(range) {
    const gridData = new GridData();
    gridData.data = [];
    gridData.maxColCount = range.right - range.left + 1;
    for (let y = range.top; y <= range.bottom; y++) {
      const row = this.data[y - 1];
      if (row) {
        gridData.data.push(row.slice(range.left - 1, range.right));
      } else {
        gridData.data.push([]);
      }
    }
    return gridData;
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

  paste(clipData, range) {
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = range.left; x <= range.right; x++) {
        this.setCell(x, y, clipData.cell(x - range.left + 1, y - range.top + 1));
      }
    }
  }

  pasteRepeat(clipData, range) {
    const clipCols = clipData.right();
    const clipRows = clipData.bottom();
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = range.left; x <= range.right; x++) {
        this.setCell(x, y, clipData.cell((x - range.left) % clipCols + 1, (y - range.top) % clipRows + 1));
      }
    }
  }

  range() {
    return new Range(1, 1, this.maxColCount, this.data.length);
  }

  replaceAll(str1, str2, ignoreCase, wholeCell, regex, range) {
    str1 = str1.toString();
    str2 = str2.toString();
    const replacer = createReplacer(str1.toString(), str2.toString(), ignoreCase, wholeCell, regex);
    for (let y = range.top; y <= range.bottom; y++) {
      if (this.data[y - 1] == null) {
        continue;
      }
      for (let x = range.left; x <= range.right; x++) {
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
        const step = Number(second) - Number(first);
        for (let y = range.top + 2; y <= range.bottom; y++) {
          this.setCell(x, y, Number(first) + (step * (y - range.top)));
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
          return Number(val1) - Number(val2)
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
        sum += Number(value);
        count++;
      }
    }
    return (count == 0) ? {sum :0, avr: 0}
                        : {sum, avr: sum / count};
  }
}

net.asukaze.export({ GridData, Range, isNumber });
})();
