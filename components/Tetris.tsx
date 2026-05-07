'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLS, ROWS, BLOCK_SIZE, COLORS, SHAPES } from '@/constants/tetris';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';

const TetrisGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const videoElRef = useRef<HTMLVideoElement>(null);

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

  // Ref-based state to prevent closure issues in the game loop
  const boardRef = useRef(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const pieceRef = useRef<any>(null);
  const nextPiecesRef = useRef<any[]>([]);
  const heldPieceRef = useRef<any>(null);
  const canHoldRef = useRef(true);
  const dropIntervalRef = useRef(1000);
  const baseDropIntervalRef = useRef(1000);
  const lastTimeRef = useRef(0);
  const dropCounterRef = useRef(0);

  // --- Logic Helpers ---
  const randPiece = () => {
    const t = Math.floor(Math.random() * 7) + 1;
    return { type: t, shape: SHAPES[t].map((r) => [...r]), x: 3, y: 0 };
  };

  const rotateCW = (s: number[][]) => {
    const R = s.length,
      C = s[0].length;
    const n = Array.from({ length: C }, () => Array(R).fill(0));
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) n[c][R - 1 - r] = s[r][c];
    return n;
  };

  const collides = (s: number[][], px: number, py: number) => {
    for (let r = 0; r < s.length; r++)
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const nx = px + c,
          ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && boardRef.current[ny][nx]) return true;
      }
    return false;
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
    const drawMini = (canvas: HTMLCanvasElement | null, p: any) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!p) return;
      const sz = 16;
      const ox = (canvas.width / sz - p.shape[0].length) / 2;
      const oy = (canvas.height / sz - p.shape.length) / 2;
      p.shape.forEach((row: any, r: number) => {
        row.forEach((v: any, c: number) => {
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
        p.shape.forEach((row: any, r: number) => {
          row.forEach((v: any, c: number) => {
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
    const next = nextPiecesRef.current.shift();
    nextPiecesRef.current.push(randPiece());
    pieceRef.current = next;
    canHoldRef.current = true;
    if (collides(next.shape, next.x, next.y)) {
      setGameState('GAMEOVER');
    }
    drawSidebarCanvases();
  }, [drawSidebarCanvases]);

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
        const base = Math.max(50, 700 - (newLevel - 1) * 90);
        baseDropIntervalRef.current = base;
        dropIntervalRef.current = base;
        return total;
      });
      boardRef.current = newBoard;
    }
  }, [level]);

  const placePiece = useCallback(() => {
    const p = pieceRef.current;
    p.shape.forEach((row: number[], r: number) => {
      row.forEach((v: number, c: number) => {
        if (v && p.y + r >= 0) boardRef.current[p.y + r][p.x + c] = p.type;
      });
    });
    clearLines();
    spawnPiece();
  }, [clearLines, spawnPiece]);

  const tryMove = useCallback(
    (dx: number, dy: number, rotate = false) => {
      if (gameState !== 'PLAYING') return;
      let p = pieceRef.current;
      let ns = rotate ? rotateCW(p.shape) : p.shape;
      let nx = p.x + dx;
      let ny = p.y + dy;

      if (!collides(ns, nx, ny)) {
        pieceRef.current = { ...p, shape: ns, x: nx, y: ny };
        render();
        return true;
      } else if (rotate) {
        // Simple wall kick
        if (!collides(ns, nx + 1, ny)) {
          nx++;
        } else if (!collides(ns, nx - 1, ny)) {
          nx--;
        } else {
          return false;
        }
        pieceRef.current = { ...p, shape: ns, x: nx, y: ny };
        render();
        return true;
      }
      if (dy > 0) placePiece();
      return false;
    },
    [gameState, placePiece, render],
  );

  const handleHold = useCallback(() => {
    if (!canHoldRef.current || gameState !== 'PLAYING') return;
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
        while (
          !collides(
            pieceRef.current.shape,
            pieceRef.current.x,
            pieceRef.current.y + 1,
          )
        ) {
          pieceRef.current.y++;
        }
        placePiece();
        return;
      }
      if (e.code === 'KeyC' || e.code === 'ShiftLeft') {
        handleHold();
        return;
      }
      if (e.code === 'Escape') {
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
  }, [gameState, tryMove, handleHold, placePiece]);

  // --- Pause/Resume Countdown ---
  useEffect(() => {
    if (gameState !== 'RESUMING') return;
    setCountdown(3);
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

  const startGame = () => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    nextPiecesRef.current = [
      randPiece(),
      randPiece(),
      randPiece(),
      randPiece(),
    ];
    heldPieceRef.current = null;
    setScore(0);
    setLines(0);
    setLevel(1);
    dropIntervalRef.current = 700;
    baseDropIntervalRef.current = 700;
    spawnPiece();
    setGameState('PLAYING');
  };

  return (
    <div className="flex items-start gap-4 font-mono select-none">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 w-28">
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">
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
          <div className="text-sm text-white">{score}</div>
        </div>
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="text-[10px] text-gray-500 mb-1 uppercase">Level</div>
          <div className="text-sm text-white">{level}</div>
        </div>
        <div className="text-[8px] text-gray-600 space-y-2 uppercase leading-relaxed">
          <div>Arrows: Move</div>
          <div>Up: Rotate</div>
          <div>Space: Drop</div>
          <div>C: Hold</div>
          <div>P: Esc</div>
        </div>
      </div>

      {/* Center Game Board */}
      <div className="relative border-[3px] border-[#555] bg-black shadow-2xl">
        <canvas ref={canvasRef} width={200} height={400} />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
            {gameState === 'IDLE' && (
              <>
                <h1 className="text-2xl font-bold mb-6 tracking-tighter">
                  TETRIS
                </h1>
                <button
                  onClick={startGame}
                  className="border-2 border-white px-6 py-2 hover:bg-white hover:text-black transition"
                >
                  START
                </button>
              </>
            )}
            {gameState === 'PAUSED' && (
              <>
                <h1 className="text-xl font-bold mb-6">PAUSED</h1>
                <button
                  onClick={() => setGameState('RESUMING')}
                  className="border-2 border-white px-6 py-2 hover:bg-white hover:text-black transition"
                >
                  RESUME
                </button>
              </>
            )}
            {gameState === 'RESUMING' && (
              <>
                <h1 className="text-6xl font-bold text-white animate-pulse">
                  {countdown}
                </h1>
              </>
            )}
            {gameState === 'GAMEOVER' && (
              <>
                <h1 className="text-xl font-bold text-red-500 mb-2">
                  GAME OVER
                </h1>
                <p className="text-xs text-gray-400 mb-6">
                  FINAL SCORE: {score}
                </p>
                <button
                  onClick={startGame}
                  className="border-2 border-white px-6 py-2 hover:bg-white hover:text-black transition"
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
      <div className="flex flex-col gap-4 w-40">
        {/* Emotion Awareness Toggle */}
        <div className="bg-[#1a1a1a] border-2 border-[#444] p-2">
          <div className="flex items-center justify-between">
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

          {emotionEnabled && (
            <div className="mt-2 text-[9px] leading-relaxed">
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

        {emotionEnabled && (
          <div className="bg-[#1a1a1a] border-2 border-[#444] overflow-hidden">
            <video
              ref={videoElRef}
              autoPlay
              muted
              playsInline
              className="w-full scale-x-[-1]"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TetrisGame;
