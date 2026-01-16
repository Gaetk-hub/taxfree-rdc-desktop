/**
 * Hook for automatic data refresh in Tauri desktop app
 * Since users can't manually refresh like in a browser, this hook
 * automatically refreshes data at regular intervals
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isTauri } from '../utils/tauri';

interface AutoRefreshOptions {
  // Interval in milliseconds (default: 30 seconds)
  interval?: number;
  // Query keys to refresh
  queryKeys?: string[][];
  // Whether to refresh when window regains focus
  refreshOnFocus?: boolean;
  // Whether auto-refresh is enabled
  enabled?: boolean;
}

const DEFAULT_INTERVAL = 30000; // 30 seconds
const DEFAULT_QUERY_KEYS = [
  ['forms'],
  ['notifications'],
  ['notifications-unread-count'],
  ['dashboard-stats'],
  ['merchants'],
  ['users'],
  ['agents'],
  ['rulesets'],
  ['categories'],
  ['currencies'],
  ['borders'],
  ['disputes'],
  ['chat-conversations'],
];

export function useAutoRefresh(options: AutoRefreshOptions = {}) {
  const {
    interval = DEFAULT_INTERVAL,
    queryKeys = DEFAULT_QUERY_KEYS,
    refreshOnFocus = true,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  const refreshData = useCallback(() => {
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient, queryKeys]);

  // Auto-refresh at regular intervals (only in Tauri)
  useEffect(() => {
    if (!enabled) return;

    // In Tauri, always enable auto-refresh
    // In browser, only if explicitly enabled
    const shouldAutoRefresh = isTauri() || enabled;
    
    if (!shouldAutoRefresh) return;

    const intervalId = setInterval(() => {
      refreshData();
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, refreshData]);

  // Refresh when window regains focus
  useEffect(() => {
    if (!refreshOnFocus || !enabled) return;

    const handleFocus = () => {
      refreshData();
    };

    // For Tauri, listen to window focus events
    if (isTauri()) {
      window.addEventListener('focus', handleFocus);
      
      // Also listen to Tauri-specific focus event if available
      const setupTauriFocusListener = async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const appWindow = getCurrentWindow();
          
          const unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
            if (focused) {
              refreshData();
            }
          });
          
          return unlisten;
        } catch {
          // Tauri API not available, use regular focus event
          return () => {};
        }
      };

      let unlisten: (() => void) | undefined;
      setupTauriFocusListener().then((fn) => {
        unlisten = fn;
      });

      return () => {
        window.removeEventListener('focus', handleFocus);
        if (unlisten) unlisten();
      };
    } else {
      // Browser: use visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshData();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [refreshOnFocus, enabled, refreshData]);

  return {
    refresh: refreshData,
    isDesktopApp: isTauri(),
  };
}

export default useAutoRefresh;
