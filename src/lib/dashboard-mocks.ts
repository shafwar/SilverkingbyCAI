const envFlag = process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS;

export const DASHBOARD_USE_MOCKS = envFlag !== "false";

export const mockDashboardStats = {
  totalProducts: 24,
  totalQrCodes: 24,
  totalScans: 1284,
  scansToday: 52,
};

const generateTrend = (days: number) =>
  Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: Math.round(10 + Math.random() * 40),
    };
  });

export const mockTrend7Days = generateTrend(7);
export const mockTrend30Days = generateTrend(30);
export const getMockTrend = (days: number) => generateTrend(days);

export const mockTopProducts = [
  { name: "Aurora Platinum 50g", scans: 320 },
  { name: "Imperial Rose 25g", scans: 280 },
  { name: "Silver Crest 10g", scans: 240 },
  { name: "Noir Reserve 5g", scans: 190 },
  { name: "Crown Heritage 100g", scans: 150 },
  { name: "Legacy Edition 75g", scans: 120 },
];

export const mockDistribution = [
  { label: "Jakarta", value: 34 },
  { label: "Singapore", value: 22 },
  { label: "Dubai", value: 19 },
  { label: "London", value: 12 },
  { label: "New York", value: 9 },
  { label: "Others", value: 4 },
];

export const mockActivityLogs = {
  logs: Array.from({ length: 6 }).map((_, index) => ({
    id: index + 1,
    serialCode: `SKP-00${index + 1}`,
    productName: mockTopProducts[index % mockTopProducts.length].name,
    scannedAt: new Date(Date.now() - index * 3600 * 1000).toISOString(),
    ip: `103.28.1${index}.2`,
    location: ["Jakarta, ID", "Singapore, SG", "Dubai, UAE"][index % 3],
  })),
};

export const mockLogsResponse = {
  logs: Array.from({ length: 10 }).map((_, index) => ({
    id: index + 10,
    productName: mockTopProducts[index % mockTopProducts.length].name,
    serialCode: `SK-24-${index + 10}`,
    scannedAt: new Date(Date.now() - index * 7200 * 1000).toISOString(),
    ip: `36.77.${index}.120`,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    location: ["Jakarta", "Singapore", "Dubai"][index % 3],
  })),
  meta: {
    page: 1,
    pageSize: 10,
    total: 42,
    totalPages: 5,
  },
};

export const mockQrPreview = {
  products: mockTopProducts.slice(0, 6).map((product, index) => ({
    id: index + 1,
    name: product.name,
    weight: [5, 10, 25, 50, 75, 100][index % 6],
    serialCode: `SKQR-${1000 + index}`,
    qrImageUrl: `/qr/SK${String.fromCharCode(65 + index)}000001.png`,
    createdAt: new Date(Date.now() - index * 86400 * 1000).toISOString(),
  })),
};


