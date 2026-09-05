-- AlterEnum
ALTER TYPE "RisStatus" ADD VALUE 'CERTIFIED';

-- DropIndex
DROP INDEX "Ris_risNumber_idx";

-- DropIndex
DROP INDEX "Ris_status_idx";

-- AlterTable
ALTER TABLE "Ris" ADD COLUMN     "certifiedAt" TIMESTAMP(3),
ADD COLUMN     "certifiedById" UUID;

-- AddForeignKey
ALTER TABLE "Ris" ADD CONSTRAINT "Ris_certifiedById_fkey" FOREIGN KEY ("certifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
