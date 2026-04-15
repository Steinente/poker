import type { ClientToServerEvents, ServerToClientEvents } from '@poker/shared'
import type { Socket } from 'socket.io'

export type PokerSocket = Socket<ClientToServerEvents, ServerToClientEvents>


