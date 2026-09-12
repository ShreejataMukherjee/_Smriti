/**
 * SMRITI SPECIALIST CLIENT SERVICE
 * Frontend client interface for medical specialist operations, prescriptions,
 * caretaker request reviews, and clinical/cognitive timeline queries.
 */

const SpecialistClient = {
  async getProfile() {
    const res = await window.ApiClient.request('/api/specialist/profile/me');
    return res.profile;
  },

  async updateProfile(data) {
    const res = await window.ApiClient.request('/api/specialist/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.profile;
  },

  async getPatients() {
    const res = await window.ApiClient.request('/api/specialist/patients');
    return res.patients || [];
  },

  async requestPatientLink(elderlyTarget) {
    const res = await window.ApiClient.request('/api/specialist/link/request', {
      method: 'POST',
      body: JSON.stringify({ elderlyTarget })
    });
    return res.relationship;
  },

  async createCaretakerInvite(elderlyUserId, specialistTargetEmail) {
    const res = await window.ApiClient.request('/api/specialist/link/invite', {
      method: 'POST',
      body: JSON.stringify({ elderlyUserId, specialistTargetEmail })
    });
    return res.relationship;
  },

  async redeemInviteCode(inviteCode) {
    const res = await window.ApiClient.request('/api/specialist/link/redeem', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    });
    return res.relationship;
  },

  async respondToLink(relId, decision = 'accepted') {
    const status = decision === 'accept' ? 'accepted' : decision === 'reject' ? 'rejected' : decision;
    const res = await window.ApiClient.request(`/api/specialist/link/${relId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ status, decision: status })
    });
    return res.relationship;
  },

  async getPendingRequests(elderlyUserId = null) {
    const query = elderlyUserId ? `?elderlyUserId=${encodeURIComponent(elderlyUserId)}` : '';
    const res = await window.ApiClient.request(`/api/specialist/link/pending${query}`);
    return res.requests || [];
  },

  async revokeLink(relId) {
    const res = await window.ApiClient.request(`/api/specialist/link/${relId}/revoke`, {
      method: 'PUT'
    });
    return res.relationship;
  },

  async getPatientSpecialists(elderlyUserId) {
    const res = await window.ApiClient.request(`/api/specialist/patient-specialists/${elderlyUserId}`);
    return res.specialists || [];
  },

  async getPrescriptions(elderlyUserId) {
    const res = await window.ApiClient.request(`/api/specialist/prescriptions/${elderlyUserId}`);
    return res.prescriptions || [];
  },

  async addPrescription(data) {
    return window.ApiClient.request('/api/specialist/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePrescription(id, data) {
    return window.ApiClient.request(`/api/specialist/prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async discontinuePrescription(id, reason) {
    return window.ApiClient.request(`/api/specialist/prescriptions/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  },

  async submitMedicationRequest(data) {
    const res = await window.ApiClient.request('/api/specialist/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.request;
  },

  async getMedicationRequests(elderlyUserId, status = null) {
    const q = status ? `?status=${status}` : '';
    const res = await window.ApiClient.request(`/api/specialist/requests/${elderlyUserId}${q}`);
    return res.requests || [];
  },

  async respondToMedicationRequest(requestId, payload) {
    return window.ApiClient.request(`/api/specialist/requests/${requestId}/respond`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getTimeline(elderlyUserId) {
    return window.ApiClient.request(`/api/specialist/timeline/${elderlyUserId}`);
  },

  async getAuditLogs(elderlyUserId) {
    const res = await window.ApiClient.request(`/api/specialist/audit-logs/${elderlyUserId}`);
    return res.logs || [];
  },

  async getAlerts(elderlyUserId) {
    const res = await window.ApiClient.request(`/api/specialist/alerts/${elderlyUserId}`);
    return res.alerts || [];
  },

  async resolveAlert(alertId, resolutionNotes) {
    const res = await window.ApiClient.request(`/api/specialist/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes })
    });
    return res.alert;
  }
};

window.SpecialistClient = SpecialistClient;
