import { Injectable, computed, signal } from '@angular/core'
import { Router } from '@angular/router'
import type {
  ClientToServerEvents,
  DeviceSwitchTokenResponse,
  GameConfig,
  LobbySummary,
  PokerGameViewState,
} from '@poker/shared'
import { getLogTranslationKey } from '../../features/game/utils/log-label.util'
import { normalizeLogParams } from '../../features/game/utils/log-params.util'
import { I18nService } from '../i18n/i18n.service'
import type { TranslationKey } from '../i18n/translations'
import { AppStore } from '../state/app.store'
import { SessionService } from './session.service'
import { SocketService } from './socket.service'
import { SpeechAnnouncementService } from './speech-announcement.service'

type DeviceSwitchTokenView = DeviceSwitchTokenResponse & {
  expiresInSeconds?: number
}

@Injectable({ providedIn: 'root' })
export class GameFacadeService {
  private lastAnnouncedLogId: string | null = null
  private lastLogCursorLobbyCode: string | null = null
  private lastSeenChatMessageId: string | null = null
  private lastChatCursorLobbyCode: string | null = null
  private lastSeenLobbyChatMessageId: string | null = null
  private lastLobbyChatCursorCode: string | null = null
  private lastInteractionPromptKey: string | null = null
  private wasConnected = false
  private readonly isBrowser = typeof window !== 'undefined'
  private readonly deviceSwitchTokenSignal =
    signal<DeviceSwitchTokenView | null>(null)
  private readonly deviceSwitchConfirmationSignal = signal<{
    token: string
    code: string
  } | null>(null)

  readonly deviceSwitchToken = computed(() => this.deviceSwitchTokenSignal())
  readonly pendingDeviceSwitchConfirmation = computed(() =>
    this.deviceSwitchConfirmationSignal(),
  )

  constructor(
    private readonly socketService: SocketService,
    private readonly store: AppStore,
    private readonly session: SessionService,
    private readonly router: Router,
    private readonly audio: SpeechAnnouncementService,
    private readonly i18n: I18nService,
  ) {
    this.syncSpeechSettings()

    if (!this.isBrowser) {
      return
    }

    const socket = this.socketService.connect()

    socket.on('connect', () => {
      this.store.setError(null)
      this.listLobbies()

      const storedCode = this.session.lastLobbyCode()
      if (this.wasConnected && storedCode) {
        this.reconnectLobby(storedCode)
      }
      this.wasConnected = true
    })

    socket.on('lobby:list', (payload) => {
      this.store.setLobbyList(payload.lobbies)
    })

    socket.on('lobby:created', (payload) => {
      this.store.setLobby(payload.lobby)
      this.notifyIncomingLobbyChatMessage(payload.lobby)
      this.store.setPlayerId(payload.playerId)
      this.session.setLastLobbyCode(payload.lobby.code)
      this.session.setLobbyConfig(payload.lobby.config)
      this.store.setError(null)
      this.store.setLoading(false)
      this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
    })

    socket.on('lobby:joined', (payload) => {
      this.store.setLobby(payload.lobby)
      this.notifyIncomingLobbyChatMessage(payload.lobby)
      this.store.setPlayerId(payload.playerId)
      this.session.setLastLobbyCode(payload.lobby.code)

      if (payload.playerId === payload.lobby.hostPlayerId) {
        this.session.setLobbyConfig(payload.lobby.config)
      }

      this.store.setError(null)
      this.store.setLoading(false)

      if (payload.lobby.status === 'running') {
        this.router.navigateByUrl(`/game/${payload.lobby.code}`)
        return
      }

      this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
    })

    socket.on('lobby:updated', (payload) => {
      const currentPlayerId = this.store.playerId()

      this.store.setLobby(payload.lobby)
      if (currentPlayerId === payload.lobby.hostPlayerId) {
        this.session.setLobbyConfig(payload.lobby.config)
      }

      if (
        currentPlayerId &&
        !payload.lobby.players.some((player) => player.id === currentPlayerId)
      ) {
        this.resetCursors()
        this.session.clearLastLobbyCode()
        this.store.reset()
        this.store.setError(this.i18n.t('info.removedFromLobby'))
        this.router.navigateByUrl('/')
        return
      }

      this.notifyIncomingLobbyChatMessage(payload.lobby)

      const currentGameState = this.store.gameState()
      const currentLobbyPlayer = payload.lobby.players.find(
        (player) => player.id === currentPlayerId,
      )
      const shouldStayOnGameScreen =
        currentGameState?.lobbyCode === payload.lobby.code &&
        (payload.lobby.status === 'finished' ||
          (payload.lobby.status === 'waiting' &&
            currentLobbyPlayer?.inGame === true))

      if (payload.lobby.status === 'running' || shouldStayOnGameScreen) {
        this.router.navigateByUrl(`/game/${payload.lobby.code}`)
      } else {
        this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
      }
    })

    socket.on('lobby:closed', (payload) => {
      this.resetCursors()
      this.session.clearLastLobbyCode()
      this.store.reset()
      this.store.setError(this.translateMessage(payload.reason))
      this.router.navigateByUrl('/')
    })

    socket.on('game:state', (payload) => {
      this.store.setGameState(payload.state)
      this.store.setLoading(false)

      const self = payload.state.players.find(
        (player) => player.playerId === payload.state.selfPlayerId,
      )

      if (self) {
        if (
          this.session.hasReadLogPreference() &&
          self.readLogEnabled !== this.session.readLogEnabled()
        ) {
          this.applyReadLogEnabled(
            payload.state.lobbyCode,
            this.session.readLogEnabled(),
            true,
          )
        } else {
          this.session.setReadLogEnabled(self.readLogEnabled)
        }

        if (this.session.readLogEnabled()) {
          this.audio.unlock()
        }
      }

      this.notifySelfInteraction(payload.state)
      this.notifyRaiseSound(payload.state)
      this.announceNewLogs(payload.state)
      this.notifyIncomingChatMessage(payload.state)
      this.router.navigateByUrl(`/game/${payload.state.lobbyCode}`)
    })

    socket.on('game:event', () => {
      this.store.setError(null)
    })

    socket.on('device:switchTokenGenerated', (payload) => {
      this.deviceSwitchTokenSignal.set(payload as DeviceSwitchTokenView)
      this.store.setError(null)
    })

    socket.on('device:requestConfirmation', (payload) => {
      this.deviceSwitchConfirmationSignal.set({
        token: payload.token,
        code: payload.code,
      })
    })

    socket.on('device:switchCompleted', (payload) => {
      if (!payload.success) {
        this.store.setLoading(false)

        if (payload.reason === 'superseded') {
          this.store.setError(
            this.translateMessage('info.deviceSwitchSuperseded'),
          )
        } else {
          this.store.setError(this.translateMessage('error.deviceSwitchFailed'))
        }

        this.router.navigateByUrl('/')
      }

      this.deviceSwitchConfirmationSignal.set(null)
    })

    socket.on('device:disconnected', () => {
      this.resetCursors()
      this.session.rotateSessionToken()
      this.session.clearLastLobbyCode()
      this.store.reset()
      this.deviceSwitchTokenSignal.set(null)
      this.deviceSwitchConfirmationSignal.set(null)
      this.store.setError(
        this.translateMessage('info.deviceSwitchDisconnected'),
      )
      this.router.navigateByUrl('/')
    })

    socket.on('error:message', (payload) => {
      const shouldClearLobby =
        payload.message === 'error.lobbyNotFound' ||
        payload.message === 'error.reconnectFailed' ||
        payload.message === 'info.removedFromLobby'

      if (shouldClearLobby) {
        this.resetCursors()
        this.session.clearLastLobbyCode()
        this.store.reset()
        this.store.setError(this.translateMessage(payload.message))
        this.router.navigateByUrl('/')
        return
      }

      this.store.setError(this.translateMessage(payload.message))
      this.store.setLoading(false)
    })
  }

  setSpeechVolume(volume: number) {
    this.session.setSpeechVolume(volume)
    this.audio.setSpeechVolume(this.session.speechVolume())
  }

  setSpeechRate(rate: number) {
    this.session.setSpeechRate(rate)
    this.audio.setSpeechRate(this.session.speechRate())
  }

  listLobbies() {
    this.emit('lobby:list')
  }

  createLobby(
    playerName: string,
    config?: Partial<GameConfig>,
    password?: string,
  ) {
    this.store.setLoading(true)
    this.store.setError(null)
    this.session.setPlayerName(playerName)

    this.emit('lobby:create', {
      playerName,
      password,
      config: config ?? this.session.lobbyConfig() ?? undefined,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  joinLobby(code: string, playerName: string, password?: string) {
    this.store.setLoading(true)
    this.store.setError(null)
    this.session.setPlayerName(playerName)
    this.session.setLastLobbyCode(code)

    this.emit('lobby:join', {
      code,
      playerName,
      password,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  spectateLobby(code: string, playerName: string, password?: string) {
    this.store.setLoading(true)
    this.store.setError(null)
    this.session.setPlayerName(playerName)
    this.session.setLastLobbyCode(code)

    this.emit('lobby:spectate', {
      code,
      playerName,
      password,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  reconnectLobby(code: string) {
    this.store.setLoading(true)
    this.emit('lobby:reconnect', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  leaveLobby(code: string) {
    this.emit('lobby:leave', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  reopenLobby(code: string) {
    this.emit('lobby:reopen', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  joinReplayLobby(code: string) {
    this.emit('lobby:joinReplay', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  updateConfig(code: string, config: Partial<GameConfig>) {
    this.store.mergeLobbyConfig(config)
    this.session.mergeLobbyConfig(config)
    this.emit('lobby:updateConfig', {
      code,
      config,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  kickPlayer(code: string, targetPlayerId: string) {
    this.emit('lobby:kickPlayer', {
      code,
      targetPlayerId,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  endLobby(code: string) {
    this.emit('lobby:end', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  sendLobbyChatMessage(code: string, text: string) {
    const trimmed = text.trim()

    if (!trimmed) {
      return
    }

    this.emit('lobby:sendChatMessage', {
      code,
      text: trimmed,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  startGame(code: string) {
    this.store.setLoading(true)
    this.emit('game:start', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  fold(code: string) {
    this.emit('game:fold', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  check(code: string) {
    this.emit('game:check', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  call(code: string, amount?: number) {
    this.emit('game:call', {
      code,
      amount,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  raise(code: string, amount: number) {
    this.emit('game:raise', {
      code,
      amount,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  allIn(code: string) {
    this.emit('game:allIn', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  sendChatMessage(code: string, text: string) {
    const trimmed = text.trim()

    if (!trimmed) {
      return
    }

    this.emit('game:sendChatMessage', {
      code,
      text: trimmed,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  setReadLogEnabled(code: string, enabled: boolean) {
    this.session.setReadLogEnabled(enabled)
    this.applyReadLogEnabled(code, enabled, false)
  }

  setInGame(code: string, inGame: boolean) {
    this.emit('player:setInGame', {
      code,
      inGame,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  clearReconnectLobbyCode() {
    this.session.clearLastLobbyCode()
  }

  clearDeviceSwitchToken() {
    this.deviceSwitchTokenSignal.set(null)
  }

  requestDeviceSwitch(code: string) {
    this.emit('device:generateSwitchToken', {
      code,
      sessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  confirmDeviceSwitch(code: string, confirmed: boolean) {
    const pending = this.deviceSwitchConfirmationSignal()

    if (!pending) {
      return
    }

    this.emit('device:confirmSwitch', {
      code,
      token: pending.token,
      confirmed,
      sessionToken: this.session.getOrCreateSessionToken(),
    })

    if (!confirmed) {
      this.deviceSwitchConfirmationSignal.set(null)
    }
  }

  completeDeviceSwitch(token: string) {
    if (!this.isBrowser) {
      return
    }

    this.store.setLoading(true)
    this.store.setError(null)
    this.emit('device:completeSwitch', {
      token,
      newSessionToken: this.session.getOrCreateSessionToken(),
    })
  }

  private emit<E extends keyof ClientToServerEvents>(
    event: E,
    payload?: Parameters<ClientToServerEvents[E]>[0],
  ) {
    const socket = this.socketService.connect()
    const emit = socket.emit as (...args: unknown[]) => void

    if (payload === undefined) {
      emit(event)
      return
    }

    emit(event, payload)
  }

  private syncSpeechSettings() {
    this.audio.setSpeechVolume(this.session.speechVolume())
    this.audio.setSpeechRate(this.session.speechRate())
  }

  private applyReadLogEnabled(code: string, enabled: boolean, silent: boolean) {
    this.emit('player:setReadLogEnabled', {
      code,
      enabled,
      sessionToken: this.session.getOrCreateSessionToken(),
    })

    if (!silent && enabled) {
      this.audio.unlock()
    }
  }

  private notifySelfInteraction(state: PokerGameViewState) {
    const round = state.currentRound
    const availableActions = round?.availableActions
    const isSelfTurn = round?.activePlayerId === state.selfPlayerId
    const interactionKey =
      isSelfTurn && availableActions
        ? `${state.lobbyCode}:${round?.handNumber ?? 0}:${round?.street ?? 'waiting'}:${round?.activePlayerId}`
        : null

    if (!interactionKey) {
      this.lastInteractionPromptKey = null
      return
    }

    if (interactionKey === this.lastInteractionPromptKey) {
      return
    }

    this.lastInteractionPromptKey = interactionKey

    const raiseSoundWillPlay =
      this.session.raiseSoundEnabled() && this.hasUnseenRaiseAction(state)

    if (this.session.bingEnabled() && !raiseSoundWillPlay) {
      this.audio.turnPing()
    }
  }

  private announceNewLogs(state: PokerGameViewState) {
    if (!this.session.readLogEnabled()) {
      this.updateLogCursor(state)
      return
    }

    const unseenEntries = this.unseenEntries(
      state.logs,
      this.lastLogCursorLobbyCode,
      this.lastAnnouncedLogId,
      state.lobbyCode,
      {
        includeOnLobbySwitch: true,
        maxOnLobbySwitch: 2,
      },
    )

    for (const entry of unseenEntries) {
      const translationKey = getLogTranslationKey(entry.messageKey)

      if (!translationKey) {
        this.audio.speak(entry.messageKey)
        continue
      }

      const params = normalizeLogParams(
        entry.messageParams,
        state.players,
        (key) => this.i18n.t(key as TranslationKey),
        {
          includeSwappedCardLabel: false,
          includeSpecial: false,
          cardsFormat: 'speech',
        },
      )

      this.audio.speak(this.i18n.format(translationKey, params))
    }

    this.updateLogCursor(state)
  }

  private notifyRaiseSound(state: PokerGameViewState) {
    if (!this.session.raiseSoundEnabled()) {
      return
    }

    if (this.hasUnseenRaiseAction(state)) {
      this.audio.coinPing()
    }
  }

  private hasUnseenRaiseAction(state: PokerGameViewState) {
    const unseenEntries = this.unseenEntries(
      state.logs,
      this.lastLogCursorLobbyCode,
      this.lastAnnouncedLogId,
      state.lobbyCode,
    )

    return unseenEntries.some(
      (entry) =>
        entry.messageKey === 'game.action.raise' ||
        entry.messageKey === 'game.action.reraise',
    )
  }

  private notifyIncomingChatMessage(state: PokerGameViewState) {
    const unseenMessages = this.unseenEntries(
      state.chatMessages,
      this.lastChatCursorLobbyCode,
      this.lastSeenChatMessageId,
      state.lobbyCode,
    )

    if (
      unseenMessages.length > 0 &&
      this.session.chatSoundEnabled() &&
      unseenMessages.some(
        (message) => message.senderPlayerId !== state.selfPlayerId,
      )
    ) {
      this.audio.chatPing()
    }

    this.lastChatCursorLobbyCode = state.lobbyCode
    this.lastSeenChatMessageId = state.chatMessages.at(-1)?.id ?? null
  }

  private notifyIncomingLobbyChatMessage(lobby: LobbySummary) {
    const unseenMessages = this.unseenEntries(
      lobby.chatMessages,
      this.lastLobbyChatCursorCode,
      this.lastSeenLobbyChatMessageId,
      lobby.code,
    )

    if (unseenMessages.length > 0 && this.session.chatSoundEnabled()) {
      this.audio.chatPing()
    }

    this.lastLobbyChatCursorCode = lobby.code
    this.lastSeenLobbyChatMessageId = lobby.chatMessages.at(-1)?.id ?? null
  }

  private updateLogCursor(state: PokerGameViewState) {
    this.lastLogCursorLobbyCode = state.lobbyCode
    this.lastAnnouncedLogId = state.logs.at(-1)?.id ?? null
  }

  private resetCursors() {
    this.lastLobbyChatCursorCode = null
    this.lastSeenLobbyChatMessageId = null
    this.lastChatCursorLobbyCode = null
    this.lastSeenChatMessageId = null
    this.lastLogCursorLobbyCode = null
    this.lastAnnouncedLogId = null
    this.lastInteractionPromptKey = null
  }

  private unseenEntries<T extends { id: string }>(
    entries: T[],
    cursorLobbyCode: string | null,
    lastSeenId: string | null,
    lobbyCode: string,
    options?: {
      includeOnLobbySwitch?: boolean
      maxOnLobbySwitch?: number
    },
  ) {
    if (cursorLobbyCode !== lobbyCode) {
      if (!options?.includeOnLobbySwitch) {
        return [] as T[]
      }

      if (!entries.length) {
        return [] as T[]
      }

      const maxCount = Math.max(1, options.maxOnLobbySwitch ?? entries.length)
      return entries.slice(-maxCount)
    }

    if (!lastSeenId) {
      return entries
    }

    const lastSeenIndex = entries.findIndex((entry) => entry.id === lastSeenId)

    if (lastSeenIndex < 0) {
      return entries
    }

    return entries.slice(lastSeenIndex + 1)
  }

  private translateMessage(message: string) {
    return this.i18n.t(message as TranslationKey)
  }
}
