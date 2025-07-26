(() => {
const { DataFormat } = net.asukaze.import('./cassava_data_format.js');

const itemName = 'Cassava.ini.json';

/** @type {Object<string, string>} */
const defaultValues = {
  'DataType:0/Exts': 'csv',
  'DataType:0/Name': 'CSV',
  'DataType:0/Quote': '1',
  'DataType:0/SepChars': ',',
  'DataType:1/Exts': 'tsv',
  'DataType:1/Name': 'TSV',
  'DataType:1/Quote': '0',
  'DataType:1/SepChars': '\t',
  'DataType/Count': '2',
  'Font/BgColor': '#ffffff',
  'Font/CurrentColBgColor': '#ffffff',
  'Font/CurrentRowBgColor': '#ffffff',
  'Font/DummyBgColor': '#fffbf0',
  'Font/EvenRowBgColor': '#ffffff',
  'Font/FgColor': '#000000',
  'Font/FixedColor': '#eeeeee',
  'Font/FixFgColor': '#000000',
};

class Options {
  /** @type {Object<string, string>} */
  #values = {};

  constructor() {
    this.load();
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  get(key) {
    return this.#values[key] ?? defaultValues[key] ?? '';
  }

  load() {
    this.#values = this.#loadFromLocalStorage();

    /** @type {Array<DataFormat>} */
    this.dataFormats = [];
    const count = Number(this.get('DataType/Count'));
    for (let i = 0; i < count; i++) {
      const section = 'DataType:' + i;
      this.dataFormats.push(new DataFormat(
          this.get(section + '/Name'),
          this.get(section + '/SepChars'),
          Number(this.get(section + '/Quote')),
          this.get(section + '/Exts').split(';')));
    }
  }

  /** @returns {Object<string, string>} */
  #loadFromLocalStorage() {
    try {
      const json = localStorage.getItem(itemName);
      if (json) {
        return JSON.parse(json);
      }
    } catch {}
    return {};
  }

  reset() {
    try {
      localStorage.removeItem(itemName);
    } catch {}
    this.load();
  }

  save() {
    for (const key in this.#values) {
      if (key.startsWith('DataType')) {
        delete this.#values[key];
      }
    }
    const dataFormats = this.dataFormats;
    this.#values['DataType/Count'] = dataFormats.length.toString();
    for (let i = 0; i < dataFormats.length; i++) {
      const section = 'DataType:' + i;
      this.#values[section + '/Exts'] = dataFormats[i].extensions.join(';');
      this.#values[section + '/Name'] = dataFormats[i].name;
      this.#values[section + '/Quote'] = dataFormats[i].quoteType.toString();
      this.#values[section + '/SepChars'] = dataFormats[i].separators;
    }
    this.#saveToLocalStorage(this.#values);
  }

  /** @param {Object<string, string>} values */
  #saveToLocalStorage(values) {
    try {
      localStorage.setItem(itemName, JSON.stringify(values));
    } catch {}
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  set(key, value) {
    this.#values[key] = value;
    this.save();
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  update(key, value) {
    const values = this.#loadFromLocalStorage();
    values[key] = value;
    this.#saveToLocalStorage(values);
  }
}

net.asukaze.export({ Options });
})();
