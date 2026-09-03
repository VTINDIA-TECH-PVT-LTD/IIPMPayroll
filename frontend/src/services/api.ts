import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3330/api' 
  : 'http://100.28.238.125:3330/api';

interface AuthToken {
  token: string;
  refreshToken: string;
  userId: string;
  role: string;
  username?: string;
}

class ApiService {
  public api: AxiosInstance;
  private token: string | null = null;
  private userId: string | null = null;
  private role: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    const stored = localStorage.getItem('authToken');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.token = parsed.token;
        this.userId = parsed.userId;
        this.role = parsed.role;
      } catch { localStorage.removeItem('authToken'); }
    }

    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
        config.headers['X-User-Id'] = this.userId;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('authToken');
          const prefix = window.location.pathname.startsWith('/IIPEPayroll')
            ? '/IIPEPayroll'
            : (window.location.pathname.startsWith('/IIPE') ? '/IIPE' : '/IIPMPayroll');
          if (!window.location.pathname.endsWith('/login')) {
            window.location.href = prefix + '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ============ AUTH ============
  async login(username: string, password: string): Promise<AuthToken> {
    const response = await this.api.post('/auth/login', { username, password });
    const data = response.data.data;
    this.token = data.token;
    this.userId = data.userId;
    this.role = data.role;
    localStorage.setItem('authToken', JSON.stringify(data));
    return data;
  }

  async logout(): Promise<void> {
    try { if (this.token) await this.api.post('/auth/logout'); } catch { /* ignore */ }
    this.token = null; this.userId = null; this.role = null;
    localStorage.removeItem('authToken');
  }

  async refreshToken(): Promise<AuthToken> {
    const response = await this.api.post('/auth/refresh-token');
    const data = response.data.data;
    this.token = data.token;
    localStorage.setItem('authToken', JSON.stringify(data));
    return data;
  }

  // ============ USERS ============
  async createUser(userData: any): Promise<any> { return (await this.api.post('/users', userData)).data.data; }
  async getAllUsers(): Promise<any[]> { return (await this.api.get('/users')).data.data; }
  async getUserById(id: string): Promise<any> { return (await this.api.get(`/users/${id}`)).data.data; }
  async updateUser(id: string, userData: any): Promise<any> { return (await this.api.put(`/users/${id}`, userData)).data.data; }
  async deleteUser(id: string): Promise<void> { await this.api.delete(`/users/${id}`); }

  // ============ PAYROLL ============
  async createPayroll(payrollData: any): Promise<any> { return (await this.api.post('/payroll', payrollData)).data.data; }
  async createBulkPayroll(bulkData: any): Promise<any> { return (await this.api.post('/payroll/bulk', bulkData)).data.data; }
  async getPayrollById(id: string): Promise<any> { return (await this.api.get(`/payroll/${id}`)).data.data; }
  async getPayrollsByUser(userId: string): Promise<any[]> { return (await this.api.get(`/payroll/user/${userId}`)).data.data; }
  async getPayrollsByMonth(month: number, year: number): Promise<any[]> { return (await this.api.get(`/payroll/month/${month}/year/${year}`)).data.data; }
  async getPayrollsByStatus(status: string): Promise<any[]> { return (await this.api.get(`/payroll/status/${status}`)).data.data; }
  async getPayrollsByYear(userId: string, year: number): Promise<any[]> { return (await this.api.get(`/payroll/user/${userId}/year/${year}`)).data.data; }
  async approvePayroll(id: string): Promise<any> { return (await this.api.put(`/payroll/${id}/approve`, {})).data.data; }
  async rejectPayroll(id: string, reason: string): Promise<any> { return (await this.api.put(`/payroll/${id}/reject`, { reason })).data.data; }
  async lockPayroll(id: string): Promise<any> { return (await this.api.put(`/payroll/${id}/lock`, {})).data.data; }
  async getTdsProjection(userId: string, year: number): Promise<any> { return (await this.api.get(`/payroll/tds-projection/${userId}/${year}`)).data.data; }
  async getAllTdsProjections(year: number): Promise<any[]> { return (await this.api.get(`/payroll/tds-projections/${year}`)).data.data; }

  // ============ REPORTS ============
  async getSalaryRegister(month: number, year: number): Promise<any> { return (await this.api.get(`/reports/salary-register/${month}/${year}`)).data.data; }
  async getNPSReport(year: number): Promise<any> { return (await this.api.get(`/reports/nps/${year}`)).data.data; }
  async getTDSReport(year: number): Promise<any> { return (await this.api.get(`/reports/tds/${year}`)).data.data; }
  async getYTDReport(userId: string = 'all', year?: number): Promise<any> { 
    const url = year ? `/reports/ytd/${userId}?year=${year}` : `/reports/ytd/${userId}`;
    return (await this.api.get(url)).data.data; 
  }
  async getSalaryComparison(userId: string): Promise<any> { return (await this.api.get(`/reports/comparison/${userId}`)).data.data; }
  async getMonthlyTrend(userId: string, year: number): Promise<any> { return (await this.api.get(`/reports/trend/${userId}/${year}`)).data.data; }
  async getDepartmentReport(month: number, year: number): Promise<any> { return (await this.api.get(`/reports/department/${month}/${year}`)).data.data; }
  async getPayrollStatistics(year: number): Promise<any> { return (await this.api.get(`/reports/statistics/${year}`)).data.data; }

  // ============ SETTINGS ============
  async getAllSettings(): Promise<any[]> { return (await this.api.get('/settings')).data.data; }
  async getSettingByKey(key: string): Promise<any> { return (await this.api.get(`/settings/${key}`)).data.data; }
  async updateSetting(key: string, value: string): Promise<any> { return (await this.api.put(`/settings/${key}`, { value })).data.data; }
  async getAllPayrollSettings(): Promise<any> { return (await this.api.get('/settings/payroll/all')).data.data; }

  // ============ ARREARS ============
  async createDAArear(arrearData: any): Promise<any> { return (await this.api.post('/arrears/da', arrearData)).data.data; }
  async createPromotionArear(arrearData: any): Promise<any> { return (await this.api.post('/arrears/promotion', arrearData)).data.data; }
  async getArrearsByUser(userId: string): Promise<any[]> { return (await this.api.get(`/arrears/user/${userId}`)).data.data; }
  async getPendingArrears(): Promise<any[]> { return (await this.api.get('/arrears/pending')).data.data; }
  async getAllArrears(): Promise<any[]> { return (await this.api.get('/arrears')).data.data; }
  async approveArrear(id: string): Promise<any> { return (await this.api.put(`/arrears/${id}/approve`, {})).data.data; }
  async rejectArrear(id: string, reason: string): Promise<any> { return (await this.api.put(`/arrears/${id}/reject`, { reason })).data.data; }
  async markArrearAsPaid(id: string): Promise<any> { return (await this.api.put(`/arrears/${id}/paid`, {})).data.data; }

  // ============ NOTIFICATIONS ============
  async getNotifications(userId: string): Promise<any[]> { return (await this.api.get(`/notifications/${userId}`)).data; }
  async markNotificationRead(id: string): Promise<any> { return (await this.api.put(`/notifications/${id}/read`, {})).data; }
  async markAllNotificationsRead(userId: string): Promise<any> { return (await this.api.put(`/notifications/mark-all-read/${userId}`, {})).data; }
  async dismissNotification(id: string): Promise<any> { return (await this.api.delete(`/notifications/${id}`)).data; }
  async clearAllNotifications(userId: string): Promise<any> { return (await this.api.delete(`/notifications/clear-all/${userId}`)).data; }

  // ============ UTILS ============
  isAuthenticated(): boolean { return this.token !== null; }
  getRole(): string | null { return this.role; }
  getUserId(): string | null { return this.userId; }
  isSuperAdmin(): boolean { return this.role === 'SUPER_ADMIN'; }
  isFAAdmin(): boolean { return this.role === 'FA_ADMIN'; }
  isFAOperator(): boolean { return this.role === 'FA_OPERATOR'; }
  isAdminAdmin(): boolean { return this.role === 'ADMIN_ADMIN'; }
  isAdminOperator(): boolean { return this.role === 'ADMIN_OPERATOR'; }
  isEmployee(): boolean { return this.role === 'EMPLOYEE'; }

  // Legacy fallback or grouped access logic if needed
  isAdmin(): boolean { return this.role === 'SUPER_ADMIN' || this.role === 'ADMIN_ADMIN' || this.role === 'FA_ADMIN'; }
  isPayrollOfficer(): boolean { return this.role === 'FA_OPERATOR'; }

  async getItDeclarations(userId: string): Promise<any> { return (await this.api.get(`/it-declarations/${userId}`)).data; }
  async getItDeclaration(userId: string, year: string): Promise<any> { return (await this.api.get(`/it-declarations/year/${userId}/${year}`)).data; }
  async saveItDeclaration(data: any): Promise<any> { return (await this.api.post('/it-declarations', data)).data; }
  async updateItDeclarationStatus(id: string, status: string, rejectionReason?: string): Promise<any> {
    return (await this.api.put(`/it-declarations/${id}/status`, { status, rejectionReason })).data;
  }
  async getForm16(userId: string, year: number): Promise<any> { return (await this.api.get(`/form16/${userId}/${year}`)).data.data; }
  async importData(type: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return (await this.api.post(`/data/import/${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  }
  async exportSalaryRegister(month: number, year: number): Promise<any> { return (await this.api.get(`/reports/salary-register/${month}/${year}/export`, { responseType: 'blob' })).data; }
  async exportApprovalSheet(month: number, year: number): Promise<any> { return (await this.api.get(`/payroll/export-approval-sheet?month=${month}&year=${year}`, { responseType: 'blob' })).data; }
}

export default new ApiService();
