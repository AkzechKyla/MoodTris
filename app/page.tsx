import TetrisGame from '@/components/Tetris';

export default function Home() {
  return (
    <main className="crt flex min-h-screen flex-col items-center justify-center bg-[#020b04] p-4">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="glow-text glow-text-animate text-2xl tracking-widest mb-1">
          MOODTRIS
        </h1>
        <p className="text-[8px] text-[#4a7a50] tracking-widest">
          EMOTION-AWARE TETRIS v1.0
        </p>
      </div>

      <TetrisGame />

      {/* Footer */}
      <div className="mt-6 text-[6px] text-[#1a4d1e] tracking-widest">
        INSERT COIN TO CONTINUE <span className="blink">▮</span>
      </div>
    </main>
  );
}
