(() => {
const { createButton, createDialog, createDiv, createElement, createLabel, createTitleBar } = net.asukaze.import('./cassava_dom.js');
const { Options } = net.asukaze.import('./cassava_options.js');
const { DataFormat, QuoteType } = net.asukaze.import('./cassava_data_format.js');

/** @typedef {{dataFormat: DataFormat}} Grid */

/**
 * @param {string} value
 * @returns {string}
 */
function escapeSeparator(value) {
  return value.replaceAll('\\', '\\\\')
              .replaceAll('\n', '\\n')
              .replaceAll('\t', '\\t')
              .replaceAll(' ', '\\_');
}

/**
 * @param {string} value
 * @returns {string}
 */
function unescapeSeparator(value) {
  return value.replaceAll(/\\./g, match => {
    if (match == '\\\\') {
      return '\\';
    } else if (match == '\\n') {
      return '\n';
    } else if (match == '\\t') {
      return '\t';
    } else if (match == '\\_') {
      return ' ';
    }
    return match;
  });
}

class OptionDialog {
  /** @type {Grid} */
  #grid;
  /** @type {Options} */
  #options;
  /** @type {HTMLDivElement} */
  #page;
  /** @type {HTMLSelectElement} */
  #select;
  /** @type {string} */
  #selectedPage;

  /**
   * @param {Grid} grid
   * @param {Options} options
   */
  constructor(grid, options) {
    const smallScreen = document.documentElement.clientWidth <= 480;
    this.#grid = grid;
    this.#options = options;
    this.#page = createDiv();
    this.#select = createElement('select', {
      size: smallScreen ? 1 : 10,
      style: 'height: 100%; overflow: auto; width: 100%;',
      oninput: () => {
        this.#selectedPage = this.#select.value;
        this.#renderPage();
      }
    });
    this.#selectedPage = 'df-0';
    this.element = createDialog([
      createTitleBar('Cassava オプション', () => this.element.close()),
      createElement('div', smallScreen ? {} : {style: 'display: flex'}, [
        createElement('div', {style: 'margin-right: 10px'}, [this.#select]),
        createElement('div', {style: 'flex: 1'}, [this.#page])
      ])
    ], {style: 'width: min(100%, 500px);'});
    this.element.addEventListener(
        'close', () => document.body.removeChild(this.element));
  }

  show() {
    this.#render();
    document.body.append(this.element);
    this.element.showModal();
  }

  #render() {
    this.#renderSelect();
    this.#renderPage();
  }

  #renderSelect() {
    this.#select.innerHTML = '';
    const optgroup = createElement('optgroup', {label: 'データ形式'});
    const dataFormats = this.#options.dataFormats;
    for (let i = 0; i <= dataFormats.length; i++) {
      const label = (i == dataFormats.length) ? '(新規作成)' : dataFormats[i].name +
          (this.#grid.dataFormat == dataFormats[i] ? ' (アクティブ)' : '');
      optgroup.append(createElement('option', {
        selected: this.#selectedPage == 'df-' + i,
        value: 'df-' + i
      }, [label]));
    }
    this.#select.append(
        optgroup,
        createElement('option', {
          selected: this.#selectedPage == 'reset',
          value: 'reset'
        }, ['初期化']));
  }

  #renderPage() {
    if (this.#selectedPage.startsWith('df-')) {
      this.#renderDataFormatPage(Number(this.#selectedPage.substring(3)));
    } else if (this.#selectedPage == 'reset') {
      this.#page.innerHTML = '';
      this.#page.append(createButton('初期設定に戻す', () => {
        if (confirm('すべての設定を削除しますか？')) {
          this.#options.reset();
          this.#renderSelect();
        }
      }));
    }
  }

  /** @param {number} index */
  #renderDataFormatPage(index) {
    const dataFormat = this.#options.dataFormats[index] ?? new DataFormat();
    const nameInput = createElement('input', {
      value: dataFormat.name,
      oninput: () => {
        dataFormat.name = nameInput.value;
        this.#options.dataFormats[index] = dataFormat;
        this.#options.save();
        this.#renderSelect();
      }
    });

    const defaultSeparator = createElement('input', {
      style: 'width: 4em;',
      value: escapeSeparator(dataFormat.separators.substring(0, 1))
    });
    const otherSeparators = createElement('input', {
      style: 'width: 4em;',
      value: escapeSeparator(dataFormat.separators.substring(1))
    });
    const onSeparatorsInput = () => {
      dataFormat.separators = unescapeSeparator(defaultSeparator.value) +
          unescapeSeparator(otherSeparators.value);
      this.#options.save();
    };
    defaultSeparator.addEventListener('input', onSeparatorsInput);
    otherSeparators.addEventListener('input', onSeparatorsInput);

    /** @type {(value: QuoteType) => HTMLInputElement} */
    const quoteInput = value => createElement('input', {
      checked: value == dataFormat.quoteType,
      name: 'quote',
      type: 'radio',
      oninput: () => {
        dataFormat.quoteType = value;
        this.#options.save();
      }
    })

    this.#page.innerHTML = '';
    this.#page.append(
        createElement('div', {style: 'display: flex'}, [
          createElement('div', {style: 'flex: 1'}, ['データ形式名：', nameInput]),
          createButton('削除', () => {
            this.#options.dataFormats.splice(index, 1);
            this.#options.save();
            this.#render();
          })
        ]),
        createElement('fieldset', {}, [
          createElement('legend', {}, ['区切り文字']),
          createDiv('標準区切り文字：', defaultSeparator),
          createDiv('ロード時区切り文字リスト：', otherSeparators)
        ]),
        createElement('fieldset', {}, [
          createElement('legend', {}, ['クオート']),
          createDiv(createLabel(
              quoteInput(QuoteType.NONE), 'すべてのセルを "" で囲まない')),
          createDiv(createLabel(
              quoteInput(QuoteType.ONLY_IF_NEEDED), '必要なセルのみ "" で囲む')),
          createDiv(createLabel(
              quoteInput(QuoteType.ONLY_IF_STRING), '文字列は "" で囲む')),
          createDiv(createLabel(
              quoteInput(QuoteType.ALWAYS), 'すべてのセルを "" で囲む'))
        ])
    );
  }
}

net.asukaze.export({ OptionDialog });
})();
