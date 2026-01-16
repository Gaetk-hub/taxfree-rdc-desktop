/**
 * Tauri utilities for Tax Free RDC Desktop App
 * This file provides helpers to detect if running in Tauri and access Tauri APIs
 */

// Check if running inside Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Get app version (only works in Tauri)
export const getAppVersion = async (): Promise<string | null> => {
  if (!isTauri()) return null;
  
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch {
    return null;
  }
};

// Get app name (only works in Tauri)
export const getAppName = async (): Promise<string | null> => {
  if (!isTauri()) return null;
  
  try {
    const { getName } = await import('@tauri-apps/api/app');
    return await getName();
  } catch {
    return null;
  }
};

// Open external URL in default browser
export const openExternalUrl = async (url: string): Promise<void> => {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
};

// Show native notification (only works in Tauri)
export const showNotification = async (title: string, body: string): Promise<void> => {
  if (!isTauri()) {
    // Fallback to browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }
  
  try {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    await sendNotification({ title, body });
  } catch {
    console.warn('Failed to send notification');
  }
};

// Show native dialog (only works in Tauri)
export const showDialog = async (
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
): Promise<void> => {
  if (!isTauri()) {
    alert(`${title}\n\n${message}`);
    return;
  }
  
  try {
    const { message: showMessage } = await import('@tauri-apps/plugin-dialog');
    await showMessage(message, { title, kind: type });
  } catch {
    alert(`${title}\n\n${message}`);
  }
};

// Confirm dialog (only works in Tauri)
export const confirmDialog = async (title: string, message: string): Promise<boolean> => {
  if (!isTauri()) {
    return window.confirm(`${title}\n\n${message}`);
  }
  
  try {
    const { confirm } = await import('@tauri-apps/plugin-dialog');
    return await confirm(message, { title });
  } catch {
    return window.confirm(`${title}\n\n${message}`);
  }
};

// Exit the application (only works in Tauri)
export const exitApp = async (): Promise<void> => {
  if (!isTauri()) return;
  
  try {
    const { exit } = await import('@tauri-apps/plugin-process');
    await exit(0);
  } catch {
    console.warn('Failed to exit app');
  }
};

// Restart the application (only works in Tauri)
export const restartApp = async (): Promise<void> => {
  if (!isTauri()) {
    window.location.reload();
    return;
  }
  
  try {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch {
    window.location.reload();
  }
};
