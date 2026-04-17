import api from './axiosInstance';

export const getCases = async (params = {}) => {
  const res = await api.get('/cases', { params });
  return res.data;
};

export const getCaseById = async (id) => {
  const res = await api.get(`/cases/${id}`);
  return res.data;
};

export const createCase = async (payload) => {
  const res = await api.post('/cases', payload);
  return res.data;
};

export const acceptCase = async (id) => {
  const res = await api.patch(`/cases/${id}/accept`);
  return res.data;
};

export const closeCase = async (id, summary) => {
  const res = await api.patch(`/cases/${id}/close`, { summary });
  return res.data;
};

export const reopenCase = async (id) => {
  const res = await api.patch(`/cases/${id}/reopen`);
  return res.data;
};

export const flagCase = async (id, reason) => {
  const res = await api.patch(`/cases/${id}/flag`, { reason });
  return res.data;
};

export const escalateCase = async (id, office, reason) => {
  const res = await api.patch(`/cases/${id}/escalate`, { office, reason });
  return res.data;
};

export const assignDoctor = async (id, payload) => {
  const res = await api.patch(`/cases/${id}/assign`, payload);
  return res.data;
};

export const getCaseHistory = async (id) => {
  const res = await api.get(`/cases/${id}/history`);
  return res.data;
};

export const getFullPatientHistory = async (patientId) => {
  const res = await api.get(`/cases/patient/${patientId}/history`);
  return res.data;
};

export const uploadAttachments = async (id, formData) => {
  const res = await api.post(`/cases/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

// --- PHASE 4: LABS & PRESCRIPTIONS ---

export const requestLab = async (id, payload) => {
  const res = await api.post(`/cases/${id}/lab-requests`, payload);
  return res.data;
};

export const uploadLabResult = async (id, formData) => {
  const res = await api.post(`/cases/${id}/lab-results`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getCaseLabs = async (id) => {
  const res = await api.get(`/cases/${id}/labs`);
  return res.data;
};

export const addPrescription = async (id, payload) => {
  const res = await api.post(`/cases/${id}/prescriptions`, payload);
  return res.data;
};

export const getCasePrescriptions = async (id) => {
  const res = await api.get(`/cases/${id}/prescriptions`);
  return res.data;
};

export const acknowledgePrescription = async (caseId, prescriptionId) => {
  const res = await api.patch(`/cases/${caseId}/prescriptions/${prescriptionId}/acknowledge`);
  return res.data;
};
