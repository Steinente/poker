import { Injectable } from '@angular/core'
import {
  normalizeSpeechRate,
  normalizeSpeechVolume,
} from '../config/speech.config'

@Injectable({ providedIn: 'root' })
export class SpeechAnnouncementService {
  private queue: string[] = []
  private speaking = false
  private speechVolume = 1
  private speechRate = 1
  private audioContext: AudioContext | null = null
  private audioContextUnlocked = false
  private speechSynthesisPrimed = false
  private speakingWatchdog: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.registerGestureUnlockListeners()
  }

  setSpeechVolume(volume: number) {
    this.speechVolume = normalizeSpeechVolume(volume)
  }

  setSpeechRate(rate: number) {
    this.speechRate = normalizeSpeechRate(rate)
  }

  speak(text: string) {
    if (
      !text ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return
    }

    this.queue.push(text)
    this.trySpeakNext()
  }

  lobbyJoinPing() {
    if (!this.audioContextUnlocked) {
      return
    }

    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx.resume().then(() => {
      if (ctx.state !== 'running') {
        return
      }

      this.playLobbyJoinTone(ctx)
    })
  }

  chatPing() {
    if (!this.audioContextUnlocked) {
      return
    }

    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx.resume().then(() => {
      if (ctx.state !== 'running') {
        return
      }

      this.playChatPingTone(ctx)
    })
  }

  turnPing() {
    if (!this.audioContextUnlocked) {
      return
    }

    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx.resume().then(() => {
      if (ctx.state !== 'running') {
        return
      }

      this.playTurnPingTone(ctx)
    })
  }

  coinPing() {
    if (!this.audioContextUnlocked) {
      return
    }

    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx.resume().then(() => {
      if (ctx.state !== 'running') {
        return
      }

      this.playCoinPingTone(ctx)
    })
  }

  unlock() {
    this.unlockAudioContext()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const utterance = new SpeechSynthesisUtterance('')
    utterance.volume = 0
    window.speechSynthesis.speak(utterance)
  }

  clear() {
    this.queue = []
    this.speaking = false

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  private trySpeakNext() {
    if (this.speaking || !this.queue.length || typeof window === 'undefined') {
      return
    }

    const next = this.queue.shift()

    if (!next) {
      return
    }

    this.speaking = true

    // iOS + VoiceOver can silently drop an utterance without ever firing
    // onend/onerror (e.g. when VoiceOver reads its own feedback, a call comes
    // in, or Siri activates). The watchdog ensures speaking never stays stuck.
    const WATCHDOG_MS = 15_000
    this.speakingWatchdog = setTimeout(() => {
      if (this.speaking) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        this.speaking = false
        this.trySpeakNext()
      }
    }, WATCHDOG_MS)

    const utterance = new SpeechSynthesisUtterance(next)
    utterance.volume = this.speechVolume
    utterance.rate = this.speechRate
    utterance.pitch = 1

    const onDone = () => {
      if (this.speakingWatchdog !== null) {
        clearTimeout(this.speakingWatchdog)
        this.speakingWatchdog = null
      }
      this.speaking = false
      this.trySpeakNext()
    }

    utterance.onend = onDone
    utterance.onerror = onDone

    window.speechSynthesis.speak(utterance)
  }

  private playLobbyJoinTone(ctx: AudioContext) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      1320,
      ctx.currentTime + 0.08,
    )

    const startGain = Math.max(0.001, 0.4 * this.speechVolume)
    gain.gain.setValueAtTime(startGain, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)

    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }

  private playChatPingTone(ctx: AudioContext) {
    const masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)

    const startGain = Math.max(0.001, 0.28 * this.speechVolume)
    masterGain.gain.setValueAtTime(startGain, ctx.currentTime)
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26)

    const first = ctx.createOscillator()
    first.type = 'triangle'
    first.frequency.setValueAtTime(740, ctx.currentTime)
    first.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.08)
    first.connect(masterGain)
    first.start(ctx.currentTime)
    first.stop(ctx.currentTime + 0.09)

    const second = ctx.createOscillator()
    second.type = 'triangle'
    second.frequency.setValueAtTime(980, ctx.currentTime + 0.11)
    second.frequency.exponentialRampToValueAtTime(1360, ctx.currentTime + 0.19)
    second.connect(masterGain)
    second.start(ctx.currentTime + 0.11)
    second.stop(ctx.currentTime + 0.2)

    second.onended = () => {
      first.disconnect()
      second.disconnect()
      masterGain.disconnect()
    }
  }

  private playTurnPingTone(ctx: AudioContext) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(520, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      780,
      ctx.currentTime + 0.12,
    )

    const startGain = Math.max(0.001, 0.32 * this.speechVolume)
    gain.gain.setValueAtTime(startGain, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.22)

    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }

  private playCoinPingTone(ctx: AudioContext) {
    const masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)

    const startGain = Math.max(0.001, 0.38 * this.speechVolume)
    masterGain.gain.setValueAtTime(startGain, ctx.currentTime)
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.58)

    const clackBuffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * 0.055),
      ctx.sampleRate,
    )
    const clackData = clackBuffer.getChannelData(0)
    for (let index = 0; index < clackData.length; index += 1) {
      const decay = 1 - index / clackData.length
      clackData[index] = (Math.random() * 2 - 1) * decay * decay
    }

    const clack = ctx.createBufferSource()
    const clackFilter = ctx.createBiquadFilter()
    const clackGain = ctx.createGain()
    clack.buffer = clackBuffer
    clackFilter.type = 'bandpass'
    clackFilter.frequency.setValueAtTime(1850, ctx.currentTime)
    clackFilter.Q.setValueAtTime(7, ctx.currentTime)
    clackGain.gain.setValueAtTime(0.75, ctx.currentTime)
    clackGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
    clack.connect(clackFilter)
    clackFilter.connect(clackGain)
    clackGain.connect(masterGain)
    clack.start(ctx.currentTime)
    clack.stop(ctx.currentTime + 0.07)

    const partials = [
      {
        frequency: 880,
        endFrequency: 1320,
        delay: 0.055,
        duration: 0.1,
        gain: 0.52,
      },
      {
        frequency: 1560,
        endFrequency: 2320,
        delay: 0.13,
        duration: 0.26,
        gain: 0.78,
      },
      {
        frequency: 2360,
        endFrequency: 1820,
        delay: 0.16,
        duration: 0.34,
        gain: 0.44,
      },
      {
        frequency: 3120,
        endFrequency: 2540,
        delay: 0.19,
        duration: 0.28,
        gain: 0.24,
      },
    ]

    const nodes = partials.map((partial) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + partial.delay
      const end = start + partial.duration

      oscillator.type = partial.delay < 0.1 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(partial.frequency, start)
      oscillator.frequency.exponentialRampToValueAtTime(
        partial.endFrequency,
        end,
      )

      gain.gain.setValueAtTime(Math.max(0.001, partial.gain), start)
      gain.gain.exponentialRampToValueAtTime(0.001, end)

      oscillator.connect(gain)
      gain.connect(masterGain)
      oscillator.start(start)
      oscillator.stop(end)

      return { oscillator, gain }
    })

    nodes.at(-1)!.oscillator.onended = () => {
      clack.disconnect()
      clackFilter.disconnect()
      clackGain.disconnect()
      for (const node of nodes) {
        node.oscillator.disconnect()
        node.gain.disconnect()
      }
      masterGain.disconnect()
    }
  }

  private unlockAudioContext() {
    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx
      .resume()
      .then(() => {
        this.audioContextUnlocked = ctx.state === 'running'
      })
      .catch(() => {
        this.audioContextUnlocked = false
      })
  }

  private primeSpeechSynthesis() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const utterance = new SpeechSynthesisUtterance('')
    utterance.volume = 0
    window.speechSynthesis.speak(utterance)
    this.speechSynthesisPrimed = true
  }

  private ensureAudioContext() {
    if (this.audioContext) {
      return this.audioContext
    }

    const AudioCtx = this.getAudioContextClass()

    if (!AudioCtx) {
      return null
    }

    this.audioContext = new AudioCtx()
    return this.audioContext
  }

  private getAudioContextClass() {
    if (
      typeof window === 'undefined' ||
      !('AudioContext' in window || 'webkitAudioContext' in window)
    ) {
      return null
    }

    return (
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }
      ).webkitAudioContext ?? AudioContext
    )
  }

  private registerGestureUnlockListeners() {
    if (typeof window === 'undefined') {
      return
    }

    const unlockOnGesture = () => {
      if (!this.audioContextUnlocked) {
        this.unlockAudioContext()
      }
      // iOS Safari requires speechSynthesis.speak() to be called from a user
      // gesture context for priming. The once-listener may have already fired
      // before the game page loaded, so we re-prime here on every gesture
      // until confirmed primed. This is a cheap boolean check on every event.
      if (!this.speechSynthesisPrimed) {
        this.primeSpeechSynthesis()
      }
    }

    window.addEventListener('pointerdown', unlockOnGesture, {
      passive: true,
    })
    window.addEventListener('keydown', unlockOnGesture, {
      passive: true,
    })

    // Mobile browsers (iOS Safari, Chrome on Android) silently interrupt
    // SpeechSynthesis when the screen locks or the app goes to the background,
    // without ever firing onend/onerror.  This leaves this.speaking stuck at
    // true forever so nothing gets spoken after returning to the foreground.
    // Reset the speaking flag whenever the page is hidden so the queue can
    // resume normally once the user is active again.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        if (this.speakingWatchdog !== null) {
          clearTimeout(this.speakingWatchdog)
          this.speakingWatchdog = null
        }
        this.speaking = false
        // Speech synthesis must be re-primed from a user gesture after returning
        // from background on iOS, so reset the primed flag here.
        this.speechSynthesisPrimed = false
      } else {
        // iOS can suspend the AudioContext while backgrounded. Re-unlock it
        // whenever the user returns, so pings keep working after e.g. a call.
        if (this.audioContextUnlocked) {
          this.unlockAudioContext()
        }
        // Resume any queued items when the user returns to the page.
        this.trySpeakNext()
      }
    })
  }
}
