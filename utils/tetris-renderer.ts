import { COLORS, ROWS, COLS, BLOCK_SIZE } from '@/constants/tetris';
import { Piece } from '@/utils/tetris-engine';

export class TetrisRenderer {
  static drawBlock(
    ctx: CanvasRenderingContext2D,
    type: number,
    x: number,
    y: number,
    size: number,
  ) {
    ctx.fillStyle = COLORS[type];
    ctx.fillRect(x * size, y * size, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x * size, y * size, size, 3);
    ctx.fillRect(x * size, y * size, 3, size);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(x * size + size - 3, y * size, 3, size);
    ctx.fillRect(x * size, y * size + size - 3, size, 3);
  }

  static renderBoard(
    canvas: HTMLCanvasElement | null,
    board: number[][],
    piece: Piece | null,
    collides: (s: number[][], px: number, py: number) => boolean,
  ) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear board
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        if (board[r][c]) {
          this.drawBlock(ctx, board[r][c], c, r, BLOCK_SIZE);
        }
      }
    }

    if (piece) {
      // Ghost Piece
      let gy = piece.y;
      while (!collides(piece.shape, piece.x, gy + 1)) gy++;
      ctx.globalAlpha = 0.2;
      piece.shape.forEach((row: number[], r: number) => {
        row.forEach((v: number, c: number) => {
          if (v) {
            ctx.fillStyle = COLORS[piece.type];
            ctx.fillRect(
              (piece.x + c) * BLOCK_SIZE,
              (gy + r) * BLOCK_SIZE,
              BLOCK_SIZE,
              BLOCK_SIZE,
            );
          }
        });
      });
      ctx.globalAlpha = 1;

      // Active Piece
      piece.shape.forEach((row: number[], r: number) => {
        row.forEach((v: number, c: number) => {
          if (v)
            this.drawBlock(
              ctx,
              piece.type,
              piece.x + c,
              piece.y + r,
              BLOCK_SIZE,
            );
        });
      });
    }
  }

  static renderHold(canvas: HTMLCanvasElement | null, piece: Piece | null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!piece) return;
    const sz = 16;
    const ox = (canvas.width / sz - piece.shape[0].length) / 2;
    const oy = (canvas.height / sz - piece.shape.length) / 2;
    piece.shape.forEach((row: number[], r: number) => {
      row.forEach((v: number, c: number) => {
        if (v) {
          ctx.fillStyle = COLORS[piece.type];
          ctx.fillRect((ox + c) * sz, (oy + r) * sz, sz - 1, sz - 1);
        }
      });
    });
  }

  static renderNext(canvas: HTMLCanvasElement | null, nextPieces: Piece[]) {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    nextPieces.slice(0, 3).forEach((p, i) => {
      const sz = 14;
      const ox = (canvas.width / sz - p.shape[0].length) / 2;
      const oy = 1 + i * 4;
      p.shape.forEach((row: number[], r: number) => {
        row.forEach((v: number, c: number) => {
          if (v) {
            ctx.fillStyle = COLORS[p.type];
            ctx.fillRect((ox + c) * sz, (oy + r) * sz, sz - 1, sz - 1);
          }
        });
      });
    });
  }
}
