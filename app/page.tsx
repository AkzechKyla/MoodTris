import TetrisGame from '@/components/Tetris';

export default function Home() {
  return (
    <main className="flex min-height-screen flex-col items-center justify-center bg-[#111] p-4 text-white">
      <TetrisGame />
    </main>
  );
}
