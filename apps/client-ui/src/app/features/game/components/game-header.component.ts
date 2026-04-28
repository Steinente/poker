import { Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { Router } from '@angular/router'
import type { PokerGameViewState } from '@poker/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { GameFacadeService } from '../../../core/services/game-facade.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { PanelSettingsComponent } from './panel-settings.component'

type HeaderRuleItem = {
  id:
    | 'pokerVariant'
    | 'holdemLimitMode'
    | 'maxPlayers'
    | 'buyIn'
    | 'blinds'
    | 'spectatorChat'
  label: string
  value: string
}

@Component({
  selector: 'poker-game-header',
  standalone: true,
  imports: [TPipe, PanelSettingsComponent],
  templateUrl: './game-header.component.html',
  styleUrls: ['./game-header.component.css'],
})
export class GameHeaderComponent {
  private readonly i18n = inject(I18nService)
  private readonly router = inject(Router)
  private readonly facade = inject(GameFacadeService)
  showSpectators = false

  @Input({ required: true }) state!: PokerGameViewState
  @Input({ required: true }) settingsVisible = true
  @Input({ required: true }) playersVisible = true
  @Input({ required: true }) logVisible = true
  @Input({ required: true }) previousVisible = true
  @Input({ required: true }) chatVisible = true

  @Output() readonly panelSettingsChange = new EventEmitter<boolean>()
  @Output() readonly panelPlayersChange = new EventEmitter<boolean>()
  @Output() readonly panelLogChange = new EventEmitter<boolean>()
  @Output() readonly panelPreviousChange = new EventEmitter<boolean>()
  @Output() readonly panelChatChange = new EventEmitter<boolean>()
  @Output() readonly homeButtonUserGesture = new EventEmitter<void>()
  @Output() readonly deviceSwitchRequested = new EventEmitter<void>()

  private get currentRound() {
    return this.state.currentRound
  }

  get translatedPhase() {
    return this.i18n.t(`phase.${this.state.phase}` as TranslationKey)
  }

  get ruleItems(): HeaderRuleItem[] {
    return [
      {
        id: 'pokerVariant',
        label: this.i18n.t('pokerVariantLabel'),
        value: "Texas Hold'em",
      },
      {
        id: 'holdemLimitMode',
        label: this.i18n.t('holdemLimitModeLabel'),
        value:
          this.state.config.holdemLimitMode === 'fixedLimit'
            ? this.i18n.t('holdemLimitModeFixedLimit')
            : this.state.config.holdemLimitMode === 'potLimit'
              ? this.i18n.t('holdemLimitModePotLimit')
              : this.i18n.t('holdemLimitModeNoLimit'),
      },
      {
        id: 'maxPlayers',
        label: this.i18n.t('maxPlayersLabel'),
        value: String(this.state.config.maxPlayers),
      },
      {
        id: 'buyIn',
        label: this.i18n.t('buyInLabel'),
        value: String(this.state.config.buyIn),
      },
      {
        id: 'blinds',
        label: this.i18n.t('blinds'),
        value: `${this.state.config.smallBlind}/${this.state.config.bigBlind}`,
      },
      {
        id: 'spectatorChat',
        label: this.i18n.t('spectators'),
        value: this.state.config.allowSpectatorChat
          ? this.i18n.t('spectatorChatEnabled')
          : this.i18n.t('spectatorChatDisabled'),
      },
    ]
  }

  get roundLabel() {
    return this.currentRound?.roundNumber ?? '-'
  }

  get deckLabel() {
    return this.currentRound?.deckRemainderCount ?? '-'
  }

  get showDeckBadge() {
    return true
  }

  get spectatorCount() {
    return this.state.spectators.length
  }

  get spectatorNames() {
    return this.state.spectators.join(', ')
  }

  toggleSpectators() {
    this.showSpectators = !this.showSpectators
  }

  onDeviceSwitch() {
    this.deviceSwitchRequested.emit()
  }

  isSpectator() {
    return !this.state.players.some(
      (player) => player.playerId === this.state.selfPlayerId,
    )
  }

  confirmLeaveGame() {
    if (this.isSpectator()) {
      this.facade.leaveLobby(this.state.lobbyCode)
      this.router.navigateByUrl('/')
      return
    }

    if (this.state.phase === 'finished') {
      this.facade.setInGame(this.state.lobbyCode, false)
      this.facade.leaveLobby(this.state.lobbyCode)
      this.facade.clearReconnectLobbyCode()
      this.router.navigateByUrl('/')
      return
    }

    const confirmed = window.confirm(this.i18n.t('confirmLeaveGame'))

    if (confirmed) {
      this.facade.setInGame(this.state.lobbyCode, false)
      this.router.navigateByUrl('/')
    }
  }
}
