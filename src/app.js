const API_BASE_URL = "https://order-2025-api.densat98.workers.dev";

function app() {
  return {
    API_BASE_URL: API_BASE_URL,
    token: null,

    isAuthenticated: false,
    user: null,
    authLoading: false,
    loginError: "",
    loginForm: { email: "", password: "" },

    currentPage: "/",
    sidebarCollapsed: false,
    sidebarOpen: false,

    loading: false,
    stats: {
      total: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      draft: 0,
      totalValue: 0,
    },
    recentOrders: [],

    orders: [],
    ordersLoading: false,
    orderSearch: "",
    orderStatusFilter: "",
    orderSortBy: "order_number",
    orderSortDir: "asc",

    orderPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    selectedOrderIds: [],
    bulkStatus: "",
    bulkActionLoading: false,


    vendors: [],
    vendorsLoading: false,
    vendorSearch: "",
    vendorPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },

    users: [],
    usersLoading: false,
    userSearch: "",
    userPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },

    isEditUser: false,
    userForm: {},

    isEditOrder: false,
    orderForm: {},
    contractValueDisplay: "",
    vendorSearchInput: "",
    showVendorDropdown: false,
    filteredVendors: [],
    selectedVendor: null,
    formLoading: false,
    formError: "",

    isEditVendor: false,
    vendorForm: {},

    isEditSubkegiatan: false,
    subkegiatanForm: {},
    subkegiatans: [],
    subkegiatansLoading: false,
    subkegiatanSearch: "",
    subkegiatanPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    selectedSubkegiatan: null,
    subkegiatanSearchInput: "",
    showSubkegiatanDropdown: false,
    filteredSubkegiatans: [],

    isEditBidang: false,
    bidangForm: {},
    bidangs: [],
    bidangsLoading: false,
    bidangSearch: "",
    bidangPagination: { page: 1, limit: 100, total: 0, totalPages: 0 },

    feedbacks: [],

    feedbackLoading: false,
    feedbackError: "",
    feedbackForm: { name: "", message: "" },

    backupDownloadLoading: false,

    toast: { show: false, title: "", message: "", type: "success" },

    showOrderModal: false,
    selectedOrder: null,
    orderDetailTab: "paket",
    orderTab: "paket",
    showUserOrdersModal: false,
    selectedUserOrders: null,
    userOrders: [],
    userOrdersLoading: false,
    showDownloadAllModal: false,
    downloadAllLoading: false,
    showDeleteModal: false,
    deleteModalType: "",
    deleteModalId: null,
    deleteModalMessage: "",

    get pageTitle() {
      const titles = {
        "/": "Dashboard",
        "/orders": "Orders",
        "/vendors": "Vendors",
        "/users": "Users",
        "/subkegiatan": "Subkegiatan",
        "/bidang": "Bidang",
        "/feedback": "Kritik & Saran",
        "/backup": "Backup",

      };
      if (this.currentPage === "/orders/new") return "Order Baru";
      if (this.currentPage.startsWith("/orders/")) return "Edit Order";
      if (this.currentPage === "/vendors/new") return "Vendor Baru";
      if (this.currentPage.startsWith("/vendors/")) return "Edit Vendor";
      if (this.currentPage === "/users/new") return "User Baru";
      if (this.currentPage.startsWith("/users/")) return "Edit User";
      if (this.currentPage === "/subkegiatan/new") return "Subkegiatan Baru";
      if (this.currentPage.startsWith("/subkegiatan/")) return "Edit Subkegiatan";
      if (this.currentPage === "/bidang/new") return "Bidang Baru";
      if (this.currentPage.startsWith("/bidang/")) return "Edit Bidang";
      return titles[this.currentPage] || "Dashboard";
    },

    get pageSubtitle() {
      const subtitles = {
        "/orders": "Kelola semua order pengadaan",
        "/vendors": "Kelola data vendor/penyedia",
        "/users": "Kelola data user",
        "/subkegiatan": "Kelola data subkegiatan dan PPK",
        "/bidang": "Kelola data bidang",
        "/feedback": "Masukan pengguna untuk perbaikan",
        "/backup": "Unduh data backup",

        "/orders/new": "Buat order pengadaan baru",
      };
      return subtitles[this.currentPage] || "";
    },

    get userInitials() {
      if (!this.user?.name) return "U";
      return this.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    },

    get orderCreatorName() {
      if (!this.isEditOrder) return "-";
      return this.orderForm?.created_by_name || this.orderForm?.created_by || "-";
    },

    get orderEditorName() {
      if (!this.isEditOrder) return "-";
      return this.orderForm?.updated_by_name || this.orderForm?.updated_by || "-";
    },

    get orderLastUpdatedAt() {
      if (!this.isEditOrder) return "-";
      return this.formatDateTime(this.orderForm?.updated_at) || "-";
    },

    get isAdmin() {
      return this.user?.role === 'admin';
    },

    canEditOrder(order) {
      return this.isAdmin || order.created_by === this.user?.id;
    },

    canDeleteOrder(order) {
      return this.isAdmin || order.created_by === this.user?.id;
    },

    async init() {
      console.log('=== INIT CALLED ===');
      this.restoreAuthSession();
      window.addEventListener("hashchange", () => this.handleHashChange());
      console.log("Hash change listener added");
      this.handleHashChange();
      await this.verifyAuth();
      this.loadInitialData();
      this.loadPageData();
    },


    handleHashChange() {
      const hash = window.location.hash.slice(1) || "/";
      console.log("handleHashChange called, hash:", hash);

      const blockedRoutes = ["/vendors", "/users", "/subkegiatan", "/bidang", "/backup"];
      const isBlocked = blockedRoutes.some(
        (route) => hash === route || hash.startsWith(`${route}/`),
      );

      if (!this.isAdmin && isBlocked) {
        this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
        this.currentPage = "/orders";
        window.location.hash = "#/orders";
        return;
      }

      this.currentPage = hash;
      this.loadPageData();
    },


    navigate(path) {
      console.log("navigate to:", path);

      if (window.innerWidth < 1024) {
        this.sidebarOpen = false;
      }
      
      // Reset form states when navigating to new pages
      if (path === '/orders/new') {
        this.isEditOrder = false;
        const nextOrderNumber = this.getNextOrderNumber();
        this.orderForm = {
          order_number: nextOrderNumber,
          order_date: new Date().toISOString().split("T")[0],
          shopping_name: "",
          contract_number: "",
          vendor_id: null,
          contract_value: 0,
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
          subkegiatan_id: null,
        };
        this.vendorSearchInput = "";
        this.selectedVendor = null;
        this.filteredVendors = [];
        this.showVendorDropdown = false;
        this.formError = "";
        this.contractValueDisplay = "";
        console.log("Reset order form for new order, order_number:", nextOrderNumber);
      }
      
      if (path === '/vendors/new') {
        this.isEditVendor = false;
        this.vendorForm = {
          name: "",
          npwp: "",
          email: "",
          phone: "",
          address: "",
          status: "active",
        };
        this.formError = "";
        console.log("Reset vendor form for new vendor");
      }
      
      window.location.hash = path;
      this.handleHashChange();
      
      // Force Alpine to re-evaluate DOM
      setTimeout(() => {
        const appElement = document.querySelector('[x-data]');
        if (appElement && appElement._x_dataStack) {
          const data = appElement._x_dataStack[0];
          const dummy = data.currentPage;
          data.currentPage = dummy;
        }
      }, 50);
    },

    restoreAuthSession() {
      const storedToken = sessionStorage.getItem("auth_token");
      if (!storedToken) return;

      this.token = storedToken;
      this.isAuthenticated = true;

      const storedUser = sessionStorage.getItem("auth_user");
      if (storedUser) {
        try {
          this.user = JSON.parse(storedUser);
        } catch (error) {
          console.warn("Failed to parse stored user", error);
          sessionStorage.removeItem("auth_user");
        }
      }
    },

    saveAuthSession() {
      if (this.token) {
        sessionStorage.setItem("auth_token", this.token);
      }
      if (this.user) {
        sessionStorage.setItem("auth_user", JSON.stringify(this.user));
      }
    },

    clearAuthSession() {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    },


    async apiRequest(endpoint, options = {}) {
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      console.log(`API Request: ${options.method || 'GET'} ${endpoint}, hasToken: ${!!this.token}`);

      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API not available");
      }

      const data = await response.json();

      if (response.status === 401) {
        console.log('Received 401 Unauthorized, logging out...');
        this.handleLogout();
        throw new Error("Session expired, please login again");
      }

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    },


    async verifyAuth() {
      console.log('verifyAuth called, token:', this.token ? this.token.substring(0, 20) + '...' : 'null');
      
      // Skip verification for demo mode
      if (this.token === "demo-token") {
        console.log('Demo mode detected, skipping verification');
        this.isAuthenticated = true;
        return;
      }

      if (!this.token) {
        console.log('No token available');
        this.isAuthenticated = false;
        return;
      }

      try {
        const result = await this.apiRequest("/api/v1/auth/me");
        console.log('Auth verification successful:', result);
        this.user = result;
        this.isAuthenticated = true;
        this.saveAuthSession();
      } catch (error) {
        console.log('Auth verification failed:', error.message);
        // If API not available (network error), stay logged in for demo
        if (error.message === "API not available") {
          return;
        }
        // For other errors (401, etc), logout
        console.log('Calling handleLogout due to auth failure');
        this.handleLogout();
      }
    },


    loadInitialData() {
      console.log('loadInitialData called, isAuthenticated:', this.isAuthenticated);
      if (!this.isAuthenticated) {
        console.log('Not authenticated, skipping loadInitialData');
        return;
      }
      this.loadDashboard();
      this.loadOrders();
      this.loadVendors();
      this.loadUsers();
      this.loadBidangs();
    },

    loadPageData() {
      if (!this.isAuthenticated) return;

      if (this.currentPage === "/") {
        this.loadDashboard();
        return;
      }

      if (this.currentPage === "/orders") {
        this.loadOrders();
        return;
      }

      if (this.currentPage === "/orders/new") {
        this.initOrderForm();
        this.loadOrders();
        this.loadBidangs();
        return;
      }

      if (this.currentPage.startsWith("/orders/") && !this.currentPage.includes("/new")) {
        const id = this.currentPage.split("/")[2];
        this.loadBidangs();
        this.loadOrders().then(() => {
          const order = this.orders.find((o) => o.id == id || o.id === String(id));
          if (order) {
            if (!this.canEditOrder(order)) {
              this.showToast("Akses ditolak", "Anda tidak dapat mengubah order ini", "error");
              this.viewOrder(order);
              this.navigate("/orders");
              return;
            }
            this.initOrderForm(order);
            return;
          }
          this.apiRequest("/api/v1/orders/" + id)
            .then((orderData) => {
              if (!this.canEditOrder(orderData)) {
                this.showToast("Akses ditolak", "Anda tidak dapat mengubah order ini", "error");
                this.viewOrder(orderData);
                this.navigate("/orders");
                return;
              }
              this.initOrderForm(orderData);
            })
            .catch(() => this.initOrderForm({ id }));
        });
        return;
      }

      if (this.currentPage === "/vendors") {
        this.loadVendors();
        return;
      }

      if (this.currentPage === "/vendors/new") {
        this.loadVendors();
        this.initVendorForm();
        return;
      }

      if (this.currentPage.startsWith("/vendors/") && !this.currentPage.includes("/new")) {
        const id = this.currentPage.split("/")[2];
        this.loadVendors().then(() => {
          const vendor = this.vendors.find((v) => v.id == id || v.id === String(id));
          if (vendor) {
            this.initVendorForm(vendor);
            return;
          }
          this.apiRequest("/api/v1/vendors/" + id)
            .then((vendorData) => this.initVendorForm(vendorData))
            .catch(() => this.initVendorForm({ id }));
        });
        return;
      }

      if (this.currentPage === "/users") {
        this.loadUsers();
        return;
      }

      if (this.currentPage === "/users/new") {
        this.loadUsers();
        this.initUserForm();
        return;
      }

      if (this.currentPage.startsWith("/users/") && !this.currentPage.includes("/new")) {
        const id = this.currentPage.split("/")[2];
        this.loadUsers().then(() => {
          const user = this.users.find((u) => u.id == id || u.id === String(id));
          if (user) {
            this.initUserForm(user);
            return;
          }
          this.apiRequest("/api/v1/users/" + id)
            .then((userData) => this.initUserForm(userData))
            .catch(() => this.initUserForm({ id }));
        });
        return;
      }

      if (this.currentPage === "/feedback") {
        this.loadFeedbacks();
        return;
      }

      if (this.currentPage === "/subkegiatan") {
        this.loadSubkegiatans();
        return;
      }

      if (this.currentPage === "/subkegiatan/new") {
        this.loadSubkegiatans();
        this.initSubkegiatanForm();
        return;
      }

      if (this.currentPage.startsWith("/subkegiatan/") && !this.currentPage.includes("/new")) {
        const id = this.currentPage.split("/")[2];
        this.loadSubkegiatans().then(() => {
          const subkegiatan = this.subkegiatans.find((s) => s.id == id || s.id === String(id));
          if (subkegiatan) {
            this.initSubkegiatanForm(subkegiatan);
            return;
          }
          this.apiRequest("/api/v1/subkegiatan/" + id)
            .then((subkegiatanData) => this.initSubkegiatanForm(subkegiatanData))
            .catch(() => this.initSubkegiatanForm({ id }));
        });
        return;
      }

      if (this.currentPage === "/bidang") {
        this.loadBidangs();
        return;
      }

      if (this.currentPage === "/bidang/new") {
        this.loadBidangs();
        this.initBidangForm();
        return;
      }

      if (this.currentPage.startsWith("/bidang/") && !this.currentPage.includes("/new")) {
        const id = this.currentPage.split("/")[2];
        this.loadBidangs().then(() => {
          const bidang = this.bidangs.find((item) => item.id == id || item.id === String(id));
          if (bidang) {
            this.initBidangForm(bidang);
            return;
          }
          this.apiRequest("/api/v1/bidang/" + id)
            .then((bidangData) => this.initBidangForm(bidangData))
            .catch(() => this.initBidangForm({ id }));
        });
      }
    },


    async handleLogin() {
      this.authLoading = true;
      this.loginError = "";

      try {
        const data = await this.apiRequest("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify(this.loginForm),
        });

        console.log('Login response:', data);
        
        this.token = String(data.token || '');
        this.user = data.user;
        this.isAuthenticated = true;
        this.saveAuthSession();
        console.log('Token saved:', this.token.substring(0, 20) + '...');
        this.loadInitialData();
        this.showToast("Berhasil", "Selamat datang, " + this.user.name);
        this.navigate("/");

      } catch (error) {
        this.loginError = error.message || "Email atau password salah";
      }

      this.authLoading = false;
    },

    async quickLogin() {
      this.loginForm.email = "admin@dlh.com";
      this.loginForm.password = "admin";
      await this.handleLogin();
    },

    handleLogout() {
      console.log('=== HANDLE LOGOUT CALLED ===');
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.clearAuthSession();
      this.navigate("/login");
    },


    async loadDashboard() {
      if (!this.isAuthenticated) return;
      this.loading = true;

      try {
        const statsData = await this.apiRequest("/api/v1/orders/stats");
        this.stats = statsData;

        const ordersData = await this.apiRequest("/api/v1/orders?limit=5");
        this.recentOrders = ordersData.data || [];
      } catch (error) {
        this.stats = {
          total: 0,
          pending: 0,
          approved: 0,
          completed: 0,
          draft: 0,
          totalValue: 0,
        };
        this.recentOrders = [];
      }
      this.loading = false;
    },

    loadMockDashboard() {
      const mockOrders = [
        {
          id: 1,
          order_number: "ORD-001",
          shopping_name: "Belanja Makanan Kegiatan",
          vendor_name: "ALIMAH KATERING",
          contract_value: 1500000,
          status: "approved",
        },
        {
          id: 2,
          order_number: "ORD-002",
          shopping_name: "Belanja ATK Kantor",
          vendor_name: "CV MAJU JAYA",
          contract_value: 750000,
          status: "pending",
        },
        {
          id: 3,
          order_number: "ORD-003",
          shopping_name: "Perlengkapan Kebersihan",
          vendor_name: "PT SEJAHTERA ABADI",
          contract_value: 500000,
          status: "draft",
        },
      ];
      this.stats = {
        total: 3,
        pending: 1,
        approved: 1,
        completed: 0,
        draft: 1,
        totalValue: 2750000,
      };
      this.recentOrders = mockOrders;
    },

    async loadOrders() {
      if (!this.isAuthenticated) return;
      this.ordersLoading = true;

      try {
        let url = `/api/v1/orders?page=${this.orderPagination.page}&limit=${this.orderPagination.limit}`;
        if (this.orderSearch)
          url += `&search=${encodeURIComponent(this.orderSearch)}`;
        if (this.orderStatusFilter)
          url += `&status=${encodeURIComponent(this.orderStatusFilter)}`;
        if (this.orderSortBy)
          url += `&sort=${encodeURIComponent(this.orderSortBy)}&dir=${encodeURIComponent(this.orderSortDir)}`;

        const data = await this.apiRequest(url);
        this.orders = data.data || [];
        this.orderPagination = data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        };
        this.selectedOrderIds = [];

      } catch (error) {
        this.orders = [];
        this.orderPagination = {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        };
        this.selectedOrderIds = [];
      }
      this.ordersLoading = false;

    },


    loadMockOrders() {
      const year = new Date().getFullYear();
      const baseNumber = this.orders.length;
      const mockOrders = [
        {
          id: baseNumber + 1,
          order_number: `ORD-${year}-${String(baseNumber + 1).padStart(4, '0')}`,
          order_date: "2025-01-15",
          shopping_name: "Belanja Makanan Kegiatan Lapangan",
          contract_number: "1/SP/DLH/2025",
          vendor_id: 1,
          vendor_name: "ALIMAH KATERING",
          vendor_npwp: "12.345.678.9-123.000",
          contract_value: 1500000,
          status: "approved",
          notes: "Untuk kegiatan monitoring DLH",
          created_at: "2025-01-15T08:00:00Z",
        },
        {
          id: baseNumber + 2,
          order_number: `ORD-${year}-${String(baseNumber + 2).padStart(4, '0')}`,
          order_date: "2025-01-16",
          shopping_name: "Belanja ATK Kantor",
          contract_number: "2/SP/DLH/2025",
          vendor_id: 2,
          vendor_name: "CV MAJU JAYA",
          vendor_npwp: "23.456.789.0-234.000",
          contract_value: 750000,
          status: "pending",
          notes: "Untuk kebutuhan kantor DLH",
          created_at: "2025-01-16T10:00:00Z",
        },
        {
          id: baseNumber + 3,
          order_number: `ORD-${year}-${String(baseNumber + 3).padStart(4, '0')}`,
          order_date: "2025-01-17",
          shopping_name: "Belanja Perlengkapan Kebersihan",
          contract_number: "3/SP/DLH/2025",
          vendor_id: 3,
          vendor_name: "PT SEJAHTERA ABADI",
          vendor_npwp: "34.567.890.1-345.000",
          contract_value: 500000,
          status: "draft",
          notes: "",
          created_at: "2025-01-17T14:00:00Z",
        },
      ];
      let filtered = mockOrders;
      if (this.orderSearch) {
        const search = this.orderSearch.toLowerCase();
        filtered = filtered.filter(
          (o) =>
            o.order_number.toLowerCase().includes(search) ||
            o.shopping_name.toLowerCase().includes(search),
        );
      }
      if (this.orderStatusFilter) {
        filtered = filtered.filter((o) => o.status === this.orderStatusFilter);
      }
      this.orders = filtered;
      this.orderPagination = {
        page: 1,
        limit: 10,
        total: filtered.length,
        totalPages: 1,
      };
    },

    async deleteOrder(id) {
      const order = this.orders.find(o => o.id == id || o.id === String(id));
      this.deleteModalType = 'order';
      this.deleteModalId = id;
      this.deleteModalMessage = `Apakah Anda yakin ingin menghapus order "${order?.order_number || id}"? Data yang dihapus tidak dapat dikembalikan.`;
      this.showDeleteModal = true;
    },

    areAllOrdersSelected() {
      return this.orders.length > 0 && this.selectedOrderIds.length === this.orders.length;
    },

    toggleSelectAllOrders() {
      if (this.areAllOrdersSelected()) {
        this.selectedOrderIds = [];
        return;
      }

      this.selectedOrderIds = this.orders.map((order) => order.id);
    },

    async bulkUpdateStatus() {
      if (this.selectedOrderIds.length === 0) {
        this.showToast("Error", "Belum ada order dipilih", "error");
        return;
      }

      if (!this.bulkStatus) {
        this.showToast("Error", "Pilih status baru terlebih dahulu", "error");
        return;
      }

      this.bulkActionLoading = true;

      try {
        await this.apiRequest("/api/v1/orders/bulk", {
          method: "POST",
          body: JSON.stringify({
            action: "status",
            status: this.bulkStatus,
            order_ids: this.selectedOrderIds,
          }),
        });
        this.showToast("Berhasil", "Status order diperbarui");
        this.bulkStatus = "";
        this.selectedOrderIds = [];
        this.loadOrders();
        this.loadDashboard();
      } catch (error) {
        this.showToast("Error", error.message || "Gagal memperbarui status", "error");
      } finally {
        this.bulkActionLoading = false;
      }
    },

    confirmBulkDelete() {
      if (this.selectedOrderIds.length === 0) {
        this.showToast("Error", "Belum ada order dipilih", "error");
        return;
      }

      this.deleteModalType = "bulk-orders";
      this.deleteModalId = null;
      this.deleteModalMessage = `Apakah Anda yakin ingin menghapus ${this.selectedOrderIds.length} order terpilih? Data yang dihapus tidak dapat dikembalikan.`;
      this.showDeleteModal = true;
    },

    async executeBulkDeleteOrders() {
      this.bulkActionLoading = true;

      try {
        await this.apiRequest("/api/v1/orders/bulk", {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            order_ids: this.selectedOrderIds,
          }),
        });
        this.showToast("Berhasil", "Order terpilih berhasil dihapus");
        this.selectedOrderIds = [];
        this.loadOrders();
        this.loadDashboard();
      } catch (error) {
        this.showToast("Error", error.message || "Gagal menghapus order", "error");
      } finally {
        this.bulkActionLoading = false;
      }
    },



    async executeDeleteOrder(id) {
      try {
        await this.apiRequest(`/api/v1/orders/${id}`, { method: "DELETE" });
        this.loadOrders();
        this.loadDashboard();
        this.showToast("Berhasil", "Order berhasil dihapus");
      } catch (error) {
        this.showToast(
          "Error",
          error.message || "Gagal menghapus order",
          "error",
        );
      }
    },

    async executeDeleteVendor(id) {
      try {
        await this.apiRequest(`/api/v1/vendors/${id}`, { method: "DELETE" });
        this.loadVendors();
        this.showToast("Berhasil", "Vendor berhasil dihapus");
      } catch (error) {
        this.showToast(
          "Error",
          error.message || "Gagal menghapus vendor",
          "error",
        );
      }
    },

    async executeDeleteUser(id) {
      try {
        await this.apiRequest(`/api/v1/users/${id}`, { method: "DELETE" });
        this.loadUsers();
        this.showToast("Berhasil", "User berhasil dihapus");
      } catch (error) {
        this.showToast("Error", error.message || "Gagal menghapus user", "error");
      }
    },

    editOrder(order) {
      console.log("editOrder called with:", order);
      this.initOrderForm(order);
      this.navigate("/orders/" + order.id);
      window.scrollTo(0, 0);
    },

    initOrderForm(order = null) {
      console.log("initOrderForm called with:", order);

      // Always reset form for new order to clear previous edit data
      if (!order) {
        this.isEditOrder = false;
        const nextOrderNumber = this.getNextOrderNumber();
        
        // Force object replacement to ensure Alpine reactivity
        const newOrderForm = {
          order_number: nextOrderNumber,
          order_date: new Date().toISOString().split("T")[0],
          shopping_name: "",
          contract_number: "",
          vendor_id: null,
          contract_value: 0,
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
          subkegiatan_id: null,
        };
        this.orderForm = newOrderForm;
        this.vendorSearchInput = "";
        this.selectedVendor = null;
        this.filteredVendors = [];
        this.showVendorDropdown = false;
        this.subkegiatanSearchInput = "";
        this.selectedSubkegiatan = null;
        this.filteredSubkegiatans = [];
        this.showSubkegiatanDropdown = false;
        this.formError = "";
        this.contractValueDisplay = "";

        
        // Force Alpine reactivity by explicitly setting each property
        this.orderForm.order_number = newOrderForm.order_number;
        this.orderForm.order_date = newOrderForm.order_date;
        this.orderForm.shopping_name = newOrderForm.shopping_name;
        this.orderForm.contract_number = newOrderForm.contract_number;
        this.orderForm.vendor_id = newOrderForm.vendor_id;
        this.orderForm.contract_value = newOrderForm.contract_value;
        this.orderForm.status = newOrderForm.status;
        this.orderForm.notes = newOrderForm.notes;
        this.orderForm.paket = newOrderForm.paket;
        this.orderForm.kontrak = newOrderForm.kontrak;
        this.orderForm.invoice = newOrderForm.invoice;
        this.orderForm.drive_link = newOrderForm.drive_link;
        this.orderForm.ba = newOrderForm.ba;
        this.orderForm.subkegiatan_id = newOrderForm.subkegiatan_id;
        
        console.log("NEW MODE: form reset to:", this.orderForm);
        return;
      }

      
      // Edit mode - populate with order data
      this.isEditOrder = true;
      const normalizedOrder = this.ensureOrderExtras(order || {});
      this.orderForm = { ...normalizedOrder };
      this.vendorSearchInput = normalizedOrder.vendor_name || "";
      this.selectedVendor = normalizedOrder.vendor_id
        ? {
            id: normalizedOrder.vendor_id,
            name: normalizedOrder.vendor_name,
            npwp: normalizedOrder.vendor_npwp,
          }
        : null;
      this.filteredVendors = [];
      this.showVendorDropdown = false;
      this.subkegiatanSearchInput = normalizedOrder.subkegiatan_name || "";
      this.selectedSubkegiatan = normalizedOrder.subkegiatan_id
        ? {
            id: normalizedOrder.subkegiatan_id,
            subkegiatan: normalizedOrder.subkegiatan_name || "",
            ppk: normalizedOrder.subkegiatan_ppk || "",
          }
        : null;
      this.filteredSubkegiatans = [];
      this.showSubkegiatanDropdown = false;
      this.formError = "";
      this.contractValueDisplay = this.formatNumber(normalizedOrder.contract_value || 0);
      console.log("EDIT MODE: orderForm set to:", this.orderForm);
    },


    async searchVendors() {
      if (!this.isAuthenticated) return;
      if (!this.vendorSearchInput) {
        this.filteredVendors = [];
        return;
      }

      try {
        const data = await this.apiRequest(
          `/api/v1/vendors/search?q=${encodeURIComponent(this.vendorSearchInput)}`,
        );
        this.filteredVendors = data || [];
        this.showVendorDropdown = this.filteredVendors.length > 0;
      } catch (error) {
        this.filteredVendors = [];
        this.showVendorDropdown = false;
      }
    },

    selectVendor(vendor) {
      this.selectedVendor = vendor;
      this.orderForm.vendor_id = vendor.id;
      this.vendorSearchInput = vendor.name;
      this.showVendorDropdown = false;
    },

    async resolveVendorInput() {
      if (this.orderForm.vendor_id) return;
      const vendorName = (this.vendorSearchInput || "").trim();
      if (!vendorName) return;

      try {
        const results = await this.apiRequest(
          `/api/v1/vendors/search?q=${encodeURIComponent(vendorName)}`,
        );
        const exactMatch = (results || []).find((vendor) =>
          (vendor.name || "").toLowerCase() === vendorName.toLowerCase(),
        );
        if (exactMatch) {
          this.selectedVendor = exactMatch;
          this.orderForm.vendor_id = exactMatch.id;
          this.vendorSearchInput = exactMatch.name;
          return;
        }
      } catch (error) {
        // ignore search errors and attempt to create
      }

      const createdVendor = await this.apiRequest("/api/v1/vendors", {
        method: "POST",
        body: JSON.stringify({ name: vendorName, status: "active" }),
      });
      this.selectedVendor = { id: createdVendor.id, name: createdVendor.name || vendorName };
      this.orderForm.vendor_id = createdVendor.id;
      this.vendorSearchInput = createdVendor.name || vendorName;
    },

    async searchSubkegiatans() {
      if (!this.isAuthenticated) return;

      if (!this.subkegiatanSearchInput) {
        this.filteredSubkegiatans = [];
        this.showSubkegiatanDropdown = false;
        this.selectedSubkegiatan = null;
        this.orderForm.subkegiatan_id = null;
        return;
      }

      try {
        const data = await this.apiRequest(
          `/api/v1/subkegiatan?search=${encodeURIComponent(this.subkegiatanSearchInput)}&limit=10`,
        );
        this.filteredSubkegiatans = data.data || [];
        this.showSubkegiatanDropdown = this.filteredSubkegiatans.length > 0;
      } catch (error) {
        this.filteredSubkegiatans = [];
        this.showSubkegiatanDropdown = false;
      }
    },

    selectSubkegiatan(subkegiatan) {
      this.selectedSubkegiatan = subkegiatan;
      this.orderForm.subkegiatan_id = subkegiatan.id;
      this.subkegiatanSearchInput = subkegiatan.subkegiatan;
      this.showSubkegiatanDropdown = false;
    },

    addKontrakRow() {
      if (!Array.isArray(this.orderForm.kontrak)) {
        this.orderForm.kontrak = [];
      }
      this.orderForm.kontrak.push({
        no: "",
        kode_kontrak: "",
        kode_bidang: "",
        bulan: "",
        tahun: "",
        tgl: "",
        nilai_kwitansi: 0,
      });
    },

    removeKontrakRow(index) {
      if (!Array.isArray(this.orderForm.kontrak)) return;
      this.orderForm.kontrak.splice(index, 1);
    },

    addInvoiceRow() {
      if (!Array.isArray(this.orderForm.invoice)) {
        this.orderForm.invoice = [];
      }
      this.orderForm.invoice.push({ no: "", tgl: "", nilai_invoice: 0 });
    },

    removeInvoiceRow(index) {
      if (!Array.isArray(this.orderForm.invoice)) return;
      this.orderForm.invoice.splice(index, 1);
    },

    addBaRow() {
      if (!Array.isArray(this.orderForm.ba)) {
        this.orderForm.ba = [];
      }
      this.orderForm.ba.push({
        no: "",
        kode_ba: "",
        kode_bidang: "",
        bulan: "",
        tahun: "",
        tgl: "",
        nilai: 0,
      });
    },

    removeBaRow(index) {
      if (!Array.isArray(this.orderForm.ba)) return;
      this.orderForm.ba.splice(index, 1);
    },

    async saveOrder() {
      try {
        await this.resolveVendorInput();
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan vendor";
        return;
      }

      if (
        !this.orderForm.order_date ||
        !this.orderForm.shopping_name ||
        !this.orderForm.vendor_id
      ) {
        this.formError = "Tanggal, nama belanja, dan vendor wajib diisi";
        return;
      }


      this.formLoading = true;
      this.formError = "";

      const payload = this.ensureOrderExtras(this.orderForm);

      try {
        if (this.isEditOrder) {
          await this.apiRequest(`/api/v1/orders/${this.orderForm.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          this.showToast("Berhasil", "Order berhasil diupdate");
        } else {
          await this.apiRequest("/api/v1/orders", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          this.showToast("Berhasil", "Order berhasil dibuat");
        }
        this.loadOrders();
        this.navigate("/orders");
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan order";
      }

      this.formLoading = false;
    },

    async loadVendors() {
      if (!this.isAuthenticated) return;
      this.vendorsLoading = true;

      try {
        let url = `/api/v1/vendors?page=${this.vendorPagination.page}&limit=${this.vendorPagination.limit}`;
        if (this.vendorSearch)
          url += `&search=${encodeURIComponent(this.vendorSearch)}`;

        const data = await this.apiRequest(url);
        this.vendors = data.data || [];
        this.vendorPagination = data.pagination || {
          page:1,
          limit: 10,
          total: 0,
          totalPages: 0,
        };
      } catch (error) {
        this.vendors = [];
        this.vendorPagination = {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        };
      }
      this.vendorsLoading = false;
    },


    async deleteVendor(id) {
      const vendor = this.vendors.find(v => v.id == id || v.id === String(id));
      this.deleteModalType = 'vendor';
      this.deleteModalId = id;
      this.deleteModalMessage = `Apakah Anda yakin ingin menghapus vendor "${vendor?.name || id}"? Data yang dihapus tidak dapat dikembalikan.`;
      this.showDeleteModal = true;
    },

    async executeDeleteVendor(id) {
      try {
        await this.apiRequest(`/api/v1/vendors/${id}`, { method: "DELETE" });
        this.loadVendors();
        this.showToast("Berhasil", "Vendor berhasil dihapus");
      } catch (error) {
        this.showToast(
          "Error",
          error.message || "Gagal menghapus vendor",
          "error",
        );
      }
    },

    editVendor(vendor) {
      console.log("editVendor called with:", vendor);
      this.initVendorForm(vendor);
      this.navigate("/vendors/" + vendor.id);
      window.scrollTo(0, 0);
    },

    initVendorForm(vendor = null) {
      console.log("initVendorForm called with:", vendor);
      if (vendor) {
        this.isEditVendor = true;
        this.vendorForm = { ...vendor };
        console.log("vendorForm set to:", this.vendorForm);
      } else {
        this.isEditVendor = false;
        this.vendorForm = {
          name: "",
          npwp: "",
          email: "",
          phone: "",
          address: "",
          status: "active",
        };
      }
      this.formError = "";
    },

    async saveVendor() {
      if (!this.vendorForm.name) {
        this.formError = "Nama vendor wajib diisi";
        return;
      }

      this.formLoading = true;
      this.formError = "";

      try {
        if (this.isEditVendor) {
          await this.apiRequest(`/api/v1/vendors/${this.vendorForm.id}`, {
            method: "PUT",
            body: JSON.stringify(this.vendorForm),
          });
          this.showToast("Berhasil", "Vendor berhasil diupdate");
        } else {
          await this.apiRequest("/api/v1/vendors", {
            method: "POST",
            body: JSON.stringify(this.vendorForm),
          });
          this.showToast("Berhasil", "Vendor berhasil dibuat");
        }
        this.loadVendors();
        this.navigate("/vendors");
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan vendor";
      }

      this.formLoading = false;
    },

    // Subkegiatan CRUD Functions
    async loadSubkegiatans() {
      if (!this.isAuthenticated) return;
      this.subkegiatansLoading = true;
      
      try {
        let url = `/api/v1/subkegiatan?page=${this.subkegiatanPagination.page}&limit=${this.subkegiatanPagination.limit}`;
        if (this.subkegiatanSearch)
          url += `&search=${encodeURIComponent(this.subkegiatanSearch)}`;

        const data = await this.apiRequest(url);
        this.subkegiatans = data.data || [];
        this.subkegiatansLoading = false;
      } catch (error) {
        console.error('Error loading subkegiatans:', error);
        this.subkegiatansLoading = false;
      }
    },

    async deleteSubkegiatan(id) {
      const subkegiatan = this.subkegiatans.find(s => s.id == id || s.id === String(id));
      this.deleteModalType = 'subkegiatan';
      this.deleteModalId = id;
      this.deleteModalMessage = `Apakah Anda yakin ingin menghapus subkegiatan "${subkegiatan?.subkegiatan || id}"?`;
      this.showDeleteModal = true;
    },

    editSubkegiatan(subkegiatan) {
      this.initSubkegiatanForm(subkegiatan);
      this.navigate("/subkegiatan/" + subkegiatan.id);
      window.scrollTo(0, 0);
    },

    initSubkegiatanForm(subkegiatan = null) {
      if (subkegiatan) {
        this.isEditSubkegiatan = true;
        this.subkegiatanForm = { 
          id: subkegiatan.id,
          subkegiatan: subkegiatan.subkegiatan,
          ppk: subkegiatan.ppk || '',
          status: subkegiatan.status || 'active',
        };
      } else {
        this.isEditSubkegiatan = false;
        this.subkegiatanForm = {
          subkegiatan: '',
          ppk: '',
          status: 'active'
        };
      }
    },

    async saveSubkegiatan() {
      if (!this.subkegiatanForm.subkegiatan) {
        this.formError = "Nama subkegiatan wajib diisi";
        return;
      }

      this.formLoading = true;
      this.formError = "";

      try {
        if (this.isEditSubkegiatan) {
          await this.apiRequest(`/api/v1/subkegiatan/${this.subkegiatanForm.id}`, {
            method: "PUT",
            body: JSON.stringify(this.subkegiatanForm),
          });
          this.showToast("Berhasil", "Subk berhasil diupdate");
        } else {
          await this.apiRequest("/api/v1/subkegiatan", {
            method: "POST",
            body: JSON.stringify(this.subkegiatanForm),
          });
          this.showToast("Berhasil", "Subk berhasil dibuat");
        }
        this.loadSubkegiatans();
        this.navigate("/subkegiatan");
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan subkegiatan";
      }

      this.formLoading = false;
    },

    // Bidang CRUD Functions
    async loadBidangs() {
      if (!this.isAuthenticated) return;
      this.bidangsLoading = true;

      try {
        let url = `/api/v1/bidang?page=${this.bidangPagination.page}&limit=${this.bidangPagination.limit}`;
        if (this.bidangSearch) {
          url += `&search=${encodeURIComponent(this.bidangSearch)}`;
        }

        const data = await this.apiRequest(url);
        this.bidangs = data.data || [];
        this.bidangPagination = data.pagination || this.bidangPagination;
        this.bidangsLoading = false;
      } catch (error) {
        console.error("Error loading bidangs:", error);
        this.bidangsLoading = false;
      }
    },

    async deleteBidang(id) {
      const bidang = this.bidangs.find(item => item.id == id || item.id === String(id));
      this.deleteModalType = "bidang";
      this.deleteModalId = id;
      this.deleteModalMessage = `Apakah Anda yakin ingin menghapus bidang "${bidang?.nama_bidang || id}"?`;
      this.showDeleteModal = true;
    },

    editBidang(bidang) {
      this.initBidangForm(bidang);
      this.navigate("/bidang/" + bidang.id);
      window.scrollTo(0, 0);
    },

    initBidangForm(bidang = null) {
      if (bidang) {
        this.isEditBidang = true;
        this.bidangForm = {
          id: bidang.id,
          nama_bidang: bidang.nama_bidang,
          kode_bidang: bidang.kode_bidang,
          status: bidang.status || "active",
        };
      } else {
        this.isEditBidang = false;
        this.bidangForm = {
          nama_bidang: "",
          kode_bidang: "",
          status: "active",
        };
      }
    },

    async saveBidang() {
      if (!this.bidangForm.nama_bidang || !this.bidangForm.kode_bidang) {
        this.formError = "Nama bidang dan kode bidang wajib diisi";
        return;
      }

      this.formLoading = true;
      this.formError = "";

      try {
        if (this.isEditBidang) {
          await this.apiRequest(`/api/v1/bidang/${this.bidangForm.id}`, {
            method: "PUT",
            body: JSON.stringify(this.bidangForm),
          });
          this.showToast("Berhasil", "Bidang berhasil diupdate");
        } else {
          await this.apiRequest("/api/v1/bidang", {
            method: "POST",
            body: JSON.stringify(this.bidangForm),
          });
          this.showToast("Berhasil", "Bidang berhasil dibuat");
        }
        this.loadBidangs();
        this.navigate("/bidang");
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan bidang";
      }

      this.formLoading = false;
    },

    async confirmDelete() {

      if (this.deleteModalType === "order") {
        await this.executeDeleteOrder(this.deleteModalId);
      } else if (this.deleteModalType === "vendor") {
        await this.executeDeleteVendor(this.deleteModalId);
      } else if (this.deleteModalType === "user") {
        await this.executeDeleteUser(this.deleteModalId);
      } else if (this.deleteModalType === "subkegiatan") {
        try {
          await this.apiRequest(`/api/v1/subkegiatan/${this.deleteModalId}`, {
            method: "DELETE",
          });
          this.showToast("Berhasil", "Subk berhasil dihapus");
          this.loadSubkegiatans();
        } catch (error) {
          this.showToast(
            "Error",
            error.message || "Gagal menghapus subkegiatan",
            "error",
          );
        }
      } else if (this.deleteModalType === "bidang") {
        try {
          await this.apiRequest(`/api/v1/bidang/${this.deleteModalId}`, {
            method: "DELETE",
          });
          this.showToast("Berhasil", "Bidang berhasil dihapus");
          this.loadBidangs();
        } catch (error) {
          this.showToast(
            "Error",
            error.message || "Gagal menghapus bidang",
            "error",
          );
        }
      } else if (this.deleteModalType === "bulk-orders") {
        await this.executeBulkDeleteOrders();
      }

      this.showDeleteModal = false;
      this.deleteModalType = "";
      this.deleteModalId = null;
      this.deleteModalMessage = "";
    },

    // Feedback Functions
    async loadFeedbacks() {
      if (!this.isAuthenticated) return;
      this.feedbackLoading = true;
      this.feedbackError = "";

      try {
        const data = await this.apiRequest("/api/v1/feedback?limit=50");
        this.feedbacks = data.data || [];
      } catch (error) {
        this.feedbacks = [];
        this.feedbackError = error.message || "Gagal memuat kritik dan saran";
      }

      this.feedbackLoading = false;
    },

    async saveFeedback() {
      if (!this.feedbackForm.message) {
        this.feedbackError = "Kritik / saran wajib diisi";
        return;
      }

      this.feedbackLoading = true;
      this.feedbackError = "";

      try {
        await this.apiRequest("/api/v1/feedback", {
          method: "POST",
          body: JSON.stringify(this.feedbackForm),
        });
        this.showToast("Berhasil", "Kritik & saran berhasil disimpan");
        this.feedbackForm = { name: "", message: "" };
        this.loadFeedbacks();
      } catch (error) {
        this.feedbackError = error.message || "Gagal menyimpan kritik dan saran";
      }

      this.feedbackLoading = false;
    },

    async downloadBackupSql() {
      if (!this.isAuthenticated) return;
      this.backupDownloadLoading = true;

      try {
        const response = await fetch(`${this.API_BASE_URL}/api/v1/backup`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = "Gagal mengunduh backup";
          try {
            const errorData = await response.json();
            errorMessage = errorData?.message || errorMessage;
          } catch (error) {
            console.warn("Failed to parse backup error", error);
          }
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "backup-order.sql";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        this.showToast("Error", error.message || "Gagal mengunduh backup", "error");
      } finally {
        this.backupDownloadLoading = false;
      }
    },

    // User CRUD Functions

    async loadUsers() {
      if (!this.isAuthenticated) return;
      this.usersLoading = true;
      
      try {
        let url = `/api/v1/users?page=${this.userPagination.page}&limit=${this.userPagination.limit}`;
        if (this.userSearch)
          url += `&search=${encodeURIComponent(this.userSearch)}`;

        const data = await this.apiRequest(url);
        this.users = (data.data || []).map((user) => ({
          ...user,
          order_count: user.order_count || 0,
        }));
        this.userPagination = data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        };

      } catch (error) {
        console.error('Error loading users:', error);
      }
      this.usersLoading = false;
    },

    async fetchUserOrders(userId) {
      if (!this.isAuthenticated) return [];

      const collected = [];
      let page = 1;
      let totalPages = 1;
      const limit = 50;

      try {
        do {
          const url = `/api/v1/orders?page=${page}&limit=${limit}&sort=order_number&dir=asc&created_by=${encodeURIComponent(userId)}`;
          const data = await this.apiRequest(url);
          collected.push(...(data.data || []));
          totalPages = data.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
      } catch (error) {
        this.showToast("Error", error.message || "Gagal memuat order user", "error");
        return [];
      }

      return collected;
    },

    async openUserOrdersModal(user) {
      if (!user) return;
      this.selectedUserOrders = user;
      this.userOrders = [];
      this.showUserOrdersModal = true;
      this.userOrdersLoading = true;

      try {
        this.userOrders = await this.fetchUserOrders(user.id);
      } finally {
        this.userOrdersLoading = false;
      }
    },

    closeUserOrdersModal() {
      this.showUserOrdersModal = false;
      this.selectedUserOrders = null;
      this.userOrders = [];
      this.userOrdersLoading = false;
    },

    async deleteUser(id) {
      const user = this.users.find(u => u.id == id || u.id === String(id));
      this.deleteModalType = 'user';
      this.deleteModalId = id;
      this.deleteModalMessage = `Apakah Anda yakin ingin menghapus user "${user?.name || id}"?`;
      this.showDeleteModal = true;
    },


    editUser(user) {
      console.log("editUser called with:", user);
      this.initUserForm(user);
      this.navigate("/users/" + user.id);
      window.scrollTo(0, 0);
    },

    initUserForm(user = null) {
      console.log("initUserForm called with:", user);
      if (user) {
        this.isEditUser = true;
        this.userForm = { 
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || 'active',
        };
        console.log("userForm set to:", this.userForm);
      } else {
        this.isEditUser = false;
        this.userForm = {
          name: "",
          email: "",
          password: "",
          role: "user",
          status: "active",
        };
      }
      this.formError = "";
    },

    async saveUser() {
      if (!this.userForm.name || !this.userForm.email) {
        this.formError = "Nama dan email wajib diisi";
        return;
      }

      this.formLoading = true;
      this.formError = "";

      try {
        if (this.isEditUser) {
          // For edit, don't send password if empty
          const updateData = { ...this.userForm };
          if (!updateData.password) delete updateData.password;
          
          await this.apiRequest(`/api/v1/users/${this.userForm.id}`, {
            method: "PUT",
            body: JSON.stringify(updateData),
          });
          this.showToast("Berhasil", "User berhasil diupdate");
        } else {
          if (!this.userForm.password) {
            this.formError = "Password wajib diisi untuk user baru";
            this.formLoading = false;
            return;
          }
          await this.apiRequest("/api/v1/users", {
            method: "POST",
            body: JSON.stringify(this.userForm),
          });
          this.showToast("Berhasil", "User berhasil dibuat");
        }
        this.loadUsers();
        this.navigate("/users");
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan user";
      }

      this.formLoading = false;
    },

    formatOrderNumber(value) {
      if (value === null || value === undefined || value === "") return "-";
      if (typeof value === "number") {
        return Number.isInteger(value) ? String(value) : String(parseInt(value, 10));
      }

      const stringValue = String(value);
      if (stringValue.includes("ORD-")) {
        return stringValue;
      }

      if (/^\d+(\.0+)?$/.test(stringValue)) {
        return String(parseInt(stringValue, 10));
      }

      return stringValue;
    },

    async viewOrder(order) {
      if (!order) {
        this.selectedOrder = null;
        return;
      }

      let orderData = order;
      const needsDetail =
        !order.paket ||
        !order.kontrak ||
        !order.invoice ||
        !order.ba ||
        typeof order.paket === "string" ||
        typeof order.kontrak === "string" ||
        typeof order.invoice === "string" ||
        typeof order.ba === "string";

      if (order.id && needsDetail) {
        try {
          orderData = await this.apiRequest(`/api/v1/orders/${order.id}`);
        } catch (error) {
          this.showToast("Error", error.message || "Gagal memuat detail order", "error");
        }
      }

      this.selectedOrder = this.ensureOrderExtras(orderData || {});
      this.orderDetailTab = "paket";
      this.showOrderModal = true;
    },

    setOrderDetailTab(tab) {
      this.orderDetailTab = tab;
    },

    setOrderTab(tab) {
      this.orderTab = tab;
    },

    openDownloadAllModal() {
      if (this.downloadAllLoading) return;
      this.showDownloadAllModal = true;
    },

    async confirmDownloadAll() {
      if (this.downloadAllLoading) return;
      this.showDownloadAllModal = false;
      this.downloadAllLoading = true;
      try {
        await this.downloadAllOrdersExcel();
      } finally {
        this.downloadAllLoading = false;
      }
    },

    getXlsx() {
      if (typeof XLSX === "undefined") {
        this.showToast("Error", "Library Excel belum tersedia", "error");
        return null;
      }
      return XLSX;
    },

    normalizePaket(paket) {
      if (typeof paket === "string") {
        try {
          paket = JSON.parse(paket);
        } catch (error) {
          const trimmedValue = paket.trim();
          return {
            id_paket: trimmedValue,
            no_surat_pesanan: trimmedValue,
          };
        }
      }

      const parsed = this.parseJsonValue(paket, {});
      const rawId = parsed?.id_paket ?? "";
      const rawSurat = parsed?.no_surat_pesanan ?? "";
      const id_paket = rawId || rawSurat || "";
      const no_surat_pesanan = rawSurat || rawId || "";

      return { id_paket, no_surat_pesanan };
    },

    ensureOrderExtras(order = {}) {
      const paket = this.normalizePaket(order.paket);
      const kontrak = this.parseJsonValue(order.kontrak, []);
      const invoice = this.parseJsonValue(order.invoice, []);
      const ba = this.parseJsonValue(order.ba, []);

      return {
        ...order,
        paket,
        kontrak: Array.isArray(kontrak) ? kontrak : [],
        invoice: Array.isArray(invoice) ? invoice : [],
        ba: Array.isArray(ba) ? ba : [],
        drive_link: order.drive_link || "",
      };
    },

    parseJsonValue(value, fallback) {
      if (value === null || value === undefined || value === "") return fallback;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return parsed ?? fallback;
        } catch (error) {
          return fallback;
        }
      }
      return value;
    },

    normalizeOrderForExport(order) {
      const paket = this.parseJsonValue(order?.paket, {
        id_paket: "",
        no_surat_pesanan: "",
      });
      const kontrak = this.parseJsonValue(order?.kontrak, []);
      const invoice = this.parseJsonValue(order?.invoice, []);
      const ba = this.parseJsonValue(order?.ba, []);

      return {
        ...order,
        paket,
        kontrak: Array.isArray(kontrak) ? kontrak : [],
        invoice: Array.isArray(invoice) ? invoice : [],
        ba: Array.isArray(ba) ? ba : [],
      };
    },

    buildOrderWorkbook(orders) {
      const xlsx = this.getXlsx();
      if (!xlsx) return null;

      const workbook = xlsx.utils.book_new();
      const orderRows = orders.map((order) => ({
        "No. Order": this.formatOrderNumber(order.order_number),
        Tanggal: order.order_date || "",
        "Nama Belanja": order.shopping_name || "",
        Subkegiatan: order.subkegiatan_name || "",
        PPK: order.subkegiatan_ppk || "",
        Vendor: order.vendor_name || "",
        "NPWP Vendor": order.vendor_npwp || "",
        "ID Paket": order.paket?.id_paket || "",
        "No Surat Pesanan": order.paket?.no_surat_pesanan || "",
        "No Kontrak": order.contract_number || "",
        "Nilai Kontrak": order.contract_value || 0,
        Status: order.status || "",
        Catatan: order.notes || "",
        "Drive Link": order.drive_link || "",
        Dibuat: order.created_at || "",
        Diperbarui: order.updated_at || "",
      }));

      const orderSheet = xlsx.utils.json_to_sheet(orderRows);
      xlsx.utils.book_append_sheet(workbook, orderSheet, "Orders");

      const kontrakRows = [];
      const invoiceRows = [];
      const baRows = [];

      orders.forEach((order) => {
        const orderNumber = this.formatOrderNumber(order.order_number);
        order.kontrak.forEach((item, index) => {
          kontrakRows.push({
            "No. Order": orderNumber,
            "Nama Belanja": order.shopping_name || "",
            No: item.no || index + 1,
            "Kode Kontrak": item.kode_kontrak || "",
            "Kode Bidang": item.kode_bidang || "",
            Bulan: item.bulan || "",
            Tahun: item.tahun || "",
            Tanggal: item.tgl || "",
            "Nilai Kwitansi": item.nilai_kwitansi || 0,
          });
        });

        order.invoice.forEach((item, index) => {
          invoiceRows.push({
            "No. Order": orderNumber,
            "Nama Belanja": order.shopping_name || "",
            No: item.no || index + 1,
            "Tanggal Invoice": item.tgl || "",
            "Nilai Invoice": item.nilai_invoice || 0,
          });
        });

        order.ba.forEach((item, index) => {
          baRows.push({
            "No. Order": orderNumber,
            "Nama Belanja": order.shopping_name || "",
            No: item.no || index + 1,
            "Kode BA": item.kode_ba || "",
            "Kode Bidang": item.kode_bidang || "",
            Bulan: item.bulan || "",
            Tahun: item.tahun || "",
            Tanggal: item.tgl || "",
            Nilai: item.nilai || 0,
          });
        });
      });

      if (kontrakRows.length > 0) {
        const kontrakSheet = xlsx.utils.json_to_sheet(kontrakRows);
        xlsx.utils.book_append_sheet(workbook, kontrakSheet, "Kontrak");
      }

      if (invoiceRows.length > 0) {
        const invoiceSheet = xlsx.utils.json_to_sheet(invoiceRows);
        xlsx.utils.book_append_sheet(workbook, invoiceSheet, "Invoice");
      }

      if (baRows.length > 0) {
        const baSheet = xlsx.utils.json_to_sheet(baRows);
        xlsx.utils.book_append_sheet(workbook, baSheet, "BA");
      }

      return workbook;
    },

    downloadWorkbook(workbook, filename) {
      const xlsx = this.getXlsx();
      if (!xlsx || !workbook) return;
      xlsx.writeFile(workbook, filename, { compression: true });
    },

    async fetchAllOrdersForExport() {
      if (!this.isAuthenticated) return [];

      const collected = [];
      let page = 1;
      let totalPages = 1;
      const limit = 100;

      try {
        do {
          let url = `/api/v1/orders?page=${page}&limit=${limit}`;
          if (this.orderSearch) {
            url += `&search=${encodeURIComponent(this.orderSearch)}`;
          }
          if (this.orderStatusFilter) {
            url += `&status=${encodeURIComponent(this.orderStatusFilter)}`;
          }
          if (this.orderSortBy) {
            url += `&sort=${encodeURIComponent(this.orderSortBy)}&dir=${encodeURIComponent(this.orderSortDir)}`;
          }

          const data = await this.apiRequest(url);
          collected.push(...(data.data || []));
          totalPages = data.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
      } catch (error) {
        this.showToast("Error", error.message || "Gagal mengambil data order", "error");
        return [];
      }

      return collected;
    },

    async downloadOrderExcel(order) {
      if (!order) {
        this.showToast("Error", "Order tidak ditemukan", "error");
        return;
      }

      let orderData = order;
      const needsDetail =
        !order.paket ||
        !order.kontrak ||
        !order.invoice ||
        !order.ba ||
        typeof order.paket === "string" ||
        typeof order.kontrak === "string" ||
        typeof order.invoice === "string" ||
        typeof order.ba === "string";

      if (order.id && needsDetail) {
        try {
          orderData = await this.apiRequest(`/api/v1/orders/${order.id}`);
        } catch (error) {
          console.error("Gagal mengambil detail order:", error);
        }
      }

      const normalized = this.normalizeOrderForExport(orderData);
      const workbook = this.buildOrderWorkbook([normalized]);
      if (!workbook) return;

      const orderNumber = this.formatOrderNumber(normalized.order_number || normalized.id);
      const filename = `order-${orderNumber || "detail"}.xlsx`;
      this.downloadWorkbook(workbook, filename);
      this.showToast("Berhasil", "Excel berhasil diunduh");
    },

    async downloadAllOrdersExcel() {
      const orders = await this.fetchAllOrdersForExport();
      if (!orders.length) {
        this.showToast("Info", "Tidak ada order untuk diunduh", "error");
        return;
      }

      const normalizedOrders = orders.map((order) => this.normalizeOrderForExport(order));
      const workbook = this.buildOrderWorkbook(normalizedOrders);
      if (!workbook) return;

      const dateStamp = new Date().toISOString().split("T")[0];
      this.downloadWorkbook(workbook, `orders-${dateStamp}.xlsx`);
      this.showToast("Berhasil", "Semua order berhasil diunduh");
    },


    formatCurrency(value) {
      if (!value) return "Rp 0";
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(value);
    },

    formatDate(dateStr) {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },

    formatDateTime(dateStr) {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      // Format: "12 Januari 2026 09.07 WIB"
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB";
    },

    formatNumber(value) {
      if (!value && value !== 0) return "";
      return new Intl.NumberFormat("id-ID").format(value);
    },

    parseNumber(str) {
      if (!str) return 0;
      return parseInt(str.replace(/\./g, "").replace(/,/g, ""), 10) || 0;
    },

    sortBy(column) {
      if (this.orderSortBy === column) {
        // Toggle direction
        this.orderSortDir = this.orderSortDir === "asc" ? "desc" : "asc";
      } else {
        this.orderSortBy = column;
        this.orderSortDir = "desc"; // Default to DESC for new column
      }
      this.loadOrders();
    },

    getSortIcon(column) {
      if (this.orderSortBy !== column) {
        return `<svg class="w-4 h-4 inline-block ml-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>`;
      }
      if (this.orderSortDir === "asc") {
        return `<svg class="w-4 h-4 inline-block ml-1 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>`;
      }
      return `<svg class="w-4 h-4 inline-block ml-1 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`;
    },

    getNextOrderNumber() {
      if (!this.orders || this.orders.length === 0) {
        return 1;
      }

      let maxNum = 0;
      let hasSequentialData = false;

      this.orders.forEach((order) => {
        if (!order?.order_number) return;
        let parsedNumber = null;

        if (typeof order.order_number === "number") {
          parsedNumber = order.order_number;
        } else {
          const value = String(order.order_number);
          if (value.includes("ORD-")) {
            const parts = value.split("-");
            const numPart = parts[parts.length - 1];
            parsedNumber = parseInt(numPart, 10);
          } else {
            parsedNumber = parseInt(value, 10);
          }
        }

        if (!Number.isNaN(parsedNumber) && parsedNumber > 0) {
          hasSequentialData = true;
          if (parsedNumber > maxNum) maxNum = parsedNumber;
        }
      });

      if (!hasSequentialData) {
        maxNum = 0;
      }

      return maxNum + 1;
    },


    updateContractValue(value) {
      this.contractValueDisplay = this.formatNumber(value);
      this.orderForm.contract_value = value;
    },

    showToast(title, message = "", type = "success") {
      this.toast = { show: true, title, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    },

    $watch: {
      currentPage(value) {
        console.log("$watch.currentPage triggered:", value);
        // Load data for list pages
        if (value === "/") {
          this.loadDashboard();
        } else if (value === "/orders") {
          this.loadOrders();
        } else if (value === "/orders/new") {
          // Reset form immediately before loading orders
          console.log("Navigating to /orders/new - resetting form first");
          this.initOrderForm();
          // Force DOM update by clearing form fields directly
          this.forceFormReset();
          this.loadOrders();
          this.loadBidangs();
        } else if (value.startsWith("/orders/") && !value.includes("/new")) {
          // Edit order page - fetch order directly
          const id = value.split("/")[2];
          this.loadBidangs();
          this.loadOrders().then(() => {
            const order = this.orders.find((o) => o.id == id || o.id === String(id));
            if (order) {
              this.initOrderForm(order);
            } else {
              // Try to fetch directly from API
              this.apiRequest("/api/v1/orders/" + id)
                .then(orderData => this.initOrderForm(orderData))
                .catch(() => this.initOrderForm({ id: id }));
            }
          });
        } else if (value === "/vendors") {
          if (this.isAdmin) {
            this.loadVendors();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/vendors/new") {
          if (this.isAdmin) {
            this.loadVendors();
            this.initVendorForm();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value.startsWith("/vendors/") && !value.includes("/new")) {
          if (this.isAdmin) {
            const id = value.split("/")[2];
            this.loadVendors().then(() => {
              const vendor = this.vendors.find((v) => v.id == id || v.id === String(id));
              if (vendor) {
                this.initVendorForm(vendor);
              } else {
                this.apiRequest("/api/v1/vendors/" + id)
                  .then(vendorData => this.initVendorForm(vendorData))
                  .catch(() => this.initVendorForm({ id: id }));
              }
            });
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/users") {
          if (this.isAdmin) {
            this.loadUsers();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/users/new") {
          if (this.isAdmin) {
            this.loadUsers();
            this.initUserForm();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value.startsWith("/users/") && !value.includes("/new")) {
          if (this.isAdmin) {
            const id = value.split("/")[2];
            this.loadUsers().then(() => {
              const user = this.users.find((u) => u.id == id || u.id === String(id));
              if (user) {
                this.initUserForm(user);
              } else {
                this.apiRequest("/api/v1/users/" + id)
                  .then(userData => this.initUserForm(userData))
                  .catch(() => this.initUserForm({ id: id }));
              }
            });
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/feedback") {
          this.loadFeedbacks();
        } else if (value === "/subkegiatan") {
          if (this.isAdmin) {
            this.loadSubkegiatans();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/subkegiatan/new") {
          if (this.isAdmin) {
            this.loadSubkegiatans();
            this.initSubkegiatanForm();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value.startsWith("/subkegiatan/") && !value.includes("/new")) {
          if (this.isAdmin) {
            const id = value.split("/")[2];
            this.loadSubkegiatans().then(() => {
              const subkegiatan = this.subkegiatans.find((s) => s.id == id || s.id === String(id));
              if (subkegiatan) {
                this.initSubkegiatanForm(subkegiatan);
              } else {
                this.apiRequest("/api/v1/subkegiatan/" + id)
                  .then(subkegiatanData => this.initSubkegiatanForm(subkegiatanData))
                  .catch(() => this.initSubkegiatanForm({ id: id }));
              }
            });
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/bidang") {
          if (this.isAdmin) {
            this.loadBidangs();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value === "/bidang/new") {
          if (this.isAdmin) {
            this.loadBidangs();
            this.initBidangForm();
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        } else if (value.startsWith("/bidang/") && !value.includes("/new")) {
          if (this.isAdmin) {
            const id = value.split("/")[2];
            this.loadBidangs().then(() => {
              const bidang = this.bidangs.find((item) => item.id == id || item.id === String(id));
              if (bidang) {
                this.initBidangForm(bidang);
              } else {
                this.apiRequest("/api/v1/bidang/" + id)
                  .then(bidangData => this.initBidangForm(bidangData))
                  .catch(() => this.initBidangForm({ id: id }));
              }
            });
          } else {
            this.showToast("Akses ditolak", "Halaman ini hanya untuk admin", "error");
            this.navigate("/orders");
          }
        }

      },
    },

    forceFormReset() {
      // Force reset all form fields in DOM and Alpine data
      setTimeout(() => {
        const appElement = document.querySelector('[x-data]');
        if (appElement && appElement._x_dataStack) {
          const data = appElement._x_dataStack[0];
          
          // Create completely new orderForm object
          let maxNum = 0;
          let hasSequentialData = false;

          data.orders.forEach((order) => {
            if (!order?.order_number) return;
            let parsedNumber = null;

            if (typeof order.order_number === "number") {
              parsedNumber = order.order_number;
            } else {
              const value = String(order.order_number);
              if (value.includes("ORD-")) {
                const parts = value.split("-");
                const numPart = parts[parts.length - 1];
                parsedNumber = parseInt(numPart, 10);
              } else {
                parsedNumber = parseInt(value, 10);
              }
            }

            if (!Number.isNaN(parsedNumber) && parsedNumber > 0) {
              hasSequentialData = true;
              if (parsedNumber > maxNum) maxNum = parsedNumber;
            }
          });

          if (!hasSequentialData) {
            maxNum = 0;
          }

          const nextOrderNumber = maxNum + 1;

          // Replace the entire orderForm object
          data.orderForm = {
            order_number: nextOrderNumber,

            order_date: new Date().toISOString().split("T")[0],
            shopping_name: "",
            contract_number: "",
            vendor_id: null,
            contract_value: 0,
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
            subkegiatan_id: null,
          };
          
          data.vendorSearchInput = "";
          data.selectedVendor = null;
          data.filteredVendors = [];
          data.showVendorDropdown = false;
          data.subkegiatanSearchInput = "";
          data.selectedSubkegiatan = null;
          data.filteredSubkegiatans = [];
          data.showSubkegiatanDropdown = false;
          data.formError = "";
          
          // Force Alpine to recognize the change by replacing the object reference
          Alpine.effect(() => {
            data.orderForm;
          });
        }
        
        // Also reset DOM inputs
        const form = document.querySelector('form');
        if (form) {
          const textInputs = form.querySelectorAll('input[type="text"]');
          textInputs.forEach(input => {
            if (input.getAttribute('x-model')?.includes('orderForm') || input.getAttribute('x-model') === 'vendorSearchInput') {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          
          const numberInputs = form.querySelectorAll('input[type="number"]');
          numberInputs.forEach(input => {
            if (input.getAttribute('x-model')?.includes('orderForm')) {
              input.value = '0';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          
          const dateInput = form.querySelector('input[type="date"]');
          if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }, 100);
    },
  };
}

if (typeof Alpine !== 'undefined') {
  Alpine.data('app', app);
}
