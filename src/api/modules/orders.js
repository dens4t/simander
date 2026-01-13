let mockOrders = [
  {
    id: 1,
    order_number: 1,
    order_date: "2025-01-15",
    shopping_name: "Belanja Makanan Kegiatan Lapangan",
    contract_number: "1/SP/DLH.P2KLH/2025",
    vendor_id: 1,
    vendor_name: "ALIMAH KATERING",
    vendor_npwp: "12.345.678.9-123.000",
    contract_value: 1500000,
    status: "approved",
    notes: "Untuk kegiatan monitoring DLH",
    paket: { id_paket: "PKT-2025-001", no_surat_pesanan: "SP-001/2025" },
    kontrak: [
      {
        no: "01",
        kode_kontrak: "SPK-001",
        kode_bidang: "P2KLH",
        bulan: "01",
        tahun: "2025",
        tgl: "2025-01-15",
        nilai_kwitansi: 1500000,
      },
    ],
    invoice: [{ no: "INV-001", tgl: "2025-01-18", nilai_invoice: 1500000 }],
    drive_link: "",
    ba: [
      {
        no: "BA-001",
        kode_ba: "BAST-001",
        kode_bidang: "P2KLH",
        bulan: "01",
        tahun: "2025",
        tgl: "2025-01-20",
        nilai: 1500000,
      },
    ],
    created_by: 1,
    created_at: "2025-01-15T08:00:00Z",
  },
  {
    id: 2,
    order_number: 2,
    order_date: "2025-01-16",
    shopping_name: "Belanja ATK Kantor",
    contract_number: "2/SP/DLH.P2KLH/2025",
    vendor_id: 2,
    vendor_name: "CV MAJU JAYA",
    vendor_npwp: "23.456.789.0-234.000",
    contract_value: 750000,
    status: "pending",
    notes: "Untuk kebutuhan kantor DLH",
    paket: { id_paket: "PKT-2025-002", no_surat_pesanan: "SP-002/2025" },
    kontrak: [
      {
        no: "02",
        kode_kontrak: "SPK-002",
        kode_bidang: "P2KLH",
        bulan: "01",
        tahun: "2025",
        tgl: "2025-01-16",
        nilai_kwitansi: 750000,
      },
    ],
    invoice: [{ no: "INV-002", tgl: "2025-01-19", nilai_invoice: 750000 }],
    drive_link: "",
    ba: [
      {
        no: "BA-002",
        kode_ba: "BAST-002",
        kode_bidang: "P2KLH",
        bulan: "01",
        tahun: "2025",
        tgl: "2025-01-21",
        nilai: 750000,
      },
    ],
    created_by: 1,
    created_at: "2025-01-16T10:00:00Z",
  },
  {
    id: 3,
    order_number: 3,
    order_date: "2025-01-17",
    shopping_name: "Belanja Perlengkapan Kebersihan",
    contract_number: "3/SP/DLH.P2KLH/2025",
    vendor_id: 3,
    vendor_name: "PT SEJAHTERA ABADI",
    vendor_npwp: "34.567.890.1-345.000",
    contract_value: 500000,
    status: "draft",
    notes: "",
    paket: { id_paket: "", no_surat_pesanan: "" },
    kontrak: [
      {
        no: "",
        kode_kontrak: "",
        kode_bidang: "",
        bulan: "",
        tahun: "",
        tgl: "",
        nilai_kwitansi: 0,
      },
    ],
    invoice: [{ no: "", tgl: "", nilai_invoice: 0 }],
    drive_link: "",
    ba: [
      {
        no: "",
        kode_ba: "",
        kode_bidang: "",
        bulan: "",
        tahun: "",
        tgl: "",
        nilai: 0,
      },
    ],
    created_by: 1,
    created_at: "2025-01-17T14:00:00Z",
  },
];

let orderCounter = 4;

function generateOrderNumber() {
  return orderCounter;
}

export const ordersApi = {
  getAll: async (params = {}) => {
    let filtered = [...mockOrders];

    if (params.search) {
      const search = params.search.toLowerCase();
        filtered = filtered.filter(
          (o) =>
            String(o.order_number || "").toLowerCase().includes(search) ||
            o.shopping_name.toLowerCase().includes(search),
        );

    }

    if (params.status) {
      filtered = filtered.filter((o) => o.status === params.status);
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
    const order = mockOrders.find((o) => o.id === parseInt(id));
    if (!order) throw new Error("Order tidak ditemukan");
    return { data: order };
  },

  create: async (data) => {
    const nextOrderNumber = generateOrderNumber();
    const newOrder = {
      id: orderCounter++,
      order_number: nextOrderNumber,
      ...data,
      paket: data.paket || { id_paket: "", no_surat_pesanan: "" },
      kontrak: Array.isArray(data.kontrak) && data.kontrak.length
        ? data.kontrak
        : [{ no: "", kode_kontrak: "", kode_bidang: "", bulan: "", tahun: "", tgl: "", nilai_kwitansi: 0 }],
      invoice: Array.isArray(data.invoice) && data.invoice.length
        ? data.invoice
        : [{ no: "", tgl: "", nilai_invoice: 0 }],
      drive_link: data.drive_link || "",
      ba: Array.isArray(data.ba) && data.ba.length
        ? data.ba
        : [{ no: "", kode_ba: "", kode_bidang: "", bulan: "", tahun: "", tgl: "", nilai: 0 }],
      created_by: 1,
      created_at: new Date().toISOString(),
    };
    mockOrders.unshift(newOrder);
    return { data: newOrder };
  },

  update: async (id, data) => {
    const index = mockOrders.findIndex((o) => o.id === parseInt(id));
    if (index === -1) throw new Error("Order tidak ditemukan");
    mockOrders[index] = {
      ...mockOrders[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return { data: mockOrders[index] };
  },

  delete: async (id) => {
    const index = mockOrders.findIndex((o) => o.id === parseInt(id));
    if (index !== -1) mockOrders.splice(index, 1);
    return { data: { success: true } };
  },

  getStats: async () => {
    return {
      data: {
        total: mockOrders.length,
        pending: mockOrders.filter((o) => o.status === "pending").length,
        approved: mockOrders.filter((o) => o.status === "approved").length,
        completed: mockOrders.filter((o) => o.status === "completed").length,
        draft: mockOrders.filter((o) => o.status === "draft").length,
        totalValue: mockOrders.reduce(
          (sum, o) => sum + (o.contract_value || 0),
          0,
        ),
      },
    };
  },
};
