const { createObjectCsvStringifier } = require('csv-writer');

/**
 * Institutional Reporting Engine — Generates statutory CSV clinical matrices.
 */

const generateCaseVolumeReport = async (cases) => {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'caseCode', title: 'CASE_CODE' },
      { id: 'patientEmail', title: 'PATIENT_EMAIL' },
      { id: 'doctorName', title: 'ASSIGNED_DOCTOR' },
      { id: 'specialty', title: 'CLINICAL_SPECIALTY' },
      { id: 'priority', title: 'PRIORITY_LEVEL' },
      { id: 'status', title: 'DISPOSITION_STATUS' },
      { id: 'createdAt', title: 'INSTITUTED_AT' },
    ]
  });

  const records = cases.map(c => ({
    caseCode: c.caseCode,
    patientEmail: c.patient?.email || 'SYSTEM_MIGRATED',
    doctorName: c.doctor?.fullName || 'UNASSIGNED',
    specialty: c.assignedSpecialty || 'GENERAL',
    priority: c.priority.toUpperCase(),
    status: c.status.toUpperCase(),
    createdAt: c.createdAt.toISOString(),
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

const generateSpecialtyWorkloadReport = async (workloadData) => {
    // workloadData expected as aggregation result [{ _id: 'Cardiology', count: 45 }, ...]
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'specialty', title: 'CLINICAL_SPECIALTY' },
        { id: 'caseCount', title: 'TOTAL_ENCAPSULATED_CASES' },
      ]
    });
  
    const records = workloadData.map(d => ({
      specialty: d._id || 'GENERAL',
      caseCount: d.count,
    }));
  
    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

module.exports = {
  generateCaseVolumeReport,
  generateSpecialtyWorkloadReport
};
