export interface DeviceSwitchToken {
  token: string
  code: string
  expiresAt: string
}

export interface DeviceSwitchTokenResponse {
  token: string
  url: string
  expiresAt: string
  expiresInSeconds: number
}

export interface DeviceSwitchRequest {
  code: string
  sessionToken: string
}

export interface DeviceSwitchConfirm {
  token: string
  code: string
  sessionToken: string
  confirmed: boolean
}

export interface DeviceSwitchCompletePayload {
  token: string
  newSessionToken: string
}

export interface DeviceSwitchStatusPayload {
  playerName: string
  lobbyCode: string
  switchPending: boolean
}

export interface DeviceSwitchConfirmationRequest {
  token: string
  code: string
  message: string
}
