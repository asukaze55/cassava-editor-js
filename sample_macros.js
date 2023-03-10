macroMap.set('lib/Array.cms', `
class Array {
  constructor() {
    this.length = 0;
  }

  concat(array) {
    result = new Array();
    for (i = 0; i < this.length; i++) {
      result.push(this[i]);
    }
    for (i = 0; i < array.length; i++) {
      result.push(array[i]);
    }
    return result;
  }

  filter(callback) {
    result = new Array();
    for (i = 0; i < this.length; i++) {
      if (callback(this[i])) {
        result.push(this[i]);
      }
    }
    return result;
  }

  findIndex(callback) {
    for (i = 0; i < this.length; i++) {
      if (callback(this[i])) {
        return i;
      }
    }
    return -1;
  }

  includes(searchElement) {
    return this.indexOf(searchElement) >= 0;
  }

  indexOf(searchElement) {
    for (i = 0; i < this.length; i++) {
      if (this[i] == searchElement) {
        return i;
      }
    }
    return -1;
  }

  join(separator) {
    result = "";
    for (i = 0; i < this.length; i++) {
      if (i > 0) {
        result += separator;
      }
      result += this[i];
    }
    return result;
  }

  lastIndexOf(searchElement) {
    for (i = this.length - 1; i >= 0; i--) {
      if (this[i] == searchElement) {
        return i;
      }
    }
    return -1;
  }

  map(callback) {
    result = new Array();
    for (i = 0; i < this.length; i++) {
      result.push(callback(this[i]));
    }
    return result;
  }

  pop() {
    if (this.length == 0) {
      return "";
    }
    this.length--;
    return this[this.length];
  }

  push(element) {
    this[this.length] = element;
    this.length++;
    return this.length;
  }

  reverse() {
    i = 0;
    j = this.length - 1;
    while (i < j) {
      swap(this[i], this[j]);
      i++;
      j--;
    }
    return this;
  }

  shift() {
    if (this.length == 0) {
      return "";
    }
    result = this[0];
    this.length--;
    for (i = 0; i < this.length; i++) {
      this[i] = this[i + 1];
    }
    return result;
  }

  slice(begin, end) {
    result = new Array();
    if (begin < 0) {
      begin += this.length;
    }
    if (end < 0) {
      end += this.length;
    }
    for (i = max(begin, 0); i < min(end, this.length); i++) {
      result.push(this[i]);
    }
    return result;
  }

  splice(start, deleteCount, ...items) {
    if (start < 0) {
      start += this.length;
    }
    if (start + deleteCount > this.length) {
      deleteCount = this.length - start;
    }
    deletedItems = this.slice(start, start + deleteCount);
    lengthChange = items.length - deleteCount;
    if (lengthChange > 0) {
      for (i = this.length - 1; i >= start + deleteCount; i--) {
        this[i + lengthChange] = this[i];
      }
    } else if (lengthChange < 0) {
      for (i = start + deleteCount; i < this.length; i++) {
        this[i + lengthChange] = this[i];
      }
    }
    for (i = 0; i < items.length; i++) {
      this[i + start] = items[i];
    }
    this.length += lengthChange;
    return deletedItems;
  }

  unshift(element) {
    for (i = this.length; i > 0; i--) {
      this[i] = this[i - 1];
    }
    this[0] = element;
    this.length++;
    return this.length;
  }
}

function split(str, separator) {
  array = new Array();
  while (str != "") {
    p = pos(str, separator);
    if (p > 0) {
      array.push(left(str, p - 1));
      str = mid(str, p + 1);
    } else {
      array.push(str);
      str = "";
    }
  }
  return array;
}

function arrayInputBox(message) {
  return split(InputBoxMultiLine(message), "\n");
}

function arrayFrom(from) {
  array = new Array();
  for (i = 0; i < from.length; i++) {
    array.push(from[i]);
  }
  return array;
}

function arrayOf(...args) {
  return arrayFrom(args);
}
`);

macroMap.set('lib/Assert.cms', `
class That {
  constructor(assert, actual) {
    this.assert = assert;
    this.actual = actual;
  }

  isEqualTo(expected) {
    if (expected == this.actual) {
      this.assert.passed++;
      this.assert.detail += expected + " = " + this.actual + "\n";
    } else {
      this.assert.detail += "FAILED: " + expected + " != " + this.actual + "\n";
    }
  }

  isTrue() {
    if (this.actual) {
      this.assert.passed++;
      this.assert.detail += "true: " + this.actual + "\n";
    } else {
      this.assert.detail += "FAILED: false: " + this.actual + "\n";
    }
  }

  isFalse() {
    if (this.actual) {
      this.assert.detail += "FAILED: true: " + this.actual + "\n";
    } else {
      this.assert.passed++;
      this.assert.detail += "false: " + this.actual + "\n";
    }
  }

  isGreaterThan(expected) {
    if (this.actual > expected) {
      this.assert.passed++;
      this.assert.detail += this.actual + " > " + expected + "\n";
    } else {
      this.assert.detail += "FAILED: " + this.actual + " <= " + expected + "\n";
    }
  }

  isLessThan(expected) {
    if (this.actual < expected) {
      this.assert.passed++;
      this.assert.detail += this.actual + " < " + expected + "\n";
    } else {
      this.assert.detail += "FAILED: " + this.actual + " >= " + expected + "\n";
    }
  }
}

class Assert {
  constructor() {
    this.tested = 0;
    this.passed = 0;
    this.name = "";
    this.detail = "";
  }

  setName(name) {
    this.name = ": " + name;
    return this;
  }

  that(actual) {
    this.tested++;
    return new That(this, actual);
  }

  showResult() {
    if (this.tested == this.passed) {
      MessageBox("OK" + this.name + "\n\n" + this.detail);
    } else {
      MessageBox("FAILED" + this.name + "\n\n" + this.detail);
    }
  }

  isFailed() {
    return this.tested != this.passed;
  }
}
`);

macroMap.set('lib/TestSuite.cms', `
import { Assert } from "lib/Assert.cms";

class TestSuite {
  constructor() {
    this.failed = false;
    this.detail = "";
  }

  run(testCase) {
    if (this.failed) {
      return;
    }
    var assert = new Assert().setName(testCase.name());
    testCase.test(assert);
    if (assert.isFailed()) {
      assert.showResult();
      this.failed = true;
    }
    this.detail += testCase.name() + " (" + assert.passed + "/" + assert.tested + ")\n";
  }

  showResult() {
    if (!this.failed) {
      MessageBox("OK\n\n" + this.detail);
    }
  }
}
`);

macroMap.set('????????????????????????', `
Right = int(InputBox("????????????????????????????????????", Right));
Bottom = int(InputBox("????????????????????????????????????", Bottom));
`);

macroMap.set('???????????????', `
???B = Bottom;

x = InputBox("?????????????????????????????????????????????", x);

for(y=1; y<=B; y++){
  str = [x,y];
  str = replace(str, "1", "???");
  str = replace(str, "???", "???");
  str = replace(str, "2", "???");
  str = replace(str, "???", "???");
  str = replace(str, "3", "???");
  str = replace(str, "???", "???");
  str = replace(str, "4", "???");
  str = replace(str, "???", "???");
  str = replace(str, "5", "???");
  str = replace(str, "???", "???");
  str = replace(str, "6", "???");
  str = replace(str, "???", "???");
  str = replace(str, "7", "???");
  str = replace(str, "???", "???");
  str = replace(str, "8", "???");
  str = replace(str, "???", "???");
  str = replace(str, "9", "???");
  str = replace(str, "???", "???");
  str = replace(str, "0", "???");
  str = replace(str, "???", "???");
  [x,y] = str;
}
`);

macroMap.set('??????', `
w = Right;
h = Bottom;
size = max(w, h);

for (y = 1; y <= size; y++) {
  for (x = y + 1; x <= size; x++) {
    swap([x,y], [y,x]);
  }
}

Right = h;
Bottom = w;
`);
