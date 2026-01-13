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
    orderSortBy: "created_at",
    orderSortDir: "desc",
    orderPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },

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

    toast: { show: false, title: "", message: "", type: "success" },
    showOrderModal: false,
    selectedOrder: null,
    orderDetailTab: "paket",
    orderTab: "paket",
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
      };
      if (this.currentPage === "/orders/new") return "Order Baru";
      if (this.currentPage.startsWith("/orders/")) return "Edit Order";
      if (this.currentPage === "/vendors/new") return "Vendor Baru";
      if (this.currentPage.startsWith("/vendors/")) return "Edit Vendor";
      if (this.currentPage === "/users/new") return "User Baru";
      if (this.currentPage.startsWith("/users/")) return "Edit User";
      if (this.currentPage === "/subkegiatan/new") return "Subkegiatan Baru";
      if (this.currentPage.startsWith("/subkegiatan/")) return "Edit Subkegiatan";
      return titles[this.currentPage] || "Dashboard";
    },

    get pageSubtitle() {
      const subtitles = {
        "/orders": "Kelola semua order pengadaan",
        "/vendors": "Kelola data vendor/penyedia",
        "/users": "Kelola data user",
        "/subkegiatan": "Kelola data subkegiatan dan PPK",
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
      window.addEventListener("hashchange", () => this.handleHashChange());
      console.log("Hash change listener added");
      this.handleHashChange();
    },

    handleHashChange() {
      const hash = window.location.hash.slice(1) || "/";
      console.log("handleHashChange called, hash:", hash);
      this.currentPage = hash;
      // Data loading is handled by $watch
    },

    navigate(path) {
      console.log("navigate to:", path);
      
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
        return;
      }

      if (!this.token) {
        console.log('No token available');
        return;
      }

      try {
        const result = await this.apiRequest("/api/v1/auth/me");
        console.log('Auth verification successful:', result);
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
    },

    loadPageData() {
      if (!this.isAuthenticated) return;
      if (this.isAuthenticated) {
        this.loadDashboard();
        this.loadOrders();
        this.loadVendors();
        this.loadUsers();
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
      } catch (error) {
        this.orders = [];
        this.orderPagination = {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        };
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

    async confirmDelete() {
      if (this.deleteModalType === 'order') {
        await this.executeDeleteOrder(this.deleteModalId);
      } else if (this.deleteModalType === 'vendor') {
        await this.executeDeleteVendor(this.deleteModalId);
      } else if (this.deleteModalType === 'user') {
        await this.executeDeleteUser(this.deleteModalId);
      }
      this.showDeleteModal = false;
      this.deleteModalType = "";
      this.deleteModalId = null;
      this.deleteModalMessage = "";
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
        };
        this.orderForm = newOrderForm;
        this.vendorSearchInput = "";
        this.selectedVendor = null;
        this.filteredVendors = [];
        this.showVendorDropdown = false;
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
        
        console.log("NEW MODE: form reset to:", this.orderForm);
        return;
      }
      
      // Edit mode - populate with order data
      this.isEditOrder = true;
      this.orderForm = { ...order };
      this.vendorSearchInput = order.vendor_name || "";
      this.selectedVendor = {
        id: order.vendor_id,
        name: order.vendor_name,
        npwp: order.vendor_npwp,
      };
      this.filteredVendors = [];
      this.showVendorDropdown = false;
      this.formError = "";
      this.contractValueDisplay = this.formatNumber(order.contract_value || 0);
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

    async saveOrder() {
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

      try {
        if (this.isEditOrder) {
          await this.apiRequest(`/api/v1/orders/${this.orderForm.id}`, {
            method: "PUT",
            body: JSON.stringify(this.orderForm),
          });
          this.showToast("Berhasil", "Order berhasil diupdate");
        } else {
          await this.apiRequest("/api/v1/orders", {
            method: "POST",
            body: JSON.stringify(this.orderForm),
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
            body: JSON.stringify(this.subkegitanForm),
          });
          this.showToast("Berhasil", "Subk berhasil dibuat");
        }
        this.loadSubkegiatans();
        this.navigate("/subkegitan");
      } catch (error) {
        this.formError = error.message || "Gagal menyimpan subkegitan";
      }

      this.formLoading = false;
    },

    async confirmDelete() {
      if (this.deleteModalType === 'subkegitan') {
        try {
          await this.apiRequest(`/api/v1/subkegitan/${this.deleteModalId}`, {
            method: "DELETE",
          });
          this.showToast("Berhasil", "Subk berhasil dihapus");
          this.loadSubkegiatans();
        } catch (error) {
          this.showToast("Error", error.message || "Gagal menghapus subkegitan", "error");
        }
      } else if (this.deleteModalType === 'subkegitan') {
        try {
          await this.apiRequest(`/api/v1/subkegitan/${this.deleteModalId}`, {
            method: "DELETE",
          });
          this.showToast("Berhasil", "Subk berhasil dihapus");
          this.loadSubkegiatans();
        } catch (error) {
          this.showToast("Error", error.message || "Gagal menghapus subkegitan", "error");
        }
      }
      this.showDeleteModal = false;
      this.deleteModalType = "";
      this.deleteModalId = null;
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
        this.users = data.data || [];
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
      return String(value);
    },

    viewOrder(order) {
      this.selectedOrder = order || null;
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

    async downloadOrderExcel(order) {
      if (!order) {
        this.showToast("Error", "Order tidak ditemukan", "error");
        return;
      }
      this.showToast("Info", "Fitur download Excel belum tersedia", "error");
    },

    async downloadAllOrdersExcel() {
      this.showToast("Info", "Fitur download Excel belum tersedia", "error");
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
      const year = new Date().getFullYear();
      
      // Jika tidak ada order, mulai dari 0001
      if (!this.orders || this.orders.length === 0) {
        return `ORD-${year}-0001`;
      }
      
      // Extract semua nomor urut dari order yang ada
      let maxNum = 0;
      let hasSequentialData = false;
      
      this.orders.forEach(order => {
        if (order.order_number && order.order_number.includes('ORD-')) {
          const parts = order.order_number.split('-');
          if (parts.length >= 3) {
            const numPart = parts[parts.length - 1];
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > 0) {
              // Cek apakah ini data sequential (tidak random)
              if (num <= 9999 && num >= 1) {
                hasSequentialData = true;
                if (num > maxNum) maxNum = num;
              }
            }
          }
        }
      });
      
      // Jika tidak ada data sequential, mulai dari 0001
      if (!hasSequentialData) {
        maxNum = 0;
      }
      
      const nextNum = maxNum + 1;
      return `ORD-${year}-${String(nextNum).padStart(4, '0')}`;
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
        } else if (value.startsWith("/orders/") && !value.includes("/new")) {
          // Edit order page - fetch order directly
          const id = value.split("/")[2];
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
          this.loadVendors();
        } else if (value === "/vendors/new") {
          this.loadVendors();
          this.initVendorForm();
        } else if (value.startsWith("/vendors/") && !value.includes("/new")) {
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
        } else if (value === "/users") {
          this.loadUsers();
        } else if (value === "/users/new") {
          this.loadUsers();
          this.initUserForm();
        } else if (value.startsWith("/users/") && !value.includes("/new")) {
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
        } else if (value === "/subkegitan") {
          this.loadSubkegiatans();
        } else if (value === "/subkegitan/new") {
          this.loadSubkegiatans();
          this.initSubkegitanForm();
        } else if (value.startsWith("/subkegitan/") && !value.includes("/new")) {
          const id = value.split("/")[2];
          this.loadSubkegiatans().then(() => {
            const subkegitan = this.subkegiatans.find((s) => s.id == id || s.id === String(id));
            if (subkegitan) {
              this.initSubkegitanForm(subkegitan);
            } else {
              this.apiRequest("/api/v1/subkegitan/" + id)
                .then(subkegitanData => this.initSubkegitanForm(subkegitanData))
                .catch(() => this.initSubkegitanForm({ id: id }));
            }
          });
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
          const year = new Date().getFullYear();
          
          // Deteksi sequential vs random order numbers
          let maxNum = 0;
          let hasSequentialData = false;
          
          data.orders.forEach(o => {
            if (o.order_number && o.order_number.includes('ORD-')) {
              const parts = o.order_number.split('-');
              if (parts.length >= 3) {
                const numPart = parts[parts.length - 1];
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > 0) {
                  if (num <= 9999 && num >= 1) {
                    hasSequentialData = true;
                    if (num > maxNum) maxNum = num;
                  }
                }
              }
            }
          });
          
          // Jika tidak ada data sequential, mulai dari 0001
          if (!hasSequentialData) {
            maxNum = 0;
          }
          
          const nextNum = maxNum + 1;
          const nextOrderNumber = `ORD-${year}-${String(nextNum).padStart(4, '0')}`;
          
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
          };
          
          data.vendorSearchInput = "";
          data.selectedVendor = null;
          data.filteredVendors = [];
          data.showVendorDropdown = false;
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
