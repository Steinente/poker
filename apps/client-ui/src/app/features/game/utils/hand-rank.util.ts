import type { Card } from '@poker/shared'

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

type NumberCard = Extract<Card, { type: 'number' }>

type HandScore = {
  category: number
  ranks: number[]
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

const evaluateFiveCards = (cards: NumberCard[]): HandScore => {
  const values = cards
    .map((card) => card.value)
    .sort((left, right) => right - left)
  const suits = cards.map((card) => card.suit)
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

const chooseFiveCardCombos = (cards: NumberCard[]): NumberCard[][] => {
  const results: NumberCard[][] = []

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

const evaluateBestHand = (cards: NumberCard[]): HandScore | null => {
  if (cards.length < 5) {
    return null
  }

  let best: HandScore | null = null

  for (const combo of chooseFiveCardCombos(cards)) {
    const score = evaluateFiveCards(combo)
    if (!best || compareScores(score, best) > 0) {
      best = score
    }
  }

  return best
}

const mapRankKey = (score: HandScore): HandRankKey => {
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

export const getBestHandRankKey = (cards: Card[]): HandRankKey | null => {
  const numberCards = cards.filter(
    (card): card is NumberCard => card.type === 'number',
  )
  const best = evaluateBestHand(numberCards)

  return best ? mapRankKey(best) : null
}
