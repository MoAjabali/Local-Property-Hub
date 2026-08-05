export const formatCurrency = (amount: number, symbol: string = 'ر.س'): string => {
  const formatted = Math.abs(amount).toLocaleString('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
};

export const formatDate = (date: string): string => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return date;
  }
};

export const formatMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const formatMonthDisplay = (month: string): string => {
  if (!month) return '';
  const [year, m] = month.split('-');
  const d = new Date(parseInt(year), parseInt(m) - 1, 1);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

export const generateReceiptNumber = (count: number): string => {
  return `RCP-${String(count).padStart(4, '0')}`;
};

export const getUnitStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    vacant: 'شاغرة',
    rented: 'مؤجرة',
    under_maintenance: 'قيد الصيانة',
    after_exit: 'بعد الخروج',
  };
  return labels[status] || status;
};

export const getUnitStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    vacant: '#10B981',
    rented: '#3B82F6',
    under_maintenance: '#F59E0B',
    after_exit: '#6B7280',
  };
  return map[status] || '#6B7280';
};

export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'نقداً',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
  };
  return labels[method] || method;
};

export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getFirstDayOfMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export const getLastDayOfMonth = (): string => {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
};
