net.asukaze.module((module, require) => {
const { createButton, createElement, createDiv, createLabel } = require('./asukaze_dom.js');

/**
 * @typedef {import("./cassava_min_20251228.d.ts").CassavaGridElement} CassavaGridElement
 */

/** @enum {number} */
const Type = {
  NULL: 0,
  STRING: 1,
  NUMBER: 2,
  TRUE: 3,
  FALSE: 4,
  OBJECT: 5,
  INLINE_ARRAY: 6,
  EXPANDED_ARRAY: 7,
  TABULAR_ARRAY: 8
}

const NUMERIC_LIKE = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;

/**
 * @param {string} value
 * @returns {string}
 */
function quote(value) {
  return '"' + value.replaceAll('\\', '\\\\')
                    .replaceAll('"', '\\"')
                    .replaceAll('\n', '\\n')
                    .replaceAll('\r', '\\r')
                    .replaceAll('\t', '\\t') + '"';
}

/**
 * @param {string} value
 * @param {string=} quoteChar
 * @returns {string}
 */
function maybeQuotePrimitive(value, quoteChar = ',') {
  if (value == '' || value == '-' || value.startsWith(' ') ||
      value.endsWith(' ') || value.includes(':') || value.includes('"') ||
      value.includes('\\') || value.includes('[') || value.includes(']') ||
      value.includes('{') || value.includes('}') || value.includes('\n') ||
      value.includes('\r') || value.includes(quoteChar) ||
      (value.startsWith('-') && !NUMERIC_LIKE.test(value))) {
    return quote(value);
  }
  return value;
}

/**
 * @param {string} value
 * @param {string=} quoteChar
 * @returns {string}
 */
function maybeQuoteString(value, quoteChar = ',') {
  if (value == '' || value == 'null' || value == 'true' || value == 'false' ||
      value.startsWith(' ') || value.endsWith(' ') ||
      NUMERIC_LIKE.test(value) ||  value.includes(':') || value.includes('"') ||
      value.includes('\\') || value.includes('[') || value.includes(']') ||
      value.includes('{') || value.includes('}') || value.includes('\n') ||
      value.includes('\r') || value.includes(quoteChar) ||
      value.startsWith('-')) {
    return quote(value);
  }
  return value;
}
/**
 * @param {string} value
 * @returns {[string, string]} Unquoted value and the remaining string.
 */
function unquote(value) {
  if (!value.startsWith('"')) {
    return [value, ''];
  }
  let unquoted = '';
  for (let i = 1; i < value.length; i++) {
    if (value[i] == '\\') {
      i++;
      switch (value[i]) {
        case 'n': unquoted += '\n'; break;
        case 'r': unquoted += '\r'; break;
        case 't': unquoted += '\t'; break;
        default: unquoted += value[i]; break;
      }
    } else if (value[i] == '"') {
      return [unquoted, value.substring(i + 1)];
    } else {
      unquoted += value[i];
    }
  }
  return [unquoted, ''];
}

/**
 * @param {string} data
 * @returns {Array<string>}
 */
function splitInlineArray(data) {
  const result = [];
  let start = 0;
  let quoted = false;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (quoted) {
      if (c == '"') {
        quoted = false;
      } else if (c == '\\') {
        i++;
      }
    } else if (c == '"') {
      quoted = true;
    } else if (c == ',') {
      result.push(data.substring(start, i));
      start = i + 1;
    }
  }
  if (start < data.length) {
    result.push(data.substring(start));
  }
  return result;
}

class Node {
  /** @type {HTMLSelectElement} */
  #select;
  /** @type {HTMLDivElement} */
  #element;
  /** @type {Type} */
  #type = Type.OBJECT;
  /** @type {string} */
  #primitive = '';
  /** @type {Array<[Node, string?]>} */
  #object = [];
  /** @type {CassavaGridElement?} */
  #grid = null;

  /**
   * @param {Array<string>} lines
   * @param {boolean} forcePrimitive
   */
  constructor(lines = [], forcePrimitive = false) {
    this.parse(lines, forcePrimitive);

    this.#select = createElement('select', {
      onchange: () => {
        this.#type = Number(this.#select.value);
        this.render();
      }
    }, [
      createElement('option', {value: String(Type.NULL)}, ['null']),
      createElement('option', {value: String(Type.STRING)}, ['string']),
      createElement('option', {value: String(Type.NUMBER)}, ['number']),
      createElement('option', {value: String(Type.TRUE)}, ['true']),
      createElement('option', {value: String(Type.FALSE)}, ['false']),
      createElement('option', {value: String(Type.OBJECT)}, ['object']),
      createElement('option',
          {value: String(Type.INLINE_ARRAY)}, ['array (inline)']),
      createElement('option',
          {value: String(Type.EXPANDED_ARRAY)}, ['array (expanded)']),
      createElement('option',
          {value: String(Type.TABULAR_ARRAY)}, ['array (tabular)'])
    ]);
    this.#element = createDiv();
    /** @type {Array<HTMLElement>} */
    this.elements = [this.#select, this.#element];
  }

  /**
   * @param {string} value
   * @returns {Node}
   */
  static primitive(value) {
    return new Node([value], /* forcePrimitive= */ true);
  }

  /**
   * @param {string=} quoteChar
   * @returns {string}
   */
  encodeInline(quoteChar = ',') {
    switch (this.#type) {
      case Type.NULL: return 'null';
      case Type.STRING: return maybeQuoteString(this.#primitive, quoteChar);
      case Type.NUMBER: return this.#primitive;
      case Type.TRUE: return 'true';
      case Type.FALSE: return 'false';
      default:
        return this.#object.map(e => e[0].encodeInline()).join(quoteChar);
    }
  }

  /**
   * @param {Array<string>} lines
   * @param {boolean} forcePrimitive
   */
  parse(lines, forcePrimitive) {
    if (lines.length == 0 || lines[0] == '') {
      if (forcePrimitive) {
        this.#type = Type.STRING;
        this.#primitive = '';
      } else {
        this.#type = Type.OBJECT;
        this.#object = [];
      }
      return;
    }
    const value = lines[0];
    if (value == 'null') {
      this.#type = Type.NULL;
    } else if (value == 'true') {
      this.#type = Type.TRUE;
    } else if (value == 'false') {
      this.#type = Type.FALSE;
    } else if (!forcePrimitive && value.startsWith('[')) {
      this.#parseArray(lines);
    } else if (value.startsWith('"')) {
      const [unquoted, remaining] = unquote(value);
      if (!forcePrimitive && remaining.startsWith(':')) {
        this.#parseObject(lines);
      } else {
        this.#type = Type.STRING;
        this.#primitive = unquoted;
      }
    } else if (!forcePrimitive && value.includes(':')) {
      this.#parseObject(lines);
    } else if (NUMERIC_LIKE.test(value)) {
      this.#type = Type.NUMBER;
      this.#primitive = value;
    } else {
      this.#type = Type.STRING;
      this.#primitive = value;
    }
  }

  /** @param {Array<string>} lines */
  #parseArray(lines) {
    const firstLine = lines[0] ?? '';
    const inline = firstLine.match(/^\[\d+\]: (.*)$/);
    if (inline) {
      this.#type = Type.INLINE_ARRAY;
      this.#parseInlineArray(inline[1]);
      return;
    }
    const tabular = firstLine.match(/^\[\d+\]\{(.*)\}:$/);
    if (tabular) {
      this.#type = Type.TABULAR_ARRAY;
      this.#grid =
          /** @type {CassavaGridElement} */(createElement('cassava-grid'));
      splitInlineArray(tabular[1]).forEach((s, x) => {
        this.#grid?.setCell(x + 1, 1, unquote(s)[0]);
      });
      for (let y = 1; y < lines.length; y++) {
        splitInlineArray(lines[y].trim()).forEach((s, x) => {
          this.#grid?.setCell(x + 1, y + 1, unquote(s)[0]);
        });
      }
      return;
    }
    this.#type = Type.EXPANDED_ARRAY;
    this.#object = [];
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/^(\s*)-\s(.*)$/);
      if (match) {
        const indent = match[1] + '  ';
        const child = [match[2]];
        while (i + 1 < lines.length && lines[i + 1].startsWith(indent)) {
          i++;
          child.push(lines[i].substring(indent.length));
        }
        this.#object.push([new Node(child)]);
      }
    }
  }

  /** @param {string} data */
  #parseInlineArray(data) {
    this.#object = splitInlineArray(data).map(s => [Node.primitive(s)]);
  }

  /** @param {Array<string>} lines */
  #parseObject(lines) {
    this.#type = Type.OBJECT;
    this.#object = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      /** @type {string} */
      let key;
      /** @type {string} */
      let remaining;
      if (line.startsWith('"')) {
        [key, remaining] = unquote(line);
      } else {
        const i = line.search(/[:\[]/);
        key = line.substring(0, i);
        remaining = line.substring(i);
      }

      if (remaining.startsWith(': ')) {
        this.#object.push([Node.primitive(remaining.substring(2)), key]);
      } else {
        const child = [];
        if (remaining.startsWith('[')) {
          child.push(remaining);
        }
        const indent = lines[i + 1]?.match(/^\s*/)?.[0] ?? '';
        if (indent.length > 0) {
          while (i + 1 < lines.length && lines[i + 1].startsWith(indent)) {
            i++;
            child.push(lines[i].substring(indent.length));
          }
        }
        this.#object.push([new Node(child), key]);
      }
    }
  }

  render() {
    this.#select.value = String(this.#type);
    this.#element.innerHTML = '';
    if (this.#type == Type.STRING ||
        this.#type == Type.NUMBER) {
      const input = createElement('input', {
        oninput: () => this.#primitive = input.value,
        value: this.#primitive
      });
      this.#element.append(input);
      this.#element.style.display = 'inline-block';
    } else if (this.#type == Type.OBJECT) {
      const ul = createElement('ul');
      this.#object.forEach((e, i) => {
        const key = createElement('input', {
          oninput: () => this.#object[i][1] = key.value,
          value: e[1] ?? ''
        });
        e[0].render();
        ul.append(createElement('li', {}, [
          createButton('x', () => {
            this.#object.splice(i, 1);
            this.render();
          }),
          key, ': ', ...e[0].elements
        ]));
      });
      ul.append(createElement('li', {}, [
        createButton('+', () => {
          this.#object.push([Node.primitive('')]);
          this.render();
        })
      ]));
      this.#element.append(ul);
      this.#element.style.display = 'block';
    } else if (this.#type == Type.INLINE_ARRAY) {
      const input = createElement('input', {
        onchange: () => this.#parseInlineArray(input.value),
        value: this.encodeInline()
      });
      this.#element.append(input);
      this.#element.style.display = 'inline-block';
    } else if (this.#type == Type.EXPANDED_ARRAY) {
      const ul = createElement('ul');
      this.#object.forEach((e, i) => {
        e[0].render();
        ul.append(createElement('li', {}, [
          createButton('x', () => {
            this.#object.splice(i, 1);
            this.render();
          }),
          ...e[0].elements
        ]));
      });
      ul.append(createElement('li', {}, [
        createButton('+', () => {
          this.#object.push([Node.primitive('')]);
          this.render();
        })
      ]));
      this.#element.append(ul);
      this.#element.style.display = 'block';
    } else if (this.#type == Type.TABULAR_ARRAY) {
      if (!this.#grid) {
        this.#grid =
            /** @type {CassavaGridElement} */(createElement('cassava-grid'));
      }
      this.#element.append(
          createDiv(createButton('Edit column names',
              () => this.#grid?.runMacro('FixFirstRow();'))),
          this.#grid);
      this.#element.style.display = 'block';
      this.#grid.runMacro('UnFix(); FixFirstRow();');
    }
  }

  /**
   * @param {string=} key
   * @param {string=} indent
   * @returns {string}
   */
  toString(key = '', indent = '') {
    switch (this.#type) {
      case Type.OBJECT: {
        let result = '';
        if (key) {
          result += `${key}:\n`;
          indent += '  ';
        }
        for (const [child, k] of this.#object) {
          result += (result.endsWith('\n') ? indent : '') +
              child.toString(k, indent);
        }
        return result;
      }
      case Type.INLINE_ARRAY: {
        return `${key}[${this.#object.length}]: ${this.encodeInline()}\n`;
      }
      case Type.EXPANDED_ARRAY: {
        let result = `${key}[${this.#object.length}]:\n`;
        for (const [child] of this.#object) {
          result += `${indent}  - ${child.toString('', indent + '    ')}`;
        }
        return result;
      }
      case Type.TABULAR_ARRAY: {
        if (this.#grid == null) {
          return `${key}[0]:\n`;
        }
        let result = `${key}[${this.#grid.bottom() - 1}]{` +
            maybeQuotePrimitive(this.#grid.cell(1, 1));
        for (let x = 2; x <= this.#grid.right(); x++) {
          result += ',' + maybeQuotePrimitive(this.#grid.cell(x, 1));
        }
        result += '}:\n';
        for (let y = 2; y <= this.#grid.bottom(); y++) {
          result += indent + '  ' + maybeQuotePrimitive(this.#grid.cell(1, y));
          for (let x = 2; x <= this.#grid.right(); x++) {
            result += ',' + maybeQuotePrimitive(this.#grid.cell(x, y));
          }
          result += '\n';
        }
        return result;
      }
      default: {
        if (key) {
          return `${key}: ${this.encodeInline()}\n`;
        } else {
          return this.encodeInline() + '\n';
        }
      }
    }
  }
}

class TreeView {
  /** @type {Node} */
  #root;

  /** @param {Node} root */
  constructor(root) {
    this.#root = root;
    this.element = createDiv();
  }

  render() {
    this.element.innerHTML = '';
    this.#root.render();
    this.element.append(...this.#root.elements);
  }
}

class TextView {
  /** @type {Node} */
  #root;

  /** @param {Node} root */
  constructor(root) {
    this.#root = root;
    this.element = createElement('textarea', {
      cols: 80,
      rows: 20,
      onblur: () => this.#root.parse(
          this.element.value.trim().replaceAll('\r', '').split('\n'),
          /* forcePrimitive= */ false)
    });
  }

  render() {
    this.element.value = this.#root.toString();
  }
}

class Editor {
  /** @type {TreeView} */
  #treeView;
  /** @type {TextView} */
  #textView;
  /** @type {string} */
  #view;

  /** @param {Node} root */
  constructor(root) {
    this.#treeView = new TreeView(root);
    this.#textView = new TextView(root);
    this.#view = 'tree';
    this.element = createDiv();
  }

  render() {
    this.element.innerHTML = '';
    this.element.append(createElement('div', {className: 'tabs'}, [
      createLabel(createElement('input', {
        type: 'radio',
        name: 'tab',
        checked: this.#view == 'tree',
        onchange: () => {
          this.#view = 'tree';
          this.render();
        }
      }), 'Tree'),
      createLabel(createElement('input', {
        type: 'radio',
        name: 'tab',
        checked: this.#view == 'text',
        onchange: () => {
          this.#view = 'text';
          this.render();
        }
      }), 'Text')
    ]));

    const main = createElement('div', {className: 'main'});
    if (this.#view == 'text') {
      this.#textView.render();
      main.append(this.#textView.element);
    } else {
      this.#treeView.render();
      main.append(this.#treeView.element);
    }
    this.element.append(main);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const root = new Node([
    'context:',
    '  task: Our favorite hikes together',
    '  location: Boulder',
    '  season: spring_2025',
    'friends[3]: ana,luis,sam',
    'hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:',
    '  1,Blue Lake Trail,7.5,320,ana,true',
    '  2,Ridge Overlook,9.2,540,luis,false',
    '  3,Wildflower Loop,5.1,180,sam,true'
  ]);
  const editor = new Editor(root);
  editor.render();
  document.querySelector('#main-view')?.append(editor.element);
});

});
