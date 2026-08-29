import { reactive, ref, watch } from 'vue'

/**
 * Voice announcements via the device's own text-to-speech (Web Speech API).
 * Settings are PER DEVICE (localStorage) on purpose: the venue TV, the
 * organizer's phone, and a kiosk each choose their own voice/accent and
 * whether they speak at all.
 */

const SETTINGS_KEY = 'play_voice_settings'

export const speechSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch {
    return {}
  }
}

const settings = reactive({
  enabled: false,
  voiceURI: null, // null = device default
  rate: 1.0,
  ...loadSettings(),
})

watch(settings, (value) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
  } catch {
    // storage unavailable — settings just won't persist
  }
})

const voices = ref([])

function refreshVoices() {
  if (!speechSupported) return
  voices.value = window.speechSynthesis.getVoices()
}

if (speechSupported) {
  refreshVoices()
  // Voices load async in most browsers.
  window.speechSynthesis.onvoiceschanged = refreshVoices
}

function speakNow(text, { force = false } = {}) {
  if (!speechSupported) return
  if (!settings.enabled && !force) return
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = voices.value.find((v) => v.voiceURI === settings.voiceURI)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.rate = Number(settings.rate) || 1.0
  window.speechSynthesis.speak(utterance) // utterances queue natively
}

function teamPhrase(team) {
  const names = (team || []).map((slot) => slot.display_name).filter(Boolean)
  if (names.length <= 1) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** "Court 2. Jen and Sam, versus Mark and Kevin. Please proceed to Court 2." */
export function announceMatch(match) {
  if (!match) return
  const court = match.court_label || 'your court'
  speakNow(
    `${court}. ${teamPhrase(match.team_a)}, versus ${teamPhrase(match.team_b)}. Please proceed to ${court}.`,
  )
}

export function testAnnouncement() {
  speakNow('Court 1. Jen and Sam, versus Mark and Kevin. Please proceed to Court 1.', {
    force: true,
  })
}

export function useAnnouncer() {
  return { settings, voices, refreshVoices, speakNow, announceMatch, testAnnouncement, speechSupported }
}

/**
 * Announces calls exactly when the organizer presses Call — including
 * "Call again" presses. Each announcement is keyed on the match's called_at
 * timestamp: pressing Call again bumps called_at server-side, so every
 * voice-enabled device (organizer phone, venue TV) speaks once per press.
 * No timers, no automatic repetition.
 *
 * `isLoaded` must report whether the page's state has actually loaded.
 * Priming (silently recording matches that were ALREADY called) only happens
 * on the first loaded state — never on the transient empty state before the
 * first fetch, otherwise a page refresh re-announces existing calls.
 *
 * Usage: const { sync } = useCallAnnouncer(() => calledMatches, () => loaded)
 * and call sync() after every state refresh.
 */
export function useCallAnnouncer(getCalledMatches, isLoaded = () => true) {
  const announcedKeys = new Set() // `${match.id}:${called_at}`
  let primed = false

  function sync() {
    if (!isLoaded()) return
    const called = getCalledMatches() || []

    // First LOADED state: record existing calls without speaking.
    if (!primed) {
      called.forEach((m) => announcedKeys.add(`${m.id}:${m.called_at}`))
      primed = true
      return
    }

    for (const match of called) {
      const key = `${match.id}:${match.called_at}`
      if (!announcedKeys.has(key)) {
        announcedKeys.add(key)
        announceMatch(match)
      }
    }
  }

  return { sync }
}
