(() => {
const { createReplacer } = net.asukaze.import('./cassava_replacer.js');

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
 * @typedef {((...args: ValueType[]) => ValueType|Promise<ValueType>|void|Promise<void>)|SwapFunction} MacroFunction
 */

/** @type {Map<string, MacroFunction>} */
const builtInFunctions = new Map(Object.entries({
  'acos/1': a => Math.acos(Number(a)),
  'ascW/1': a => a.toString().charCodeAt(0),
  'asin/1': a => Math.asin(Number(a)),
  'atan/1': a => Math.atan(Number(a)),
  'atan2/2': (a, b) => Math.atan2(Number(a), Number(b)),
  'chrW/1': a => String.fromCharCode(Number(a)),
  'cos/1': a => Math.cos(Number(a)),
  'double/1': a => Number(a),
  'int/1': a => Math.trunc(Number(a)),
  'left/2': (a, b) => a.toString().slice(0, Number(b)),
  'len/1': a => a.toString().length,
  'max/+1': (...a) => Math.max(...a.map(Number)),
  'mid/2': (a, b) => a.toString().substring(Number(b) - 1),
  'mid/3': (a, b, c) =>
      a.toString().substring(Number(b) - 1, Number(b) - 1 + Number(c)),
  'min/+1': (...a) => Math.min(...a.map(Number)),
  'pos/2': (a, b) => a.toString().indexOf(b.toString()) + 1,
  'pow/2': (a, b) => Math.pow(Number(a), Number(b)),
  'random/1': a => Math.floor(Math.random() * Number(a)),
  'replace/+3': (str1, str2, str3, ignoreCase, isRegex) => createReplacer(
      str2.toString(), str3.toString(), !!ignoreCase, false, !!isRegex)(
          str1.toString()),
  'right/2': (a, b) => a.toString().slice(-b),
  'sin/1': a => Math.sin(Number(a)),
  'sqrt/1': a => Math.sqrt(Number(a)),
  'str/1': a => a.toString(),
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
 * @param {Map<string, ValueType>} map
 * @param {string} name
 * @param {number} arity
 * @param {string=} fileName
 * @returns {Function|SwapFunction?}
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
    /** @type {Set<string>} */
    #constants = new Set();
    /** @type {Map<string, Function>} */
    #functions;

  /**
   * @param {Environment} parent
   * @param {Map<string, Function>=} api
   */
  constructor(parent, api) {
    this.#functions = (parent != null) ? parent.#functions : new Map(api);
    /** @type {Map<string, ValueType>} */
    this.variables = new Map();
    /** @type {number} */
    this.loop = (parent != null) ? parent.loop - 1: 1000000;
  }

  init() {
    this.set('x', this.get('Col'));
    this.set('y', this.get('Row'));
  }

  /**
   * @param {string} name
   * @param {number=} arity
   * @param {string=} fileName
   * @returns {ValueType}
   */
  get(name, arity, fileName) {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (arity == null) {
      if (this.#functions.has(name + '=/0')) {
        return this.#functions.get(name + '=/0')();
      }
      throw 'Undefined variable: ' + name;
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
    const builtIn = findFunction(builtInFunctions, name, arity);
    if (builtIn) {
      return builtIn;
    }
    throw 'Cannot find a function: ' + functionId(name, arity);
  }

  /** @param {string} name */
  has(name) {
    if (name.indexOf('/') == -1) {
      return this.variables.has(name);
    } else {
      return this.#functions.has(name);
    }
  }

  /**
   * @param {string} name
   * @param {ValueType} value
   * @param {''|'const'|'let'|'var'=} type
   */
  set(name, value, type) {
    if (this.#functions.has(name + '=/1')) {
      this.#functions.get(name + '=/1')(value);
      return;
    }
    if (this.#constants.has(name)) {
      throw 'Cannot modify constant: ' + name;
    }
    if (type == 'const') {
      this.#constants.add(name);
    }
    if (name.indexOf('/') == -1) {
      this.variables.set(name, value);
    } else {
      this.#functions.set(name, /** @type {Function} */(value));
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

/**
 * @param {string} data
 * @returns {Array<string>}
 */
function tokenize(data) {
  const result = [];
  let hasValue = false;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    const c2 = data.substring(i, i + 2);
    if (c2 == '//') {
      while (i < data.length && data[i] != '\n') {
        i++;
      }
    } else if (c2 == '/*') {
      while (i < data.length
          && data.substring(i - 1, i + 1) != '*/') {
        i++;
      }
    } else if (c == '"' || c == "'") {
      const start = i;
      i++;
      while (i < data.length && data[i] != c) {
        if (data[i] == '\\') {
          i++;
        }
        i++;
      }
      result.push(data.substring(start, i + 1));
      hasValue = true;
    } else if (isNumChar(c)) {
      const start = i;
      while (isNumCharOrDot(data[i + 1])) {
        i++;
      }
      result.push(data.substring(start, i + 1));
      hasValue = true;
    } else if (isAlphaChar(c)) {
      const start = i;
      while (isAlphaNumChar(data[i + 1])) {
        i++;
      }
      const token = data.substring(start, i + 1);
      if (token.toLowerCase() == 'true') {
        result.push('1')
      } else if (token.toLowerCase() == 'false'
          || token.toLowerCase() == 'null') {
        result.push('0');
      } else {
        result.push(token);
      }
      hasValue = (token != 'return');
    } else if (c2 == '++' || c2 == '--'
        || c2 == '<=' || c2 == '>=' || c2 == '=='
        || c2 == '!=' || c2 == '&&' || c2 == '||'
        || c2 == '+=' || c2 == '-=' || c2 == '*='
        || c2 == '/=' || c2 == '=>') {
      i++;
      result.push(c2);
      hasValue = false;
    } else if (c == '.') {
      if (isNumChar(data[i + 1])) {
        const start = i;
        while (isNumCharOrDot(data[i + 1])) {
          i++;
        }
        result.push(data.substring(start, i + 1));
        hasValue = true;
      } else if (data.substring(i, i + 3)
                 == '...') {
        i += 2;
        result.push('...');
        hasValue = false;
      } else {
        result.push(c);
        hasValue = false;
      }
    } else if (c == '/' && !hasValue) {
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
      result.push(data.substring(start, i + 1));
      hasValue = true;
    } else if (c > ' ' && c != '\ufeff') {
      result.push(c);
      hasValue = (c == ')' || c == ']');
    }
  }
  return result;
}

class FunctionValue {
  /** @type {Array<string>} */
  #paramNames;
  /** @type {Array<Node>} */
  #defaultValues;
  /** @type {boolean} */
  #varArgs;
  /** @type {Node} */
  #bodyNode;
  /** @type {Map<String, ValueType>} */
  #envMap;

  /**
   * @param {Array<Node>} paramNodes
   * @param {Node} bodyNode
   * @param {Map<String, ValueType>=} envMap
   */
  constructor(paramNodes, bodyNode, envMap) {
    this.#paramNames = paramNodes.map(p => (p.left || p).name);
    this.#defaultValues = paramNodes.map(p => p.children[0]);
    this.#varArgs = paramNodes.length > 0 && paramNodes.at(-1).varArgs;
    this.#bodyNode = bodyNode;
    this.#envMap = envMap || new Map();
  }

  /**
   * @param {string} name
   * @param {string} fileName
   * @returns {string}
   */
  id(name, fileName) {
    let arity = this.#paramNames.length - (this.#varArgs ?  1 : 0);
    while (arity > 0 && this.#defaultValues[arity - 1] != null) {
      arity--;
    }
    return functionId(name, arity, this.#varArgs, fileName);
  }

  /**
   * @param {Array<ValueType>} params
   * @param {Environment} env
   * @returns {Promise<ValueType>}
   */
  async run(params, env) {
    const newEnv = new Environment(env);
    if (newEnv.loop <= 0) {
      throw 'Too deep recursion.';
    }
    newEnv.init();
    for (const [name, value] of this.#envMap) {
      newEnv.set(name, value);
    }
    for (let i = 0; i < this.#paramNames.length; i++) {
      if (this.#varArgs && i == this.#paramNames.length - 1) {
        const array = new ObjectValue();
        const length = Math.max(params.length - i, 0);
        array.set('length', length);
        for (let j = 0; j < length; j++) {
          array.set(j, params[i + j]);
        }
        newEnv.set(this.#paramNames[i], array);
      } else if (params.length > i) {
        newEnv.set(this.#paramNames[i], params[i]);
      } else if (this.#defaultValues[i] == null) {
        throw 'Not enough parameters to call function.';
      } else {
        newEnv.set(this.#paramNames[i],
            await this.#defaultValues[i].run(newEnv));
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
  setThis(value) {
    this.#envMap.set('this', value);
    return this;
  }
}

class ObjectValue {
  /** @type {Map<string, ValueType>} */
  #value = new Map();

  /** @param {ValueType} name */
  get(name) {
    const key = name.toString();
    if (this.#value.has(key)) {
      return this.#value.get(key);
    }
    throw 'Undefined member: ' + name + '\nObject: ' + this.toString();
  }

  /** @param {ValueType} name */
  has(name) {
    return this.#value.has(name.toString());
  }

  /**
   * @param {ValueType} name
   * @param {ValueType} value
   */
  set(name, value) {
    this.#value.set(name.toString(), value);
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
          || value.toString().indexOf('\n') >= 0) {
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
   * @param {ValueType} value
   * @param {'break'|'continue'|'return'} type
   */
  constructor(value, type) {
    /** @type {ValueType} */
    this.value = value;
    /** @type {'break'|'continue'|'return'} */
    this.type = type;
  }
}

class Node {
  /** @type {(env: Environment, left: Node?, children: Array<Node>) => (ValueType|Promise<ValueType>)} */
  #runner
  /** @type {(env: Environment, value: ValueType, left: Node?) => (void|Promise<void>)?} */
  #assigner

  /**
   * @param {number} precedence
   * @param {(env: Environment, left: Node?, children: Array<Node>) => (ValueType|Promise<ValueType>)} runner
   * @param {(env: Environment, value: ValueType, left: Node?) => (void|Promise<void>)=} assigner
   * @param {string=} name
   * @param {boolean=} varArgs
   */
  constructor(precedence, runner, assigner, name, varArgs) {
    /** @type {Node?} */
    this.left = null;
    /** @type {Array<Node>} */
    this.children = [];
    /** @type {number} */
    this.precedence = precedence;
    this.#runner = runner;
    this.#assigner = assigner;
    /** @type {string?} */
    this.name = name;
    /** @type {boolean} */
    this.varArgs = !!varArgs;
  }

  /** @param {Node} node */
  add(node) {
    this.children.push(node);
  }

  freeze() {
    this.precedence = 100;
  }

  /** @returns {boolean} */
  isValue() {
    return this.precedence >= 100;
  }

  /**
   * @param {Environment} env
   * @returns {ValueType|Promise<ValueType>}
   */
  run(env) {
    return this.#runner(env, this.left, this.children);
  }

  /**
   * @param {Environment} env
   * @param {ValueType} value
   */
  async assign(env, value) {
    if (this.#assigner == null) {
      throw 'Cannot assign values to ' + await this.run(env);
    }
    await this.#assigner(env, value, this.left);
  }
}

/** @returns {Node} */
function blockNode() {
  return new Node(0, async (env, left, children) => {
    let result;
    for (const node of children) {
      result = await node.run(env);
      if (result instanceof ReturnValue) {
        return result;
      }
    }
    return result;
  });
}

/**
 * @param {number} precedence
 * @param {(left: ValueType, right: ValueType) => ValueType} runner
 * @returns
 */
function operatorNode(precedence, runner) {
  return new Node(precedence, async (env, left, children) => {
    const l = left ? await left.run(env) : null;
    if (l instanceof ReturnValue) {
      return l;
    }
    const r = children[0] ? await children[0].run(env) : null;
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
  return new Node(100, () => value);
}

/**
 * @param {string} name
 * @param {''|'const'|'let'|'var'=} type
 * @param {boolean=} varArgs
 * @returns {Node}
 */
function variableNode(name, type, varArgs) {
  return new Node(
      100,
      env => env.get(name),
      (env, value) => env.set(name, value, type),
      name, varArgs);
}

/**
 * @param {Node} x
 * @param {Node} y
 * @returns {Node}
 */
function cellNode(x, y) {
  return new Node(
      100,
      async env => /** @type {(x: ValueType, y: ValueType) => ValueType} */(
          env.get('cell', 2))(await x.run(env), await y.run(env)),
      async (env, value) =>
          /** @type {(x: ValueType, y: ValueType, value: ValueType) => void} */(
              env.get('cell=', 3))(await x.run(env), await y.run(env), value));
}

class NodeStack {
  /** @type {Array<Node>} */
  #stack;

  /** @param {Node} root */
  constructor(root) {
    this.#stack = [root];
  }

  /**
   * @param {Node} node
   * @returns {boolean}
   */
  isLowerPrecedence(node) {
    const current = this.#stack.at(-1).precedence;
    return node.precedence < current
        || (node.precedence == current
            && current != 3
            && current != 2);
  }

  /** @param {Node} node */
  push(node) {
    if (node.isValue()
        && this.#stack.at(-1).isValue()) {
      this.pushAll(); // ASI
    }
    while (this.#stack.length > 1
        && this.isLowerPrecedence(node)) {
      const popped = this.#stack.pop();
      if (this.isLowerPrecedence(node)) {
        this.#stack.at(-1).add(popped);
      } else {
        node.left = popped;
        break;
      }
    }
    this.#stack.push(node);
  }

  pushAll() {
    while (this.#stack.length > 1) {
      const popped = this.#stack.pop();
      this.#stack.at(-1).add(popped);
    }
  }

  /** @returns {boolean} */
  isEmpty() {
    return this.#stack.length == 1;
  }

  /** @returns {boolean} */
  hasValueNode() {
    return this.#stack.at(-1).isValue();
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
  return value == undefined ? undefined : value.toString();
}

/**
 * @param {ValueType} value
 * @returns {string|RegExp}
 */
function stringOrRegExp(value) {
  return value instanceof RegExp ? value : value.toString();
}

class TreeBuilder {
  /**
   * @param {string} fileName
   * @param {string} script
   * @param {Environment} globalEnv
   */
  constructor(fileName, script, globalEnv) {
    /** @type {string} */
    this.fileName = fileName;
    /** @type {Array<string>} */
    this.tokens = tokenize(script);
    /** @type {Environment} */
    this.globalEnv = globalEnv;
    /** @type {Map<string, string>} */
    this.imports = new Map();
    /** @type {Array<string>} */
    this.dependencies = [];
  }

  /** @param {string} expected */
  shiftExpected(expected) {
    const token = this.tokens.shift();
    if (token != expected) {
      throw 'Expected ' + expected + ' but got: '
            + token;
    }
  }

  /** @returns {Node} */
  buildFunctionCallNode() {
    const params = this.buildTree(')').children;
    const node = new Node(18,
        async (env, l) => {
          const func = l.name
              ? this.imports.has(l.name)
                  ? env.get(this.imports.get(l.name), params.length)
                  : env.get(l.name, params.length, this.fileName)
              : await l.run(env);
          let paramResults = [];
          for (const p of params) {
            const paramResult = await p.run(env);
            if (paramResult instanceof FunctionValue) {
              paramResults.push(
                /** @type {(a: Array<ValueType>) => Promise<ValueType>} */(
                    (...a) => paramResult.run(a, env)));
            } else {
              paramResults.push(paramResult);
            }
          }
          if (func instanceof FunctionValue) {
            return func.run(paramResults, env);
          } else if (typeof func == 'function') {
            return func(...paramResults);
          } else if (func === swapFunction) {
            await params[0].assign(env, paramResults[1]);
            await params[1].assign(env, paramResults[0]);
          } else {
            throw 'Not a function: ' + func;
          }
        },
        async (env, value, l) => {
          if (l.name == 'cell') {
            const x = await params[0].run(env);
            const y = await params[1].run(env);
            /** @type {(x: ValueType, y: ValueType, value: ValueType) => void}*/(
                env.get('cell=', 3))(x, y, value);
          } else if (l.name == 'mid') {
            const str = (await params[0].run(env)).toString();
            const start = Number(await params[1].run(env)) - 1;
            const len = Number(await params[2].run(env));
            await params[0].assign(env, str.substring(0, start) + value
                + str.substring(start + len));
          } else {
            throw 'Cannot assign values to function result: '
                + (l.name || await node.run(env));
          }
        });
    return node;
  }

  /**
   * @param {Node} child
   * @returns {Node}
   */
  buildMemberAccessNode(child) {
    return new Node(
        18,
        async (env, left) => {
          const obj = await left.run(env);
          const name = await child.run(env);
          if (obj instanceof ObjectValue) {
            const result = obj.get(name);
            if (result instanceof FunctionValue) {
              result.setThis(obj);
            }
            return result;
          }
          const str = /** @type {string} */(obj.toString());
          if (name == 'endsWith') {
            return (a, b) =>
                str.endsWith(a.toString(), optionalNumber(b)) ? 1 : 0;
          } else if (name == 'includes') {
            return (a, b) =>
                str.includes(a.toString(), optionalNumber(b)) ? 1 : 0;
          } else if (name == 'indexOf') {
            return (a, b) => str.indexOf(a.toString(), optionalNumber(b));
          } else if (name == 'lastIndexOf') {
            return (a, b) => str.lastIndexOf(a.toString(), optionalNumber(b));
          } else if (name == 'length') {
            return str.length;
          } else if (name == 'padEnd') {
            return (a, b) => str.padEnd(Number(a), optionalString(b));
          } else if (name == 'padStart') {
            return (a, b) => str.padStart(Number(a), optionalString(b));
          } else if (name == 'repeat') {
            return a => str.repeat(Number(a));
          } else if (name == 'replace') {
            return (a, b) => str.replace(stringOrRegExp(a), b.toString());
          } else if (name == 'replaceAll') {
            return (a, b) => str.replaceAll(stringOrRegExp(a), b.toString());
          } else if (name == 'search') {
            return a => str.search(stringOrRegExp(a));
          } else if (name == 'startsWith') {
            return (a, b) => str.startsWith(a.toString(), optionalNumber(b)) ? 1 : 0;
          } else if (name == 'substring') {
            return (a, b) => str.substring(Number(a), optionalNumber(b));
          } else if (name == 'toLowerCase') {
            return () => str.toLowerCase();
          } else if (name == 'toString') {
            return () => str.toString();
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
            throw 'Undefined member: ' + name
                  + '\nString: ' + obj.toString();
          }
        },
        async (env, value, left) => {
          const obj = await left.run(env);
          const name = await child.run(env);
          if (obj instanceof ObjectValue) {
            obj.set(name, value);
          } else {
            throw obj + ' is not an object. '
                  + 'Setting: ' + name;
          }
        });
  }

  /** @returns {Node} */
  buildObjectNode() {
    const members = new Map();
    while (this.tokens.length > 0) {
      let name = this.tokens.shift();
      if (name == '}') {
        break;
      }
      if (name[0] == '"' || name[0] == "'") {
        name = parseString(name);
      } else if (isNumCharOrDot(name[0])) {
        name = Number(name).toString();
      }
      const token = this.tokens.shift();
      if (token == ':') {
        members.set(name, this.buildTree(','));
      } else if (token == '(') {
        const paramNodes = this.buildTree(')').children;
        const bodyNode = this.buildTree(';');
        members.set(name,
            valueNode(new FunctionValue(paramNodes, bodyNode)));
        if (this.tokens[0] == ',') {
          this.tokens.shift();
        }
      } else {
        throw 'Expected : or ( but got: ' + token;
      }
    }
    return new Node(100, async env => {
      const object = new ObjectValue();
      for (const [name, child] of members) {
        object.set(name, await child.run(env));
      }
      return object;
    });
  }

  /** @returns {FunctionValue} */
  buildClassValue() {
    const objectNode = this.buildObjectNode();
    const constructorNode = new Node(100, async env => {
      const obj = /** @type {ObjectValue} */(await objectNode.run(env));
      if (obj.has('constructor')) {
        const constructor = obj.get('constructor');
        if (constructor instanceof FunctionValue) {
          const p = /** @type {ObjectValue} */(env.get('$p'));
          const params = [];
          for (let i = 0; i < Number(p.get('length')); i++) {
            params.push(p.get(i));
          }
          constructor.setThis(obj).run(params, env);
        }
      }
      return obj;
    });
    const paramsNode = variableNode('$p', '', /* varArgs= */ true);
    return new FunctionValue([paramsNode], constructorNode);
  }

  readImport() {
    this.shiftExpected('{');
    const names = [];
    while (this.tokens.length > 0) {
      names.push(this.tokens.shift());
      const next = this.tokens.shift();
      if (next == '}') {
        break;
      } else if (next != ',') {
        throw 'Expected } or , but got: ' + next;
      }
    }
    this.shiftExpected('from');
    const fileName =
        parseString(this.tokens.shift());
    this.shiftExpected(';');
    for (const name of names) {
      this.imports.set(name,
                       fileName + '\n' + name);
    }
    this.dependencies.push(fileName);
  }

  /**
   * @param {string} endToken
   * @returns {Node}
   */
  buildTree(endToken) {
    const root = blockNode();
    const stack = new NodeStack(root);
    while (this.tokens.length > 0) {
      const token = this.tokens.shift();
      if (token == ')' || token == ']'
          || token == '}' || token == ':') {
        if (token == '}' && (endToken == ';'
                             || endToken == ',')) {
          this.tokens.unshift(token);
        } else if (endToken != token) {
          throw 'Expected ' + endToken
                + ' but got: ' + token;
        }
        break;
      } else if (token == 'if'
                 && this.tokens[0] == '(') {
        this.tokens.shift();
        const condNode = this.buildTree(')');
        const thenNode = this.buildTree(';');
        /** @type {Node?} */
        let elseNode = null;
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/31334
        if (this.tokens[0] == 'else') {
          this.tokens.shift();
          elseNode = this.buildTree(';');
        }
        stack.push(new Node(100, async env => {
          if (await condNode.run(env)) {
            return await thenNode.run(env);
          } else if(elseNode != null) {
            return await elseNode.run(env);
          }
        }));
        stack.pushAll();
        if (endToken == ';') {
          break;
        }
      } else if (token == 'while'
                 && this.tokens[0] == '(') {
        this.tokens.shift();
        const condNode = this.buildTree(')');
        const bodyNode = this.buildTree(';');
        stack.push(new Node(100, async env => {
          while (await condNode.run(env)) {
            env.loop--;
            if (env.loop <= 0) {
              throw 'Too many loops.';
            }
            const value = await bodyNode.run(env);
            if (value instanceof ReturnValue) {
              if (value.type == 'break') {
                break;
              } else if (value.type != 'continue') {
                return value;
              }
            }
          }
        }));
        stack.pushAll();
        if (endToken == ';') {
          break;
        }
      } else if (token == 'for'
                 && this.tokens[0] == '(') {
        this.tokens.shift();
        if (this.tokens[1] == 'of') {
          const variable = this.tokens.shift();
          this.tokens.shift();
          const arrayNode = this.buildTree(')');
          const bodyNode = this.buildTree(';');
          stack.push(new Node(100, async env => {
            const obj = /** @type {ObjectValue} */(await arrayNode.run(env));
            for (let i = 0; i < Number(obj.get('length')); i++) {
              env.loop--;
              if (env.loop <= 0) {
                throw 'Too many loops.';
              }
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
          }));
        } else {
          const initNode = this.buildTree(';');
          const condNode = this.buildTree(';');
          const nextNode = this.buildTree(')');
          const bodyNode = this.buildTree(';');
          stack.push(new Node(100, async env => {
            await initNode.run(env);
            while (await condNode.run(env)) {
              env.loop--;
              if (env.loop <= 0) {
                throw 'Too many loops.';
              }
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
          }));
        }
        stack.pushAll();
        if (endToken == ';') {
          break;
        }
      } else if (token == 'function') {
        const name = this.tokens.shift();
        this.shiftExpected('(');
        const paramNodes = this.buildTree(')').children;
        const bodyNode = this.buildTree(';');
        const func = new FunctionValue(paramNodes, bodyNode);
        this.globalEnv.set(
            func.id(name, this.fileName), func);
        stack.pushAll();
      } else if (token == 'return'
                 || token == 'break'
                 || token == 'continue') {
        const bodyNode = this.buildTree(';');
        stack.push(new Node(100,
            env => new ReturnValue(bodyNode.run(env), token)));
      } else if (stack.isEmpty()
                 && (token == 'const'
                     || token == 'let'
                     || token == 'var')) {
        const name = this.tokens.shift();
        stack.push(variableNode(name, token));
      } else if (token == 'class'
          && this.tokens.length > 0
          && isAlphaChar(this.tokens[0][0])) {
        const name = this.tokens.shift();
        this.shiftExpected('{');
        const func = this.buildClassValue();
        this.globalEnv.set(
            func.id(name, this.fileName), func);
        stack.pushAll();
      } else if (token == 'new'
          && this.tokens.length > 0
          && isAlphaChar(this.tokens[0][0])) {
        // Ignore
      } else if (token == 'import') {
        this.readImport();
      } else if (token == 'in' && stack.hasValueNode()) {
        stack.push(operatorNode(10, (a, b) => {
          if (b instanceof ObjectValue) {
            return b.has(a.toString()) ? 1 : 0;
          } else {
            throw 'right-hand side of "in" should be an object. Found: ' + b;
          }
        }));
      } else if (token[0] == '"' || token[0] == "'") {
        stack.push(valueNode(parseString(token)));
      } else if (isNumChar(token[0])) {
        stack.push(valueNode(parseFloat(token)));
      } else if (token.length > 2 && token[0] == '/') {
        stack.push(valueNode(parseRegExp(token)));
      } else if (isAlphaChar(token[0])) {
        stack.push(variableNode(token));
      } else if (token == '.') {
        if (!stack.hasValueNode()) {
          throw 'Unexpected token: ' + token
                + (this.tokens[0] || '');
        }
        const node = this.buildMemberAccessNode(
            valueNode(this.tokens.shift()));
        stack.push(node);
        node.freeze();
      } else if (token == '[') {
        const subTree = this.buildTree(']');
        const params = subTree.children;
        if (stack.hasValueNode()) {
          if (params.length != 1) {
            throw 'obj[x] format should have exactly 1 parameter. Found: '
                + params.length;
          }
          const node =
              this.buildMemberAccessNode(params[0]);
          stack.push(node);
          node.freeze();
        } else {
          if (params.length != 2) {
            throw '[x,y] format should have '
                  + 'exactly 2 parameters. Found: '
                  + params.length;
          }
          stack.push(
              cellNode(params[0], params[1]));
        }
      } else if (token == '{') {
        if (stack.isEmpty()
            && (endToken == ';'
                || endToken == '}')) {
          stack.push(this.buildTree('}'));
          if (endToken == ';') {
            break;
          }
        } else {
          stack.push(this.buildObjectNode());
        }
      } else if (token == '(') {
        if (stack.hasValueNode()) {
          const node = this.buildFunctionCallNode();
          stack.push(node);
          node.freeze();
        } else {
          stack.push(this.buildTree(')'));
        }
      } else if (token == '!') {
        stack.push(operatorNode(15, (l, r) => (Number(r) != 0) ? 0 : 1));
      } else if (token == '++') {
        stack.push(new Node(15, async (env, left, children) => {
          const child = left || children[0];
          const value = Number(await child.run(env)) + 1;
          await child.assign(env, value);
          return value;
        }));
      } else if (token == '--') {
        stack.push(new Node(15, async (env, left, children) => {
          const child = left || children[0];
          const value = Number(await child.run(env)) - 1;
          await child.assign(env, value);
          return value;
        }));
      } else if (token == '*') {
        stack.push(operatorNode(13, (a, b) => Number(a) * Number(b)));
      } else if (token == '/') {
        stack.push(operatorNode(13, (a, b) => Number(a) / Number(b)));
      } else if (token == '%') {
        stack.push(operatorNode(13, (a, b) => Number(a) % Number(b)));
      } else if (token == '+') {
        if (stack.hasValueNode()) {
          stack.push(operatorNode(
              12, (a, b) => /** @type {any} */(a) + /** @type {any} */(b)));
        }
      } else if (token == '-') {
        if (stack.hasValueNode()) {
          stack.push(operatorNode(12, (a, b) => Number(a) - Number(b)));
        } else {
          stack.push(operatorNode(15, (a, b) => -b));
        }
      } else if (token == '<') {
        stack.push(operatorNode(10, (a, b) => a < b ? 1 : 0));
      } else if (token == '<=') {
        stack.push(operatorNode(10, (a, b) => a <= b ? 1 : 0));
      } else if (token == '>') {
        stack.push(operatorNode(10, (a, b) => a > b ? 1 : 0));
      } else if (token == '>=') {
        stack.push(operatorNode(10, (a, b) => a >= b ? 1 : 0));
      } else if (token == '==') {
        stack.push(operatorNode(9,
            (a, b) => (a.toString() === b.toString()) ? 1 : 0));
      } else if (token == '!=') {
        stack.push(operatorNode(9,
            (a, b) => (a.toString() !== b.toString()) ? 1 : 0));
      } else if (token == '&&' || token == '&') {
        stack.push(new Node(5, async (env, left, children) => {
          const l = await left.run(env);
          return (Number(l) == 0) ? l : children[0].run(env);
        }));
      } else if (token == '||' || token == '|') {
        stack.push(new Node(4, async (env, left, children) => {
          const l = await left.run(env);
          return (Number(l) != 0) ? l : children[0].run(env);
        }));
      } else if (token == '?') {
        const thenNode = this.buildTree(':');
        stack.push(new Node(3, async (env, left, children) => {
          const l = await left.run(env);
          return (Number(l) != 0) ? thenNode.run(env) : children[0].run(env);
        }));
      } else if (token == '=') {
        if (!stack.hasValueNode()) {
          throw 'Unexpected token: =';
        }
        stack.push(new Node(2, async (env, left, children) => {
          if (left == null || children[0] == null) {
            throw 'Operand is missing: =';
          }
          const value = await children[0].run(env);
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '+=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value = /** @type {any} */(await left.run(env)) +
              /** @type {any} */(await children[0].run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '-=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value =
              Number(await left.run(env)) - Number(await children[0].run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '*=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value =
              Number(await left.run(env)) * Number(await children[0].run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '/=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value =
              Number(await left.run(env)) / Number(await children[0].run(env));
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '=>') {
        const node = new Node(2, async (env, left, children) =>
            new FunctionValue(left.name ? [left] : left.children, children[0],
                new Map(env.variables)));
        stack.push(node);
        if (this.tokens[0] == '{') {
          this.tokens.shift();
          node.add(this.buildTree('}'));
          node.freeze();
        }
      } else if (token == '...' && endToken == ')' && this.tokens[1] == ')') {
        stack.push(variableNode(this.tokens.shift(), '', /* varArgs= */ true));
      } else if (token == ';' || token == ',') {
        if (endToken == token) {
          break;
        }
        stack.pushAll();
      } else {
        throw "Invalid token: " + token;
      }
    }
    stack.pushAll();
    root.freeze();
    return root;
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
  const treeBuilder = new TreeBuilder(
      fileName, macroMap.get(fileName), env);
  try {
    treeBuilder.buildTree('');
  } catch (e) {
    throw e + '\n' + treeBuilder.tokens.join(' ');
  }
  return treeBuilder.dependencies;
}

/**
 * @param {string} script
 * @param {Environment} env
 * @param {Map<string, string>} macroMap
 * @returns {ValueType|Promise<ValueType>}
 */
function run(script, env, macroMap) {
  const treeBuilder =
      new TreeBuilder('', script, env);
  let tree;
  try {
    tree = treeBuilder.buildTree('');
  } catch (e) {
    throw e + '\n' + treeBuilder.tokens.join(' ');
  }
  let dependencies = treeBuilder.dependencies;
  const loaded = new Set();
  while (dependencies.length > 0) {
    const fileName = dependencies.shift();
    if (loaded.has(fileName)) {
      continue;
    }
    loaded.add(fileName);
    dependencies = dependencies.concat(
        load(fileName, env, macroMap));
  }
  env.init();
  return tree.run(env);
}

net.asukaze.export({ Environment, run });
})();
