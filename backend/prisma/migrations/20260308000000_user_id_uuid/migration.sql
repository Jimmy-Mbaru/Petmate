-- Ensure gen_random_uuid() is available (built-in in PG13+; pgcrypto on older versions)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- AlterTable User: add new UUID column and backfill
ALTER TABLE "User" ADD COLUMN "id_new" TEXT;

-- Backfill UUIDs (each row gets a new random UUID)
UPDATE "User" SET "id_new" = gen_random_uuid()::TEXT;

ALTER TABLE "User" ALTER COLUMN "id_new" SET NOT NULL;

-- Child tables: add new FK columns and backfill
ALTER TABLE "RefreshToken" ADD COLUMN "userId_new" TEXT;
UPDATE "RefreshToken" r SET "userId_new" = u."id_new" FROM "User" u WHERE u.id = r."userId";

ALTER TABLE "UserFavoritePet" ADD COLUMN "userId_new" TEXT;
UPDATE "UserFavoritePet" f SET "userId_new" = u."id_new" FROM "User" u WHERE u.id = f."userId";

ALTER TABLE "UserFavoriteBoardingProfile" ADD COLUMN "userId_new" TEXT;
UPDATE "UserFavoriteBoardingProfile" f SET "userId_new" = u."id_new" FROM "User" u WHERE u.id = f."userId";

ALTER TABLE "Pet" ADD COLUMN "ownerId_new" TEXT;
UPDATE "Pet" p SET "ownerId_new" = u."id_new" FROM "User" u WHERE u.id = p."ownerId";

ALTER TABLE "UserBlock" ADD COLUMN "blockerId_new" TEXT;
ALTER TABLE "UserBlock" ADD COLUMN "blockedId_new" TEXT;
UPDATE "UserBlock" b SET "blockerId_new" = u."id_new" FROM "User" u WHERE u.id = b."blockerId";
UPDATE "UserBlock" b SET "blockedId_new" = u."id_new" FROM "User" u WHERE u.id = b."blockedId";

ALTER TABLE "UserReport" ADD COLUMN "reporterId_new" TEXT;
ALTER TABLE "UserReport" ADD COLUMN "reportedUserId_new" TEXT;
UPDATE "UserReport" r SET "reporterId_new" = u."id_new" FROM "User" u WHERE u.id = r."reporterId";
UPDATE "UserReport" r SET "reportedUserId_new" = u."id_new" FROM "User" u WHERE u.id = r."reportedUserId";

ALTER TABLE "BoardingProfile" ADD COLUMN "hostId_new" TEXT;
UPDATE "BoardingProfile" b SET "hostId_new" = u."id_new" FROM "User" u WHERE u.id = b."hostId";

ALTER TABLE "Booking" ADD COLUMN "ownerId_new" TEXT;
UPDATE "Booking" b SET "ownerId_new" = u."id_new" FROM "User" u WHERE u.id = b."ownerId";

ALTER TABLE "Order" ADD COLUMN "userId_new" TEXT;
UPDATE "Order" o SET "userId_new" = u."id_new" FROM "User" u WHERE u.id = o."userId";

ALTER TABLE "Message" ADD COLUMN "senderId_new" TEXT;
ALTER TABLE "Message" ADD COLUMN "receiverId_new" TEXT;
UPDATE "Message" m SET "senderId_new" = u."id_new" FROM "User" u WHERE u.id = m."senderId";
UPDATE "Message" m SET "receiverId_new" = u."id_new" FROM "User" u WHERE u.id = m."receiverId";

-- Drop foreign key constraints that reference User(id)
ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
ALTER TABLE "UserFavoritePet" DROP CONSTRAINT IF EXISTS "UserFavoritePet_userId_fkey";
ALTER TABLE "UserFavoriteBoardingProfile" DROP CONSTRAINT IF EXISTS "UserFavoriteBoardingProfile_userId_fkey";
ALTER TABLE "Pet" DROP CONSTRAINT IF EXISTS "Pet_ownerId_fkey";
ALTER TABLE "UserBlock" DROP CONSTRAINT IF EXISTS "UserBlock_blockerId_fkey";
ALTER TABLE "UserBlock" DROP CONSTRAINT IF EXISTS "UserBlock_blockedId_fkey";
ALTER TABLE "UserReport" DROP CONSTRAINT IF EXISTS "UserReport_reporterId_fkey";
ALTER TABLE "UserReport" DROP CONSTRAINT IF EXISTS "UserReport_reportedUserId_fkey";
ALTER TABLE "BoardingProfile" DROP CONSTRAINT IF EXISTS "BoardingProfile_hostId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_ownerId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_senderId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_receiverId_fkey";

-- Drop User primary key and old id column
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- RefreshToken: drop old column, rename new, add FK
ALTER TABLE "RefreshToken" DROP COLUMN "userId";
ALTER TABLE "RefreshToken" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "RefreshToken" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserFavoritePet
ALTER TABLE "UserFavoritePet" DROP COLUMN "userId";
ALTER TABLE "UserFavoritePet" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "UserFavoritePet" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UserFavoritePet" ADD CONSTRAINT "UserFavoritePet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserFavoriteBoardingProfile
ALTER TABLE "UserFavoriteBoardingProfile" DROP COLUMN "userId";
ALTER TABLE "UserFavoriteBoardingProfile" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "UserFavoriteBoardingProfile" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UserFavoriteBoardingProfile" ADD CONSTRAINT "UserFavoriteBoardingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pet
ALTER TABLE "Pet" DROP COLUMN "ownerId";
ALTER TABLE "Pet" RENAME COLUMN "ownerId_new" TO "ownerId";
ALTER TABLE "Pet" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserBlock
ALTER TABLE "UserBlock" DROP COLUMN "blockerId";
ALTER TABLE "UserBlock" DROP COLUMN "blockedId";
ALTER TABLE "UserBlock" RENAME COLUMN "blockerId_new" TO "blockerId";
ALTER TABLE "UserBlock" RENAME COLUMN "blockedId_new" TO "blockedId";
ALTER TABLE "UserBlock" ALTER COLUMN "blockerId" SET NOT NULL;
ALTER TABLE "UserBlock" ALTER COLUMN "blockedId" SET NOT NULL;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserReport
ALTER TABLE "UserReport" DROP COLUMN "reporterId";
ALTER TABLE "UserReport" DROP COLUMN "reportedUserId";
ALTER TABLE "UserReport" RENAME COLUMN "reporterId_new" TO "reporterId";
ALTER TABLE "UserReport" RENAME COLUMN "reportedUserId_new" TO "reportedUserId";
ALTER TABLE "UserReport" ALTER COLUMN "reporterId" SET NOT NULL;
ALTER TABLE "UserReport" ALTER COLUMN "reportedUserId" SET NOT NULL;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BoardingProfile
ALTER TABLE "BoardingProfile" DROP COLUMN "hostId";
ALTER TABLE "BoardingProfile" RENAME COLUMN "hostId_new" TO "hostId";
ALTER TABLE "BoardingProfile" ALTER COLUMN "hostId" SET NOT NULL;
ALTER TABLE "BoardingProfile" ADD CONSTRAINT "BoardingProfile_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "BoardingProfile_hostId_key" ON "BoardingProfile"("hostId");

-- Booking
ALTER TABLE "Booking" DROP COLUMN "ownerId";
ALTER TABLE "Booking" RENAME COLUMN "ownerId_new" TO "ownerId";
ALTER TABLE "Booking" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order
ALTER TABLE "Order" DROP COLUMN "userId";
ALTER TABLE "Order" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "Order" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message
ALTER TABLE "Message" DROP COLUMN "senderId";
ALTER TABLE "Message" DROP COLUMN "receiverId";
ALTER TABLE "Message" RENAME COLUMN "senderId_new" TO "senderId";
ALTER TABLE "Message" RENAME COLUMN "receiverId_new" TO "receiverId";
ALTER TABLE "Message" ALTER COLUMN "senderId" SET NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "receiverId" SET NOT NULL;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
