net.asukaze.module((module, require) => {
const { createReplacer } = require('./cassava_replacer.js');

/**
 * @param {string} name
 * @param {number} arity
 * @param {boolean=} varArgs
 * @param {string=} fileName
 * @returns {string}
 */
function functionId(name, arity, varArgs, fileName) {
  return (fileName ? fileName + '\n' : '')
         + name + (varArgs ? '/+' : '/') + arity;
}

class SwapFunction {}
const swapFunction = new SwapFunction();

/**
 * @typedef {number|string|FunctionValue|MacroFunction|ObjectValue|RegExp|ReturnValue} ValueType
 * @typedef {(...args: ValueType[]) => ValueType|Promise<ValueType>|void|Promise<void>} MacroFunction
 */

/** @type {Map<string, MacroFunction|SwapFunction>} */
const builtInFunctions = new Map(Object.entries({
  'acos/1': a => Math.acos(Number(a)),
  'ascW/1': a => String(a).charCodeAt(0),
  'asin/1': a => Math.asin(Number(a)),
  'atan/1': a => Math.atan(Number(a)),
  'atan2/2': (a, b) => Math.atan2(Number(a), Number(b)),
  'chrW/1': a => String.fromCharCode(Number(a)),
  'cos/1': a => Math.cos(Number(a)),
  'double/1': a => Number(a),
  'int/1': a => Math.trunc(Number(a)),
  'left/2': (a, b) => String(a).slice(0, Number(b)),
  'len/1': a => String(a).length,
  'max/+1': (...a) => Math.max(...a.map(Number)),
  'mid/2': (a, b) => String(a).substring(Number(b) - 1),
  'mid/3': (a, b, c) =>
      String(a).substring(Number(b) - 1, Number(b) - 1 + Number(c)),
  'min/+1': (...a) => Math.min(...a.map(Number)),
  'pos/2': (a, b) => String(a).indexOf(String(b)) + 1,
  'pow/2': (a, b) => Math.pow(Number(a), Number(b)),
  'random/1': a => Math.floor(Math.random() * Number(a)),
  'replace/+3': (str1, str2, str3, ignoreCase, isRegex) => createReplacer(
      String(str2), String(str3), !!ignoreCase, false, !!isRegex)(String(str1)),
  'right/2': (a, b) => String(a).slice(-b),
  'sin/1': a => Math.sin(Number(a)),
  'sqrt/1': a => Math.sqrt(Number(a)),
  'str/1': a => String(a),
  'swap/2': swapFunction,
  'tan/1': a => Math.tan(Number(a)),
  'GetDate/0': () => new Date().getDate(),
  'GetHours/0': () => new Date().getHours(),
  'GetMinutes/0': () => new Date().getMinutes(),
  'GetMonth/0': () => new Date().getMonth() + 1,
  'GetSeconds/0': () => new Date().getSeconds(),
  'GetYear/0': () => new Date().getFullYear()
}));

/**
 * @param {Map<string, MacroFunction|SwapFunction>} map
 * @param {string} name
 * @param {number} arity
 * @param {string=} fileName
 * @returns {MacroFunction|SwapFunction?}
 */
function findFunction(map, name, arity, fileName) {
  let id = functionId(name, arity, false, fileName);
  if (map.has(id)) {
    return map.get(id);
  }
  for (let i = arity; i >= 0; i--) {
    id = functionId(name, i, true, fileName)
    if (map.has(id)) {
      return map.get(id);
    }
  }
  return undefined;
}

class Environment {
  /** @type {Map<string, ValueType>} */
  #variables = new Map();
  /** @type {Map<string, Function>} */
  #api;
  /** @type {Map<string, FunctionValue>} */
  #functions;
  /** @type {number} */
  #loop;

  /**
   * @param {Environment} parent
   * @param {Map<string, Function>=} api
   */
  constructor(parent, api) {
    this.#api = parent ? parent.#api : api;
    this.#functions = parent ? parent.#functions : new Map();
    this.#loop = parent ? parent.#loop - 1: 1000000;
    if (this.#loop <= 0) {
      throw 'Too deep recursion.';
    }
  }

  init() {
    this.set('x', this.get('Col'));
    this.set('y', this.get('Row'));
    this.set('Left', this.get('Left:'));
    this.set('Top', this.get('Top:'));
  }

  /**
   * @param {string} name
   * @returns {ValueType}
   */
  get(name) {
    if (this.#variables.has(name)) {
      return this.#variables.get(name);
    }
    const getter = this.#api.get(name + '=/0');
    if (typeof getter == 'function') {
      return getter();
    }
    throw 'Undefined variable: ' + name;
  }

  /**
   * @param {string} name
   * @param {number} arity
   * @param {string=} fileName
   * @param {boolean=} apiOnly
   * @returns {ValueType|SwapFunction}
   */
  getFunction(name, arity, fileName, apiOnly) {
    if (!apiOnly) {
      if (this.#variables.has(name)) {
        return this.#variables.get(name);
      }
      if (fileName) {
        const func = findFunction(this.#functions, name, arity, fileName);
        if (func) {
          return func;
        }
      }
      const func = findFunction(this.#functions, name, arity);
      if (func) {
        return func;
      }
    }
    const api = findFunction(this.#api, name, arity);
    if (api) {
      return api;
    }
    const builtIn = findFunction(builtInFunctions, name, arity);
    if (builtIn) {
      return builtIn;
    }
    throw 'Cannot find a function: ' + functionId(name, arity);
  }

  /**
   * @param {string} name
   * @param {ValueType} value
   */
  async set(name, value) {
    const setter = this.#api.get(name + '=/1');
    if (typeof setter == 'function') {
      await setter(value);
      return;
    }
    this.#variables.set(name, value);
  }

  /**
   * @param {string} name
   * @param {string} fileName
   * @param {FunctionValue} func
   */
  setFunction(name, fileName, func) {
    this.#functions.set(func.id(name, fileName), func);
  }

  variables() {
    return new Map(this.#variables);
  }

  countLoop() {
    this.#loop--;
    if (this.#loop <= 0) {
      throw 'Too many loops.';
    }
  }
}

/**
 * @param {string} c
 * @returns {boolean}
 */
function isNumChar(c) {
  return c >= '0' && c <= '9';
}

/**
 * @param {string} c
 * @returns {boolean}
 */
function isNumCharOrDot(c) {
  return isNumChar(c) || c == '.';
}

/**
 * @param {string} c
 * @returns {boolean}
 */
function isAlphaChar(c) {
  return (c >= 'A' && c <= 'Z')
      || (c >= 'a' && c <= 'z')
      || c == '_';
}

/**
 * @param {string} c
 * @returns {boolean}
 */
function isAlphaNumChar(c) {
  return isAlphaChar(c) || isNumChar(c);
}

const constants = new Map(Object.entries({
  IDABORT: '3',
  IDCANCEL: '2',
  IDIGNORE: '5',
  IDNO: '7',
  IDOK: '1',
  IDRETRY: '4',
  IDYES: '6',
  MB_ABORTRETRYIGNORE: '2',
  MB_OK: '0',
  MB_OKCANCEL: '1',
  MB_RETRYCANCEL: '5',
  MB_YESNO: '4',
  MB_YESNOCANCEL:'3'
}));

class Tokenizer {
  /** @type {Array<string>} */
  #script;
  /** @type {number} */
  #line = 0;
  /** @type {boolean} */
  #comment = false;
  /** @type {boolean} */
  #hasValue = false;
  /** @type {Array<string>} */
  #tokens = [];

  /** @param {string} script */
  constructor(script) {
    this.#script = script.split('\n');
  }

  /** @returns {boolean} */
  hasNext() {
    this.#parse(0);
    return this.#tokens.length > 0;
  }

  /** @returns {string} */
  next() {
    return this.hasNext() ? this.#tokens.shift() : null;
  }

  /**
   * @param {number=} index
   * @returns {string}
   */
  peek(index = 0) {
    this.#parse(index);
    return this.#tokens[index];
  }

  /** @returns {string} */
  positionString() {
    return 'Line ' + this.#line + ': ' + this.#script[this.#line - 1];
  }

  /** @param {number=} index */
  #parse(index = 0) {
    while (this.#tokens.length <= index && this.#line < this.#script.length) {
      this.#parseLine();
    }
  }

  #parseLine() {
    const data = this.#script[this.#line];
    this.#line++;
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const c2 = data.substring(i, i + 2);
      if (c2 == '/*') {
        this.#comment = true;
        i++;
      } else if (this.#comment) {
        if (c2 == '*/') {
          this.#comment = false;
          i++;
        }
      } else if (c2 == '//') {
        return;
      } else if (c == '"' || c == "'") {
        const start = i;
        i++;
        while (data[i] != c) {
          if (i >= data.length) {
            throw 'unterminated string literal.';
          } else if (data[i] == '\\') {
            i++;
          }
          i++;
        }
        this.#tokens.push(data.substring(start, i + 1));
        this.#hasValue = true;
      } else if (isNumChar(c)) {
        const start = i;
        while (isNumCharOrDot(data[i + 1])) {
          i++;
        }
        this.#tokens.push(data.substring(start, i + 1));
        this.#hasValue = true;
      } else if (isAlphaChar(c)) {
        const start = i;
        while (isAlphaNumChar(data[i + 1])) {
          i++;
        }
        const token = data.substring(start, i + 1);
        if (token.toLowerCase() == 'true') {
          this.#tokens.push('1')
        } else if (token.toLowerCase() == 'false'
            || token.toLowerCase() == 'null') {
          this.#tokens.push('0');
        } else if (constants.has(token)) {
          this.#tokens.push(constants.get(token));
        } else {
          this.#tokens.push(token);
        }
        this.#hasValue = (token != 'return');
      } else if (c2 == '++' || c2 == '--' || c2 == '<=' || c2 == '>=' ||
          c2 == '==' || c2 == '!=' || c2 == '&&' || c2 == '||' || c2 == '+=' ||
          c2 == '-=' || c2 == '*=' || c2 == '/=' || c2 == '=>' || c2 == '::') {
        i++;
        this.#tokens.push(c2);
        this.#hasValue = false;
      } else if (c == '.') {
        if (isNumChar(data[i + 1])) {
          const start = i;
          while (isNumCharOrDot(data[i + 1])) {
            i++;
          }
          this.#tokens.push(data.substring(start, i + 1));
          this.#hasValue = true;
        } else if (data.substring(i, i + 3) == '...') {
          i += 2;
          this.#tokens.push('...');
          this.#hasValue = false;
        } else {
          this.#tokens.push(c);
          this.#hasValue = false;
        }
      } else if (c == '/' && !this.#hasValue) {
        const start = i;
        i++;
        while (i < data.length && data[i] != '/') {
          if (data[i] == '\\') {
            i++;
          }
          i++;
        }
        while (i < data.length && (data[i + 1] == 'g'
            || data[i + 1] == 'i')) {
          i++;
        }
        this.#tokens.push(data.substring(start, i + 1));
        this.#hasValue = true;
      } else if (c > ' ' && c != '\ufeff') {
        this.#tokens.push(c);
        this.#hasValue = (c == ')' || c == ']');
      }
    }
  }
}

class Parameter {
  /**
   * @param {string} name
   * @param {boolean=} varArgs
   * @param {Node=} defaultValueNode
   */
  constructor(name, varArgs, defaultValueNode) {
    /** @type {string} */
    this.name = name;
    /** @type {boolean} */
    this.varArgs = varArgs;
    /** @type {Node?} */
    this.defaultValueNode = defaultValueNode;
  }
}

class FunctionValue {
  /** @type {Array<Parameter>} */
  #params;
  /** @type {Node} */
  #bodyNode;
  /** @type {Environment} */
  #globalEnv;
  /** @type {Map<String, ValueType>} */
  #capturedVariables;

  /**
   * @param {Array<Parameter>} params
   * @param {Node} bodyNode
   * @param {Environment} globalEnv
   * @param {Map<String, ValueType>=} capturedVariables
   */
  constructor(params, bodyNode, globalEnv, capturedVariables) {
    this.#params = params;
    this.#bodyNode = bodyNode;
    this.#globalEnv = globalEnv;
    this.#capturedVariables = capturedVariables || new Map();
  }

  /**
   * @param {string} name
   * @param {string} fileName
   * @returns {string}
   */
  id(name, fileName) {
    let varArgs = this.#params.length > 0 && this.#params.at(-1).varArgs;
    let arity = this.#params.length - (varArgs ? 1 : 0);
    while (arity > 0 && (this.#params[arity - 1].defaultValueNode != null)) {
      arity--;
      varArgs = true;
    }
    return functionId(name, arity, varArgs, fileName);
  }

  /**
   * @param {Array<ValueType>} params
   * @returns {Promise<ValueType>}
   */
  async run(params) {
    const newEnv = new Environment(this.#globalEnv);
    newEnv.init();
    for (const [name, value] of this.#capturedVariables) {
      newEnv.set(name, value);
    }
    for (let i = 0; i < this.#params.length; i++) {
      if (i == this.#params.length - 1 && this.#params[i].varArgs) {
        const array = new ObjectValue();
        const length = Math.max(params.length - i, 0);
        array.set('length', length);
        for (let j = 0; j < length; j++) {
          array.set(j, params[i + j]);
        }
        newEnv.set(this.#params[i].name, array);
      } else if (params.length > i) {
        newEnv.set(this.#params[i].name, params[i]);
      } else if (this.#params[i].defaultValueNode == null) {
        throw 'Not enough parameters to call function.';
      } else {
        newEnv.set(this.#params[i].name,
            await this.#params[i].defaultValueNode.run(newEnv));
      }
    }
    const value = await this.#bodyNode.run(newEnv);
    if (value instanceof ReturnValue) {
      return value.value;
    }
    return value;
  }

  /**
   * @param {ObjectValue} value
   * @returns {FunctionValue}
   */
  withThis(value) {
    const capturedVariables = new Map(this.#capturedVariables);
    capturedVariables.set('this', value);
    return new FunctionValue(
        this.#params, this.#bodyNode, this.#globalEnv, capturedVariables);
  }
}

class ObjectValue {
  /** @type {Map<string, ValueType>} */
  #value = new Map();

  /**
   * @param {ValueType} name
   * @returns {ValueType?}
   */
  get(name) {
    const key = String(name);
    if (this.#value.has(key)) {
      return this.#value.get(key);
    }
    return null;
  }

  /** @param {ValueType} name */
  has(name) {
    return this.#value.has(String(name));
  }

  /**
   * @param {ValueType} name
   * @param {ValueType} value
   */
  set(name, value) {
    this.#value.set(String(name), value);
  }

  /** @returns {string} */
  toString() {
    let result = '{';
    let first = true;
    for (const [key, value] of this.#value) {
      if (first) {
        first = false;
      } else {
        result += ', ';
      }
      result += key + ': ';
      if (value == null) {
        result += 'null';
      } else if (value instanceof ObjectValue) {
        result += '{...}';
      } else if (typeof value == 'number') {
        result += value;
      } else if (value instanceof FunctionValue
          || String(value).indexOf('\n') >= 0) {
        result += '...';
      } else {
        result += '\"' + value + '\"';
      }
    }
    return result + '}';
  }
}

class ReturnValue {
  /**
   * @param {ValueType|Promise<ValueType>} value
   * @param {'break'|'continue'|'return'} type
   */
  constructor(value, type) {
    /** @type {ValueType|Promise<ValueType>} */
    this.value = value;
    /** @type {'break'|'continue'|'return'} */
    this.type = type;
  }
}

class Node {
  /** @type {(env: Environment) => (ValueType|Promise<ValueType>)} */
  #runner
  /** @type {(env: Environment, value: ValueType) => (void|Promise<void>)?} */
  #assigner

  /**
   * @param {(env: Environment) => (ValueType|Promise<ValueType>)} runner
   * @param {(env: Environment, value: ValueType) => (void|Promise<void>)=} assigner
  */
  constructor(runner, assigner) {
    this.#runner = runner;
    this.#assigner = assigner;
  }

  /**
   * @param {Environment} env
   * @returns {ValueType|Promise<ValueType>}
   */
  run(env) {
    return this.#runner(env);
  }

  /**
   * @param {Environment} env
   * @param {ValueType} value
   */
  async assign(env, value) {
    if (this.#assigner == null) {
      throw 'Cannot assign values to ' + await this.run(env);
    }
    await this.#assigner(env, value);
  }
}

/**
 * @param {Array<Node>} statements
 * @returns {Node}
 */
function blockNode(statements) {
  return new Node(async env => {
    let result;
    for (const statement of statements) {
      result = await statement.run(env);
      if (result instanceof ReturnValue) {
        return result;
      }
    }
    return result;
  });
}

class BinaryNode extends Node {
  /**
   * @param {number} precedence
   * @param {(env: Environment, left: Node?, right: Node?) => (ValueType|Promise<ValueType>)} runner
   * @param {(env: Environment, value: ValueType, left: Node?) => (void|Promise<void>)=} assigner
  */
  constructor(precedence, runner, assigner) {
    super(env => runner(env, this.left, this.right),
        (env, value) => assigner(env, value, this.left));
    /** @type {number} */
    this.precedence = precedence;
    /** @type {Node?} */
    this.left = null;
    /** @type {Node?} */
    this.right = null;
  }
}

/**
 * @param {number} precedence
 * @param {(left: ValueType, right: ValueType) => ValueType} runner
 * @returns {Node}
 */
function operatorNode(precedence, runner) {
  return new BinaryNode(precedence, async (env, left, right) => {
    const l = left ? await left.run(env) : null;
    if (l instanceof ReturnValue) {
      return l;
    }
    const r = right ? await right.run(env) : null;
    if (r instanceof ReturnValue) {
      return r;
    }
    return runner(l, r);
  });
}

/**
 * @param {ValueType} value
 * @returns {Node}
 */
function valueNode(value) {
  return new Node(() => value);
}

class VariableNode extends Node {
  /** @param {string} name */
  constructor(name) {
    super(env => env.get(name), (env, value) => env.set(name, value));
    /** @type {string} */
    this.name = name;
  }
}

/**
 * @param {Node} x
 * @param {Node} y
 * @returns {Node}
 */
function cellNode(x, y) {
  return new Node(
      async env => /** @type {(x: ValueType, y: ValueType) => ValueType} */(
          env.getFunction('cell', 2))(await x.run(env), await y.run(env)),
      async (env, value) =>
          /** @type {(x: ValueType, y: ValueType, value: ValueType) => void} */(
              env.getFunction('cell=', 3))(
                  await x.run(env), await y.run(env), value));
}

class ExpressionBuilder {
  /** @type {{right?: Node}} */
  #root = {}

  constructor() {
    /** @type {boolean} */
    this.hasValueNode = false;
  }

  /**
   * @param {number} precedence
   * @returns {{right?: Node}}
   */
  #currentNode(precedence) {
    let node = this.#root;
    while (node.right instanceof BinaryNode &&
        (node.right.precedence < precedence ||
            (node.right.precedence == precedence && precedence < 4))) {
      node = node.right;
    }
    return node;
  }

  /** @param {Node} node */
  add(node) {
    if (node instanceof BinaryNode) {
      const current = this.#currentNode(node.precedence);
      node.left = current.right;
      current.right = node;
      this.hasValueNode = node.precedence >= 18;
    } else {
      const current = this.#currentNode(18);
      if (current.right != null) {
        throw 'Missing an operator or semicolon.';
      }
      current.right = node;
      this.hasValueNode = true;
    }
  }

  /** @returns {Node?} */
  pop() {
    const current = this.#currentNode(18);
    const right = current.right;
    current.right = null;
    return right;
  }

  /** @returns {Node} */
  build() {
    const node = this.#root.right;
    if (!node) {
      return blockNode([]);
    }
    if (node instanceof BinaryNode) {
      node.precedence = 18;
    }
    return node;
  }
}

class Scope {
  /** @type {Set<string>} */
  #variables;
  /** @type {Set<string>} */
  #constants;
  /** @type {Set<string>} */
  #functions;

  /** @param {Scope=} parent */
  constructor(parent) {
    this.#variables = parent ? new Set(parent.#variables)
        : new Set(['x', 'y', 'Bottom', 'Col', 'Left', 'Right', 'Row',
            'SelBottom', 'SelLeft', 'SelRight', 'SelTop', 'Top']);
    this.#constants = new Set();
    this.#functions = parent ? new Set(parent.#functions) : new Set();
  }

  /** @param {string} constant */
  addConstant(constant) {
    this.#constants.add(constant);
  }

  /**
   * @param {string} name
   * @returns {Scope}
   */
  addFunction(name) {
    this.#functions.add(name);
    return this;
  }

  /**
   * @param {string} variable
   * @param {boolean=} mutate
   * @returns {Scope}
   */
  addVariable(variable, mutate) {
    if (mutate) {
      if (this.#constants.has(variable)) {
        throw 'Cannot modify constant or captured variable: ' + variable;
      }
    } else {
      this.#constants.delete(variable);
    }
    this.#variables.add(variable);
    return this;
  }

  /**
   * @param {string} name
   * @param {number} arity
   * @param {string} fileName
   * @param {boolean} apiOnly
   * @param {Environment} env
   */
  checkFunction(name, arity, fileName, apiOnly, env) {
    if (!apiOnly && (this.#functions.has(name) || this.#variables.has(name))) {
      return;
    }
    env.getFunction(name, arity, fileName, apiOnly);
  }

  /** @param {string} variable */
  checkInitialized(variable) {
    if (!this.#variables.has(variable)) {
      throw 'Uninitialized variable: ' + variable;
    }
  }

  /** @returns {Scope} */
  makeAllConst() {
    this.#constants = new Set(this.#variables);
    return this;
  }

  /** @param {string} variable */
  deleteVariable(variable) {
    this.#variables.delete(variable);
  }
}

/**
 * @param {string} token
 * @returns {string}
 */
function parseString(token) {
  let value = '';
  for (let i = 1; i < token.length - 1; i++) {
    if (token[i] != '\\') {
      value += token[i];
      continue;
    }
    i++;
    if (token[i] == 'n') {
      value += '\n';
    } else if (token[i] == 'r') {
      value += '\r';
    } else if (token[i] == 't') {
      value += '\t';
    } else {
      value += token[i];
    }
  }
  return value;
}

/**
 * @param {string} token
 * @returns {RegExp}
 */
function parseRegExp(token) {
  const p = token.lastIndexOf('/');
  return new RegExp(
      token.substring(1, p).replaceAll('\\/', '/'),
      token.substring(p + 1));
}

/**
 * @param {ValueType?} value
 * @returns {number?}
 */
function optionalNumber(value) {
  return value == undefined ? undefined : Number(value);
}

/**
 * @param {ValueType?} value
 * @returns {string?}
 */
function optionalString(value) {
  return value == undefined ? undefined : String(value);
}

/**
 * @param {ValueType} value
 * @returns {string|RegExp}
 */
function stringOrRegExp(value) {
  return value instanceof RegExp ? value : String(value);
}

class TreeBuilder {
  /** @type {string} */
  #fileName;
  /** @type {Tokenizer} */
  #tokens;
  /** @type {Environment} */
  #globalEnv;
  /** @type {Map<string, string>} */
  #imports = new Map();

  /**
   * @param {string} fileName
   * @param {string} script
   * @param {Environment} globalEnv
   */
  constructor(fileName, script, globalEnv) {
    this.#fileName = fileName;
    this.#tokens = new Tokenizer(script);
    this.#globalEnv = globalEnv;
    /** @type {Array<string>} */
    this.dependencies = [];
  }

  /** @param {string} expected */
  #nextExpected(expected) {
    const token = this.#tokens.next();
    if (token != expected) {
      throw 'Expected ' + expected + ' but got: ' + token;
    }
  }

  /**
   * @param {Scope} scope
   * @param {string} endToken
   * @returns {Array<Node>}
   */
  #buildTuple(scope, endToken) {
    const tuple = [];
    while (this.#tokens.hasNext()) {
      if (this.#tokens.peek() == endToken) {
        this.#tokens.next();
        return tuple;
      }
      tuple.push(this.#buildExpression(scope));
      if (this.#tokens.peek() == ',') {
        this.#tokens.next();
      } else if (this.#tokens.peek() != endToken) {
        throw 'Expected , or ' + endToken +' but got: ' + this.#tokens.next();
      }
    }
    throw 'Missing ' + endToken;
  }

  /**
   * @param {Scope} scope
   * @param {Node} left
   * @param {boolean=} apiOnly
   * @returns {Node}
   */
  #buildFunctionCallNode(scope, left, apiOnly) {
    const params = this.#buildTuple(scope, ')');
    if (left instanceof VariableNode &&
        (apiOnly || !this.#imports.has(left.name))) {
      scope.checkFunction(
          left.name, params.length, this.#fileName, apiOnly, this.#globalEnv);
    }
    const node = new Node(
        async env => {
          const func = (left instanceof VariableNode)
              ? (!apiOnly && this.#imports.has(left.name))
                  ? env.getFunction(this.#imports.get(left.name), params.length)
                  : env.getFunction(left.name, params.length, this.#fileName, apiOnly)
              : await left.run(env);
          let paramResults = [];
          for (const p of params) {
            paramResults.push(await p.run(env));
          }
          if (func instanceof FunctionValue) {
            return func.run(paramResults);
          } else if (typeof func == 'function') {
            return func(...paramResults);
          } else if (func === swapFunction) {
            await params[0].assign(env, paramResults[1]);
            await params[1].assign(env, paramResults[0]);
          } else {
            throw 'Not a function: ' + func;
          }
        },
        async (env, value) => {
          if (!(left instanceof VariableNode)) {
            throw 'Cannot assign values to function result: ' +
                await node.run(env);
          } else if (left.name == 'cell') {
            const x = await params[0].run(env);
            const y = await params[1].run(env);
            /** @type {(x: ValueType, y: ValueType, value: ValueType) => void}*/(
                env.getFunction('cell=', 3))(x, y, value);
          } else if (left.name == 'mid') {
            const str = String(await params[0].run(env));
            const start = Number(await params[1].run(env)) - 1;
            const len = Number(await params[2].run(env));
            await params[0].assign(env, str.substring(0, start) + value
                + str.substring(start + len));
          } else {
            throw 'Cannot assign values to function result: ' + left.name;
          }
        });
    return node;
  }

  /**
   * @param {Node} left
   * @param {Node} right
   * @returns {Node}
   */
  #buildMemberAccessNode(left, right) {
    return new Node(
        async env => {
          const obj = await left.run(env);
          const name = await right.run(env);
          if (obj instanceof ObjectValue) {
            const result = obj.get(name);
            if (result == null) {
              throw 'Undefined member: ' + name + '\nObject: ' + String(obj);
            }
            if (result instanceof FunctionValue) {
              return result.withThis(obj);
            }
            return result;
          }
          const str = String(obj);
          if (name == 'endsWith') {
            return (a, b) =>
                str.endsWith(String(a), optionalNumber(b)) ? 1 : 0;
          } else if (name == 'includes') {
            return (a, b) =>
                str.includes(String(a), optionalNumber(b)) ? 1 : 0;
          } else if (name == 'indexOf') {
            return (a, b) => str.indexOf(String(a), optionalNumber(b));
          } else if (name == 'lastIndexOf') {
            return (a, b) => str.lastIndexOf(String(a), optionalNumber(b));
          } else if (name == 'length') {
            return str.length;
          } else if (name == 'padEnd') {
            return (a, b) => str.padEnd(Number(a), optionalString(b));
          } else if (name == 'padStart') {
            return (a, b) => str.padStart(Number(a), optionalString(b));
          } else if (name == 'repeat') {
            return a => str.repeat(Number(a));
          } else if (name == 'replace') {
            return (a, b) => str.replace(stringOrRegExp(a), String(b));
          } else if (name == 'replaceAll') {
            return (a, b) => str.replaceAll(stringOrRegExp(a), String(b));
          } else if (name == 'search') {
            return a => str.search(stringOrRegExp(a));
          } else if (name == 'startsWith') {
            return (a, b) => str.startsWith(String(a), optionalNumber(b)) ? 1 : 0;
          } else if (name == 'substring') {
            return (a, b) => str.substring(Number(a), optionalNumber(b));
          } else if (name == 'toLowerCase') {
            return () => str.toLowerCase();
          } else if (name == 'toString') {
            return () => String(str);
          } else if (name == 'toUpperCase') {
            return () => str.toUpperCase();
          } else if (name == 'trim') {
            return () => str.trim();
          } else if (name == 'trimEnd') {
            return () => str.trimEnd();
          } else if (name == 'trimStart') {
            return () => str.trimStart();
          } else if (!isNaN(Number(name))) {
            return str[Number(name)] || '';
          } else {
            throw 'Undefined member: ' + name + '\nString: ' + String(obj);
          }
        },
        async (env, value) => {
          const obj = await left.run(env);
          const name = await right.run(env);
          if (obj instanceof ObjectValue) {
            obj.set(name, value);
          } else {
            throw obj + ' is not an object. Setting: ' + name;
          }
        });
  }

  /**
   * @param {Scope} scope
   * @returns {Node}
   */
  #buildObjectNode(scope) {
    const members = new Map();
    while (this.#tokens.hasNext()) {
      let name = this.#tokens.next();
      if (name == '}') {
        break;
      }
      if (name[0] == '"' || name[0] == "'") {
        name = parseString(name);
      } else if (isNumCharOrDot(name[0])) {
        name = String(Number(name));
      }
      const token = this.#tokens.next();
      if (token == ':') {
        members.set(name, this.#buildExpression(scope));
        if (this.#tokens.peek() == ',') {
          this.#tokens.next();
        } else if (this.#tokens.peek() != '}') {
          throw 'Expected , or } but got: ' + this.#tokens.next();
        }
      } else if (token == '(') {
        const methodScope = new Scope(scope).addVariable('this');
        const paramNodes = this.#buildParameters(methodScope);
        const bodyNode = this.#buildStatement(methodScope);
        members.set(name, valueNode(
            new FunctionValue(paramNodes, bodyNode, this.#globalEnv)));
        if (this.#tokens.peek() == ',') {
          this.#tokens.next();
        }
      } else {
        throw 'Expected : or ( but got: ' + token;
      }
    }
    return new Node(async env => {
      const object = new ObjectValue();
      for (const [name, child] of members) {
        object.set(name, await child.run(env));
      }
      return object;
    });
  }

  /**
   * @param {Scope} scope
   * @returns {FunctionValue}
   */
  #buildClassValue(scope) {
    const objectNode = this.#buildObjectNode(scope);
    const constructorNode = new Node(async env => {
      const obj = /** @type {ObjectValue} */(await objectNode.run(env));
      if (obj.has('constructor')) {
        const constructor = obj.get('constructor');
        if (constructor instanceof FunctionValue) {
          const p = /** @type {ObjectValue} */(env.get('$p'));
          const params = [];
          for (let i = 0; i < Number(p.get('length')); i++) {
            params.push(p.get(i));
          }
          await constructor.withThis(obj).run(params);
        }
      }
      return obj;
    });
    const parameter = new Parameter('$p', /* varArgs= */ true);
    return new FunctionValue([parameter], constructorNode, this.#globalEnv);
  }

  /**
   * @param {Scope} scope
   * @returns {Array<Parameter>}
   */
  #buildParameters(scope) {
    /** @type {Array<Parameter>} */
    const params = [];
    if (this.#tokens.peek() == ')') {
      this.#tokens.next();
      return params;
    }
    while (this.#tokens.hasNext()) {
      let varArgs = false;
      if (this.#tokens.peek() == '...') {
        varArgs = true;
        this.#tokens.next();
      }
      const name = this.#tokens.next();
      if (!isAlphaChar(name[0])) {
        throw 'Expected parameter name but got: ' + name;
      }
      let defaultValueNode = null;
      let token = this.#tokens.next();
      if (token == '=') {
        defaultValueNode = this.#buildExpression(scope);
        token = this.#tokens.next();
      }
      params.push(new Parameter(name, varArgs, defaultValueNode));
      scope.addVariable(name);
      if (token == ')') {
        return params;
      } else if (token != ',') {
        throw 'Expected ) or , but got: ' + token;
      }
    }
    throw 'Missing )';
  }

  #isLambda() {
    return (this.#tokens.peek(0) == ")" && this.#tokens.peek(1) == "=>") ||
        this.#tokens.peek(0) == '...' ||
        (isAlphaChar(this.#tokens.peek(0)) &&
            (this.#tokens.peek(1) == ',' || this.#tokens.peek(1) == '=' ||
                (this.#tokens.peek(1) == ')' && this.#tokens.peek(2) == '=>')));
  }

  /**
   * @param {Scope} scope
   * @param {Array<Parameter>} params
   * @returns {Node}
   */
  #buildLambdaNode(scope, params) {
    this.#nextExpected('=>');
    let bodyNode;
    if (this.#tokens.peek() == '{') {
      bodyNode = this.#buildStatement(scope);
    } else {
      bodyNode = this.#buildExpression(scope);
    }
    return new Node(env =>
        new FunctionValue(params, bodyNode, this.#globalEnv, env.variables()));
  }

  #readImport() {
    this.#nextExpected('import');
    this.#nextExpected('{');
    const names = [];
    while (this.#tokens.hasNext()) {
      names.push(this.#tokens.next());
      const next = this.#tokens.next();
      if (next == '}') {
        break;
      } else if (next != ',') {
        throw 'Expected } or , but got: ' + next;
      }
    }
    this.#nextExpected('from');
    const fileName = parseString(this.#tokens.next());
    this.#nextExpected(';');
    for (const name of names) {
      this.#imports.set(name, fileName + '\n' + name);
    }
    this.dependencies.push(fileName);
  }

  /**
   * @param {Scope} scope
   * @returns {Node}
   */
  #buildExpression(scope) {
    const expr = new ExpressionBuilder();
    while (this.#tokens.hasNext()) {
      const token = this.#tokens.peek();
      if (token == ')' || token == ']' || token == '}' || token == ';' ||
          token == ',' || token == ':') {
        break;
      }
      this.#tokens.next();
      if (token == 'new' &&
          this.#tokens.hasNext() && isAlphaChar(this.#tokens.peek()[0])) {
        // Ignore
      } else if (token == 'in' && expr.hasValueNode) {
        expr.add(operatorNode(10, (a, b) => {
          if (b instanceof ObjectValue) {
            return b.has(String(a)) ? 1 : 0;
          } else {
            throw 'right-hand side of "in" should be an object. Found: ' + b;
          }
        }));
      } else if (token[0] == '"' || token[0] == "'") {
        expr.add(valueNode(parseString(token)));
      } else if (isNumChar(token[0])) {
        expr.add(valueNode(parseFloat(token)));
      } else if (token.length > 2 && token[0] == '/') {
        expr.add(valueNode(parseRegExp(token)));
      } else if (isAlphaChar(token[0])) {
        if (this.#tokens.peek() == '=>') {
          expr.add(this.#buildLambdaNode(
              new Scope(scope).makeAllConst().addVariable(token),
              [new Parameter(token)]));
        } else {
          if (this.#tokens.peek() == '=') {
            scope.addVariable(token, /* mutate= */ true);
          } else if (this.#tokens.peek() != '(') {
            scope.checkInitialized(token);
          }
          expr.add(new VariableNode(token));
        }
      } else if (token == '.') {
        if (!expr.hasValueNode) {
          throw 'Unexpected token: ' + token + (this.#tokens.peek() || '');
        }
        expr.add(this.#buildMemberAccessNode(
            expr.pop(), valueNode(this.#tokens.next())));
      } else if (token == '[') {
        const params = this.#buildTuple(scope, ']');
        if (expr.hasValueNode) {
          if (params.length != 1) {
            throw 'obj[x] format should have exactly 1 parameter. Found: '
                + params.length;
          }
          expr.add(this.#buildMemberAccessNode(expr.pop(), params[0]));
        } else {
          if (params.length != 2) {
            throw '[x,y] format should have exactly 2 parameters. Found: '
                + params.length;
          }
          expr.add(cellNode(params[0], params[1]));
        }
      } else if (token == '{') {
        expr.add(this.#buildObjectNode(scope));
      } else if (token == '(') {
        if (expr.hasValueNode) {
          expr.add(this.#buildFunctionCallNode(scope, expr.pop()));
        } else if (this.#isLambda()) {
          const lambdaScope = new Scope(scope).makeAllConst();
          const params = this.#buildParameters(lambdaScope);
          expr.add(this.#buildLambdaNode(lambdaScope, params));
        } else {
          expr.add(this.#buildExpression(scope));
          this.#nextExpected(')');
        }
      } else if (token == '::') {
        const func = new VariableNode(this.#tokens.next());
        this.#nextExpected('(');
        expr.add(this.#buildFunctionCallNode(scope, func, /* apiOnly= */ true));
      } else if (token == '!') {
        expr.add(operatorNode(15, (l, r) => (Number(r) != 0) ? 0 : 1));
      } else if (token == '++') {
        expr.add(new BinaryNode(15, async (env, left, right) => {
          const child = left || right;
          const value = Number(await child.run(env)) + 1;
          await child.assign(env, value);
          return value;
        }));
      } else if (token == '--') {
        expr.add(new BinaryNode(15, async (env, left, right) => {
          const child = left || right;
          const value = Number(await child.run(env)) - 1;
          await child.assign(env, value);
          return value;
        }));
      } else if (token == '*') {
        expr.add(operatorNode(13, (a, b) => Number(a) * Number(b)));
      } else if (token == '/') {
        expr.add(operatorNode(13, (a, b) => Number(a) / Number(b)));
      } else if (token == '%') {
        expr.add(operatorNode(13, (a, b) => Number(a) % Number(b)));
      } else if (token == '+') {
        if (expr.hasValueNode) {
          expr.add(operatorNode(
              12, (a, b) => /** @type {any} */(a) + /** @type {any} */(b)));
        }
      } else if (token == '-') {
        if (expr.hasValueNode) {
          expr.add(operatorNode(12, (a, b) => Number(a) - Number(b)));
        } else {
          expr.add(operatorNode(15, (a, b) => -b));
        }
      } else if (token == '<') {
        expr.add(operatorNode(10, (a, b) => a < b ? 1 : 0));
      } else if (token == '<=') {
        expr.add(operatorNode(10, (a, b) => a <= b ? 1 : 0));
      } else if (token == '>') {
        expr.add(operatorNode(10, (a, b) => a > b ? 1 : 0));
      } else if (token == '>=') {
        expr.add(operatorNode(10, (a, b) => a >= b ? 1 : 0));
      } else if (token == '==') {
        expr.add(operatorNode(9,
            (a, b) => (String(a) === String(b)) ? 1 : 0));
      } else if (token == '!=') {
        expr.add(operatorNode(9,
            (a, b) => (String(a) !== String(b)) ? 1 : 0));
      } else if (token == '&&' || token == '&') {
        expr.add(new BinaryNode(5, async (env, left, right) => {
          const l = await left.run(env);
          return (Number(l) == 0) ? l : right.run(env);
        }));
      } else if (token == '||' || token == '|') {
        expr.add(new BinaryNode(4, async (env, left, right) => {
          const l = await left.run(env);
          return (Number(l) != 0) ? l : right.run(env);
        }));
      } else if (token == '?') {
        const thenNode = this.#buildExpression(scope);
        this.#nextExpected(':');
        expr.add(new BinaryNode(3, async (env, left, right) => {
          const l = await left.run(env);
          return (Number(l) != 0) ? thenNode.run(env) : right.run(env);
        }));
      } else if (token == '=') {
        if (!expr.hasValueNode) {
          throw 'Unexpected token: =';
        }
        expr.add(new BinaryNode(2, async (env, left, right) => {
          if (left == null || right == null) {
            throw 'Operand is missing: =';
          }
          const value = await right.run(env);
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '+=') {
        expr.add(new BinaryNode(2, async (env, left, right) => {
          const value = /** @type {any} */(await left.run(env)) +
              /** @type {any} */(await right.run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '-=') {
        expr.add(new BinaryNode(2, async (env, left, right) => {
          const value =
              Number(await left.run(env)) - Number(await right.run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '*=') {
        expr.add(new BinaryNode(2, async (env, left, right) => {
          const value =
              Number(await left.run(env)) * Number(await right.run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '/=') {
        expr.add(new BinaryNode(2, async (env, left, right) => {
          const value =
              Number(await left.run(env)) / Number(await right.run(env));
          await left.assign(env, value);
          return value;
        }));
      } else {
        throw "Invalid token: " + token;
      }
    }
    return expr.build();
  }

  /**
   * @param {Scope} scope
   * @returns {Node?}
   */
  #buildStatement(scope) {
    const token0 = this.#tokens.peek(0);
    const token1 = this.#tokens.peek(1) || '';
    if (token0 == '{') {
      this.#tokens.next();
      /** @type {Array<Node>} */
      const statements = [];
      while (this.#tokens.hasNext()) {
        if (this.#tokens.peek() == '}') {
          this.#tokens.next();
          return blockNode(statements);
        }
        statements.push(this.#buildStatement(scope));
      }
      throw 'Missing }';
    } else if (token0 == 'if' && token1 == '(') {
      this.#tokens.next();
      this.#tokens.next();
      const condNode = this.#buildExpression(scope);
      this.#nextExpected(')');
      const thenNode = this.#buildStatement(scope);
      /** @type {Node?} */
      let elseNode = null;
      if (this.#tokens.peek() == 'else') {
        this.#tokens.next();
        elseNode = this.#buildStatement(scope);
      }
      return new Node(async env => {
        if (await condNode.run(env)) {
          return await thenNode.run(env);
        } else if(elseNode != null) {
          return await elseNode.run(env);
        }
      });
    } else if (token0 == 'while' && token1 == '(') {
      this.#tokens.next();
      this.#tokens.next();
      const condNode = this.#buildExpression(scope);
      this.#nextExpected(')');
      const bodyNode = this.#buildStatement(scope);
      return new Node(async env => {
        while (await condNode.run(env)) {
          env.countLoop();
          const value = await bodyNode.run(env);
          if (value instanceof ReturnValue) {
            if (value.type == 'break') {
              break;
            } else if (value.type != 'continue') {
              return value;
            }
          }
        }
      });
    } else if (token0 == 'for' && token1 == '(') {
      this.#tokens.next();
      this.#tokens.next();
      if (this.#tokens.peek(1)== 'of') {
        const variable = this.#tokens.next();
        this.#tokens.next();
        const arrayNode = this.#buildExpression(scope);
        this.#nextExpected(')');
        scope.addVariable(variable);
        const bodyNode = this.#buildStatement(scope);
        scope.deleteVariable(variable);
        return new Node(async env => {
          const obj = /** @type {ObjectValue} */(await arrayNode.run(env));
          for (let i = 0; i < Number(obj.get('length')); i++) {
            env.countLoop();
            env.set(variable, obj.get(i));
            const value = await bodyNode.run(env);
            if (value instanceof ReturnValue) {
              if (value.type == 'break') {
                break;
              } else if (value.type != 'continue') {
                return value;
              }
            }
          }
        });
      }
      const initNode = this.#buildStatement(scope);
      const condNode = this.#buildExpression(scope);
      this.#nextExpected(';');
      const nextNode = this.#buildExpression(scope);
      this.#nextExpected(')');
      const bodyNode = this.#buildStatement(scope);
      return new Node(async env => {
        await initNode.run(env);
        while (await condNode.run(env)) {
          env.countLoop();
          const value = await bodyNode.run(env);
          if (value instanceof ReturnValue) {
            if (value.type == 'break') {
              break;
            } else if (value.type != 'continue') {
              return value;
            }
          }
          await nextNode.run(env);
        }
      });
    } else if (token0 == 'function') {
      this.#tokens.next();
      const name = this.#tokens.next();
      this.#nextExpected('(');
      const functionScope = new Scope(scope).addFunction(name);
      const paramNodes = this.#buildParameters(functionScope);
      const bodyNode = this.#buildStatement(functionScope);
      const func = new FunctionValue(paramNodes, bodyNode, this.#globalEnv);
      this.#globalEnv.setFunction(name, this.#fileName, func);
      return null;
    } else if (token0 == 'return' || token0 == 'break' ||
        token0 == 'continue') {
      this.#tokens.next();
      const valueNode = this.#buildExpression(scope);
      this.#nextExpected(';');
      return new Node(async env =>
          new ReturnValue(await valueNode.run(env), token0));
    } else if (token0 == 'class' && isAlphaChar(token1[0])) {
      this.#tokens.next();
      const name = this.#tokens.next();
      this.#nextExpected('{');
      const func = this.#buildClassValue(new Scope(scope).addFunction(name));
      this.#globalEnv.setFunction(name, this.#fileName, func);
      return null;
    } else if (token0 == 'import') {
      this.#readImport();
      return null;
    } else if ((token0 == 'const' || token0 == 'let' || token0 == 'var') &&
        isAlphaChar(token1[0])) {
      this.#tokens.next();
      const node = this.#buildExpression(scope);
      this.#nextExpected(';');
      if (token0 == 'const') {
        scope.addConstant(token1);
      }
      return node;
    } else {
      const node = this.#buildExpression(scope);
      if (this.#tokens.peek() == ';') {
        this.#tokens.next();
      }
      return node;
    }
  }

  /** @returns {Node} */
  build() {
    /** @type {Array<Node>} */
    const statements = [];
    const scope = new Scope();
    while (this.#tokens.hasNext()) {
      const statement = this.#buildStatement(scope);
      if (statement) {
        statements.push(statement);
      }
    }
    return blockNode(statements);
  }

  /** @returns {string} */
  positionString() {
    return this.#tokens.positionString();
  }
}

/**
 * @param {string} fileName
 * @param {Environment} env
 * @param {Map<string, string>} macroMap
 * @returns {Array<string>}
 */
function load(fileName, env, macroMap) {
  if (macroMap == null || !macroMap.has(fileName)) {
    throw 'Imported library not found: ' + fileName;
  }
  const treeBuilder = new TreeBuilder(fileName, macroMap.get(fileName), env);
  try {
    treeBuilder.build();
  } catch (e) {
    throw e + '\n' + fileName + '\n' + treeBuilder.positionString();
  }
  return treeBuilder.dependencies;
}

/**
 * @param {string} script
 * @param {Environment} env
 * @param {Map<string, string>} macroMap
 * @returns {Promise<ValueType>}
 */
async function run(script, env, macroMap) {
  const treeBuilder = new TreeBuilder(/* fileName= */ '', script, env);
  let tree;
  try {
    tree = treeBuilder.build();
  } catch (e) {
    throw e + '\n' + treeBuilder.positionString();
  }
  let dependencies = treeBuilder.dependencies;
  const loaded = new Set();
  while (dependencies.length > 0) {
    const fileName = dependencies.shift();
    if (loaded.has(fileName)) {
      continue;
    }
    loaded.add(fileName);
    dependencies = dependencies.concat(load(fileName, env, macroMap));
  }
  env.init();
  const result = await tree.run(env);
  return (result instanceof ReturnValue) ? result.value : result;
}

module.exports = { Environment, FunctionValue, ObjectValue, run };
});
