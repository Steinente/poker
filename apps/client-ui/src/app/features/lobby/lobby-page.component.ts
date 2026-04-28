import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import {
  AUTOMATIC_BLIND_INCREASE_MODES,
  HOLDEM_LIMIT_MODES,
  type AutomaticBlindIncreaseMode,
  type GameConfig,
  type HoldemLimitMode,
} from '@poker/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationKey } from '../../core/i18n/translations'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'
import { ChatPanelComponent } from '../game/components/chat-panel.component'

@Component({
  standalone: true,
  imports: [FormsModule, TPipe, RouterLink, ChatPanelComponent],
  templateUrl: './lobby-page.component.html',
  styleUrl: './lobby-page.component.css',
})
export class LobbyPageComponent {
  private readonly route = inject(ActivatedRoute)
  protected readonly i18n = inject(I18nService)
  protected readonly store = inject(AppStore)
  private readonly facade = inject(GameFacadeService)
  protected readonly session = inject(SessionService)

  readonly copied = signal(false)
  readonly chatSoundEnabledSignal = signal(this.session.chatSoundEnabled())
  private copiedTimeoutId: ReturnType<typeof setTimeout> | null = null

  constructor() {}

  routeCode = this.route.snapshot.paramMap.get('code')?.toUpperCase() ?? ''
  readonly holdemLimitModes = HOLDEM_LIMIT_MODES
  readonly automaticBlindIncreaseModes = AUTOMATIC_BLIND_INCREASE_MODES

  readonly isHost = computed(() => {
    const lobby = this.store.lobby()
    const playerId = this.store.playerId()
    return !!lobby && !!playerId && lobby.hostPlayerId === playerId
  })
  readonly lobbyPlayers = computed(
    () => this.store.lobby()?.players.filter((player) => !player.inGame) ?? [],
  )
  lobbyStatusKey(status: string): TranslationKey {
    return `lobbyStatus.${status.toLowerCase()}` as TranslationKey
  }

  automaticBlindIncreaseValueLabel() {
    const mode = this.store.lobby()?.config.automaticBlindIncreaseMode ?? 'time'

    return mode === 'dealerRounds'
      ? this.i18n.t('config.automaticBlindIncrease.value.dealerRoundsLabel')
      : this.i18n.t('config.automaticBlindIncrease.value.timeLabel')
  }

  roleKey(role: string): TranslationKey {
    return `role.${role.toLowerCase()}` as TranslationKey
  }

  copyCode() {
    const code = this.store.lobby()?.code
    if (!code) return

    this.showCopiedStatus()

    navigator.clipboard.writeText(code).catch(() => {
      this.copied.set(false)
      this.store.setError(this.i18n.t('common.copyFailed'))
    })
  }

  async shareLobby() {
    const lobby = this.store.lobby()
    if (!lobby) return

    const lobbyUrl = this.getLobbyJoinUrl(lobby.code)
    const shareData: ShareData = {
      title: this.i18n.t('lobby.share.title'),
      text: this.i18n.t('lobby.share.text').replace('{code}', lobby.code),
      url: lobbyUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    navigator.clipboard
      .writeText(lobbyUrl)
      .then(() => {
        this.showCopiedStatus()
      })
      .catch(() => {
        this.store.setError(this.i18n.t('common.copyFailed'))
      })
  }

  leaveLobby() {
    const code = this.store.lobby()?.code
    if (!code) return
    this.facade.leaveLobby(code)
  }

  kick(targetPlayerId: string) {
    const code = this.store.lobby()?.code
    if (!code) return
    this.facade.kickPlayer(code, targetPlayerId)
  }

  startGame() {
    const lobby = this.store.lobby()
    if (!lobby) return

    const minPlayers = 2
    const maxPlayers = lobby.config.maxPlayers

    const playerCount = this.lobbyPlayers().filter(
      (player) => player.role !== 'spectator',
    ).length

    if (playerCount < minPlayers) {
      this.store.setError(this.i18n.t('config.validation.minPlayersRequired'))
      return
    }

    if (playerCount > maxPlayers) {
      this.store.setError(this.i18n.t('config.validation.maxPlayersExceeded'))
      return
    }

    this.facade.startGame(lobby.code)
  }

  endLobby() {
    const code = this.store.lobby()?.code
    if (!code) return
    this.facade.endLobby(code)
  }

  setPokerVariant(pokerVariant: 'texasHoldem') {
    this.updateConfigIfHost({
      gameType: 'poker',
      pokerVariant,
      holdemLimitMode: 'noLimit',
    })
  }

  setHoldemLimitMode(holdemLimitMode: HoldemLimitMode) {
    const lobby = this.store.lobby()

    if (!lobby || lobby.config.pokerVariant !== 'texasHoldem') {
      return
    }

    if (holdemLimitMode === 'fixedLimit') {
      const baseSmallBet = Math.max(2, Math.floor(lobby.config.smallBlind))
      const nextSmallBet = baseSmallBet + (baseSmallBet % 2)
      const nextBigBet = nextSmallBet * 2
      const nextBuyIn = Math.max(lobby.config.buyIn, nextBigBet)

      this.updateConfigIfHost({
        holdemLimitMode,
        smallBlind: nextSmallBet,
        bigBlind: nextBigBet,
        buyIn: nextBuyIn,
      })
      return
    }

    this.updateConfigIfHost({ holdemLimitMode })
  }

  setMaxPlayers(maxPlayers: number) {
    const nextValue = Number.isFinite(maxPlayers)
      ? Math.max(2, Math.min(10, Math.floor(maxPlayers)))
      : 9

    this.updateConfigIfHost({ maxPlayers: nextValue })
  }

  setBuyIn(buyIn: number) {
    const lobby = this.store.lobby()
    if (!lobby) return

    const nextValue = Number.isFinite(buyIn)
      ? Math.max(lobby.config.bigBlind, Math.floor(buyIn))
      : lobby.config.buyIn

    this.updateConfigIfHost({ buyIn: nextValue })
  }

  setSmallBlind(smallBlind: number) {
    const lobby = this.store.lobby()
    if (!lobby) return

    if (lobby.config.holdemLimitMode === 'fixedLimit') {
      const parsedSmallBet = Number.isFinite(smallBlind)
        ? Math.max(2, Math.floor(smallBlind))
        : Math.max(2, lobby.config.smallBlind)
      const nextSmallBet = parsedSmallBet + (parsedSmallBet % 2)
      const nextBigBet = nextSmallBet * 2
      const nextBuyIn = Math.max(lobby.config.buyIn, nextBigBet)

      this.updateConfigIfHost({
        smallBlind: nextSmallBet,
        bigBlind: nextBigBet,
        buyIn: nextBuyIn,
      })
      return
    }

    const nextSmallBlind = Number.isFinite(smallBlind)
      ? Math.max(1, Math.floor(smallBlind))
      : lobby.config.smallBlind

    const nextBigBlind = Math.max(lobby.config.bigBlind, nextSmallBlind)
    const nextBuyIn = Math.max(lobby.config.buyIn, nextBigBlind)

    this.updateConfigIfHost({
      smallBlind: nextSmallBlind,
      bigBlind: nextBigBlind,
      buyIn: nextBuyIn,
    })
  }

  setBigBlind(bigBlind: number) {
    const lobby = this.store.lobby()
    if (!lobby) return

    if (lobby.config.holdemLimitMode === 'fixedLimit') {
      const parsedBigBet = Number.isFinite(bigBlind)
        ? Math.max(4, Math.floor(bigBlind))
        : Math.max(4, lobby.config.bigBlind)
      const nextBigBet = parsedBigBet + (parsedBigBet % 2)
      const nextSmallBet = Math.max(2, Math.floor(nextBigBet / 2))
      const nextBuyIn = Math.max(lobby.config.buyIn, nextBigBet)

      this.updateConfigIfHost({
        smallBlind: nextSmallBet,
        bigBlind: nextBigBet,
        buyIn: nextBuyIn,
      })
      return
    }

    const nextBigBlind = Number.isFinite(bigBlind)
      ? Math.max(lobby.config.smallBlind, Math.floor(bigBlind))
      : lobby.config.bigBlind

    const nextBuyIn = Math.max(lobby.config.buyIn, nextBigBlind)

    this.updateConfigIfHost({ bigBlind: nextBigBlind, buyIn: nextBuyIn })
  }

  setAutomaticBlindIncreaseEnabled(enabled: boolean) {
    this.updateConfigIfHost({ automaticBlindIncreaseEnabled: enabled })
  }

  setAutomaticBlindIncreaseMode(mode: AutomaticBlindIncreaseMode | string) {
    const nextMode = mode === 'dealerRounds' ? mode : 'time'

    this.updateConfigIfHost({
      automaticBlindIncreaseMode: nextMode,
      automaticBlindIncreaseValue: nextMode === 'dealerRounds' ? 1 : 5,
    })
  }

  setAutomaticBlindIncreaseValue(value: number) {
    const lobby = this.store.lobby()
    if (!lobby) return

    const nextValue = Number.isFinite(value)
      ? Math.max(1, Math.floor(value))
      : lobby.config.automaticBlindIncreaseValue

    this.updateConfigIfHost({ automaticBlindIncreaseValue: nextValue })
  }

  setAutomaticBlindIncreaseAmount(value: number) {
    const lobby = this.store.lobby()
    if (!lobby) return

    const nextValue = Number.isFinite(value)
      ? Math.max(1, Math.floor(value))
      : lobby.config.automaticBlindIncreaseAmount

    this.updateConfigIfHost({ automaticBlindIncreaseAmount: nextValue })
  }

  private updateConfigIfHost(patch: Partial<GameConfig>): void {
    const lobby = this.store.lobby()
    if (!lobby || !this.isHost()) return
    this.facade.updateConfig(lobby.code, patch)
  }

  private getLobbyJoinUrl(code: string): string {
    return new URL(`/join/${encodeURIComponent(code)}`, window.location.origin)
      .href
  }

  private showCopiedStatus(): void {
    this.copied.set(true)

    if (this.copiedTimeoutId) {
      clearTimeout(this.copiedTimeoutId)
    }

    this.copiedTimeoutId = setTimeout(() => {
      this.copied.set(false)
      this.copiedTimeoutId = null
    }, 2000)
  }

  sendChatMessageFn(message: string) {
    const lobby = this.store.lobby()
    if (!lobby) return
    this.facade.sendLobbyChatMessage(lobby.code, message)
  }

  setChatSoundEnabledFn(enabled: boolean) {
    this.chatSoundEnabledSignal.set(enabled)
    this.session.setChatSoundEnabled(enabled)
  }
}
