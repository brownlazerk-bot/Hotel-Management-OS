/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { store } from '../db/store';
import { USBPrinterConfig, PrintJob, ReprintRecord } from '../types';
import { 
  Printer, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Settings, 
  Activity, 
  FileText, 
  Plus, 
  Trash2, 
  Play, 
  Check, 
  RotateCcw, 
  FileCheck, 
  Sliders,
  History,
  Copy,
  Radio,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function PrinterStation() {
  const db = store.getDb();
  const activeUser = store.getActiveUser();
  const printers = store.getPrinters();
  const printJobs = store.getPrintJobs();
  const reprints = store.getReprints();

  // Selected sub-tab for queues & logs
  const [logsTab, setLogsTab] = useState<'queue' | 'history' | 'reprints'>('queue');
  
  // Search state
  const [searchJobQuery, setSearchJobQuery] = useState('');

  // Editing Printer modal state
  const [editingPrinter, setEditingPrinter] = useState<USBPrinterConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New simulated printer scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Reprint modal state
  const [reprintDocId, setReprintDocId] = useState('');
  const [reprintDocType, setReprintDocType] = useState('Receipt');
  const [reprintReason, setReprintReason] = useState('Receipt lost by customer');
  const [reprintCopies, setReprintCopies] = useState(1);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);

  // Auto-print rules local state (normally global settings)
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);

  // Form states for printer editing
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'58mm' | '80mm'>('80mm');
  const [formDept, setFormDept] = useState<USBPrinterConfig['department']>('Cashier');
  const [formStatus, setFormStatus] = useState<USBPrinterConfig['status']>('Online');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formDensity, setFormDensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formEncoding, setFormEncoding] = useState<'ASCII' | 'UTF-8' | 'CP850'>('UTF-8');
  const [formMarginTop, setFormMarginTop] = useState(2);
  const [formMarginBottom, setFormMarginBottom] = useState(2);
  const [formMarginLeft, setFormMarginLeft] = useState(1);
  const [formMarginRight, setFormMarginRight] = useState(1);
  const [formLogoEnabled, setFormLogoEnabled] = useState(true);
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formFooterText, setFormFooterText] = useState('');
  const [formCopies, setFormCopies] = useState(1);

  const canManageSettings = activeUser?.role === 'Super Admin' || store.hasPermission('manage_settings');

  const handleScanPrinters = () => {
    setIsScanning(true);
    setScanMessage('Scanning computer USB endpoints for thermal hardware...');
    
    setTimeout(() => {
      setScanMessage('Evaluating interface classes & ESC/POS protocols...');
      setTimeout(() => {
        // Detect a brand new simulated USB printer
        const existingCount = printers.length;
        const newId = `prn_custom_${Date.now()}`;
        const newPrinter: USBPrinterConfig = {
          id: newId,
          name: `Thermal Receipt POS-${58 + (existingCount % 2) * 22} (USB-${existingCount + 1})`,
          vendorId: `0x0${400 + Math.floor(Math.random() * 500)}`,
          productId: `0x${1000 + Math.floor(Math.random() * 8000)}`,
          type: existingCount % 2 === 0 ? '58mm' : '80mm',
          status: 'Online',
          department: existingCount === 0 ? 'Cashier' : existingCount === 1 ? 'Kitchen' : 'Bar',
          isDefault: false,
          density: 'Medium',
          encoding: 'UTF-8',
          margins: { top: 2, bottom: 2, left: 1, right: 1 },
          logoEnabled: true,
          footerText: 'Thank you for choosing Grand Horizon!\nPlease visit again.',
          copies: 1
        };

        store.savePrinter(newPrinter);
        setIsScanning(false);
        setScanMessage('');
        store.addNotification(
          'New USB Printer Detected', 
          `Detected ESC/POS compatible thermal printer: ${newPrinter.name}`, 
          'maintenance'
        );
      }, 1000);
    }, 1200);
  };

  const handleEditPrinter = (p: USBPrinterConfig) => {
    setEditingPrinter(p);
    setFormName(p.name);
    setFormType(p.type);
    setFormDept(p.department);
    setFormStatus(p.status);
    setFormIsDefault(p.isDefault);
    setFormDensity(p.density);
    setFormEncoding(p.encoding);
    setFormMarginTop(p.margins.top);
    setFormMarginBottom(p.margins.bottom);
    setFormMarginLeft(p.margins.left);
    setFormMarginRight(p.margins.right);
    setFormLogoEnabled(p.logoEnabled);
    setFormLogoUrl(p.logoUrl || '');
    setFormFooterText(p.footerText);
    setFormCopies(p.copies);
    setIsEditModalOpen(true);
  };

  const handleSavePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinter) return;

    // If setting this as default, turn off default for others in same department
    if (formIsDefault) {
      printers.forEach(p => {
        if (p.department === formDept && p.id !== editingPrinter.id && p.isDefault) {
          store.savePrinter({ ...p, isDefault: false });
        }
      });
    }

    const updated: USBPrinterConfig = {
      ...editingPrinter,
      name: formName,
      type: formType,
      department: formDept,
      status: formStatus,
      isDefault: formIsDefault,
      density: formDensity,
      encoding: formEncoding,
      margins: {
        top: Number(formMarginTop),
        bottom: Number(formMarginBottom),
        left: Number(formMarginLeft),
        right: Number(formMarginRight)
      },
      logoEnabled: formLogoEnabled,
      logoUrl: formLogoUrl || undefined,
      footerText: formFooterText,
      copies: Number(formCopies)
    };

    store.savePrinter(updated);
    setIsEditModalOpen(false);
    setEditingPrinter(null);
  };

  const handleDeletePrinter = (id: string) => {
    if (confirm('Are you sure you want to remove this printer configuration?')) {
      store.deletePrinter(id);
    }
  };

  const handleTestPrint = (p: USBPrinterConfig) => {
    let testContent = `========================================\n`;
    testContent += `      ESC/POS THERMAL TEST PAGE         \n`;
    testContent += `========================================\n`;
    testContent += `Printer Name:  ${p.name}\n`;
    testContent += `Port Mode:     USB (Direct Bulk)\n`;
    testContent += `Paper Width:   ${p.type}\n`;
    testContent += `Density Mode:  ${p.density}\n`;
    testContent += `Encoding:      ${p.encoding}\n`;
    testContent += `Device Status: ${p.status}\n`;
    testContent += `Department:    ${p.department} Station\n`;
    testContent += `----------------------------------------\n`;
    testContent += `CHARACTER SET TEST:\n`;
    testContent += `abcdefghijklmnopqrstuvwxyz 0123456789\n`;
    testContent += `ABCDEFGHIJKLMNOPQRSTUVWXYZ !@#$%^&*()\n`;
    testContent += `----------------------------------------\n`;
    testContent += `BARCODE & CUT SIMULATION ACTIVE\n`;
    testContent += `[ESC/POS Cut Command Enqueued]\n`;
    testContent += `========================================\n`;

    store.addPrintJob(`Self Test: ${p.name}`, p.department, 'General', testContent, 1);
  };

  const handleTriggerReprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reprintDocId) return;
    store.reprintDocument(reprintDocId, reprintDocType, reprintReason, reprintCopies);
    setIsReprintModalOpen(false);
    setLogsTab('queue');
  };

  const getStatusBadgeColor = (status: USBPrinterConfig['status']) => {
    switch (status) {
      case 'Online':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Offline':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Paper Out':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cover Open':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Disconnected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Busy':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredJobs = printJobs.filter(j => {
    if (!searchJobQuery) return true;
    const term = searchJobQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(term) ||
      j.printerName.toLowerCase().includes(term) ||
      j.documentType.toLowerCase().includes(term) ||
      j.status.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2" id="printer-station-root">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm gap-4" id="print-header-banner">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#1B4F72]/10 rounded-lg text-[#1B4F72]">
              <Printer className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Thermal Print Station</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage USB-connected ESC/POS receipt printers, view active print queues, and configure department routing rules.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {canManageSettings && (
            <button
              onClick={handleScanPrinters}
              disabled={isScanning}
              className="flex-1 md:flex-initial px-4 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors disabled:opacity-75"
              id="scan-usb-btn"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning USB...' : 'Detect USB Printers'}
            </button>
          )}

          <button
            onClick={() => setIsReprintModalOpen(true)}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
            id="trigger-reprint-btn"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Manual Reprint
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 animate-pulse flex items-center space-x-2">
          <Activity className="h-4 w-4 animate-spin shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* OVERVIEW STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="print-stats-grid">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Online Devices</div>
            <div className="text-lg font-bold text-gray-900">{printers.filter(p => p.status === 'Online').length} / {printers.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Device Faults</div>
            <div className="text-lg font-bold text-gray-900">
              {printers.filter(p => p.status !== 'Online' && p.status !== 'Busy').length}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Jobs</div>
            <div className="text-lg font-bold text-gray-900">
              {printJobs.filter(j => j.status === 'Pending' || j.status === 'Printing').length}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Successful Copies</div>
            <div className="text-lg font-bold text-gray-900">
              {printJobs.filter(j => j.status === 'Completed').length}
            </div>
          </div>
        </div>
      </div>

      {/* CORE GRID: REGISTERED PRINTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="printing-main-layout">
        {/* LEFT COLUMN: CONFIGURED PRINTERS (2 COLS WIDE ON LARGE) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center">
                <Printer className="h-4 w-4 mr-1.5 text-[#1B4F72]" /> Detected USB Printers ({printers.length})
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-medium text-gray-500">Auto Printing:</span>
                <button
                  onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
                    autoPrintEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {autoPrintEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            <div className="p-4 divide-y divide-gray-100">
              {printers.length === 0 ? (
                <div className="py-8 text-center">
                  <Printer className="h-10 w-10 text-gray-300 mx-auto stroke-1" />
                  <p className="text-xs text-gray-400 mt-2">No USB thermal receipt printers configured yet.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Click "Detect USB Printers" at the top to scan the system.</p>
                </div>
              ) : (
                printers.map(p => (
                  <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-sm font-semibold text-gray-900">{p.name}</strong>
                        {p.isDefault && (
                          <span className="bg-[#1B4F72]/10 text-[#1B4F72] text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                            DEFAULT
                          </span>
                        )}
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getStatusBadgeColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-gray-500">
                        <div><span className="text-gray-400 font-medium">VID/PID:</span> <span className="font-mono">{p.vendorId || 'N/A'}:{p.productId || 'N/A'}</span></div>
                        <div><span className="text-gray-400 font-medium">Width:</span> {p.type}</div>
                        <div><span className="text-gray-400 font-medium">Route:</span> <strong className="text-gray-700">{p.department}</strong></div>
                        <div><span className="text-gray-400 font-medium">Density:</span> {p.density}</div>
                        <div><span className="text-gray-400 font-medium">Encoding:</span> {p.encoding}</div>
                        <div><span className="text-gray-400 font-medium">Copies:</span> {p.copies}x</div>
                        <div><span className="text-gray-400 font-medium">Margins:</span> L:{p.margins.left} R:{p.margins.right} T:{p.margins.top} B:{p.margins.bottom}</div>
                        <div><span className="text-gray-400 font-medium">Logo:</span> {p.logoEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>

                      {/* QUICK INTERACTIVE SIMULATOR FOR FAULT TESTING */}
                      <div className="pt-2 flex items-center space-x-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Simulate Issue:</span>
                        {(['Online', 'Offline', 'Paper Out', 'Cover Open', 'Disconnected'] as USBPrinterConfig['status'][]).map(st => (
                          <button
                            key={st}
                            onClick={() => {
                              store.savePrinter({ ...p, status: st });
                              store.addAuditLog('Simulate Printer Status', 'Printer', `Simulated status of "${p.name}" changed to ${st}`);
                            }}
                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-all cursor-pointer font-bold ${
                              p.status === st
                                ? 'bg-gray-800 text-white border-gray-900'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center md:flex-col justify-end md:justify-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTestPrint(p)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Test Print
                      </button>

                      {canManageSettings && (
                        <div className="flex md:flex-row gap-2">
                          <button
                            onClick={() => handleEditPrinter(p)}
                            className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg cursor-pointer"
                            title="Edit Configuration"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrinter(p.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DEPARTMENT PRINT ROUTING RULES */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Automatic Department Routing Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/50 text-xs">
                <div className="font-bold text-gray-700">Cashier / POS checkout</div>
                <div className="text-gray-500 mt-1">Customer Receipts route to printer registered with <strong className="text-gray-700">Cashier</strong> department role.</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/50 text-xs">
                <div className="font-bold text-gray-700">Kitchen order slips (KOT)</div>
                <div className="text-gray-500 mt-1">Food orders route to printer with <strong className="text-gray-700">Kitchen</strong> department role automatically (prices omitted).</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/50 text-xs">
                <div className="font-bold text-gray-700">Bar beverage orders (BOT)</div>
                <div className="text-gray-500 mt-1">Drink orders route to printer with <strong className="text-gray-700">Bar</strong> department role (prices omitted).</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/50 text-xs">
                <div className="font-bold text-gray-700">Front Desk & Billing (Folio)</div>
                <div className="text-gray-500 mt-1">Guest check-out invoices route to printer with <strong className="text-gray-700">Reception</strong> department.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: QUEUES & LOGS */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[550px]">
            {/* SUB-TABS */}
            <div className="border-b border-gray-100 bg-gray-50/50 p-2 flex space-x-1 shrink-0">
              <button
                onClick={() => setLogsTab('queue')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer ${
                  logsTab === 'queue' ? 'bg-[#1B4F72] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Queue
              </button>
              <button
                onClick={() => setLogsTab('history')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer ${
                  logsTab === 'history' ? 'bg-[#1B4F72] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setLogsTab('reprints')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer ${
                  logsTab === 'reprints' ? 'bg-[#1B4F72] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Reprint Ledger
              </button>
            </div>

            {/* SEARCH */}
            <div className="p-3 border-b border-gray-100 shrink-0">
              <input
                type="text"
                placeholder="Search printing logs..."
                value={searchJobQuery}
                onChange={(e) => setSearchJobQuery(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              />
            </div>

            {/* TAB CONTENTS (SCROLLABLE) */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {logsTab === 'queue' && (
                <>
                  {filteredJobs.filter(j => j.status === 'Pending' || j.status === 'Printing').length === 0 ? (
                    <div className="py-12 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto stroke-1" />
                      <p className="text-xs text-emerald-700 font-bold mt-2">Print Queue is Empty</p>
                      <p className="text-[10px] text-gray-400 mt-1">All enqueued ESC/POS jobs processed successfully.</p>
                    </div>
                  ) : (
                    filteredJobs.filter(j => j.status === 'Pending' || j.status === 'Printing').map(job => (
                      <div key={job.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xs text-gray-900 block">{job.title}</strong>
                            <span className="text-[10px] text-gray-400 block">{job.documentType} • {job.printerName}</span>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border animate-pulse ${
                            job.status === 'Printing' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="bg-white p-2 border border-gray-200 rounded-lg text-[9px] font-mono whitespace-pre overflow-x-auto text-gray-500 max-h-[100px]">
                          {job.content}
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400">Copies: {job.copies}x</span>
                          <button
                            onClick={() => store.cancelPrintJob(job.id)}
                            className="text-red-600 font-bold hover:underline cursor-pointer"
                          >
                            Cancel Job
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {logsTab === 'history' && (
                <>
                  <div className="flex justify-between items-center pb-2 shrink-0">
                    <span className="text-[10px] font-bold text-gray-400">LATEST JOBS</span>
                    <button
                      onClick={() => store.clearPrintHistory()}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear History
                    </button>
                  </div>

                  {filteredJobs.length === 0 ? (
                    <div className="py-12 text-center">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto stroke-1" />
                      <p className="text-xs text-gray-400 mt-2">No historical print records found.</p>
                    </div>
                  ) : (
                    filteredJobs.map(job => (
                      <div key={job.id} className="p-3 bg-white border border-gray-100 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xs font-semibold text-gray-800">{job.title}</strong>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Printer: {job.printerName} • {job.copies}x
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            job.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {job.status === 'Completed' ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>

                        {job.errorMessage && (
                          <div className="text-[10px] text-red-600 font-medium bg-red-50 p-1.5 rounded-lg border border-red-100 flex items-center space-x-1 mt-1">
                            <ShieldAlert className="h-3 w-3" />
                            <span>Error: {job.errorMessage}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-gray-50 text-[9px] text-gray-400">
                          <span>By: {job.printedBy}</span>
                          <span>{job.createdAt.slice(11, 19)}</span>
                        </div>

                        {job.status === 'Failed' && (
                          <button
                            onClick={() => store.retryPrintJob(job.id)}
                            className="mt-1 w-full text-center py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[10px] text-gray-600 font-bold rounded-lg cursor-pointer"
                          >
                            Retry Printing
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              {logsTab === 'reprints' && (
                <>
                  {reprints.length === 0 ? (
                    <div className="py-12 text-center">
                      <History className="h-8 w-8 text-gray-300 mx-auto stroke-1" />
                      <p className="text-xs text-gray-400 mt-2">No document reprint entries in ledger.</p>
                      <p className="text-[10px] text-gray-400 mt-1">Reprints are logged automatically in the system audit trail.</p>
                    </div>
                  ) : (
                    reprints.map(rep => (
                      <div key={rep.id} className="p-3 bg-[#1B4F72]/5 border border-[#1B4F72]/10 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-gray-800">{rep.documentType} #{rep.documentId}</span>
                          <span className="bg-[#1B4F72]/10 text-[#1B4F72] text-[10px] px-1.5 py-0.5 rounded">
                            {rep.copies} {rep.copies === 1 ? 'copy' : 'copies'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-100 italic">
                          "{rep.reason}"
                        </p>
                        <div className="flex justify-between text-[9px] text-gray-400 pt-1">
                          <span>Reprinted By: {rep.reprintedBy}</span>
                          <span>{rep.reprintedAt.slice(0, 10)} {rep.reprintedAt.slice(11, 16)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT PRINTER SETTINGS */}
      {isEditModalOpen && editingPrinter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4F72] text-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center">
                <Sliders className="h-4 w-4 mr-1.5" /> Configure USB Thermal Printer
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPrinter(null);
                }} 
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/10 px-3 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrinter} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Friendly Printer Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Paper Width / Size</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                  >
                    <option value="58mm">58mm Receipt Printer</option>
                    <option value="80mm">80mm Receipt Printer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department Routing</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value as any)}
                  >
                    <option value="Cashier">Cashier (POS Checkout)</option>
                    <option value="Kitchen">Kitchen (Food orders)</option>
                    <option value="Bar">Bar (Beverages/Cocktails)</option>
                    <option value="Reception">Reception (Checkin/Folio)</option>
                    <option value="Accounting">Accounting (Ledgers/Reports)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status (Mock Hardware)</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Paper Out">Paper Out</option>
                    <option value="Cover Open">Cover Open</option>
                    <option value="Disconnected">Disconnected</option>
                    <option value="Busy">Busy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Print Density</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formDensity}
                    onChange={(e) => setFormDensity(e.target.value as any)}
                  >
                    <option value="Low">Low Density</option>
                    <option value="Medium">Medium Density (Standard)</option>
                    <option value="High">High Density (Crisp Text)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Character Encoding</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formEncoding}
                    onChange={(e) => setFormEncoding(e.target.value as any)}
                  >
                    <option value="ASCII">ASCII</option>
                    <option value="UTF-8">UTF-8 Multilingual</option>
                    <option value="CP850">Code Page 850 (Western European)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Receipt Copies</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={formCopies}
                    onChange={(e) => setFormCopies(Number(e.target.value))}
                  />
                </div>

                <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Margins (Chars/Spaces)</span>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-500">Top</label>
                      <input type="number" min="0" max="10" className="w-full p-1 border border-gray-200 rounded text-xs bg-white text-center" value={formMarginTop} onChange={e => setFormMarginTop(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-500">Bottom</label>
                      <input type="number" min="0" max="10" className="w-full p-1 border border-gray-200 rounded text-xs bg-white text-center" value={formMarginBottom} onChange={e => setFormMarginBottom(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-500">Left</label>
                      <input type="number" min="0" max="10" className="w-full p-1 border border-gray-200 rounded text-xs bg-white text-center" value={formMarginLeft} onChange={e => setFormMarginLeft(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-500">Right</label>
                      <input type="number" min="0" max="10" className="w-full p-1 border border-gray-200 rounded text-xs bg-white text-center" value={formMarginRight} onChange={e => setFormMarginRight(Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="formLogoEnabled"
                      className="rounded text-[#1B4F72]"
                      checked={formLogoEnabled}
                      onChange={(e) => setFormLogoEnabled(e.target.checked)}
                    />
                    <label htmlFor="formLogoEnabled" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Include Business Logo on Receipts</label>
                  </div>
                  {formLogoEnabled && (
                    <input
                      type="text"
                      placeholder="Emoji character (e.g. 🏨) or Logo URL"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      value={formLogoUrl}
                      onChange={(e) => setFormLogoUrl(e.target.value)}
                    />
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Custom Footer Text</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                    value={formFooterText}
                    onChange={(e) => setFormFooterText(e.target.value)}
                  />
                </div>

                <div className="col-span-2 flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="formIsDefault"
                    className="rounded text-[#1B4F72]"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                  />
                  <label htmlFor="formIsDefault" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Set as default printer for this department</label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPrinter(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs cursor-pointer flex items-center"
                >
                  <Save className="h-4 w-4 mr-1" /> Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL REPRINT ACTION */}
      {isReprintModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4F72] text-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center">
                <RotateCcw className="h-4 w-4 mr-1.5 animate-spin-reverse" /> Authorize Document Reprint
              </h3>
              <button onClick={() => setIsReprintModalOpen(false)} className="text-white hover:text-gray-200 font-bold text-sm bg-white/10 px-3 py-1 rounded-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleTriggerReprint} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Reprints must be authorized with a valid operational reason. This transaction will be permanently logged in the audit log for managerial review.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Document Reference Number / ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. order_1295, invoice_881, PO-403"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                  value={reprintDocId}
                  onChange={(e) => setReprintDocId(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Document Type</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={reprintDocType}
                    onChange={(e) => setReprintDocType(e.target.value)}
                  >
                    <option value="Receipt">Customer POS Receipt</option>
                    <option value="KOT">Kitchen Order Ticket (KOT)</option>
                    <option value="BOT">Bar Order Ticket (BOT)</option>
                    <option value="Invoice">Hotel Room Bill/Invoice</option>
                    <option value="Purchase Order">Purchase Order (PO)</option>
                    <option value="Expense Voucher">Expense Voucher</option>
                    <option value="Audit Report">Audit/Reconciliation Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reprints Count</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={reprintCopies}
                    onChange={(e) => setReprintCopies(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Duplicate Print</label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs mb-2"
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                >
                  <option value="Receipt lost by customer">Receipt lost by customer</option>
                  <option value="Printer paper jammed during active run">Printer paper jammed during active run</option>
                  <option value="Manager review of dispute or chargeback">Manager review of dispute or chargeback</option>
                  <option value="Audit inspection request">Audit inspection request</option>
                  <option value="Kitchen lost order slip">Kitchen lost order slip</option>
                  <option value="Bar lost order slip">Bar lost order slip</option>
                  <option value="Other manual reason override">Other manual reason override</option>
                </select>
                {reprintReason.includes('Other') && (
                  <input
                    type="text"
                    required
                    placeholder="Provide detailed description..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={reprintReason === 'Other manual reason override' ? '' : reprintReason}
                    onChange={(e) => setReprintReason(e.target.value)}
                  />
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReprintModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs cursor-pointer flex items-center"
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Trigger Reprint Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
