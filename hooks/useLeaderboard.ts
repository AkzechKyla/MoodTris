import { useEffect, useState, useCallback } from 'react';
import { supabase, Score } from '@/lib/supabase';

export function useLeaderboard(refreshToken: number) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      setError(error.message);
    } else {
      setScores(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch, refreshToken]);

  return { scores, loading, error, refresh: fetch };
}
