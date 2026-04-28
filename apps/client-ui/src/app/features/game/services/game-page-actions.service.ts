import { Injectable } from '@angular/core'
import { GameFacadeService } from '../../../core/services/game-facade.service'
import { AppStore } from '../../../core/state/app.store'

@Injectable()
export class GamePageActionsService {
  constructor(
    private readonly store: AppStore,
    private readonly facade: GameFacadeService,
  ) {}

  setAudioVolume(volume: number) {
    this.facade.setSpeechVolume(volume)
  }

  setAudioSpeed(speed: number) {
    this.facade.setSpeechRate(speed)
  }

  fold() {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.fold(code)
  }

  check() {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.check(code)
  }

  call() {
    const state = this.store.gameState()
    const code = state?.lobbyCode
    const amount = state?.currentRound?.availableActions?.callAmount

    if (!code) {
      return
    }

    this.facade.call(code, amount)
  }

  raise(amount: number) {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.raise(code, amount)
  }

  allIn() {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.allIn(code)
  }

  toggleAudio(enabled: boolean) {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.setReadLogEnabled(state.lobbyCode, enabled)
  }

  endLobby() {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.endLobby(state.lobbyCode)
  }

  reopenLobby() {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.reopenLobby(state.lobbyCode)
  }

  joinReplayLobby() {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.joinReplayLobby(state.lobbyCode)
  }

  setSpectatorChatAllowed(enabled: boolean, isHost: boolean) {
    if (!isHost) {
      return
    }

    const code = this.store.gameState()?.lobbyCode ?? this.store.lobby()?.code

    if (!code) {
      return
    }

    this.facade.updateConfig(code, { allowSpectatorChat: enabled })
  }

  sendChatMessage(
    text: string,
    selfRole: 'player.host' | 'player' | 'spectator',
    spectatorChatAllowed: boolean,
  ) {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    if (selfRole === 'spectator' && !spectatorChatAllowed) {
      return
    }

    const code = state.lobbyCode

    if (!code) {
      return
    }

    this.facade.sendChatMessage(code, text)
  }
}
