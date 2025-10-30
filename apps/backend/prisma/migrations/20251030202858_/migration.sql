-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserSiteAccess" DROP CONSTRAINT "UserSiteAccess_siteId_fkey";

-- DropForeignKey
ALTER TABLE "UserSiteAccess" DROP CONSTRAINT "UserSiteAccess_userId_fkey";

-- AlterTable
ALTER TABLE "AppConfig" ADD COLUMN     "alertColorAlert" TEXT NOT NULL DEFAULT '#F97316',
ADD COLUMN     "alertColorCritical" TEXT NOT NULL DEFAULT '#EF4444',
ADD COLUMN     "alertColorIdle" TEXT NOT NULL DEFAULT '#38BDF8',
ADD COLUMN     "alertColorInfo" TEXT NOT NULL DEFAULT '#2563EB',
ADD COLUMN     "alertColorNotice" TEXT NOT NULL DEFAULT '#22C55E';

-- AlterTable
ALTER TABLE "UserPermission" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserSiteAccess" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSiteAccess" ADD CONSTRAINT "UserSiteAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSiteAccess" ADD CONSTRAINT "UserSiteAccess_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
