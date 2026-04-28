import type { Card, SpecialCardKey, Suit } from '../cards.js'
import { isNumberCard } from '../cards.js'
import { dealCards } from './deal.js'
import { createDeck } from './deck.js'
import { shuffleArray } from './random.js'
import type { RoundPlayerState, RoundState } from './round.js'
import type { PokerGameState } from './state.js'

export interface SetupRoundInput {
  lobbyCode: string
  players: Array<{
    playerId: string
    name: string
    connected: boolean
    isHost: boolean
    readLogEnabled: boolean
    seatIndex: number
  }>
  currentRoundNumber: number
  dealerIndex: number
  includedSpecialCards: ReadonlyArray<SpecialCardKey>
  random?: () => number
}

const getTrumpSuit = (trumpCard: Card | null): Suit | null => {
  if (!trumpCard) {
    return null
  }

  if (isNumberCard(trumpCard)) {
    return trumpCard.suit
  }

  return null
}

export const calculateMaxPossibleRounds = (
  playerCount: number,
  includedSpecialCards: ReadonlyArray<SpecialCardKey>,
): number => {
  const hasDarkEye = includedSpecialCards.includes('darkEye')
  const totalDeckSize = 60 + includedSpecialCards.length

  // Official rule (3-6 players): round count is based on the 60 base cards.
  if (playerCount >= 3 && playerCount <= 6) {
    let maxRounds = Math.floor(60 / playerCount)

    // Dark Eye reduction only applies if no card would remain after dealing,
    // even when the final round can run without a trump card.
    if (hasDarkEye) {
      const cardsUsedInFinalRound = maxRounds * playerCount
      const remainingCards = totalDeckSize - cardsUsedInFinalRound
      if (remainingCards === 0) {
        maxRounds -= 1
      }
    }

    return maxRounds
  } else {
    // Unofficial rule (2 players or 7+ players): deck size depends on special cards
    let maxRounds = Math.floor(totalDeckSize / playerCount)

    // Dark Eye reduction only applies if no card would remain after dealing,
    // even when the final round can run without a trump card.
    if (hasDarkEye) {
      const cardsUsedInFinalRound = maxRounds * playerCount
      const remainingCards = totalDeckSize - cardsUsedInFinalRound
      if (remainingCards === 0) {
        maxRounds -= 1
      }
    }

    return maxRounds
  }
}

const isDarkEyeOnlyFinalRound = (input: SetupRoundInput): boolean => {
  // Only applies if Dark Eye is in the special cards
  const hasDarkEye = input.includedSpecialCards.includes('darkEye')
  if (!hasDarkEye) {
    return false
  }

  const currentRoundMaxRounds = calculateMaxPossibleRounds(
    input.players.length,
    input.includedSpecialCards,
  )

  // Check if we're in the final round
  if (input.currentRoundNumber !== currentRoundMaxRounds) {
    return false
  }

  // Calculate remaining cards after dealing in the final round
  const deckSize = 60 + input.includedSpecialCards.length

  const cardsUsedInFinalRound = input.currentRoundNumber * input.players.length
  const remainingCards = deckSize - cardsUsedInFinalRound

  // If exactly 1 card remains after dealing, no trump card should be set
  // (the remaining card is needed for Dark Eye to draw from)
  return remainingCards === 1
}

export const setupRound = (input: SetupRoundInput): RoundState => {
  const cardsPerPlayer = input.currentRoundNumber
  const playerIds = input.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => player.playerId)

  const deck = shuffleArray(
    createDeck({
      includedSpecials: input.includedSpecialCards,
    }),
    input.random,
  )

  const dealResult = dealCards(deck, playerIds, cardsPerPlayer)
  const keepTrumpCardInDeck = isDarkEyeOnlyFinalRound(input)

  const trumpCard = keepTrumpCardInDeck ? null : dealResult.trumpCard
  const drawPile = keepTrumpCardInDeck
    ? dealResult.trumpCard
      ? [dealResult.trumpCard, ...dealResult.remainingDeck]
      : dealResult.remainingDeck
    : dealResult.remainingDeck

  const players: RoundPlayerState[] = playerIds.map((playerId) => ({
    playerId,
    hand: dealResult.hands[playerId],
    stack: 0,
    currentBet: 0,
    totalCommitted: 0,
    folded: false,
    isAllIn: false,
    hasActed: false,
    holeCardsRevealed: false,
    lastAction: null,
    wonChips: 0,
    tricksWon: 0,
    prediction: null,
  }))

  const roundLeaderIndex = (input.dealerIndex + 1) % playerIds.length
  const roundLeaderPlayerId = playerIds[roundLeaderIndex] ?? null

  return {
    handNumber: input.currentRoundNumber,
    roundNumber: input.currentRoundNumber,
    dealerIndex: input.dealerIndex,
    activePlayerId: roundLeaderPlayerId,
    smallBlindPlayerId: null,
    bigBlindPlayerId: null,
    currentBet: 0,
    minimumRaise: 0,
    raisesThisStreet: 0,
    street: 'preflop',
    communityCards: [],
    burnCards: [],
    roundLeaderPlayerId,
    trumpSuit: getTrumpSuit(trumpCard),
    trumpCard,
    drawPile,
    deckRemainderCount: drawPile.length,
    players,
    pots: [],
    potTotal: 0,
    availableActions: {},
    currentTrick: null,
    completedTricks: [],
  }
}

export const createInitialGameState = (input: {
  lobbyCode: string
  config: PokerGameState['config']
  randomizerPoolSpecialCards: PokerGameState['randomizerPoolSpecialCards']
  players: PokerGameState['players']
}): PokerGameState => {
  const maxRounds = calculateMaxPossibleRounds(
    input.players.length,
    input.config.includedSpecialCards,
  )
  const createdAt = new Date().toISOString()

  return {
    lobbyCode: input.lobbyCode,
    lobbyStatus: 'running',
    config: input.config,
    automaticBlindIncrease: {
      timeWindowStartedAt: createdAt,
      handsSinceLastIncrease: 0,
    },
    randomizerPoolSpecialCards: input.randomizerPoolSpecialCards,
    players: input.players,
    playerInteractionStats: input.players.map((player) => ({
      playerId: player.playerId,
      totalInteractionTimeMs: 0,
      interactionCount: 0,
      pendingInteractionStartedAt: null,
    })),
    phase: 'waiting',
    maxRounds,
    currentRound: null,
    previousRoundRevealedCards: null,
    scoreboard: [],
    logs: [],
    chatMessages: [],
    pendingDecision: null,
    resolvedCardEffects: [],
    winnerPlayerIds: [],
    createdAt,
    updatedAt: createdAt,
  }
}
