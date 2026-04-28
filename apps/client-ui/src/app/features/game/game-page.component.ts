import { Component, computed, signal } from '@angular/core'
import { I18nService } from '../../core/i18n/i18n.service'
import { GameFacadeService } from '../../core/services/game-facade.service'
import {
  SessionService,
  type RaiseInputMode,
} from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'
import {
  ChatPanelComponent,
  DeviceSwitchConfirmationComponent,
  DeviceSwitchModalComponent,
  GameFinishedPanelComponent,
  GameHeaderComponent,
  GameSettingsPanelComponent,
  HandAreaComponent,
  LogPanelComponent,
  PlayerListPanelComponent,
  PreviousRoundCardsPanelComponent,
  PredictionPanelComponent,
  TrickAreaComponent,
} from './components'
import { GamePageActionsService } from './services'

@Component({
  standalone: true,
  imports: [
    TPipe,
    GameHeaderComponent,
    GameFinishedPanelComponent,
    DeviceSwitchConfirmationComponent,
    DeviceSwitchModalComponent,
    GameSettingsPanelComponent,
    PlayerListPanelComponent,
    TrickAreaComponent,
    HandAreaComponent,
    PredictionPanelComponent,
    LogPanelComponent,
    PreviousRoundCardsPanelComponent,
    ChatPanelComponent,
  ],
  templateUrl: './game-page.component.html',
  styleUrl: './game-page.component.css',
  providers: [GamePageActionsService],
})
export class GamePageComponent {
  protected readonly store = this.appStore

  readonly gameState = computed(() => this.store.gameState())
  readonly lobby = computed(() => this.store.lobby())
  readonly deviceSwitchTokenSignal = computed(() =>
    this.facade.deviceSwitchToken(),
  )
  readonly deviceSwitchConfirmationSignal = computed(() =>
    this.facade.pendingDeviceSwitchConfirmation(),
  )
  readonly deviceSwitchModalVisibleSignal = signal(false)
  private readonly actionFieldsHiddenForTurnSignal = signal<string | null>(null)
  private actionFieldsFallbackTimerId: ReturnType<typeof setTimeout> | null =
    null
  readonly selfPlayer = computed(() => {
    const state = this.gameState()

    if (!state) {
      return null
    }

    return (
      state.players.find((player) => player.playerId === state.selfPlayerId) ??
      null
    )
  })
  readonly currentRoundPlayer = computed(() => {
    const state = this.gameState()

    if (!state) {
      return null
    }

    return (
      state.currentRound?.players.find(
        (player) => player.playerId === state.selfPlayerId,
      ) ?? null
    )
  })
  readonly isSpectatorSignal = computed(() => this.selfPlayer() === null)
  readonly isWatchingOnlySignal = computed(
    () => this.selfPlayer() === null || (this.selfPlayer()?.eliminated ?? false),
  )
  readonly actionTurnKeySignal = computed(() => {
    const state = this.gameState()
    const round = state?.currentRound

    if (!state || !round?.activePlayerId) {
      return null
    }

    return [
      state.lobbyCode,
      round.handNumber,
      round.street,
      round.activePlayerId,
      round.currentBet,
    ].join(':')
  })
  readonly selfLobbyPlayer = computed(() => {
    const lobby = this.lobby()
    const playerId = this.gameState()?.selfPlayerId

    if (!lobby || !playerId) {
      return null
    }

    return lobby.players.find((player) => player.id === playerId) ?? null
  })
  readonly shouldShowActionControlsSignal = computed(() => {
    const state = this.gameState()
    const actionTurnKey = this.actionTurnKeySignal()

    if (!state || state.phase === 'showdown') {
      return false
    }

    if (
      actionTurnKey &&
      this.actionFieldsHiddenForTurnSignal() === actionTurnKey
    ) {
      return false
    }

    return true
  })
  readonly isHostSignal = computed(() => this.selfPlayer()?.isHost ?? false)
  readonly selfRoleSignal = computed<'host' | 'player' | 'spectator'>(() => {
    const selfPlayer = this.selfPlayer()

    if (!selfPlayer) {
      return this.gameState() ? 'spectator' : 'player'
    }

    return selfPlayer.isHost ? 'host' : 'player'
  })
  readonly spectatorChatAllowedSignal = computed(
    () =>
      this.store.lobby()?.config.allowSpectatorChat ??
      this.gameState()?.config.allowSpectatorChat ??
      true,
  )
  readonly readLogEnabledSignal = computed(
    () => this.selfPlayer()?.readLogEnabled ?? false,
  )
  readonly speechVolumeSignal = computed(() => this.session.speechVolume())
  readonly speechSpeedSignal = computed(() => this.session.speechRate())
  readonly bingEnabledSignal = computed(() => this.session.bingEnabled())
  readonly raiseSoundEnabledSignal = computed(() =>
    this.session.raiseSoundEnabled(),
  )
  readonly panelSettingsVisibleSignal = computed(() =>
    this.session.panelSettingsVisible(),
  )
  readonly panelPlayersVisibleSignal = computed(() =>
    this.session.panelPlayersVisible(),
  )
  readonly panelLogVisibleSignal = computed(() =>
    this.session.panelLogVisible(),
  )
  readonly panelPreviousVisibleSignal = computed(() =>
    this.session.panelPreviousVisible(),
  )
  readonly panelChatVisibleSignal = computed(() =>
    this.session.panelChatVisible(),
  )
  readonly logShowTimestampSignal = computed(() =>
    this.session.logShowTimestamp(),
  )
  readonly chatSoundEnabledSignal = computed(() =>
    this.session.chatSoundEnabled(),
  )
  readonly raiseInputModeSignal = computed(() => this.session.raiseInputMode())
  readonly streetLabel = computed(() => {
    const street = this.gameState()?.currentRound?.street

    switch (street) {
      case 'preflop':
        return this.i18n.t('street.preflop')
      case 'flop':
        return this.i18n.t('street.flop')
      case 'turn':
        return this.i18n.t('street.turn')
      case 'river':
        return this.i18n.t('street.river')
      default:
        return this.i18n.t('street.waiting')
    }
  })
  readonly activePlayerNameSignal = computed(() => {
    const state = this.gameState()
    const activePlayerId = state?.currentRound?.activePlayerId

    if (!state || !activePlayerId) {
      return null
    }

    return (
      state.players.find((player) => player.playerId === activePlayerId)
        ?.name ?? null
    )
  })
  readonly winnerNamesSignal = computed(() => {
    const state = this.gameState()

    if (!state || state.winnerPlayerIds.length === 0) {
      return ''
    }

    return state.players
      .filter((player) => state.winnerPlayerIds.includes(player.playerId))
      .map((player) => player.name)
      .join(', ')
  })
  readonly winnerLabelSignal = computed(() => {
    const names = this.winnerNamesSignal()
    return names ? this.i18n.format('game.winner', { names }) : ''
  })
  private readonly replayButtonLabel = computed(() => {
    const state = this.gameState()
    const lobby = this.lobby()
    const selfPlayer = this.selfPlayer()

    if (!state || state.phase !== 'finished') {
      return ''
    }

    if (!lobby?.hostPlayerId) {
      return this.i18n.t('game.replayHostLeft')
    }

    if (selfPlayer?.isHost && lobby.hostPlayerId === state.selfPlayerId) {
      return lobby.status === 'waiting'
        ? this.i18n.t('game.replayLobbyOpened')
        : this.i18n.t('game.replayOpenLobby')
    }

    return lobby.status === 'waiting'
      ? this.i18n.t('game.replayJoinLobby')
      : this.i18n.t('game.replayWaitingForHost')
  })
  private readonly replayButtonState = computed<
    'primary' | 'waiting' | 'ready' | 'danger'
  >(() => {
    const state = this.gameState()
    const lobby = this.lobby()
    const selfPlayer = this.selfPlayer()

    if (!state || state.phase !== 'finished') {
      return 'primary'
    }

    if (!lobby?.hostPlayerId) {
      return 'danger'
    }

    if (selfPlayer?.isHost && lobby.hostPlayerId === state.selfPlayerId) {
      return 'primary'
    }

    return lobby.status === 'waiting' ? 'ready' : 'waiting'
  })
  private readonly showReplaySpinner = computed(
    () => this.replayButtonState() === 'waiting',
  )
  private readonly replayButtonDisabled = computed(() => {
    const state = this.gameState()
    const lobby = this.lobby()
    const selfPlayer = this.selfPlayer()

    if (!state || state.phase !== 'finished' || !lobby?.hostPlayerId) {
      return true
    }

    if (selfPlayer?.isHost && lobby.hostPlayerId === state.selfPlayerId) {
      return lobby.status === 'waiting'
    }

    return lobby.status !== 'waiting'
  })

  readonly toggleReadLogFn = (enabled: boolean) =>
    this.actions.toggleAudio(enabled)
  readonly toggleBingFn = (enabled: boolean) =>
    this.session.setBingEnabled(enabled)
  readonly setRaiseSoundEnabledFn = (enabled: boolean) =>
    this.session.setRaiseSoundEnabled(enabled)
  readonly setChatSoundEnabledFn = (enabled: boolean) =>
    this.session.setChatSoundEnabled(enabled)
  readonly setSpeechVolumeFn = (volume: number) =>
    this.actions.setAudioVolume(volume)
  readonly setSpeechSpeedFn = (speed: number) =>
    this.actions.setAudioSpeed(speed)
  readonly endLobbyFn = () => this.actions.endLobby()
  readonly setPanelSettingsVisibleFn = (visible: boolean) =>
    this.session.setPanelSettingsVisible(visible)
  readonly setPanelPlayersVisibleFn = (visible: boolean) =>
    this.session.setPanelPlayersVisible(visible)
  readonly setPanelLogVisibleFn = (visible: boolean) =>
    this.session.setPanelLogVisible(visible)
  readonly setPanelPreviousVisibleFn = (visible: boolean) =>
    this.session.setPanelPreviousVisible(visible)
  readonly setPanelChatVisibleFn = (visible: boolean) =>
    this.session.setPanelChatVisible(visible)
  readonly setLogShowTimestampFn = (visible: boolean) =>
    this.session.setLogShowTimestamp(visible)
  readonly setRaiseInputModeFn = (mode: RaiseInputMode) =>
    this.session.setRaiseInputMode(mode)
  readonly setSpectatorChatAllowedFn = (enabled: boolean) =>
    this.actions.setSpectatorChatAllowed(enabled, this.isHostSignal())
  readonly sendChatMessageFn = (text: string) =>
    this.actions.sendChatMessage(
      text,
      this.selfRoleSignal(),
      this.spectatorChatAllowedSignal(),
    )
  readonly openDeviceSwitchFn = () => this.openDeviceSwitchModal()
  readonly closeDeviceSwitchFn = () => this.closeDeviceSwitchModal()
  readonly confirmDeviceSwitchFn = () => this.confirmDeviceSwitch(true)
  readonly cancelDeviceSwitchFn = () => this.confirmDeviceSwitch(false)
  readonly foldFn = () => {
    this.hideActionFieldsForCurrentTurn()
    this.actions.fold()
  }
  readonly checkFn = () => {
    this.hideActionFieldsForCurrentTurn()
    this.actions.check()
  }
  readonly callFn = () => {
    this.hideActionFieldsForCurrentTurn()
    this.actions.call()
  }
  readonly raiseFn = (amount: number) => {
    this.hideActionFieldsForCurrentTurn()
    this.actions.raise(amount)
  }
  readonly allInFn = () => {
    this.hideActionFieldsForCurrentTurn()
    this.actions.allIn()
  }

  replayButtonLabelSignal() {
    return this.replayButtonLabel()
  }

  replayButtonStateSignal() {
    return this.replayButtonState()
  }

  showReplaySpinnerSignal() {
    return this.showReplaySpinner()
  }

  replayButtonDisabledSignal() {
    return this.replayButtonDisabled()
  }

  constructor(
    private readonly appStore: AppStore,
    protected readonly session: SessionService,
    private readonly i18n: I18nService,
    private readonly facade: GameFacadeService,
    readonly actions: GamePageActionsService,
  ) {}

  onHomeButtonUserGesture() {}

  openDeviceSwitchModal() {
    const code = this.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.requestDeviceSwitch(code)
    this.deviceSwitchModalVisibleSignal.set(true)
  }

  closeDeviceSwitchModal() {
    this.deviceSwitchModalVisibleSignal.set(false)
    this.facade.clearDeviceSwitchToken()
  }

  confirmDeviceSwitch(confirmed: boolean) {
    const state = this.gameState()

    if (!state) {
      return
    }

    this.facade.confirmDeviceSwitch(state.lobbyCode, confirmed)
  }

  replayFn() {
    const state = this.gameState()
    const lobby = this.lobby()
    const selfPlayer = this.selfPlayer()

    if (!state || !lobby?.hostPlayerId) {
      return
    }

    if (selfPlayer?.isHost && lobby.hostPlayerId === state.selfPlayerId) {
      this.actions.reopenLobby()
      return
    }

    if (lobby.status === 'waiting') {
      this.actions.joinReplayLobby()
    }
  }

  private hideActionFieldsForCurrentTurn() {
    const actionTurnKey = this.actionTurnKeySignal()

    if (!actionTurnKey) {
      return
    }

    this.actionFieldsHiddenForTurnSignal.set(actionTurnKey)

    if (this.actionFieldsFallbackTimerId) {
      clearTimeout(this.actionFieldsFallbackTimerId)
    }

    this.actionFieldsFallbackTimerId = setTimeout(() => {
      if (this.actionFieldsHiddenForTurnSignal() === actionTurnKey) {
        this.actionFieldsHiddenForTurnSignal.set(null)
      }
    }, 5000)
  }
}
