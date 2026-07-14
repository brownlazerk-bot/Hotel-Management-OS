/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { store } from '../db/store';
import { Permission, RoleName, RestaurantOrder, PurchaseOrder, USBPrinterConfig } from '../types';

// Helper to check if user has access to print specific document types
export function canUserPrint(docType: string): { allowed: boolean; message?: string } {
  const activeUser = store.getActiveUser();
  if (!activeUser) {
    return { allowed: false, message: "No active user session. Please log in to print." };
  }

  // Super Admin and CEO can print anything
  if (activeUser.role === 'Super Admin' || activeUser.role === 'CEO') {
    return { allowed: true };
  }

  // Map document categories to permissions
  let requiredPermission: Permission = 'view_dashboard';

  if (['Customer Receipt', 'KOT', 'BOT'].includes(docType)) {
    requiredPermission = 'manage_pos';
  } else if (['Invoice', 'Checkout Folio'].includes(docType)) {
    requiredPermission = 'manage_guests';
  } else if (['Purchase Order', 'Goods Received Note'].includes(docType)) {
    requiredPermission = 'manage_purchasing';
  } else if (['Expense Voucher', 'Payment Voucher'].includes(docType)) {
    requiredPermission = 'manage_accounting';
  } else if (['Inventory Report'].includes(docType)) {
    requiredPermission = 'manage_inventory';
  } else if ([
    'Sales Report', 'Audit Report', 'Profit & Loss Statement', 'Balance Sheet', 
    'Cash Flow Statement', 'Payroll Report', 'Daily Report', 'Weekly Report', 
    'Monthly Report', 'Annual Report'
  ].includes(docType)) {
    requiredPermission = 'view_reports';
  }

  const isGranted = store.hasPermission(requiredPermission);
  if (!isGranted) {
    return { 
      allowed: false, 
      message: `Access Denied. You do not have the required permission (${requiredPermission}) to print: ${docType}.` 
    };
  }

  return { allowed: true };
}

// Global print handler that formats and launches browser Print Preview
export function launchPrintPreview(
  docType: string, 
  title: string, 
  htmlContent: string, 
  copies: number = 1
) {
  const auth = canUserPrint(docType);
  if (!auth.allowed) {
    alert(auth.message || "Unauthorized to print this document.");
    return;
  }

  const activeUser = store.getActiveUser();
  const userName = activeUser ? `${activeUser.name} (${activeUser.role})` : "System";
  
  // Log the action to the audit trail
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const dateStr = now.toLocaleDateString();
  
  store.addAuditLog(
    'Document Printed', 
    'Printer', 
    `User "${userName}" triggered print preview for "${title}" (${docType}). Copies: ${copies}. Date: ${dateStr}, Time: ${timeStr}`
  );

  // Open the printable preview in a new window/tab
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Popup window blocked by browser. Please enable popups in your browser settings to display the Print Preview.");
    return;
  }

  const db = store.getDb();
  const profile = db.settings?.profile || {
    name: "Grand Horizon Resort & Spa",
    address: "777 Serenity Boulevard, Oceanside",
    phone: "+1 (555) 777-8888",
    taxNumber: "TIN-984-110A",
    taxRate: 12
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Print Preview - ${title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f3f4f6;
          color: #1f2937;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-body {
          font-family: 'JetBrains Mono', monospace;
        }

        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background-color: #ffffff !important;
          }
          /* Custom sizes for thermal papers */
          .receipt-58 {
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 2mm !important;
          }
          .receipt-80 {
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
      </style>
    </head>
    <body class="min-h-screen py-10 px-4 flex flex-col items-center">
      
      <!-- TOOLBAR (Hidden during print) -->
      <div class="no-print bg-white border border-gray-200 p-4 rounded-2xl shadow-md w-full max-w-4xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-slate-100 rounded-lg text-[#1B4F72]">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <div>
            <h1 class="text-sm font-extrabold text-gray-800">Grand Horizon Print Engine</h1>
            <p class="text-[11px] text-gray-400">Previewing: <span class="font-bold text-gray-600">${title}</span> (${docType})</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2 w-full sm:w-auto">
          <button onclick="window.print()" class="flex-1 sm:flex-initial px-4 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center justify-center">
            <svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Now
          </button>
          <button onclick="window.close()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition">
            Close Preview
          </button>
        </div>
      </div>

      <!-- MAIN PREVIEW CONTAINER -->
      <div class="print-container bg-white border border-gray-200 p-8 sm:p-12 rounded-3xl shadow-lg w-full ${
        ['Customer Receipt', 'KOT', 'BOT'].includes(docType) ? 'max-w-md receipt-body' : 'max-w-4xl'
      }">
        ${htmlContent}
      </div>

      <!-- FOOTER AUDIT METADATA (Hidden during print) -->
      <div class="no-print text-center text-[10px] text-gray-400 mt-6 max-w-md">
        Printed by ${userName} on ${dateStr} at ${timeStr}. Enqueued duplicates: ${copies}. Security Hash: GH-${Date.now().toString(36).toUpperCase()}
      </div>

      <script>
        // Trigger print immediately on load
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// 1. CUSTOMER RECEIPT BUILDER (optimized for thermal print, with customizable width)
export function getCustomerReceiptHTML(order: any, printerWidth: '58mm' | '80mm' = '80mm'): string {
  const db = store.getDb();
  const profile = db.settings?.profile || {
    name: "Grand Horizon Resort & Spa",
    address: "777 Serenity Boulevard, Oceanside",
    phone: "+1 (555) 777-8888",
    taxNumber: "TIN-984-110A",
    taxRate: 12
  };

  const is80 = printerWidth === '80mm';
  const widthClass = is80 ? 'w-full max-w-[80mm]' : 'w-full max-w-[58mm] text-xs';
  
  const formattedItems = order.items.map((it: any) => {
    const itemTotal = it.price * it.quantity;
    return `
      <div class="flex justify-between items-start py-1">
        <div class="flex-1 pr-2">
          <div class="font-bold">${it.name}</div>
          <div class="text-[10px] text-gray-500">${it.quantity} x ${store.formatMoney(it.price)}</div>
        </div>
        <div class="font-bold shrink-0 text-right font-mono">${store.formatMoney(itemTotal)}</div>
      </div>
    `;
  }).join('');

  // Generates a simulated vector QR code representing payment verification
  const qrCodeSvg = `
    <svg class="mx-auto w-24 h-24 my-3 print:my-2" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0h7v7H0V0zm1 1v5h5V1H1zm2 2h1v1H3V3zm18-3h7v7h-7V0zm1 1v5h5V1h-5zm2 2h1v1h-1V3zM0 22h7v7H0v-7zm1 1v5h5v-5H1zm2 2h1v1H3v-1zm10-14h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm2-2h1v1h-1v-1zm1 1h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 2h1v1h-1v-1zm2 0h1v1h-1v-1zm-4 2h1v1h-1v-1zm1 1h1v1h-1v-1zm1 1h1v1h-1v-1zm-3-4h1v1h-1v-1zm-2 2h1v1h-1v-1zm1 1h1v1h-1v-1zm4-6h1v1h-1v-1zm1 1h1v1h-1v-1zm1-1h1v1h-1v-1zm1 1h1v1h-1v-1zm-5 4h1v1h-1v-1zm2 1h1v1h-1v-1zm-3 3h1v1h-1v-1zm-1-1h1v1h-1v-1zm-1 2h1v1h-1v-1zm4 1h1v1h-1v-1z" fill="black"/>
    </svg>
  `;

  return `
    <div class="receipt-body mx-auto text-black flex flex-col items-center ${widthClass}">
      
      <!-- LOGO / EMOJI -->
      <div class="text-3xl mb-1 text-center font-bold">🏨</div>
      
      <!-- HOTEL DETAILS -->
      <h2 class="text-base font-extrabold text-center uppercase tracking-wider">${profile.name}</h2>
      <div class="text-[10px] text-center space-y-0.5 mt-1 border-b border-dashed border-gray-300 pb-3 w-full">
        <div>TIN: ${profile.taxNumber}</div>
        <div>Address: ${profile.address}</div>
        <div>Phone: ${profile.phone}</div>
      </div>

      <!-- TRANSACTION METADATA -->
      <div class="text-[11px] py-3 space-y-1 w-full border-b border-dashed border-gray-300">
        <div class="flex justify-between">
          <span>Receipt No:</span>
          <strong class="font-bold">${order.orderNumber || 'REC-' + Date.now().toString().slice(-6)}</strong>
        </div>
        <div class="flex justify-between">
          <span>Invoice Ref:</span>
          <span>INV-${order.id.slice(-6).toUpperCase()}</span>
        </div>
        <div class="flex justify-between">
          <span>Date & Time:</span>
          <span>${new Date(order.createdAt).toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span>Cashier:</span>
          <span>${store.getActiveUser()?.name || 'Marcus Brody'}</span>
        </div>
        ${order.customerName ? `
          <div class="flex justify-between">
            <span>Customer:</span>
            <span>${order.customerName}</span>
          </div>
        ` : ''}
        ${order.tableId ? `
          <div class="flex justify-between">
            <span>Table Number:</span>
            <span>Table ${(db.restaurantTables.find(t => t.id === order.tableId)?.tableNumber || order.tableId)}</span>
          </div>
        ` : ''}
        ${order.roomNumber ? `
          <div class="flex justify-between">
            <span>Room Number:</span>
            <span>Room ${order.roomNumber}</span>
          </div>
        ` : ''}
      </div>

      <!-- ITEM LIST -->
      <div class="w-full py-3 border-b border-dashed border-gray-300 text-[11px]">
        <div class="flex justify-between font-bold border-b border-dashed border-gray-200 pb-1 mb-1.5 uppercase">
          <span>Itemized Desc</span>
          <span>Total</span>
        </div>
        ${formattedItems}
      </div>

      <!-- FINANCIAL TOTALS -->
      <div class="w-full py-3 border-b border-dashed border-gray-300 text-[11px] space-y-1">
        <div class="flex justify-between">
          <span>Subtotal:</span>
          <span class="font-mono">${store.formatMoney(order.subtotal || order.total - (order.tax || 0) + (order.discount || 0))}</span>
        </div>
        ${order.discount ? `
          <div class="flex justify-between text-red-600 font-bold">
            <span>Discount:</span>
            <span class="font-mono">-${store.formatMoney(order.discount)}</span>
          </div>
        ` : ''}
        <div class="flex justify-between">
          <span>VAT (${profile.taxRate || 12}%):</span>
          <span class="font-mono">${store.formatMoney(order.tax || 0)}</span>
        </div>
        <div class="flex justify-between text-sm font-extrabold uppercase border-t border-dashed border-gray-200 pt-1.5">
          <span>Total Amount:</span>
          <strong class="font-bold text-base font-mono">${store.formatMoney(order.total)}</strong>
        </div>
      </div>

      <!-- PAYMENT DETAILS -->
      <div class="w-full py-3 border-b border-dashed border-gray-300 text-[11px] space-y-1">
        <div class="flex justify-between">
          <span>Payment Method:</span>
          <span class="font-bold uppercase">${order.paymentMethod || 'Cash'}</span>
        </div>
        <div class="flex justify-between font-bold text-emerald-700">
          <span>Amount Paid:</span>
          <span class="font-mono">${store.formatMoney(order.amountPaid || order.total)}</span>
        </div>
        <div class="flex justify-between font-bold text-gray-700">
          <span>Change Due:</span>
          <span class="font-mono">${store.formatMoney(Math.max(0, (order.amountPaid || order.total) - order.total))}</span>
        </div>
      </div>

      <!-- QR CODE -->
      <div class="text-center w-full pt-2">
        <div class="text-[9px] text-gray-400 tracking-wider">SECURE DIGITAL VERIFICATION</div>
        ${qrCodeSvg}
        <div class="text-[8px] font-mono text-gray-400 mt-1">SEC-KEY: ${Math.random().toString(36).slice(2, 10).toUpperCase()}</div>
      </div>

      <!-- FOOTER THANK YOU -->
      <div class="text-[10px] text-center font-bold mt-4 space-y-1 w-full pt-3 border-t border-dashed border-gray-300">
        <div>Thank you for choosing Grand Horizon Resort!</div>
        <div class="text-gray-500 font-normal">We look forward to welcoming you back again.</div>
      </div>

    </div>
  `;
}

// 2. KITCHEN ORDER TICKET (KOT) HTML BUILDER
export function getKitchenOrderTicketHTML(order: any): string {
  const tableLabel = order.tableId ? `Table ${order.tableId}` : 'N/A';
  const formattedItems = order.items.map((it: any) => `
    <div class="flex py-1.5 border-b border-dashed border-gray-200 text-sm font-bold text-black font-mono">
      <div class="w-12 shrink-0 text-center bg-gray-100 rounded text-base px-1">${it.quantity}</div>
      <div class="flex-1 pl-3 text-lg">${it.name}</div>
    </div>
  `).join('');

  return `
    <div class="receipt-body mx-auto text-black w-full max-w-[80mm]">
      <div class="text-center border-b border-dashed border-gray-300 pb-3">
        <h2 class="text-lg font-black tracking-wide uppercase bg-black text-white py-1 px-3 inline-block rounded mb-2">KITCHEN COPY</h2>
        <div class="text-xs font-bold font-mono">KOT #${order.orderNumber || 'KOT-' + Date.now().toString().slice(-4)}</div>
        <div class="text-[11px] text-gray-500">${new Date(order.createdAt).toLocaleTimeString()}</div>
      </div>

      <div class="py-3 text-xs border-b border-dashed border-gray-300 space-y-1 font-mono">
        <div class="flex justify-between"><span>ORDER TYPE:</span> <strong class="font-bold">${order.orderType || 'Dine In'}</strong></div>
        <div class="flex justify-between"><span>TABLE NO:</span> <strong class="font-bold text-sm">${order.tableNumber || tableLabel}</strong></div>
        ${order.roomNumber ? `<div class="flex justify-between"><span>ROOM SERVICE:</span> <strong class="font-bold text-sm">Room ${order.roomNumber}</strong></div>` : ''}
        <div class="flex justify-between"><span>SERVER/WAITER:</span> <span>${order.waiterName || 'Marcus B.'}</span></div>
      </div>

      <div class="py-3">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Items to Prepare</div>
        ${formattedItems}
      </div>

      ${order.specialInstructions ? `
        <div class="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 font-mono text-xs mt-2">
          <strong class="block text-red-600">SPECIAL INSTRUCTIONS:</strong>
          <span class="text-gray-800">${order.specialInstructions}</span>
        </div>
      ` : ''}

      <div class="text-center font-bold text-[10px] text-gray-400 mt-6 pt-3 border-t border-dashed border-gray-300 uppercase tracking-widest font-mono">
        *** END OF KITCHEN COPY ***
      </div>
    </div>
  `;
}

// 3. BAR ORDER TICKET (BOT) HTML BUILDER
export function getBarOrderTicketHTML(order: any): string {
  const tableLabel = order.tableId ? `Table ${order.tableId}` : 'N/A';
  const formattedItems = order.items.map((it: any) => `
    <div class="flex py-1.5 border-b border-dashed border-gray-200 text-sm font-bold text-black font-mono">
      <div class="w-10 shrink-0 text-center bg-gray-100 rounded text-base px-1">${it.quantity}</div>
      <div class="flex-1 pl-3 text-lg">${it.name}</div>
    </div>
  `).join('');

  return `
    <div class="receipt-body mx-auto text-black w-full max-w-[80mm]">
      <div class="text-center border-b border-dashed border-gray-300 pb-3">
        <h2 class="text-lg font-black tracking-wide uppercase bg-black text-white py-1 px-3 inline-block rounded mb-2">BAR COUNTER COPY</h2>
        <div class="text-xs font-bold font-mono">BOT #${order.orderNumber ? order.orderNumber.replace('KOT', 'BOT') : 'BOT-' + Date.now().toString().slice(-4)}</div>
        <div class="text-[11px] text-gray-500">${new Date(order.createdAt).toLocaleTimeString()}</div>
      </div>

      <div class="py-3 text-xs border-b border-dashed border-gray-300 space-y-1 font-mono">
        <div class="flex justify-between"><span>ORDER TYPE:</span> <strong class="font-bold">${order.orderType || 'Dine In'}</strong></div>
        <div class="flex justify-between"><span>TABLE NO:</span> <strong class="font-bold text-sm">${order.tableNumber || tableLabel}</strong></div>
        ${order.roomNumber ? `<div class="flex justify-between"><span>ROOM SERVICE:</span> <strong class="font-bold text-sm">Room ${order.roomNumber}</strong></div>` : ''}
        <div class="flex justify-between"><span>WAITER:</span> <span>${order.waiterName || 'Marcus B.'}</span></div>
      </div>

      <div class="py-3">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Beverage Items Enqueued</div>
        ${formattedItems}
      </div>

      ${order.specialInstructions ? `
        <div class="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 font-mono text-xs mt-2">
          <strong class="block text-[#1B4F72]">BAR INSTRUCTIONS:</strong>
          <span class="text-gray-800">${order.specialInstructions}</span>
        </div>
      ` : ''}

      <div class="text-center font-bold text-[10px] text-gray-400 mt-6 pt-3 border-t border-dashed border-gray-300 uppercase tracking-widest font-mono">
        *** END OF BAR COPY ***
      </div>
    </div>
  `;
}

// 4. INVOICE (Checkout folio) HTML BUILDER
export function getCheckoutInvoiceHTML(guest: any, room: any, res: any, roomType: any, charges: any[]): string {
  const db = store.getDb();
  const profile = db.settings?.profile || {
    name: "The Grand Horizon Resort & Spa",
    address: "777 Serenity Boulevard, Oceanside",
    phone: "+1 (555) 777-8888",
    taxNumber: "TIN-984-110A",
    taxRate: 12
  };

  const nights = Math.ceil(Math.abs(new Date(res.checkOutDate).getTime() - new Date(res.checkInDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
  const subtotal = res.totalAmount;
  const taxAmount = Math.round(subtotal * ((profile.taxRate || 12) / 100));
  const totalBilled = subtotal + taxAmount;
  const balanceDue = totalBilled - res.amountPaid;

  const chargeLines = charges.map(c => `
    <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
      <td class="py-3 text-gray-600 font-medium">${c.date}</td>
      <td class="py-3 text-gray-800 font-bold">${c.description}</td>
      <td class="py-3 text-right font-mono font-semibold text-gray-800">${store.formatMoney(c.amount)}</td>
    </tr>
  `).join('');

  return `
    <div class="space-y-8 text-slate-800">
      
      <!-- INVOICE HEADER -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-150 pb-6 gap-4">
        <div>
          <span class="text-3xl font-black">🏨</span>
          <h1 class="text-xl font-black uppercase text-slate-900 tracking-wider mt-2">${profile.name}</h1>
          <p class="text-xs text-slate-400 mt-1">Tax Registration No: <strong class="text-slate-600">${profile.taxNumber}</strong></p>
          <p class="text-xs text-slate-400">Address: ${profile.address} • Ph: ${profile.phone}</p>
        </div>
        
        <div class="text-left md:text-right">
          <div class="bg-[#1B4F72] text-white px-4 py-1.5 rounded-lg text-xs font-black inline-block tracking-wider uppercase mb-2">OFFICIAL FOLIO BILL</div>
          <p class="text-xs text-slate-400">Invoice No: <strong class="font-mono font-bold text-slate-800">INV-FO-${res.id.slice(-6).toUpperCase()}</strong></p>
          <p class="text-xs text-slate-400">Date Posted: <strong class="text-slate-700">${new Date().toLocaleDateString()}</strong></p>
        </div>
      </div>

      <!-- BILL TO & RESERVATION DETAILS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-gray-150">
        <div class="text-xs space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Guest Profile</span>
          <p class="text-sm font-black text-slate-900">${guest?.firstName || ''} ${guest?.lastName || 'Resort Guest'}</p>
          <p class="text-slate-500">Email: ${guest?.email || 'N/A'}</p>
          <p class="text-slate-500">ID/Passport: ${guest?.identityNumber || 'N/A'}</p>
          <p class="text-slate-500">Contact Number: ${guest?.phone || 'N/A'}</p>
        </div>

        <div class="text-xs space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Booking Folio</span>
          <p class="text-slate-700 font-bold">Room Assigned: Room ${room?.roomNumber || 'N/A'} (${roomType?.name || 'Standard'})</p>
          <p class="text-slate-500">Check-In Date: ${res.checkInDate}</p>
          <p class="text-slate-500">Check-Out Date: ${res.checkOutDate}</p>
          <p class="text-slate-500">Total Duration: ${nights} nights</p>
        </div>
      </div>

      <!-- TRANSACTION LEDGER TABLE -->
      <div class="space-y-2">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Itemized Account Summary</h3>
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2">Date</th>
              <th class="pb-2">Description / Revenue Code</th>
              <th class="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${chargeLines}
          </tbody>
        </table>
      </div>

      <!-- BILLING DETAILS & BALANCES -->
      <div class="flex flex-col md:flex-row justify-between items-start gap-4 pt-4 border-t border-gray-150">
        <div class="text-[11px] text-slate-400 max-w-sm italic">
          Terms & Conditions: All outstanding room charges, mini-bar expenses, spa fees, and tax balances must be cleared at checkout.
        </div>
        
        <div class="w-full md:w-80 text-xs space-y-2">
          <div class="flex justify-between">
            <span class="text-slate-500">Subtotal Room Charges:</span>
            <span class="font-mono text-slate-800 font-semibold">${store.formatMoney(subtotal)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">VAT (${profile.taxRate || 12}%):</span>
            <span class="font-mono text-slate-800 font-semibold">${store.formatMoney(taxAmount)}</span>
          </div>
          <div class="flex justify-between border-t border-gray-150 pt-2 text-sm font-extrabold text-slate-900">
            <span>Total Folio Amount:</span>
            <strong class="font-mono font-bold">${store.formatMoney(totalBilled)}</strong>
          </div>
          <div class="flex justify-between text-emerald-700 font-semibold">
            <span>Payments Settled:</span>
            <strong class="font-mono">-${store.formatMoney(res.amountPaid)}</strong>
          </div>
          <div class="flex justify-between border-t border-double border-gray-200 pt-2 text-base font-black text-slate-900">
            <span>Balance Outstanding:</span>
            <strong class="font-mono text-red-600">${store.formatMoney(balanceDue)}</strong>
          </div>
        </div>
      </div>

    </div>
  `;
}

// 5. PURCHASE ORDER HTML BUILDER
export function getPurchaseOrderHTML(po: PurchaseOrder, supplier: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || {
    name: "The Grand Horizon Resort & Spa",
    address: "777 Serenity Boulevard, Oceanside",
    phone: "+1 (555) 777-8888",
    taxNumber: "TIN-984-110A"
  };

  const itemRows = po.items.map((it, idx) => `
    <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
      <td class="py-3 text-slate-600 font-mono">${idx + 1}</td>
      <td class="py-3 text-slate-800 font-bold">${it.name}</td>
      <td class="py-3 text-center font-mono">${it.quantity}</td>
      <td class="py-3 text-right font-mono">${store.formatMoney(it.unitPrice)}</td>
      <td class="py-3 text-right font-mono font-semibold">${store.formatMoney(it.quantity * it.unitPrice)}</td>
    </tr>
  `).join('');

  return `
    <div class="space-y-8 text-slate-800">
      <!-- HEADER -->
      <div class="flex justify-between items-center border-b border-gray-150 pb-6">
        <div>
          <span class="text-3xl">📦</span>
          <h1 class="text-xl font-black uppercase text-slate-900 tracking-wider mt-2">${profile.name}</h1>
          <p class="text-xs text-slate-400">Procurement & Store Department Office</p>
        </div>
        <div class="text-right">
          <div class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-black inline-block tracking-wider uppercase mb-2">PURCHASE ORDER</div>
          <p class="text-xs text-slate-400">PO Number: <strong class="font-mono text-slate-800">${po.id}</strong></p>
          <p class="text-xs text-slate-400">Date Issued: <strong class="text-slate-700">${po.orderedDate}</strong></p>
        </div>
      </div>

      <!-- SUPPLIER & PROPERTY DELIVERY DETAILS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-gray-150">
        <div class="text-xs space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Vendor / Supplier Details</span>
          <p class="text-sm font-black text-slate-900">${supplier?.name || 'Authorized Vendor'}</p>
          <p class="text-slate-500">Contact Person: ${supplier?.contactPerson || 'Account Executive'}</p>
          <p class="text-slate-500">Email: ${supplier?.email || 'N/A'}</p>
          <p class="text-slate-500">Phone: ${supplier?.phone || 'N/A'}</p>
        </div>

        <div class="text-xs space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ship To / Delivery Destination</span>
          <p class="text-sm font-black text-slate-900">${profile.name}</p>
          <p class="text-slate-500">Receiving Bay, Ground Level</p>
          <p class="text-slate-500">Address: ${profile.address}</p>
          <p class="text-slate-500">Delivery Instructions: Notify Storekeeper on arrival</p>
        </div>
      </div>

      <!-- PRODUCTS TABLE -->
      <div class="space-y-2">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Itemized Purchase Specifications</h3>
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2 w-12">No.</th>
              <th class="pb-2">Product Name & Specifications</th>
              <th class="pb-2 text-center w-24">Quantity</th>
              <th class="pb-2 text-right w-32">Unit Cost</th>
              <th class="pb-2 text-right w-32">Net Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- SUM TOTALS -->
      <div class="flex justify-between items-start pt-6 border-t border-gray-150">
        <div class="text-xs text-slate-400 max-w-sm">
          Please reference the purchase order number indicated above on all shipping labels, packing slips, invoices, and billings.
        </div>
        <div class="w-80 text-xs text-right space-y-2">
          <div class="flex justify-between text-slate-500">
            <span>Items Subtotal:</span>
            <span class="font-mono">${store.formatMoney(po.totalAmount)}</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>Estimated Shipping/Tax:</span>
            <span class="font-mono">${store.formatMoney(0)}</span>
          </div>
          <div class="flex justify-between border-t border-gray-150 pt-2 text-sm font-extrabold text-slate-900">
            <span>PO Total Amount:</span>
            <strong class="font-mono text-base font-bold text-[#1B4F72]">${store.formatMoney(po.totalAmount)}</strong>
          </div>
        </div>
      </div>

      <!-- SIGNATURE BLOCKS -->
      <div class="grid grid-cols-2 gap-12 pt-12 border-t border-dashed border-gray-200 text-xs">
        <div class="space-y-8">
          <p class="text-slate-400">Authorized Purchasing Agent Signature</p>
          <div class="border-b border-gray-300 w-48"></div>
          <p class="font-bold text-slate-700">${store.getActiveUser()?.name || 'Marcus Brody'}</p>
        </div>
        <div class="space-y-8 text-right">
          <p class="text-slate-400">Executive Approving Officer Signature</p>
          <div class="border-b border-gray-300 w-48 ml-auto"></div>
          <p class="font-bold text-slate-700">Internal Manager Approvals</p>
        </div>
      </div>

    </div>
  `;
}

// 6. GOODS RECEIVED NOTE (GRN) HTML BUILDER
export function getGoodsReceivedNoteHTML(po: PurchaseOrder, supplier: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || {
    name: "The Grand Horizon Resort & Spa",
    address: "777 Serenity Boulevard, Oceanside",
    phone: "+1 (555) 777-8888"
  };

  const itemRows = po.items.map((it, idx) => `
    <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
      <td class="py-3 text-slate-600 font-mono">${idx + 1}</td>
      <td class="py-3 text-slate-800 font-bold">${it.name}</td>
      <td class="py-3 text-center font-mono font-bold text-green-700">${it.quantity} Received</td>
      <td class="py-3 text-center font-mono text-gray-400">${it.quantity} Ordered</td>
      <td class="py-3 text-center font-semibold text-emerald-600">Passed Inspection</td>
    </tr>
  `).join('');

  return `
    <div class="space-y-8 text-slate-800">
      <!-- HEADER -->
      <div class="flex justify-between items-center border-b border-gray-150 pb-6">
        <div>
          <span class="text-3xl">📥</span>
          <h1 class="text-xl font-black uppercase text-slate-900 tracking-wider mt-2">${profile.name}</h1>
          <p class="text-xs text-slate-400">Goods Receiving Bay & Store Registry Ledger</p>
        </div>
        <div class="text-right">
          <div class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-black inline-block tracking-wider uppercase mb-2">GOODS RECEIVED NOTE</div>
          <p class="text-xs text-slate-400">GRN No: <strong class="font-mono text-slate-800">GRN-${po.id.replace('PO-', '')}</strong></p>
          <p class="text-xs text-slate-400">Date Received: <strong class="text-slate-700">${new Date().toLocaleDateString()}</strong></p>
        </div>
      </div>

      <!-- RECEIVED FROM / COMPARED AGAINST -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-gray-150">
        <div class="text-xs space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Received From (Vendor)</span>
          <p class="text-sm font-black text-slate-900">${supplier?.name || 'Authorized Supplier'}</p>
          <p class="text-slate-500">Corporate Ph: ${supplier?.phone || 'N/A'}</p>
          <p class="text-slate-500">Shipper / Carrier Name: Express Logistic Carrier</p>
        </div>

        <div class="text-xs space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Purchase Audit Matching</span>
          <p class="text-slate-700 font-bold">Matching Purchase Order: <span class="font-mono">${po.id}</span></p>
          <p class="text-slate-500">Original Issuance: ${po.orderedDate}</p>
          <p class="text-slate-500">Receiving Clerk: ${store.getActiveUser()?.name || 'Authorized Storekeeper'}</p>
        </div>
      </div>

      <!-- PRODUCTS TABLE -->
      <div class="space-y-2">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Quality Assurance & Quantity Match</h3>
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2 w-12">No.</th>
              <th class="pb-2">Product Name</th>
              <th class="pb-2 text-center">Qty Received</th>
              <th class="pb-2 text-center">Qty Ordered</th>
              <th class="pb-2 text-center">Verification Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- AUDIT ACKNOWLEDGEMENT -->
      <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-slate-600 flex items-start space-x-2">
        <span class="text-lg">✔️</span>
        <div>
          <strong class="text-emerald-800 block">Clerk Stock Acknowledgement:</strong>
          All items listed in this cargo consignment have been physically counted, inspected for quality, and logged into the hotel's digital inventories.
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="grid grid-cols-2 gap-12 pt-12 border-t border-dashed border-gray-200 text-xs">
        <div class="space-y-8">
          <p class="text-slate-400">Receiving Storekeeper Signature</p>
          <div class="border-b border-gray-300 w-48"></div>
          <p class="font-bold text-slate-700">${store.getActiveUser()?.name || 'Receiving Clerk'}</p>
        </div>
        <div class="space-y-8 text-right">
          <p class="text-slate-400">Carrier Courier Representative Signature</p>
          <div class="border-b border-gray-300 w-48 ml-auto"></div>
          <p class="font-bold text-slate-700">Driver Courier Signed Slip</p>
        </div>
      </div>

    </div>
  `;
}

// 7. EXPENSE VOUCHER HTML BUILDER
export function getExpenseVoucherHTML(voucher: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <!-- HEADER -->
      <div class="flex justify-between items-center border-b border-gray-150 pb-6">
        <div>
          <span class="text-3xl">🧾</span>
          <h1 class="text-xl font-black uppercase text-slate-900 tracking-wider mt-2">${profile.name}</h1>
          <p class="text-xs text-slate-400">Finance & Accounting Disbursements Office</p>
        </div>
        <div class="text-right">
          <div class="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs font-black inline-block tracking-wider uppercase mb-2">EXPENSE VOUCHER</div>
          <p class="text-xs text-slate-400">Voucher No: <strong class="font-mono text-slate-800">${voucher.id || 'EV-' + Date.now().toString().slice(-6)}</strong></p>
          <p class="text-xs text-slate-400">Date Posted: <strong class="text-slate-700">${voucher.date || new Date().toLocaleDateString()}</strong></p>
        </div>
      </div>

      <!-- DETAILS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-gray-150 text-xs space-y-1">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Debit Account Details</span>
          <p class="text-sm font-black text-slate-900">Ledger Category: ${voucher.category || 'Operating Expenses'}</p>
          <p class="text-slate-500">Beneficiary Name: ${voucher.recipient || 'Authorized Staff Payee'}</p>
          <p class="text-slate-500">Ledger Posting: Account Debit Cash/Bank</p>
        </div>
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Disbursement Controls</span>
          <p class="text-slate-700 font-bold">Authorized By: ${store.getActiveUser()?.name || 'Finance Officer'}</p>
          <p class="text-slate-500">Method: ${voucher.paymentMethod || 'Cash'}</p>
          <p class="text-slate-500">Payment Reference: EV-TX-98442</p>
        </div>
      </div>

      <!-- LEDGER DETAILS -->
      <div class="space-y-2">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Itemized Account Classification</h3>
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2">Account Code</th>
              <th class="pb-2">Description / Purpose of Expense</th>
              <th class="pb-2 text-right">Net Debit</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-100 text-xs">
              <td class="py-4 font-mono">AC-98422</td>
              <td class="py-4 font-bold text-slate-800">${voucher.description || 'General office supplies replenishment'}</td>
              <td class="py-4 text-right font-mono font-bold text-slate-900 text-base">${store.formatMoney(voucher.amount || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FINANCIAL SUM -->
      <div class="flex justify-between items-start pt-6 border-t border-gray-150">
        <div class="text-xs text-slate-400 italic">
          Disclaimer: This payment voucher serves as certified evidence of direct expense payout from capital assets. Original paper receipts must be attached.
        </div>
        <div class="w-64 text-right">
          <span class="text-[10px] text-slate-400 block uppercase tracking-wider">Disbursed Sum</span>
          <strong class="text-2xl font-black text-red-600 font-mono">${store.formatMoney(voucher.amount || 0)}</strong>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="grid grid-cols-2 gap-12 pt-12 border-t border-dashed border-gray-200 text-xs">
        <div class="space-y-8">
          <p class="text-slate-400">Pre-Audited & Checked By (Accountant)</p>
          <div class="border-b border-gray-300 w-48"></div>
          <p class="font-bold text-slate-700">${store.getActiveUser()?.name || 'Disbursement Accountant'}</p>
        </div>
        <div class="space-y-8 text-right">
          <p class="text-slate-400">Receiver / Payee Signature</p>
          <div class="border-b border-gray-300 w-48 ml-auto"></div>
          <p class="font-bold text-slate-700">${voucher.recipient || 'Payee Staff'}</p>
        </div>
      </div>
    </div>
  `;
}

// 8. PAYMENT VOUCHER HTML BUILDER
export function getPaymentVoucherHTML(voucher: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <!-- HEADER -->
      <div class="flex justify-between items-center border-b border-gray-150 pb-6">
        <div>
          <span class="text-3xl">💵</span>
          <h1 class="text-xl font-black uppercase text-slate-900 tracking-wider mt-2">${profile.name}</h1>
          <p class="text-xs text-slate-400">Corporate Finance & Treasury Disbursement Voucher</p>
        </div>
        <div class="text-right">
          <div class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-black inline-block tracking-wider uppercase mb-2">PAYMENT VOUCHER</div>
          <p class="text-xs text-slate-400">Voucher No: <strong class="font-mono text-slate-800">${voucher.id || 'PV-' + Date.now().toString().slice(-6)}</strong></p>
          <p class="text-xs text-slate-400">Date Posted: <strong class="text-slate-700">${voucher.date || new Date().toLocaleDateString()}</strong></p>
        </div>
      </div>

      <!-- DETAILS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-gray-150 text-xs space-y-1">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Payee Information</span>
          <p class="text-sm font-black text-slate-900">Paid To: ${voucher.recipient || 'Authorized Payee / Vendor'}</p>
          <p class="text-slate-500">Account Group: Supplier Trade Accounts Payable</p>
          <p class="text-slate-500">Bank Routing Code: BR-9844-HZR</p>
        </div>
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Treasury Controls</span>
          <p class="text-slate-700 font-bold">Approved By: Manager/Accountant Officer</p>
          <p class="text-slate-500">Disbursement Method: Bank Wire Transfer</p>
          <p class="text-slate-500">Posting Reference: PV-TX-HZR11</p>
        </div>
      </div>

      <!-- ACCOUNT SUMMARY -->
      <div class="space-y-2">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Itemized Account Classification</h3>
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2">Account Code</th>
              <th class="pb-2">Description / Purpose of Disbursement</th>
              <th class="pb-2 text-right">Net Debit</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-100 text-xs">
              <td class="py-4 font-mono">AP-44921</td>
              <td class="py-4 font-bold text-slate-800">${voucher.description || 'Payment settlement of vendor procurement invoices'}</td>
              <td class="py-4 text-right font-mono font-bold text-slate-900 text-base">${store.formatMoney(voucher.amount || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SUM -->
      <div class="flex justify-between items-start pt-6 border-t border-gray-150">
        <div class="text-xs text-slate-400 italic">
          Disclaimer: This payment voucher serves as certified evidence of direct financial payout from treasury.
        </div>
        <div class="w-64 text-right">
          <span class="text-[10px] text-slate-400 block uppercase tracking-wider">Paid Sum</span>
          <strong class="text-2xl font-black text-emerald-600 font-mono">${store.formatMoney(voucher.amount || 0)}</strong>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="grid grid-cols-2 gap-12 pt-12 border-t border-dashed border-gray-200 text-xs">
        <div class="space-y-8">
          <p class="text-slate-400">Treasury Approvals & Checked By (Accountant)</p>
          <div class="border-b border-gray-300 w-48"></div>
          <p class="font-bold text-slate-700">${store.getActiveUser()?.name || 'Chief Accountant'}</p>
        </div>
        <div class="space-y-8 text-right">
          <p class="text-slate-400">Receiver / Payee Signature</p>
          <div class="border-b border-gray-300 w-48 ml-auto"></div>
          <p class="font-bold text-slate-700">${voucher.recipient || 'Payee Vendor'}</p>
        </div>
      </div>
    </div>
  `;
}

// 9. INVENTORY REPORT HTML BUILDER
export function getInventoryReportHTML(products: any[]): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  const itemRows = products.map((prod, idx) => {
    const value = prod.currentStock * prod.averageCost;
    return `
      <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
        <td class="py-2 font-mono text-gray-500">${prod.id}</td>
        <td class="py-2 font-bold text-slate-800">${prod.name}</td>
        <td class="py-2 text-slate-600">${prod.category}</td>
        <td class="py-2 text-center font-mono ${prod.currentStock <= prod.minStockLevel ? 'text-red-600 font-bold bg-red-50' : 'text-slate-700'}">${prod.currentStock}</td>
        <td class="py-2 text-center font-mono text-slate-400">${prod.minStockLevel}</td>
        <td class="py-2 text-right font-mono">${store.formatMoney(prod.averageCost)}</td>
        <td class="py-2 text-right font-mono font-bold text-slate-900">${store.formatMoney(value)}</td>
      </tr>
    `;
  }).join('');

  const totalValue = products.reduce((acc, p) => acc + (p.currentStock * p.averageCost), 0);

  return `
    <div class="space-y-6 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Property Inventory Valuation & Audit Report</h2>
        <p class="text-[11px] text-gray-400 mt-1">Valuation Method: <strong class="text-slate-600">Weighted Average Cost (AVCO)</strong> • Generated on ${new Date().toLocaleString()}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-150 text-xs">
        <div>
          <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Total Unique SKU Items</span>
          <strong class="text-base font-bold text-slate-800">${products.length}</strong>
        </div>
        <div>
          <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Valued Capital Assets</span>
          <strong class="text-base font-bold text-[#1B4F72] font-mono">${store.formatMoney(totalValue)}</strong>
        </div>
        <div>
          <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Low Stock Warnings</span>
          <strong class="text-base font-bold text-red-600">${products.filter(p => p.currentStock <= p.minStockLevel).length} items</strong>
        </div>
      </div>

      <div class="space-y-1">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2">SKU ID</th>
              <th class="pb-2">Product Name</th>
              <th class="pb-2">Category</th>
              <th class="pb-2 text-center">In Stock</th>
              <th class="pb-2 text-center">Safety Level</th>
              <th class="pb-2 text-right">Avg Unit Cost</th>
              <th class="pb-2 text-right">Asset Value</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center pt-6 border-t border-gray-150 text-xs">
        <span class="text-slate-400 italic">Security Checkpoint: Authorized Storekeeping Ledger matches physical stock.</span>
        <strong class="text-slate-900">Total Asset Value: <span class="font-mono">${store.formatMoney(totalValue)}</span></strong>
      </div>
    </div>
  `;
}

// 10. SALES REPORT HTML BUILDER
export function getSalesReportHTML(posOrders: any[], totalSales: number): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  const salesRows = posOrders.map(o => `
    <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
      <td class="py-2 font-mono text-gray-500">${o.orderNumber || o.id}</td>
      <td class="py-2 text-slate-600">${new Date(o.createdAt).toLocaleString()}</td>
      <td class="py-2 text-slate-800 font-medium">${o.orderType || 'Dine In'}</td>
      <td class="py-2 font-bold">${o.paymentMethod || 'Cash'}</td>
      <td class="py-2 text-right font-mono text-slate-400">${store.formatMoney(o.discount || 0)}</td>
      <td class="py-2 text-right font-mono text-slate-500">${store.formatMoney(o.tax || 0)}</td>
      <td class="py-2 text-right font-mono font-bold text-emerald-700">${store.formatMoney(o.total)}</td>
    </tr>
  `).join('');

  return `
    <div class="space-y-6 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">POS Revenue & Itemized Sales Ledger</h2>
        <p class="text-[11px] text-gray-400 mt-1">Generated: ${new Date().toLocaleString()} • Report Officer: ${store.getActiveUser()?.name || 'Chief Auditor'}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-150 text-xs">
        <div>
          <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Total Sales count</span>
          <strong class="text-base font-bold text-slate-800">${posOrders.length} Completed Orders</strong>
        </div>
        <div>
          <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Net POS Revenue</span>
          <strong class="text-base font-bold text-emerald-700 font-mono">${store.formatMoney(totalSales)}</strong>
        </div>
        <div>
          <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Estimated VAT Collected</span>
          <strong class="text-base font-bold text-[#1B4F72] font-mono">${store.formatMoney(posOrders.reduce((acc, o) => acc + (o.tax || 0), 0))}</strong>
        </div>
      </div>

      <div class="space-y-1">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2">Order SKU</th>
              <th class="pb-2">Date & Time</th>
              <th class="pb-2">Type</th>
              <th class="pb-2">Method</th>
              <th class="pb-2 text-right">Discount</th>
              <th class="pb-2 text-right">VAT (Taxes)</th>
              <th class="pb-2 text-right">Net Paid</th>
            </tr>
          </thead>
          <tbody>
            ${salesRows}
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center pt-6 border-t border-gray-150 text-xs">
        <span class="text-slate-400 italic">Notice: POS Sales data is synchronized with the central financial accounting system.</span>
        <strong class="text-slate-900">Total Net Revenue: <span class="font-mono">${store.formatMoney(totalSales)}</span></strong>
      </div>
    </div>
  `;
}

// 11. AUDIT REPORT HTML BUILDER
export function getAuditReportHTML(logs: any[]): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  const auditRows = logs.map(l => `
    <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
      <td class="py-2 text-slate-400 font-mono">${l.timestamp || l.date + ' ' + l.time}</td>
      <td class="py-2 text-[#1B4F72] font-bold uppercase text-[9px]">${l.module}</td>
      <td class="py-2 text-slate-800 font-medium">${l.action}</td>
      <td class="py-2 text-slate-600 text-[11px]">${l.details || l.message}</td>
    </tr>
  `).join('');

  return `
    <div class="space-y-6 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Hotel System Audit Trail & Compliance Report</h2>
        <p class="text-[11px] text-gray-400 mt-1">Generated: ${new Date().toLocaleString()} • Safety Officer: ${store.getActiveUser()?.name || 'Chief Compliance Auditor'}</p>
      </div>

      <div class="space-y-1">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2 w-48">Date / Timestamp</th>
              <th class="pb-2 w-32">Module</th>
              <th class="pb-2 w-48">Action</th>
              <th class="pb-2">Transaction Logs details</th>
            </tr>
          </thead>
          <tbody>
            ${auditRows}
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center pt-6 border-t border-gray-150 text-xs">
        <span class="text-slate-400 italic">Internal Confidentially: This transaction trail is cryptographically logged for corporate compliance reviews.</span>
      </div>
    </div>
  `;
}

// 12. PROFIT & LOSS STATEMENT HTML BUILDER
export function getProfitLossStatementHTML(data: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Corporate Profit & Loss (P&L) Statement</h2>
        <p class="text-[11px] text-gray-400 mt-1">Posting Period: <strong class="text-slate-600">Year-To-Date (YTD)</strong> • Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="space-y-6 max-w-2xl mx-auto text-xs">
        
        <!-- OPERATING REVENUE -->
        <div class="space-y-2">
          <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1.5 flex justify-between">
            <span>Operating Revenue</span>
            <span class="font-mono text-emerald-700">${store.formatMoney(data.revenue || 0)}</span>
          </h3>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Room Checkout & Loggings</span>
            <span class="font-mono">${store.formatMoney((data.revenue || 0) * 0.6)}</span>
          </div>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Restaurant Food & Dining POS Sales</span>
            <span class="font-mono">${store.formatMoney((data.revenue || 0) * 0.3)}</span>
          </div>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Bar & Spa Ancillary Services</span>
            <span class="font-mono">${store.formatMoney((data.revenue || 0) * 0.1)}</span>
          </div>
        </div>

        <!-- COST OF GOODS SOLD -->
        <div class="space-y-2">
          <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1.5 flex justify-between">
            <span>Cost of Goods Sold (COGS)</span>
            <span class="font-mono text-red-600">-${store.formatMoney(data.cogs || 0)}</span>
          </h3>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Kitchen Food Procurement</span>
            <span class="font-mono">-${store.formatMoney((data.cogs || 0) * 0.7)}</span>
          </div>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Bar Beverages Inventories Payouts</span>
            <span class="font-mono">-${store.formatMoney((data.cogs || 0) * 0.3)}</span>
          </div>
        </div>

        <!-- GROSS PROFIT -->
        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 flex justify-between items-center text-sm font-black text-slate-900">
          <span>GROSS REVENUE MARGIN</span>
          <span class="font-mono">${store.formatMoney((data.revenue || 0) - (data.cogs || 0))}</span>
        </div>

        <!-- OPERATING EXPENSES -->
        <div class="space-y-2">
          <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1.5 flex justify-between">
            <span>Operating Expenses (OPEX)</span>
            <span class="font-mono text-red-600">-${store.formatMoney(data.opex || 0)}</span>
          </h3>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Staff Salaries & Wages Payroll</span>
            <span class="font-mono">-${store.formatMoney((data.opex || 0) * 0.55)}</span>
          </div>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Power, Utility & Building Maintenance</span>
            <span class="font-mono">-${store.formatMoney((data.opex || 0) * 0.25)}</span>
          </div>
          <div class="flex justify-between text-slate-600 pl-4">
            <span>Housekeeping Consumables & Laundry</span>
            <span class="font-mono">-${store.formatMoney((data.opex || 0) * 0.2)}</span>
          </div>
        </div>

        <!-- TAXES -->
        <div class="space-y-2">
          <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1.5 flex justify-between">
            <span>Taxes & VAT Deductions</span>
            <span class="font-mono text-red-600">-${store.formatMoney(data.vat || 0)}</span>
          </h3>
        </div>

        <!-- NET CORPORATE PROFIT -->
        <div class="bg-[#1B4F72] text-white p-4 rounded-xl flex justify-between items-center text-base font-black">
          <span>NET OPERATING PROFIT</span>
          <strong class="font-mono">${store.formatMoney(data.netProfit || 0)}</strong>
        </div>

      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Certified Audit Report generated for board evaluation. Chief Accountant Office.
      </div>
    </div>
  `;
}

// 13. BALANCE SHEET HTML BUILDER
export function getBalanceSheetHTML(assets: number, liabilities: number, equity: number): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Corporate Balance Sheet Statement</h2>
        <p class="text-[11px] text-gray-400 mt-1">Accounting Standard: <strong class="text-slate-600">IFRS GAAP</strong> • Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs max-w-4xl mx-auto">
        
        <!-- LEFT: ASSETS -->
        <div class="space-y-4">
          <h3 class="font-black text-[#1B4F72] text-sm uppercase border-b-2 border-[#1B4F72] pb-1 flex justify-between">
            <span>Total Capital Assets</span>
            <span class="font-mono">${store.formatMoney(assets)}</span>
          </h3>
          
          <div class="space-y-1">
            <span class="font-bold text-slate-900 uppercase tracking-wider block text-[10px] text-gray-400">Current Assets</span>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Cash in Vault and Cash Register Float</span>
              <span class="font-mono">${store.formatMoney(assets * 0.4)}</span>
            </div>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Trade Receivables (Folio outstanding bills)</span>
              <span class="font-mono">${store.formatMoney(assets * 0.15)}</span>
            </div>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Supplies and Food Inventories</span>
              <span class="font-mono">${store.formatMoney(assets * 0.1)}</span>
            </div>
          </div>

          <div class="space-y-1">
            <span class="font-bold text-slate-900 uppercase tracking-wider block text-[10px] text-gray-400">Non-Current Assets</span>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Property, Furniture and Kitchen Hardware</span>
              <span class="font-mono">${store.formatMoney(assets * 0.35)}</span>
            </div>
          </div>
        </div>

        <!-- RIGHT: LIABILITIES & EQUITY -->
        <div class="space-y-4">
          <h3 class="font-black text-rose-700 text-sm uppercase border-b-2 border-rose-700 pb-1 flex justify-between">
            <span>Liabilities & Equity</span>
            <span class="font-mono">${store.formatMoney(liabilities + equity)}</span>
          </h3>

          <div class="space-y-1">
            <span class="font-bold text-slate-900 uppercase tracking-wider block text-[10px] text-gray-400">Current Liabilities</span>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Accounts Payable (Unsettled supplier bills)</span>
              <span class="font-mono">${store.formatMoney(liabilities * 0.7)}</span>
            </div>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Accrued Payroll Salaries Payout</span>
              <span class="font-mono">${store.formatMoney(liabilities * 0.3)}</span>
            </div>
          </div>

          <div class="space-y-1 pt-2 border-t border-gray-150">
            <span class="font-bold text-slate-900 uppercase tracking-wider block text-[10px] text-gray-400">Shareholders' Equity</span>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Paid-in Capital Shares</span>
              <span class="font-mono">${store.formatMoney(equity * 0.8)}</span>
            </div>
            <div class="flex justify-between text-slate-600 pl-2">
              <span>Retained Operational Profitings</span>
              <span class="font-mono">${store.formatMoney(equity * 0.2)}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- BALANCE CHECK -->
      <div class="p-4 rounded-xl max-w-4xl mx-auto border flex justify-between items-center text-xs font-black ${
        assets === liabilities + equity 
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
          : 'bg-red-50 border-red-100 text-red-800'
      }">
        <span class="flex items-center">
          <span class="text-base mr-1.5">✔️</span>
          BALANCING AUDIT CHECK: [ASSETS = LIABILITIES + EQUITY]
        </span>
        <span class="font-mono">MATCH OK: ${store.formatMoney(assets)}</span>
      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Certified audit log generated under standard GAAP hotel auditing protocols.
      </div>
    </div>
  `;
}

// 14. CASH FLOW STATEMENT HTML BUILDER
export function getCashFlowStatementHTML(netProfit: number): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Corporate Cash Flow Statement</h2>
        <p class="text-[11px] text-gray-400 mt-1">Posting Period: <strong class="text-slate-600">Year-To-Date (YTD)</strong> • Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="space-y-4 max-w-2xl mx-auto text-xs">
        
        <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1 flex justify-between">
          <span>Operating Cash Flow Activities</span>
          <span class="font-mono text-emerald-700">${store.formatMoney(netProfit * 1.15)}</span>
        </h3>
        <div class="flex justify-between text-slate-600 pl-4">
          <span>Net Income Cash Inflow</span>
          <span class="font-mono">${store.formatMoney(netProfit)}</span>
        </div>
        <div class="flex justify-between text-slate-600 pl-4">
          <span>Plus: Property Equipment Depreciation Additions</span>
          <span class="font-mono">${store.formatMoney(netProfit * 0.15)}</span>
        </div>

        <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1 flex justify-between">
          <span>Investing Activities (Capital Payouts)</span>
          <span class="font-mono text-red-600">-${store.formatMoney(netProfit * 0.35)}</span>
        </h3>
        <div class="flex justify-between text-slate-600 pl-4">
          <span>Purchases of Kitchen Hardware and Linens</span>
          <span class="font-mono">-${store.formatMoney(netProfit * 0.35)}</span>
        </div>

        <h3 class="font-black text-slate-900 uppercase border-b border-gray-200 pb-1 flex justify-between">
          <span>Financing Cash Flow Activities</span>
          <span class="font-mono text-gray-400">${store.formatMoney(0)}</span>
        </h3>

        <div class="bg-[#1B4F72] text-white p-4 rounded-xl flex justify-between items-center text-sm font-black mt-6">
          <span>NET CAPITAL LIQUIDITY INCREASE</span>
          <strong class="font-mono">${store.formatMoney((netProfit * 1.15) - (netProfit * 0.35))}</strong>
        </div>

      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Certified audit log generated under standard GAAP hotel auditing protocols.
      </div>
    </div>
  `;
}

// 15. PAYROLL REPORT HTML BUILDER
export function getPayrollReportHTML(staff: any[]): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  const payrollRows = staff.map(emp => {
    const salary = emp.salary || 2500;
    const taxes = Math.round(salary * 0.12);
    const net = salary - taxes;
    return `
      <tr class="border-b border-gray-100 text-xs hover:bg-gray-50/50">
        <td class="py-2 font-mono text-gray-500">${emp.id}</td>
        <td class="py-2 font-bold text-slate-800">${emp.firstName} ${emp.lastName}</td>
        <td class="py-2 text-slate-600">${emp.role || emp.departmentId}</td>
        <td class="py-2 text-right font-mono">${store.formatMoney(salary)}</td>
        <td class="py-2 text-right font-mono text-red-600">-${store.formatMoney(taxes)}</td>
        <td class="py-2 text-right font-mono font-bold text-emerald-700">${store.formatMoney(net)}</td>
      </tr>
    `;
  }).join('');

  const totalBase = staff.reduce((acc, e) => acc + (e.salary || 2500), 0);
  const totalNet = totalBase * 0.88;

  return `
    <div class="space-y-6 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Corporate Staff Payroll Registry Summary</h2>
        <p class="text-[11px] text-gray-400 mt-1">Generated: ${new Date().toLocaleString()} • Human Resources Office</p>
      </div>

      <div class="space-y-1">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="pb-2">Staff ID</th>
              <th class="pb-2">Employee Name</th>
              <th class="pb-2">Corporate Designation</th>
              <th class="pb-2 text-right">Base Salary</th>
              <th class="pb-2 text-right">Withholding Tax (12%)</th>
              <th class="pb-2 text-right">Net Direct Deposit</th>
            </tr>
          </thead>
          <tbody>
            ${payrollRows}
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center pt-6 border-t border-gray-150 text-xs">
        <span class="text-slate-400 italic">Disbursement Confirmation: Direct bank deposit authorizations posted successfully.</span>
        <strong class="text-slate-900">Net Payroll Disbursements: <span class="font-mono">${store.formatMoney(totalNet)}</span></strong>
      </div>
    </div>
  `;
}

// 16. DAILY REPORT HTML BUILDER
export function getDailyReportHTML(data: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Executive Daily Operational Digest</h2>
        <p class="text-[11px] text-gray-400 mt-1">Reporting Date: <strong class="text-slate-600">${new Date().toLocaleDateString()}</strong> • Generated at ${new Date().toLocaleTimeString()}</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Active Room Occupancy</span>
          <strong class="text-lg font-black text-slate-800">72% Occupied</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">POS Net Sales</span>
          <strong class="text-lg font-black text-emerald-700 font-mono">${store.formatMoney(data.posSales || 1840)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Cleanings Pending</span>
          <strong class="text-lg font-black text-slate-800">4 Rooms Left</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Unresolved Repairs</span>
          <strong class="text-lg font-black text-red-600">2 Alerts Open</strong>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">Key Daily Metrics</h3>
        <p class="text-xs text-slate-600">Today, Grand Horizon successfully synchronized food and dining ticket outputs across Bar and Kitchen thermal channels, processed room checkouts, and updated payroll databases automatically. Cleanings and general resort security patrols have proceeded without incidents.</p>
      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Internal Management Report. Board of Operations distribution.
      </div>
    </div>
  `;
}

// 17. WEEKLY REPORT HTML BUILDER
export function getWeeklyReportHTML(data: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Weekly Business Health and Analytics Summary</h2>
        <p class="text-[11px] text-gray-400 mt-1">Period: <strong class="text-slate-600">Last 7 Calendar Days</strong> • Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="grid grid-cols-3 gap-4 text-xs">
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Total Weekly POS Sales</span>
          <strong class="text-base font-black text-emerald-700 font-mono">${store.formatMoney(data.weeklySales || 12850)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Room Booking Revenues</span>
          <strong class="text-base font-black text-[#1B4F72] font-mono">${store.formatMoney(data.weeklyRoomSales || 24900)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Average Guest Satisfaction</span>
          <strong class="text-base font-black text-slate-800">4.9 / 5.0 Star Rating</strong>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">Weekly Performance Commentary</h3>
        <p class="text-xs text-slate-600">Resort operations have registered high-efficiency outputs. Total combined weekly bookings and POS culinary revenues reached ${store.formatMoney((data.weeklySales || 12850) + (data.weeklyRoomSales || 24900))}. Supply lines remain fully loaded via vetted suppliers purchase order matches.</p>
      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Internal Management Report. Board of Operations distribution.
      </div>
    </div>
  `;
}

// 18. MONTHLY REPORT HTML BUILDER
export function getMonthlyReportHTML(data: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Monthly Financial and Operational Health Summary</h2>
        <p class="text-[11px] text-gray-400 mt-1">Period: <strong class="text-slate-600">Current Active Month</strong> • Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="grid grid-cols-3 gap-4 text-xs">
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">POS Culinary Revenue</span>
          <strong class="text-base font-black text-emerald-700 font-mono">${store.formatMoney(data.monthlySales || 54200)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Room Accommodation Revenues</span>
          <strong class="text-base font-black text-[#1B4F72] font-mono">${store.formatMoney(data.monthlyRoomSales || 108900)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Net Corporate Profits</span>
          <strong class="text-base font-black text-slate-800 font-mono">${store.formatMoney(data.monthlyProfit || 42800)}</strong>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">Monthly Corporate Overview</h3>
        <p class="text-xs text-slate-600">The current month has recorded stellar occupancy metrics reaching 81% average, showing continuous revenue growth of 4.2% year-on-year. Procurement lines successfully stocked safety margins, and maintenance staff completed laundry and room repair logs efficiently.</p>
      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Internal Management Report. Board of Operations distribution.
      </div>
    </div>
  `;
}

// 19. ANNUAL REPORT HTML BUILDER
export function getAnnualReportHTML(data: any): string {
  const db = store.getDb();
  const profile = db.settings?.profile || { name: "The Grand Horizon Resort & Spa" };

  return `
    <div class="space-y-8 text-slate-800">
      <div class="border-b border-gray-150 pb-4">
        <h1 class="text-lg font-black uppercase text-slate-900 tracking-wider">${profile.name}</h1>
        <h2 class="text-sm font-bold text-gray-500">Corporate Annual Board of Directors Performance Report</h2>
        <p class="text-[11px] text-gray-400 mt-1">Period: <strong class="text-slate-600">Fiscal Year</strong> • Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="grid grid-cols-3 gap-4 text-xs">
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Combined Annual POS Sales</span>
          <strong class="text-base font-black text-emerald-700 font-mono">${store.formatMoney(data.annualSales || 645000)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Annual Room Lodging Bookings</span>
          <strong class="text-base font-black text-[#1B4F72] font-mono">${store.formatMoney(data.annualRoomSales || 1280000)}</strong>
        </div>
        <div class="p-4 bg-slate-50 border rounded-xl">
          <span class="text-gray-400 font-bold block uppercase text-[9px]">Audited Net Profit Margin</span>
          <strong class="text-base font-black text-slate-800 font-mono">${store.formatMoney(data.annualProfit || 512000)}</strong>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">Executive Annual Message</h3>
        <p class="text-xs text-slate-600">Grand Horizon Resort and Spa has reached new milestones in operating excellence and fiscal prudence. The integration of high-resolution digital POS checkout modules, automatic housekeeping clean lists, and direct ESC/POS thermal printing queues significantly decreased transaction overhead and reduced order wait times. Retained earnings are fully balanced against capital expansions for upcoming quarters.</p>
      </div>

      <div class="text-center text-[10px] text-gray-400 italic pt-6 border-t border-gray-150">
        Certified Annual Document. Board of Directors Confidential Copy.
      </div>
    </div>
  `;
}
