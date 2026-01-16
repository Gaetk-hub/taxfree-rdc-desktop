import { useEffect, useRef, useCallback } from 'react';

// Create a simple notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  return () => {
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification sound - two-tone chime
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };
};

let playSound: (() => void) | null = null;

export const useNotificationSound = (currentUnreadCount: number) => {
  const previousCountRef = useRef<number | null>(null);
  const isFirstRenderRef = useRef(true);
  
  // Initialize sound player on first use
  const initSound = useCallback(() => {
    if (!playSound) {
      try {
        playSound = createNotificationSound();
      } catch (error) {
        console.warn('Could not initialize notification sound:', error);
      }
    }
  }, []);
  
  useEffect(() => {
    // Skip first render to avoid playing sound on page load
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousCountRef.current = currentUnreadCount;
      return;
    }
    
    // Check if we have new notifications (count increased)
    if (
      previousCountRef.current !== null && 
      currentUnreadCount > previousCountRef.current
    ) {
      initSound();
      if (playSound) {
        try {
          playSound();
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      }
    }
    
    previousCountRef.current = currentUnreadCount;
  }, [currentUnreadCount, initSound]);
  
  // Manual play function for testing or explicit triggers
  const playNotificationSound = useCallback(() => {
    initSound();
    if (playSound) {
      try {
        playSound();
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  }, [initSound]);
  
  return { playNotificationSound };
};

export default useNotificationSound;
