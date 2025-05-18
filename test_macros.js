for (const grid of document.getElementsByTagName('cassava-grid')) {
grid.addMacro('tests/ArrayTest.cms', String.raw`
import { Array, split, arrayOf, arrayFrom } from "lib/Array.cms";
import { Assert } from "lib/Assert.cms";

class ArrayTest {
  name() {
    return "ArrayTest";
  }

  concat(assert) {
    array1 = split("a,b,c", ",");
    array2 = split("d,e,f", ",");
    array3 = array1.concat(array2);
    assert.that(array1.join(":")).isEqualTo("a:b:c");
    assert.that(array2.join(":")).isEqualTo("d:e:f");
    assert.that(array3.join(":")).isEqualTo("a:b:c:d:e:f");
  }

  filter(assert) {
    array = arrayOf("spray", "limit", "elite", "exuberant", "destruction", "present");
    result = array.filter(word => word.length > 6);
    assert.that(result.join(":")).isEqualTo("exuberant:destruction:present");
    assert.that(array.join(":")).isEqualTo("spray:limit:elite:exuberant:destruction:present");
  }

  findIndex(assert) {
    array = arrayOf(5, 12, 8);
    assert.that(array.findIndex(e => e > 0)).isEqualTo(0);
    assert.that(array.findIndex(e => e > 10)).isEqualTo(1);
    assert.that(array.findIndex(e => e > 20)).isEqualTo(-1);
  }

  includes(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.includes("c")).isTrue();
    assert.that(array.includes("d")).isFalse();
  }

  indexOf(assert) {
    array = split("a,b,c,d,c", ",");
    assert.that(array.indexOf("c")).isEqualTo(2);
    assert.that(array.indexOf("e")).isEqualTo(-1);
    assert.that(array.indexOf("c", 2)).isEqualTo(2);
    assert.that(array.indexOf("c", 3)).isEqualTo(4);
    assert.that(array.indexOf("c", 5)).isEqualTo(-1);
  }

  join(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.join(":")).isEqualTo("a:b:c:c");
    assert.that(new Array().join(":")).isEqualTo("");
  }

  lastIndexOf(assert) {
    array = split("a,b,c,d,c", ",");
    assert.that(array.lastIndexOf("c")).isEqualTo(4);
    assert.that(array.lastIndexOf("e")).isEqualTo(-1);
    assert.that(array.lastIndexOf("c", 4)).isEqualTo(4);
    assert.that(array.lastIndexOf("c", 3)).isEqualTo(2);
    assert.that(array.lastIndexOf("c", 1)).isEqualTo(-1);
  }

  map(assert) {
    array = arrayOf(1, 4, 9, 16);
    result = array.map(x => x * 2);
    assert.that(result.join(":")).isEqualTo("2:8:18:32");
    assert.that(array.join(":")).isEqualTo("1:4:9:16");
  }

  pop(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.pop()).isEqualTo("c");
    assert.that(array.join(":")).isEqualTo("a:b:c");
    assert.that(array.pop()).isEqualTo("c");
    assert.that(array.join(":")).isEqualTo("a:b");
    assert.that(array.pop()).isEqualTo("b");
    assert.that(array.join(":")).isEqualTo("a");
    assert.that(array.pop()).isEqualTo("a");
    assert.that(array.join(":")).isEqualTo("");
    assert.that(array.pop()).isEqualTo("");
    assert.that(array.join(":")).isEqualTo("");
  }

  push(assert) {
    array = new Array();
    assert.that(array.length).isEqualTo(0);
    assert.that(array.push("aaa")).isEqualTo(1);
    assert.that(array.length).isEqualTo(1);
    assert.that(array[0]).isEqualTo("aaa");
    assert.that(array.push("bbb")).isEqualTo(2);
    assert.that(array.length).isEqualTo(2);
    assert.that(array[0]).isEqualTo("aaa");
    assert.that(array[1]).isEqualTo("bbb");
  }

  reverse(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.reverse().join(":")).isEqualTo("c:c:b:a");
    assert.that(array.join(":")).isEqualTo("c:c:b:a");

    array = split("a,b,c", ",");
    assert.that(array.reverse().join(":")).isEqualTo("c:b:a");
    assert.that(array.join(":")).isEqualTo("c:b:a");
  }

  shift(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.shift()).isEqualTo("a");
    assert.that(array.join(":")).isEqualTo("b:c:c");
    assert.that(array.shift()).isEqualTo("b");
    assert.that(array.join(":")).isEqualTo("c:c");
    assert.that(array.shift()).isEqualTo("c");
    assert.that(array.join(":")).isEqualTo("c");
    assert.that(array.shift()).isEqualTo("c");
    assert.that(array.join(":")).isEqualTo("");
    assert.that(array.shift()).isEqualTo("");
    assert.that(array.join(":")).isEqualTo("");
  }

  slice(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.slice(1, 3).join(":")).isEqualTo("b:c");
    assert.that(array.slice(1, 5).join(":")).isEqualTo("b:c:c");
    assert.that(array.slice(3, 1).join(":")).isEqualTo("");
    assert.that(array.slice(5, 6).join(":")).isEqualTo("");
    assert.that(array.slice(-3, -1).join(":")).isEqualTo("b:c");
    assert.that(array.slice(-11, -10).join(":")).isEqualTo("");
  }

  splice(assert) {
    array = split("a,b,c,c", ",");
    assert.that(array.splice(1, 1).join(":")).isEqualTo("b");
    assert.that(array.join(":")).isEqualTo("a:c:c");
    assert.that(array.splice(1, 100, "d", "e", "f").join(":")).isEqualTo("c:c");
    assert.that(array.join(":")).isEqualTo("a:d:e:f");
    assert.that(array.splice(-3, 2, "g").join(":")).isEqualTo("d:e");
    assert.that(array.join(":")).isEqualTo("a:g:f");
  }

  unshift(assert) {
    array = new Array();
    assert.that(array.unshift("a")).isEqualTo(1);
    assert.that(array.join(":")).isEqualTo("a");
    assert.that(array.unshift("b")).isEqualTo(2);
    assert.that(array.join(":")).isEqualTo("b:a");
    assert.that(array.unshift("c")).isEqualTo(3);
    assert.that(array.join(":")).isEqualTo("c:b:a");
  }

  split(assert) {
    assert.that(split("a123b123c", "123").join(":")).isEqualTo("a:b:c");
  }

  arrayFrom(assert) {
    array = arrayFrom({0: "a", 1: "b", length: 2});
    assert.that(array.join(":")).isEqualTo("a:b");
  }

  arrayOf(assert) {
    array = arrayOf("a", "b", "c");
    assert.that(array.join(":")).isEqualTo("a:b:c");
  }

  forOf(assert) {
    array = arrayOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    v = "";
    for (e of array) {
      if (e == 6) {
        break;
      }
      if (e % 2 == 0) {
        continue;
      }
      v += e;
    }
    assert.that(v).isEqualTo("135");
  }

  test(assert) {
    this.concat(assert);
    this.filter(assert);
    this.findIndex(assert);
    this.includes(assert);
    this.indexOf(assert);
    this.join(assert);
    this.lastIndexOf(assert);
    this.map(assert);
    this.pop(assert);
    this.push(assert);
    this.reverse(assert);
    this.shift(assert);
    this.slice(assert);
    this.splice(assert);
    this.unshift(assert);
    this.split(assert);
    this.arrayFrom(assert);
    this.arrayOf(assert);
    this.forOf(assert);
  }
}

assert = new Assert();
new ArrayTest().test(assert);
assert.showResult();
`);

grid.addMacro('tests/FunctionsTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class FunctionsTest {
  name() {
    return "FunctionsTest";
  }

  clear() {
    Right = 1;
    Bottom = 1;
    Col = 1;
    Row = 1;
    [1,1] = "";
  }

  getValues(l, t, r, b) {
    result = "";
    for (y = t; y <= b; y++) {
      for (x = l; x <= r; x++) {
        result += [x,y];
      }
    }
    return result;
  }

  test(assert) {
    this.clear();

    moveto(1, 2);
    assert.that(Col).isEqualTo(1);
    assert.that(Row).isEqualTo(2);

    move(3, 4);
    assert.that(Col).isEqualTo(4);
    assert.that(Row).isEqualTo(6);

    write(123);
    assert.that([4,6]).isEqualTo(123);
    assert.that(Col).isEqualTo(5);
    assert.that(Row).isEqualTo(6);

    writeln(456);
    assert.that([5,6]).isEqualTo(456);
    assert.that(Col).isEqualTo(1);
    assert.that(Row).isEqualTo(7);

    a = 1;
    b = 2;
    swap(a, b);
    assert.that(a).isEqualTo(2);
    assert.that(b).isEqualTo(1);

    [1,2] = "012";
    [2,1] = "021";
    swap([1,2], [2,1]);
    assert.that([1,2]).isEqualTo("021");
    assert.that([2,1]).isEqualTo("012");

    obj1 = {a: "obj1"};
    obj2 = {a: "obj2"};
    swap(obj1, obj2);
    assert.that(obj1.a).isEqualTo("obj2");
    assert.that(obj2.a).isEqualTo("obj1");

    InsertRow(1);
    assert.that([4,7]).isEqualTo(123);

    DeleteRow(1);
    assert.that([4,6]).isEqualTo(123);

    InsertCol(1);
    assert.that([5,6]).isEqualTo(123);

    DeleteCol(1);
    assert.that([4,6]).isEqualTo(123);

    a = "abcde";
    mid(a, 3, 2) = "===";
    assert.that(a).isEqualTo("ab===e");

    originalRowHeight = GetRowHeight();
    SetRowHeight(1, 5);
    assert.that(GetRowHeight(1)).isEqualTo(5);

    SetRowHeight(10);
    assert.that(GetRowHeight(1)).isEqualTo(10);
    SetRowHeight(originalRowHeight);

    originalColWidth = GetColWidth();
    SetColWidth(1, 5);
    assert.that(GetColWidth(1)).isEqualTo(5);

    SetColWidth(10);
    assert.that(GetColWidth(1)).isEqualTo(10);
    SetColWidth(originalColWidth);

    [1,1] = 3;
    [1,2] = 10;
    [1,3] = 4;
    [1,4] = "AAA3";
    [1,5] = "aaa2";
    [1,6] = "ＡＡＡ１";
    for (y = 1; y <= 6; y++) {
      [2,y] = y;
    }

    Sort(1, 1, 2, 6, 1, false, false, false, false);
    assert.that(this.getValues(1, 1, 1, 6)).isEqualTo("1034AAA3aaa2ＡＡＡ１");
    assert.that(this.getValues(2, 1, 2, 6)).isEqualTo("213456");

    Sort(1, 1, 2, 6, 1, true, false, false, false);
    assert.that(this.getValues(1, 1, 1, 6)).isEqualTo("ＡＡＡ１aaa2AAA34310");
    assert.that(this.getValues(2, 1, 2, 6)).isEqualTo("654312");

    Sort(1, 1, 2, 6, 1, false, true, false, false);
    assert.that(this.getValues(1, 1, 1, 6)).isEqualTo("3410AAA3aaa2ＡＡＡ１");
    assert.that(this.getValues(2, 1, 2, 6)).isEqualTo("132456");

    Sort(1, 1, 2, 6, 1, false, false, true, false);
    assert.that(this.getValues(1, 1, 1, 6)).isEqualTo("1034aaa2AAA3ＡＡＡ１");
    assert.that(this.getValues(2, 1, 2, 6)).isEqualTo("213546");

    Sort(1, 1, 2, 6, 1, false, false, false, true);
    assert.that(this.getValues(1, 1, 1, 6)).isEqualTo("1034ＡＡＡ１AAA3aaa2");
    assert.that(this.getValues(2, 1, 2, 6)).isEqualTo("213645");

    for (y = 1; y <= 3; y++) {
      for (x = 1; x <= 3; x++) {
        [x,y] = "ABC";
      }
    }

    ReplaceAll("B", "Z");
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("AZCAZCAZCAZCAZCAZCAZCAZCAZC");
    ReplaceAll("z", "y", true, false, false);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("AyCAyCAyCAyCAyCAyCAyCAyCAyC");
    ReplaceAll("y", "x", false, true, false);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("AyCAyCAyCAyCAyCAyCAyCAyCAyC");
    ReplaceAll("AyC", "ABC", false, true, false);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("ABCABCABCABCABCABCABCABCABC");
    ReplaceAll("(A+)(B+)(C+)", "$1:$2:$3", false, false, true);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("A:B:CA:B:CA:B:CA:B:CA:B:CA:B:CA:B:CA:B:CA:B:C");
    ReplaceAll("(a+):(b+):(c+)", "$1-$2-$3", true, false, true);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("A-B-CA-B-CA-B-CA-B-CA-B-CA-B-CA-B-CA-B-CA-B-C");
    ReplaceAll("B+", "#$0#", false, true, true);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("A-B-CA-B-CA-B-CA-B-CA-B-CA-B-CA-B-CA-B-CA-B-C");
    ReplaceAll("A+\\-B+\\-C+", "#$0#", false, true, true);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("#A-B-C##A-B-C##A-B-C##A-B-C##A-B-C##A-B-C##A-B-C##A-B-C##A-B-C#");
    ReplaceAll("-B-", "", false, false, false, 2, 2, 2, 2);
    assert.that(this.getValues(1, 1, 3, 3)).isEqualTo("#A-B-C##A-B-C##A-B-C##A-B-C##AC##A-B-C##A-B-C##A-B-C##A-B-C#");
    [1,1] = "A\nB\nC\nD";
    ReplaceAll("B\nC", "Z\n");
    assert.that([1,1]).isEqualTo("A\nZ\n\nD");
    [2,1] = "";
    ReplaceAll("(.*)", "($1)", false, false, true);
    assert.that([1,1]).isEqualTo("(A\nZ\n\nD)");
    assert.that([2,1]).isEqualTo("");
    [1,1] = "AABBaabb";
    ReplaceAll(/(A+)/g, "($1)");
    assert.that([1,1]).isEqualTo("(AA)BBaabb");
    [1,1] = "AABBaabb";
    ReplaceAll(/(A+)/gi, "($1)");
    assert.that([1,1]).isEqualTo("(AA)BB(aa)bb");
 
    cell(3, 1) = "abc";
    assert.that(cell(3, 1)).isEqualTo("abc");
    assert.that([3, 1]).isEqualTo("abc");

    assert.that(int("1.25") + int(-5.5)).isEqualTo(-4);
    assert.that(double("1.25") + double(-5.5)).isEqualTo(-4.25);
    assert.that(str("1.25") + str(-5.5)).isEqualTo("1.25-5.5");

    assert.that(max(3, 1, 4)).isEqualTo(4);
    assert.that(min(3, 1, 4)).isEqualTo(1);

    assert.that(len("あああabcde")).isEqualTo(8);
    // assert.that(lenB("あああabcde")).isEqualTo(11);
    assert.that(left("あああabcde", 3)).isEqualTo("あああ");
    assert.that(right("あああabcde", 3)).isEqualTo("cde");
    assert.that(mid("あああabcde", 3, 4)).isEqualTo("あabc");
    assert.that(mid("あああabcde", 3)).isEqualTo("あabcde");
    assert.that(pos("あああabcde", "abc")).isEqualTo(4);
    assert.that(pos("あああabcde", "ABC")).isEqualTo(0);
    // assert.that(posB("あああabcde", "abc")).isEqualTo(7);
    // assert.that(posB("あああabcde", "ABC")).isEqualTo(0);
    // assert.that(asc("あああabcde")).isEqualTo(33440);
    assert.that(ascW("あああabcde")).isEqualTo(12354);
    // assert.that(chr(33440)).isEqualTo("あ");
    assert.that(chrW(12354)).isEqualTo("あ");
    assert.that(replace("A&&B", "&", "&amp;")).isEqualTo("A&amp;&amp;B");
    assert.that(replace("ABC-AB\nC-abc", "ABC", "($1)", false, false)).isEqualTo("($1)-AB\nC-abc");
    assert.that(replace("ABC-AB\nC-abc", "ABC", "($1)", true, false)).isEqualTo("($1)-AB\nC-($1)");
    assert.that(replace("ABC-AB\nC-abc", "([A-Z\\n]+)", "($1)", false, true)).isEqualTo("(ABC)-(AB\nC)-abc");
    assert.that(replace("ABC-AB\nC-abc", "([A-Z\\n]+)", "($1)", true, true)).isEqualTo("(ABC)-(AB\nC)-(abc)");
    assert.that(replace("ABC-AB\nC-abc", "(.*)", "($1)", true, true)).isEqualTo("(ABC-AB\nC-abc)");

    // 3, 10, 4, 1, 2, 3
    [1,1] = 1;
    [2,1] = 10;
    [1,2] = "";
    [2,2] = 10;
    assert.that(sum(1, 1, 2, 3)).isEqualTo(21);
    assert.that(avr(1, 1, 2, 3)).isEqualTo(7);
    assert.that(random(1)).isEqualTo(0);

    pi = 3.141592653589793;
    assert.that(sqrt(9)).isEqualTo(3);
    assert.that(sin(pi / 2)).isEqualTo(1);
    assert.that(cos(pi)).isEqualTo(-1);
    // assert.that(tan(pi / 3)).isEqualTo(sqrt(3));
    assert.that(asin(1)).isEqualTo(pi / 2);
    assert.that(acos(-1)).isEqualTo(pi);
    assert.that(atan(sqrt(3))).isEqualTo(pi / 3);
    assert.that(atan2(0, 0)).isEqualTo(0);
    assert.that(atan2(0, -1)).isEqualTo(pi);
    assert.that(pow(4, 2.5)).isEqualTo(32);

    [6,6] = 6;
    Select(2, 3, 4, 5);
    assert.that(SelLeft).isEqualTo(2);
    assert.that(SelTop).isEqualTo(3);
    assert.that(SelRight).isEqualTo(4);
    assert.that(SelBottom).isEqualTo(5);

    this.clear();
  }
}

assert = new Assert();
new FunctionsTest().test(assert);
assert.showResult();
`);

grid.addMacro('tests/LambdaTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class Sample {
  constructor() {
    this.value = 123;
  }

  getProvider() {
    return () => this.value;
  }

  increment() {
    this.value++;
  }
}

class LambdaTest {
  name() {
    return "LambdaTest";
  }

  invoke0(f) {
    return f();
  }

  invoke1(f, a) {
    return f(a);
  }

  invoke2(f, a, b) {
    return f(a, b);
  }

  test(assert) {
    f = () => 12345;
    assert.that(f()).isEqualTo(12345);
    f = () => { return 23456; };
    assert.that(f()).isEqualTo(23456);
    f = x => x * x;
    assert.that(f(3)).isEqualTo(9);
    f = x => { return x * x; };
    assert.that(f(4)).isEqualTo(16);
    f = (x) => x * x;
    assert.that(f(5)).isEqualTo(25);
    f = (x) => { return x * x; };
    assert.that(f(6)).isEqualTo(36);
    f = (x, y) => x * y;
    assert.that(f(2, 3)).isEqualTo(6);
    f = (x, y) => { return x * y; };
    assert.that(f(3, 4)).isEqualTo(12);

    assert.that(this.invoke0(() => 34567)).isEqualTo(34567);
    assert.that(this.invoke1(x => x * x, 7)).isEqualTo(49);
    assert.that(this.invoke2((x, y) => x * y, 4, 5)).isEqualTo(20);
    
    x = 12;
    f = y => x * y;
    assert.that(f(11)).isEqualTo(132);
    
    f = a => b => x + a + b;
    g = f(1);
    assert.that(g(13)).isEqualTo(26);
    
    f = () => g(14);
    assert.that(f()).isEqualTo(27);

    obj = {f: f};
    assert.that(obj.f()).isEqualTo(27);

    sample = new Sample();
    f = sample.getProvider();
    assert.that(f()).isEqualTo(123);
    sample.increment();
    assert.that(f()).isEqualTo(124);

    str = str(1.00);
    assert.that(str).isEqualTo("1");

    f = (...args) => args;
    assert.that(f(1, 2).length).isEqualTo(2);
    assert.that(f(1, 2)[0]).isEqualTo(1);
    assert.that(f(1, 2)[1]).isEqualTo(2);

    f = (a, ...args) => args;
    assert.that(f(1, 2).length).isEqualTo(1);
    assert.that(f(1, 2)[0]).isEqualTo(2);

    f = (a = 1, b = 2, c = 3) => a * 100 + b * 10 + c;
    assert.that(f()).isEqualTo(123);
    assert.that(f(7)).isEqualTo(723);
    assert.that(f(7, 8)).isEqualTo(783);
    assert.that(f(7, 8, 9)).isEqualTo(789);

    f = (a, b = 2, ...args) => a * 100 + b * 10 + args.length;
    assert.that(f(7)).isEqualTo(720);
    assert.that(f(7, 8)).isEqualTo(780);
    assert.that(f(7, 8, 9)).isEqualTo(781);
    assert.that(f(7, 8, 9, 10)).isEqualTo(782);

    min = (a, b) => a - b;
    assert.that(min(3, 5)).isEqualTo(-2);
    assert.that(::min(3, 5)).isEqualTo(3);
  }
}

assert = new Assert();
new LambdaTest().test(assert);
assert.showResult();
`);

grid.addMacro('tests/MenuTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class MenuTest {
  name() {
    return "MenuTest";
  }

  clear() {
    Right = 1;
    Bottom = 1;
    Col = 1;
    Row = 1;
    [1,1] = "";
  }

  getValues(l, t, r, b) {
    result = "";
    for (y = t; y <= b; y++) {
      for (x = l; x <= r; x++) {
        result += [x,y];
      }
    }
    return result;
  }

  test(assert) {
    this.clear();

    [1,1] = "A";
    [2,1] = "B";
    [1,2] = "C";
    [2,2] = "D";
    assert.that(this.getValues(1, 1, 2, 2)).isEqualTo("ABCD");

    SelLeft = 1;
    SelTop = 1;
    SelRight = 2;
    SelBottom = 2;
    Copy();
    assert.that(this.getValues(1, 1, 2, 2)).isEqualTo("ABCD");
    SelLeft = 3;
    SelTop = 1;
    SelRight = 4;
    SelBottom = 2;
    Paste();
    assert.that(this.getValues(1, 1, 4, 2)).isEqualTo("ABABCDCD");

    SelLeft = 2;
    SelTop = 1;
    SelRight = 3;
    SelBottom = 2;
    Cut();
    assert.that(this.getValues(2, 1, 3, 2)).isEqualTo("");
    SelLeft = 1;
    SelTop = 3;
    SelRight = 2;
    SelBottom = 4;
    Paste();
    assert.that(this.getValues(1, 3, 2, 4)).isEqualTo("BADC");

    [1,1] = "1";
    [2,1] = "2";
    [3,1] = "3";
    [1,2] = "4";
    [2,2] = "5";
    [3,2] = "6";
    [1,3] = "7";
    [2,3] = "8";
    [3,3] = "9";
    Row = 1;
    SelectRow();
    Copy();
    Row = 2;
    SelectRow();
    Paste();
    assert.that(this.getValues(1, 1, 3, 1)).isEqualTo("123");
    assert.that(this.getValues(1, 2, 3, 2)).isEqualTo("123");
    assert.that(this.getValues(1, 3, 3, 3)).isEqualTo("789");

    Col = 1;
    SelectCol();
    Copy();
    Col = 2;
    SelectCol();
    Paste();
    assert.that(this.getValues(1, 1, 1, 3)).isEqualTo("117");
    assert.that(this.getValues(2, 1, 2, 3)).isEqualTo("117");
    assert.that(this.getValues(3, 1, 3, 3)).isEqualTo("339");

    SelLeft = 1;
    SelTop = 1;
    SelRight = 2;
    SelBottom = 3;
    CopySum();
    moveto(1, 4);
    Paste();
    assert.that([1,4]).isEqualTo(18);

    SelLeft = 1;
    SelTop = 1;
    SelRight = 2;
    SelBottom = 3;
    CopyAvr();
    moveto(2, 4);
    Paste();
    assert.that([2,4]).isEqualTo(3);

    [1,1] = "A";
    [1,2] = "B";
    [1,3] = "C";
    Select(1, 1, 1, 3);
    Copy();
    Right = 1;
    Bottom = 1;
    Col = 1;
    Row = 1;
    [1,1] = "";
    Paste(4);
    assert.that(Bottom).isEqualTo(3);

    moveto(1, 1);
    [1,1] = "ABC123!?アイウ";
    TransChar1();
    assert.that([1,1]).isEqualTo("ＡＢＣ１２３！？アイウ");
    TransChar0();
    assert.that([1,1]).isEqualTo("ABC123!?アイウ");
    TransChar3();
    assert.that([1,1]).isEqualTo("abc123!?アイウ");
    TransChar2();
    assert.that([1,1]).isEqualTo("ABC123!?アイウ");
    TransChar4();
    assert.that([1,1]).isEqualTo("ABC123!?ｱｲｳ");
    TransChar5();
    assert.that([1,1]).isEqualTo("ABC123!?アイウ");

    [1,1] = "data001";
    SelLeft = 1;
    SelTop = 1;
    SelRight = 1;
    SelBottom = 3;
    SequenceS();
    assert.that([1,2]).isEqualTo("data002");
    assert.that([1,3]).isEqualTo("data003");
    SequenceC();
    assert.that([1,2]).isEqualTo("data001");
    assert.that([1,3]).isEqualTo("data001");

    this.clear();
    [1,1] = "A";
    InsRow();
    assert.that(Bottom).isEqualTo(2);
    assert.that([1,1]).isEqualTo("");
    assert.that([1,2]).isEqualTo("A");
    Col = 1;
    InsCol();
    assert.that(Right).isEqualTo(2);
    assert.that([1,2]).isEqualTo("");
    assert.that([2,2]).isEqualTo("A");
    Row = 1;
    CutRow();
    assert.that(Bottom).isEqualTo(1);
    assert.that([2,1]).isEqualTo("A");
    Col = 1;
    CutCol();
    assert.that(Right).isEqualTo(1);
    assert.that([1,1]).isEqualTo("A");
    
    [1,1] = "A";
    [2,1] = "B";
    [3,1] = "C";
    moveto(2, 1);
    Enter();
    assert.that([1,1]).isEqualTo("A");
    assert.that([1,2]).isEqualTo("B");
    assert.that([2,2]).isEqualTo("C");
    NewLine();
    assert.that([1,2]).isEqualTo("\n");
    moveto(2, 2);
    ConnectCell();
    assert.that([1,2]).isEqualTo("\nC");

    moveto(1, 1);
    [1,1] = "A";
    InsertCellRight();
    assert.that([1,1]).isEqualTo("");
    assert.that([2,1]).isEqualTo("A");
    [1,1] = "B";
    InsertCellDown();
    assert.that([1,1]).isEqualTo("");
    assert.that([1,2]).isEqualTo("B");
    [3,1] = "C";
    DeleteCellLeft();
    assert.that([1,1]).isEqualTo("A");
    assert.that([2,1]).isEqualTo("C");
    [1,3] = "D";
    DeleteCellUp();
    assert.that([1,1]).isEqualTo("B");
    assert.that([1,2]).isEqualTo("D");

    this.clear();
  }
}

assert = new Assert();
new MenuTest().test(assert);
assert.showResult();
`);

grid.addMacro('tests/ObjectTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class ObjectTest {
  name() {
    return "ObjectTest";
  }

  createObject() {
    return {a: 5};
  }

  test(assert) {
    obj = {a: 1, b: 2, c: 3};
    assert.that(obj.a + obj.b * obj.c).isEqualTo(7);

    obj = {"with space": 4};
    assert.that(obj["with space"]).isEqualTo(4);

    obj.a = {};
    obj.a.b = {};
    obj.a.b.c = "abc";
    assert.that(obj.a.b.c).isEqualTo("abc");
    assert.that(obj["a"]["b"]["c"]).isEqualTo("abc");

    obj[1] = {};
    obj[1][2] = {};
    obj[1][2][3] = "123";
    assert.that(obj[1][2][3]).isEqualTo("123");

    assert.that(this.createObject().a).isEqualTo(5);
  }
}

assert = new Assert();
new ObjectTest().test(assert);
assert.showResult();
`);

grid.addMacro('tests/OperatorsTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class OperatorsTest {
  name() {
    return "OperatorsTest";
  }

  test(assert) {
    assert.that(1 + 2).isEqualTo(3);
    assert.that("1" + "2").isEqualTo("12");
    assert.that("1" + 2).isEqualTo("12");
    assert.that(1 + "2").isEqualTo("12");
    assert.that(5 % 3).isEqualTo(2);
    assert.that(10 * 20 + 30 / 5 - 40).isEqualTo(166);

    assert.that(1 == 1).isTrue();
    assert.that(1 == 2).isFalse();
    assert.that(1 != 1).isFalse();
    assert.that(1 != 2).isTrue();
    assert.that(1 < 1).isFalse();
    assert.that(1 < 2).isTrue();
    assert.that(1 > 1).isFalse();
    assert.that(2 > 1).isTrue();
    assert.that(1 <= 1).isTrue();
    assert.that(2 <= 1).isFalse();
    assert.that(1 >= 1).isTrue();
    assert.that(1 >= 2).isFalse();
    assert.that(!false).isTrue();
    assert.that(!true).isFalse();
    assert.that(false && false).isFalse();
    assert.that(false && true).isFalse();
    assert.that(true && false).isFalse();
    assert.that(true && true).isTrue();
    assert.that(
            false && assert.that("evaluated").isEqualTo("do not evaluate"))
        .isFalse();
    assert.that(false || false).isFalse();
    assert.that(false || true).isTrue();
    assert.that(true || false).isTrue();
    assert.that(true || true).isTrue();
    assert.that(
            true || assert.that("evaluated").isEqualTo("do not evaluate"))
        .isTrue();
    assert.that(1 + 2 == 3 && 4 * 5 == 20 || false).isTrue();

    a = 100;
    a++;
    assert.that(a).isEqualTo(101);

    a = 100;
    a--;
    assert.that(a).isEqualTo(99);

    a = 100;
    a += 5;
    assert.that(a).isEqualTo(105);

    a = 100;
    a += "5";
    assert.that(a).isEqualTo("1005");

    a = 100;
    a -= 5;
    assert.that(a).isEqualTo(95);

    a = 100;
    a *= 5;
    assert.that(a).isEqualTo(500);

    a = 100;
    a /= 5;
    assert.that(a).isEqualTo(20);

    a = 100;
    a /= 3;
    assert.that(a).isEqualTo(100/3);

    in = {in: 1, out: 2};
    assert.that("in" in in).isTrue();
    assert.that(in in in).isFalse();
    assert.that(in.in).isEqualTo(1);
    assert.that(in["in"]).isEqualTo(1);

    obj = {"key with space": 3, 009: 4, 1.00: 5, "}": 6};
    assert.that(obj["key with space"]).isEqualTo(3);
    assert.that(obj[9]).isEqualTo(4);
    assert.that(obj[1]).isEqualTo(5);
    assert.that(obj["}"]).isEqualTo(6);

    assert.that(true ? 1 : 2).isEqualTo(1);
    assert.that(false ? 1 : 2).isEqualTo(2);
    assert.that(1 ? 2 ? 3 : 4 : 5 ? 6: 7).isEqualTo(3);
    assert.that(max(0 ? 4 : 3, 0 ? 2 : 1)).isEqualTo(3);
    assert.that(true ? false : true || true).isFalse();
  }
}

assert = new Assert();
new OperatorsTest().test(assert);
assert.showResult(); 
`);

grid.addMacro('tests/SpecialVarsTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class SpecialVarsTest {
  name() {
    return "SpecialVarsTest";
  }

  clear() {
    Right = 1;
    Bottom = 1;
    Col = 1;
    Row = 1;
    [1,1] = "";
  }

  test(assert) {
    assert.that(x).isEqualTo(Col);
    assert.that(y).isEqualTo(Row);

    this.clear();
    assert.that(Right).isEqualTo(1);
    assert.that(Bottom).isEqualTo(1);

    [6,7] = 123;
    assert.that(Right).isEqualTo(6);
    assert.that(Bottom).isEqualTo(7);

    [2,3] = 1;
    [3,3] = 2;
    [4,3] = 3;
    [2,4] = 4;
    [3,4] = 5;
    [4,4] = 6;
    [2,5] = 7;
    [3,5] = 8;
    [4,5] = 9;
    SelLeft = 2;
    SelTop = 3;
    SelRight = 4;
    SelBottom = 5;
    assert.that(SelLeft).isEqualTo(2);
    assert.that(SelTop).isEqualTo(3);
    assert.that(SelRight).isEqualTo(4);
    assert.that(SelBottom).isEqualTo(5);
    CopySum();
    Col = 1;
    Row = 2;
    Paste();
    assert.that([1,2]).isEqualTo(45);
    assert.that(Col).isEqualTo(1);
    assert.that(Row).isEqualTo(2);

    assert.that(true).isEqualTo(1 == 1);
    assert.that("true").isEqualTo("tru" + "e");
    assert.that(false).isEqualTo(1 == 2);
    assert.that("false").isEqualTo("fals" + "e");
    assert.that(null).isEqualTo(false);
    assert.that("null").isEqualTo("nul" + "l");

    this.clear();
  }
}

assert = new Assert();
new SpecialVarsTest().test(assert);
assert.showResult();
`);

grid.addMacro('tests/StringTest.cms', String.raw`
import { Assert } from "lib/Assert.cms";

class StringTest {
  name() {
    return "StringTest";
  }

  test(assert) {
    question = "To be, or not to be, that is the question.";

    assert.that(question.endsWith("question.")).isTrue();
    assert.that(question.endsWith("to be")).isFalse();
    assert.that(question.endsWith("to be", 19)).isTrue();

    assert.that(question.includes("To be")).isTrue();
    assert.that(question.includes("question")).isTrue();
    assert.that(question.includes("nonexistent")).isFalse();
    assert.that(question.includes("To be", 1)).isFalse();
    assert.that(question.includes("TO BE")).isFalse();
    assert.that(question.includes("")).isTrue();

    assert.that("Cassava Editor".includes("Cassava")).isTrue();
    assert.that("Cassava Editor".includes("Edit")).isTrue();
    assert.that("Cassava Editor".includes("cassava")).isFalse();

    assert.that("cat".length).isEqualTo(3);

    assert.that("cat"[-1]).isEqualTo("");
    assert.that("cat"[0]).isEqualTo("c");
    assert.that("cat"[1]).isEqualTo("a");
    assert.that("cat"[2]).isEqualTo("t");
    assert.that("cat"[3]).isEqualTo("");

    assert.that("Blue Whale".indexOf("Blue")).isEqualTo(0);
    assert.that("Blue Whale".indexOf("Blute")).isEqualTo(-1);
    assert.that("Blue Whale".indexOf("blue")).isEqualTo(-1);
    assert.that("Blue Whale".indexOf("Whale", 0)).isEqualTo(5);
    assert.that("Blue Whale".indexOf("Whale", 5)).isEqualTo(5);
    assert.that("Blue Whale".indexOf("Whale", 7)).isEqualTo(-1);
    assert.that("Blue Whale".indexOf("")).isEqualTo(0);
    assert.that("Blue Whale".indexOf("", -1)).isEqualTo(0);
    assert.that("Blue Whale".indexOf("", 9)).isEqualTo(9);
    assert.that("Blue Whale".indexOf("", 10)).isEqualTo(10);
    assert.that("Blue Whale".indexOf("", 11)).isEqualTo(10);

    assert.that("Cassava".lastIndexOf("a")).isEqualTo(6);
    assert.that("Cassava".lastIndexOf("a", 2)).isEqualTo(1);
    assert.that("Cassava".lastIndexOf("a", 0)).isEqualTo(-1);
    assert.that("Cassava".lastIndexOf("x")).isEqualTo(-1);
    assert.that("Cassava".lastIndexOf("C", -5)).isEqualTo(0);
    assert.that("Cassava".lastIndexOf("C", 0)).isEqualTo(0);
    assert.that("Cassava".lastIndexOf("")).isEqualTo(7);
    assert.that("Cassava".lastIndexOf("", 2)).isEqualTo(2);
    assert.that("abab".lastIndexOf("ab", 2)).isEqualTo(2);

    assert.that("abc".padEnd(10)).isEqualTo("abc       ");
    assert.that("abc".padEnd(10, "foo")).isEqualTo("abcfoofoof");
    assert.that("abc".padEnd(6, "123456")).isEqualTo("abc123");
    assert.that("abc".padEnd(1)).isEqualTo("abc");

    assert.that("abc".padStart(10)).isEqualTo("       abc");
    assert.that("abc".padStart(10, "foo")).isEqualTo("foofoofabc");
    assert.that("abc".padStart(6,"123465")).isEqualTo("123abc");
    assert.that("abc".padStart(8, "0")).isEqualTo("00000abc");
    assert.that("abc".padStart(1)).isEqualTo("abc");

    assert.that("abc".repeat(0)).isEqualTo("");
    assert.that("abc".repeat(3)).isEqualTo("abcabcabc");

    assert.that("AA AAA aa aaa".replace("aa", "($1)")).isEqualTo("AA AAA ($1) aaa");
    assert.that("AA AAA aa aaa".replace(/(aa)/, "($1)")).isEqualTo("AA AAA (aa) aaa");
    assert.that("AA AAA aa aaa".replace(/(aa)/g, "($1)")).isEqualTo("AA AAA (aa) (aa)a");
    assert.that("AA AAA aa aaa".replace(/(aa)/gi, "($1)")).isEqualTo("(AA) (AA)A (aa) (aa)a");
    assert.that("AA AAA aa aaa".replace(/(aa)/i, "($1)")).isEqualTo("(AA) AAA aa aaa");

    assert.that("AA AAA aa aaa".replaceAll("aa", "($1)")).isEqualTo("AA AAA ($1) ($1)a");
    assert.that("AA AAA aa aaa".replaceAll(/(aa)/g, "($1)")).isEqualTo("AA AAA (aa) (aa)a");
    assert.that("AA AAA aa aaa".replaceAll(/(aa)/gi, "($1)")).isEqualTo("(AA) (AA)A (aa) (aa)a");

    assert.that("hey Jude".search("[A-Z]")).isEqualTo(4);
    assert.that("hey Jude".search("[.]")).isEqualTo(-1);
    assert.that("hey Jude".search(/[A-Z]/)).isEqualTo(4);
    assert.that("hey Jude".search(/[A-Z]/i)).isEqualTo(0);

    // https://www.asukaze.net/soft/cassava/bbs/index.cgi?t=687
    [1,1] = "test1234567890@test1234567890.co.jp";
    assert.that([1,1].search("^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9_+-]*\.)+[a-zA-Z]{2,}$")).isEqualTo(0);
    [1,1] = "";

    assert.that(question.startsWith("To be")).isTrue();
    assert.that(question.startsWith("not to be")).isFalse();
    assert.that(question.startsWith("not to be", 10)).isTrue();

    assert.that("Cassava".substring(0, 1)).isEqualTo("C");
    assert.that("Cassava".substring(1, 0)).isEqualTo("C");
    assert.that("Cassava".substring(0, 6)).isEqualTo("Cassav");
    assert.that("Cassava".substring(4)).isEqualTo("ava");
    assert.that("Cassava".substring(4, 7)).isEqualTo("ava");
    assert.that("Cassava".substring(7, 4)).isEqualTo("ava");
    assert.that("Cassava".substring(0, 7)).isEqualTo("Cassava");
    assert.that("Cassava".substring(0, 10)).isEqualTo("Cassava");
    assert.that("Cassava".substring(-5, 2)).isEqualTo("Ca");
    assert.that("Cassava".substring(-5, -2)).isEqualTo("");

    assert.that("Cassava Editor".toLowerCase()).isEqualTo("cassava editor");
    assert.that("1.00".toString()).isEqualTo("1.00");
    assert.that("Cassava Editor".toUpperCase()).isEqualTo("CASSAVA EDITOR");

    assert.that("   foo   ".trim()).isEqualTo("foo");
    assert.that("   foo   ".trimEnd()).isEqualTo("   foo");
    assert.that("   foo   ".trimStart()).isEqualTo("foo   ");
  }
}

assert = new Assert();
new StringTest().test(assert);
assert.showResult();
`);

grid.addMacro('TestAll', `
import { TestSuite } from "lib/TestSuite.cms";
import { ArrayTest } from "tests/ArrayTest.cms";
import { FunctionsTest } from "tests/FunctionsTest.cms";
import { LambdaTest } from "tests/LambdaTest.cms";
import { MenuTest } from "tests/MenuTest.cms";
import { ObjectTest } from "tests/ObjectTest.cms";
import { OperatorsTest } from "tests/OperatorsTest.cms";
import { SpecialVarsTest } from "tests/SpecialVarsTest.cms";
import { StringTest } from "tests/StringTest.cms";

testSuite = new TestSuite();

testSuite.run(new ArrayTest());
testSuite.run(new FunctionsTest());
testSuite.run(new LambdaTest());
testSuite.run(new MenuTest());
testSuite.run(new ObjectTest());
testSuite.run(new OperatorsTest());
testSuite.run(new SpecialVarsTest());
testSuite.run(new StringTest());

testSuite.showResult();
`);
}
