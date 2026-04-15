import type {
  PokerGameState,
  PokerGameViewState,
  RoundPlayerViewState,
  RoundViewState,
} from '@poker/shared'

const toRoundPlayerView = (
  player: NonNullable<PokerGameState['currentRound']>['players'][number],
  selfPlayerId: string,
): RoundPlayerViewState => ({
  playerId: player.playerId,
  hand:
    player.playerId === selfPlayerId || player.holeCardsRevealed
      ? player.hand
      : [],
  handCount: player.hand.length,
  stack: player.stack,
  currentBet: player.currentBet,
  totalCommitted: player.totalCommitted,
  folded: player.folded,
  isAllIn: player.isAllIn,
  holeCardsRevealed: player.holeCardsRevealed,
  lastAction: player.lastAction,
  wonChips: player.wonChips,
})

const toRoundView = (
  round: NonNullable<PokerGameState['currentRound']>,
  selfPlayerId: string,
): RoundViewState => ({
  handNumber: round.handNumber,
  roundNumber: round.roundNumber,
  dealerIndex: round.dealerIndex,
  activePlayerId: round.activePlayerId,
  smallBlindPlayerId: round.smallBlindPlayerId,
  bigBlindPlayerId: round.bigBlindPlayerId,
  currentBet: round.currentBet,
  minimumRaise: round.minimumRaise,
  street: round.street,
  communityCards: round.communityCards,
  deckRemainderCount: round.deckRemainderCount,
  players: round.players.map((player) =>
    toRoundPlayerView(player, selfPlayerId),
  ),
  pots: round.pots,
  potTotal: round.potTotal,
  availableActions: round.availableActions[selfPlayerId] ?? null,
})

export const createGameStateView = (
  state: PokerGameState,
  selfPlayerId: string,
  spectators: string[],
  playerPresence: Record<string, 'online' | 'away' | 'offline'>,
): PokerGameViewState => ({
  selfPlayerId,
  lobbyCode: state.lobbyCode,
  lobbyStatus: state.lobbyStatus,
  config: state.config,
  randomizerPoolSpecialCards: state.randomizerPoolSpecialCards,
  players: state.players.map((player) => ({
    ...player,
    presence: playerPresence[player.playerId] ?? 'offline',
  })),
  spectators,
  phase: state.phase,
  maxRounds: state.maxRounds,
  currentRound: state.currentRound
    ? toRoundView(state.currentRound, selfPlayerId)
    : null,
  previousRoundRevealedCards: state.previousRoundRevealedCards,
  playerInteractionStats: state.playerInteractionStats.map((entry) => ({
    playerId: entry.playerId,
    totalInteractionTimeMs: entry.totalInteractionTimeMs,
    interactionCount: entry.interactionCount,
  })),
  scoreboard: state.scoreboard,
  logs: state.logs.map((entry) => ({
    ...entry,
    colorKey: 'gray',
    borderColorKey: 'gray',
  })),
  chatMessages: state.chatMessages,
  pendingDecision: null,
  resolvedCardEffects: [],
  winnerPlayerIds: state.winnerPlayerIds,
  createdAt: state.createdAt,
  updatedAt: state.updatedAt,
})
