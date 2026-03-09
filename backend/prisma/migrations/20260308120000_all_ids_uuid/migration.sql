-- All table ids and remaining Int FKs to UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== Step 1: Add new UUID columns and backfill ==========

-- RefreshToken
ALTER TABLE "RefreshToken" ADD COLUMN "id_new" TEXT;
UPDATE "RefreshToken" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "RefreshToken" ALTER COLUMN "id_new" SET NOT NULL;

-- Pet
ALTER TABLE "Pet" ADD COLUMN "id_new" TEXT;
UPDATE "Pet" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "Pet" ALTER COLUMN "id_new" SET NOT NULL;

-- UserFavoritePet: id and petId
ALTER TABLE "UserFavoritePet" ADD COLUMN "id_new" TEXT;
ALTER TABLE "UserFavoritePet" ADD COLUMN "petId_new" TEXT;
UPDATE "UserFavoritePet" SET "id_new" = gen_random_uuid()::TEXT;
UPDATE "UserFavoritePet" f SET "petId_new" = p."id_new" FROM "Pet" p WHERE p.id = f."petId";
ALTER TABLE "UserFavoritePet" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "UserFavoritePet" ALTER COLUMN "petId_new" SET NOT NULL;

-- UserBlock
ALTER TABLE "UserBlock" ADD COLUMN "id_new" TEXT;
UPDATE "UserBlock" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "UserBlock" ALTER COLUMN "id_new" SET NOT NULL;

-- UserReport
ALTER TABLE "UserReport" ADD COLUMN "id_new" TEXT;
UPDATE "UserReport" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "UserReport" ALTER COLUMN "id_new" SET NOT NULL;

-- BoardingProfile
ALTER TABLE "BoardingProfile" ADD COLUMN "id_new" TEXT;
UPDATE "BoardingProfile" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "BoardingProfile" ALTER COLUMN "id_new" SET NOT NULL;

-- UserFavoriteBoardingProfile: id and boardingProfileId
ALTER TABLE "UserFavoriteBoardingProfile" ADD COLUMN "id_new" TEXT;
ALTER TABLE "UserFavoriteBoardingProfile" ADD COLUMN "boardingProfileId_new" TEXT;
UPDATE "UserFavoriteBoardingProfile" SET "id_new" = gen_random_uuid()::TEXT;
UPDATE "UserFavoriteBoardingProfile" f SET "boardingProfileId_new" = b."id_new" FROM "BoardingProfile" b WHERE b.id = f."boardingProfileId";
ALTER TABLE "UserFavoriteBoardingProfile" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "UserFavoriteBoardingProfile" ALTER COLUMN "boardingProfileId_new" SET NOT NULL;

-- BlackoutDate: id and boardingProfileId
ALTER TABLE "BlackoutDate" ADD COLUMN "id_new" TEXT;
ALTER TABLE "BlackoutDate" ADD COLUMN "boardingProfileId_new" TEXT;
UPDATE "BlackoutDate" SET "id_new" = gen_random_uuid()::TEXT;
UPDATE "BlackoutDate" b SET "boardingProfileId_new" = p."id_new" FROM "BoardingProfile" p WHERE p.id = b."boardingProfileId";
ALTER TABLE "BlackoutDate" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "BlackoutDate" ALTER COLUMN "boardingProfileId_new" SET NOT NULL;

-- Booking: id and boardingProfileId
ALTER TABLE "Booking" ADD COLUMN "id_new" TEXT;
ALTER TABLE "Booking" ADD COLUMN "boardingProfileId_new" TEXT;
UPDATE "Booking" SET "id_new" = gen_random_uuid()::TEXT;
UPDATE "Booking" b SET "boardingProfileId_new" = p."id_new" FROM "BoardingProfile" p WHERE p.id = b."boardingProfileId";
ALTER TABLE "Booking" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "boardingProfileId_new" SET NOT NULL;

-- Review: id, bookingId, boardingProfileId
ALTER TABLE "Review" ADD COLUMN "id_new" TEXT;
ALTER TABLE "Review" ADD COLUMN "bookingId_new" TEXT;
ALTER TABLE "Review" ADD COLUMN "boardingProfileId_new" TEXT;
UPDATE "Review" SET "id_new" = gen_random_uuid()::TEXT;
UPDATE "Review" r SET "bookingId_new" = b."id_new" FROM "Booking" b WHERE b.id = r."bookingId";
UPDATE "Review" r SET "boardingProfileId_new" = p."id_new" FROM "BoardingProfile" p WHERE p.id = r."boardingProfileId";
ALTER TABLE "Review" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "bookingId_new" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "boardingProfileId_new" SET NOT NULL;

-- Product
ALTER TABLE "Product" ADD COLUMN "id_new" TEXT;
UPDATE "Product" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "Product" ALTER COLUMN "id_new" SET NOT NULL;

-- Order
ALTER TABLE "Order" ADD COLUMN "id_new" TEXT;
UPDATE "Order" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "Order" ALTER COLUMN "id_new" SET NOT NULL;

-- OrderItem: id, orderId, productId
ALTER TABLE "OrderItem" ADD COLUMN "id_new" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "orderId_new" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productId_new" TEXT;
UPDATE "OrderItem" SET "id_new" = gen_random_uuid()::TEXT;
UPDATE "OrderItem" oi SET "orderId_new" = o."id_new" FROM "Order" o WHERE o.id = oi."orderId";
UPDATE "OrderItem" oi SET "productId_new" = p."id_new" FROM "Product" p WHERE p.id = oi."productId";
ALTER TABLE "OrderItem" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "orderId_new" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "productId_new" SET NOT NULL;

-- Message
ALTER TABLE "Message" ADD COLUMN "id_new" TEXT;
UPDATE "Message" SET "id_new" = gen_random_uuid()::TEXT;
ALTER TABLE "Message" ALTER COLUMN "id_new" SET NOT NULL;

-- ========== Step 2: Drop FKs that reference Int columns we're replacing ==========
ALTER TABLE "UserFavoritePet" DROP CONSTRAINT IF EXISTS "UserFavoritePet_petId_fkey";
ALTER TABLE "UserFavoriteBoardingProfile" DROP CONSTRAINT IF EXISTS "UserFavoriteBoardingProfile_boardingProfileId_fkey";
ALTER TABLE "BlackoutDate" DROP CONSTRAINT IF EXISTS "BlackoutDate_boardingProfileId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_boardingProfileId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_bookingId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_boardingProfileId_fkey";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_orderId_fkey";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

-- ========== Step 3: Replace ids and FKs (drop old, rename new, add PKs/FKs) ==========

-- RefreshToken
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey";
ALTER TABLE "RefreshToken" DROP COLUMN "id";
ALTER TABLE "RefreshToken" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");

-- Pet
ALTER TABLE "Pet" DROP CONSTRAINT "Pet_pkey";
ALTER TABLE "Pet" DROP COLUMN "id";
ALTER TABLE "Pet" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_pkey" PRIMARY KEY ("id");

-- UserFavoritePet
ALTER TABLE "UserFavoritePet" DROP CONSTRAINT "UserFavoritePet_pkey";
ALTER TABLE "UserFavoritePet" DROP COLUMN "id";
ALTER TABLE "UserFavoritePet" DROP COLUMN "petId";
ALTER TABLE "UserFavoritePet" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "UserFavoritePet" RENAME COLUMN "petId_new" TO "petId";
ALTER TABLE "UserFavoritePet" ADD CONSTRAINT "UserFavoritePet_pkey" PRIMARY KEY ("id");
ALTER TABLE "UserFavoritePet" ADD CONSTRAINT "UserFavoritePet_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserBlock
ALTER TABLE "UserBlock" DROP CONSTRAINT "UserBlock_pkey";
ALTER TABLE "UserBlock" DROP COLUMN "id";
ALTER TABLE "UserBlock" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id");

-- UserReport
ALTER TABLE "UserReport" DROP CONSTRAINT "UserReport_pkey";
ALTER TABLE "UserReport" DROP COLUMN "id";
ALTER TABLE "UserReport" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id");

-- BoardingProfile
ALTER TABLE "BoardingProfile" DROP CONSTRAINT "BoardingProfile_pkey";
ALTER TABLE "BoardingProfile" DROP COLUMN "id";
ALTER TABLE "BoardingProfile" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "BoardingProfile" ADD CONSTRAINT "BoardingProfile_pkey" PRIMARY KEY ("id");

-- UserFavoriteBoardingProfile
ALTER TABLE "UserFavoriteBoardingProfile" DROP CONSTRAINT "UserFavoriteBoardingProfile_pkey";
ALTER TABLE "UserFavoriteBoardingProfile" DROP COLUMN "id";
ALTER TABLE "UserFavoriteBoardingProfile" DROP COLUMN "boardingProfileId";
ALTER TABLE "UserFavoriteBoardingProfile" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "UserFavoriteBoardingProfile" RENAME COLUMN "boardingProfileId_new" TO "boardingProfileId";
ALTER TABLE "UserFavoriteBoardingProfile" ADD CONSTRAINT "UserFavoriteBoardingProfile_pkey" PRIMARY KEY ("id");
ALTER TABLE "UserFavoriteBoardingProfile" ADD CONSTRAINT "UserFavoriteBoardingProfile_boardingProfileId_fkey" FOREIGN KEY ("boardingProfileId") REFERENCES "BoardingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BlackoutDate
ALTER TABLE "BlackoutDate" DROP CONSTRAINT "BlackoutDate_pkey";
ALTER TABLE "BlackoutDate" DROP COLUMN "id";
ALTER TABLE "BlackoutDate" DROP COLUMN "boardingProfileId";
ALTER TABLE "BlackoutDate" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "BlackoutDate" RENAME COLUMN "boardingProfileId_new" TO "boardingProfileId";
ALTER TABLE "BlackoutDate" ALTER COLUMN "boardingProfileId" SET NOT NULL;
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id");
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_boardingProfileId_fkey" FOREIGN KEY ("boardingProfileId") REFERENCES "BoardingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booking
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_pkey";
ALTER TABLE "Booking" DROP COLUMN "id";
ALTER TABLE "Booking" DROP COLUMN "boardingProfileId";
ALTER TABLE "Booking" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Booking" RENAME COLUMN "boardingProfileId_new" TO "boardingProfileId";
ALTER TABLE "Booking" ALTER COLUMN "boardingProfileId" SET NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pkey" PRIMARY KEY ("id");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boardingProfileId_fkey" FOREIGN KEY ("boardingProfileId") REFERENCES "BoardingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Review
ALTER TABLE "Review" DROP CONSTRAINT "Review_pkey";
ALTER TABLE "Review" DROP COLUMN "id";
ALTER TABLE "Review" DROP COLUMN "bookingId";
ALTER TABLE "Review" DROP COLUMN "boardingProfileId";
ALTER TABLE "Review" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Review" RENAME COLUMN "bookingId_new" TO "bookingId";
ALTER TABLE "Review" RENAME COLUMN "boardingProfileId_new" TO "boardingProfileId";
ALTER TABLE "Review" ALTER COLUMN "bookingId" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "boardingProfileId" SET NOT NULL;
ALTER TABLE "Review" ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_boardingProfileId_fkey" FOREIGN KEY ("boardingProfileId") REFERENCES "BoardingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey";
ALTER TABLE "Product" DROP COLUMN "id";
ALTER TABLE "Product" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Product" ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");

-- Order
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey";
ALTER TABLE "Order" DROP COLUMN "id";
ALTER TABLE "Order" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Order" ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");

-- OrderItem
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_pkey";
ALTER TABLE "OrderItem" DROP COLUMN "id";
ALTER TABLE "OrderItem" DROP COLUMN "orderId";
ALTER TABLE "OrderItem" DROP COLUMN "productId";
ALTER TABLE "OrderItem" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "OrderItem" RENAME COLUMN "orderId_new" TO "orderId";
ALTER TABLE "OrderItem" RENAME COLUMN "productId_new" TO "productId";
ALTER TABLE "OrderItem" ALTER COLUMN "orderId" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message
ALTER TABLE "Message" DROP CONSTRAINT "Message_pkey";
ALTER TABLE "Message" DROP COLUMN "id";
ALTER TABLE "Message" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Message" ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
