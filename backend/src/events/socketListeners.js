const emitter = require('./emitter');
const Notification = require('../models/Notification');

module.exports = (app) => {
  const io = app.get('io');
  
  if (!io) {
    console.error('Socket.io not initialised in app. Cannot setup listeners.');
    return;
  }

  const sendNotification = async (recipientId, type, title, message, relatedId, room = null) => {
     try {
       if (recipientId) {
         const notif = await Notification.create({ recipientId, type, title, message, relatedId });
         io.to(recipientId.toString()).emit('notification', {
           _id: notif._id, type, title, message, relatedId, isRead: false, createdAt: notif.createdAt 
         });
       } else if (room) {
         // Multicast to doctors in specialty room (does not persist since audience is fluid)
         io.to(room).emit('notification', {
           _id: Math.random().toString(), type, title, message, relatedId, isRead: false, createdAt: new Date()
         });
       }
     } catch(e) { console.error('Failed to dispatch notification:', e); }
  };

  // 1. Case created → Notify doctors of matching specialty
  emitter.on('case.created', async ({ caseId, patientId, specialty }) => {
    // Notify the patient who created it
    await sendNotification(patientId, 'CASE_CREATED', 'Case Submitted', 'Your case has been successfully submitted and analyzed by AI.', caseId);

    // Notify doctors in that specialty (fluid audience, no hard persistence needed)
    if (specialty) {
       await sendNotification(null, 'NEW_CASE_AVAILABLE', 'New Case in Queue', `A new case needs your attention in ${specialty}.`, caseId, `specialty_${specialty}`);
    }
  });

  // 2. Case accepted/pushed → Notify patient & doctor
  emitter.on('case.assigned', async ({ caseId, doctorId, patientId, adminId }) => {
    // Notify Patient
    await sendNotification(patientId, 'CASE_ASSIGNED', 'Doctor Assigned', 'A specialist has accepted your case.', caseId);
    
    // Notify Doctor (especially important for Admin 'Push')
    if (doctorId && adminId) {
       await sendNotification(doctorId, 'CASE_PUSHED', 'New Case Assigned', 'An institutional administrator has manually assigned a case to you for review.', caseId);
    }
  });

  // 3. Case closed → Notify patient
  emitter.on('case.closed', async ({ caseId, patientId }) => {
    await sendNotification(patientId, 'CASE_CLOSED', 'Case Closed', 'Your case has been marked as closed by the doctor.', caseId);
  });

  // 4. Prescription issued → Notify patient
  emitter.on('prescription.issued', async ({ caseId, patientId, doctorName }) => {
    await sendNotification(patientId, 'PRESCRIPTION_ISSUED', 'New Prescription', `Dr. ${doctorName || 'Assigned'} has issued you a medical prescription.`, caseId);
  });
  
  // 4.b Prescription acknowledged → Notify doctor
  emitter.on('prescription.acknowledged', async ({ caseId, doctorId }) => {
    await sendNotification(doctorId, 'PRESCRIPTION_ACKNOWLEDGED', 'Prescription Acknowledged', 'A patient safely acknowledged their prescription.', caseId);
  });

  // 5. Lab requested → Notify patient
  emitter.on('lab.requested', async ({ caseId, patientId, testType }) => {
    await sendNotification(patientId, 'LAB_REQUESTED', 'Lab Request Pending', `A lab test (${testType}) has been requested for your case. Please arrange to upload the result.`, caseId);
  });

  // 6. Lab result uploaded → Notify doctor
  emitter.on('lab.result_uploaded', async ({ caseId, doctorId }) => {
    if (doctorId) {
      await sendNotification(doctorId, 'LAB_RESULT_UPLOADED', 'New Lab Results', 'A patient has uploaded their requested lab findings.', caseId);
    }
  });
  // 7. Role updated → Notify user for live switch
  emitter.on('role.updated', async ({ userId, roles, activeRole }) => {
    io.to(userId.toString()).emit('role_update', { roles, activeRole });
    await sendNotification(userId, 'ROLE_UPDATED', 'Permissions Updated', `An admin has updated your access roles to: ${roles.join(', ')}.`, null);
  });

  // 8. Escalation resolved → Notify Doctor & Admins
  emitter.on('case.escalation_resolved', async ({ caseId, doctorId, office, note }) => {
    // Notify the reporting Doctor
    if (doctorId) {
      await sendNotification(doctorId, 'ESCALATION_RESOLVED', 'Institutional Ruling Issued', `The ${office} has issued a formal ruling on your case. Status: Settled.`, caseId);
    }

    // Notify all Governance Admins (to trigger re-assignment)
    try {
      const User = require('../models/User');
      const admins = await User.find({ roles: 'admin' }, '_id');
      for (const admin of admins) {
        await sendNotification(admin._id, 'GOVERNANCE_RULING', 'Action Required: Re-assignment Needed', `${office} has settled a matter. Please re-assign this case to finalize the resolution.`, caseId);
      }
    } catch (err) { console.error('Admin multicast notification failed:', err); }
  });

  // 9. Case Flagged → Notify all Admins
  emitter.on('case.flagged', async ({ caseId, note }) => {
    try {
      const User = require('../models/User');
      const admins = await User.find({ roles: 'admin' }, '_id');
      for (const admin of admins) {
        await sendNotification(admin._id, 'CASE_FLAGGED', 'Institutional Flag Alert', `A practitioner has flagged a case for administrative review: "${note}"`, caseId);
      }
    } catch (err) { console.error('Flag alert failed:', err); }
  });

  // 10. Case Escalated → Notify Office Admins & Doctor
  emitter.on('case.escalated', async ({ caseId, office, note }) => {
    try {
      const User = require('../models/User');
      const officeAdmins = await User.find({ assignedOffice: office }, '_id');
      for (const offAdm of officeAdmins) {
         await sendNotification(offAdm._id, 'CASE_ESCALATED', 'New Departmental Matter', `A matter has been escalated to ${office} for review: "${note}"`, caseId);
      }
      
      // Notify the doctor assigned to the case
      const Case = require('../models/Case');
      const c = await Case.findById(caseId);
      if (c && c.doctor) {
         await sendNotification(c.doctor, 'CASE_ESCALATED_DOC', 'Case Promoted to Department', `Your clinical concern has been promoted to ${office} for institutional oversight.`, caseId);
      }
    } catch (err) { console.error('Escalation alert failed:', err); }
  });
};
