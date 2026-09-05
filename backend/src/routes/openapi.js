/**
 * @openapi
 * components:
 *   parameters:
 *     IdParam:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, format: uuid }
 *     PageQuery:
 *       in: query
 *       name: page
 *       schema: { type: integer, minimum: 1, default: 1 }
 *     LimitQuery:
 *       in: query
 *       name: limit
 *       schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *   responses:
 *     Unauthorized:
 *       description: Missing or invalid token.
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Error' }
 *     Forbidden:
 *       description: Authenticated but lacking permission.
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Error' }
 *     NotFound:
 *       description: Resource not found.
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Error' }
 *     Error:
 *       description: Server error.
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, description: 'Username or email.' }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: JWT + public user profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:  { $ref: '#/components/schemas/User' }
  *       401: { $ref: '#/components/responses/Unauthorized' }
  *
  * /auth/refresh-token:
  *   post:
  *     tags: [Auth]
  *     summary: Refresh access token
  *     security: []
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required: [refreshToken]
  *             properties:
  *               refreshToken: { type: string }
  *     responses:
  *       200:
  *         description: New JWT + refresh token pair.
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 token: { type: string }
  *                 refreshToken: { type: string }
  *                 user:  { $ref: '#/components/schemas/User' }
  *       401: { $ref: '#/components/responses/Unauthorized' }
  *
  * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current user
 *     responses:
 *       200:
 *         description: The authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the current user's password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword:     { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Password updated. }
 *       400: { description: Validation failed. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out (client should discard the token; server audits the event)
 *     responses:
 *       200: { description: Signed out. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset (always returns 200 to avoid user enumeration)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string, description: 'Username or email address.' }
 *     responses:
 *       200: { description: If an account matches, a reset link has been sent.' }
 *
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using a one-time token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string, description: 'One-time reset token.' }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Password has been reset.' }
 *       400: { description: Invalid or expired token.' }
 */

/**
 * @openapi
 * /users/stats/dashboard:
 *   get:
 *     tags: [Users]
 *     summary: Dashboard KPIs (counts, low-stock, recent ledger)
 *     responses:
 *       200: { description: Aggregated stats. }
 *
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { $ref: '#/components/schemas/Role' }
 *     responses:
 *       200: { description: Paginated users. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Users]
 *     summary: Create a user (ADMIN)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, fullName, role]
 *             properties:
 *               username:     { type: string }
 *               email:        { type: string, format: email }
 *               password:     { type: string, minLength: 8 }
 *               fullName:     { type: string }
 *               role:         { $ref: '#/components/schemas/Role' }
 *               departmentId: { type: string, format: uuid, nullable: true }
 *               externalId:   { type: string, nullable: true }
 *     responses:
 *       201: { description: Created. }
 *       409: { description: Username or email already in use. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (ADMIN)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:     { type: string }
 *               email:        { type: string, format: email }
 *               role:         { $ref: '#/components/schemas/Role' }
 *               departmentId: { type: string, format: uuid, nullable: true }
 *               isActive:     { type: boolean }
 *               externalId:   { type: string, nullable: true }
 *               password:     { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Updated user. }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

/**
 * @openapi
 * /items:
 *   get:
 *     tags: [Items]
 *     summary: List items
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: lowStock
 *         schema: { type: boolean }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated items. }
 *   post:
 *     tags: [Items]
 *     summary: Create an item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, name, categoryId, unit]
 *             properties:
 *               sku:              { type: string }
 *               name:             { type: string }
 *               description:      { type: string }
 *               categoryId:       { type: string, format: uuid }
 *               unit:             { type: string }
 *               reorderThreshold: { type: number }
 *               currentStock:     { type: number }
 *               unitCost:         { type: number }
 *               stockNumber:      { type: string, nullable: true }
 *               fundCluster:      { type: string, nullable: true }
 *     responses:
 *       201: { description: Created. }
 *
 * /items/export:
 *   get:
 *     tags: [Items]
 *     summary: Export items as CSV
 *     responses:
 *       200:
 *         description: text/csv
 *         content:
 *           text/csv: {}
 *
 * /items/import:
 *   post:
 *     tags: [Items]
 *     summary: Import items from CSV
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [csv]
 *             properties:
 *               csv: { type: string }
 *     responses:
 *       200: { description: Import summary. }
 *
 * /items/lookup/{sku}:
 *   get:
 *     tags: [Items]
 *     summary: Lookup by SKU / barcode
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Item. }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /items/{id}:
 *   get:
 *     tags: [Items]
 *     summary: Get an item
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Item with last 50 ledger entries. }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     tags: [Items]
 *     summary: Update an item
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Updated. }
 *   delete:
 *     tags: [Items]
 *     summary: Archive an item (soft delete)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Archived. }
 *
 * /items/{id}/qr:
 *   get:
 *     tags: [Items]
 *     summary: Get QR data URL for an item
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: '{ sku, name, dataUrl }.' }
 *
 * /items/{id}/adjust:
 *   post:
 *     tags: [Items]
 *     summary: Adjust stock (IN/OUT)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operation, quantity, reason]
 *             properties:
 *               operation:     { type: string, enum: [IN, OUT] }
 *               quantity:      { type: number }
 *               reason:        { type: string }
 *               referenceType: { type: string, enum: [ADJUSTMENT_IN, ADJUSTMENT_OUT, RETURN] }
 *     responses:
 *       200: { description: Adjusted. }
 *       400: { description: Insufficient stock or invalid input. }
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories
 *     responses:
 *       200: { description: List of categories. }
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     responses:
 *       201: { description: Created. }
 *
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Updated. }
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (ADMIN, blocked if items exist)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Deleted. }
 *       409: { description: Category has items. }
 */

/**
 * @openapi
 * /departments:
 *   get:
 *     tags: [Departments]
 *     summary: List departments
 *     responses:
 *       200: { description: List of departments. }
 *   post:
 *     tags: [Departments]
 *     summary: Create a department (ADMIN)
 *     responses:
 *       201: { description: Created. }
 *
 * /departments/{id}:
 *   patch:
 *     tags: [Departments]
 *     summary: Update a department (ADMIN)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Updated. }
 *   delete:
 *     tags: [Departments]
 *     summary: Delete a department (ADMIN, blocked if used)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Deleted. }
 *       409: { description: Department is in use. }
 */

/**
 * @openapi
 * /ris:
 *   get:
 *     tags: [RIS]
 *     summary: List requisitions (Dept Heads scoped to own dept)
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/RisStatus' }
 *     responses:
 *       200: { description: Paginated RIS. }
 *   post:
 *     tags: [RIS]
 *     summary: Create a requisition
 *     responses:
 *       201: { description: Created. }
 *
 * /ris/{id}:
 *   get:
 *     tags: [RIS]
 *     summary: Get a requisition with totals + per-line available stock
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: RIS. }
 *
 * /ris/{id}/approve:
 *   patch:
 *     tags: [RIS]
 *     summary: Approve a requisition
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Approved. }
 *
 * /ris/{id}/reject:
 *   patch:
 *     tags: [RIS]
 *     summary: Reject a requisition
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Rejected. }
 *
 * /ris/{id}/issue:
 *   post:
 *     tags: [RIS]
 *     summary: Issue items against an approved RIS (auto-truncates per stock)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Issued or partially issued. }
 *
 * /ris/{id}/cancel:
 *   patch:
 *     tags: [RIS]
 *     summary: Cancel a requisition (ADMIN)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Cancelled. }
 */

/**
 * @openapi
 * /ledger:
 *   get:
 *     tags: [Ledger]
 *     summary: List ledger entries
 *     responses:
 *       200: { description: Paginated ledger entries. }
 *
 * /ledger/items/{itemId}/card:
 *   get:
 *     tags: [Ledger]
 *     summary: Per-item ledger card (running balance)
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ledger card. }
 */

/**
 * @openapi
 * /inventory/suppliers:
 *   get:
 *     tags: [Inventory]
 *     summary: List suppliers
 *     responses:
 *       200: { description: List of suppliers. }
 *   post:
 *     tags: [Inventory]
 *     summary: Create a supplier
 *     responses:
 *       201: { description: Created. }
 *
 * /inventory/receivings:
 *   get:
 *     tags: [Inventory]
 *     summary: List receivings
 *     responses:
 *       200: { description: Paginated receivings. }
 *   post:
 *     tags: [Inventory]
 *     summary: Create a receiving (updates stock + writes RECEIPT ledger in a transaction)
 *     responses:
 *       201: { description: Created. }
 *
 * /inventory/receivings/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a receiving
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
  *       200: { description: Receiving. }
  */

 /**
  * @openapi
  * /purchase-orders:
  *   get:
  *     tags: [PurchaseOrders]
  *     summary: List purchase orders
  *     responses:
  *       200: { description: Paginated purchase orders. }
  *   post:
  *     tags: [PurchaseOrders]
  *     summary: Create a purchase order
  *     responses:
  *       201: { description: Created. }
  *
  * /purchase-orders/{id}:
  *   get:
  *     tags: [PurchaseOrders]
  *     summary: Get a purchase order
  *     parameters:
  *       - $ref: '#/components/parameters/IdParam'
  *     responses:
  *       200: { description: PurchaseOrder. }
  *   patch:
  *     tags: [PurchaseOrders]
  *     summary: Update a pending purchase order
  *     parameters:
  *       - $ref: '#/components/parameters/IdParam'
  *     responses:
  *       200: { description: Updated. }
  *
  * /purchase-orders/{id}/approve:
  *   patch:
  *     tags: [PurchaseOrders]
  *     summary: Approve a pending purchase order
  *     parameters:
  *       - $ref: '#/components/parameters/IdParam'
  *     responses:
  *       200: { description: Approved. }
  *
  * /purchase-orders/{id}/cancel:
  *   patch:
  *     tags: [PurchaseOrders]
  *     summary: Cancel a pending or approved purchase order
  *     parameters:
  *       - $ref: '#/components/parameters/IdParam'
  *     responses:
  *       200: { description: Cancelled. }
  */

 /**
  * @openapi
  * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications
 *     responses:
 *       200: { description: Paginated with unreadCount. }
 *
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Unread count for the current user
 *     responses:
 *       200: { description: '{ count }.' }
 *
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: Updated. }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     responses:
 *       200: { description: '{ updated }.' }
 */

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags: [Audit]
 *     summary: List audit logs (ADMIN, AUDITOR)
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Paginated audit logs. }
 *
 * /audit-logs/export:
 *   get:
 *     tags: [Audit]
 *     summary: Export audit logs as PDF or Excel
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [pdf, xlsx] }
 *     responses:
 *       200: { description: File stream. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */

/**
 * @openapi
 * /reports/rsmi:
 *   get:
 *     tags: [Reports]
 *     summary: RSMI report (PDF or Excel)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [pdf, xlsx] }
 *     responses:
 *       200: { description: File stream. }
 *
 * /reports/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Inventory summary (stock value per item)
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [pdf, xlsx] }
 *     responses:
 *       200: { description: File stream. }
 *
 * /reports/movements:
 *   get:
 *     tags: [Reports]
 *     summary: Stock movement history
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [pdf, xlsx] }
 *     responses:
 *       200: { description: File stream. }
 *
  * /reports/ledger-card/{itemId}:
  *   get:
  *     tags: [Reports]
  *     summary: Per-item ledger card PDF
  *     parameters:
  *       - in: path
  *         name: itemId
  *         required: true
  *         schema: { type: string, format: uuid }
  *     responses:
  *       200: { description: PDF stream. }
  *
  * /reports/par/{risId}:
  *   get:
  *     tags: [Reports]
  *     summary: Property Acknowledgement Receipt (PAR) for a RIS
  *     parameters:
  *       - in: path
  *         name: risId
  *         required: true
  *         schema: { type: string, format: uuid }
  *     responses:
  *       200: { description: PDF stream. }
  *       400: { description: No accountable items in RIS. }
  */

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Metadata]
 *     summary: List available role codes
 *     security: []
 *     responses:
 *       200: { description: Array of role strings. }
 */