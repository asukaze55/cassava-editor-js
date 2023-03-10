// #ifndef MODULE
(() => {
// #endif

function stringForReplace(replaceText, match) {
  let result = '';
  for (let i = 0; i < replaceText.length; i++) {
    const nextChar = replaceText[i + 1];
    if (replaceText[i] == '$' && nextChar >= '0'
        && nextChar <= '9') {
      const group = nextChar - 0;
      if (group < match.length - 2) {
        result += match[group];
        i++;
        continue;
      }
    }
    if (replaceText[i] == '\\') {
      if (nextChar == 'n') {
        result += '\n';
        i++;
        continue;
      } else if (nextChar == 't') {
        result += '\t';
        i++;
        continue;
      } else if(nextChar == '\\') {
        result += '\\';
        i++;
        continue;
      } else if (nextChar == '$') {
        result += '\\';
        i++;
        continue;
      }
    }
    result += replaceText[i];
  }
  return result;
}

function createReplacer(findText, replaceText,
    ignoreCase, wholeCell, regex) {
  if (regex) {
    const regexp = new RegExp(
        wholeCell ? '^' + findText + '$' : findText,
        ignoreCase ? 'gis' : 'gs');
    return value =>
        value.replaceAll(regexp, (...p) =>
            p[0] ? stringForReplace(replaceText, p)
                 : '');
  } else if (wholeCell && ignoreCase) {
    const lowerFindText = findTexttoLowerCase();
    return value =>
        (value.toLowerCase() == lowerFindText)
            ? replaceText : value;
  } else if (wholeCell) {
    return value =>
        (value == findText) ? replaceText : value;
  } else if (ignoreCase) {
    const lowerFindText = findText.toLowerCase();
    return value => {
      const lowerValue = value.toLowerCase();
      let result = '';
      let index = 0;
      while (true) {
        const p =
            lowerValue.indexOf(lowerFindText, index);
        if (p < 0) {
          return result + value.substring(index);
        }
        result +=
            value.substring(index, p) + replaceText;
        index = p + lowerFindText.length;
      }
   }
 } else {
   return value =>
       value.replaceAll(findText, replaceText);
  }
}

function asc(c) {
  return c.codePointAt(0);
}

function chr(c) {
  return String.fromCodePoint(Math.floor(c));
}

function toHankakuAlphabet(value) {
  const d = asc('???') - asc('A');
  let result = '';
  for (const c of value) {
    if (c == '???') {
      result += ' ';
    } else if (c == '???') {
      result += "'";
    } else if (c == '???') {
      result += '"';
    } else if (c == '???') {
      result += '\\';
    } else if (c >= '???' && c <= '???') {
      result += chr(asc(c) - d);
    } else {
      result += c;
    }
  }
  return result;
}

function toZenkakuAlphabet(value) {
  const d = asc('???') - asc('A');
  let result = '';
  for (const c of value) {
    if (c == ' ') {
      result += '???';
    } else if (c == "'") {
      result += '???';
    } else if (c == '"') {
      result += '???';
    } else if (c == '\\') {
      result += '???';
    } else if (c >= '!' && c <= '~') {
      result += chr(asc(c) + d);
    } else {
      result += c;
    }
  }
  return result;
}

function toHankakuKana(value) {
  let result = '';
  for (const c of value) {
    if (c == '???') {
      result += ' ';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '??????';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c < '???' || c > '???') {
      result += c;
    } else if (c == '???') {
      result += '???';
    } else if (c >= '???' && c <= '???') {
      const x = asc(c) - asc('???');
      result += (x % 2)
          ? chr(asc('???') + (x / 2))
          : chr(asc('???') + (x / 2));
    } else if (c >= '???' && c <= '???') {
      const x = asc(c) - asc('???');
      result += chr(asc('???') + (x / 2));
      if (x % 2) {
        result += '???';
      }
    } else if (c >= '???' && c <= '???') {
      const x = asc(c) - asc('???');
      result += chr(asc('???') + (x / 2));
      if (x % 2) {
        result += '???';
      }
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???') + asc(c) - asc('???'));
    } else if (c >= '???' && c <= '???') {
      const x = asc(c) - asc('???');
      result += chr(asc('???') + (x / 3));
      if ((x % 3) == 1) {
        result += '???';
      } else if ((x % 3) == 2) {
        result += '???';
      }
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???') + asc(c) - asc('???'));
    } else if (c >= '???' && c <= '???') {
      const x = asc(c) - asc('???');
      result += (x % 2)
          ? chr(asc('???') + (x / 2))
          : chr(asc('???') + (x / 2));
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???') + asc(c) - asc('???'));
    } else {
      result += c;
    }
  }
  return result;
}

function toZenkakuKana(value) {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c == ' ') {
      result += '???';
    } else if (c < '???' || c > '???') {
      result += c;
    } else if (c >= '???' && c <= '???') {
      if (c == '???' && value[i + 1] == '???') {
        result += '???';
        i++;
      } else {
        result += chr(asc('???')
                      + (asc(c) - asc('???')) * 2);
      }
    } else if (c >= '???' && c <= '???') {
      let x = 0;
      if (value[i + 1] == '???') {
        x = 1;
        i++;
      }
      result += chr(asc('???')
                    + (asc(c) - asc('???')) * 2 + x);
    } else if (c >= '???' && c <= '???') {
      let x = 0;
      if (value[i + 1] == '???') {
        x = 1;
        i++;
      }
      result += chr(asc('???')
                    + (asc(c) - asc('???')) * 2 + x);
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???') + asc(c) - asc('???'));
    } else if (c >= '???' && c <= '???') {
      let x = 0;
      if (value[i + 1] == '???') {
        x = 1;
        i++;
      } else if (value[i + 1] == '???') {
        x = 2;
        i++;
      }
      result += chr(asc('???')
                    + (asc(c) - asc('???')) * 3 + x);
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???') + asc(c) - asc('???'));
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???')
                    + (asc(c) - asc('???')) * 2);
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???') + asc(c) - asc('???'));
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???')
                    + (asc(c) - asc('???')) * 2);
    } else if (c >= '???' && c <= '???') {
      result += chr(asc('???')
                    + (asc(c) - asc('???')) * 2);
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else if (c == '???') {
      result += '???';
    } else {
      result += c;
    }
  }
  return result;
}

// #ifdef MODULE
// export { createReplacer, toHankakuAlphabet, toHankakuKana, toZenkakuAlphabet, toZenkakuKana };
// #else
window.net = window.net || {};
net.asukaze = net.asukaze || {};
net.asukaze.cassava = net.asukaze.cassava || {};
net.asukaze.cassava.createReplacer = createReplacer;
net.asukaze.cassava.toHankakuAlphabet =
    toHankakuAlphabet;
net.asukaze.cassava.toHankakuKana =
    toHankakuKana;
net.asukaze.cassava.toZenkakuAlphabet =
    toZenkakuAlphabet;
net.asukaze.cassava.toZenkakuKana =
    toZenkakuKana;
})();
