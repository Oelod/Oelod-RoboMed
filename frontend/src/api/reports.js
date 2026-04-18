import api from './axiosInstance';

export const submitMisconductReport = async (payload) => {
  const res = await api.post('/reports', payload);
  return res.data;
};

export const getAllReports = async () => {
  const res = await api.get('/reports');
  return res.data;
};

export const getMyReports = async () => {
  const res = await api.get('/reports/my');
  return res.data;
};

export const updateReportStatus = async (reportId, payload) => {
  const res = await api.patch(`/reports/${reportId}`, payload);
  return res.data;
};
