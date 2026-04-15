type SocketSessionEntry = {
  code: string
  sessionToken: string
}

export class SocketSessionStore {
  private readonly entries = new Map<string, SocketSessionEntry>()

  set(socketId: string, entry: SocketSessionEntry) {
    this.entries.set(socketId, entry)
  }

  get(socketId: string) {
    return this.entries.get(socketId) ?? null
  }

  delete(socketId: string) {
    this.entries.delete(socketId)
  }

  findSocketIdsBySessionToken(code: string, sessionToken: string) {
    const normalizedCode = code.trim().toUpperCase()
    const matches: string[] = []

    for (const [socketId, entry] of this.entries.entries()) {
      if (
        entry.code.trim().toUpperCase() === normalizedCode &&
        entry.sessionToken === sessionToken
      ) {
        matches.push(socketId)
      }
    }

    return matches
  }
}
