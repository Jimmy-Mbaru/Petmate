-- AlterTable
ALTER TABLE "BoardingProfile" ADD COLUMN     "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoritePet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoritePet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteBoardingProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "boardingProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteBoardingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoritePet_userId_petId_key" ON "UserFavoritePet"("userId", "petId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteBoardingProfile_userId_boardingProfileId_key" ON "UserFavoriteBoardingProfile"("userId", "boardingProfileId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoritePet" ADD CONSTRAINT "UserFavoritePet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoritePet" ADD CONSTRAINT "UserFavoritePet_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteBoardingProfile" ADD CONSTRAINT "UserFavoriteBoardingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteBoardingProfile" ADD CONSTRAINT "UserFavoriteBoardingProfile_boardingProfileId_fkey" FOREIGN KEY ("boardingProfileId") REFERENCES "BoardingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
