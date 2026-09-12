/**
 * SMRITI PROFILE & PERSONALIZATION CLIENT SERVICE
 * Frontend API client for managing Elderly Profiles, Family Datasets, Routines, Reminders, and Preview data.
 */

const ProfileClient = {
  /**
   * Profile Settings (Personal details, Language, Culture, Accessibility, Cognitive prefs)
   */
  async getProfile(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/profile/${elderlyUserId}`);
    return res.profile;
  },

  async saveProfile(elderlyUserId, profileData) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/profile/${elderlyUserId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return res.profile;
  },

  /**
   * Family & Contacts (Recognition & Personality dataset)
   */
  async getFamily(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/family/elderly/${elderlyUserId}`);
    return res.family || [];
  },

  async addFamilyMember(data) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request('/api/family', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.member;
  },

  async updateFamilyMember(id, data) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/family/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.member;
  },

  async deleteFamilyMember(id) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    return window.ApiClient.request(`/api/family/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Daily Routines (Schedule anchors)
   */
  async getRoutines(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/routine/elderly/${elderlyUserId}`);
    return res.routine || [];
  },

  async addRoutine(data) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request('/api/routine', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.item;
  },

  async updateRoutine(id, data) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/routine/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.item;
  },

  async deleteRoutine(id) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    return window.ApiClient.request(`/api/routine/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Health & Reminders (Care Support)
   */
  async getReminders(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/reminders/elderly/${elderlyUserId}`);
    return res.reminders || [];
  },

  async addReminder(data) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.reminder;
  },

  async updateReminder(id, data) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.reminder;
  },

  async deleteReminder(id) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    return window.ApiClient.request(`/api/reminders/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Aggregated Experience Preview
   */
  async getPreview(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient is not loaded');
    const res = await window.ApiClient.request(`/api/preview/${elderlyUserId}`);
    return res.experience;
  }
};

window.ProfileClient = ProfileClient;
