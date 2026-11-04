/**
 * API Service Layer
 * Abstracts backend API calls with an easy toggle to switch between Mock Data and Real Backend endpoints.
 * Matches API Contract:
 * - GET /api/resources
 * - GET /api/metrics
 * - GET /api/costs
 * - GET /api/alerts
 */

const USE_MOCK_API = true; // Set to false when connecting to the real backend

const ApiService = {
  /**
   * Fetch all cloud resources
   * @returns {Promise<Array<{id: string, name: string, type: string, region: string, status: string, cpu: number, memory: number, cost_per_day: number}>>}
   */
  async getResources() {
    if (USE_MOCK_API) {
      await this._simulateDelay(150);
      return window.MOCK_RESOURCES ? JSON.parse(JSON.stringify(window.MOCK_RESOURCES)) : [];
    }
    const response = await fetch('/api/resources');
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  },

  /**
   * Fetch CPU & Memory historical metrics
   * @returns {Promise<{timestamps: Array<string>, cpu: Array<number>, memory: Array<number>}>}
   */
  async getMetrics() {
    if (USE_MOCK_API) {
      await this._simulateDelay(150);
      return window.MOCK_METRICS ? JSON.parse(JSON.stringify(window.MOCK_METRICS)) : { timestamps: [], cpu: [], memory: [] };
    }
    const response = await fetch('/api/metrics');
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return await response.json();
  },

  /**
   * Fetch total cost, budget, and breakdown by service
   * @returns {Promise<{total: number, budget: number, by_service: Array<{service: string, cost: number}>}>}
   */
  async getCosts() {
    if (USE_MOCK_API) {
      await this._simulateDelay(150);
      return window.MOCK_COSTS ? JSON.parse(JSON.stringify(window.MOCK_COSTS)) : { total: 0, budget: 0, by_service: [] };
    }
    const response = await fetch('/api/costs');
    if (!response.ok) throw new Error('Failed to fetch costs');
    return await response.json();
  },

  /**
   * Fetch system alert messages
   * @returns {Promise<Array<{level: "warning"|"critical", message: string}>>}
   */
  async getAlerts() {
    if (USE_MOCK_API) {
      await this._simulateDelay(150);
      return window.MOCK_ALERTS ? JSON.parse(JSON.stringify(window.MOCK_ALERTS)) : [];
    }
    const response = await fetch('/api/alerts');
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return await response.json();
  },

  /**
   * Helper to simulate network latency for seamless mock UI rendering
   */
  _simulateDelay(ms = 200) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

if (typeof window !== 'undefined') {
  window.ApiService = ApiService;
}
