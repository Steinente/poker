export const APP_DEFAULT_LANGUAGE = 'de'

const resolveSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'
  }

  // Keep local dev working with ng serve on :4200 and server on :3000.
  if (
    window.location.hostname === 'localhost' &&
    window.location.port === '4200'
  ) {
    return 'http://localhost:3000'
  }

  // In Docker/prod we use same-origin and let nginx proxy /socket.io to the server.
  return window.location.origin
}

export const SOCKET_URL = resolveSocketUrl()
export const SESSION_TOKEN_KEY = 'steinente.poker.sessionToken'
export const PLAYER_NAME_KEY = 'steinente.playerName'
export const LAST_LOBBY_CODE_KEY = 'steinente.poker.lastLobbyCode'
export const LOBBY_CONFIG_KEY = 'steinente.poker.lobbyConfig'
export const READ_LOG_ENABLED_KEY = 'steinente.poker.readLogEnabled'
export const SPEECH_VOLUME_KEY = 'steinente.poker.speechVolume'
export const SPEECH_RATE_KEY = 'steinente.poker.speechRate'
export const BING_ENABLED_KEY = 'steinente.poker.bingEnabled'
export const RAISE_SOUND_ENABLED_KEY = 'steinente.poker.raiseSoundEnabled'
export const LANGUAGE_KEY = 'steinente.language'
export const PANEL_SETTINGS_VISIBLE_KEY = 'steinente.poker.panelSettingsVisible'
export const PANEL_PLAYERS_VISIBLE_KEY = 'steinente.poker.panelPlayersVisible'
export const PANEL_SCOREBOARD_VISIBLE_KEY =
  'steinente.poker.panelScoreboardVisible'
export const PANEL_LOG_VISIBLE_KEY = 'steinente.poker.panelLogVisible'
export const PANEL_PREVIOUS_VISIBLE_KEY = 'steinente.poker.panelPreviousVisible'
export const PANEL_CHAT_VISIBLE_KEY = 'steinente.poker.panelChatVisible'
export const LOG_SHOW_TIMESTAMP_KEY = 'steinente.poker.logShowTimestamp'
export const SCOREBOARD_A11Y_MODE_KEY = 'steinente.poker.scoreboardA11yMode'
export const SCOREBOARD_A11Y_ROUND_SCOPE_KEY =
  'steinente.poker.scoreboardA11yRoundScope'
export const CHAT_SOUND_ENABLED_KEY = 'steinente.poker.chatSoundEnabled'
export const RAISE_INPUT_MODE_KEY = 'steinente.poker.raiseInputMode'
