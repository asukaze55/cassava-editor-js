function Builder() {
  this.header_ = [];
  this.main_ = [];
  this.footer_ = [];
  this.indent_ = '';
}

Builder.prototype.build = function() {
  return this.header_.concat(this.main_).concat(this.footer_).join('\n');
};

Builder.prototype.header = function(line, opt_arg1, opt_arg2, opt_arg3) {
  this.header_.push(this.format_(line, opt_arg1, opt_arg2, opt_arg3));
};

Builder.prototype.main = function(line, opt_arg1, opt_arg2, opt_arg3) {
  this.main_.push(this.indent_ + this.format_(line, opt_arg1, opt_arg2, opt_arg3));
};

Builder.prototype.block = function(line, opt_arg1, opt_arg2, opt_arg3) {
  this.main_.push(this.indent_ + this.format_(line, opt_arg1, opt_arg2, opt_arg3) + ' {');
  this.footer_.unshift(this.indent_ + '}');
  this.indent_ += '  ';
};

Builder.prototype.format_ = function(template, opt_arg1, opt_arg2, opt_arg3) {
  return template
      .replace('%s', opt_arg1)
      .replace('%s', opt_arg2)
      .replace('%s', opt_arg3);
};

let registeredMacroName = '';

function generate() {
  var builder = new Builder();

  var name = elem('name').value;
  builder.header('// %s.cms', name);
  builder.header('');
  var names = document.querySelectorAll('.macro-name');
  for (var i = 0; i < names.length; i++) {
    names[i].innerText = name;
  }

  var errors = document.querySelectorAll('.error');
  for (var i = 0; i < errors.length; i++) {
    errors[i].className = errors[i].className.replace(' error', '');
  }

  processY(builder);
  processX(builder);
  processCondition(builder);
  processAction(builder);

  var result = builder.build();
  elem('content').value = result;
  updateUrl();

  var mainGrid = elem('main-grid');
  if (mainGrid && mainGrid.addMacro) {
    mainGrid.addMacro(registeredMacroName, '');
    mainGrid.addMacro(name, result);
    registeredMacroName = name;
  }
  return result;
}

function processY(builder) {
  var y = elem('y').value;
  var pc = elem('pc1').value;
  var pp = elem('pp1').value;
  var singleRow = (y == 'c' || y == 'e' || y == 'd');
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
    builder.header('y = %s;', numValue(elem('yv')));
  } else if (y == 'd') {
    builder.header('y = int(InputBox("行番号を入力してください。"));');
    builder.header('if (y == 0) { return; }');
    builder.header('');
  }
}

function processX(builder) {
  var x = elem('x').value;
  var pc = elem('pc1').value;
  var singleCol = (x == 'c' || x == 'e' || x == 'd');
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
    builder.header('x = %s;', numValue(elem('xv')));
  } else if (x == 'd') {
    builder.header('x = int(InputBox("列番号を入力してください。"));');
    builder.header('if (x == 0) { return; }');
    builder.header('');
  }
}

function processCondition(builder) {
  var cc = elem('cc1').value;
  setVisible(elem('cvo1'), cc != 'a');
  setVisible(elem('ccvs1'), cc == 'cl' || cc == 'rw');
  setVisible(elem('ccvs1-cl'), cc == 'cl');
  setVisible(elem('ccvs1-rw'), cc == 'rw');
  if (cc == 'a') {
    return;
  }

  var cell = '[x,y]';
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

  var cvElem = elem('cv1');
  var co = elem('co1').value;
  var isValueNumber = (co == 'g' || co == 'l' || co == 'gt' || co == 'lt');
  var value = isValueNumber ? numValue(cvElem) : strValue(cvElem);
  if (co == 'q') {
    builder.block('if (%s == %s)', cell, value);
  } else if (co == 'nq') {
    builder.block('if (%s != %s)', cell, value);
  } else if (co == 's') {
    builder.block('if (%s.startsWith(%s))', cell, value);
  } else if (co == 'ns') {
    builder.block('if (!(%s.startsWith(%s)))', cell, value);
  } else if (co == 'e') {
    builder.block('if (%s.endsWith(%s))', cell, value);
  } else if (co == 'ne') {
    builder.block('if (!(%s.endsWith(%s)))', cell, value);
  } else if (co == 'c') {
    builder.block('if (pos(%s, %s) > 0)', cell, value);
  } else if (co == 'nc') {
    builder.block('if (pos(%s, %s) == 0)', cell, value);
  } else if (co == 'g') {
    builder.block('if (%s >= %s)', cell, value);
  } else if (co == 'l') {
    builder.block('if (%s <= %s)', cell, value);
  } else if (co == 'gt') {
    builder.block('if (%s > %s)', cell, value);
  } else if (co == 'lt') {
    builder.block('if (%s < %s)', cell, value);
  }
}

function processAction(builder) {
  var pp = elem('pp1').value;
  setVisible(elem('pcvo1'), pp == 'c');
  if (pp == 'dr'){
    builder.main('DeleteRow(y);');
  } else if (pp == 'hr') {
    builder.main('SetRowHeight(y, 0);');
  } else if (pp == 'c') {
    processSetCellAction(builder);
  }
}

function processSetCellAction(builder) {
  var pc = elem('pc1').value;
  var pvsElem = elem('pvs1');
  var pvs = pvsElem.value;
  var pvElem = elem('pv1');
  var poElem = elem('po1');
  var po = poElem.value;
  setVisible(pvElem, pc == 's' || pvs == 's' || pvs == 'c' || pvs == 'r');
  setVisible(pvsElem, pc != 's');
  setVisible(poElem, pc != 's');
  setVisible(elem('pvs1-c-pv1'), pvs == 'c');
  setVisible(elem('pvs1-r-pv1'), pvs == 'r');

  if (pc == 's') {
    builder.main('[x,y] = %s;', strValue(pvElem));
    return;
  }

  var isValueString = (po == 'i' || po == 'a');
  var value;
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

  var originalValue = '[x,y]';
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
    builder.main('[x,y] = %s + %s;', value, originalValue);
  } else if (po == 'a') {
    builder.main('[x,y] = %s + %s;', originalValue, value);
  } else if (po == 'p') {
    builder.main('[x,y] = %s + %s;', originalValue, value);
  } else if (po == 'm') {
    builder.main('[x,y] = %s - %s;', originalValue, value);
  } else if (po == 'x') {
    builder.main('[x,y] = %s * %s;', originalValue, value);
  } else if (po == 'xr') {
    builder.main('[x,y] = int(%s * %s + 0.5);', originalValue, value);
  } else if (po == 'xf') {
    builder.main('[x,y] = int(%s * %s);', originalValue, value);
  } else if (po == 'd') {
    builder.main('[x,y] = %s / %s;', originalValue, value);
  } else if (po == 'dr') {
    builder.main('[x,y] = int(%s / %s + 0.5);', originalValue, value);
  } else if (po == 'df') {
    builder.main('[x,y] = int(%s / %s);', originalValue, value);
  }
}

function elem(id) {
  return document.getElementById(id);
}

function numValue(element) {
  var value = element.value;
  var numValue = value - 0 || 0;
  if (value == '' || value != numValue) {
    element.className += ' error';
  }
  return numValue;
}

function strValue(element) {
  return '"' + element.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function setVisible(element, visible) {
  element.style.display = (visible ? '' : 'none');
}

function setVisibleAll(selector, visible) {
  var elements = document.querySelectorAll(selector);
  for (var i = 0; i < elements.length; i++) {
    setVisible(elements[i], visible);
  }
}

function restore() {
  var hash = location.hash;
  if (hash[0] == '#') {
    hash = hash.substring(1);
  }
  var params = hash.split('&');
  for (var i = 0; i < params.length; i++) {
    var param = params[i].split('=');
    var input = elem(param[0]);
    if (input) {
      input.value = decodeURIComponent(param[1]);
    }
  }
  generate();
}

function updateUrl() {
  var ids = {
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
  };
  var results = [];
  for (var id in ids) {
    var input = elem(id);
    if (input && input.value != ids[id]) {
      results.push(id + '=' + encodeURIComponent(input.value));
    }
  }
  var hash = '#' + results.join('&');
  try {
    history.replaceState(null, null, hash);
  } catch (e) {
    location.hash = hash;
  }
}

function download(event) {
  var blob = new Blob(["\ufeff" + elem('content').value], {type: "text/plain"});
  var name = elem('name').value + '.cms';
  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, name);
    return false;
  }
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
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
  var element = document.getElementById('cassava-editor-js');
  element.style.display = '';
  var script = document.createElement('script');
  script.src = 'https://www.asukaze.net/soft/cassava/js/cassava_min_20250126.js';
  element.append(script);
  script.onload = generate;
}

window.addEventListener('DOMContentLoaded',function() {
  if (location.hash != '#cassava-js') {
    restore();
  }
  setTimeout(loadCassava, 100);
});
