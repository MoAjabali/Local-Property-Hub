export type UnitStatus = 'vacant' | 'rented' | 'under_maintenance' | 'after_exit';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque';
export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

export interface Building {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number;
}

export interface Unit {
  id: string;
  floorId: string;
  unitNumber: string;
  status: UnitStatus;
  notes?: string;
}

export interface Tenant {
  id: string;
  fullName: string;
  phone?: string;
  idDocument?: string;
  notes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  unitId: string;
  monthlyRent: number;
  currencyId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  depositAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface RentTransaction {
  id: string;
  contractId: string;
  month: string;
  amountDue: number;
  equivalentBaseDue: number;
  isAddedAutomatically: boolean;
  createdAt: string;
  notes?: string;
}

export interface Payment {
  id: string;
  contractId: string;
  amountPaid: number;
  currencyId: string;
  exchangeRateId?: string;
  equivalentBaseAmount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  notes?: string;
}

export interface MaintenanceExpense {
  id: string;
  unitId?: string;
  buildingId?: string;
  description: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

export interface ExchangeRate {
  id: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  date: string;
}

export interface AppSettings {
  ownerName: string;
  defaultCurrencyId: string;
  backupFrequency: BackupFrequency;
  lastBackupDate?: string;
}

export interface PLReport {
  totalDue: number;
  totalCollected: number;
  arrears: number;
  collectionRate: number;
  maintenanceCosts: number;
  netProfit: number;
}

export interface StatementRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'rent' | 'payment';
}

export interface ContractBalance {
  totalDue: number;
  totalPaid: number;
  balance: number;
}
