# Cassava Editor JS

Windows 用 CSV エディター「[Cassava Editor](https://www.asukaze.net/soft/cassava/)」を Web 上に移植するプロジェクトです。
10 MB 程度の CSV ファイルを開くことができ、
Cassava Editor のマクロがおおむねそのまま動作します。

「あすかぜ・ねっと」内の以下のページで使用しています。

- マクロジェネレーター https://www.asukaze.net/soft/cassava/macro/generator/
- Cassava Editor JS https://www.asukaze.net/soft/cassava/js/

## 使い方

次のような記述を HTML に追加すると Cassava Editor のメニューバー・グリッドが表示されます。

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width">
  <meta charset="UTF-8">
  <meta http-equiv="content-language" content="ja">
  <!-- CSS を読み込む -->
  <link rel="stylesheet" href="https://www.asukaze.net/soft/cassava/js/cassava_20230910.css">
</head>
<body>
<!-- メニューバーを表示 -->
<cassava-menu for="cassava-grid"></cassava-menu>
<!-- グリッドを表示 -->
<cassava-grid id="cassava-grid" style="max-height: 90vh;"></cassava-grid>
<!-- JavaScript を読み込む -->
<script src="https://www.asukaze.net/soft/cassava/js/cassava_min_20230910.js"></script>
</body>
</html>
```

### カスタムタグ

#### &lt;cassava-menu&gt;

メニューバーを表示します。
対応する `<cassava-grid>` タグの `id` を`for` 属性に指定してください。

#### &lt;cassava-grid&gt;

グリッドを表示します。
メニューバーと紐づけるために `id` 属性を設定してください。
`height` もしくは `max-height` スタイルを設定することで、
グリッド内にスクロールバーが表示されるようになります。

`<cassava-grid>` 要素には以下のインスタンスメソッドが追加されます。

|メソッド|説明|
|-|-|
|`addMacro(macroName: string, macroText: string)`|`macroName` で指定した名前で、`macroText` の内容のマクロを登録します。登録したマクロは、他のマクロの `import` 文で使用したり `runNamedMacro` メソッドで実行したりできます。|
|`getMacroNames(): IterableIterator<string>`|`addMacro` で登録したマクロ名の一覧を取得します。|
|`runNamedMacro(macroName: string)`|`addMacro` で登録したマクロを実行します。|
|`runMacro(macro: string)`|`macro` の内容のマクロを実行します。|

### グローバル関数

#### net.asukaze.cassava.init()

HTML 内のカスタムタグを初期化します。
この関数は `DOMContentLoaded` イベント発生時に自動的に実行されるため、
`DOMContentLoaded` イベントよりも前に Cassava Editor JS の JavaScript を読み込んだ場合には明示的に呼び出す必要はありません。
JavaScript を遅延読み込みした場合に呼び出してください。

#### net.asukaze.cassava.onReady(callback: (grid: HTMLElement) => void)

`<cassava-grid>` 要素の準備ができたときに呼び出されるコールバック関数を登録します。
コールバック関数には `<cassava-grid>` 要素が渡されます。
