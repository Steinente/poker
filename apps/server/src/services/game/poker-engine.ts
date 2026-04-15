import type {
  Card,
  GameConfig,
  GamePlayerMeta,
  PlayerActionAvailability,
  PlayerActionRecord,
  PokerGameState,
  PotState,
  RoundPlayerState,
  RoundState,
  Suit,
} from '@poker/shared'
import crypto from 'node:crypto'

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

type HandScore = {
  category: number
  ranks: number[]
}

export type HandRankKey =
  | 'royalFlush'
  | 'straightFlush'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeOfAKind'
  | 'twoPair'
  | 'onePair'
  | 'highCard'

const createCard = (suit: Suit, value: number): Card => ({
  id: crypto.randomUUID(),
  type: 'number',
  suit,
  value,
  labelKey: `card.${suit}.${value}`,
})

export const createShuffledDeck = (): Card[] => {
  const deck = SUITS.flatMap((suit) =>
    RANKS.map((value) => createCard(suit, value)),
  )

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }

  return deck
}

const isEligibleForHand = (player: GamePlayerMeta) =>
  player.chips > 0 && !player.eliminated

const liveRoundPlayers = (round: RoundState) =>
  round.players.filter((player) => player.hand.length > 0)

const contestingPlayers = (round: RoundState) =>
  liveRoundPlayers(round).filter((player) => !player.folded)

const actionablePlayers = (round: RoundState) =>
  contestingPlayers(round).filter((player) => !player.isAllIn)

const findNextEligibleIndex = (
  players: GamePlayerMeta[],
  startIndex: number,
): number => {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (startIndex + offset + players.length) % players.length
    if (isEligibleForHand(players[index])) {
      return index
    }
  }

  return -1
}

const findNextActingPlayerId = (
  round: RoundState,
  playersMeta: GamePlayerMeta[],
  startSeatIndex: number,
): string | null => {
  for (let offset = 1; offset <= playersMeta.length; offset += 1) {
    const seatIndex =
      (startSeatIndex + offset + playersMeta.length) % playersMeta.length
    const player = round.players.find(
      (entry) =>
        playersMeta[seatIndex]?.playerId === entry.playerId &&
        entry.hand.length > 0 &&
        !entry.folded &&
        !entry.isAllIn,
    )

    if (player) {
      return player.playerId
    }
  }

  return null
}

const applyBlind = (
  round: RoundState,
  playerId: string,
  blindAmount: number,
  type: 'postSmallBlind' | 'postBigBlind',
) => {
  const player = round.players.find((entry) => entry.playerId === playerId)

  if (!player) {
    return
  }

  const amount = Math.min(player.stack, blindAmount)
  player.stack -= amount
  player.currentBet += amount
  player.totalCommitted += amount
  player.isAllIn = player.stack === 0
  player.lastAction = { type, amount }
  round.potTotal += amount
}

const resetBettingStateForStreet = (round: RoundState, keepBlinds = false) => {
  for (const player of round.players) {
    player.currentBet = keepBlinds ? player.currentBet : 0
    player.hasActed = false
    player.wonChips = 0
    if (
      !keepBlinds &&
      player.hand.length > 0 &&
      !player.folded &&
      !player.isAllIn
    ) {
      player.lastAction = null
    }
  }

  if (!keepBlinds) {
    round.currentBet = 0
    round.minimumRaise = 0
    round.raisesThisStreet = 0
  }
}

const getFixedLimitRaiseDelta = (
  config: GameConfig,
  round: RoundState,
): number =>
  round.street === 'turn' || round.street === 'river'
    ? config.bigBlind
    : config.smallBlind

const getPotLimitCap = (round: RoundState, callAmount: number): number =>
  round.currentBet + round.potTotal + callAmount

export const buildActionAvailability = (
  round: RoundState,
  playerId: string,
  config: GameConfig,
): PlayerActionAvailability | null => {
  if (round.activePlayerId !== playerId) {
    return null
  }

  const player = round.players.find((entry) => entry.playerId === playerId)

  if (!player || player.folded || player.isAllIn || player.hand.length === 0) {
    return null
  }

  const callAmount = Math.max(0, round.currentBet - player.currentBet)
  const stackCapRaiseTo = player.currentBet + player.stack
  const mode = config.holdemLimitMode

  let minRaiseTo: number | null
  let maxRaiseTo: number
  let raiseStep: number
  let canRaise: boolean

  if (mode === 'fixedLimit') {
    const fixedRaiseDelta = getFixedLimitRaiseDelta(config, round)
    const fixedTargetBet = round.currentBet + fixedRaiseDelta
    const raiseCapReached = round.raisesThisStreet >= 3

    raiseStep = fixedRaiseDelta
    minRaiseTo =
      !raiseCapReached &&
      player.stack > callAmount &&
      stackCapRaiseTo >= fixedTargetBet
        ? fixedTargetBet
        : null
    maxRaiseTo = minRaiseTo ?? stackCapRaiseTo
    canRaise = minRaiseTo !== null
  } else {
    const isOpeningBet = round.currentBet === 0
    const minimumRaiseDelta = Math.max(1, round.minimumRaise)
    const candidateMinRaiseTo = isOpeningBet
      ? config.bigBlind
      : round.currentBet + minimumRaiseDelta
    const modeMaxRaiseTo =
      mode === 'potLimit'
        ? Math.min(stackCapRaiseTo, getPotLimitCap(round, callAmount))
        : stackCapRaiseTo

    raiseStep = 1
    minRaiseTo =
      modeMaxRaiseTo >= candidateMinRaiseTo && player.stack > callAmount
        ? candidateMinRaiseTo
        : null
    maxRaiseTo = modeMaxRaiseTo
    canRaise = minRaiseTo !== null
  }

  const allInTargetBet = stackCapRaiseTo
  const canAllIn =
    mode === 'fixedLimit'
      ? player.stack > 0 && player.stack <= callAmount
      : mode === 'potLimit'
        ? player.stack > 0 &&
          (allInTargetBet <= player.currentBet + callAmount ||
            allInTargetBet <= maxRaiseTo)
        : player.stack > 0

  return {
    canFold: true,
    canCheck: callAmount === 0,
    callAmount,
    minRaiseTo,
    maxRaiseTo,
    raiseStep,
    canRaise,
    canAllIn,
  }
}

const rebuildAvailableActions = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  const entries = round.players
    .map(
      (player) =>
        [
          player.playerId,
          buildActionAvailability(round, player.playerId, state.config),
        ] as const,
    )
    .filter(
      (entry): entry is [string, PlayerActionAvailability] => entry[1] !== null,
    )
  round.availableActions = Object.fromEntries(entries)
}

const syncMetaChips = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  for (const player of state.players) {
    const roundPlayer = round.players.find(
      (entry) => entry.playerId === player.playerId,
    )

    if (!roundPlayer) {
      continue
    }

    player.chips = roundPlayer.stack
  }
}

const markSettledEliminations = (state: PokerGameState) => {
  const stillAliveCount = state.players.filter(
    (player) => !player.eliminated && player.chips > 0,
  ).length
  const newlyEliminated = state.players.filter(
    (player) => !player.eliminated && player.chips <= 0,
  )

  if (newlyEliminated.length === 0) {
    return
  }

  const finishPlace = Math.max(1, stillAliveCount + 1)

  for (const player of newlyEliminated) {
    player.eliminated = true
    player.finishPlace = player.finishPlace ?? finishPlace
  }
}

const markWinnerIfTournamentComplete = (state: PokerGameState) => {
  const eligiblePlayers = state.players.filter(isEligibleForHand)

  if (eligiblePlayers.length > 1) {
    return false
  }

  for (const player of eligiblePlayers) {
    player.finishPlace = 1
  }

  state.phase = 'finished'
  state.currentRound = null
  state.winnerPlayerIds = eligiblePlayers.map((player) => player.playerId)
  state.lobbyStatus = 'finished'
  return true
}

const addCommunityCards = (round: RoundState, count: number) => {
  const burn = round.drawPile.shift()
  if (burn) {
    round.burnCards.push(burn)
  }

  for (let index = 0; index < count; index += 1) {
    const card = round.drawPile.shift()
    if (card) {
      round.communityCards.push(card)
    }
  }

  round.deckRemainderCount = round.drawPile.length
}

export const shouldForceShowdown = (round: RoundState) =>
  contestingPlayers(round).length > 1 && actionablePlayers(round).length <= 1

export const dealRemainingCommunityCards = (state: PokerGameState): Card[] => {
  const round = state.currentRound

  if (!round) {
    return []
  }

  const revealedCards: Card[] = []

  const revealForStreet = (
    street: RoundState['street'],
    phase: PokerGameState['phase'],
    count: number,
  ) => {
    const previousCount = round.communityCards.length
    addCommunityCards(round, count)
    revealedCards.push(...round.communityCards.slice(previousCount))
    round.street = street
    state.phase = phase
  }

  if (round.communityCards.length < 3) {
    revealForStreet('flop', 'flop', 3 - round.communityCards.length)
  }

  if (round.communityCards.length < 4) {
    revealForStreet('turn', 'turn', 1)
  }

  if (round.communityCards.length < 5) {
    revealForStreet('river', 'river', 1)
  }

  round.activePlayerId = null
  round.availableActions = {}
  return revealedCards
}

const buildSidePots = (players: RoundPlayerState[]): PotState[] => {
  const commitments = players
    .filter((player) => player.totalCommitted > 0)
    .map((player) => player.totalCommitted)
    .filter((amount, index, values) => values.indexOf(amount) === index)
    .sort((left, right) => left - right)

  const pots: PotState[] = []
  let previous = 0

  for (const threshold of commitments) {
    const contributors = players.filter(
      (player) => player.totalCommitted >= threshold,
    )
    const eligiblePlayerIds = contributors
      .filter((player) => !player.folded)
      .map((player) => player.playerId)

    const amount = (threshold - previous) * contributors.length

    if (amount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({ amount, eligiblePlayerIds })
    }

    previous = threshold
  }

  return pots
}

const compareScores = (left: HandScore, right: HandScore) => {
  if (left.category !== right.category) {
    return left.category - right.category
  }

  const length = Math.max(left.ranks.length, right.ranks.length)

  for (let index = 0; index < length; index += 1) {
    const delta = (left.ranks[index] ?? 0) - (right.ranks[index] ?? 0)
    if (delta !== 0) {
      return delta
    }
  }

  return 0
}

const getStraightHighCard = (values: number[]): number | null => {
  const unique = [...new Set(values)].sort((left, right) => right - left)

  if (unique.includes(14)) {
    unique.push(1)
  }

  for (let index = 0; index <= unique.length - 5; index += 1) {
    const slice = unique.slice(index, index + 5)
    const isStraight = slice.every(
      (value, valueIndex) =>
        valueIndex === 0 || slice[valueIndex - 1] - value === 1,
    )

    if (isStraight) {
      return slice[0]
    }
  }

  return null
}

const evaluateFiveCards = (cards: Card[]): HandScore => {
  const suitedNumberCards = cards.filter(
    (card): card is Extract<Card, { type: 'number' }> => card.type === 'number',
  )
  const values = suitedNumberCards
    .map((card) => card.value)
    .sort((left, right) => right - left)
  const suits = suitedNumberCards.map((card) => card.suit)
  const counts = new Map<number, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const groups = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return right[0] - left[0]
  })

  const flush = suits.every((suit) => suit === suits[0])
  const straightHigh = getStraightHighCard(values)

  if (flush && straightHigh !== null) {
    return { category: 8, ranks: [straightHigh] }
  }

  if (groups[0]?.[1] === 4) {
    return { category: 7, ranks: [groups[0][0], groups[1][0]] }
  }

  if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    return { category: 6, ranks: [groups[0][0], groups[1][0]] }
  }

  if (flush) {
    return { category: 5, ranks: values }
  }

  if (straightHigh !== null) {
    return { category: 4, ranks: [straightHigh] }
  }

  if (groups[0]?.[1] === 3) {
    return {
      category: 3,
      ranks: [
        groups[0][0],
        ...groups
          .slice(1)
          .map(([value]) => value)
          .sort((left, right) => right - left),
      ],
    }
  }

  if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    const pairs = groups
      .filter(([, count]) => count === 2)
      .map(([value]) => value)
      .sort((left, right) => right - left)
    const kicker = groups.find(([, count]) => count === 1)?.[0] ?? 0
    return { category: 2, ranks: [...pairs, kicker] }
  }

  if (groups[0]?.[1] === 2) {
    return {
      category: 1,
      ranks: [
        groups[0][0],
        ...groups
          .slice(1)
          .map(([value]) => value)
          .sort((left, right) => right - left),
      ],
    }
  }

  return { category: 0, ranks: values }
}

const chooseFiveCardCombos = (cards: Card[]): Card[][] => {
  const results: Card[][] = []

  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            results.push([cards[a], cards[b], cards[c], cards[d], cards[e]])
          }
        }
      }
    }
  }

  return results
}

const evaluateBestHand = (cards: Card[]): HandScore => {
  let best: HandScore | null = null

  for (const combo of chooseFiveCardCombos(cards)) {
    const score = evaluateFiveCards(combo)
    if (!best || compareScores(score, best) > 0) {
      best = score
    }
  }

  return best ?? { category: 0, ranks: [] }
}

export const mapHandRankKey = (score: HandScore): HandRankKey => {
  if (score.category === 8) {
    return score.ranks[0] === 14 ? 'royalFlush' : 'straightFlush'
  }

  switch (score.category) {
    case 7:
      return 'fourOfAKind'
    case 6:
      return 'fullHouse'
    case 5:
      return 'flush'
    case 4:
      return 'straight'
    case 3:
      return 'threeOfAKind'
    case 2:
      return 'twoPair'
    case 1:
      return 'onePair'
    default:
      return 'highCard'
  }
}

export const getPlayerBestHandRankKey = (
  round: RoundState,
  playerId: string,
): HandRankKey => {
  const player = round.players.find((entry) => entry.playerId === playerId)

  if (!player) {
    return 'highCard'
  }

  return mapHandRankKey(evaluateBestHand([...player.hand, ...round.communityCards]))
}

const splitPotRemainderOrder = (
  eligiblePlayerIds: string[],
  players: GamePlayerMeta[],
  dealerIndex: number,
) => {
  const ordered = players.map((player) => player.playerId)
  const rotated = ordered
    .slice(dealerIndex + 1)
    .concat(ordered.slice(0, dealerIndex + 1))

  return rotated.filter((playerId) => eligiblePlayerIds.includes(playerId))
}

const awardPot = (
  round: RoundState,
  playersMeta: GamePlayerMeta[],
  pot: PotState,
) => {
  const eligiblePlayers = round.players.filter((player) =>
    pot.eligiblePlayerIds.includes(player.playerId),
  )
  const scored = eligiblePlayers.map((player) => ({
    playerId: player.playerId,
    score: evaluateBestHand([...player.hand, ...round.communityCards]),
  }))

  let bestScore: HandScore | null = null
  let winnerIds: string[] = []

  for (const entry of scored) {
    if (!bestScore || compareScores(entry.score, bestScore) > 0) {
      bestScore = entry.score
      winnerIds = [entry.playerId]
      continue
    }

    if (bestScore && compareScores(entry.score, bestScore) === 0) {
      winnerIds.push(entry.playerId)
    }
  }

  const splitAmount = Math.floor(pot.amount / winnerIds.length)
  let remainder = pot.amount % winnerIds.length
  const remainderOrder = splitPotRemainderOrder(
    winnerIds,
    playersMeta,
    round.dealerIndex,
  )

  for (const winnerId of winnerIds) {
    const player = round.players.find((entry) => entry.playerId === winnerId)
    if (!player) {
      continue
    }

    player.stack += splitAmount
    player.wonChips += splitAmount
  }

  for (const winnerId of remainderOrder) {
    if (remainder <= 0) {
      break
    }

    const player = round.players.find((entry) => entry.playerId === winnerId)
    if (!player) {
      continue
    }

    player.stack += 1
    player.wonChips += 1
    remainder -= 1
  }

  return winnerIds
}

export const settleShowdown = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  for (const player of round.players) {
    if (!player.folded && player.hand.length > 0) {
      player.holeCardsRevealed = true
    }
  }

  round.pots = buildSidePots(round.players)
  const winnerIds = new Set<string>()

  for (const pot of round.pots) {
    for (const winnerId of awardPot(round, state.players, pot)) {
      winnerIds.add(winnerId)
    }
  }

  syncMetaChips(state)
  markSettledEliminations(state)

  for (const player of state.players) {
    const roundPlayer = round.players.find(
      (entry) => entry.playerId === player.playerId,
    )
    if (roundPlayer && roundPlayer.wonChips > 0) {
      player.handsWon += 1
    }
  }

  state.winnerPlayerIds = [...winnerIds]
}

export const awardUncontestedPot = (
  state: PokerGameState,
  winnerPlayerId: string,
) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  const winner = round.players.find(
    (player) => player.playerId === winnerPlayerId,
  )

  if (!winner) {
    return
  }

  winner.stack += round.potTotal
  winner.wonChips += round.potTotal
  winner.holeCardsRevealed = true
  state.winnerPlayerIds = [winnerPlayerId]
  syncMetaChips(state)
  markSettledEliminations(state)

  const meta = state.players.find(
    (player) => player.playerId === winnerPlayerId,
  )
  if (meta) {
    meta.handsWon += 1
  }
}

export const isBettingRoundComplete = (round: RoundState) => {
  const activePlayers = actionablePlayers(round)

  if (activePlayers.length === 0) {
    return true
  }

  return activePlayers.every(
    (player) => player.hasActed && player.currentBet === round.currentBet,
  )
}

export const startNextHand = (state: PokerGameState) => {
  const eligiblePlayers = state.players.filter(isEligibleForHand)
  const isFixedLimit = state.config.holdemLimitMode === 'fixedLimit'
  // In fixed-limit mode config.smallBlind/config.bigBlind represent small-bet/big-bet.
  // Forced blinds stay at half small-bet / full small-bet to keep preflop structure consistent.
  const fixedLimitSmallBlind = isFixedLimit
    ? Math.max(1, Math.floor(state.config.smallBlind / 2))
    : state.config.smallBlind
  const fixedLimitBigBlind = isFixedLimit
    ? state.config.smallBlind
    : state.config.bigBlind

  if (markWinnerIfTournamentComplete(state)) {
    return
  }

  const previousDealerIndex = state.currentRound?.dealerIndex ?? -1
  const dealerIndex = findNextEligibleIndex(state.players, previousDealerIndex)
  const smallBlindIndex =
    eligiblePlayers.length === 2
      ? dealerIndex
      : findNextEligibleIndex(state.players, dealerIndex)
  const bigBlindIndex = findNextEligibleIndex(state.players, smallBlindIndex)
  const deck = createShuffledDeck()

  const roundPlayers: RoundPlayerState[] = state.players.map((player) => ({
    playerId: player.playerId,
    hand: [],
    stack: player.chips,
    currentBet: 0,
    totalCommitted: 0,
    folded: player.chips <= 0,
    isAllIn: false,
    hasActed: false,
    holeCardsRevealed: false,
    lastAction: null,
    wonChips: 0,
    tricksWon: 0,
    prediction: null,
  }))

  for (let dealIndex = 0; dealIndex < 2; dealIndex += 1) {
    for (const player of state.players) {
      if (!isEligibleForHand(player)) {
        continue
      }

      const card = deck.shift()
      const roundPlayer = roundPlayers.find(
        (entry) => entry.playerId === player.playerId,
      )

      if (card && roundPlayer) {
        roundPlayer.hand.push(card)
      }
    }
  }

  const round: RoundState = {
    handNumber: (state.currentRound?.handNumber ?? 0) + 1,
    roundNumber: (state.currentRound?.roundNumber ?? 0) + 1,
    dealerIndex,
    activePlayerId: null,
    smallBlindPlayerId: state.players[smallBlindIndex]?.playerId ?? null,
    bigBlindPlayerId: state.players[bigBlindIndex]?.playerId ?? null,
    currentBet: 0,
    minimumRaise: isFixedLimit
      ? state.config.smallBlind
      : state.config.bigBlind,
    raisesThisStreet: 0,
    street: 'preflop',
    communityCards: [],
    burnCards: [],
    drawPile: deck,
    deckRemainderCount: deck.length,
    players: roundPlayers,
    pots: [],
    potTotal: 0,
    availableActions: {},
    roundLeaderPlayerId: null,
    trumpSuit: null,
    trumpCard: null,
    currentTrick: null,
    completedTricks: [],
  }

  if (round.smallBlindPlayerId) {
    applyBlind(
      round,
      round.smallBlindPlayerId,
      fixedLimitSmallBlind,
      'postSmallBlind',
    )
  }

  if (round.bigBlindPlayerId) {
    applyBlind(
      round,
      round.bigBlindPlayerId,
      fixedLimitBigBlind,
      'postBigBlind',
    )
  }

  round.currentBet = fixedLimitBigBlind
  const activePlayerId = findNextActingPlayerId(
    round,
    state.players,
    bigBlindIndex,
  )
  round.activePlayerId = activePlayerId
  state.currentRound = round
  state.phase = 'preflop'
  state.winnerPlayerIds = []
  rebuildAvailableActions(state)
}

export const moveToNextStreet = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  const dealerIndex = round.dealerIndex

  resetBettingStateForStreet(round)

  if (state.phase === 'preflop') {
    addCommunityCards(round, 3)
    round.street = 'flop'
    state.phase = 'flop'
  } else if (state.phase === 'flop') {
    addCommunityCards(round, 1)
    round.street = 'turn'
    state.phase = 'turn'
  } else if (state.phase === 'turn') {
    addCommunityCards(round, 1)
    round.street = 'river'
    state.phase = 'river'
  }

  round.activePlayerId = findNextActingPlayerId(
    round,
    state.players,
    dealerIndex,
  )
  rebuildAvailableActions(state)
}

export const advanceActionTurn = (
  state: PokerGameState,
  actingPlayerId: string,
) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  const actingSeatIndex = state.players.findIndex(
    (player) => player.playerId === actingPlayerId,
  )
  round.activePlayerId = findNextActingPlayerId(
    round,
    state.players,
    actingSeatIndex,
  )
  rebuildAvailableActions(state)
}

export const getRoundPlayer = (round: RoundState, playerId: string) => {
  const player = round.players.find((entry) => entry.playerId === playerId)

  if (!player) {
    throw new Error('error.playerNotFound')
  }

  return player
}

export const applyBet = (
  round: RoundState,
  player: RoundPlayerState,
  targetBet: number,
  actionType: 'call' | 'raise' | 'allIn',
) => {
  const previousCurrentBet = round.currentBet
  const normalizedTargetBet = Math.max(player.currentBet, targetBet)
  const delta = normalizedTargetBet - player.currentBet
  const amount = Math.min(delta, player.stack)

  player.stack -= amount
  player.currentBet += amount
  player.totalCommitted += amount
  player.isAllIn = player.stack === 0
  player.hasActed = true
  player.lastAction = { type: actionType, amount: player.currentBet }
  round.potTotal += amount

  const raisedAmount = player.currentBet - round.currentBet
  if (player.currentBet > round.currentBet) {
    round.minimumRaise = Math.max(
      raisedAmount,
      round.minimumRaise || raisedAmount,
    )
    round.currentBet = player.currentBet
    if (previousCurrentBet > 0) {
      round.raisesThisStreet += 1
    }

    for (const otherPlayer of round.players) {
      if (
        otherPlayer.playerId !== player.playerId &&
        otherPlayer.hand.length > 0 &&
        !otherPlayer.folded &&
        !otherPlayer.isAllIn
      ) {
        otherPlayer.hasActed = false
      }
    }
  }
}

export const resetForShowdownDelay = (state: PokerGameState) => {
  rebuildAvailableActions(state)
}
