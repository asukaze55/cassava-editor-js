/** @typedef {import("./cassava_min_20251214.d.ts").CassavaGridElement} CassavaGridElement */

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

  clear() {
    this.#header = [];
    this.#main = [];
    this.#footer = [];
    this.#indent = '';
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
  const [t, b, reverse] = processTopBottom(builder);
  if (t != b) {
    if (reverse) {
      builder.block(`for (y = ${b}; y >= ${t}; y--)`);
    } else {
      builder.block(`for (y = ${t}; y <= ${b}; y++)`);
    }
  } else if (t != 'y') {
    builder.header(`y = ${t};`);
  }
}

/**
 * @param {Builder} builder
 * @returns {[string|number, string|number, boolean]}
 */
function processTopBottom(builder) {
  const y = elem('y').value;
  const singleRow = (y == 'c' || y == 'e' || y == 'd');
  const reverse = (elem('pp1').value == 'dr' || elem('pc1').value == 'u');
  setVisible(elem('ye'), y == 'e');
  setVisibleAll('.single-row-only', singleRow);

  if (y == 'a') {
    return [1, 'Bottom', reverse];
  } else if (y == '2') {
    return [2, 'Bottom', reverse];
  } else if (y == 's') {
    if (reverse) {
      builder.header('SB = SelBottom;');
      builder.header('ST = SelTop;');
      return ['ST', 'SB', reverse];
    } else {
      return ['SelTop', 'SelBottom', reverse];
    }
  } else if (y == 'e') {
    const yv = numValue(elem('yv'));
    return [yv, yv, reverse];
  } else if (y == 'd') {
    builder.header('y = int(InputBox("行番号を入力してください。"));');
    builder.header('if (y == 0) { return; }');
    builder.header('');
    return ['y', 'y', reverse];
  } else {
    return ['y', 'y', reverse];
  }
}

/** @param {Builder} builder */
function processX(builder) {
  const [l, r, reverse] = processLeftRight(builder);
  if (l != r) {
    if (reverse) {
      builder.block(`for (x = ${r}; x >= ${l}; x--)`);
    } else {
      builder.block(`for (x = ${l}; x <= ${r}; x++)`);
    }
  } else if (l != 'x') {
    builder.header(`x = ${l};`);
  }
}

/**
 * @param {Builder} builder
 * @returns {[string|number, string|number, boolean]}
 */
function processLeftRight(builder) {
  const x = elem('x').value;
  const singleCol = (x == 'c' || x == 'e' || x == 'd');
  const reverse = (elem('pc1').value == 'l');
  setVisible(elem('xe'), x == 'e');
  setVisibleAll('.single-col-only', singleCol);

  if (x == 'a') {
    return [1, 'Right', reverse];
  } else if (x == 's') {
    return ['SelLeft', 'SelRight', reverse];
  } else if (x == 'e') {
    const xv = numValue(elem('xv'));
    return [xv, xv, reverse];
  } else if (x == 'd') {
    builder.header('x = int(InputBox("列番号を入力してください。"));');
    builder.header('if (x == 0) { return; }');
    builder.header('');
    return ['x', 'x', reverse];
  } else {
    return ['x', 'x', reverse];
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
  setVisible(elem('prft1'), pp == 'r');
  if (pp == 'dr'){
    builder.main('DeleteRow(y);');
  } else if (pp == 'hr') {
    builder.main('SetRowHeight(y, 0);');
  } else if (pp == 'c') {
    processSetCellAction(builder);
  } else if (pp == 'r') {
    processReplaceAction(builder);
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

/** @param {Builder} builder */
function processReplaceAction(builder) {
  const prf = strValue(elem('prf1'));
  const prt = strValue(elem('prt1'));
  const prc = boolValue(elem('prc1'));
  const prr = boolValue(elem('prr1'));
  if (elem('cc1').value == 'a') {
    builder.clear();
    const x = elem('x').value;
    const y = elem('y').value;
    if (x != 'a' || y != 'a') {
      const [t, b] = processTopBottom(builder);
      const [l, r] = processLeftRight(builder);
      builder.main(`ReplaceAll(${prf}, ${prt}, ${prc}, false, ${prr}, ` +
          `${l}, ${t}, ${r}, ${b});`);
    } else if (prc || prr) {
      builder.main(`ReplaceAll(${prf}, ${prt}, ${prc}, false, ${prr});`);
    } else {
      builder.main(`ReplaceAll(${prf}, ${prt});`);
    }
  } else if (prr) {
    const re = elem('prf1').value.replace(/\//g, '\\/');
    const flag = (prc ? 'gi' : 'g');
    builder.main(`[x,y] = [x,y].replaceAll(/${re}/${flag}, ${prt});`);
  } else if (prc) {
    const re = elem('prf1').value.replace(
        /[\$\(\)\*\+\.\/\?\[\\\]\^\{\|\}]/gi, '\\$&');
    builder.main(`[x,y] = [x,y].replaceAll(/${re}/gi, ${prt});`);
  } else {
    builder.main(`[x,y] = [x,y].replaceAll(${prf}, ${prt});`);
  }
}

/**
 * @template {string} T
 * @param {T} id
 * @returns {T extends 'main-grid' ? CassavaGridElement : HTMLInputElement}
 */
function elem(id) {
  return /** @type {any} */(document.getElementById(id));
}

/**
 * @param {HTMLInputElement} element
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
 * @param {HTMLInputElement} element
 * @returns {string}
 */
function strValue(element) {
  return '"' + element.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * @param {HTMLInputElement} element
 * @returns {boolean}
 */
function boolValue(element) {
  return !!element.checked;
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
    if (!input) {
      continue;
    }
    if (input.type == 'checkbox') {
      input.checked = (param[1] == '1');
    } else {
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
    ccv1: '1',
    cv1: '',
    co1: 'q',
    pp1: 'c',
    pc1: 'o',
    pvs1: 's',
    pv1: '',
    po1: 'i',
    prf1: '',
    prt1: '',
    prc1: '0',
    prr1: '0',
    name: 'CassavaMacro'
  }));
  const results = [];
  for (const [id, def] of ids) {
    const input = elem(id);
    if (!input) {
      continue;
    }
    const value =
        (input.type == 'checkbox') ? (input.checked ? '1' : '0') : input.value;
    if (value != def) {
      results.push(id + '=' + encodeURIComponent(value));
    }
  }
  const hash = '#' + results.join('&');
  try {
    history.replaceState(null, null, hash);
  } catch (e) {
    location.hash = hash;
  }
}

function download() {
  const blob = new Blob(["\ufeff" + elem('content').value], {type: "text/plain"});
  const name = elem('name').value + '.cms';
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.download = name;
  a.href = url;
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}

function loadCassava() {
  const element = elem('cassava-editor-js');
  element.style.display = '';
  const script = document.createElement('script');
  script.src = 'https://www.asukaze.net/soft/cassava/js/cassava_min_20251214.js';
  element.append(script);
  script.onload = generate;
}

window.addEventListener('DOMContentLoaded', () => {
  if (location.hash != '#cassava-js') {
    restore();
  }

  const inputs = elem('inputs');
  inputs.addEventListener('change', generate);
  inputs.addEventListener('keyup', generate);

  elem('form').addEventListener('submit', event => {
    download();
    event.preventDefault();
  });

  setTimeout(loadCassava, 100);
  elem('run').addEventListener('click', () => {
    elem('main-grid').runMacro(elem('content').value);
  });
});
