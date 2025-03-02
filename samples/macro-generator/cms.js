/** @typedef {import("./cassava_min_20250202.d.ts").CassavaGridElement} CassavaGridElement */

class Builder {
  /** @type {Array<string>} */
  #header = [];
  /** @type {Array<string>} */
  #main = [];
  /** @type {Array<string>} */
  #footer = [];
  /** @type {string} */
  #indent = '';

  build() {
    return this.#header.concat(this.#main).concat(this.#footer).join('\n');
  }

  /** @param {string} line */
  header(line) {
    this.#header.push(line);
  }

  /** @param {string} line */
  main(line) {
    this.#main.push(`${this.#indent}${line}`);
  }

  /** @param {string} line */
  block(line) {
    this.#main.push(`${this.#indent}${line} {`);
    this.#footer.unshift(`${this.#indent}}`);
    this.#indent += '  ';
  }
}

let registeredMacroName = '';

function generate() {
  const builder = new Builder();

  const name = elem('name').value;
  builder.header(`// ${name}.cms`);
  builder.header('');
  const names = document.querySelectorAll('.macro-name');
  for (let i = 0; i < names.length; i++) {
    /** @type {HTMLElement} */(names[i]).innerText = name;
  }

  const errors = document.querySelectorAll('.error');
  for (let i = 0; i < errors.length; i++) {
    errors[i].className = errors[i].className.replace(' error', '');
  }

  processY(builder);
  processX(builder);
  processCondition(builder);
  processAction(builder);

  const result = builder.build();
  elem('content').value = result;
  updateUrl();

  const mainGrid = elem('main-grid');
  if (mainGrid && mainGrid.addMacro) {
    mainGrid.addMacro(registeredMacroName, '');
    mainGrid.addMacro(name, result);
    registeredMacroName = name;
  }
  return result;
}

/** @param {Builder} builder */
function processY(builder) {
  const y = elem('y').value;
  const pc = elem('pc1').value;
  const pp = elem('pp1').value;
  const singleRow = (y == 'c' || y == 'e' || y == 'd');
  setVisible(elem('ye'), y == 'e');
  setVisibleAll('.single-row-only', singleRow);
  if (y == 'a') {
    if (pp == 'dr' || pc == 'u') {
      builder.block('for (y = Bottom; y >= 1; y--)');
    } else {
      builder.block('for (y = 1; y <= Bottom; y++)');
    }
  } else if (y == '2') {
    if (pp == 'dr' || pc == 'u') {
      builder.block('for (y = Bottom; y >= 2; y--)');
    } else {
      builder.block('for (y = 2; y <= Bottom; y++)');
    }
  } else if (y == 's') {
    if (pp == 'dr' || pc == 'u') {
      builder.header('SB = SelBottom;');
      builder.header('ST = SelTop;');
      builder.block('for (y = SB; y >= ST; y--) {');
    } else {
      builder.block('for (y = SelTop; y <= SelBottom; y++)');
    }
  } else if (y == 'e') {
    builder.header(`y = ${numValue(elem('yv'))};`);
  } else if (y == 'd') {
    builder.header('y = int(InputBox("行番号を入力してください。"));');
    builder.header('if (y == 0) { return; }');
    builder.header('');
  }
}

/** @param {Builder} builder */
function processX(builder) {
  const x = elem('x').value;
  const pc = elem('pc1').value;
  const singleCol = (x == 'c' || x == 'e' || x == 'd');
  setVisible(elem('xe'), x == 'e');
  setVisibleAll('.single-col-only', singleCol);

  if (x == 'a') {
    if (pc == 'l') {
      builder.block('for (x = Right; x >= 1; x--)');
    } else {
      builder.block('for (x = 1; x <= Right; x++)');
    }
  } else if (x == 's') {
    if (pc == 'l') {
      builder.block('for (x = SelRight; x <= SelLeft; x--)');
    } else {
      builder.block('for (x = SelLeft; x <= SelRight; x++)');
    }
  } else if (x == 'e') {
    builder.header(`x = ${numValue(elem('xv'))};`);
  } else if (x == 'd') {
    builder.header('x = int(InputBox("列番号を入力してください。"));');
    builder.header('if (x == 0) { return; }');
    builder.header('');
  }
}

/** @param {Builder} builder */
function processCondition(builder) {
  const cc = elem('cc1').value;
  setVisible(elem('cvo1'), cc != 'a');
  setVisible(elem('ccvs1'), cc == 'cl' || cc == 'rw');
  setVisible(elem('ccvs1-cl'), cc == 'cl');
  setVisible(elem('ccvs1-rw'), cc == 'rw');
  if (cc == 'a') {
    return;
  }

  let cell = '[x,y]';
  if (cc == 'u') {
    cell = '[x,y-1]';
  } else if (cc == 'l') {
    cell = '[x-1,y]';
  } else if (cc == 'r') {
    cell = '[x+1,y]';
  } else if (cc == 'd') {
    cell = '[x,y+1]';
  } else if (cc == 'cl') {
    cell = '[' + numValue(elem('ccv1')) + ',y]'
  } else if (cc == 'rw') {
    cell = '[x,' + numValue(elem('ccv1')) + ']'
  }

  const cvElem = elem('cv1');
  const co = elem('co1').value;
  const isValueNumber = (co == 'g' || co == 'l' || co == 'gt' || co == 'lt');
  const value = isValueNumber ? numValue(cvElem) : strValue(cvElem);
  if (co == 'q') {
    builder.block(`if (${cell} == ${value})`);
  } else if (co == 'nq') {
    builder.block(`if (${cell} != ${value})`);
  } else if (co == 's') {
    builder.block(`if (${cell}.startsWith(${value}))`);
  } else if (co == 'ns') {
    builder.block(`if (!(${cell}.startsWith(${value})))`);
  } else if (co == 'e') {
    builder.block(`if (${cell}.endsWith(${value}))`);
  } else if (co == 'ne') {
    builder.block(`if (!(${cell}.endsWith(${value})))`);
  } else if (co == 'c') {
    builder.block(`if (pos(${cell}, ${value}) > 0)`);
  } else if (co == 'nc') {
    builder.block(`if (pos(${cell}, ${value}) == 0)`);
  } else if (co == 'g') {
    builder.block(`if (${cell} >= ${value})`);
  } else if (co == 'l') {
    builder.block(`if (${cell} <= ${value})`);
  } else if (co == 'gt') {
    builder.block(`if (${cell} > ${value})`);
  } else if (co == 'lt') {
    builder.block(`if (${cell} < ${value})`);
  }
}

/** @param {Builder} builder */
function processAction(builder) {
  const pp = elem('pp1').value;
  setVisible(elem('pcvo1'), pp == 'c');
  if (pp == 'dr'){
    builder.main('DeleteRow(y);');
  } else if (pp == 'hr') {
    builder.main('SetRowHeight(y, 0);');
  } else if (pp == 'c') {
    processSetCellAction(builder);
  }
}

/** @param {Builder} builder */
function processSetCellAction(builder) {
  const pc = elem('pc1').value;
  const pvsElem = elem('pvs1');
  const pvs = pvsElem.value;
  const pvElem = elem('pv1');
  const poElem = elem('po1');
  const po = poElem.value;
  setVisible(pvElem, pc == 's' || pvs == 's' || pvs == 'c' || pvs == 'r');
  setVisible(pvsElem, pc != 's');
  setVisible(poElem, pc != 's');
  setVisible(elem('pvs1-c-pv1'), pvs == 'c');
  setVisible(elem('pvs1-r-pv1'), pvs == 'r');

  if (pc == 's') {
    builder.main(`[x,y] = ${strValue(pvElem)};`);
    return;
  }

  const isValueString = (po == 'i' || po == 'a');
  let value;
  if (pvs == 's') {
    value = isValueString ? strValue(pvElem) : numValue(pvElem);
  } else if (pvs == 'd' || pvs == 'm') {
    if (isValueString) {
      if (pvs == 'm') {
        builder.header('value = InputBoxMultiLine("値を入力してください。");');
        builder.header('if (value == "") { return; }');
        builder.header('');
      } else {
        builder.header('value = InputBox("値を入力してください。");');
        builder.header('if (value == "") { return; }');
        builder.header('');
      }
    } else {
      builder.header('value = double(InputBox("値を入力してください。"));');
      builder.header('if (value == 0) { return; }');
      builder.header('');
    }
    value = 'value';
  } else if (pvs == 'c') {
    if (isValueString) {
      value = 'str([' + numValue(pvElem) + ',y])';
    } else {
      value = '[' + numValue(pvElem) + ',y]';
    }
  } else if (pvs == 'r') {
    if (isValueString) {
      value = 'str([x,' + numValue(pvElem) + '])';
    } else {
      value = '[x,' + numValue(pvElem) + ']';
    }
  }

  let originalValue = '[x,y]';
  if (pc == 'u') {
    originalValue = '[x,y-1]';
  } else if (pc == 'l') {
    originalValue = '[x-1,y]';
  } else if (pc == 'r') {
    originalValue = '[x+1,y]';
  } else if (pc == 'd') {
    originalValue = '[x,y+1]';
  }

  if (po == 'i') {
    builder.main(`[x,y] = ${value} + ${originalValue};`);
  } else if (po == 'a') {
    builder.main(`[x,y] = ${originalValue} + ${value};`);
  } else if (po == 'p') {
    builder.main(`[x,y] = ${originalValue} + ${value};`);
  } else if (po == 'm') {
    builder.main(`[x,y] = ${originalValue} - ${value};`);
  } else if (po == 'x') {
    builder.main(`[x,y] = ${originalValue} * ${value};`);
  } else if (po == 'xr') {
    builder.main(`[x,y] = int(${originalValue} * ${value} + 0.5);`);
  } else if (po == 'xf') {
    builder.main(`[x,y] = int(${originalValue} * ${value});`);
  } else if (po == 'd') {
    builder.main(`[x,y] = ${originalValue} / ${value};`);
  } else if (po == 'dr') {
    builder.main(`[x,y] = int(${originalValue} / ${value} + 0.5);`);
  } else if (po == 'df') {
    builder.main(`[x,y] = int(${originalValue} / ${value});`);
  }
}

/**
 * @template {string} T
 * @param {T} id
 * @returns {T extends 'main-grid' ? CassavaGridElement : HTMLInputElement|HTMLTextAreaElement}
 */
function elem(id) {
  return /** @type {any} */(document.getElementById(id));
}

/**
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @returns {number}
 */
function numValue(element) {
  const value = element.value;
  const numValue = Number(value) || 0;
  if (value == '' || value != numValue.toString()) {
    element.className += ' error';
  }
  return numValue;
}

/**
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @returns {string}
 */
function strValue(element) {
  return '"' + element.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * @param {HTMLElement} element
 * @param {boolean} visible
 */
function setVisible(element, visible) {
  element.style.display = (visible ? '' : 'none');
}

/**
 * @param {string} selector
 * @param {boolean} visible
 */
function setVisibleAll(selector, visible) {
  const elements = /** @type {NodeListOf<HTMLElement>} */(document.querySelectorAll(selector));
  for (let i = 0; i < elements.length; i++) {
    setVisible(elements[i], visible);
  }
}

function restore() {
  let hash = location.hash;
  if (hash[0] == '#') {
    hash = hash.substring(1);
  }
  const params = hash.split('&');
  for (let i = 0; i < params.length; i++) {
    const param = params[i].split('=');
    const input = elem(param[0]);
    if (input) {
      input.value = decodeURIComponent(param[1]);
    }
  }
  generate();
}

function updateUrl() {
  const ids = new Map(Object.entries({
    y: 'a',
    yv: '1',
    x: 'a',
    xv: '1',
    cc1: 'c',
    ccv1: '',
    cv1: '',
    co1: 'q',
    pp1: 'c',
    pc1: 'o',
    pvs1: 's',
    pv1: '',
    po1: 'i',
    name: 'CassavaMacro'
  }));
  const results = [];
  for (const [id, def] of ids) {
    const input = elem(id);
    if (input && input.value != def) {
      results.push(id + '=' + encodeURIComponent(input.value));
    }
  }
  const hash = '#' + results.join('&');
  try {
    history.replaceState(null, null, hash);
  } catch (e) {
    location.hash = hash;
  }
}

/**
 * @param {Event} event
 * @returns {boolean}
 */
function download(event) {
  const blob = new Blob(["\ufeff" + elem('content').value], {type: "text/plain"});
  const name = elem('name').value + '.cms';
  if (/** @type {any} */(navigator).msSaveOrOpenBlob) {
    /** @type {any} */(navigator).msSaveOrOpenBlob(blob, name);
    return false;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.download = name;
  a.href = url;
  a.click();
  document.body.removeChild(a);
  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 10000);
  return false;
}

function loadCassava() {
  document.getElementById('cassava-editor-placeholder').style.display = 'none';
  const element = document.getElementById('cassava-editor-js');
  element.style.display = '';
  const script = document.createElement('script');
  script.src = 'https://www.asukaze.net/soft/cassava/js/cassava_min_20250202.js';
  element.append(script);
  script.onload = generate;
}

window.addEventListener('DOMContentLoaded',function() {
  if (location.hash != '#cassava-js') {
    restore();
  }
  setTimeout(loadCassava, 100);
});
