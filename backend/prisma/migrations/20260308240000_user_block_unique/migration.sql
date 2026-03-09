-- CreateIndex: ensure one block per (blocker, blocked) pair
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");
