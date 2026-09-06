const ExcelJS = require('exceljs');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { renderPdf, renderExcel, addTableStyle, pdfHeader } = require('../services/reportRenderer');

const REFERENCE_LABELS = {
  OPENING_BALANCE: 'Opening',
  RECEIPT: 'Receipt',
  ISSUANCE: 'Issuance',
  ADJUSTMENT_IN: 'Adjust In',
  ADJUSTMENT_OUT: 'Adjust Out',
  RETURN: 'Return',
};

const money = (n) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function rsmiReport(req, res) {
  const { from, to, departmentId, format = 'pdf' } = req.query;
  if (!from || !to) throw new ApiError(400, 'from and to (dates) are required.');

  const where = {
    status: { in: ['ISSUED', 'PARTIALLY_ISSUED'] },
    issuedAt: { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) },
  };
  if (departmentId) where.departmentId = departmentId;

  const docs = await prisma.ris.findMany({
    where,
    include: {
      department: true,
      items: {
        where: { quantityIssued: { gt: 0 } },
        include: { item: true },
        orderBy: { item: { name: 'asc' } },
      },
    },
    orderBy: { issuedAt: 'asc' },
  });

  const rows = [];
  let grandTotal = 0;
  for (const d of docs) {
    for (const line of d.items) {
      const cost = line.quantityIssued * (line.unitCost || line.item.unitCost);
      grandTotal += cost;
      rows.push({
        ris: d.risNumber,
        date: d.issuedAt,
        department: d.department.name,
        item: line.item.name,
        unit: line.item.unit,
        qty: line.quantityIssued,
        unitCost: line.unitCost || line.item.unitCost,
        total: cost,
      });
    }
  }

  const subtitle = `Report of Supplies and Materials Issued\nPeriod: ${new Date(from).toLocaleDateString()} to ${new Date(to).toLocaleDateString()}`;

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('RSMI');
    addTableStyle(ws, [
      { header: 'RIS No.', key: 'ris', width: 20 },
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Department', key: 'department', width: 26 },
      { header: 'Item / Description', key: 'item', width: 40 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'Qty Issued', key: 'qty', width: 12 },
      { header: 'Unit Cost', key: 'unitCost', width: 14 },
      { header: 'Total Cost', key: 'total', width: 16 },
    ], rows.map((r) => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      unitCost: r.unitCost,
      total: Math.round(r.total * 100) / 100,
    })));
    ws.addRow({ ris: '', item: '', qty: '', unitCost: '' });
    ws.addRow({ ris: 'TOTAL', department: '', item: `Grand Total (${rows.length} line items)`, total: Math.round(grandTotal * 100) / 100 });
    ws.getRow(ws.rowCount).font = { bold: true };
    return renderExcel(res, wb, `RSMI_${from}_${to}.xlsx`);
  }

  const body = rows.map((r) => [
    r.ris,
    r.date instanceof Date ? r.date.toLocaleDateString() : String(r.date).slice(0, 10),
    r.department,
    r.item,
    r.unit,
    r.qty,
    money(r.unitCost),
    money(r.total),
  ]);
  body.push([{ text: 'TOTAL', colSpan: 7, alignment: 'right', bold: true }, {}, {}, {}, {}, {}, {}, { text: money(grandTotal), bold: true }]);

  renderPdf(res, {
    ...pdfHeader('REPORT OF SUPPLIES AND MATERIALS ISSUED', subtitle),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'RIS No.', style: 'th' }, { text: 'Date', style: 'th' }, { text: 'Dept', style: 'th' }, { text: 'Item / Description', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'Qty', style: 'th' }, { text: 'Unit Cost', style: 'th' }, { text: 'Total', style: 'th' }],
            ...body,
          ],
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
      { text: `Prepared: ${new Date().toLocaleString()}`, margin: [0, 12, 0, 0], fontSize: 8.5, color: '#555555' },
    ],
  }, `RSMI_${from}_${to}.pdf`);
}

async function inventoryReport(req, res) {
  const { categoryId, format = 'pdf' } = req.query;
  const where = { isActive: true };
  if (categoryId) where.categoryId = categoryId;

  const items = await prisma.item.findMany({
    where,
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const rows = items.map((i) => ({
    sku: i.sku,
    name: i.name,
    category: i.category.name,
    unit: i.unit,
    stock: i.currentStock,
    threshold: i.reorderThreshold,
    status: i.currentStock <= i.reorderThreshold ? 'Low' : 'OK',
    unitCost: i.unitCost,
    value: i.currentStock * i.unitCost,
  }));
  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('Inventory Summary');
    addTableStyle(ws, [
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Item / Description', key: 'name', width: 42 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'On Hand', key: 'stock', width: 12 },
      { header: 'Reorder Level', key: 'threshold', width: 14 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Unit Cost', key: 'unitCost', width: 14 },
      { header: 'Stock Value', key: 'value', width: 16 },
    ], rows);
    ws.addRow({ name: `TOTAL VALUE (${rows.length} items)`, value: Math.round(totalValue * 100) / 100 });
    ws.getRow(ws.rowCount).font = { bold: true };
    return renderExcel(res, wb, 'Inventory_Summary.xlsx');
  }

  const body = rows.map((r) => [
    r.sku, r.name, r.category, r.unit, r.stock, r.threshold,
    { text: r.status, color: r.status === 'Low' ? '#b91c1c' : '#15803d', bold: true },
    money(r.unitCost), money(r.value),
  ]);
  body.push([{ text: 'TOTAL', colSpan: 8, alignment: 'right', bold: true }, {}, {}, {}, {}, {}, {}, {}, { text: money(totalValue), bold: true }]);

  renderPdf(res, {
    ...pdfHeader('INVENTORY SUMMARY REPORT', `As of ${new Date().toLocaleString()}`),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'SKU', style: 'th' }, { text: 'Item / Description', style: 'th' }, { text: 'Category', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'On Hand', style: 'th' }, { text: 'Reorder', style: 'th' }, { text: 'Status', style: 'th' }, { text: 'Unit Cost', style: 'th' }, { text: 'Stock Value', style: 'th' }],
            ...body,
          ],
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
      { text: 'Low stock items are flagged in red. Reorder at or below the reorder level.', margin: [0, 10, 0, 0], fontSize: 8.5, color: '#555555' },
    ],
  }, 'Inventory_Summary.pdf');
}

async function movementsReport(req, res) {
  const { itemId, from, to, format = 'pdf' } = req.query;
  const where = {};
  if (itemId) where.itemId = itemId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const entries = await prisma.ledgerEntry.findMany({
    where,
    include: { item: { select: { sku: true, name: true, unit: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const rows = entries.map((e) => ({
    date: e.date,
    sku: e.item.sku,
    item: e.item.name,
    ref: `${REFERENCE_LABELS[e.referenceType]}${e.referenceId ? '' : ''}`,
    type: e.referenceType,
    in: e.inflow,
    out: e.outflow,
    balance: e.runningBalance,
    unit: e.item.unit,
    remarks: e.remarks || '',
  }));
  const totalIn = rows.reduce((s, r) => s + r.in, 0);
  const totalOut = rows.reduce((s, r) => s + r.out, 0);

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('Stock Movements');
    addTableStyle(ws, [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Item', key: 'item', width: 40 },
      { header: 'Reference', key: 'type', width: 16 },
      { header: 'In', key: 'in', width: 12 },
      { header: 'Out', key: 'out', width: 12 },
      { header: 'Balance', key: 'balance', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ], rows.map((r) => ({ ...r, date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10), type: REFERENCE_LABELS[r.type] || r.type })));
    ws.addRow({ remarks: 'TOTALS', in: Math.round(totalIn * 100) / 100, out: Math.round(totalOut * 100) / 100 });
    ws.getRow(ws.rowCount).font = { bold: true };
    return renderExcel(res, wb, 'Stock_Movements.xlsx');
  }

  const body = rows.map((r) => [
    r.date instanceof Date ? r.date.toLocaleDateString() : String(r.date).slice(0, 10),
    r.sku, r.item, REFERENCE_LABELS[r.type] || r.type, r.in, r.out, r.balance, r.unit, r.remarks,
  ]);
  body.push([{ text: 'TOTALS', colSpan: 3, bold: true }, {}, {}, {}, { text: totalIn, bold: true }, { text: totalOut, bold: true }, {}, {}, {}]);

  renderPdf(res, {
    ...pdfHeader('STOCK MOVEMENT HISTORY', `Generated ${new Date().toLocaleString()}`),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Date', style: 'th' }, { text: 'SKU', style: 'th' }, { text: 'Item', style: 'th' }, { text: 'Reference', style: 'th' }, { text: 'In', style: 'th' }, { text: 'Out', style: 'th' }, { text: 'Balance', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'Remarks', style: 'th' }],
            ...body,
          ],
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, 'Stock_Movements.pdf');
}

async function ledgerCardReport(req, res) {
  const item = await prisma.item.findUnique({ where: { id: req.params.itemId }, include: { category: true } });
  if (!item) throw new ApiError(404, 'Item not found.');

  const entries = await prisma.ledgerEntry.findMany({
    where: { itemId: item.id },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const typeCols = {
    OPENING_BALANCE: 'Opening',
    RECEIPT: 'Receipt',
    ISSUANCE: 'Issuance',
    ADJUSTMENT_IN: 'Adjust In',
    ADJUSTMENT_OUT: 'Adjust Out',
    RETURN: 'Return',
  };

  const body = entries.map((e) => [
    e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10),
    e.referenceId ? (e.remarks ? e.remarks.split(' — ')[0] || e.remarks : e.referenceId) : typeCols[e.referenceType],
    typeCols[e.referenceType],
    e.inflow,
    e.outflow,
    e.runningBalance,
    e.remarks || '',
  ]);

  if (req.query.format === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('Ledger Card');
    addTableStyle(ws, [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Reference', key: 'ref', width: 28 },
      { header: 'Transaction', key: 'type', width: 16 },
      { header: 'In', key: 'in', width: 12 },
      { header: 'Out', key: 'out', width: 12 },
      { header: 'Balance', key: 'balance', width: 12 },
      { header: 'Remarks', key: 'remarks', width: 40 },
    ], entries.map((e, idx) => ({
      date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10),
      ref: e.referenceId ? (e.remarks ? e.remarks.split(' — ')[0] || e.remarks : e.referenceId) : typeCols[e.referenceType],
      type: typeCols[e.referenceType] || e.referenceType,
      in: e.inflow,
      out: e.outflow,
      balance: e.runningBalance,
      remarks: e.remarks || '',
    })));
    ws.addRow({ remarks: `Opening balance: ${item.currentStock} ${item.unit}`, in: '', out: '', balance: '' });
    ws.getRow(ws.rowCount).font = { bold: true };
    return renderExcel(res, wb, `Ledger_Card_${item.sku}.xlsx`);
  }

  renderPdf(res, {
    ...pdfHeader('SUPPLY LEDGER CARD', `${item.name} (${item.sku})\nCategory: ${item.category.name}  |  Unit: ${item.unit}  |  Reorder Level: ${item.reorderThreshold}`),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Date', style: 'th' }, { text: 'Reference', style: 'th' }, { text: 'Transaction', style: 'th' }, { text: 'In', style: 'th' }, { text: 'Out', style: 'th' }, { text: 'Balance', style: 'th' }, { text: 'Remarks', style: 'th' }],
            ...body,
          ],
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, `Ledger_Card_${item.sku}.pdf`);
}

module.exports = { rsmiReport, inventoryReport, movementsReport, ledgerCardReport, parReport };

async function parReport(req, res) {
  const ris = await prisma.ris.findUnique({
    where: { id: req.params.id },
    include: { department: true, items: { where: { quantityIssued: { gt: 0 } }, include: { item: { include: { category: true } } } } },
  });
  if (!ris) throw new ApiError(404, 'RIS not found.');

  const accountableItems = ris.items.filter((it) => it.item.isAccountable);
  if (accountableItems.length === 0) {
    throw new ApiError(400, 'No accountable items in this RIS. Mark items as accountable to generate PAR.');
  }

  const issuedAt = ris.issuedAt ? new Date(ris.issuedAt) : new Date();
  const body = [
    [{ text: 'PROPERTY ACKNOWLEDGEMENT RECEIPT', style: 'title' }, {}, {}, {}, {}, {}],
    [{ text: `RIS: ${ris.risNumber}`, colSpan: 3 }, { text: `Date: ${issuedAt.toLocaleDateString()}`, colSpan: 3 }, {}, {}, {}, {}],
    [{ text: `Department: ${ris.department.name}`, colSpan: 3 }, { text: `Requested by: ${ris.requestedBy?.fullName || ''}`, colSpan: 3 }, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}],
    [{ text: 'Item', style: 'th' }, { text: 'Stock No.', style: 'th' }, { text: 'Description', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'Qty', style: 'th' }, { text: 'Unit Cost', style: 'th' }, { text: 'Total', style: 'th' }],
    ...accountableItems.map((it) => {
      const qty = it.quantityIssued;
      const cost = it.unitCost || it.item.unitCost;
      const total = qty * cost;
      return [
        it.item.name,
        it.item.stockNumber || '',
        it.item.description || '',
        it.item.unit,
        qty,
        money(cost),
        money(total),
      ];
    }),
    [{ text: `TOTAL: ${money(accountableItems.reduce((s, it) => s + (it.quantityIssued * (it.unitCost || it.item.unitCost)), 0))}`, colSpan: 6, bold: true }, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}],
    [{ text: 'Received by:', bold: true }, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}],
    [{ text: 'Name & Signature', bold: true }, {}, { text: 'Date', bold: true }, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}],
    [{ text: 'Acknowledged by:', bold: true }, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}],
    [{ text: 'Property Custodian', bold: true }, {}, { text: 'Date', bold: true }, {}, {}, {}],
  ];

  renderPdf(res, {
    ...pdfHeader('PROPERTY ACKNOWLEDGEMENT RECEIPT', `COA-compliant PAR for RIS ${ris.risNumber}`),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body,
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, `PAR_${ris.risNumber}.pdf`);
}

async function agingReport(req, res) {
  const { format = 'pdf' } = req.query;

  const items = await prisma.item.findMany({
    where: { isActive: true },
    include: {
      category: true,
      ledgerEntries: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });

  const now = new Date();
  const buckets = [
    { label: '0-30 days', min: 0, max: 30 },
    { label: '31-90 days', min: 31, max: 90 },
    { label: '91-180 days', min: 91, max: 180 },
    { label: '181-365 days', min: 181, max: 365 },
    { label: '> 365 days', min: 366, max: Infinity },
  ];

  const rows = items.map((item) => {
    const lastMove = item.ledgerEntries[0]?.date || item.createdAt;
    const age = Math.floor((now - new Date(lastMove)) / (1000 * 60 * 60 * 24));
    const bucket = buckets.find((b) => age >= b.min && age <= b.max) || { label: '> 365 days' };
    return {
      sku: item.sku,
      name: item.name,
      category: item.category?.name || '—',
      stock: item.currentStock,
      lastMove: new Date(lastMove).toLocaleDateString(),
      age,
      bucket: bucket.label,
    };
  });

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Aging');
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Item', key: 'name', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Stock', key: 'stock', width: 12 },
      { header: 'Last Movement', key: 'lastMove', width: 16 },
      { header: 'Age (days)', key: 'age', width: 12 },
      { header: 'Aging Bucket', key: 'bucket', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));
    renderExcel(res, workbook, 'inventory-aging.xlsx');
    return;
  }

  const body = [
    [{ text: 'INVENTORY AGING REPORT', style: 'title' }, {}, {}, {}, {}, {}, {}],
    [{ text: `Generated: ${now.toLocaleString()}`, colSpan: 7 }, {}, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: 'SKU', style: 'th' }, { text: 'Item', style: 'th' }, { text: 'Category', style: 'th' }, { text: 'Stock', style: 'th' }, { text: 'Last Movement', style: 'th' }, { text: 'Age (days)', style: 'th' }, { text: 'Aging Bucket', style: 'th' }],
    ...rows.map((r) => [r.sku, r.name, r.category, String(r.stock), r.lastMove, String(r.age), r.bucket]),
  ];

  renderPdf(res, {
    ...pdfHeader('INVENTORY AGING REPORT', 'Slow-moving and obsolete inventory analysis'),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', 'auto', 'auto', 'auto', 'auto'],
          body,
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, 'inventory-aging.pdf');
}

async function acknowledgmentSlipReport(req, res) {
  const ris = await prisma.ris.findUnique({
    where: { id: req.params.id },
    include: { department: true, items: { where: { quantityIssued: { gt: 0 } }, include: { item: true } } },
  });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (!['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status)) {
    throw new ApiError(400, 'Only issued RIS can generate acknowledgment slip.');
  }

  const issuedAt = ris.issuedAt ? new Date(ris.issuedAt) : new Date();
  const totalValue = ris.items.reduce((sum, it) => sum + (it.quantityIssued * (it.unitCost || it.item.unitCost)), 0);

  const body = [
    [{ text: 'ACKNOWLEDGMENT SLIP', style: 'title' }, {}, {}, {}, {}, {}],
    [{ text: `RIS: ${ris.risNumber}`, colSpan: 3 }, { text: `Date: ${issuedAt.toLocaleDateString()}`, colSpan: 3 }, {}, {}, {}, {}],
    [{ text: `Department: ${ris.department.name}`, colSpan: 3 }, { text: `Requested by: ${ris.requestedBy?.fullName || ''}`, colSpan: 3 }, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}],
    [{ text: 'Item', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'Qty Issued', style: 'th' }, { text: 'Unit Cost', style: 'th' }, { text: 'Total', style: 'th' }, {}, {}],
    ...ris.items.map((it) => {
      const qty = it.quantityIssued;
      const cost = it.unitCost || it.item.unitCost;
      const total = qty * cost;
      return [it.item.name, it.item.unit, String(qty), money(cost), money(total), {}, {}];
    }),
    [{ text: `TOTAL VALUE: ${money(totalValue)}`, colSpan: 4, bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: 'Received by:', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: 'Name & Signature', bold: true }, {}, { text: 'Date', bold: true }, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: 'Acknowledged by:', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, {}],
    [{ text: 'Property Custodian / Authorized Officer', bold: true }, {}, { text: 'Date', bold: true }, {}, {}, {}, {}],
  ];

  renderPdf(res, {
    ...pdfHeader('ACKNOWLEDGMENT SLIP', `Acknowledgment of receipt for RIS ${ris.risNumber}`),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body,
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, `Acknowledgment_${ris.risNumber}.pdf`);
}


async function icsReport(req, res) {
  const { from, to, format = 'pdf' } = req.query;
  if (!from || !to) throw new ApiError(400, 'from and to (dates) are required.');

  const risList = await prisma.ris.findMany({
    where: {
      status: { in: ['ISSUED', 'PARTIALLY_ISSUED'] },
      issuedAt: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) },
    },
    include: {
      department: true,
      requestedBy: { select: { fullName: true, username: true } },
      issuedBy: { select: { fullName: true } },
      items: {
        where: { quantityIssued: { gt: 0 } },
        include: { item: { include: { category: true } } },
      },
    },
    orderBy: { issuedAt: 'desc' },
  });

  if (risList.length === 0) {
    throw new ApiError(404, 'No ICS records found for the selected period.');
  }

  const rows = [];
  let totalValue = 0;
  for (const ris of risList) {
    for (const line of ris.items) {
      const cost = line.unitCost || line.item.unitCost;
      const lineTotal = line.quantityIssued * cost;
      totalValue += lineTotal;
      rows.push({
        date: ris.issuedAt ? new Date(ris.issuedAt).toLocaleDateString() : '—',
        risNumber: ris.risNumber,
        department: ris.department.name,
        item: line.item.name,
        stockNumber: line.item.stockNumber || '—',
        unit: line.item.unit,
        qty: line.quantityIssued,
        unitCost: cost,
        total: lineTotal,
        issuedBy: ris.issuedBy?.fullName || '—',
      });
    }
  }

  const startDate = new Date(from).toLocaleDateString();
  const endDate = new Date(to).toLocaleDateString();

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('ICS Report');
    addTableStyle(ws, [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'RIS No.', key: 'risNumber', width: 20 },
      { header: 'Department', key: 'department', width: 26 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Stock No.', key: 'stockNumber', width: 20 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Qty', key: 'qty', width: 10 },
      { header: 'Unit Cost', key: 'unitCost', width: 14 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Issued By', key: 'issuedBy', width: 26 },
    ], rows.map((r) => ({ ...r, unitCost: money(r.unitCost), total: money(r.total) })));
    return renderExcel(res, wb, `ICS_Report_${startDate}_to_${endDate}.xlsx`);
  }

  const body = [
    [{ text: 'INVENTORY CUSTODIAN SLIP (ICS)', style: 'title' }, {}, {}, {}, {}],
    [{ text: `Period: ${startDate} to ${endDate}`, colSpan: 5, alignment: 'center' }],
    [{ text: 'Item', style: 'th' }, { text: 'Stock No.', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'Qty', style: 'th' }, { text: 'Unit Cost', style: 'th' }, { text: 'Total', style: 'th' }, { text: 'Dept', style: 'th' }, { text: 'RIS No.', style: 'th' }, { text: 'Date', style: 'th' }, { text: 'Issued By', style: 'th' }],
    ...rows.map((r) => [r.item, r.stockNumber, r.unit, r.qty, money(r.unitCost), money(r.total), r.department, r.risNumber, r.date, r.issuedBy]),
    [{ text: `TOTAL: ${money(totalValue)}`, colSpan: 6, bold: true }, {}, {}, {}, {}],
  ];

  renderPdf(res, {
    ...pdfHeader('INVENTORY CUSTODIAN SLIP (ICS)', `Period: ${startDate} to ${endDate}`),
    content: [
      {
        table: {
          headerRows: 2,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', '*'],
          body,
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, `ICS_Report_${startDate}_to_${endDate}.pdf`);
}

async function appReport(req, res) {
  const { year, format = 'pdf' } = req.query;
  const currentYear = new Date().getFullYear();
  const targetYear = year ? Number(year) : currentYear;
  if (!Number.isFinite(targetYear) || targetYear < 2000) {
    throw new ApiError(400, 'Invalid year.');
  }

  const accountableItems = await prisma.item.findMany({
    where: { isActive: true, isAccountable: true },
    include: { category: true },
  });

  const risIssued = await prisma.ris.findMany({
    where: {
      status: { in: ['ISSUED', 'PARTIALLY_ISSUED'] },
      issuedAt: { gte: new Date(`${targetYear}-01-01T00:00:00.000Z`), lte: new Date(`${targetYear}-12-31T23:59:59.999Z`) },
    },
    include: {
      items: {
        where: { quantityIssued: { gt: 0 } },
        include: { item: true },
      },
    },
  });

  let totalOriginalCost = 0;
  let totalCurrentValue = 0;
  const rows = accountableItems.map((item, idx) => {
    const originalCost = item.unitCost * item.currentStock;
    const yearsOwned = Math.max(new Date().getFullYear() - new Date(item.createdAt).getFullYear(), 1);
    const depreciationRate = Math.min(0.2 * yearsOwned, 0.8);
    const currentValue = originalCost * (1 - depreciationRate);
    totalOriginalCost += originalCost;
    totalCurrentValue += currentValue;
    return {
      no: idx + 1,
      sku: item.sku,
      name: item.name,
      stockNumber: item.stockNumber || '—',
      unit: item.unit,
      quantity: item.currentStock,
      unitCost: item.unitCost,
      originalCost,
      currentValue,
    };
  });

  const totalRisValue = risIssued.reduce((sum, r) => {
    return sum + r.items.reduce((s, it) => s + (it.quantityIssued * (it.unitCost || it.item.unitCost)), 0);
  }, 0);

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('APP Report');
    addTableStyle(ws, [
      { header: 'No.', key: 'no', width: 8 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Name', key: 'name', width: 34 },
      { header: 'Stock No.', key: 'stockNumber', width: 20 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Qty', key: 'quantity', width: 10 },
      { header: 'Unit Cost', key: 'unitCost', width: 14 },
      { header: 'Original Cost', key: 'originalCost', width: 16 },
      { header: 'Current Value', key: 'currentValue', width: 16 },
    ], rows.map((r) => ({ ...r, unitCost: money(r.unitCost), originalCost: money(r.originalCost), currentValue: money(r.currentValue) })));
    ws.addRow({});
    ws.addRow({ no: 'TOTALS', originalCost: money(totalOriginalCost), currentValue: money(totalCurrentValue) });
    ws.addRow({ no: `Issued YTD (${targetYear})`, originalCost: money(totalRisValue) });
    return renderExcel(res, wb, `APP_Report_${targetYear}.xlsx`);
  }

  const body = [
    [{ text: 'ANNUAL PROPERTY, PLANT AND EQUIPMENT (APP)', style: 'title' }, {}, {}, {}, {}],
    [{ text: `For the Year Ending: December 31, ${targetYear}`, colSpan: 5, alignment: 'center' }],
    [{ text: 'No.', style: 'th' }, { text: 'SKU', style: 'th' }, { text: 'Item', style: 'th' }, { text: 'Stock No.', style: 'th' }, { text: 'Unit', style: 'th' }, { text: 'Qty', style: 'th' }, { text: 'Unit Cost', style: 'th' }, { text: 'Orig. Cost', style: 'th' }, { text: 'Cur. Value', style: 'th' }],
    ...rows.map((r) => [r.no, r.sku, r.name, r.stockNumber, r.unit, r.quantity, money(r.unitCost), money(r.originalCost), money(r.currentValue)]),
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, { text: 'TOTAL ORIGINAL COST' }, { text: money(totalOriginalCost), bold: true }, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, { text: 'TOTAL CURRENT VALUE' }, { text: money(totalCurrentValue), bold: true }, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, { text: `Issued YTD (${targetYear})` }, { text: money(totalRisValue), bold: true }, {}],
  ];

  renderPdf(res, {
    ...pdfHeader('ANNUAL PROPERTY, PLANT AND EQUIPMENT (APP)', `For the Year Ending: December 31, ${targetYear}`),
    content: [
      {
        table: {
          headerRows: 2,
          widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body,
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, `APP_Report_${targetYear}.pdf`);
}



async function varianceReport(req, res) {
  const { format = 'pdf', from, to, departmentId, status = 'SUBMITTED' } = req.query;
  const where = { status };
  if (from || to) {
    where.countDate = {};
    if (from) where.countDate.gte = new Date(from);
    if (to) where.countDate.lte = new Date(to);
  }
  if (departmentId) where.departmentId = departmentId;

  const counts = await prisma.physicalCount.findMany({
    where,
    include: {
      department: true,
      createdBy: { select: { fullName: true } },
      items: { include: { item: { include: { category: true } } } },
    },
    orderBy: { countDate: 'desc' },
  });

  const rows = [];
  for (const count of counts) {
    for (const item of count.items) {
      rows.push({
        countNo: count.id.slice(0, 8).toUpperCase(),
        countDate: new Date(count.countDate).toLocaleDateString(),
        department: count.department?.name || '—',
        submittedBy: count.createdBy?.fullName || '—',
        status: count.status,
        sku: item.item?.sku || '—',
        itemName: item.item?.name || '—',
        category: item.item?.category?.name || '—',
        systemQty: item.systemQuantity,
        countedQty: item.countedQuantity,
        variance: item.variance,
        variancePct: item.systemQuantity > 0 ? ((item.variance / item.systemQuantity) * 100).toFixed(1) + '%' : 'N/A',
      });
    }
  }

  const summary = {
    totalCounts: counts.length,
    totalItems: rows.length,
    itemsWithVariance: rows.filter((r) => r.variance !== 0).length,
    totalVarianceQty: rows.reduce((s, r) => s + Math.abs(r.variance), 0),
  };

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Variance Report');
    ws.columns = [
      { header: 'Count ID', key: 'countNo', width: 12 },
      { header: 'Date', key: 'countDate', width: 14 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Submitted By', key: 'submittedBy', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Item', key: 'itemName', width: 35 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'System Qty', key: 'systemQty', width: 14 },
      { header: 'Counted Qty', key: 'countedQty', width: 14 },
      { header: 'Variance', key: 'variance', width: 12 },
      { header: 'Var %', key: 'variancePct', width: 10 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    renderExcel(res, wb, Physical_Count_Variance_.xlsx);
    return;
  }

  const body = [
    [{ text: 'PHYSICAL COUNT VARIANCE REPORT', style: 'title' }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    [{ text: 'Generated: ' + new Date().toLocaleString() + ' | Counts: ' + summary.totalCounts + ' | Items: ' + summary.totalItems + ' | With Variance: ' + summary.itemsWithVariance, colSpan: 12 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    [{ text: '', bold: true }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    [{ text: 'ID', style: 'th' }, { text: 'Date', style: 'th' }, { text: 'Dept', style: 'th' }, { text: 'Submitted By', style: 'th' }, { text: 'Status', style: 'th' }, { text: 'SKU', style: 'th' }, { text: 'Item', style: 'th' }, { text: 'Category', style: 'th' }, { text: 'System', style: 'th' }, { text: 'Counted', style: 'th' }, { text: 'Variance', style: 'th' }, { text: '%', style: 'th' }],
    ...rows.map((r) => [
      r.countNo, r.countDate, r.department, r.submittedBy, r.status,
      r.sku, r.itemName, r.category,
      String(r.systemQty), String(r.countedQty),
      { text: String(r.variance), color: r.variance !== 0 ? 'red' : undefined },
      r.variancePct,
    ]),
  ];

  renderPdf(res, {
    ...pdfHeader('PHYSICAL COUNT VARIANCE REPORT', 'COA Circular 2021-002 — Physical count reconciliation'),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*', 'auto', 'auto', '*', '*', 'auto', 'auto', 'auto', 'auto'],
          body,
          layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
        },
      },
    ],
  }, Physical_Count_Variance_.pdf);
}

module.exports = { rsmiReport, inventoryReport, movementsReport, ledgerCardReport, parReport, agingReport, acknowledgmentSlipReport, icsReport, appReport, varianceReport };
