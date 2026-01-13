let mockVendors = [
  {
    id: 1,
    name: "ALIMAH KATERING",
    npwp: "12.345.678.9-123.000",
    email: "alimah@katering.com",
    phone: "081234567890",
    address: "Jl. Merdeka No. 123, Jakarta Pusat",
    status: "active",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "CV MAJU JAYA",
    npwp: "23.456.789.0-234.000",
    email: "majujaya@example.com",
    phone: "081234567891",
    address: "Jl. Sudirman No. 456, Jakarta Selatan",
    status: "active",
    created_at: "2025-01-02T00:00:00Z",
  },
  {
    id: 3,
    name: "PT SEJAHTERA ABADI",
    npwp: "34.567.890.1-345.000",
    email: "sehaterabadi@example.com",
    phone: "081234567892",
    address: "Jl. Thamrin No. 789, Jakarta Pusat",
    status: "active",
    created_at: "2025-01-03T00:00:00Z",
  },
  {
    id: 4,
    name: "TOKO BAHAGIA",
    npwp: "45.678.901.2-456.000",
    email: "bahagia@example.com",
    phone: "081234567893",
    address: "Jl. Gatot Subroto No. 321, Jakarta Barat",
    status: "active",
    created_at: "2025-01-04T00:00:00Z",
  },
];

let vendorCounter = 5;

export const vendorsApi = {
  getAll: async (params = {}) => {
    let filtered = [...mockVendors];

    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(search) ||
          v.email?.toLowerCase().includes(search),
      );
    }

    if (params.status) {
      filtered = filtered.filter((v) => v.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  },

  getById: async (id) => {
    const vendor = mockVendors.find((v) => v.id === parseInt(id));
    if (!vendor) throw new Error("Vendor tidak ditemukan");
    return { data: vendor };
  },

  create: async (data) => {
    const newVendor = {
      id: vendorCounter++,
      ...data,
      created_at: new Date().toISOString(),
    };
    mockVendors.unshift(newVendor);
    return { data: newVendor };
  },

  update: async (id, data) => {
    const index = mockVendors.findIndex((v) => v.id === parseInt(id));
    if (index === -1) throw new Error("Vendor tidak ditemukan");
    mockVendors[index] = {
      ...mockVendors[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return { data: mockVendors[index] };
  },

  delete: async (id) => {
    const index = mockVendors.findIndex((v) => v.id === parseInt(id));
    if (index !== -1) mockVendors.splice(index, 1);
    return { data: { success: true } };
  },

  search: async (query) => {
    const search = query.toLowerCase();
    const results = mockVendors.filter(
      (v) =>
        v.name.toLowerCase().includes(search) ||
        v.npwp?.toLowerCase().includes(search),
    );
    return { data: results };
  },
};
