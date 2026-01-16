// Navigation service for use outside React components
// This allows API interceptors to navigate without page reload

import type { NavigateFunction } from 'react-router-dom';

let navigateFunction: NavigateFunction | null = null;

export const setNavigate = (navigate: NavigateFunction) => {
  navigateFunction = navigate;
};

export const navigateTo = (path: string, options?: { replace?: boolean }) => {
  if (navigateFunction) {
    navigateFunction(path, options);
  } else {
    // Fallback to window.location if navigate is not set
    // This should rarely happen
    window.location.href = path;
  }
};
