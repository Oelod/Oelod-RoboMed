const request = require('supertest');
const { app }  = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearCollections } = require('../setup/testDb');
const User     = require('../../src/models/User');

// Helper: register + login → token
const getToken = async (userData) => {
  const res = await request(app).post('/api/auth/register').send(userData);
  return res.body.data?.token;
};

describe('Phase 2 — Case Management', () => {
  let patientToken, doctorToken, adminToken;
  let patientId,  doctorId,  adminId;
  let openCaseId;

  beforeAll(async () => {
    await connectTestDB();

    patientToken = await getToken({ fullName: 'Pat Test', email: 'pat@test.com', password: 'Pass1234!' });
    const patMe  = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${patientToken}`);
    patientId    = patMe.body.data.user._id;

    // Create doctor with approved role
    const doc = await User.create({
      fullName: 'Dr. Test', email: 'doc@test.com', password: 'Pass1234!',
      roles: ['doctor'], activeRole: 'doctor', hospitalId: 'HSP-D001', specialization: 'General Medicine',
    });
    doctorId = doc._id;
    const docLogin = await request(app).post('/api/auth/login').send({ email: 'doc@test.com', password: 'Pass1234!' });
    doctorToken = docLogin.body.data?.token;

    const admin = await User.create({
      fullName: 'Admin', email: 'admin2@test.com', password: 'Pass1234!',
      roles: ['admin'], activeRole: 'admin', hospitalId: 'HSP-A001',
    });
    adminId = admin._id;
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin2@test.com', password: 'Pass1234!' });
    adminToken = adminLogin.body.data?.token;
  });

  afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
  });

  // ── Test 1 ──
  it('POST /api/cases — patient creates case → status open', async () => {
    const res = await request(app).post('/api/cases')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: ['fever', 'headache'], description: 'Started 2 days ago' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.case.status).toBe('open');
    expect(res.body.data.case.caseCode).toMatch(/CASE-\d+/);
    openCaseId = res.body.data.case._id;
  });

  // ── Test 2 ──
  it('POST /api/cases — doctor cannot create case → 403', async () => {
    const res = await request(app).post('/api/cases')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ symptoms: ['fever'] });
    expect(res.statusCode).toBe(403);
  });

  // ── Test 3 ──
  it('GET /api/cases — patient sees only own cases', async () => {
    const res = await request(app).get('/api/cases')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    res.body.data.cases.forEach((c) => {
      expect(c.patient._id || c.patient).toBe(patientId);
    });
  });

  // ── Test 4 ──
  it('GET /api/cases/:caseId — own case returns 200', async () => {
    const res = await request(app).get(`/api/cases/${openCaseId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.case._id).toBe(openCaseId);
  });

  // ── Test 5 — need a second patient to test isolation
  it('GET /api/cases/:caseId — another patient gets 403', async () => {
    const otherToken = await getToken({ fullName: 'Other Pat', email: 'other@test.com', password: 'Pass1234!' });
    const res = await request(app).get(`/api/cases/${openCaseId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.statusCode).toBe(403);
  });

  // ── Test 6 ──
  it('PATCH /api/cases/:caseId/accept — doctor accepts case → status assigned', async () => {
    const res = await request(app).patch(`/api/cases/${openCaseId}/accept`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.case.status).toBe('assigned');
  });

  // ── Test 7 ──
  it('PATCH /api/cases/:caseId/accept — second accept → 409', async () => {
    // Create another doctor
    await User.create({
      fullName: 'Dr. Two', email: 'doc2@test.com', password: 'Pass1234!',
      roles: ['doctor'], activeRole: 'doctor', hospitalId: 'HSP-D002', specialization: 'General Medicine',
    });
    const doc2Login = await request(app).post('/api/auth/login').send({ email: 'doc2@test.com', password: 'Pass1234!' });
    const doc2Token = doc2Login.body.data?.token;

    const res = await request(app).patch(`/api/cases/${openCaseId}/accept`)
      .set('Authorization', `Bearer ${doc2Token}`);
    expect(res.statusCode).toBe(409);
  });

  // ── Test 8 ──
  it('PATCH /api/cases/:caseId/close — patient tries to close → 403', async () => {
    const res = await request(app).patch(`/api/cases/${openCaseId}/close`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(403);
  });

  // ── Test 9 ──
  it('PATCH /api/cases/:caseId/close — assigned doctor closes → status closed', async () => {
    const res = await request(app).patch(`/api/cases/${openCaseId}/close`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.case.status).toBe('closed');
  });

  // ── Test 10 ──
  it('PATCH /api/cases/:caseId/reopen — admin reopens → status open', async () => {
    const res = await request(app).patch(`/api/cases/${openCaseId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.case.status).toBe('open');
  });

  // ── Test 11 ──
  it('GET /api/cases/:caseId/history — returns timeline array', async () => {
    const res = await request(app).get(`/api/cases/${openCaseId}/history`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThan(0);
    expect(res.body.data.timeline[0]).toHaveProperty('event');
  });

  // ── Test 12 ──
  it('GET /api/dashboard/summary — doctor sees numeric stats', async () => {
    const res = await request(app).get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.data.stats.assignedCases).toBe('number');
  });

  // ── Test 13 ──
  it('GET /api/dashboard/summary — patient sees numeric stats', async () => {
    const res = await request(app).get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.data.stats.totalCases).toBe('number');
  });

  // ── Test 14 ──
  it('GET /api/dashboard/widgets — returns widget array', async () => {
    const res = await request(app).get('/api/dashboard/widgets')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.widgets)).toBe(true);
  });
});
