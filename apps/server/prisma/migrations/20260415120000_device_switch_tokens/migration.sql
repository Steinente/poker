-- CreateTable
CREATE TABLE "DeviceSwitchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "lobbyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "newSessionToken" TEXT,

    CONSTRAINT "DeviceSwitchToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSwitchToken_token_key" ON "DeviceSwitchToken"("token");

-- CreateIndex
CREATE INDEX "DeviceSwitchToken_token_idx" ON "DeviceSwitchToken"("token");

-- CreateIndex
CREATE INDEX "DeviceSwitchToken_lobbyCode_idx" ON "DeviceSwitchToken"("lobbyCode");

-- CreateIndex
CREATE INDEX "DeviceSwitchToken_expiresAt_idx" ON "DeviceSwitchToken"("expiresAt");
