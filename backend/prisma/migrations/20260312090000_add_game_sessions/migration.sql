-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- tabla para guardar las partidas de cada usuario
-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "parkSheetNumber" INTEGER NOT NULL DEFAULT 1,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSession_userId_idx" ON "GameSession"("userId");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
