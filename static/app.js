/**
 * Cloud Resource Monitoring and Cost Dashboard - Main Application Script
 * Integrated with Flask Backend API endpoints:
 * - GET /api/resources
 * - GET /api/metrics
 * - GET /api/costs
 * - GET /api/alerts
 * - GET /health
 */

// Application State
const state = {
  resources: [],
  metrics: [],
  costs: { total: 0, budget: 0, by_service: [] },
  alerts: [],
  filters: {
    search: '',
    status: 'all',
    region: 'all'
  },
  charts: {
    cpuMemory: null,
    costBreakdown: null
  },
  refreshTimer: null
};

// DOM Elements Container
let elements = {};

// Initialize Dashboard
async function initDashboard() {
  if (typeof document === 'undefined') return;

  elements = {
    alertBannerArea: document.getElementById('alertBannerArea'),
    totalCostEl: document.getElementById('totalCostVal'),
    budgetTextEl: document.getElementById('budgetTextVal'),
    budgetProgressFill: document.getElementById('budgetProgressFill'),
    totalResourcesEl: document.getElementById('totalResourcesVal'),
    resourceBreakdownPills: document.getElementById('resourceBreakdownPills'),
    avgCpuEl: document.getElementById('avgCpuVal'),
    avgMemoryEl: document.getElementById('avgMemoryVal'),
    tableBody: document.getElementById('resourceTableBody'),
    tableCountBadge: document.getElementById('tableCountBadge'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    regionFilter: document.getElementById('regionFilter'),
    btnRefresh: document.getElementById('btnRefresh'),
    lastUpdatedText: document.getElementById('lastUpdatedText'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalBody: document.getElementById('modalBody')
  };

  setupEventListeners();
  await loadDashboardData();

  // Auto-refresh telemetry every 30 seconds
  if (!state.refreshTimer) {
    state.refreshTimer = setInterval(() => {
      loadDashboardData();
    }, 30000);
  }
}

// Fetch helper with defensive error handling
async function fetchEndpoint(endpoint, fallback) {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      console.warn(`API ${endpoint} responded with status: ${res.status}`);
      return fallback;
    }
    const data = await res.json();
    return data !== null && data !== undefined ? data : fallback;
  } catch (err) {
    console.warn(`Network or API error while fetching ${endpoint}:`, err);
    return fallback;
  }
}

// Load data directly from backend Flask API endpoints
async function loadDashboardData() {
  try {
    showRefreshSpin(true);

    // Call real Flask API endpoints concurrently
    const [resourcesData, metricsData, costsData, alertsData] = await Promise.all([
      fetchEndpoint('/api/resources', []),
      fetchEndpoint('/api/metrics', []),
      fetchEndpoint('/api/costs', { budget: 0, total: 0, by_service: [] }),
      fetchEndpoint('/api/alerts', [])
    ]);

    state.resources = Array.isArray(resourcesData) ? resourcesData : [];
    state.metrics = Array.isArray(metricsData) ? metricsData : [];
    state.costs = (costsData && typeof costsData === 'object') ? costsData : { budget: 0, total: 0, by_service: [] };
    state.alerts = Array.isArray(alertsData) ? alertsData : [];

    // Render components
    renderAlerts();
    renderKpis();
    renderCpuMemoryChart();
    renderCostBreakdownChart();
    populateRegionFilterOptions();
    renderResourceTable();
    updateTimestamp();

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  } finally {
    showRefreshSpin(false);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value.toLowerCase().trim();
      renderResourceTable();
    });
  }

  // Status filter
  if (elements.statusFilter) {
    elements.statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderResourceTable();
    });
  }

  // Region filter
  if (elements.regionFilter) {
    elements.regionFilter.addEventListener('change', (e) => {
      state.filters.region = e.target.value;
      renderResourceTable();
    });
  }

  // Refresh button
  if (elements.btnRefresh) {
    elements.btnRefresh.addEventListener('click', () => {
      loadDashboardData();
    });
  }

  // Modal Close
  if (elements.modalCloseBtn) {
    elements.modalCloseBtn.addEventListener('click', closeModal);
  }

  if (elements.modalOverlay) {
    elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.modalOverlay) {
        closeModal();
      }
    });
  }

  // Keyboard ESC to close modal
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }
}

// Render Alert Banners
function renderAlerts() {
  if (!elements.alertBannerArea || typeof document === 'undefined') return;
  elements.alertBannerArea.innerHTML = '';

  const alerts = Array.isArray(state.alerts) ? state.alerts : [];
  if (alerts.length === 0) {
    elements.alertBannerArea.style.display = 'none';
    return;
  }

  elements.alertBannerArea.style.display = 'flex';

  alerts.forEach((alert, index) => {
    if (!alert) return;
    const banner = document.createElement('div');
    const severity = alert.severity ? String(alert.severity).toLowerCase() : 'warning';
    const severityClass = severity === 'critical' ? 'critical' : 'warning';
    banner.className = `alert-banner ${severityClass}`;

    const iconPath = severity === 'critical'
      ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'
      : 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';

    banner.innerHTML = `
      <div class="alert-content">
        <svg class="alert-icon" viewBox="0 0 24 24">
          <path d="${iconPath}"/>
        </svg>
        <span>${escapeHtml(alert.message || 'System alert')}</span>
      </div>
      <button class="alert-close" aria-label="Dismiss alert" data-index="${index}">&times;</button>
    `;

    banner.querySelector('.alert-close').addEventListener('click', () => {
      banner.remove();
      if (elements.alertBannerArea.children.length === 0) {
        elements.alertBannerArea.style.display = 'none';
      }
    });

    elements.alertBannerArea.appendChild(banner);
  });
}

// Render Metric KPI Cards
function renderKpis() {
  // 1. Cost & Budget
  const totalCost = (state.costs && typeof state.costs.total === 'number') ? state.costs.total : 0;
  const budget = (state.costs && typeof state.costs.budget === 'number' && state.costs.budget > 0) ? state.costs.budget : 1;
  const usedPercent = Math.min(100, Math.round((totalCost / budget) * 100));

  if (elements.totalCostEl) elements.totalCostEl.textContent = formatCurrency(totalCost);
  if (elements.budgetTextEl) elements.budgetTextEl.textContent = `of ${formatCurrency(budget)} limit (${usedPercent}% used)`;
  if (elements.budgetProgressFill) {
    elements.budgetProgressFill.style.width = `${usedPercent}%`;
    if (usedPercent > 90) {
      elements.budgetProgressFill.style.background = 'linear-gradient(90deg, #C48248 0%, #C0392B 100%)';
    } else {
      elements.budgetProgressFill.style.background = 'linear-gradient(90deg, #567C8D 0%, #3D546F 50%, #2F4156 100%)';
    }
    elements.budgetProgressFill.setAttribute('data-pct', `${usedPercent}%`);
  }

  // 2. Resource Counts
  const resources = Array.isArray(state.resources) ? state.resources : [];
  const totalCount = resources.length;
  const runningCount = resources.filter(r => r && r.status === 'running').length;
  const warningCount = resources.filter(r => r && r.status === 'warning').length;
  const stoppedCount = resources.filter(r => r && r.status === 'stopped').length;

  if (elements.totalResourcesEl) elements.totalResourcesEl.textContent = totalCount;
  if (elements.resourceBreakdownPills) {
    elements.resourceBreakdownPills.innerHTML = `
      <span class="count-pill running"><span class="badge-dot"></span>${runningCount} Running</span>
      <span class="count-pill warning"><span class="badge-dot"></span>${warningCount} Warning</span>
      <span class="count-pill stopped"><span class="badge-dot"></span>${stoppedCount} Stopped</span>
    `;
  }

  // 3. Avg CPU & Memory for active instances
  const activeResources = resources.filter(r => r && r.status !== 'stopped');
  if (activeResources.length > 0) {
    const avgCpu = (activeResources.reduce((acc, curr) => acc + (curr.cpu || 0), 0) / activeResources.length).toFixed(1);
    const avgMem = (activeResources.reduce((acc, curr) => acc + (curr.memory || 0), 0) / activeResources.length).toFixed(1);
    if (elements.avgCpuEl) elements.avgCpuEl.textContent = `${avgCpu}%`;
    if (elements.avgMemoryEl) elements.avgMemoryEl.textContent = `${avgMem}%`;
  } else {
    if (elements.avgCpuEl) elements.avgCpuEl.textContent = '0%';
    if (elements.avgMemoryEl) elements.avgMemoryEl.textContent = '0%';
  }
}

// Render CPU & Memory Line Chart using Chart.js
// Adapts backend metrics array: [{ time, cpu, memory }, ...]
function renderCpuMemoryChart() {
  if (typeof document === 'undefined' || typeof Chart === 'undefined') return;
  const canvas = document.getElementById('cpuMemoryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const metricsList = Array.isArray(state.metrics) ? state.metrics : [];
  const timeLabels = metricsList.map(m => (m && m.time) ? String(m.time) : '');
  const cpuData = metricsList.map(m => (m && typeof m.cpu === 'number') ? m.cpu : 0);
  const memoryData = metricsList.map(m => (m && typeof m.memory === 'number') ? m.memory : 0);

  // Destroy existing chart instance on update
  if (state.charts.cpuMemory) {
    state.charts.cpuMemory.destroy();
  }

  // Gradient Fills — Navy & Teal
  const cpuGradient = ctx.createLinearGradient(0, 0, 0, 300);
  cpuGradient.addColorStop(0, 'rgba(47, 65, 86, 0.40)');  // Navy (#2F4156)
  cpuGradient.addColorStop(1, 'rgba(47, 65, 86, 0.02)');

  const memGradient = ctx.createLinearGradient(0, 0, 0, 300);
  memGradient.addColorStop(0, 'rgba(86, 124, 141, 0.45)');  // Teal (#567C8D)
  memGradient.addColorStop(1, 'rgba(86, 124, 141, 0.02)');

  state.charts.cpuMemory = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [
        {
          label: 'CPU Utilization (%)',
          data: cpuData,
          borderColor: '#2F4156',           // Navy
          backgroundColor: cpuGradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#2F4156',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 6
        },
        {
          label: 'Memory Usage (%)',
          data: memoryData,
          borderColor: '#567C8D',           // Teal
          backgroundColor: memGradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#567C8D',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#2F4156',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#2F4156',
          titleColor: '#FFFFFF',
          bodyColor: '#C8D9E6',
          borderColor: '#567C8D',
          borderWidth: 1.5,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(200, 217, 230, 0.40)' },
          ticks: { color: '#567C8D', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(200, 217, 230, 0.40)' },
          ticks: {
            color: '#567C8D',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            callback: (val) => `${val}%`
          }
        }
      }
    }
  });
}

// Render Cost Breakdown Doughnut Chart using Chart.js
// Adapts backend cost response: by_service: [{ service, cost }]
function renderCostBreakdownChart() {
  if (typeof document === 'undefined' || typeof Chart === 'undefined') return;
  const canvas = document.getElementById('costBreakdownChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const servicesData = (state.costs && Array.isArray(state.costs.by_service)) ? state.costs.by_service : [];
  const labels = servicesData.map(s => (s && s.service) ? String(s.service) : 'Other');
  const costs = servicesData.map(s => (s && typeof s.cost === 'number') ? s.cost : 0);

  if (state.charts.costBreakdown) {
    state.charts.costBreakdown.destroy();
  }

  // Navy, Teal, Sky Blue, and Beige Harmonic Palette
  const colors = [
    '#2F4156',  // EC2         — Navy
    '#567C8D',  // RDS         — Teal
    '#7EA0B0',  // S3          — Soft Teal
    '#A4BED0',  // EKS         — Slate Sky
    '#C8D9E6',  // ElastiCache — Sky Blue
    '#D5C9BE'   // Other       — Warm Beige
  ];

  state.charts.costBreakdown = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: costs,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#2F4156',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
            usePointStyle: true,
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: '#2F4156',
          titleColor: '#FFFFFF',
          bodyColor: '#C8D9E6',
          borderColor: '#567C8D',
          borderWidth: 1.5,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: (context) => ` ${context.label}: ${formatCurrency(context.parsed)}`
          }
        }
      },
      cutout: '68%'
    }
  });
}

// Dynamic Region Options
function populateRegionFilterOptions() {
  if (!elements.regionFilter || typeof document === 'undefined') return;
  const currentVal = elements.regionFilter.value;
  const resources = Array.isArray(state.resources) ? state.resources : [];
  const regions = [...new Set(resources.map(r => r && r.region).filter(Boolean))];

  elements.regionFilter.innerHTML = '<option value="all">All Regions</option>';
  regions.forEach(reg => {
    const opt = document.createElement('option');
    opt.value = reg;
    opt.textContent = reg;
    elements.regionFilter.appendChild(opt);
  });

  if (regions.includes(currentVal)) {
    elements.regionFilter.value = currentVal;
  }
}

// Render Filtered Resource Table
function renderResourceTable() {
  if (!elements.tableBody || typeof document === 'undefined') return;

  const resources = Array.isArray(state.resources) ? state.resources : [];
  const search = state.filters.search || '';

  const filtered = resources.filter(resource => {
    if (!resource) return false;
    const resId = String(resource.id ?? '').toLowerCase();
    const resName = String(resource.name ?? '').toLowerCase();
    const resType = String(resource.type ?? '').toLowerCase();

    const matchesSearch = !search ||
      resName.includes(search) ||
      resId.includes(search) ||
      resType.includes(search);

    const matchesStatus = state.filters.status === 'all' || resource.status === state.filters.status;
    const matchesRegion = state.filters.region === 'all' || !resource.region || resource.region === state.filters.region;

    return matchesSearch && matchesStatus && matchesRegion;
  });

  if (elements.tableCountBadge) {
    elements.tableCountBadge.textContent = `${filtered.length} of ${resources.length} items`;
  }

  elements.tableBody.innerHTML = '';

  if (filtered.length === 0) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-table-state">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <p>No cloud resources found matching your current filters.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(res => {
    const tr = document.createElement('tr');

    const cpuVal = typeof res.cpu === 'number' ? res.cpu : 0;
    const memVal = typeof res.memory === 'number' ? res.memory : 0;
    const costVal = typeof res.cost === 'number' ? res.cost : 0;
    const statusVal = res.status || 'unknown';

    const cpuColor  = cpuVal > 85 ? '#C0392B' : cpuVal > 70 ? '#C48248' : '#2F4156';
    const memColor  = memVal > 85 ? '#C0392B' : memVal > 70 ? '#C48248' : '#567C8D';

    tr.innerHTML = `
      <td>
        <div class="resource-name-cell">
          <span class="resource-name">${escapeHtml(res.name || 'Resource ' + res.id)}</span>
          <span class="resource-id">${escapeHtml(res.id)}</span>
        </div>
      </td>
      <td>${escapeHtml(res.type || '—')}</td>
      <td>${escapeHtml(res.region || '—')}</td>
      <td>
        <div class="metric-progress-cell">
          <div class="metric-bar-wrap">
            <div class="metric-bar-fill" style="width: ${Math.min(100, Math.max(0, cpuVal))}%; background-color: ${cpuColor}"></div>
          </div>
          <span class="metric-val">${cpuVal.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <div class="metric-progress-cell">
          <div class="metric-bar-wrap">
            <div class="metric-bar-fill" style="width: ${Math.min(100, Math.max(0, memVal))}%; background-color: ${memColor}"></div>
          </div>
          <span class="metric-val">${memVal.toFixed(1)}%</span>
        </div>
      </td>
      <td><strong>${formatCurrency(costVal)}</strong></td>
      <td>
        <span class="status-badge ${escapeHtml(statusVal)}">
          <span class="badge-dot"></span>
          ${escapeHtml(statusVal)}
        </span>
      </td>
    `;

    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => openModal(res));

    elements.tableBody.appendChild(tr);
  });
}

// Open Resource Inspect Modal
function openModal(resource) {
  if (!elements.modalOverlay || !elements.modalBody || typeof document === 'undefined' || !resource) return;

  const costVal = typeof resource.cost === 'number' ? resource.cost : 0;
  const cpuVal = typeof resource.cpu === 'number' ? resource.cpu : 0;
  const memVal = typeof resource.memory === 'number' ? resource.memory : 0;
  const statusVal = resource.status || 'unknown';

  elements.modalBody.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Resource ID</span>
      <span class="detail-value" style="font-family: monospace;">${escapeHtml(resource.id)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Resource Name</span>
      <span class="detail-value">${escapeHtml(resource.name || 'Resource ' + resource.id)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Instance Type</span>
      <span class="detail-value">${escapeHtml(resource.type || '—')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Region</span>
      <span class="detail-value">${escapeHtml(resource.region || '—')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value">
        <span class="status-badge ${escapeHtml(statusVal)}">
          <span class="badge-dot"></span>
          ${escapeHtml(statusVal)}
        </span>
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Current CPU Load</span>
      <span class="detail-value">${cpuVal}%</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Current Memory Load</span>
      <span class="detail-value">${memVal}%</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Cost</span>
      <span class="detail-value">${formatCurrency(costVal)}</span>
    </div>
  `;

  elements.modalOverlay.classList.add('active');
}

function closeModal() {
  if (elements.modalOverlay) {
    elements.modalOverlay.classList.remove('active');
  }
}

// Helpers
function formatCurrency(val) {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showRefreshSpin(isRefreshing) {
  if (!elements.btnRefresh) return;
  const svg = elements.btnRefresh.querySelector('svg');
  if (svg) {
    if (isRefreshing) {
      svg.style.animation = 'spin 1s linear infinite';
    } else {
      svg.style.animation = 'none';
    }
  }
}

function updateTimestamp() {
  if (!elements.lastUpdatedText) return;
  const now = new Date();
  elements.lastUpdatedText.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

// Initialize on DOM Ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }
}
