-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- DropIndex
DROP INDEX "Item_sku_key";

-- DropIndex
DROP INDEX "PurchaseOrder_poNumber_idx";

-- DropIndex
DROP INDEX "PurchaseOrder_poNumber_key";

-- DropIndex
DROP INDEX "Receiving_receivingNo_idx";

-- DropIndex
DROP INDEX "Receiving_receivingNo_key";

-- DropIndex
DROP INDEX "Ris_risNumber_key";

-- DropIndex
DROP INDEX "Supplier_name_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "chainHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "previousHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "parentId" UUID;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "maxStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "PhysicalCount" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "PhysicalCountItem" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Receiving" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "ReceivingItem" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "replacedById" UUID,
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Ris" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "RisItem" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailJob" (
    "id" UUID NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT,
    "html" TEXT,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviousPassword" (
    "id" UUID NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "userId" UUID NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviousPassword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "Tenant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "EmailJob_status_scheduledAt_idx" ON "EmailJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "PreviousPassword_userId_idx" ON "PreviousPassword"("userId");

-- CreateIndex
CREATE INDEX "PreviousPassword_tenantId_idx" ON "PreviousPassword"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "Budget_tenantId_idx" ON "Budget"("tenantId");

-- CreateIndex
CREATE INDEX "Item_tenantId_idx" ON "Item"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_tenantId_sku_key" ON "Item"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "LedgerEntry_tenantId_idx" ON "LedgerEntry"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationPreference_tenantId_idx" ON "NotificationPreference"("tenantId");

-- CreateIndex
CREATE INDEX "PhysicalCount_tenantId_idx" ON "PhysicalCount"("tenantId");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_tenantId_idx" ON "PhysicalCountItem"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_tenantId_idx" ON "PurchaseOrderItem"("tenantId");

-- CreateIndex
CREATE INDEX "Receiving_tenantId_idx" ON "Receiving"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Receiving_tenantId_receivingNo_key" ON "Receiving"("tenantId", "receivingNo");

-- CreateIndex
CREATE INDEX "ReceivingItem_tenantId_idx" ON "ReceivingItem"("tenantId");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_idx" ON "RefreshToken"("tenantId");

-- CreateIndex
CREATE INDEX "Ris_tenantId_idx" ON "Ris"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Ris_tenantId_risNumber_key" ON "Ris"("tenantId", "risNumber");

-- CreateIndex
CREATE INDEX "RisItem_tenantId_idx" ON "RisItem"("tenantId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_name_key" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviousPassword" ADD CONSTRAINT "PreviousPassword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
