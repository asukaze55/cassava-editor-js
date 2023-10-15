// #ifdef MODULE
// import { createReplacer } from './cassava_replacer.js';
// #else
(() => {
const createReplacer = net.asukaze.cassava.createReplacer;
// #endif

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

const SwapFunction = {};

/**
 * @param {string} name
 * @param {number} arity
 * @returns {Function|SwapFunction?}
 */
function builtInFunction(name, arity) {
  if (name == 'acos' && arity == 1) {
    return a => Math.acos(a);
  } else if (name == 'ascW' && arity == 1) {
    return a => a.toString().charCodeAt(0);
  } else if (name == 'asin' && arity == 1) {
    return a => Math.asin(a);
  } else if (name == 'atan' && arity == 1) {
    return a => Math.atan(a);
  } else if (name == 'atan2' && arity == 2) {
    return (a, b) => Math.atan2(a, b);
  } else if (name == 'chrW' && arity == 1) {
    return a => String.fromCharCode(a - 0);
  } else if (name == 'cos' && arity == 1) {
    return a => Math.cos(a);
  } else if (name == 'double' && arity == 1) {
    return a => a - 0;
  } else if (name == 'int' && arity == 1) {
    return a => Math.trunc(a);
  } else if (name == 'left' && arity == 2) {
    return (a, b) => a.toString().slice(0, b);
  } else if (name == 'len' && arity == 1) {
    return a => a.toString().length;
  } else if (name == 'max') {
    return (...a) => Math.max(...a);
  } else if (name == 'mid' && arity == 2) {
    return (a, b) => a.toString().substring(b - 1);
  } else if (name == 'mid' && arity == 3) {
    return (a, b, c) => a.toString()
        .substring((b - 1), (b - 1) + (c - 0));
  } else if (name == 'min') {
    return (...a) => Math.min(...a);
  } else if (name == 'pos' && arity == 2) {
    return (a, b) => a.toString().indexOf(b) + 1;
  } else if (name == 'pow' && arity == 2) {
    return (a, b) => Math.pow(a, b);
  } else if (name == 'sqrt' && arity == 1) {
    return a => Math.sqrt(a);
  } else if (name == 'replace' && arity >= 3) {
    return (str1, str2, str3, ignoreCase, regex) => createReplacer(
        str2.toString(), str3.toString(), ignoreCase, false, regex)(
            str1.toString());
  } else if (name == 'right' && arity == 2) {
    return (a, b) => a.toString().slice(-b);
  } else if (name == 'sin' && arity == 1) {
    return a => Math.sin(a);
  } else if (name == 'sqrt' && arity == 1) {
    return a => Math.sqrt(a);
  } else if (name == 'str' && arity == 1) {
    return a => a.toString();
  } else if (name == 'swap' && arity == 2) {
    return SwapFunction;
  } else if (name == 'tan' && arity == 1) {
    return a => Math.tan(a);
  } else if (name == 'GetDate' && arity == 0) {
    return () => new Date().getDate();
  } else if (name == 'GetHours' && arity == 0) {
    return () => new Date().getHours();
  } else if (name == 'GetMinutes' && arity == 0) {
    return () => new Date().getMinutes();
  } else if (name == 'GetMonth' && arity == 0) {
    return () => new Date().getMonth() + 1;
  } else if (name == 'GetSeconds' && arity == 0) {
    return () => new Date().getSeconds();
  } else if (name == 'GetYear' && arity == 0) {
    return () => new Date().getFullYear();
  }
  return undefined;
}

class Environment {
  /** @param {Environment=} parent */
  constructor(parent) {
    /** @type {Map<string, any>} */
    this.variables = new Map();
    /** @type {Set<string>} */
    this.constants = new Set();
    /** @type {Map<string, Function>} */
    this.functions = (parent != null) ? parent.functions : new Map();
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
   * @returns {any}
   */
  get(name, arity, fileName) {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (arity == null) {
      if (this.functions.has(name + '=/0')) {
        return this.functions.get(name + '=/0')();
      }
      throw 'Undefined variable: ' + name;
    }
    let id;
    if (fileName) {
      id = functionId(name, arity, false, fileName);
      if (this.functions.has(id)) {
        return this.functions.get(id);
      }
      for (let i = arity; i >= 0; i--) {
        id = functionId(name, i, true, fileName)
        if (this.functions.has(id)) {
          return this.functions.get(id);
        }
      }
    }
    id = functionId(name, arity, false);
    if (this.functions.has(id)) {
      return this.functions.get(id);
    }
    for (let i = arity; i >= 0; i--) {
      id = functionId(name, i, true)
      if (this.functions.has(id)) {
        return this.functions.get(id);
      }
    }
    const builtIn = builtInFunction(name, arity);
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
      return this.functions.has(name);
    }
  }

  /**
   * @param {string} name
   * @param {any} value
   * @param {''|'const'|'let'|'var'=} type
   */
  set(name, value, type) {
    if (this.functions.has(name + '=/1')) {
      this.functions.get(name + '=/1')(value);
      return;
    }
    if (this.constants.has(name)) {
      throw 'Cannot modify constant: ' + name;
    }
    if (type == 'const') {
      this.constants.add(name);
    }
    if (name.indexOf('/') == -1) {
      this.variables.set(name, value);
    } else {
      this.functions.set(name, value);
    }
  }
}

function isNumChar(c) {
  return c >= '0' && c <= '9';
}

function isNumCharOrDot(c) {
  return isNumChar(c) || c == '.';
}

function isAlphaChar(c) {
  return (c >= 'A' && c <= 'Z')
      || (c >= 'a' && c <= 'z')
      || c == '_';
}

function isAlphaNumChar(c) {
  return isAlphaChar(c) || isNumChar(c);
}

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
  /**
   * @param {Array<Node>} paramNodes
   * @param {Node} bodyNode
   * @param {Map<String, any>=} envMap
   */
  constructor(paramNodes, bodyNode, envMap) {
    this.paramNames = paramNodes.map(p => (p.left || p).name);
    this.defaultValues = paramNodes.map(p => p.children[0]);
    this.varArgs = paramNodes.length > 0 && paramNodes.at(-1).varArgs;
    this.bodyNode = bodyNode;
    this.envMap = envMap || new Map();
  }

  /**
   * @param {string} name
   * @param {string} fileName
   * @returns {string}
   */
  id(name, fileName) {
    let arity = this.paramNames.length - (this.varArgs ?  1 : 0);
    while (arity > 0 && this.defaultValues[arity - 1] != null) {
      arity--;
    }
    return functionId(name, arity, this.varArgs, fileName);
  }

  /**
   * @param {Array<any>} params
   * @param {Environment} env
   * @returns {Promise<any>}
   */
  async run(params, env) {
    const newEnv = new Environment(env);
    if (newEnv.loop <= 0) {
      throw 'Too deep recursion.';
    }
    newEnv.init();
    for (const [name, value] of this.envMap) {
      newEnv.set(name, value);
    }
    for (let i = 0; i < this.paramNames.length; i++) {
      if (this.varArgs && i == this.paramNames.length - 1) {
        const array = new ObjectValue();
        const length = Math.max(params.length - i, 0);
        array.set('length', length);
        for (let j = 0; j < length; j++) {
          array.set(j, params[i + j]);
        }
        newEnv.set(this.paramNames[i], array);
      } else if (params.length > i) {
        newEnv.set(this.paramNames[i], params[i]);
      } else if (this.defaultValues[i] == null) {
        throw 'Not enough parameters to call function.';
      } else {
        newEnv.set(this.paramNames[i],
            await this.defaultValues[i].run(newEnv));
      }
    }
    const value = await this.bodyNode.run(newEnv);
    if (value instanceof ReturnValue) {
      return value.value;
    }
    return value;
  }

  setThis(value) {
    this.envMap.set('this', value);
    return this;
  }
}

class ObjectValue {
  constructor() {
    this.value = new Map();
  }

  /** @param {string|number} name */
  get(name) {
    const key = name.toString();
    if (this.value.has(key)) {
      return this.value.get(key);
    }
    throw 'Undefined member: ' + name
          + '\nObject: ' + this.toString();
  }

  /** @param {string|number} name */
  has(name) {
    return this.value.has(name.toString());
  }

  /** @param {string|number} name */
  set(name, value) {
    this.value.set(name.toString(), value);
  }

  toString() {
    let result = '{';
    let first = true;
    for (const [key, value] of this.value) {
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
  constructor(value, type) {
    this.value = value;
    this.type = type;
  }
}

class Node {
  /** @type {(env: Environment, left: Node?, children: Array<Node>) => any} */
  #runner
  /** @type {(env: Environment, value: any, left: Node?) => any} */
  #assigner

  /**
   * @param {number} precedence
   * @param {(env: Environment, left: Node?, children: Array<Node>) => any}
   *     runner
   * @param {(env: Environment, value: any, left: Node?) => any=} assigner
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

  isValue() {
    return this.precedence >= 100;
  }

  /** @param {Environment} env */
  run(env) {
    return this.#runner(env, this.left, this.children);
  }

  /**
   * @param {Environment} env
   * @param {any} value
   */
  async assign(env, value) {
    if (this.#assigner == null) {
      throw 'Cannot assign values to ' + await this.run(env);
    }
    await this.#assigner(env, value, this.left);
  }
}

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
 * @param {(left: any, right: any) => any} runner
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

function cellNode(x, y) {
  return new Node(
      100,
      async env => /** @type {(x, y) => any} */(
          env.get('cell', 2))(await x.run(env), await y.run(env)),
      async (env, value) => /** @type {(x, y, value) => void} */(
          env.get('cell=', 3))(await x.run(env), await y.run(env), value));
}

class NodeStack {
  /** @param {Node} root */
  constructor(root) {
    /** @type {Array<Node>} */
    this.stack = [root];
  }

  isLowerPrecedence(node) {
    const current = this.stack.at(-1).precedence;
    return node.precedence < current
        || (node.precedence == current
            && current != 3
            && current != 2);
  }

  /** @param {Node} node */
  push(node) {
    if (node.isValue()
        && this.stack.at(-1).isValue()) {
      this.pushAll(); // ASI
    }
    while (this.stack.length > 1
        && this.isLowerPrecedence(node)) {
      const popped = this.stack.pop();
      if (this.isLowerPrecedence(node)) {
        this.stack.at(-1).add(popped);
      } else {
        node.left = popped;
        break;
      }
    }
    this.stack.push(node);
  }

  pushAll() {
    while (this.stack.length > 1) {
      const popped = this.stack.pop();
      this.stack.at(-1).add(popped);
    }
  }

  isEmpty() {
    return this.stack.length == 1;
  }

  hasValueNode() {
    return this.stack.at(-1).isValue();
  }
}

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

function parseRegExp(token) {
  const p = token.lastIndexOf('/');
  return new RegExp(
      token.substring(1, p).replaceAll('\\/', '/'),
      token.substring(p + 1));
}

class TreeBuilder {
  constructor(fileName, script, globalEnv) {
    this.fileName = fileName;
    this.tokens = tokenize(script);
    this.globalEnv = globalEnv;
    this.imports = new Map();
    this.dependencies = [];
  }

  shiftExpected(expected) {
    const token = this.tokens.shift();
    if (token != expected) {
      throw 'Expected ' + expected + ' but got: '
            + token;
    }
  }

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
            paramResults.push(await p.run(env));
          }
          if (func instanceof FunctionValue) {
            return func.run(paramResults, env);
          } else if (typeof func == 'function') {
            return func(...paramResults);
          } else if (func === SwapFunction) {
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
            /** @type {(x, y, value) => void}*/(
                env.get('cell=', 3))(x, y, value);
          } else if (l.name == 'mid') {
            const str = (await params[0].run(env)).toString();
            const start = (await params[1].run(env)) - 1;
            const len = (await params[2].run(env)) - 0;
            await params[0].assign(env, str.substring(0, start) + value
                + str.substring(start + len));
          } else {
            throw 'Cannot assign values to function result: '
                + (l.name || await node.run(env));
          }
        });
    return node;
  }

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
          const str = obj.toString();
          if (name == 'endsWith') {
            return (a, b) =>
                str.endsWith(a, b) ? 1 : 0;
          } else if (name == 'includes') {
            return (a, b) =>
                str.includes(a, b) ? 1 : 0;
          } else if (name == 'indexOf') {
            return (a, b) => str.indexOf(a, b);
          } else if (name == 'lastIndexOf') {
            return (a, b) => str.lastIndexOf(a, b);
          } else if (name == 'length') {
            return str.length;
          } else if (name == 'padEnd') {
            return (a, b) => str.padEnd(a, b);
          } else if (name == 'padStart') {
            return (a, b) => str.padStart(a, b);
          } else if (name == 'repeat') {
            return (a, b) => str.repeat(a, b);
          } else if (name == 'replace') {
            return (a, b) => str.replace(a, b);
          } else if (name == 'replaceAll') {
            return (a, b) => str.replaceAll(a, b);
          } else if (name == 'search') {
            return a => str.search(a);
          } else if (name == 'startsWith') {
            return (a, b) =>
                str.startsWith(a, b) ? 1 : 0;
          } else if (name == 'substring') {
            return (a, b) => str.substring(a, b);
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
          } else if (!isNaN(name - 0)) {
            return str[name - 0] || '';
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
        name = name - 0;
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
      const obj = await objectNode.run(env);
      if (obj.has('constructor')) {
        const p = /** @type {ObjectValue} */(env.get('$p'));
        const params = [];
        for (let i = 0; i < p.get('length'); i++) {
          params.push(p.get(i));
        }
        obj.get('constructor').setThis(obj).run(params, env);
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
        let elseNode = null;
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
            const obj = await arrayNode.run(env);
            for (let i = 0; i < obj.get('length'); i++) {
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
        stack.push(operatorNode(10, (a, b) => b.has(a)));
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
        stack.push(operatorNode(15, (l, r) => (r - 0 != 0) ? 0 : 1));
      } else if (token == '++') {
        stack.push(new Node(15, async (env, left, children) => {
          const child = left || children[0];
          const value = await child.run(env) + 1;
          await child.assign(env, value);
          return value;
        }));
      } else if (token == '--') {
        stack.push(new Node(15, async (env, left, children) => {
          const child = left || children[0];
          const value = await child.run(env) - 1;
          await child.assign(env, value);
          return value;
        }));
      } else if (token == '*') {
        stack.push(operatorNode(13, (a, b) => a * b));
      } else if (token == '/') {
        stack.push(operatorNode(13, (a, b) => a / b));
      } else if (token == '%') {
        stack.push(operatorNode(13, (a, b) => a % b));
      } else if (token == '+') {
        if (stack.hasValueNode()) {
          stack.push(operatorNode(12, (a, b) => a + b));
        }
      } else if (token == '-') {
        if (stack.hasValueNode()) {
          stack.push(operatorNode(12, (a, b) => a - b));
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
          return (l - 0 == 0) ? l : children[0].run(env);
        }));
      } else if (token == '||' || token == '|') {
        stack.push(new Node(4, async (env, left, children) => {
          const l = await left.run(env);
          return (l - 0 != 0) ? l : children[0].run(env);
        }));
      } else if (token == '?') {
        const thenNode = this.buildTree(':');
        stack.push(new Node(3, async (env, left, children) => {
          const l = await left.run(env);
          return (l - 0 != 0) ? thenNode.run(env) : children[0].run(env);
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
          const value = await left.run(env) + await children[0].run(env);
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '-=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value = await left.run(env) - await children[0].run(env);
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '*=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value = await left.run(env) * await children[0].run(env);
          await left.assign(env, value);
          return value;
        }));
      } else if (token == '/=') {
        stack.push(new Node(2, async (env, left, children) => {
          const value = await left.run(env) / await children[0].run(env);
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

// #ifdef MODULE
// export { Environment, run };
// #else
net.asukaze.cassava.macro =
    net.asukaze.cassava.macro || {};
net.asukaze.cassava.macro.Environment = Environment;
net.asukaze.cassava.macro.run = run;
})();
// #endif
