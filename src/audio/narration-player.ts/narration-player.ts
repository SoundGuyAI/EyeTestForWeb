// Shared narration audio element.
// iOS Safari only allows programmatic playback on a media element that has already
// been played inside a user gesture, so every narration clip reuses one element that
// tap handlers unlock with a short silent clip first.

// 0.25s silent MP3, generated once with ffmpeg and kept tiny on purpose.
const SILENT_UNLOCK_SRC =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAADAAAAe4Aa2tra2tra2t5eXl5eXl5' +
  'eQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAAAN8AAAAhAAAAIAARAAAAM4AAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'

let shared: HTMLAudioElement | null = null

export const narrationAudio = (): HTMLAudioElement => {
  if (!shared) shared = new Audio()
  return shared
}

// Must be called synchronously from a real user tap/click handler so the shared
// element becomes gesture-unlocked on iOS. Safe to call again on later taps.
export const unlockNarration = () => {
  const el = narrationAudio()
  el.onended = null
  el.onerror = null
  el.pause()
  el.src = SILENT_UNLOCK_SRC
  el.currentTime = 0
  void el.play().catch(() => {})
}
