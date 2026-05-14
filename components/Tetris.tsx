'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';
import { useAuth } from '@/hooks/useAuth';
import { useTetris } from '@/hooks/useTetris';
import { TetrisRenderer } from '@/utils/tetris-renderer';
import { Leaderboard } from '@/components/Leaderboard';

const TetrisGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);

  const renderRef = useRef<() => void>(() => {});

  const {
    score,
    lines,
    level,
    gameState,
    countdown,
    setGameState,
    setCountdown,
    setLevel,
    startGame: rawStartGame,
    boardRef,
    pieceRef,
    nextPiecesRef,
    heldPieceRef,
    dropIntervalRef,
    baseDropIntervalRef,
    collides,
  } = useTetris(() => renderRef.current());

  useEffect(() => {
    renderRef.current = () => {
      TetrisRenderer.renderBoard(
        canvasRef.current,
        boardRef.current,
        pieceRef.current,
        collides,
      );
      TetrisRenderer.renderHold(holdCanvasRef.current, heldPieceRef.current);
      TetrisRenderer.renderNext(nextCanvasRef.current, nextPiecesRef.current);
    };
  }, [boardRef, pieceRef, collides, heldPieceRef, nextPiecesRef]);

  const { isLoggedIn, saveScore, session } = useAuth();
  const [scoreSaved, setScoreSaved] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);

  const startGame = useCallback(() => {
    setScoreSaved('idle');
    rawStartGame();
  }, [rawStartGame]);

  const [emotionEnabled, setEmotionEnabled] = useState(false);
  const { emotionState, emotionScores, ready, error } = useEmotionDetection(
    emotionEnabled,
    videoElRef,
  );

  // --- Score Saving ---
  useEffect(() => {
    if (gameState !== 'GAMEOVER' || !isLoggedIn) return;

    const timer = setTimeout(() => {
      setScoreSaved('saving');
      saveScore(score, lines, level).then((err) => {
        setScoreSaved(err ? 'error' : 'saved');
        if (!err) setLeaderboardRefresh((n) => n + 1);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [gameState, isLoggedIn, level, lines, saveScore, score]);

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
  }, [
    emotionState,
    emotionEnabled,
    gameState,
    setLevel,
    dropIntervalRef,
    baseDropIntervalRef,
  ]);

  return (
    <>
      <div className="flex items-start gap-3 select-none relative">
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
            <div className="text-[10px] text-gray-500 mb-1 uppercase">
              Score
            </div>
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
            <div className="text-[10px] text-gray-500 mb-1 uppercase">
              Lines
            </div>
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
              {gameState === 'STARTING' && (
                <>
                  <div className="text-[9px] text-[#4a7a50] mb-4 tracking-widest">
                    STARTING IN
                  </div>
                  <div className="vt text-8xl glow-text glow-text-animate">
                    {countdown}
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
      {/* Game Over Leaderboard Modal */}
      {gameState === 'GAMEOVER' && (
        <div className="fixed inset-0 z-[99999] bg-[#020b04]/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl flex flex-col items-center gap-8">
            <div className="flex flex-col items-center text-center">
              <div
                className="text-4xl tracking-widest mb-2"
                style={{
                  color: 'var(--glow-red)',
                  textShadow: '0 0 16px #ff3131',
                }}
              >
                GAME OVER
              </div>
              <div className="text-[12px] text-[#4a7a50] mb-2 tracking-widest flex items-center gap-4">
                FINAL SCORE:{' '}
                <span
                  className="vt text-5xl"
                  style={{
                    color: 'var(--glow-yellow)',
                    textShadow: '0 0 16px #ffd700',
                  }}
                >
                  {score}
                </span>
              </div>

              {isLoggedIn ? (
                <div className="text-[9px] tracking-widest h-4">
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
                      ✓ SCORE SAVED TO LEADERBOARD
                    </span>
                  )}
                  {scoreSaved === 'error' && (
                    <span className="text-[#ff3131]">✗ SAVE FAILED</span>
                  )}
                </div>
              ) : (
                <div className="text-[9px] text-[#1a4d1e] tracking-widest h-4">
                  SIGN IN TO SAVE YOUR SCORE
                </div>
              )}
            </div>

            <div className="w-full">
              <Leaderboard
                refreshToken={leaderboardRefresh}
                currentUserId={session?.user?.id}
              />
            </div>

            <button
              onClick={startGame}
              className="text-[12px] border-2 border-[#00ff41] text-[#00ff41] px-12 py-4 hover:bg-[#00ff41] hover:text-[#020b04] transition tracking-widest bg-black/50"
              style={{ boxShadow: '0 0 16px rgba(0,255,65,0.4)' }}
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TetrisGame;
