'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  COLS,
  ROWS,
  BLOCK_SIZE,
  COLORS,
  SHAPES,
  LOCK_DELAY,
} from '@/constants/tetris';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';
import { TetrisEngine, Piece } from '@/utils/tetris-engine';
import { useAuth } from '@/hooks/useAuth';

const TetrisGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const videoElRef = useRef<HTMLVideoElement>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<
    'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'GAMEOVER'
  >('IDLE');
  const [countdown, setCountdown] = useState(3);
  const [emotionEnabled, setEmotionEnabled] = useState(false);
  const { emotionState, emotionScores, ready, error } = useEmotionDetection(
    emotionEnabled,
    videoElRef,
  );

  const { isLoggedIn, profile, saveScore } = useAuth();
  const [scoreSaved, setScoreSaved] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Ref-based state to prevent closure issues in the game loop
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

  // --- Logic Helpers ---
  const getNextPieceFromBag = useCallback(() => {
    // If the bag is empty, refill and shuffle it
    if (currentBagRef.current.length === 0) {
      currentBagRef.current = TetrisEngine.generateBag();
    }

    // Pop the next piece type from the bag
    const nextType = currentBagRef.current.pop()!;
    return TetrisEngine.createPiece(nextType);
  }, []);

  const collides = (s: number[][], px: number, py: number) => {
    return TetrisEngine.checkCollision(boardRef.current, s, px, py);
  };

  // --- Drawing ---
  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    type: number,
    x: number,
    y: number,
    size: number,
  ) => {
    ctx.fillStyle = COLORS[type];
    ctx.fillRect(x * size, y * size, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x * size, y * size, size, 3);
    ctx.fillRect(x * size, y * size, 3, size);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(x * size + size - 3, y * size, 3, size);
    ctx.fillRect(x * size, y * size + size - 3, size, 3);
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
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
        if (boardRef.current[r][c]) {
          drawBlock(ctx, boardRef.current[r][c], c, r, BLOCK_SIZE);
        }
      }
    }

    const piece = pieceRef.current;
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
            drawBlock(ctx, piece.type, piece.x + c, piece.y + r, BLOCK_SIZE);
        });
      });
    }
  }, []);

  const drawSidebarCanvases = useCallback(() => {
    const drawMini = (canvas: HTMLCanvasElement | null, p: Piece | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!p) return;
      const sz = 16;
      const ox = (canvas.width / sz - p.shape[0].length) / 2;
      const oy = (canvas.height / sz - p.shape.length) / 2;
      p.shape.forEach((row: number[], r: number) => {
        row.forEach((v: number, c: number) => {
          if (v) {
            ctx.fillStyle = COLORS[p.type];
            ctx.fillRect((ox + c) * sz, (oy + r) * sz, sz - 1, sz - 1);
          }
        });
      });
    };

    drawMini(holdCanvasRef.current, heldPieceRef.current);

    // Draw Next (Showing top 3)
    const nextCtx = nextCanvasRef.current?.getContext('2d');
    if (nextCtx && nextCanvasRef.current) {
      nextCtx.fillStyle = '#1a1a1a';
      nextCtx.fillRect(
        0,
        0,
        nextCanvasRef.current.width,
        nextCanvasRef.current.height,
      );
      nextPiecesRef.current.slice(0, 3).forEach((p, i) => {
        const sz = 14;
        const ox = (nextCanvasRef.current!.width / sz - p.shape[0].length) / 2;
        const oy = 1 + i * 4;
        p.shape.forEach((row: number[], r: number) => {
          row.forEach((v: number, c: number) => {
            if (v) {
              nextCtx.fillStyle = COLORS[p.type];
              nextCtx.fillRect((ox + c) * sz, (oy + r) * sz, sz - 1, sz - 1);
            }
          });
        });
      });
    }
  }, []);

  // --- Game Actions ---
  const spawnPiece = useCallback(() => {
    const next = nextPiecesRef.current.shift()!;
    nextPiecesRef.current.push(getNextPieceFromBag());
    pieceRef.current = next;
    canHoldRef.current = true;
    if (collides(next.shape, next.x, next.y)) {
      setGameState('GAMEOVER');
    }
    drawSidebarCanvases();
  }, [getNextPieceFromBag, drawSidebarCanvases]);

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

        const isTouchingFloor = TetrisEngine.checkCollision(
          boardRef.current,
          nextShape,
          nextX,
          nextY + 1,
        );

        if (isTouchingFloor) {
          clearLockTimer();
          lockTimerRef.current = setTimeout(placePiece, LOCK_DELAY);
        } else {
          clearLockTimer();
        }

        render();
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

          render();
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
    [gameState, render, placePiece, clearLockTimer],
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
    drawSidebarCanvases();
    render();
  }, [gameState, spawnPiece, render, drawSidebarCanvases]);

  const startGame = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    // 1. Initialize an empty bag
    currentBagRef.current = [];

    // 2. Populate the "Next" queue
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
    setScoreSaved('idle');
    dropIntervalRef.current = 1000;
    baseDropIntervalRef.current = 1000;
    spawnPiece();
    setGameState('PLAYING');
  }, [getNextPieceFromBag, spawnPiece]);

  // --- Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // One-shot actions
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

      // Held keys
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

  // --- Score Saving ---
  useEffect(() => {
    if (gameState !== 'GAMEOVER' || !isLoggedIn) return;

    setScoreSaved('saving');
    saveScore(score, lines, level).then((err) => {
      setScoreSaved(err ? 'error' : 'saved');
    });
  }, [gameState]); // intentionally only re-run on gameState change

  // --- Pause/Resume Countdown ---
  useEffect(() => {
    if (gameState !== 'RESUMING') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('PLAYING');
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (!emotionEnabled || gameState !== 'PLAYING') return;
    setLevel((currentLevel) => {
      let newLevel = currentLevel;
      if (emotionState === 'stressed') {
        newLevel = Math.max(1, currentLevel - 1);
      } else if (emotionState === 'disengaged') {
        newLevel = Math.min(currentLevel + 1, 20);
      }
      const base = Math.max(50, 700 - (newLevel - 1) * 90);
      dropIntervalRef.current = base;
      baseDropIntervalRef.current = base;
      return newLevel;
    });
  }, [emotionState, emotionEnabled, gameState]);

  // --- Game Loop ---
  useEffect(() => {
    let raf: number;
    const moveRepeatInterval = 50; // ms between moves while held
    const moveRepeatDelay = 150; // ms before repeat starts (DAS)
    const keyTimers = new Map<string, { last: number; started: number }>();

    const loop = (time: number) => {
      if (gameState === 'PLAYING') {
        const dt = time - lastTimeRef.current;
        lastTimeRef.current = time;

        // Handle held movement keys with DAS (Delayed Auto Shift)
        for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowDown']) {
          if (keysHeldRef.current.has(code)) {
            const timer = keyTimers.get(code);
            if (!timer) {
              // First frame key is held — move immediately
              if (code === 'ArrowLeft') tryMove(-1, 0);
              else if (code === 'ArrowRight') tryMove(1, 0);
              else if (code === 'ArrowDown') {
                tryMove(0, 1);
              }
              keyTimers.set(code, { last: time, started: time });
            } else {
              const elapsed = time - timer.started;
              if (
                elapsed >= moveRepeatDelay &&
                time - timer.last >= moveRepeatInterval
              ) {
                if (code === 'ArrowLeft') tryMove(-1, 0);
                else if (code === 'ArrowRight') tryMove(1, 0);
                else if (code === 'ArrowDown') {
                  tryMove(0, 1);
                }
                keyTimers.set(code, { ...timer, last: time });
              }
            }
          } else {
            keyTimers.delete(code); // Key released — reset timer
          }
        }

        dropCounterRef.current += dt;
        if (dropCounterRef.current >= dropIntervalRef.current) {
          tryMove(0, 1);
          dropCounterRef.current = 0;
        }
        render();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState, tryMove, render]);

  return (
    <div className="flex items-start gap-3 select-none">
      {/* Left Panel */}
      <div className="flex flex-col gap-3 w-32">
        <div className="pixel-panel p-2">
          <div className="text-[7px] text-[#4a7a50] mb-2 uppercase tracking-widest glow-text">
            Hold
          </div>
          <canvas
            ref={holdCanvasRef}
            width={80}
            height={80}
            className="w-full bg-black/20"
          />
        </div>
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="text-[10px] text-gray-500 mb-1 uppercase">Score</div>
          <div
            className="vt text-2xl text-[#00ff41]"
            style={{ textShadow: '0 0 8px #00ff41' }}
          >
            {score}
          </div>
        </div>
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="text-[10px] text-gray-500 mb-1 uppercase">
            Speed Level
          </div>
          <div className="text-sm text-white">{level}</div>
        </div>
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="text-[10px] text-gray-500 mb-1 uppercase">Lines</div>
          <div className="text-sm text-white">{lines}</div>
        </div>
        <div className="text-[6px] text-[#1a4d1e] space-y-2 uppercase leading-relaxed tracking-wider">
          <div>
            ← → <span className="text-[#4a7a50]">MOVE</span>
          </div>
          <div>
            ↑ <span className="text-[#4a7a50]">ROTATE</span>
          </div>
          <div>
            ↓ <span className="text-[#4a7a50]">SOFT DROP</span>
          </div>
          <div>
            SPC <span className="text-[#4a7a50]">HARD DROP</span>
          </div>
          <div>
            C <span className="text-[#4a7a50]">HOLD</span>
          </div>
          <div>
            ESC <span className="text-[#4a7a50]">PAUSE</span>
          </div>
        </div>
      </div>

      {/* Center Game Board */}
      <div className="relative glow-border-bright border-2">
        <canvas ref={canvasRef} width={200} height={400} />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-[#020b04]/90 flex flex-col items-center justify-center text-center p-4">
            {gameState === 'IDLE' && (
              <>
                <div className="glow-text glow-text-animate text-xl tracking-widest mb-2">
                  MOODTRIS
                </div>
                <div className="text-[7px] text-[#4a7a50] mb-8 tracking-widest">
                  EMOTION-AWARE TETRIS
                </div>
                <button
                  onClick={startGame}
                  className="text-[9px] border-2 border-[#00ff41] text-[#00ff41] px-6 py-3 hover:bg-[#00ff41] hover:text-[#020b04] transition tracking-widest"
                  style={{ boxShadow: '0 0 12px rgba(0,255,65,0.4)' }}
                >
                  PRESS START
                </button>
                <div className="text-[6px] text-[#1a4d1e] mt-4 blink">
                  OR PRESS ENTER
                </div>
              </>
            )}
            {gameState === 'PAUSED' && (
              <>
                <div className="glow-text text-lg mb-2 tracking-widest">
                  PAUSED
                </div>
                <div className="text-[6px] text-[#4a7a50] mb-8 tracking-widest blink">
                  GAME SUSPENDED
                </div>
                <div className="flex flex-col gap-4 w-3/4 items-center">
                  <button
                    onClick={() => {
                      setCountdown(3);
                      setGameState('RESUMING');
                    }}
                    className="w-full text-[9px] border-2 border-[#00ff41] text-[#00ff41] px-6 py-3 hover:bg-[#00ff41] hover:text-[#020b04] transition tracking-widest"
                    style={{ boxShadow: '0 0 12px rgba(0,255,65,0.4)' }}
                  >
                    RESUME
                  </button>
                  <button
                    onClick={startGame}
                    className="w-full text-[9px] border-2 border-[#ff3131] text-[#ff3131] px-6 py-3 hover:bg-[#ff3131] hover:text-white transition tracking-widest"
                    style={{ boxShadow: '0 0 12px rgba(255,49,49,0.4)' }}
                  >
                    RESTART
                  </button>
                </div>
              </>
            )}
            {gameState === 'RESUMING' && (
              <>
                <div className="text-[9px] text-[#4a7a50] mb-4 tracking-widest">
                  RESUMING IN
                </div>
                <div className="vt text-8xl glow-text glow-text-animate">
                  {countdown}
                </div>
              </>
            )}
            {gameState === 'GAMEOVER' && (
              <>
                <div
                  className="text-lg tracking-widest mb-1"
                  style={{
                    color: 'var(--glow-red)',
                    textShadow: '0 0 12px #ff3131',
                  }}
                >
                  GAME OVER
                </div>
                <div className="text-[6px] text-[#4a7a50] mb-2 tracking-widest">
                  FINAL SCORE
                </div>
                <div
                  className="vt text-4xl mb-6"
                  style={{
                    color: 'var(--glow-yellow)',
                    textShadow: '0 0 12px #ffd700',
                  }}
                >
                  {score}
                </div>

                {isLoggedIn && (
                  <div className="text-[7px] tracking-widest mb-6">
                    {scoreSaved === 'saving' && (
                      <span className="text-[#4a7a50] animate-pulse">
                        SAVING SCORE...
                      </span>
                    )}
                    {scoreSaved === 'saved' && (
                      <span
                        className="text-[#00ff41]"
                        style={{ textShadow: '0 0 8px #00ff41' }}
                      >
                        ✓ SCORE SAVED
                      </span>
                    )}
                    {scoreSaved === 'error' && (
                      <span className="text-[#ff3131]">✗ SAVE FAILED</span>
                    )}
                  </div>
                )}
                {!isLoggedIn && (
                  <div className="text-[6px] text-[#1a4d1e] tracking-widest mb-6">
                    SIGN IN TO SAVE YOUR SCORE
                  </div>
                )}

                <button
                  onClick={startGame}
                  className="text-[9px] border-2 border-[#00ff41] text-[#00ff41] px-6 py-3 hover:bg-[#00ff41] hover:text-[#020b04] transition tracking-widest"
                  style={{ boxShadow: '0 0 12px rgba(0,255,65,0.4)' }}
                >
                  TRY AGAIN
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="flex flex-col gap-4 w-28">
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">
            Next
          </div>
          <canvas
            ref={nextCanvasRef}
            width={80}
            height={200}
            className="w-full bg-black/20"
          />
        </div>
      </div>

      {/* Far Right Panel */}
      <div className="flex flex-col gap-4 w-40 min-h-[400px]">
        {/* Emotion Awareness Toggle */}
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">
              Mood
            </div>
            <button
              onClick={() => setEmotionEnabled((e) => !e)}
              className={`px-2 py-0.5 text-[10px] border transition ${
                emotionEnabled
                  ? 'border-green-500 text-green-400 hover:bg-green-500/10'
                  : 'border-[#555] text-gray-500 hover:border-gray-400 hover:text-gray-300'
              }`}
            >
              {emotionEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {!emotionEnabled ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-2 mt-4 pt-4 border-t border-[#333]">
              <div className="text-[8px] text-gray-400 tracking-widest">
                AWAITING MOOD CAM
              </div>
              <div className="text-[6px] text-gray-500 leading-relaxed px-2">
                ENABLE TO DYNAMICALLY ADJUST SPEED BASED ON YOUR FACIAL
                EXPRESSIONS.
              </div>
            </div>
          ) : (
            <div className="text-[9px] leading-relaxed flex-1">
              {error && <div className="text-red-400">{error}</div>}
              {!ready && !error && (
                <div className="text-gray-600 animate-pulse">Loading...</div>
              )}
              {ready && (
                <>
                  {/* Current classified state + what it does to level */}
                  <div
                    className={`font-bold uppercase tracking-wider mb-2 ${
                      emotionState === 'stressed'
                        ? 'text-blue-400'
                        : emotionState === 'disengaged'
                          ? 'text-yellow-400'
                          : emotionState === 'calm'
                            ? 'text-green-400'
                            : 'text-gray-500'
                    }`}
                  >
                    {emotionState === 'stressed'
                      ? '😰 Stressed → Level -1'
                      : emotionState === 'disengaged'
                        ? '😑 Disengaged → Level +1'
                        : emotionState === 'calm'
                          ? '😊 Calm → No change'
                          : '...'}
                  </div>

                  {/* Emotion score bars */}
                  {emotionScores && (
                    <div className="space-y-1">
                      {/* Stressed group */}
                      <div className="text-[8px] text-gray-600 uppercase mb-0.5">
                        Stressed (↓ level)
                      </div>
                      {(['fearful', 'surprised', 'angry'] as const).map(
                        (emotion) => (
                          <div key={emotion}>
                            <div className="flex justify-between text-[8px] uppercase mb-0.5">
                              <span className="text-gray-500">{emotion}</span>
                              <span className="text-gray-400">
                                {(emotionScores[emotion] * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-[#333] h-1">
                              <div
                                className="h-1 transition-all duration-500"
                                style={{
                                  width: `${emotionScores[emotion] * 100}%`,
                                  backgroundColor:
                                    emotion === 'fearful'
                                      ? '#7FDBFF'
                                      : emotion === 'surprised'
                                        ? '#FFDC00'
                                        : '#FF4136',
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}

                      {/* Disengaged group */}
                      <div className="text-[8px] text-gray-600 uppercase mt-2 mb-0.5">
                        Disengaged (↑ level)
                      </div>
                      {(['sad', 'disgusted'] as const).map((emotion) => (
                        <div key={emotion}>
                          <div className="flex justify-between text-[8px] uppercase mb-0.5">
                            <span className="text-gray-500">{emotion}</span>
                            <span className="text-gray-400">
                              {(emotionScores[emotion] * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#333] h-1">
                            <div
                              className="h-1 transition-all duration-500"
                              style={{
                                width: `${emotionScores[emotion] * 100}%`,
                                backgroundColor:
                                  emotion === 'sad' ? '#0074D9' : '#B10DC9',
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Calm group */}
                      <div className="text-[8px] text-gray-600 uppercase mt-2 mb-0.5">
                        Calm (no change)
                      </div>
                      {(['neutral', 'happy'] as const).map((emotion) => (
                        <div key={emotion}>
                          <div className="flex justify-between text-[8px] uppercase mb-0.5">
                            <span className="text-gray-500">{emotion}</span>
                            <span className="text-gray-400">
                              {(emotionScores[emotion] * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#333] h-1">
                            <div
                              className="h-1 transition-all duration-500"
                              style={{
                                width: `${emotionScores[emotion] * 100}%`,
                                backgroundColor:
                                  emotion === 'happy' ? '#2ECC40' : '#AAAAAA',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#1a1a1a] border-2 border-[#444] overflow-hidden flex items-center justify-center min-h-[90px]">
          {emotionEnabled ? (
            <video
              ref={videoElRef}
              autoPlay
              muted
              playsInline
              className="w-full scale-x-[-1]"
            />
          ) : (
            <div className="text-[6px] text-[#333] tracking-widest">
              CAMERA OFFLINE
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
