-- Normalize existing category values to uppercase (enum values are uppercase)
UPDATE "Product" SET "category" = UPPER("category");

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FOOD', 'TOYS', 'ACCESSORIES', 'HEALTH', 'GROOMING', 'BEDS', 'CLOTHING', 'TRAINING', 'OUTDOOR', 'OTHER');

-- AlterTable: convert Product.category from TEXT to ProductCategory enum
ALTER TABLE "Product" ALTER COLUMN "category" TYPE "ProductCategory" USING "category"::"ProductCategory";
