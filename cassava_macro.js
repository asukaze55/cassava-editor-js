// #ifdef MODULE
// import { createReplacer } from './cassava_replacer.js';
// #else
(() => {
const createReplacer = net.asukaze.cassava.createReplacer;
// #endif

function functionId(name, arity, varArgs,
                    fileName) {
  return (fileName ? fileName + '\n' : '')
         + name + (varArgs ? '/+' : '/') + arity;
}

const SwapFunction = {};

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
    return (str1, str2, str3, ignoreCase, regex) => createReplacer(str2.toString(), str3.toString(), ignoreCase, false, regex)(str1.toString());
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
  } else if (name == 'GetMonth' && arity == 0) {
    return () => new Date().getMonth() + 1;
  } else if (name == 'GetYear' && arity == 0) {
    return () => new Date().getFullYear();
  }
  return undefined;
}

class Environment {
  constructor(parent) {
    this.variables = new Map();
    this.constants = new Set();
    this.functions = (parent != null)
        ? parent.functions : new Map();
    this.loop = (parent != null)
        ? parent.loop - 1: 1000;
  }

  init() {
    this.set('x', this.get('Col'));
    this.set('y', this.get('Row'));
  }

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
    throw 'Cannot find a function: '
          + functionId(name, arity);
  }

  has(name) {
    if (name.indexOf('/') == -1) {
      return this.variables.has(name);
    } else {
      return this.functions.has(name);
    }
  }

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
  constructor(paramNames, varArgs, bodyNode,
              envMap) {
    this.paramNames = paramNames;
    this.varArgs = varArgs;
    this.bodyNode = bodyNode;
    this.envMap = envMap || new Map(); 
  }

  id(name, fileName) {
    const arity = this.paramNames.length
        - (this.varArgs ?  1 : 0);
    return functionId(name, arity, this.varArgs,
                      fileName);
  }

  async run(params, env) {
    const newEnv = new Environment(env);
    if (newEnv.loop <= 0) {
      throw 'Too deep recursion.';
    }
    newEnv.init();
    for (const [name, value] of this.envMap) {
      newEnv.set(name, value);
    }
    for (let i = 0; i < this.paramNames.length;
         i++) {
      if (this.varArgs
          && i == this.paramNames.length - 1) {
        const array = new ObjectValue();
        array.set('length', params.length - i);
        for (let j = 0; j < params.length - i;
             j++) {
          array.set(j, params[i + j]);
        }
        newEnv.set(this.paramNames[i], array);
      } else {
        newEnv.set(this.paramNames[i], params[i]);
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

  get(name) {
    const key = name.toString();
    if (this.value.has(key)) {
      return this.value.get(key);
    }
    throw 'Undefined member: ' + name
          + '\nObject: ' + this.toString();
  }

  has(name) {
    return this.value.has(name.toString());
  }

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
  constructor(precedence, runner, assigner) {
    this.left = null;
    this.right = null;
    this.precedence = precedence;
    this.runner = runner;
    this.assigner = assigner;
    this.name = null;
    this.varArgs = false;
  }

  add(node) {
    this.right = node;
  }

  freeze() {
    this.precedence = 100;
  }

  isValue() {
    return this.precedence >= 100;
  }

  run(env) {
    return this.runner(this.left, this.right, env);
  }

  getFunction(env, arity, fileName, imports) {
    return this.runner(this.left, this.right, env,
        arity, fileName, imports);
  }

  async assign(value, env) {
    if (this.assigner == null) {
      throw 'Cannot assign values to '
          + await this.run(env);
      return;
    }
    this.assigner(value, this.left, this.right,
                  env);
  }
}

class BlockNode {
  constructor() {
    this.children = [];
    this.precedence = 0;
  }

  freeze() {
    this.precedence = 100;
  }

  add(node) {
    this.children.push(node);
  }

  isValue() {
    return this.precedence >= 100;
  }

  async run(env) {
    let result;
    for (const node of this.children) {
      result = await node.run(env);
      if (result instanceof ReturnValue) {
        return result;
      }
    }
    return result;
  }
}

function operatorNode(precedence, runner) {
  return new Node(
      precedence,
      async (left, right, env) => {
        const l = left ? await left.run(env) : null;
        if (l instanceof ReturnValue) {
          return l;
        }
        const r =
            right ? await right.run(env) : null;
        if (r instanceof ReturnValue) {
          return r;
        }
        return runner(l, r, env);
      });
}

function unaryNode(precedence, runner) {
  return new Node(
      precedence,
      async (l, r, env) =>
          runner(await r.run(env))); 
}

function valueNode(value) {
  return new Node(100, () => value);
}

function variableNode(name, type) {
  const node = new Node(
      100,
      (left, right, env, arity, fileName,
              imports) => {
        if (arity == null) {
          return env.get(name);
        }
        if (imports != null && imports.has(name)) {
          return env.get(imports.get(name), arity);
        }
        return env.get(name, arity, fileName);
      },
      (value, left, right, env) =>
          env.set(name, value, type));
  node.name = name;
  node.varArgs = false;
  return node;
}

function cellNode(x, y) {
  return new Node(
      100,
      async (left, right, env) => env.get('cell', 2)
          (await x.run(env), await y.run(env)),
      async (value, left, right, env) =>
          env.get('cell=', 3)(await x.run(env),
              await y.run(env), value));
}

class NodeStack {
  constructor(root) {
    this.stack = [root];
  }

  isLowerPrecedence(node) {
    const current = this.stack.at(-1).precedence;
    return node.precedence < current
        || (node.precedence == current
            && current != 3
            && current != 2);
  }

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

  getLast() {
    return this.stack.at(-1);
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

  buildFunctionValue() {
    const paramNames = [];
    let varArgs = false;
    while (this.tokens.length > 0) {
      let name = this.tokens.shift();
      if (name == ')') {
        break;
      } else if (name == '...') {
        varArgs = true;
        name = this.tokens.shift();
        paramNames.push(name);
        this.shiftExpected(')');
        break;
      }
      paramNames.push(name);
      const next = this.tokens.shift();
      if (next == ')') {
        break;
      } else if (next != ',') {
        throw 'Expected ) or , but got: ' + next;
      }
    }
    const bodyNode = this.buildTree(';');
    return new FunctionValue(paramNames, varArgs,
                             bodyNode);
  }

  buildFunctionCallNode() {
    const params = this.buildTree(')').children;
    const node = new Node(18,
        async (l, r, env) => {
          const func = await l.getFunction(
              env, params.length, this.fileName,
              this.imports);
          let paramResults = [];
          for (const p of params) {
            paramResults.push(await p.run(env));
          }
          if (func instanceof FunctionValue) {
            return func.run(paramResults, env);
          } else if (typeof func == 'function') {
            return func(...paramResults);
          } else if (func === SwapFunction) {
            params[0].assign(paramResults[1], env);
            params[1].assign(paramResults[0], env);
          } else {
            throw 'Not a function: ' + func;
          }
        },
        async (value, l, r, env) => {
          if (l.name == 'cell') {
            const x = await params[0].run(env);
            const y = await params[1].run(env);
            env.get('cell=', 3)(x, y, value);
          } else if (l.name == 'mid') {
            const str = (await params[0].run(env))
                .toString();
            const start =
                (await params[1].run(env)) - 1;
            const len =
                (await params[2].run(env)) - 0;
            params[0].assign(
                str.substring(0, start) + value
                    + str.substring(start + len),
                env);
          } else {
            throw 'Cannot assign values to '
                  + 'function result: '
                  + (l.name || await node.run(env));
          }
        });
    return node;    
  }

  buildMemberAccessNode(child) {
    return new Node(
        18,
        async (left, right, env) => {
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
        async (value, left, right, env) => {
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
        members.set(name,
            valueNode(this.buildFunctionValue()));
        if (this.tokens[0] == ',') {
          this.tokens.shift();
        }
      } else {
        throw 'Expected : or ( but got: ' + token;
      }
    }
    return new Node(
        100,
        async (l, r, env) => {
          const object = new ObjectValue();
          for (const [name, child] of members) {
            object.set(name, await child.run(env));
          }
          return object;
        });
  }

  buildClassValue() {
    const objectNode = this.buildObjectNode();
    const constructorNode = new Node(
        100,
        async (l, r, env) => {
          const obj = await objectNode.run(env);
          if (obj.has('constructor')) {
            const p = env.get('$p');
            const params = [];
            for (let i = 0; i < p.get('length');
                 i++) {
              params.push(p.get(i));
            }
            obj.get('constructor').setThis(obj)
                                  .run(params, env);
          }
          return obj;
        });
    return new FunctionValue(['$p'],
        /* varArgs= */ true, constructorNode);
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

  buildTree(endToken) {
    const root = new BlockNode();
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
        stack.push(new Node(100,
            async (l, r, env) => {
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
        stack.push(new Node(100,
            async (l, r, env) => {
              while (await condNode.run(env)) {
                env.loop--;
                if (env.loop <= 0) {
                  throw 'Too many loops.';
                }
                const value =
                    await bodyNode.run(env);
                if (value instanceof ReturnValue) {
                  if (value.type == 'break') {
                    break;
                  } else if (value.type
                             != 'continue') {
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
          stack.push(new Node(100,
              async (l, r, env) => {
                const obj =
                    await arrayNode.run(env);
                for (let i = 0;
                     i < obj.get('length'); i++) {
                  env.loop--;
                  if (env.loop <= 0) {
                    throw 'Too many loops.';
                  }
                  env.set(variable, obj.get(i));
                  const value =
                      await bodyNode.run(env);
                  if (value instanceof
                      ReturnValue) {
                    if (value.type == 'break') {
                      break;
                    } else if (value.type
                               != 'continue') {
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
          stack.push(new Node(100,
              async (l, r, env) => {
                await initNode.run(env);
                while (await condNode.run(env)) {
                  env.loop--;
                  if (env.loop <= 0) {
                    throw 'Too many loops.';
                  }
                  const value =
                      await bodyNode.run(env);
                  if (value instanceof
                      ReturnValue) {
                    if (value.type == 'break') {
                      break;
                    } else if (value.type
                               != 'continue') {
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
        const func = this.buildFunctionValue();
        this.globalEnv.set(
            func.id(name, this.fileName), func);
        stack.pushAll();
      } else if (token == 'return'
                 || token == 'break'
                 || token == 'continue') {
        const bodyNode = this.buildTree(';');
        stack.push(new Node(100, (l, r, env) =>
            new ReturnValue(
                bodyNode.run(env), token)));
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
      } else if (token == 'in'
                 && stack.hasValueNode()) {
        stack.push(
            operatorNode(10, (a, b) => b.has(a)));        
      } else if (token[0] == '"'
                 || token[0] == "'") {
        stack.push(valueNode(parseString(token)));  
      } else if (isNumChar(token[0])) {
        stack.push(valueNode(parseFloat(token)));
      } else if (token.length > 2
                 && token[0] == '/') {
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
            throw 'obj[x] format should have ' 
                  + 'exactly 1 parameter. Found: '
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
        stack.push(
            new Node(15, async (l, r, env) => {
              const right = await r.run(env);
              return (right - 0 != 0) ? 0 : 1;
            }));
      } else if (token == '++') {
        stack.push(
            new Node(15, async (l, r, env) => {
              const child = l || r;
              const value =
                  await child.run(env) + 1;
              child.assign(value, env);
              return value;
            }));
      } else if (token == '--') {
        stack.push(
            new Node(15, async (l, r, env) => {
              const child = l || r;
              const value =
                  await child.run(env) - 1;
              child.assign(value, env);
              return value;
            }));
      } else if (token == '*') {
        stack.push(
            operatorNode(13, (a, b) => a * b));
      } else if (token == '/') {
        stack.push(
            operatorNode(13, (a, b) => a / b));
      } else if (token == '%') {
        stack.push(
            operatorNode(13, (a, b) => a % b));
      } else if (token == '+') {
        if (stack.hasValueNode()) {
          stack.push(
              operatorNode(12, (a, b) => a + b));
        }
      } else if (token == '-') {
        if (stack.hasValueNode()) {
          stack.push(
              operatorNode(12, (a, b) => a - b));
        } else {
          stack.push(unaryNode(15, a => -a));
        }
      } else if (token == '<') {
        stack.push(operatorNode(10,
            (a, b) => a < b ? 1 : 0));
      } else if (token == '<=') {
        stack.push(operatorNode(10,
            (a, b) => a <= b ? 1 : 0));
      } else if (token == '>') {
        stack.push(operatorNode(10,
            (a, b) => a > b ? 1 : 0));
      } else if (token == '>=') {
        stack.push(operatorNode(10,
            (a, b) => a >= b ? 1 : 0));
      } else if (token == '==') {
        stack.push(operatorNode(9, (a, b) =>
            (a.toString() === b.toString())
                ? 1 : 0));
      } else if (token == '!=') {
        stack.push(operatorNode(9, (a, b) =>
            (a.toString() !== b.toString())
                 ? 1 : 0));
      } else if (token == '&&' || token == '&') {
        stack.push(
            new Node(5, async (l, r, env) => {
              const left = await l.run(env);
              return (left - 0 == 0)
                  ? left : r.run(env);
            }));
      } else if (token == '||' || token == '|') {
        stack.push(
            new Node(4, async (l, r, env) => {
              const left = await l.run(env);
              return (left - 0 != 0)
                  ? left : r.run(env);
            }));
      } else if (token == '?') {
        const thenNode = this.buildTree(':');
        stack.push(
            new Node(3, async (l, r, env) => {
              const left = await l.run(env);
              return (left - 0 != 0)
                  ? thenNode.run(env)
                  : r.run(env);
            }));
      } else if (token == '=') {
        if (!stack.hasValueNode()) {
          throw 'Unexpected token: =';
        }
        stack.push(
            new Node(2, async (l, r, env) => {
              if (l == null || r == null) {
                throw 'Operand is missing: =';
              }
              const value = await r.run(env);
              l.assign(value, env);
              return value;
            }));
      } else if (token == '+=') {
        stack.push(
            new Node(2, async (l, r, env) => {
              const value = await l.run(env)
                            + await r.run(env);
              l.assign(value, env);
              return value;
            }));
      } else if (token == '-=') {
        stack.push(
            new Node(2, async (l, r, env) => {
              const value = await l.run(env)
                            - await r.run(env);
              l.assign(value, env);
              return value;
            }));
      } else if (token == '*=') {
        stack.push(
            new Node(2, async (l, r, env) => {
              const value = await l.run(env)
                            * await r.run(env);
              l.assign(value, env);
              return value;
            }));
      } else if (token == '/=') {
        stack.push(
            new Node(2, async (l, r, env) => {
              const value = await l.run(env)
                            / await r.run(env);
              l.assign(value, env);
              return value;
            }));
      } else if (token == '=>') {
        const node =
            new Node(2, async (l, r, env) => {
              const paramNodes = l.children || [l];
              return new FunctionValue(
                    paramNodes.map(c => c.name),
                    paramNodes.length > 0
                        && paramNodes.at(-1)
                            .varArgs,
                    r,
                    new Map(env.variables));
           });
        stack.push(node);
        if (this.tokens[0] == '{') {
          this.tokens.shift();
          node.right = this.buildTree('}');
          node.freeze();
        }
      } else if (token == '...' && endToken == ')'
                 && this.tokens[1] == ')') {
        const node =
            variableNode(this.tokens.shift());
        node.varArgs = true;
        stack.push(node);
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
