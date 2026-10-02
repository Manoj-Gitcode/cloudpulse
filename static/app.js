/**
 * Cloud Resource Monitoring and Cost Dashboard - Main Application Script
 */

// Application State
const state = {
  resources: [],
  metrics: { timestamps: [], cpu: [], memory: [] },
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
  }
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
}

// Load data from ApiService
async function loadDashboardData() {
  try {
    showRefreshSpin(true);

    // Fetch parallel API endpoints
    const [resourcesData, metricsData, costsData, alertsData] = await Promise.all([
      window.ApiService ? window.ApiService.getResources() : Promise.resolve([]),
      window.ApiService ? window.ApiService.getMetrics() : Promise.resolve({ timestamps: [], cpu: [], memory: [] }),
      window.ApiService ? window.ApiService.getCosts() : Promise.resolve({ total: 0, budget: 0, by_service: [] }),
      window.ApiService ? window.ApiService.getAlerts() : Promise.resolve([])
    ]);

    state.resources = resourcesData || [];
    state.metrics = metricsData || { timestamps: [], cpu: [], memory: [] };
    state.costs = costsData || { total: 0, budget: 0, by_service: [] };
    state.alerts = alertsData || [];

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

  if (!state.alerts || state.alerts.length === 0) {
    elements.alertBannerArea.style.display = 'none';
    return;
  }

  elements.alertBannerArea.style.display = 'flex';

  state.alerts.forEach((alert, index) => {
    const banner = document.createElement('div');
    const levelClass = alert.level === 'critical' ? 'critical' : 'warning';
    banner.className = `alert-banner ${levelClass}`;

    const iconPath = alert.level === 'critical' 
      ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'
      : 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';

    banner.innerHTML = `
      <div class="alert-content">
        <svg class="alert-icon" viewBox="0 0 24 24">
          <path d="${iconPath}"/>
        </svg>
        <span>${escapeHtml(alert.message)}</span>
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
  const totalCost = state.costs.total || 0;
  const budget = state.costs.budget || 1;
  const usedPercent = Math.min(100, Math.round((totalCost / budget) * 100));

  if (elements.totalCostEl) elements.totalCostEl.textContent = formatCurrency(totalCost);
  if (elements.budgetTextEl) elements.budgetTextEl.textContent = `of ${formatCurrency(budget)} limit (${usedPercent}% used)`;
  if (elements.budgetProgressFill) {
    elements.budgetProgressFill.style.width = `${usedPercent}%`;
    if (usedPercent > 90) {
      elements.budgetProgressFill.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
    } else {
      elements.budgetProgressFill.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
    }
  }

  // 2. Resource Counts
  const totalCount = state.resources.length;
  const runningCount = state.resources.filter(r => r.status === 'running').length;
  const warningCount = state.resources.filter(r => r.status === 'warning').length;
  const stoppedCount = state.resources.filter(r => r.status === 'stopped').length;

  if (elements.totalResourcesEl) elements.totalResourcesEl.textContent = totalCount;
  if (elements.resourceBreakdownPills) {
    elements.resourceBreakdownPills.innerHTML = `
      <span class="count-pill running"><span class="badge-dot"></span>${runningCount} Running</span>
      <span class="count-pill warning"><span class="badge-dot"></span>${warningCount} Warning</span>
      <span class="count-pill stopped"><span class="badge-dot"></span>${stoppedCount} Stopped</span>
    `;
  }

  // 3. Avg CPU & Memory for active instances
  const activeResources = state.resources.filter(r => r.status !== 'stopped');
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
function renderCpuMemoryChart() {
  if (typeof document === 'undefined' || typeof Chart === 'undefined') return;
  const canvas = document.getElementById('cpuMemoryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const timestamps = state.metrics.timestamps || [];
  const cpuData = state.metrics.cpu || [];
  const memoryData = state.metrics.memory || [];

  // Destroy existing chart instance on update
  if (state.charts.cpuMemory) {
    state.charts.cpuMemory.destroy();
  }

  // Gradient Fills
  const cpuGradient = ctx.createLinearGradient(0, 0, 0, 300);
  cpuGradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
  cpuGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  const memGradient = ctx.createLinearGradient(0, 0, 0, 300);
  memGradient.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
  memGradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

  state.charts.cpuMemory = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'CPU Utilization (%)',
          data: cpuData,
          borderColor: '#06b6d4',
          backgroundColor: cpuGradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#06b6d4',
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Memory Usage (%)',
          data: memoryData,
          borderColor: '#8b5cf6',
          backgroundColor: memGradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#8b5cf6',
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#9ca3af',
            font: { family: 'inherit', size: 12 },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#f9fafb',
          bodyColor: '#9ca3af',
          borderColor: '#1f2937',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(31, 41, 55, 0.5)' },
          ticks: { color: '#6b7280', font: { size: 11 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(31, 41, 55, 0.5)' },
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
            callback: (val) => `${val}%`
          }
        }
      }
    }
  });
}

// Render Cost Breakdown Doughnut Chart using Chart.js
function renderCostBreakdownChart() {
  if (typeof document === 'undefined' || typeof Chart === 'undefined') return;
  const canvas = document.getElementById('costBreakdownChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const servicesData = state.costs.by_service || [];
  const labels = servicesData.map(s => s.service);
  const costs = servicesData.map(s => s.cost);

  if (state.charts.costBreakdown) {
    state.charts.costBreakdown.destroy();
  }

  const colors = [
    '#3b82f6', // EC2 - Blue
    '#8b5cf6', // RDS - Purple
    '#10b981', // S3 - Green
    '#f59e0b', // EKS - Amber
    '#06b6d4', // ElastiCache - Cyan
    '#ec4899'  // Other - Pink
  ];

  state.charts.costBreakdown = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: costs,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: '#111827',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            font: { family: 'inherit', size: 11 },
            usePointStyle: true,
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#f9fafb',
          bodyColor: '#9ca3af',
          borderColor: '#1f2937',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context) => ` ${context.label}: ${formatCurrency(context.parsed)}`
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Dynamic Region Options
function populateRegionFilterOptions() {
  if (!elements.regionFilter || typeof document === 'undefined') return;
  const currentVal = elements.regionFilter.value;
  const regions = [...new Set(state.resources.map(r => r.region))];

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

  const filtered = state.resources.filter(resource => {
    const matchesSearch = !state.filters.search || 
      resource.name.toLowerCase().includes(state.filters.search) ||
      resource.id.toLowerCase().includes(state.filters.search) ||
      resource.type.toLowerCase().includes(state.filters.search);

    const matchesStatus = state.filters.status === 'all' || resource.status === state.filters.status;
    const matchesRegion = state.filters.region === 'all' || resource.region === state.filters.region;

    return matchesSearch && matchesStatus && matchesRegion;
  });

  if (elements.tableCountBadge) {
    elements.tableCountBadge.textContent = `${filtered.length} of ${state.resources.length} items`;
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
    
    const cpuColor = res.cpu > 85 ? '#ef4444' : res.cpu > 70 ? '#f59e0b' : '#3b82f6';
    const memColor = res.memory > 85 ? '#ef4444' : res.memory > 70 ? '#f59e0b' : '#8b5cf6';

    tr.innerHTML = `
      <td>
        <div class="resource-name-cell">
          <span class="resource-name">${escapeHtml(res.name)}</span>
          <span class="resource-id">${escapeHtml(res.id)}</span>
        </div>
      </td>
      <td>${escapeHtml(res.type)}</td>
      <td>${escapeHtml(res.region)}</td>
      <td>
        <div class="metric-progress-cell">
          <div class="metric-bar-wrap">
            <div class="metric-bar-fill" style="width: ${Math.min(100, res.cpu)}%; background-color: ${cpuColor}"></div>
          </div>
          <span class="metric-val">${res.cpu.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <div class="metric-progress-cell">
          <div class="metric-bar-wrap">
            <div class="metric-bar-fill" style="width: ${Math.min(100, res.memory)}%; background-color: ${memColor}"></div>
          </div>
          <span class="metric-val">${res.memory.toFixed(1)}%</span>
        </div>
      </td>
      <td><strong>${formatCurrency(res.cost_per_day)}</strong> / day</td>
      <td>
        <span class="status-badge ${res.status}">
          <span class="badge-dot"></span>
          ${res.status}
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
  if (!elements.modalOverlay || !elements.modalBody || typeof document === 'undefined') return;

  elements.modalBody.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Resource ID</span>
      <span class="detail-value" style="font-family: monospace;">${escapeHtml(resource.id)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Resource Name</span>
      <span class="detail-value">${escapeHtml(resource.name)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Instance Type</span>
      <span class="detail-value">${escapeHtml(resource.type)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Region</span>
      <span class="detail-value">${escapeHtml(resource.region)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value">
        <span class="status-badge ${resource.status}">
          <span class="badge-dot"></span>
          ${resource.status}
        </span>
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Current CPU Load</span>
      <span class="detail-value">${resource.cpu}%</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Current Memory Load</span>
      <span class="detail-value">${resource.memory}%</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Daily Running Cost</span>
      <span class="detail-value">${formatCurrency(resource.cost_per_day)} / day</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Estimated Monthly Cost</span>
      <span class="detail-value">${formatCurrency(resource.cost_per_day * 30)} / mo</span>
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function escapeHtml(str) {
  if (!str) return '';
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
