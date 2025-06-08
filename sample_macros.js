for (const grid of document.getElementsByTagName('cassava-grid')) {

grid.addMacro('!statusbar.cms', String.raw`
function init() {
  SetStatusBarCount(4);
}

SetStatusBarWidth(1, 80);
SetStatusBarText(1, GetActiveDataType());
SetStatusBarPopUp(1, GetDataTypes(), type => SetActiveDataType(type));

SetStatusBarText(2, "[" + x + "," + y + "]");

if (SelRight > SelLeft || SelBottom > SelTop) {
  SetStatusBarText(3, (SelRight - SelLeft + 1) + "×" + (SelBottom - SelTop + 1));
  if ((SelRight - SelLeft + 1) * (SelBottom - SelTop + 1) <= 1000) {
    SetStatusBarText(4, "SUM=" + sum(SelLeft, SelTop, SelRight, SelBottom));
  }
} else {
  SetStatusBarText(3, "");
  SetStatusBarText(4, [x,y]);
}
`);

grid.addMacro('lib/Array.cms', String.raw`
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

  indexOf(searchElement, fromIndex = 0) {
    for (i = fromIndex; i < this.length; i++) {
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

  lastIndexOf(searchElement, fromIndex = this.length - 1) {
    for (i = fromIndex; i >= 0; i--) {
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
      str = mid(str, p + separator.length);
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

grid.addMacro('lib/Assert.cms', String.raw`
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

grid.addMacro('lib/Dialog.cms', String.raw`
// ShowDialog() で使用するダイアログ要素を作成するためのライブラリです。
// マクロの先頭に
// import { createButton, createDiv, createInput, createTextarea } from "lib/Dialog.cms";
// のように記述して使用できます。
// createButton() でボタンを、createInput() で単一行の入力ボックスを、
// createTextarea() で複数行の入力ボックスを作成できます。
// createDiv() で他の要素をグループ化することができます。

import { Array } from "lib/Array.cms";

/** ダイアログの要素です。 */
class Element {
  constructor(tagName) {
    this.childNodes = new Array();
    this.tagName = tagName;
  }

  /** 要素に子要素を追加します。 */
  append(...childNodes) {
    for (childNode of childNodes) {
      this.childNodes.push(childNode);
    }
  }
}

/**
 * ボタンを表す button 要素を生成します。ボタン内に label が表示されます。
 * ボタンをクリックするとダイアログが閉じます。
 * attributes 内に value を設定すると、このボタンがクリックされた時に
 * ShowDialog() の戻り値として value の値が返されます。
 */
function createButton(attributes, label) {
  element = new Element("button");
  if ("value" in attributes){
    element.value = attributes.value;
  }
  element.append(label);
  return element;
}

/**
 * 複数の要素をまとめる div 要素を生成します。
 * div 要素の前後で要素の並びが改行されます。
 */
function createDiv(...childNodes) {
  element = new Element("div");
  for (childNode of childNodes) {
    element.append(childNode);
  }
  return element;
}

/** 要素を生成します。button, div, input, textarea のみ動作します。 */
function createElement(tagName) {
  return new Element(tagName);
}

/**
 * 単一行の入力ボックスを表す input 要素を生成します。
 * attributes 内の size で横幅を設定できます。
 * attributes 内の value で初期値を設定できます。
 * ShowDialog() 実行後、要素の value にユーザーの入力した値が反映されます。
 */
function createInput(attributes = {}) {
  element = new Element("input");
  if ("size" in attributes){
    element.size = attributes.size;
  }
  if ("value" in attributes){
    element.value = attributes.value;
  }
  return element;
}

/**
 * 複数行の入力ボックスを表す textarea 要素を生成します。
 * attributes 内の cols で横幅を、rows で高さを設定できます。
 * attributes 内の value で初期値を設定できます。
 * ShowDialog() 実行後、要素の value にユーザーの入力した値が反映されます。
 */
function createTextarea(attributes = {}) {
  element = new Element("textarea");
  if ("cols" in attributes){
    element.cols = attributes.cols;
  }
  if ("rows" in attributes){
    element.rows = attributes.rows;
  }
  if ("value" in attributes){
    element.value = attributes.value;
  }
  return element;
}
`);

grid.addMacro('lib/TestSuite.cms', String.raw`
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

grid.addMacro('カード編集', `
import { createButton, createDiv, createInput } from "lib/Dialog.cms";

while (true) {
  dialog = createDiv();
  inputs = {};
  for (x = 1; x <= Right; x++) {
    input = createInput({value: [x,y]});
    dialog.append(createDiv([x,1], " ", input));
    inputs[x] = input;
  }
  dialog.append(createDiv(
      createButton({value: "next"}, "次の行"),
      " ",
      createButton({value: "prev"}, "前の行"),
      " ",
      createButton({value: "done"}, "終了")));

  returnValue = ShowDialog(dialog, y + " 行目");

  for (x = 1; x <= Right; x++) {
    [x,y] = inputs[x].value;
  }

  if (returnValue == "next") {
    y++;
  } else if (returnValue == "prev") {
    y--;
  } else {
    break;
  }
}
`);

grid.addMacro('列数・行数を変更', `
import { createButton, createDiv, createInput } from "lib/Dialog.cms";

colsInput = createInput({value: Right});
rowsInput = createInput({value: Bottom});
dialog = createDiv(
    createDiv("列数 ", colsInput),
    createDiv("行数 ", rowsInput),
    createDiv(createButton({value: "ok"}, "OK"), createButton({}, "キャンセル")));

r = ShowDialog(dialog, "列数・行数を変更");

if (r == "ok") {
  Right = colsInput.value;
  Bottom = rowsInput.value;
}
`);

grid.addMacro('数字→漢字', `
B = Bottom;

x = InputBox("変換する列を指定してください。", x);

for(y=1; y<=B; y++){
  str = [x,y];
  str = replace(str, "1", "一");
  str = replace(str, "１", "一");
  str = replace(str, "2", "二");
  str = replace(str, "２", "二");
  str = replace(str, "3", "三");
  str = replace(str, "３", "三");
  str = replace(str, "4", "四");
  str = replace(str, "４", "四");
  str = replace(str, "5", "五");
  str = replace(str, "５", "五");
  str = replace(str, "6", "六");
  str = replace(str, "６", "六");
  str = replace(str, "7", "七");
  str = replace(str, "７", "七");
  str = replace(str, "8", "八");
  str = replace(str, "８", "八");
  str = replace(str, "9", "九");
  str = replace(str, "９", "九");
  str = replace(str, "0", "○");
  str = replace(str, "０", "○");
  [x,y] = str;
}
`);

grid.addMacro('転置', `
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
}
