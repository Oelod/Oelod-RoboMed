const request = require('supertest');
const mongoose = require('mongoose');
const { app }  = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearCollections } = require('../setup/testDb');

describe('Phase 1 — Authentication & User Management', () => {
  let patientToken, adminToken, patientId, adminId;

  beforeAll(async () => {
    await connectTestDB();

    // Seed an admin user directly (bypass register role)
    const User = require('../../src/models/User');
    const admin = await User.create({
      fullName: 'Admin User', email: 'admin@test.com', password: 'Admin1234!',
      roles: ['admin'], activeRole: 'admin', hospitalId: 'HSP-0000',
    });
    adminId = admin._id;

    // Login as admin to get token
    const adminLogin = await request(app).post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin1234!' });
    adminToken = adminLogin.body.data?.token;
  });

  afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
  });

  // ── Test 1 ──
  it('POST /api/auth/register — valid data returns 201 with token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'John Doe', email: 'john@test.com', password: 'Password1!',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
    patientToken = res.body.data.token;
    patientId    = res.body.data.user._id;
  });

  // ── Test 2 ──
  it('POST /api/auth/register — duplicate email returns 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'John Doe 2', email: 'john@test.com', password: 'Password1!',
    });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // ── Test 3 ──
  it('POST /api/auth/register — missing fields returns 400 (Joi)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 4 ──
  it('POST /api/auth/login — correct credentials returns JWT and activeRole', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'Password1!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.activeRole).toBe('patient');
  });

  // ── Test 5 ──
  it('POST /api/auth/login — wrong password returns 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'WrongPassword!' });
    expect(res.statusCode).toBe(401);
  });

  // ── Test 6 ──
  it('GET /api/auth/me — valid token returns user', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe('john@test.com');
  });

  // ── Test 7 ──
  it('GET /api/auth/me — no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  // ── Test 8 ──
  it('POST /api/auth/request-role — patient requests doctor role', async () => {
    const res = await request(app).post('/api/auth/request-role')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ role: 'doctor' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.roleRequest.status).toBe('pending');
  });

  // ── Test 9 ──
  it('PATCH /api/admin/users/:id/approve-role — admin approves role', async () => {
    const res = await request(app).patch(`/api/admin/users/${patientId}/approve-role`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.roles).toContain('doctor');
  });

  // ── Test 10 ──
  it('PATCH /api/admin/users/:id/approve-role — non-admin gets 403', async () => {
    const res = await request(app).patch(`/api/admin/users/${patientId}/approve-role`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(403);
  });

  // ── Test 11 ──
  it('PATCH /api/admin/users/:id/suspend — suspends user', async () => {
    const res = await request(app).patch(`/api/admin/users/${patientId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.status).toBe('suspended');
  });

  // ── Test 12 ──
  it('POST /api/auth/login — suspended user gets 403', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'Password1!' });
    expect(res.statusCode).toBe(403);
  });

  // ── Test 13 ──
  it('PATCH /api/admin/users/:id/activate — reactivates user', async () => {
    const res = await request(app).patch(`/api/admin/users/${patientId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.status).toBe('active');
  });

  // ── Test 14 ──
  it('PATCH /api/dashboard/switch-role — switches activeRole successfully', async () => {
    // Re-login to get fresh token after role approval
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'Password1!' });
    const freshToken = login.body.data.token;

    const res = await request(app).patch('/api/dashboard/switch-role')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ role: 'doctor' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.activeRole).toBe('doctor');
  });

  // ── Test 15 ──
  it('PATCH /api/dashboard/switch-role — switching to non-possessed role returns 400', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'Password1!' });
    const freshToken = login.body.data.token;

    const res = await request(app).patch('/api/dashboard/switch-role')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ role: 'admin' }); // user does not have admin
    expect(res.statusCode).toBe(400);
  });
});
