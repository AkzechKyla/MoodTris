import { useEffect, useRef, useState, useCallback } from 'react';

export type EmotionState = 'calm' | 'stressed' | 'disengaged' | 'unknown';

export type EmotionScores = {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
};

export function useEmotionDetection(
  enabled: boolean,
  videoElRef: React.RefObject<HTMLVideoElement | null>,
) {
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [emotionState, setEmotionState] = useState<EmotionState>('unknown');
  const [emotionScores, setEmotionScores] = useState<EmotionScores | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = (expressions: Record<string, number>): EmotionState => {
    const stressed =
      (expressions.fearful ?? 0) +
      (expressions.surprised ?? 0) +
      (expressions.angry ?? 0);
    const disengaged = (expressions.sad ?? 0) + (expressions.disgusted ?? 0);
    const calm = (expressions.neutral ?? 0) + (expressions.happy ?? 0);
    if (stressed > 0.5) return 'stressed';
    if (disengaged > calm && disengaged > 0.4) return 'disengaged';
    return 'calm';
  };

  const start = useCallback(async () => {
    try {
      const faceapi = await import('face-api.js');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      const video = videoElRef.current!;
      video.srcObject = stream;
      videoRef.current = video;

      await new Promise<void>((res) => {
        video.onloadedmetadata = () => res();
      });
      setReady(true);

      intervalRef.current = setInterval(async () => {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        if (result) {
          const e = result.expressions as unknown as Record<string, number>;
          setEmotionState(classify(e));
          setEmotionScores({
            neutral: +(e.neutral ?? 0).toFixed(2),
            happy: +(e.happy ?? 0).toFixed(2),
            sad: +(e.sad ?? 0).toFixed(2),
            angry: +(e.angry ?? 0).toFixed(2),
            fearful: +(e.fearful ?? 0).toFixed(2),
            disgusted: +(e.disgusted ?? 0).toFixed(2),
            surprised: +(e.surprised ?? 0).toFixed(2),
          });
        }
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Camera error');
    }
  }, [videoElRef]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    videoRef.current = null;
    setTimeout(() => {
      setReady(false);
      setEmotionState('unknown');
      setEmotionScores(null);
    }, 0);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (enabled) {
        await start();
      } else {
        stop();
      }
    };
    run();
    return () => stop();
  }, [enabled, start, stop]);

  return { emotionState, emotionScores, ready, error };
}
