import { useState, useRef, useCallback, useEffect } from 'react';
import { COLS, ROWS, SHAPES, LOCK_DELAY } from '@/constants/tetris';
import { TetrisEngine, Piece } from '@/utils/tetris-engine';

export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'GAMEOVER';

export function useTetris(onRender: () => void) {
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [countdown, setCountdown] = useState(3);

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardRef = useRef(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const pieceRef = useRef<Piece | null>(null);
  const nextPiecesRef = useRef<Piece[]>([]);
  const heldPieceRef = useRef<Piece | null>(null);
  const canHoldRef = useRef(true);
  const dropIntervalRef = useRef(1000);
  const baseDropIntervalRef = useRef(1000);
  const lastTimeRef = useRef(0);
  const dropCounterRef = useRef(0);
  const currentBagRef = useRef<number[]>([]);
  const keysHeldRef = useRef<Set<string>>(new Set());

  const getNextPieceFromBag = useCallback(() => {
    if (currentBagRef.current.length === 0) {
      currentBagRef.current = TetrisEngine.generateBag();
    }
    return TetrisEngine.createPiece(currentBagRef.current.pop()!);
  }, []);

  const collides = useCallback((s: number[][], px: number, py: number) => {
    return TetrisEngine.checkCollision(boardRef.current, s, px, py);
  }, []);

  const spawnPiece = useCallback(() => {
    const next = nextPiecesRef.current.shift()!;
    nextPiecesRef.current.push(getNextPieceFromBag());
    pieceRef.current = next;
    canHoldRef.current = true;
    if (collides(next.shape, next.x, next.y)) {
      setGameState('GAMEOVER');
    }
    onRender();
  }, [getNextPieceFromBag, collides, onRender]);

  const clearLines = useCallback(() => {
    let cleared = 0;
    const newBoard = [...boardRef.current];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r].every((v) => v !== 0)) {
        newBoard.splice(r, 1);
        newBoard.unshift(Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800];
      setScore((s) => s + pts[cleared] * level);
      setLines((l) => {
        const total = l + cleared;
        const newLevel = Math.floor(total / 10) + 1;
        setLevel(newLevel);
        const base = Math.max(50, 1000 - (newLevel - 1) * 90);
        baseDropIntervalRef.current = base;
        dropIntervalRef.current = base;
        return total;
      });
      boardRef.current = newBoard;
    }
  }, [level]);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const placePiece = useCallback(() => {
    clearLockTimer();
    const p = pieceRef.current;
    if (!p) return;
    p.shape.forEach((row: number[], r: number) => {
      row.forEach((v: number, c: number) => {
        if (v && p.y + r >= 0) boardRef.current[p.y + r][p.x + c] = p.type;
      });
    });
    clearLines();
    spawnPiece();
  }, [clearLines, spawnPiece, clearLockTimer]);

  const tryMove = useCallback(
    (dx: number, dy: number, rotate = false) => {
      if (gameState !== 'PLAYING') return false;
      const p = pieceRef.current;
      if (!p) return false;

      const nextShape = rotate ? TetrisEngine.rotate(p.shape) : p.shape;
      const nextX = p.x + dx;
      const nextY = p.y + dy;

      if (
        !TetrisEngine.checkCollision(boardRef.current, nextShape, nextX, nextY)
      ) {
        pieceRef.current = { ...p, shape: nextShape, x: nextX, y: nextY };
        if (
          TetrisEngine.checkCollision(
            boardRef.current,
            nextShape,
            nextX,
            nextY + 1,
          )
        ) {
          clearLockTimer();
          lockTimerRef.current = setTimeout(placePiece, LOCK_DELAY);
        } else {
          clearLockTimer();
        }
        onRender();
        return true;
      }

      if (rotate) {
        const kickedX = TetrisEngine.attemptWallKick(
          boardRef.current,
          nextShape,
          nextX,
          nextY,
        );
        if (kickedX !== null) {
          pieceRef.current = { ...p, shape: nextShape, x: kickedX, y: nextY };
          if (
            TetrisEngine.checkCollision(
              boardRef.current,
              nextShape,
              kickedX,
              nextY + 1,
            )
          ) {
            clearLockTimer();
            lockTimerRef.current = setTimeout(placePiece, LOCK_DELAY);
          }
          onRender();
          return true;
        }
      }

      if (dy > 0) {
        if (!lockTimerRef.current) {
          lockTimerRef.current = setTimeout(placePiece, LOCK_DELAY);
        }
      }
      return false;
    },
    [gameState, onRender, placePiece, clearLockTimer],
  );

  const handleHold = useCallback(() => {
    if (!canHoldRef.current || gameState !== 'PLAYING' || !pieceRef.current)
      return;
    canHoldRef.current = false;
    const currentType = pieceRef.current.type;
    const reset = (type: number) => ({
      type,
      shape: SHAPES[type].map((r) => [...r]),
      x: 3,
      y: 0,
    });

    if (!heldPieceRef.current) {
      heldPieceRef.current = reset(currentType);
      spawnPiece();
    } else {
      const tmp = heldPieceRef.current.type;
      heldPieceRef.current = reset(currentType);
      pieceRef.current = reset(tmp);
    }
    onRender();
  }, [gameState, spawnPiece, onRender]);

  const startGame = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentBagRef.current = [];
    nextPiecesRef.current = [
      getNextPieceFromBag(),
      getNextPieceFromBag(),
      getNextPieceFromBag(),
      getNextPieceFromBag(),
    ];
    heldPieceRef.current = null;
    setScore(0);
    setLines(0);
    setLevel(1);
    dropIntervalRef.current = 1000;
    baseDropIntervalRef.current = 1000;
    spawnPiece();
    setGameState('PLAYING');
  }, [getNextPieceFromBag, spawnPiece]);

  // Handle Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        tryMove(0, 0, true);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!pieceRef.current) return;
        while (
          !TetrisEngine.checkCollision(
            boardRef.current,
            pieceRef.current.shape,
            pieceRef.current.x,
            pieceRef.current.y + 1,
          )
        ) {
          pieceRef.current.y++;
        }
        clearLockTimer();
        placePiece();
        return;
      }
      if (e.code === 'KeyC' || e.code === 'ShiftLeft') {
        clearLockTimer();
        handleHold();
        return;
      }
      if (e.code === 'Escape') {
        clearLockTimer();
        setGameState('PAUSED');
        return;
      }
      if (
        e.code === 'Enter' &&
        gameState !== 'PLAYING' &&
        gameState !== 'PAUSED'
      ) {
        startGame();
        return;
      }
      keysHeldRef.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, tryMove, handleHold, placePiece, startGame, clearLockTimer]);

  // Handle Game Loop
  useEffect(() => {
    let raf: number;
    const moveRepeatInterval = 50;
    const moveRepeatDelay = 150;
    const keyTimers = new Map<string, { last: number; started: number }>();

    const loop = (time: number) => {
      if (gameState === 'PLAYING') {
        const dt = time - lastTimeRef.current;
        lastTimeRef.current = time;

        for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowDown']) {
          if (keysHeldRef.current.has(code)) {
            const timer = keyTimers.get(code);
            if (!timer) {
              if (code === 'ArrowLeft') tryMove(-1, 0);
              else if (code === 'ArrowRight') tryMove(1, 0);
              else if (code === 'ArrowDown') tryMove(0, 1);
              keyTimers.set(code, { last: time, started: time });
            } else {
              const elapsed = time - timer.started;
              if (
                elapsed >= moveRepeatDelay &&
                time - timer.last >= moveRepeatInterval
              ) {
                if (code === 'ArrowLeft') tryMove(-1, 0);
                else if (code === 'ArrowRight') tryMove(1, 0);
                else if (code === 'ArrowDown') tryMove(0, 1);
                keyTimers.set(code, { ...timer, last: time });
              }
            }
          } else {
            keyTimers.delete(code);
          }
        }

        dropCounterRef.current += dt;
        if (dropCounterRef.current >= dropIntervalRef.current) {
          tryMove(0, 1);
          dropCounterRef.current = 0;
        }
        onRender();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState, tryMove, onRender]);

  return {
    score,
    lines,
    level,
    gameState,
    countdown,
    setGameState,
    setCountdown,
    setLevel,
    startGame,
    boardRef,
    pieceRef,
    nextPiecesRef,
    heldPieceRef,
    dropIntervalRef,
    baseDropIntervalRef,
    collides,
  };
}
