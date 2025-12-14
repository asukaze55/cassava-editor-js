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
</head>
<body>
<!-- メニューバーを表示 -->
<cassava-menu for="cassava-grid"></cassava-menu>
<!-- グリッドを表示 -->
<cassava-grid id="cassava-grid" style="max-height: 90vh;"></cassava-grid>
<!-- JavaScript を読み込む -->
<script src="https://www.asukaze.net/soft/cassava/js/cassava_min_20251214.js"></script>
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
型の定義ファイルは https://www.asukaze.net/soft/cassava/js/cassava_min_20251214.d.ts で公開しています。

|メソッド|説明|
|-|-|
|`addMacro(macroName: string, macroText: string)`|`macroName` で指定した名前で、`macroText` の内容のマクロを登録します。登録したマクロは、他のマクロの `import` 文で使用したり `runNamedMacro` メソッドで実行したりできます。|
|`bottom(): number`|データが何行目まであるかを返します。|
|`cell(x: number, y: number): string`|y 行 x 列のセルの内容を返します。|
|`getMacro(macroName: string): string?`|指定したマクロ名のマクロの内容を返します。|
|`getMacroNames(): Array<string>`|`addMacro` で登録したマクロ名の一覧を取得します。|
|`runNamedMacro(macroName: string)`|`addMacro` で登録したマクロを実行します。|
|`runMacro(macro: string)`|`macro` の内容のマクロを実行します。|
|`right(): number`|データが何列目まであるかを返します。|
|`setCell(x: number, y: number, value: any)`|y 行 x 列のセルの内容を value に変更します。|

具体的な使用方法は[サンプルプロジェクト](samples/omikuji)も参照してください。
