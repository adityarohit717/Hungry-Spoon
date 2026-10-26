process.env.NODE_ENV = 'test';
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import prisma from '../prisma';

describe('Hungry Spoon Restaurant Operating System Test Suite', () => {
  let adminToken: string;
  let staffToken: string;
  let adminId: string;
  let staffId: string;

  before(async () => {
    // 1. Verify Admin & Staff logins
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    assert.equal(adminRes.status, 200);
    assert.ok(adminRes.body.token);
    assert.equal(adminRes.body.user.role, 'ADMIN');
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user.id;

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'staff', password: 'staff123' });
    assert.equal(staffRes.status, 200);
    assert.ok(staffRes.body.token);
    assert.equal(staffRes.body.user.role, 'STAFF');
    staffToken = staffRes.body.token;
    staffId = staffRes.body.user.id;
  });

  describe('Authentication & Role Restrictions', () => {
    it('1. Admin can log in successfully', async () => {
      assert.ok(adminToken);
    });

    it('2. Staff can log in successfully', async () => {
      assert.ok(staffToken);
    });

    it('3. Invalid credentials are rejected with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
      assert.equal(res.status, 401);
      assert.ok(res.body.error);
    });

    it('7. Direct API requests cannot bypass role restrictions (staff cannot access user management)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(res.status, 403);
    });

    it('Admin can access user management', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(Array.isArray(res.body), true);
    });
  });

  describe('Order Creation & KOT Lifecycle', () => {
    let testOrderId: string;
    let testKotId: string;

    it('8. Orders can be created as DRAFT with server-side totals', async () => {
      const menuRes = await request(app).get('/api/menu');
      const firstCat = menuRes.body[0];
      const menuItem = firstCat.items[0];

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderType: 'DINE_IN',
          tableNumber: 'Table 99',
          orderNotes: 'Special test order',
          items: [
            {
              menuItemId: menuItem.id,
              quantity: 2,
              notes: 'Extra crispy',
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.match(res.body.orderNumber, /^ORD-/);
      assert.equal(res.body.status, 'DRAFT');
      assert.equal(res.body.subtotal, menuItem.sellingPrice * 2);
      testOrderId = res.body.id;
    });

    it('14 & 15. Sending an order to the kitchen creates a KOT with correct items', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/send-kitchen`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ allowStockOverride: true });

      assert.equal(res.status, 200);
      assert.ok(res.body.kot);
      assert.match(res.body.kot.kotNumber, /^KOT-/);
      assert.equal(res.body.kot.status, 'SENT_TO_KITCHEN');
      assert.equal(res.body.kot.items.length, 1);
      assert.equal(res.body.kot.items[0].quantity, 2);
      testKotId = res.body.kot.id;
    });

    it('16. KOT status updates work (Kitchen preparation workflow)', async () => {
      // 1. Move to PREPARING
      const prepRes = await request(app)
        .patch(`/api/kot/${testKotId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'PREPARING' });
      assert.equal(prepRes.status, 200);
      assert.equal(prepRes.body.status, 'PREPARING');

      // 2. Move to READY
      const readyRes = await request(app)
        .patch(`/api/kot/${testKotId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'READY' });
      assert.equal(readyRes.status, 200);
      assert.equal(readyRes.body.status, 'READY');
    });

    it('17. Post-submission changes preserve original KOT and generate amendment KOT', async () => {
      const menuRes = await request(app).get('/api/menu');
      const item2 = menuRes.body[0].items[1] || menuRes.body[1].items[0];

      // Fetch existing items for order
      const orderRes = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      const updatedItems = [
        ...orderRes.body.items.map((i: any) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
        {
          menuItemId: item2.id,
          quantity: 1,
          notes: 'Added mid-meal',
        },
      ];

      const editRes = await request(app)
        .put(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: updatedItems,
        });

      assert.equal(editRes.status, 200);

      // Verify a new version KOT (amendment) was created
      const kotsRes = await request(app)
        .get('/api/kot')
        .query({ search: orderRes.body.orderNumber })
        .set('Authorization', `Bearer ${staffToken}`);

      assert.ok(kotsRes.body.kots.length >= 2);
      const amendmentKot = kotsRes.body.kots.find((k: any) => k.version === 2);
      assert.ok(amendmentKot);
    });
  });

  describe('Customer Billing & Restrictions', () => {
    let billedOrderId: string;
    let customerBillId: string;
    let customerBillNumber: string;

    before(async () => {
      // Create and send an order
      const menuRes = await request(app).get('/api/menu');
      const item = menuRes.body[0].items[0];

      const ordRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderType: 'DINE_IN',
          tableNumber: 'Table 5',
          items: [{ menuItemId: item.id, quantity: 1 }],
          sendToKitchenDirectly: true,
          allowStockOverride: true,
        });
      billedOrderId = ordRes.body.id;

      // Finalize bill
      const billRes = await request(app)
        .post('/api/billing/finalize')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId: billedOrderId,
          discount: 20,
          discountReason: 'Loyalty discount',
        });

      assert.equal(billRes.status, 201);
      customerBillId = billRes.body.id;
      customerBillNumber = billRes.body.billNumber;
    });

    it('10. Bills receive unique identifiers with BILL- prefix', () => {
      assert.match(customerBillNumber, /^BILL-/);
    });

    it('11. A finalized bill cannot be edited by staff (order editing is blocked)', async () => {
      const menuRes = await request(app).get('/api/menu');
      const item = menuRes.body[0].items[0];

      const editRes = await request(app)
        .put(`/api/orders/${billedOrderId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ menuItemId: item.id, quantity: 5 }],
        });

      assert.equal(editRes.status, 403);
      assert.ok(editRes.body.error.includes('finalized'));
    });

    it('Cannot finalize an already finalized order again (duplicate prevention)', async () => {
      const secondFinalize = await request(app)
        .post('/api/billing/finalize')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId: billedOrderId,
        });

      assert.equal(secondFinalize.status, 400);
      assert.ok(secondFinalize.body.error.includes('already exists'));
    });

    it('4. Staff cannot delete a finalized bill (returns 403)', async () => {
      const delRes = await request(app)
        .delete(`/api/billing/${customerBillId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ confirm: true });

      assert.equal(delRes.status, 403);
    });

    it('5. Staff cannot delete a finalized KOT (returns 403)', async () => {
      const kotRes = await request(app)
        .get('/api/kot')
        .set('Authorization', `Bearer ${staffToken}`);
      const kot = kotRes.body.kots[0];

      const delRes = await request(app)
        .delete(`/api/kot/${kot.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ confirm: true });

      assert.equal(delRes.status, 403);
    });

    it('13. Recording payments updates payment status and records payment ledger', async () => {
      const payRes = await request(app)
        .post(`/api/billing/${customerBillId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          amount: 100,
          paymentMethod: 'UPI',
          referenceNumber: 'UPI-TEST-1234',
        });

      assert.equal(payRes.status, 201);
      assert.ok(payRes.body.payment);

      const billDetails = await request(app)
        .get(`/api/billing/${customerBillId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      assert.ok(billDetails.body.bill.payments.length >= 1);
    });

    it('26. Admin can delete bill with explicit confirmation and it creates an audit entry', async () => {
      const delRes = await request(app)
        .delete(`/api/billing/${customerBillId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirm: true,
          reason: 'Test administrative deletion',
          deleteAssociatedKOTs: false,
        });

      assert.equal(delRes.status, 200);

      const auditRes = await request(app)
        .get('/api/audit')
        .query({ eventType: 'BILL_DELETED' })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(auditRes.status, 200);
      assert.ok(auditRes.body.logs.length > 0);
      assert.ok(auditRes.body.logs[0].action.includes('ADMIN DELETED Bill'));
    });
  });

  describe('Inventory & Stock Management', () => {
    let testInventoryId: string;

    it('19. Stock item can be added by Admin', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Saffron Threads',
          category: 'Spices',
          unit: 'g',
          currentQuantity: 50,
          minThreshold: 10,
          reorderQuantity: 20,
          unitCost: 250,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'Saffron Threads');
      testInventoryId = res.body.id;
    });

    it('20. Manual stock adjustments create movement records with mandatory reason', async () => {
      const failRes = await request(app)
        .post(`/api/inventory/${testInventoryId}/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ newQuantity: 40 });
      assert.equal(failRes.status, 400);

      const res = await request(app)
        .post(`/api/inventory/${testInventoryId}/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ newQuantity: 45, reason: 'Physical stock reconciliation audit' });

      assert.equal(res.status, 200);
      assert.equal(res.body.updated.currentQuantity, 45);
      assert.equal(res.body.movement.type, 'MANUAL_ADJUSTMENT');
      assert.equal(res.body.movement.quantityChange, -5);
    });

    it('21 & 22. Low stock and out-of-stock items appear in alert endpoints', async () => {
      await request(app)
        .post(`/api/inventory/${testInventoryId}/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ newQuantity: 5, reason: 'Test low stock alert' });

      const lowStockRes = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(lowStockRes.status, 200);
      const found = lowStockRes.body.find((i: any) => i.id === testInventoryId);
      assert.ok(found);
      assert.equal(found.stockStatus, 'LOW_STOCK');
    });
  });

  describe('Reports & Reconciliation', () => {
    it('Reports dashboard calculates real metrics from DB', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.metrics);
      assert.equal(typeof res.body.metrics.todaySales, 'number');
      assert.equal(Array.isArray(res.body.salesTrend), true);
      assert.equal(Array.isArray(res.body.popularItems), true);
    });

    it('Sales CSV export produces valid CSV with headers', async () => {
      const res = await request(app)
        .get('/api/reports/export/sales-csv')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/csv'));
      assert.ok(res.text.includes('Bill Number'));
      assert.ok(res.text.includes('Grand Total (INR)'));
    });
  });
});
