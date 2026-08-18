import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Building, Floor, Unit, Tenant, Contract, RentTransaction,
  Payment, MaintenanceExpense, Currency, ExchangeRate, AppSettings,
  PLReport, StatementRow, ContractBalance,
} from '@/types';
import { loadList, saveList, loadObject, saveObject, STORAGE_KEYS } from '@/utils/storage';
import { generateId, generateReceiptNumber, formatMonth } from '@/utils/formatters';

const DEFAULT_CURRENCY_ID = 'sar-001';
const DEFAULT_CURRENCY: Currency = {
  id: DEFAULT_CURRENCY_ID, code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', isBase: true,
};
const DEFAULT_SETTINGS: AppSettings = {
  ownerName: 'المالك', defaultCurrencyId: DEFAULT_CURRENCY_ID, backupFrequency: 'monthly',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankSwift: '',
  whatsappNumber: '',
};

interface AppContextType {
  buildings: Building[]; floors: Floor[]; units: Unit[]; tenants: Tenant[];
  contracts: Contract[]; rentTransactions: RentTransaction[]; payments: Payment[];
  maintenanceExpenses: MaintenanceExpense[]; currencies: Currency[];
  exchangeRates: ExchangeRate[]; settings: AppSettings; isLoading: boolean;
  addBuilding: (d: Omit<Building, 'id' | 'createdAt'>) => Promise<Building>;
  updateBuilding: (id: string, d: Partial<Building>) => Promise<void>;
  deleteBuilding: (id: string) => Promise<void>;
  addFloor: (d: Omit<Floor, 'id'>) => Promise<Floor>;
  deleteFloor: (id: string) => Promise<void>;
  addUnit: (d: Omit<Unit, 'id'>) => Promise<Unit>;
  updateUnit: (id: string, d: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  addTenant: (d: Omit<Tenant, 'id' | 'createdAt'>) => Promise<Tenant>;
  updateTenant: (id: string, d: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  addContract: (d: Omit<Contract, 'id' | 'createdAt'>) => Promise<Contract>;
  endContract: (id: string) => Promise<void>;
  addPayment: (d: Omit<Payment, 'id' | 'receiptNumber'>) => Promise<Payment>;
  addMaintenanceExpense: (d: Omit<MaintenanceExpense, 'id'>) => Promise<MaintenanceExpense>;
  deleteMaintenanceExpense: (id: string) => Promise<void>;
  addCurrency: (d: Omit<Currency, 'id'>) => Promise<Currency>;
  setBaseCurrency: (id: string) => Promise<void>;
  addExchangeRate: (d: Omit<ExchangeRate, 'id'>) => Promise<ExchangeRate>;
  updateSettings: (d: Partial<AppSettings>) => Promise<void>;
  generateMonthlyRent: () => Promise<void>;
  getContractBalance: (contractId: string) => ContractBalance;
  getActiveContractForUnit: (unitId: string) => Contract | undefined;
  getTenantActiveContract: (tenantId: string) => Contract | undefined;
  getPLReport: (startDate: string, endDate: string) => PLReport;
  getTenantStatement: (tenantId: string) => StatementRow[];
  getOverdueAlerts: () => Array<{ contract: Contract; tenant: Tenant; unit: Unit; balance: number; buildingId: string }>;
  getBaseCurrency: () => Currency;
  getCurrencyById: (id: string) => Currency | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getTenantById: (id: string) => Tenant | undefined;
  getBuildingById: (id: string) => Building | undefined;
  getFloorById: (id: string) => Floor | undefined;
  getFloorsByBuilding: (buildingId: string) => Floor[];
  getUnitsByFloor: (floorId: string) => Unit[];
  getBuildingStats: (buildingId: string) => { total: number; rented: number; vacant: number };
  getContractsByTenant: (tenantId: string) => Contract[];
  getPaymentsByContract: (contractId: string) => Payment[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rentTransactions, setRentTransactions] = useState<RentTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<MaintenanceExpense[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([DEFAULT_CURRENCY]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const [bldgs, flrs, unts, tnts, cnts, rts, pmts, mnt, curs, ers, stgs] = await Promise.all([
          loadList<Building>(STORAGE_KEYS.BUILDINGS),
          loadList<Floor>(STORAGE_KEYS.FLOORS),
          loadList<Unit>(STORAGE_KEYS.UNITS),
          loadList<Tenant>(STORAGE_KEYS.TENANTS),
          loadList<Contract>(STORAGE_KEYS.CONTRACTS),
          loadList<RentTransaction>(STORAGE_KEYS.RENT_TRANSACTIONS),
          loadList<Payment>(STORAGE_KEYS.PAYMENTS),
          loadList<MaintenanceExpense>(STORAGE_KEYS.MAINTENANCE),
          loadList<Currency>(STORAGE_KEYS.CURRENCIES),
          loadList<ExchangeRate>(STORAGE_KEYS.EXCHANGE_RATES),
          loadObject<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
        ]);
        setBuildings(bldgs); setFloors(flrs); setUnits(unts); setTenants(tnts);
        setContracts(cnts); setRentTransactions(rts); setPayments(pmts);
        setMaintenanceExpenses(mnt); setCurrencies(curs.length > 0 ? curs : [DEFAULT_CURRENCY]);
        setExchangeRates(ers); setSettings(stgs);
        // Auto generate for current month
        const curMonth = formatMonth(new Date());
        const active = cnts.filter(c => c.isActive);
        const newRTs: RentTransaction[] = [];
        const baseCur = curs.find(c => c.isBase) || DEFAULT_CURRENCY;
        for (const contract of active) {
          const exists = rts.some(rt => rt.contractId === contract.id && rt.month === curMonth);
          if (!exists) {
            const cCur = curs.find(c => c.id === contract.currencyId);
            let equiv = contract.monthlyRent;
            if (cCur && !cCur.isBase) {
              const rate = ers.filter(r => r.fromCurrencyId === contract.currencyId && r.toCurrencyId === baseCur.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              if (rate) equiv = contract.monthlyRent * rate.rate;
            }
            newRTs.push({ id: generateId(), contractId: contract.id, month: curMonth, amountDue: contract.monthlyRent, equivalentBaseDue: equiv, isAddedAutomatically: true, createdAt: new Date().toISOString() });
          }
        }
        if (newRTs.length > 0) {
          const updated = [...rts, ...newRTs];
          setRentTransactions(updated);
          await saveList(STORAGE_KEYS.RENT_TRANSACTIONS, updated);
        }
      } finally { setIsLoading(false); }
    })();
  }, []);

  const generateMonthlyRent = async () => {
    const curMonth = formatMonth(new Date());
    const active = contracts.filter(c => c.isActive);
    const newRTs: RentTransaction[] = [];
    const baseCur = currencies.find(c => c.isBase) || DEFAULT_CURRENCY;
    for (const contract of active) {
      const exists = rentTransactions.some(rt => rt.contractId === contract.id && rt.month === curMonth);
      if (!exists) {
        const cCur = currencies.find(c => c.id === contract.currencyId);
        let equiv = contract.monthlyRent;
        if (cCur && !cCur.isBase) {
          const rate = exchangeRates.filter(r => r.fromCurrencyId === contract.currencyId && r.toCurrencyId === baseCur.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          if (rate) equiv = contract.monthlyRent * rate.rate;
        }
        newRTs.push({ id: generateId(), contractId: contract.id, month: curMonth, amountDue: contract.monthlyRent, equivalentBaseDue: equiv, isAddedAutomatically: true, createdAt: new Date().toISOString() });
      }
    }
    if (newRTs.length > 0) {
      const updated = [...rentTransactions, ...newRTs];
      setRentTransactions(updated);
      await saveList(STORAGE_KEYS.RENT_TRANSACTIONS, updated);
    }
  };

  const addBuilding = async (d: Omit<Building, 'id' | 'createdAt'>): Promise<Building> => {
    const item: Building = { ...d, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...buildings, item]; setBuildings(updated); await saveList(STORAGE_KEYS.BUILDINGS, updated); return item;
  };
  const updateBuilding = async (id: string, d: Partial<Building>) => {
    const updated = buildings.map(b => b.id === id ? { ...b, ...d } : b); setBuildings(updated); await saveList(STORAGE_KEYS.BUILDINGS, updated);
  };
  const deleteBuilding = async (id: string) => {
    const updated = buildings.filter(b => b.id !== id); setBuildings(updated); await saveList(STORAGE_KEYS.BUILDINGS, updated);
  };
  const addFloor = async (d: Omit<Floor, 'id'>): Promise<Floor> => {
    const item: Floor = { ...d, id: generateId() };
    const updated = [...floors, item]; setFloors(updated); await saveList(STORAGE_KEYS.FLOORS, updated); return item;
  };
  const deleteFloor = async (id: string) => {
    const updated = floors.filter(f => f.id !== id); setFloors(updated); await saveList(STORAGE_KEYS.FLOORS, updated);
  };
  const addUnit = async (d: Omit<Unit, 'id'>): Promise<Unit> => {
    const item: Unit = { ...d, id: generateId() };
    const updated = [...units, item]; setUnits(updated); await saveList(STORAGE_KEYS.UNITS, updated); return item;
  };
  const updateUnit = async (id: string, d: Partial<Unit>) => {
    const updated = units.map(u => u.id === id ? { ...u, ...d } : u); setUnits(updated); await saveList(STORAGE_KEYS.UNITS, updated);
  };
  const deleteUnit = async (id: string) => {
    const updated = units.filter(u => u.id !== id); setUnits(updated); await saveList(STORAGE_KEYS.UNITS, updated);
  };
  const addTenant = async (d: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> => {
    const item: Tenant = { ...d, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...tenants, item]; setTenants(updated); await saveList(STORAGE_KEYS.TENANTS, updated); return item;
  };
  const updateTenant = async (id: string, d: Partial<Tenant>) => {
    const updated = tenants.map(t => t.id === id ? { ...t, ...d } : t); setTenants(updated); await saveList(STORAGE_KEYS.TENANTS, updated);
  };
  const deleteTenant = async (id: string) => {
    const updated = tenants.filter(t => t.id !== id); setTenants(updated); await saveList(STORAGE_KEYS.TENANTS, updated);
  };
  const addContract = async (d: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract> => {
    const item: Contract = { ...d, id: generateId(), createdAt: new Date().toISOString() };
    const uContracts = [...contracts, item]; setContracts(uContracts); await saveList(STORAGE_KEYS.CONTRACTS, uContracts);
    const uUnits = units.map(u => u.id === d.unitId ? { ...u, status: 'rented' as const } : u); setUnits(uUnits); await saveList(STORAGE_KEYS.UNITS, uUnits);
    const baseCur = currencies.find(c => c.isBase) || DEFAULT_CURRENCY;
    const cCur = currencies.find(c => c.id === d.currencyId);
    let equiv = d.monthlyRent;
    if (cCur && !cCur.isBase) {
      const rate = exchangeRates.filter(r => r.fromCurrencyId === d.currencyId && r.toCurrencyId === baseCur.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (rate) equiv = d.monthlyRent * rate.rate;
    }
    const firstRT: RentTransaction = { id: generateId(), contractId: item.id, month: formatMonth(new Date(d.startDate)), amountDue: d.monthlyRent, equivalentBaseDue: equiv, isAddedAutomatically: true, createdAt: new Date().toISOString() };
    const uRTs = [...rentTransactions, firstRT]; setRentTransactions(uRTs); await saveList(STORAGE_KEYS.RENT_TRANSACTIONS, uRTs);
    return item;
  };
  const endContract = async (id: string) => {
    const contract = contracts.find(c => c.id === id); if (!contract) return;
    const uContracts = contracts.map(c => c.id === id ? { ...c, isActive: false } : c); setContracts(uContracts); await saveList(STORAGE_KEYS.CONTRACTS, uContracts);
    const uUnits = units.map(u => u.id === contract.unitId ? { ...u, status: 'after_exit' as const } : u); setUnits(uUnits); await saveList(STORAGE_KEYS.UNITS, uUnits);
  };
  const addPayment = async (d: Omit<Payment, 'id' | 'receiptNumber'>): Promise<Payment> => {
    const item: Payment = { ...d, id: generateId(), receiptNumber: generateReceiptNumber(payments.length + 1) };
    const updated = [...payments, item]; setPayments(updated); await saveList(STORAGE_KEYS.PAYMENTS, updated); return item;
  };
  const addMaintenanceExpense = async (d: Omit<MaintenanceExpense, 'id'>): Promise<MaintenanceExpense> => {
    const item: MaintenanceExpense = { ...d, id: generateId() };
    const updated = [...maintenanceExpenses, item]; setMaintenanceExpenses(updated); await saveList(STORAGE_KEYS.MAINTENANCE, updated); return item;
  };
  const deleteMaintenanceExpense = async (id: string) => {
    const updated = maintenanceExpenses.filter(m => m.id !== id); setMaintenanceExpenses(updated); await saveList(STORAGE_KEYS.MAINTENANCE, updated);
  };
  const addCurrency = async (d: Omit<Currency, 'id'>): Promise<Currency> => {
    const item: Currency = { ...d, id: generateId() };
    const updated = [...currencies, item]; setCurrencies(updated); await saveList(STORAGE_KEYS.CURRENCIES, updated); return item;
  };
  const setBaseCurrency = async (id: string) => {
    const updated = currencies.map(c => ({ ...c, isBase: c.id === id })); setCurrencies(updated); await saveList(STORAGE_KEYS.CURRENCIES, updated);
    const ns = { ...settings, defaultCurrencyId: id }; setSettings(ns); await saveObject(STORAGE_KEYS.SETTINGS, ns);
  };
  const addExchangeRate = async (d: Omit<ExchangeRate, 'id'>): Promise<ExchangeRate> => {
    const item: ExchangeRate = { ...d, id: generateId() };
    const updated = [...exchangeRates, item]; setExchangeRates(updated); await saveList(STORAGE_KEYS.EXCHANGE_RATES, updated); return item;
  };
  const updateSettings = async (d: Partial<AppSettings>) => {
    const ns = { ...settings, ...d }; setSettings(ns); await saveObject(STORAGE_KEYS.SETTINGS, ns);
  };

  const getContractBalance = useCallback((contractId: string): ContractBalance => {
    const due = rentTransactions.filter(rt => rt.contractId === contractId).reduce((s, rt) => s + rt.equivalentBaseDue, 0);
    const paid = payments.filter(p => p.contractId === contractId).reduce((s, p) => s + p.equivalentBaseAmount, 0);
    return { totalDue: due, totalPaid: paid, balance: due - paid };
  }, [rentTransactions, payments]);

  const getActiveContractForUnit = useCallback((unitId: string) => contracts.find(c => c.unitId === unitId && c.isActive), [contracts]);
  const getTenantActiveContract = useCallback((tenantId: string) => contracts.find(c => c.tenantId === tenantId && c.isActive), [contracts]);

  const getPLReport = useCallback((startDate: string, endDate: string): PLReport => {
    const start = new Date(startDate); const end = new Date(endDate);
    const fRTs = rentTransactions.filter(rt => { const d = new Date(rt.month + '-01'); return d >= start && d <= end; });
    const fPayments = payments.filter(p => { const d = new Date(p.paymentDate); return d >= start && d <= end; });
    const fMaint = maintenanceExpenses.filter(m => { const d = new Date(m.expenseDate); return d >= start && d <= end; });
    const totalDue = fRTs.reduce((s, rt) => s + rt.equivalentBaseDue, 0);
    const totalCollected = fPayments.reduce((s, p) => s + p.equivalentBaseAmount, 0);
    const maintenanceCosts = fMaint.reduce((s, m) => s + m.amount, 0);
    return { totalDue, totalCollected, arrears: Math.max(0, totalDue - totalCollected), collectionRate: totalDue > 0 ? (totalCollected / totalDue) * 100 : 0, maintenanceCosts, netProfit: totalCollected - maintenanceCosts };
  }, [rentTransactions, payments, maintenanceExpenses]);

  const getTenantStatement = useCallback((tenantId: string): StatementRow[] => {
    const tContracts = contracts.filter(c => c.tenantId === tenantId);
    const cIds = tContracts.map(c => c.id);
    const rows: StatementRow[] = [];
    for (const rt of rentTransactions.filter(rt => cIds.includes(rt.contractId))) {
      rows.push({ id: rt.id, date: rt.month + '-01', description: `إيجار ${rt.month}`, debit: rt.equivalentBaseDue, credit: 0, balance: 0, type: 'rent' });
    }
    for (const p of payments.filter(p => cIds.includes(p.contractId))) {
      rows.push({ id: p.id, date: p.paymentDate, description: `دفعة - ${p.receiptNumber}`, debit: 0, credit: p.equivalentBaseAmount, balance: 0, type: 'payment' });
    }
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    for (const row of rows) { running += row.debit - row.credit; row.balance = running; }
    return rows;
  }, [contracts, rentTransactions, payments]);

  const getOverdueAlerts = useCallback(() => {
    const alerts: Array<{ contract: Contract; tenant: Tenant; unit: Unit; balance: number; buildingId: string }> = [];
    for (const contract of contracts.filter(c => c.isActive)) {
      const { balance } = getContractBalance(contract.id);
      if (balance > 0) {
        const tenant = tenants.find(t => t.id === contract.tenantId);
        const unit = units.find(u => u.id === contract.unitId);
        const floor = floors.find(f => f.id === unit?.floorId);
        if (tenant && unit && floor) alerts.push({ contract, tenant, unit, balance, buildingId: floor.buildingId });
      }
    }
    return alerts.sort((a, b) => b.balance - a.balance);
  }, [contracts, tenants, units, floors, getContractBalance]);

  const getBaseCurrency = useCallback((): Currency => currencies.find(c => c.isBase) || DEFAULT_CURRENCY, [currencies]);
  const getCurrencyById = useCallback((id: string) => currencies.find(c => c.id === id), [currencies]);
  const getUnitById = useCallback((id: string) => units.find(u => u.id === id), [units]);
  const getTenantById = useCallback((id: string) => tenants.find(t => t.id === id), [tenants]);
  const getBuildingById = useCallback((id: string) => buildings.find(b => b.id === id), [buildings]);
  const getFloorById = useCallback((id: string) => floors.find(f => f.id === id), [floors]);
  const getFloorsByBuilding = useCallback((buildingId: string) => floors.filter(f => f.buildingId === buildingId).sort((a, b) => a.floorNumber - b.floorNumber), [floors]);
  const getUnitsByFloor = useCallback((floorId: string) => units.filter(u => u.floorId === floorId), [units]);
  const getBuildingStats = useCallback((buildingId: string) => {
    const bFloors = floors.filter(f => f.buildingId === buildingId);
    const fIds = bFloors.map(f => f.id);
    const bUnits = units.filter(u => fIds.includes(u.floorId));
    return { total: bUnits.length, rented: bUnits.filter(u => u.status === 'rented').length, vacant: bUnits.filter(u => u.status === 'vacant').length };
  }, [floors, units]);
  const getContractsByTenant = useCallback((tenantId: string) => contracts.filter(c => c.tenantId === tenantId), [contracts]);
  const getPaymentsByContract = useCallback((contractId: string) => payments.filter(p => p.contractId === contractId).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()), [payments]);

  return (
    <AppContext.Provider value={{
      buildings, floors, units, tenants, contracts, rentTransactions, payments,
      maintenanceExpenses, currencies, exchangeRates, settings, isLoading,
      addBuilding, updateBuilding, deleteBuilding, addFloor, deleteFloor,
      addUnit, updateUnit, deleteUnit, addTenant, updateTenant, deleteTenant,
      addContract, endContract, addPayment, addMaintenanceExpense, deleteMaintenanceExpense,
      addCurrency, setBaseCurrency, addExchangeRate, updateSettings, generateMonthlyRent,
      getContractBalance, getActiveContractForUnit, getTenantActiveContract,
      getPLReport, getTenantStatement, getOverdueAlerts, getBaseCurrency,
      getCurrencyById, getUnitById, getTenantById, getBuildingById, getFloorById,
      getFloorsByBuilding, getUnitsByFloor, getBuildingStats,
      getContractsByTenant, getPaymentsByContract,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
