const prisma = require('../prisma');
const { verifyAuditChain } = require('../utils/audit');

async function coaCompliance(req, res) {
  const { year } = req.query;
  const targetYear = year ? Number(year) : new Date().getFullYear();

  const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${targetYear}-12-31T23:59:59.999Z`);

  const [
    totalAccountableItems,
    itemsWithStockNumber,
    itemsWithCondition,
    itemsWithExpiry,
    itemsWithWarranty,
    physicalCountSubmissions,
    totalRisIssued,
    totalLedgerEntries,
    totalAuditLogs,
    auditVerification,
    pendingRisCount,
    cancelledRisCount,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true, isAccountable: true } }),
    prisma.item.count({ where: { isActive: true, isAccountable: true, stockNumber: { not: null } } }),
    prisma.item.count({ where: { isActive: true, isAccountable: true, condition: { not: null } } }),
    prisma.item.count({ where: { isActive: true, isAccountable: true, expiryDate: { not: null } } }),
    prisma.item.count({ where: { isActive: true, isAccountable: true, warrantyExpiry: { not: null } } }),
    prisma.physicalCount.count({
      where: {
        status: 'SUBMITTED',
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
    }),
    prisma.ris.count({
      where: {
        status: { in: ['ISSUED', 'PARTIALLY_ISSUED'] },
        issuedAt: { gte: startOfYear, lte: endOfYear },
      },
    }),
    prisma.ledgerEntry.count({
      where: { date: { gte: startOfYear, lte: endOfYear } },
    }),
    prisma.auditLog.count(),
    verifyAuditChain(),
    prisma.ris.count({ where: { status: 'PENDING' } }),
    prisma.ris.count({ where: { status: 'CANCELLED' } }),
  ]);

  const compliance = {
    period: targetYear,
    summary: {
      totalAccountableItems,
      totalRisIssued,
      totalLedgerEntries,
      totalAuditLogs,
    },
    coa2020_001: {
      description: 'Property, Plant and Equipment tracking',
      checks: [
        {
          id: 'par_available',
          label: 'Property Acknowledgement Receipt (PAR) generation',
          status: 'PASS',
          detail: 'PAR report available at /reports/par/:risId',
        },
        {
          id: 'ics_available',
          label: 'Inventory Custodian Slip (ICS) generation',
          status: 'PASS',
          detail: 'ICS report available at /reports/icing',
        },
        {
          id: 'app_available',
          label: 'Annual Property, Plant & Equipment (APP) report',
          status: 'PASS',
          detail: 'APP report available at /reports/app',
        },
        {
          id: 'accountable_items',
          label: 'Accountable property items tracked',
          status: 'PASS',
          detail: totalAccountableItems + ' accountable items found',
        },
        {
          id: 'semi_expendable_classification',
          label: 'Semi-expendable property classification',
          status: 'WARN',
          detail: 'isAccountable flag exists but no formal threshold-based classification',
        },
        {
          id: 'item_condition_tracking',
          label: 'Item condition tracking (SERVICEABLE/UNSERVICEABLE/CONDEMNED)',
          status: 'PASS',
          detail: itemsWithCondition + ' accountable items have condition status',
        },
        {
          id: 'physical_count_submission',
          label: 'Physical inventory taking conducted',
          status: physicalCountSubmissions > 0 ? 'PASS' : 'WARN',
          detail: physicalCountSubmissions + ' physical count submissions in ' + targetYear,
        },
        {
          id: 'obsolescence_tracking',
          label: 'Obsolete/unserviceable property identification',
          status: 'WARN',
          detail: 'Condition field exists but no automated obsolescence flagging',
        },
      ],
    },
    coa2021_002: {
      description: 'Audit of Inventories',
      checks: [
        {
          id: 'stock_ledger_per_item',
          label: 'Stock ledger maintained per item',
          status: 'PASS',
          detail: totalLedgerEntries + ' ledger entries in ' + targetYear,
        },
        {
          id: 'physical_count_reconciliation',
          label: 'Physical count reconciliation',
          status: 'WARN',
          detail: 'Physical count exists but no automated variance reconciliation',
        },
        {
          id: 'inventory_aging_analysis',
          label: 'Inventory aging analysis',
          status: 'PASS',
          detail: 'Aging report available at /reports/aging',
        },
        {
          id: 'obsolescence_provision',
          label: 'Obsolescence provision tracking',
          status: 'WARN',
          detail: 'No obsolete item flagging or provision calculation',
        },
        {
          id: 'proper_classification',
          label: 'Proper classification (consumables vs PPE)',
          status: 'WARN',
          detail: totalAccountableItems + ' accountable items tracked, but no formal classification report',
        },
      ],
    },
    auditTrail: {
      description: 'Audit Trail Requirements',
      checks: [
        {
          id: 'who_what_when',
          label: 'Who did what, when',
          status: 'PASS',
          detail: totalAuditLogs + ' audit log entries',
        },
        {
          id: 'before_after_values',
          label: 'Before/after values captured',
          status: 'PASS',
          detail: 'AuditLog.before and AuditLog.after JSON fields',
        },
        {
          id: 'ip_address',
          label: 'IP address captured',
          status: 'PASS',
          detail: 'x-forwarded-for or req.ip logged',
        },
        {
          id: 'immutability',
          label: 'Immutable audit trail',
          status: 'PASS',
          detail: 'Prisma middleware blocks UPDATE/DELETE on AuditLog',
        },
        {
          id: 'tamper_evident',
          label: 'Tamper-evident / signed audit trail',
          status: auditVerification.valid ? 'PASS' : 'FAIL',
          detail: auditVerification.valid
            ? 'Hash chain verified (' + auditVerification.count + ' entries)'
            : 'Chain broken at index ' + auditVerification.index,
        },
        {
          id: 'retention_policy',
          label: 'Log retention (7+ years per GAA)',
          status: 'WARN',
          detail: 'No retention policy enforcement; cleanup only for notifications',
        },
        {
          id: 'digital_signing',
          label: 'Digitally signed / sealed',
          status: 'WARN',
          detail: 'HMAC-SHA256 hash chain implemented; no PKI digital signature',
        },
      ],
    },
    procurement: {
      description: 'RA 9184 Procurement Compliance',
      checks: [
        {
          id: 'purchase_request',
          label: 'Purchase Request (PR) creation',
          status: 'WARN',
          detail: 'No PR module; RIS acts as PR substitute without budget check',
        },
        {
          id: 'purchase_order',
          label: 'Purchase Order (PO) issuance',
          status: 'WARN',
          detail: 'PO models exist but no creation UI or 3-way matching',
        },
        {
          id: 'canvass_sheet',
          label: 'Canvass / Quotation sheet',
          status: 'FAIL',
          detail: 'No pre-procurement documentation',
        },
        {
          id: 'three_way_matching',
          label: '3-way matching (PO vs DR vs Invoice)',
          status: 'WARN',
          detail: 'Receiving-PO linkage validation only; no full 3-way matching',
        },
        {
          id: 'inspection_sheet',
          label: 'Inspection and Acceptance Sheet (IAS)',
          status: 'FAIL',
          detail: 'No inspection workflow after receiving',
        },
        {
          id: 'supplier_registry',
          label: 'Supplier registry / PhilGEPS linkage',
          status: 'FAIL',
          detail: 'No accredited supplier classification',
        },
      ],
    },
    inventoryHealth: {
      description: 'Inventory Health Metrics',
      checks: [
        {
          id: 'stock_floor',
          label: 'No negative stock',
          status: 'PASS',
          detail: 'cancelRis and returnRisItems validate against negative stock',
        },
        {
          id: 'expiry_monitoring',
          label: 'Expiry date monitoring',
          status: 'PASS',
          detail: itemsWithExpiry + ' items have expiry dates',
        },
        {
          id: 'warranty_tracking',
          label: 'Warranty tracking',
          status: 'PASS',
          detail: itemsWithWarranty + ' items have warranty expiry',
        },
        {
          id: 'serial_tracking',
          label: 'Serial number / asset tag tracking',
          status: 'WARN',
          detail: itemsWithStockNumber + ' accountable items have stock numbers; no serial tracking',
        },
      ],
    },
    workflow: {
      description: 'RIS Workflow',
      checks: [
        {
          id: 'acknowledgment_slip',
          label: 'Acknowledgment slip at issue',
          status: 'PASS',
          detail: 'Acknowledgment slip report available at /reports/acknowledgment/:risId',
        },
        {
          id: 'multi_level_approval',
          label: 'Multi-level approval (budget, certifying)',
          status: 'PASS',
          detail: 'Certify step exists (CERTIFIED status); budget check in cancel flow',
        },
        {
          id: 'partial_approval_ui',
          label: 'Partial approval UI',
          status: 'PASS',
          detail: 'Approve modal supports per-item approved quantities',
        },
        {
          id: 'pending_ris',
          label: 'Pending RIS (workflow bottleneck indicator)',
          status: pendingRisCount > 0 ? 'WARN' : 'PASS',
          detail: pendingRisCount + ' RIS pending approval',
        },
      ],
    },
    pendingRisCount,
    cancelledRisCount,
  };

  const overallScore = Math.round(
    (compliance.coa2020_001.checks.filter(c => c.status === 'PASS').length / compliance.coa2020_001.checks.length * 25) +
    (compliance.coa2021_002.checks.filter(c => c.status === 'PASS').length / compliance.coa2021_002.checks.length * 25) +
    (compliance.auditTrail.checks.filter(c => c.status === 'PASS').length / compliance.auditTrail.checks.length * 25) +
    (compliance.procurement.checks.filter(c => c.status === 'PASS').length / compliance.procurement.checks.length * 15) +
    (compliance.inventoryHealth.checks.filter(c => c.status === 'PASS').length / compliance.inventoryHealth.checks.length * 5) +
    (compliance.workflow.checks.filter(c => c.status === 'PASS').length / compliance.workflow.checks.length * 5)
  ) / 10;

  compliance.overallScore = overallScore;

  res.json({ data: compliance });
}

module.exports = { coaCompliance };
