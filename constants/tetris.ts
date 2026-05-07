export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 20;

export const COLORS = [
  '',
  '#FF4136', // I
  '#FF851B', // J
  '#FFDC00', // L
  '#2ECC40', // O
  '#7FDBFF', // S
  '#0074D9', // Z
  '#B10DC9', // T
];

export const SHAPES = [
  [],
  [[1, 1, 1, 1]],           // I
  [[2, 0], [2, 0], [2, 2]], // J
  [[0, 3], [0, 3], [3, 3]], // L
  [[4, 4], [4, 4]],         // O
  [[0, 5, 5], [5, 5, 0]],   // S
  [[6, 6, 0], [0, 6, 6]],   // Z
  [[0, 7, 0], [7, 7, 7]],   // T
];