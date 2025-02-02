/** @typedef {import("./cassava_min_20250202.d.ts").CassavaGridElement} CassavaGridElement */

/** @param {CassavaGridElement} grid */
function init(grid) {
  grid.addMacro('!format.cms', `
    if (x == 1 && y == 0) {
      return "運勢";
    }
    if (x == 2 && y == 0) {
      return "割合";
    }
  `);
  grid.setCell(1, 1, '大吉');
  grid.setCell(2, 1, '25');
  grid.setCell(1, 2, '中吉');
  grid.setCell(2, 2, '25');
  grid.setCell(1, 3, '小吉');
  grid.setCell(2, 3, '25');
  grid.setCell(1, 4, '凶');
  grid.setCell(2, 4, '25');
}

/**
 * @param {CassavaGridElement} grid
 * @param {HTMLElement} result
 */
function roll(grid, result) {
  let sum = 0;
  for (let y = 1; y <= grid.bottom(); y++) {
    sum += Number(grid.cell(2, y));
  }
  let r = Math.random() * sum;
  for (let y = 1; y <= grid.bottom(); y++) {
    r -= Number(grid.cell(2, y));
    if (r < 0) {
      result.innerText = grid.cell(1, y);
      return;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = /** @type {CassavaGridElement} */(document.getElementById('omikuji-grid'));
  const button = document.getElementById('omikuji-button');
  const result = document.getElementById('omikuji-result');

  init(grid);

  /** @type {number?} */
  let interval = null;
  button.addEventListener('click', () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
      button.innerText = 'もういちど';
    } else {
      interval = setInterval(() => roll(grid, result), 10);
      button.innerText = 'とめる';
    }
  });
})
