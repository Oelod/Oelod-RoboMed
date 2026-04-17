const { EventEmitter } = require('events');

/**
 * Central domain event bus.
 *
 * Emit events from services; listeners in events/listeners/ react
 * (create notifications, emit socket events) — fully decoupled from controllers.
 *
 * Usage:
 *   emitter.emit('case.assigned', { caseId, patientId, doctorId });
 *   emitter.on('case.assigned', handler);
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(20);

module.exports = emitter;
