import { ROWS, COLS, SHAPES } from '@/constants/tetris';

export type Piece = {
  type: number;
  shape: number[][];
  x: number;
  y: number;
};

export const TetrisEngine = {
  generateBag: (): number[] => {
    const bag = [1, 2, 3, 4, 5, 6, 7];

    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    return bag;
  },

  createPiece: (type: number): Piece => {
    return {
      type,
      shape: SHAPES[type].map((r) => [...r]),
      x: 3,
      y: 0,
    };
  },

  rotate: (matrix: number[][]): number[][] => {
    const R = matrix.length,
      C = matrix[0].length;
    const result = Array.from({ length: C }, () => Array(R).fill(0));
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) result[c][R - 1 - r] = matrix[r][c];
    return result;
  },

  checkCollision: (
    board: number[][],
    shape: number[][],
    x: number,
    y: number,
  ): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = x + c,
          ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  },

  attemptWallKick: (
    board: number[][],
    shape: number[][],
    x: number,
    y: number,
  ): number | null => {
    const kicks = [1, -1];

    for (const dx of kicks) {
      if (!TetrisEngine.checkCollision(board, shape, x + dx, y)) {
        return x + dx;
      }
    }

    return null;
  },
};
