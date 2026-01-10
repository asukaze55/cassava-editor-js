/**
 * @typedef {import("./cassava_min_20251228.d.ts").CassavaGridElement} CassavaGridElement
 * @typedef {{min: number, max: number, scale: number, label: (value: number) => string, map: (value: number|string) => number}} Axis
 */

/** @implements {Axis} */
class RangeAxis {
  /** @type {boolean} */
  #flip;
  /** @type {number} */
  #margin;
  /** @type {number} */
  #size;

  /**
   * @param {number} min
   * @param {number} max
   * @param {number} size
   * @param {number} margin
   * @param {boolean} flip;
   */
  constructor(min, max, size, margin, flip) {
    this.#flip = flip;
    this.#margin = margin;
    this.#size = size;

    let diff = (max > 0 && min < 0) ? Math.max(max, -min) : max - min;
    if (diff < 0.001) {
      this.min = Math.floor(min);
      this.max = Math.floor(min) + 1;
      this.scale = 1;
      return;
    }
    let scale = 1;
    while (diff > 10) {
      min /= 10;
      max /= 10;
      diff /= 10;
      scale *= 10;
    }
    while (diff < 1) {
      min *= 10;
      max *= 10;
      diff *= 10;
      scale /= 10;
    }
    this.min = Math.floor(min) * scale;
    this.max = Math.ceil(max) * scale;
    this.scale = scale;
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  label(value) {
    return (Math.round(value * 10000) / 10000).toString();
  }

  /**
   * @param {number|string} value
   * @returns {number}
   */
  map(value) {
    return this.#margin + this.#size *
        (this.#flip ? this.max - Number(value) : Number(value) - this.min) /
        (this.max - this.min);
  }
}

class ListAxis {
  /** @type {Array<string>} */
  #labels;
  /** @type {number} */
  #margin;
  /** @type {number} */
  #size;

  /**
   * @param {number} min
   * @param {Array<string>} labels
   * @param {number} size
   * @param {number} margin
   */
  constructor(min, labels, size, margin) {
    this.min = min;
    this.max = (labels.length > 0) ? min + labels.length - 1 : min + 1;
    this.scale = 1;
    this.#labels = labels;
    this.#size = size;
    this.#margin = margin;
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  label(value) {
    return this.#labels[value - this.min];
  }

  /**
   * @param {number|string} value
   * @returns {number}
   */
  map(value) {
    return this.#margin +
        this.#size * (Number(value) - this.min) / (this.max - this.min);
  }
}

class CanvasDrawer {
  /** @type {CanvasRenderingContext2D} */
  #context;
  /** @type {Axis} */
  #axisX;
  /** @type {Axis} */
  #axisY;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Axis} axisX
   * @param {Axis} axisY
   */
  constructor(canvas, axisX, axisY) {
    const context = canvas.getContext('2d');
    if (context == null) {
      throw 'Failed to get canvas context.'
    }
    this.#context = context;
    this.#axisX = axisX;
    this.#axisY = axisY;
  }

  /**
   * @param {number|string} x
   * @param {number|string} y
   * @param {number|string} r
   */
  circle(x, y, r) {
    this.#context.beginPath();
    this.#context.arc(
        this.#axisX.map(x), this.#axisY.map(y), Number(r), 0, 2 * Math.PI);
    this.#context.fill();
  }

  clear() {
    this.setColor('#fff');
    this.#context.fillRect(0, 0, 400, 300);
    this.setColor('#000');
  }

  drawAxis() {
    const minX = this.#axisX.min;
    const maxX = this.#axisX.max;
    const minY = this.#axisY.min;
    const maxY = this.#axisY.max;
    this.#context.font = '10px sans-serif';
    this.#context.textAlign = 'center';
    this.#context.textBaseline = 'top';
    for (let x = minX; x <= maxX; x += this.#axisX.scale) {
      this.#context.fillText(this.#axisX.label(x), this.#axisX.map(x), 255);
    }
    this.line(minX, 0, maxX, 0);

    this.#context.textAlign = 'right';
    this.#context.textBaseline = 'alphabetic';
    for (let y = minY; y <= maxY; y += this.#axisY.scale) {
      this.#context.fillText(this.#axisY.label(y), 45, this.#axisY.map(y));
    }
    this.line(minX, minY, minX, maxY);
  }

  /** @param {string} title */
  drawTitle(title) {
    this.#context.font = '12px sans-serif';
    this.#context.textAlign = 'center';
    this.#context.textBaseline = 'top';
    this.#context.fillText(title, 200, 10);
  }

  /**
   * @param {number|string} x1
   * @param {number|string} y1
   * @param {number|string} x2
   * @param {number|string} y2
   */
  line(x1, y1, x2, y2) {
    this.#context.beginPath();
    this.#context.moveTo(this.#axisX.map(x1), this.#axisY.map(y1));
    this.#context.lineTo(this.#axisX.map(x2), this.#axisY.map(y2));
    this.#context.stroke();
  }

  /**
   * @param {number|string} x1
   * @param {number|string} y1
   * @param {number|string} x2
   * @param {number|string} y2
   */
  rect(x1, y1, x2, y2) {
    const mx1 = this.#axisX.map(x1);
    const my1 = this.#axisY.map(y1);
    this.#context.fillRect(
        mx1, my1, this.#axisX.map(x2) - mx1, this.#axisY.map(y2) - my1);
  }

  /** @param {string} color */
  setColor(color) {
    this.#context.fillStyle = color;
    this.#context.strokeStyle = color;
  }

  /**
   * @param {string} value
   * @param {number|string} x
   * @param {number|string} y
   * @param {number} deltaX
   * @param {number} deltaY
   * @param {CanvasTextAlign} textAlign
   * @param {CanvasTextBaseline} textBaseline
   */
  text(value, x, y, deltaX, deltaY, textAlign, textBaseline) {
    const mx = this.#axisX.map(x) + deltaX;
    let my = this.#axisY.map(y) + deltaY;
    this.#context.font = '10px sans-serif';
    this.#context.textAlign = textAlign;
    this.#context.textBaseline = textBaseline;
    for (const line of value.split('\n')) {
      this.#context.fillText(line, mx, my);
      const metrics = this.#context.measureText(line);
      my += metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2;
    }
  }
}

/**
 * @param {number} x
 * @returns {string}
 */
function color(x) {
  return '#' + (x % 2 ? 'f' : '0') + ((x >> 2) % 2 ? '9' : '0') +
      ((x >> 1) % 2 ? 'f' : '0');
}

function drawLineChart() {
  const grid =
      /** @type {CassavaGridElement} */(document.getElementById('grid'));
  let minX = NaN;
  let maxX = NaN;
  let minY = NaN;
  let maxY = NaN;
  for (let y = 2; y <= grid.bottom(); y++) {
    const xValue = Number(grid.cell(1, y));
    if (isNaN(minX) || xValue < minX) {
      minX = xValue;
    }
    if (isNaN(maxX) || xValue > maxX) {
      maxX = xValue;
    }
    for (let x = 2; x <= grid.right(); x++) {
      const yValue = Number(grid.cell(x, y));
      if (isNaN(minY) || yValue < minY) {
        minY = yValue;
      }
      if (isNaN(maxY) || yValue > maxY) {
        maxY = yValue;
      }
    }
  }

  const canvas =
      /** @type {HTMLCanvasElement} */(document.getElementById('canvas'));
  const drawer = new CanvasDrawer(canvas,
      new RangeAxis(minX, maxX, 300, 50, /* flip= */ false),
      new RangeAxis((minY > 0) ? 0 : minY, (maxY < 0) ? 0 : maxY, 200, 50,
          /* flip= */ true));
  drawer.clear();
  drawer.drawTitle(
      /** @type {HTMLInputElement} */(document.getElementById('title')).value);
  drawer.drawAxis();
  for (let x = 2; x <= grid.right(); x++) {
    drawer.setColor(color(x));
    for (let y = 2; y <= grid.bottom(); y++) {
      drawer.line(grid.cell(1, y - 1), grid.cell(x, y - 1), grid.cell(1, y),
          grid.cell(x, y));
    }
    for (let y = 1; y <= grid.bottom(); y++) {
      drawer.circle(grid.cell(1, y), grid.cell(x, y), 3);
    }
    if (grid.right() > 2) {
      drawer.text(grid.cell(x, 1), grid.cell(1, grid.bottom()),
          grid.cell(x, grid.bottom()), 5, 0, 'left', 'alphabetic');
    }
  }
}

/** @param {boolean} summed */
function drawStackChart(summed) {
  const grid =
      /** @type {CassavaGridElement} */(document.getElementById('grid'));
  const xLabels = [''];
  let minY = 0;
  let maxY = 0;
  for (let y = 2; y <= grid.bottom(); y++) {
    xLabels.push(grid.cell(1, y));
    let plusValue = 0;
    let minusValue = 0;
    for (let x = 2; x <= grid.right(); x++) {
      const value = Number(grid.cell(x, y));
      if (value > 0) {
        plusValue += value;
      } else if (value < 0) {
        minusValue += value;
      }
    }
    if (minusValue < minY) {
        minY = minusValue;
    }
    if (plusValue > maxY) {
        maxY = plusValue;
    }
  }
  xLabels.push('');

  const canvas =
      /** @type {HTMLCanvasElement} */(document.getElementById('canvas'));
  const drawer = new CanvasDrawer(canvas, new ListAxis(1, xLabels, 300, 50),
      new RangeAxis(minY, maxY, 200, 50, /* flip= */ true));
  drawer.clear();
  drawer.drawTitle(
      /** @type {HTMLInputElement} */(document.getElementById('title')).value);
  drawer.drawAxis();
  let previousValue = 0;
  const labelRendered = new Set();
  for (let y = grid.bottom(); y >= 2; y--) {
    let plusValue = 0;
    let minusValue = 0;
    for (let x = 2; x <= grid.right(); x++) {
      drawer.setColor(color(x));
      const value = Number(grid.cell(x, y));
      if (value > 0) {
        drawer.rect(y - 0.25, plusValue, y + 0.25, plusValue + value);
        plusValue += value;
      } else if (value < 0) {
        drawer.rect(y - 0.25, minusValue, y + 0.25, minusValue + value);
        minusValue += value;
      }
      if (grid.right() > 2 && !labelRendered.has(x)) {
        if (value > 0) {
          drawer.text(grid.cell(x, 1), grid.bottom() + 1,
              plusValue - value / 2, 5, 0, 'left', 'alphabetic');
          labelRendered.add(x);
        } else if (value < 0) {
          drawer.text(grid.cell(x, 1), grid.bottom() + 1,
              minusValue - value / 2, 5, 0, 'left', 'alphabetic');
          labelRendered.add(x);
        }
      }
    }
    if (summed) {
      drawer.setColor('#000');
      const value = plusValue + minusValue;
      if (y < grid.bottom()) {
        drawer.line(y + 1, previousValue, y, value);
      }
      drawer.circle(y, value, 3);
      previousValue = value;
    }
  }
}

function draw() {
  if (/** @type {HTMLInputElement} */(
      document.getElementById('stack')).checked) {
    drawStackChart(/* summed= */ false);
  } else if (/** @type {HTMLInputElement} */(
      document.getElementById('summed-stack')).checked) {
    drawStackChart(/* summed= */ true);
  } else {
    drawLineChart();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const grid =
      /** @type {CassavaGridElement} */(document.getElementById('grid'));
  grid.setCell(1, 1, 'Year');
  grid.setCell(2, 1, 'Value');
  grid.setCell(1, 2, '2021');
  grid.setCell(2, 2, '2.34');
  grid.setCell(1, 3, '2022');
  grid.setCell(2, 3, '2.45');
  grid.setCell(1, 4, '2023');
  grid.setCell(2, 4, '2.54');
  grid.setCell(1, 5, '2024');
  grid.setCell(2, 5, '2.62');
  grid.setCell(1, 6, '2025');
  grid.setCell(2, 6, '2.72');
  grid.addEventListener('input', () => draw());
  document.getElementById('draw-button')
      ?.addEventListener('click', () => draw());
  draw();
});
