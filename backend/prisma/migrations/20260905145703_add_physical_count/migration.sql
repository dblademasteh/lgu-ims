-- CreateTable
CREATE TABLE "PhysicalCount" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "countDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalCountItem" (
    "id" UUID NOT NULL,
    "physicalCountId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "systemQuantity" DOUBLE PRECISION NOT NULL,
    "countedQuantity" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "PhysicalCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysicalCount_departmentId_idx" ON "PhysicalCount"("departmentId");

-- CreateIndex
CREATE INDEX "PhysicalCount_countDate_idx" ON "PhysicalCount"("countDate");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_physicalCountId_idx" ON "PhysicalCountItem"("physicalCountId");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_itemId_idx" ON "PhysicalCountItem"("itemId");

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCountItem" ADD CONSTRAINT "PhysicalCountItem_physicalCountId_fkey" FOREIGN KEY ("physicalCountId") REFERENCES "PhysicalCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCountItem" ADD CONSTRAINT "PhysicalCountItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
