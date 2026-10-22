import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Re-reads the screen's data when it comes back into view (a tab switch, or
 * the back button from a pushed screen). Tabs stay mounted, so without this a
 * tab kept showing what it read the first time. The first focus is skipped:
 * the queries just loaded.
 */
export function useRefreshOnFocus(refetch: () => unknown): void {
  const first = useRef(true);
  const latest = useRef(refetch);
  latest.current = refetch;
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      latest.current();
    }, []),
  );
}

/**
 * Pull to refresh for a ScrollView/FlatList `refreshControl`. The spinner
 * follows only the pull, not background refetches (it would flash on its own).
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
