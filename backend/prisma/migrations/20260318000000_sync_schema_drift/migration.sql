-- Add missing columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- Add missing columns to UserReport
ALTER TABLE "UserReport" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UserReport" ADD COLUMN IF NOT EXISTS "reviewedByAdminId" TEXT;

-- Add missing ReportStatus enum values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UNDER_REVIEW' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ReportStatus')) THEN
    ALTER TYPE "ReportStatus" ADD VALUE 'UNDER_REVIEW';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RESOLVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ReportStatus')) THEN
    ALTER TYPE "ReportStatus" ADD VALUE 'RESOLVED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ACTION_TAKEN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ReportStatus')) THEN
    ALTER TYPE "ReportStatus" ADD VALUE 'ACTION_TAKEN';
  END IF;
END$$;

-- Create UserFavoriteProduct table if it doesn't exist
CREATE TABLE IF NOT EXISTS "UserFavoriteProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteProduct_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint and foreign keys for UserFavoriteProduct
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserFavoriteProduct_userId_productId_key') THEN
    ALTER TABLE "UserFavoriteProduct" ADD CONSTRAINT "UserFavoriteProduct_userId_productId_key" UNIQUE ("userId", "productId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserFavoriteProduct_userId_fkey') THEN
    ALTER TABLE "UserFavoriteProduct" ADD CONSTRAINT "UserFavoriteProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserFavoriteProduct_productId_fkey') THEN
    ALTER TABLE "UserFavoriteProduct" ADD CONSTRAINT "UserFavoriteProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Add missing indexes on UserReport
CREATE INDEX IF NOT EXISTS "UserReport_reporterId_idx" ON "UserReport"("reporterId");

-- Add Product indexes
CREATE INDEX IF NOT EXISTS "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_isActive_category_idx" ON "Product"("isActive", "category");
CREATE INDEX IF NOT EXISTS "Product_isActive_price_idx" ON "Product"("isActive", "price");
