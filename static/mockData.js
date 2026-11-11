/**
 * Mock Data for Cloud Resource Monitoring & Cost Dashboard
 * Matching API Contracts:
 * - GET /api/resources
 * - GET /api/metrics
 * - GET /api/costs
 * - GET /api/alerts
 */

const MOCK_RESOURCES = [
  {
    id: "res-101",
    name: "web-prod-api-01",
    type: "EC2 t3.xlarge",
    region: "us-east-1",
    status: "running",
    cpu: 48.5,
    memory: 64.2,
    cost_per_day: 18.50
  },
  {
    id: "res-102",
    name: "web-prod-api-02",
    type: "EC2 t3.xlarge",
    region: "us-east-1",
    status: "running",
    cpu: 52.1,
    memory: 68.0,
    cost_per_day: 18.50
  },
  {
    id: "res-103",
    name: "db-primary-pg",
    type: "RDS db.r6g.2xlarge",
    region: "us-east-1",
    status: "warning",
    cpu: 89.4,
    memory: 92.1,
    cost_per_day: 42.00
  },
  {
    id: "res-104",
    name: "db-replica-pg-01",
    type: "RDS db.r6g.xlarge",
    region: "us-east-1",
    status: "running",
    cpu: 31.0,
    memory: 45.5,
    cost_per_day: 21.00
  },
  {
    id: "res-105",
    name: "redis-cache-cluster",
    type: "ElastiCache cache.m6g.large",
    region: "us-west-2",
    status: "running",
    cpu: 18.2,
    memory: 78.4,
    cost_per_day: 12.80
  },
  {
    id: "res-106",
    name: "auth-service-pod",
    type: "EKS Microservice",
    region: "us-east-1",
    status: "running",
    cpu: 25.6,
    memory: 41.2,
    cost_per_day: 8.40
  },
  {
    id: "res-107",
    name: "analytics-worker-01",
    type: "EC2 c6i.2xlarge",
    region: "eu-west-1",
    status: "warning",
    cpu: 94.8,
    memory: 88.0,
    cost_per_day: 32.60
  },
  {
    id: "res-108",
    name: "analytics-worker-02",
    type: "EC2 c6i.2xlarge",
    region: "eu-west-1",
    status: "stopped",
    cpu: 0.0,
    memory: 0.0,
    cost_per_day: 4.20
  },
  {
    id: "res-109",
    name: "s3-media-storage",
    type: "S3 Standard Storage",
    region: "us-east-1",
    status: "running",
    cpu: 12.0,
    memory: 30.5,
    cost_per_day: 19.40
  },
  {
    id: "res-110",
    name: "legacy-batch-job",
    type: "EC2 t2.medium",
    region: "ap-southeast-1",
    status: "stopped",
    cpu: 0.0,
    memory: 0.0,
    cost_per_day: 2.10
  }
];

const MOCK_METRICS = {
  timestamps: [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ],
  cpu: [38.2, 42.5, 55.1, 62.8, 74.3, 81.0, 76.4, 68.2, 59.5, 52.0, 46.8, 44.1],
  memory: [52.0, 54.1, 58.6, 61.2, 69.5, 75.8, 78.2, 74.0, 71.3, 68.5, 65.2, 63.8]
};

const MOCK_COSTS = {
  total: 4850.00,
  budget: 6000.00,
  by_service: [
    { service: "EC2 Compute", cost: 1950.00 },
    { service: "RDS Databases", cost: 1350.00 },
    { service: "S3 Storage", cost: 580.00 },
    { service: "EKS Kubernetes", cost: 620.00 },
    { service: "ElastiCache", cost: 350.00 }
  ]
};

const MOCK_ALERTS = [
  {
    level: "critical",
    message: "Critical Memory Alert: Database 'db-primary-pg' (RDS) memory utilization reached 92.1%. Action recommended."
  },
  {
    level: "warning",
    message: "High CPU Utilization: Compute node 'analytics-worker-01' CPU sustained above 90% for > 15 minutes."
  }
];

// Export for usage in window object or ES module style
if (typeof window !== 'undefined') {
  window.MOCK_RESOURCES = MOCK_RESOURCES;
  window.MOCK_METRICS = MOCK_METRICS;
  window.MOCK_COSTS = MOCK_COSTS;
  window.MOCK_ALERTS = MOCK_ALERTS;
}
