const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function wrap(title, body) {
  return {
    subject: `LGU IMS — ${title}`,
    text: body.text,
    html: `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; color: #23272e; max-width: 640px; margin: 0 auto; padding: 16px;">
      <div style="background: #0e7a50; color: #fff; padding: 12px 16px; border-radius: 6px 6px 0 0;">
        <strong>LGU Inventory Management System</strong>
      </div>
      <div style="border: 1px solid #e5dfd1; border-top: none; padding: 16px; border-radius: 0 0 6px 6px;">
        <h2 style="margin: 0 0 12px; font-size: 16px;">${escapeHtml(title)}</h2>
        ${body.html}
        <hr style="border: none; border-top: 1px solid #e5dfd1; margin: 16px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message from the LGU IMS. Do not reply to this email.</p>
      </div>
    </body></html>`,
  };
}

function lowStock(item) {
  return wrap('Low Stock Alert', {
    text: `Item: ${item.name}\nSKU: ${item.sku}\nCurrent stock: ${item.currentStock} ${item.unit}\nReorder threshold: ${item.reorderThreshold} ${item.unit}\n\nPlease reorder at your earliest convenience.`,
    html: `<p><strong>Item:</strong> ${escapeHtml(item.name)} (${escapeHtml(item.sku)})</p>
      <p><strong>Current stock:</strong> ${item.currentStock} ${escapeHtml(item.unit)}</p>
      <p><strong>Reorder threshold:</strong> ${item.reorderThreshold} ${escapeHtml(item.unit)}</p>
      <p>Please reorder at your earliest convenience.</p>`,
  });
}

function passwordReset(username, resetUrl) {
  return wrap('Password Reset Requested', {
    text: `A password reset was requested for your account.\n\nIf you made this request, open this link within 1 hour:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this message.`,
    html: `<p>A password reset was requested for your account <strong>${escapeHtml(username)}</strong>.</p>
      <p>If you made this request, click the link below within 1 hour:</p>
      <p><a href="${escapeHtml(resetUrl)}" style="background: #0e7a50; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Reset Password</a></p>
      <p style="font-size: 12px; color: #666;">If you did not request this, you can safely ignore this message.</p>`,
  });
}

function risCreated(risNumber, departmentName, purpose, url) {
  return wrap('New Requisition Pending Approval', {
    text: `A new requisition ${risNumber} has been submitted by ${departmentName}.\nPurpose: ${purpose}\n\nReview it at: ${url}`,
    html: `<p>A new requisition <strong>${escapeHtml(risNumber)}</strong> has been submitted by <strong>${escapeHtml(departmentName)}</strong>.</p>
      <p><strong>Purpose:</strong> ${escapeHtml(purpose)}</p>
      <p><a href="${escapeHtml(url)}" style="background: #0e7a50; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Review Requisition</a></p>`,
  });
}

function risStatusChange(risNumber, status, url) {
  const label = { APPROVED: 'Approved', REJECTED: 'Rejected', ISSUED: 'Issued', PARTIALLY_ISSUED: 'Partially Issued', CANCELLED: 'Cancelled' }[status] || status;
  return wrap(`Requisition ${label}`, {
    text: `Requisition ${risNumber} has been ${label.toLowerCase()}.\n\nView details: ${url}`,
    html: `<p>Requisition <strong>${escapeHtml(risNumber)}</strong> has been <strong>${escapeHtml(label)}</strong>.</p>
      <p><a href="${escapeHtml(url)}" style="background: #2563eb; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none;">View Details</a></p>`,
  });
}

module.exports = { lowStock, passwordReset, risCreated, risStatusChange };
