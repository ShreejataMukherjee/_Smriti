/**
 * SMRITI RELATIONSHIP CLIENT SERVICE
 * Client interface for managing many-to-many Caretaker <-> Elderly connections.
 */

const RelationshipClient = {
  /**
   * Caretaker sends connection request to an elderly user
   * @param {string} elderlyTarget - Email (e.g. sruti@example.com) or Smriti ID
   */
  async sendRequest(elderlyTarget, relationshipType = 'caretaker') {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    return window.ApiClient.request('/api/relationships/request', {
      method: 'POST',
      body: JSON.stringify({ elderlyTarget, relationshipType })
    });
  },

  async createConnectionRequest(elderlyTarget, relationshipType = 'caretaker') {
    return this.sendRequest(elderlyTarget, relationshipType);
  },

  /**
   * Caretaker lists all connected elderly users
   */
  async getCaretakerConnections() {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    const res = await window.ApiClient.request('/api/relationships/caretaker');
    return res.relationships || [];
  },

  async getCaretakerRelationships() {
    return this.getCaretakerConnections();
  },

  /**
   * Elderly user lists all connected caretakers and pending invites
   */
  async getElderlyConnections() {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    const res = await window.ApiClient.request('/api/relationships/elderly');
    return res.relationships || [];
  },

  async getElderlyRelationships() {
    return this.getElderlyConnections();
  },

  /**
   * Elderly user responds to an incoming request ('accept' | 'reject')
   */
  async respondToRequest(relationshipId, decision) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    return window.ApiClient.request(`/api/relationships/${relationshipId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ decision })
    });
  },

  /**
   * Revokes an existing connection
   */
  async revokeConnection(relationshipId) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    return window.ApiClient.request(`/api/relationships/${relationshipId}`, {
      method: 'DELETE'
    });
  },

  async revokeRelationship(relationshipId) {
    return this.revokeConnection(relationshipId);
  }
};

window.RelationshipClient = RelationshipClient;
