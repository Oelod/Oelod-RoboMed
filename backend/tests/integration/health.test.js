const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/app');
const { connectTestDB, disconnectTestDB } = require('../setup/testDb');

describe('Phase 0 — Infrastructure', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('GET /health → 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('MongoDB connection is established (readyState = 1)', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('Unknown route returns 404 JSON (not HTML)', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('Global error handler returns JSON on thrown error', async () => {
    // Temporarily add a route that throws to test the global handler
    const express = require('express');
    const testApp = express();
    require('express-async-errors');
    const { globalErrorHandler } = require('../../src/middlewares/errorHandler');
    testApp.get('/throw', () => { throw new Error('Test explosion'); });
    testApp.use(globalErrorHandler);

    const res = await request(testApp).get('/throw');
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('Health check includes environment field', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toHaveProperty('environment');
  });
});
