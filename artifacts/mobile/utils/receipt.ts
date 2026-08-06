import { Payment, Contract, Tenant, Unit, Floor, Building, Currency } from '@/types';
import { formatDate, getPaymentMethodLabel } from './formatters';

export function generateReceiptHTML(params: {
  payment: Payment;
  contract: Contract;
  tenant: Tenant;
  unit: Unit;
  floor?: Floor;
  building?: Building;
  payCurrency: Currency;
  baseCurrency: Currency;
  ownerName: string;
}): string {
  const { payment, contract, tenant, unit, floor, building, payCurrency, baseCurrency, ownerName } = params;

  const floorLabel = floor
    ? floor.floorNumber === 0 ? 'الطابق الأرضي' : `الطابق ${floor.floorNumber}`
    : '';

  const showEquiv =
    payCurrency.id !== baseCurrency.id &&
    payment.equivalentBaseAmount !== payment.amountPaid;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>إيصال دفع ${payment.receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; background: #f5f7fa; padding: 24px; direction: rtl; }
    .receipt {
      max-width: 520px; margin: 0 auto; background: #fff;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    }
    .header {
      background: linear-gradient(135deg, #1B4B82, #2563EB);
      padding: 32px 28px 24px; text-align: center; color: #fff;
    }
    .header h1 { font-size: 26px; font-weight: 900; letter-spacing: 1px; }
    .header p  { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .receipt-no {
      background: rgba(255,255,255,0.15); border-radius: 8px;
      display: inline-block; padding: 6px 16px; margin-top: 12px;
      font-size: 15px; font-weight: 700; letter-spacing: 2px;
    }
    .amount-box {
      background: #ECFDF5; border: 2px solid #10B981;
      border-radius: 12px; margin: 20px 24px 0; padding: 16px;
      text-align: center;
    }
    .amount-box .label { font-size: 13px; color: #6B7280; }
    .amount-box .value { font-size: 32px; font-weight: 900; color: #10B981; margin-top: 4px; }
    .amount-box .equiv { font-size: 13px; color: #6B7280; margin-top: 4px; }
    .body { padding: 20px 24px 28px; }
    .section-title {
      font-size: 13px; color: #9CA3AF; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; margin: 20px 0 10px; border-bottom: 1px solid #F3F4F6; padding-bottom: 6px;
    }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F9FAFB; }
    .row:last-child { border-bottom: none; }
    .row .k { font-size: 13px; color: #6B7280; }
    .row .v { font-size: 14px; color: #1A1A2E; font-weight: 600; text-align: left; }
    .stamp {
      margin: 24px 24px 0; padding: 12px; border: 2px dashed #10B981;
      border-radius: 10px; text-align: center;
      color: #10B981; font-size: 18px; font-weight: 900; letter-spacing: 2px;
    }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1>إمتلاك</h1>
    <p>نظام إدارة العقارات — ${ownerName}</p>
    <div class="receipt-no">${payment.receiptNumber}</div>
  </div>

  <div class="amount-box">
    <div class="label">المبلغ المدفوع</div>
    <div class="value">${payment.amountPaid.toLocaleString('ar-SA')} ${payCurrency.symbol}</div>
    ${showEquiv ? `<div class="equiv">ما يعادل: ${payment.equivalentBaseAmount.toLocaleString('ar-SA')} ${baseCurrency.symbol}</div>` : ''}
  </div>

  <div class="body">
    <div class="section-title">بيانات المستأجر</div>
    <div class="row"><span class="k">الاسم</span><span class="v">${tenant.fullName}</span></div>
    ${tenant.phone ? `<div class="row"><span class="k">الهاتف</span><span class="v">${tenant.phone}</span></div>` : ''}
    ${tenant.idDocument ? `<div class="row"><span class="k">الهوية</span><span class="v">${tenant.idDocument}</span></div>` : ''}

    <div class="section-title">بيانات الوحدة</div>
    <div class="row"><span class="k">رقم الوحدة</span><span class="v">${unit.unitNumber}</span></div>
    ${building ? `<div class="row"><span class="k">المبنى</span><span class="v">${building.name}</span></div>` : ''}
    ${floorLabel ? `<div class="row"><span class="k">الطابق</span><span class="v">${floorLabel}</span></div>` : ''}

    <div class="section-title">بيانات الدفعة</div>
    <div class="row"><span class="k">التاريخ</span><span class="v">${formatDate(payment.paymentDate)}</span></div>
    <div class="row"><span class="k">طريقة الدفع</span><span class="v">${getPaymentMethodLabel(payment.paymentMethod)}</span></div>
    <div class="row"><span class="k">رقم الإيصال</span><span class="v">${payment.receiptNumber}</span></div>
    ${payment.notes ? `<div class="row"><span class="k">ملاحظة</span><span class="v">${payment.notes}</span></div>` : ''}

    <div class="stamp">✓ مدفوع بالكامل</div>
  </div>

  <div class="footer">
    تم إصدار هذا الإيصال من نظام إمتلاك لإدارة العقارات<br/>
    ${new Date().toLocaleDateString('ar-SA')}
  </div>
</div>
</body>
</html>`;
}
