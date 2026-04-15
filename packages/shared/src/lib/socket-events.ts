import type {
  DeviceSwitchCompletePayload,
  DeviceSwitchConfirm,
  DeviceSwitchConfirmationRequest,
  DeviceSwitchRequest,
  DeviceSwitchTokenResponse,
} from './device-switch.js'
import type { GameConfig } from './game-config.js'
import type { PokerGameViewState } from './game/state-view.js'
import type { LobbySummary } from './lobby.js'

export interface ClientToServerEvents {
  'lobby:list': () => void

  'lobby:create': (payload: {
    playerName: string
    sessionToken: string
    password?: string
    config?: Partial<GameConfig>
  }) => void

  'lobby:join': (payload: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }) => void

  'lobby:spectate': (payload: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }) => void

  'lobby:reconnect': (payload: { code: string; sessionToken: string }) => void

  'lobby:leave': (payload: { code: string; sessionToken: string }) => void

  'lobby:reopen': (payload: { code: string; sessionToken: string }) => void

  'lobby:joinReplay': (payload: { code: string; sessionToken: string }) => void

  'lobby:updateConfig': (payload: {
    code: string
    sessionToken: string
    config: Partial<GameConfig>
  }) => void

  'lobby:kickPlayer': (payload: {
    code: string
    sessionToken: string
    targetPlayerId: string
  }) => void

  'lobby:end': (payload: { code: string; sessionToken: string }) => void

  'lobby:sendChatMessage': (payload: {
    code: string
    sessionToken: string
    text: string
  }) => void

  'game:start': (payload: { code: string; sessionToken: string }) => void

  'game:fold': (payload: { code: string; sessionToken: string }) => void

  'game:check': (payload: { code: string; sessionToken: string }) => void

  'game:call': (payload: {
    code: string
    sessionToken: string
    amount?: number
  }) => void

  'game:raise': (payload: {
    code: string
    sessionToken: string
    amount: number
  }) => void

  'game:allIn': (payload: { code: string; sessionToken: string }) => void

  'game:sendChatMessage': (payload: {
    code: string
    sessionToken: string
    text: string
  }) => void

  'player:setReadLogEnabled': (payload: {
    code: string
    sessionToken: string
    enabled: boolean
  }) => void

  'player:setInGame': (payload: {
    code: string
    sessionToken: string
    inGame: boolean
  }) => void

  'device:generateSwitchToken': (payload: DeviceSwitchRequest) => void
  'device:confirmSwitch': (payload: DeviceSwitchConfirm) => void
  'device:completeSwitch': (payload: DeviceSwitchCompletePayload) => void
}

export interface ServerToClientEvents {
  'lobby:list': (payload: { lobbies: LobbySummary[] }) => void

  'lobby:created': (payload: { lobby: LobbySummary; playerId: string }) => void
  'lobby:joined': (payload: { lobby: LobbySummary; playerId: string }) => void
  'lobby:updated': (payload: { lobby: LobbySummary }) => void
  'lobby:closed': (payload: { code: string; reason: string }) => void

  'game:state': (payload: { state: PokerGameViewState }) => void
  'game:event': (payload: {
    type:
      | 'handStarted'
      | 'playerActed'
      | 'streetChanged'
      | 'showdownResolved'
      | 'readLogPreferenceChanged'
    messageKey: string
    params?: Record<string, string | number | boolean | null>
  }) => void

  'device:switchTokenGenerated': (payload: DeviceSwitchTokenResponse) => void
  'device:requestConfirmation': (
    payload: DeviceSwitchConfirmationRequest,
  ) => void
  'device:switchCompleted': (payload: {
    success: boolean
    reason?: 'superseded'
  }) => void
  'device:disconnected': (payload: { reason: string }) => void

  'error:message': (payload: { message: string; code?: string }) => void
}
