/**
 * Sound & Notification Service for E2E - DOCAS
 * Handles Web Audio Chime, Portuguese Text-to-Speech (TTS),
 * Web Push Notifications and Mobile Device Vibration.
 */

// Generate acoustic airport / dock calling chime using Web Audio API
export function playCallingChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: F5 (698.46 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.2);
    gain2.gain.setValueAtTime(0.3, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.8);

    // Tone 3: C6 (1046.5 Hz) - crisp dock alert
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1046.5, now + 0.4);
    gain3.gain.setValueAtTime(0.35, now + 0.4);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.4);
    osc3.stop(now + 1.2);
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

// Intense repeating mobile alert buzzer signal for driver phone
export function playMobileAlertSignal(): () => void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return () => {};
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    let isPlaying = true;
    let cycle = 0;

    const playBeep = () => {
      if (!isPlaying || ctx.state === 'closed') return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = cycle % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(cycle % 2 === 0 ? 987.77 : 1318.51, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);

        cycle++;
        if (cycle < 12 && isPlaying) {
          setTimeout(playBeep, 500);
        }
      } catch {}
    };

    playBeep();

    return () => {
      isPlaying = false;
      try { ctx.close(); } catch {}
    };
  } catch (err) {
    console.warn('Mobile alert audio error:', err);
    return () => {};
  }
}

// Speak driver call announcement in Portuguese (TTS)
export function speakAnnouncement(driverName: string, dockName: string): void {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterance

    const text = `Atenção motorista ${driverName}. Favor se dirigir à ${dockName}!`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95; // slightly deliberate for clarity
    utterance.pitch = 1.05;

    // Try finding pt-BR voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt-BR') || v.lang.startsWith('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

// Speak package movement / addition in Portuguese (TTS)
export function speakPackageAdded(targetRoute: string, notes?: string): void {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const notePart = notes ? `. Observação: ${notes}` : '';
    const text = `Atenção: Pacote adicionado para a rota ${targetRoute}! ${notePart}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt-BR') || v.lang.startsWith('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error on package movement:', err);
  }
}

// Vibrate mobile device
export function triggerVibration(): void {
  if ('vibrate' in navigator) {
    try {
      // Alert vibration pattern: buzz, pause, buzz, pause, long buzz
      navigator.vibrate([300, 150, 300, 150, 600]);
    } catch {
      // Ignored if device doesn't support or disallows
    }
  }
}

// Request Notification Permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return 'denied';
  }
}

// Trigger Web Push Notification
export function sendPushNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const options: NotificationOptions = {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>',
      tag: 'dock-call-' + Date.now(),
      requireInteraction: true,
    };
    new Notification(title, options);
  } catch (err) {
    console.warn('Send push notification failed:', err);
  }
}
