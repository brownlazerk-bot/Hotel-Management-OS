/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { CleaningTask, LaundryItem, LostAndFound, MaintenanceRequest } from '../types';
import {
  Sparkles,
  ClipboardList,
  Wrench,
  Search,
  Plus,
  Compass,
  CheckCircle,
  AlertTriangle,
  History,
  Activity,
  HeartHandshake
} from 'lucide-react';

export default function HousekeepingMaintenance() {
  const [activeTab, setActiveTab] = useState<'housekeeping' | 'laundry' | 'lost_found' | 'maintenance'>('housekeeping');
  const db = store.getDb();

  // Housekeeping filtering
  const [hkFilter, setHkFilter] = useState<string>('All');

  // Laundry log states
  const [laundGuest, setLaundGuest] = useState('');
  const [laundRoom, setLaundRoom] = useState('');
  const [laundType, setLaundType] = useState('Bedding');
  const [laundQty, setLaundQty] = useState<number>(5);
  const [laundCost, setLaundCost] = useState<number>(0);

  // Lost & Found states
  const [lfDesc, setLfDesc] = useState('');
  const [lfLoc, setLfLoc] = useState('');
  const [lfNotes, setLfNotes] = useState('');

  // Maintenance Ticket states
  const [maintRoomId, setMaintRoomId] = useState('');
  const [maintEquip, setMaintEquip] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintPriority, setMaintPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // ============================================================================
  // CALCULATIONS & FILTERS
  // ============================================================================
  const filteredTasks = useMemo(() => {
    return db.cleaningTasks.filter(t => {
      if (hkFilter === 'All') return true;
      return t.status === hkFilter;
    });
  }, [db, hkFilter]);

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleUpdateHKStatus = (taskId: string, status: any) => {
    // Look up an active housekeeper ID or keep existing
    store.updateCleaningTaskStatus(taskId, status);
  };

  const handleCreateLaundry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laundType || laundQty <= 0) return;

    const laundry: LaundryItem = {
      id: `lnd_${Date.now()}`,
      guestId: laundGuest || undefined,
      roomId: laundRoom || undefined,
      itemType: laundType,
      quantity: laundQty,
      status: 'Received',
      cost: laundCost,
      createdAt: new Date().toISOString()
    };

    store.addLaundryItem(laundry);
    setLaundGuest('');
    setLaundRoom('');
    setLaundType('Bedding');
    setLaundQty(5);
    setLaundCost(0);
  };

  const handleUpdateLaundryStatus = (id: string, status: any) => {
    store.updateLaundryStatus(id, status);
  };

  const handleCreateLostFound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lfDesc || !lfLoc) return;

    const item: LostAndFound = {
      id: `lf_${Date.now()}`,
      description: lfDesc,
      foundLocation: lfLoc,
      foundDate: new Date().toISOString().split('T')[0],
      status: 'Reported',
      notes: lfNotes
    };

    store.saveLostAndFound(item);
    setLfDesc('');
    setLfLoc('');
    setLfNotes('');
  };

  const handleClaimLostFound = (id: string) => {
    const item = db.lostAndFound.find(l => l.id === id);
    if (item) {
      const updated = { ...item, status: 'Claimed' as const };
      store.saveLostAndFound(updated);
    }
  };

  const handleCreateMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintDesc) return;

    const req: MaintenanceRequest = {
      id: `maint_${Date.now()}`,
      roomId: maintRoomId || undefined,
      equipmentName: maintEquip || undefined,
      description: maintDesc,
      priority: maintPriority,
      status: 'Pending',
      requestedBy: store.getActiveUser()?.id || 'system_staff',
      createdAt: new Date().toISOString()
    };

    store.addMaintenanceRequest(req);
    setMaintRoomId('');
    setMaintEquip('');
    setMaintDesc('');
  };

  const handleUpdateMaintStatus = (id: string, status: any) => {
    store.updateMaintenanceStatus(id, status);
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-[#1B4F72] rounded-xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Operational & Facility Control</h1>
            <p className="text-xs text-gray-400">Track visual room sanitation lists, back-of-house linen logs, lost & found catalog entries, and maintenance tickets.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('housekeeping')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'housekeeping'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Cleaning Queue
          </button>
          <button
            onClick={() => setActiveTab('laundry')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'laundry'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Laundry Control
          </button>
          <button
            onClick={() => setActiveTab('lost_found')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'lost_found'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Lost & Found Book
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'maintenance'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Facility Maintenance
          </button>
        </div>
      </div>

      {/* TAB 1: HOUSEKEEPING CLEANING QUEUE */}
      {activeTab === 'housekeeping' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Visual Sanitation Queue</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Assigned cleaning crews must advance states to prompt supervisor inspection pass validations.</p>
            </div>

            <div className="flex space-x-1.5 bg-gray-50 p-1 rounded-xl border border-gray-150">
              {['All', 'Pending', 'In Progress', 'Completed', 'Inspected'].map(status => (
                <button
                  key={status}
                  onClick={() => setHkFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                    hkFilter === status ? 'bg-white text-gray-800 shadow-sm border border-gray-150' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Cleaning Tasks Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-gray-400">
                No active cleaning schedules matching criteria were found.
              </div>
            ) : (
              filteredTasks.map(task => {
                const room = db.rooms.find(r => r.id === task.roomId);
                const housekeeper = db.employees.find(e => e.id === task.housekeeperId);

                return (
                  <div key={task.id} className="bg-gray-50/50 rounded-2xl border border-gray-150 p-4 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-base font-bold text-gray-800">Room {room?.roomNumber}</strong>
                          <span className="text-[10px] text-gray-400 block font-semibold">{room?.building} • {room?.floor}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                          task.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold mt-2.5">
                        <span>Staff: <strong className="text-gray-700">{housekeeper ? `${housekeeper.firstName} ${housekeeper.lastName}` : 'Unassigned'}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/50 flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">Status: <strong className="text-gray-600 uppercase">{task.status}</strong></span>
                      <div className="flex space-x-1.5">
                        {task.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateHKStatus(task.id, 'In Progress')}
                            className="px-2.5 py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-lg cursor-pointer"
                          >
                            Begin Work
                          </button>
                        )}
                        {task.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateHKStatus(task.id, 'Completed')}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}
                        {task.status === 'Completed' && (
                          <button
                            onClick={() => handleUpdateHKStatus(task.id, 'Inspected')}
                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                          >
                            Inspect Pass
                          </button>
                        )}
                        {task.status === 'Inspected' && (
                          <span className="text-green-600 flex items-center">
                            ✓ Certified Clean
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LAUNDRY & LINEN TURNOVER */}
      {activeTab === 'laundry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Laundry form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Log Dry Cleaning / Linen
            </h3>
            <form onSubmit={handleCreateLaundry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room ID (Folio)</label>
                  <input
                    type="text"
                    placeholder="e.g. rm_101"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none"
                    value={laundRoom}
                    onChange={(e) => setLaundRoom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Category</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={laundType}
                    onChange={(e) => setLaundType(e.target.value)}
                  >
                    <option value="Bedding">Bedding/Linens</option>
                    <option value="Towels">Towels</option>
                    <option value="Suits">Suits/Formalwear</option>
                    <option value="Shirts">Shirts/Dryclean</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={laundQty}
                    onChange={(e) => setLaundQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Folio Charge cost ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                    value={laundCost}
                    onChange={(e) => setLaundCost(Number(e.target.value))}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Log Linen Shipment
              </button>
            </form>
          </div>

          {/* Current Active Laundry */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Linen Drycleaning Logs ({db.laundryItems.length})</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {db.laundryItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Linen turnover logs are idle.</p>
              ) : (
                db.laundryItems.map(item => (
                  <div key={item.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 flex items-start justify-between">
                    <div className="text-xs text-gray-500 font-semibold space-y-1">
                      <strong className="text-gray-800 text-sm block">{item.quantity} x {item.itemType}</strong>
                      <span className="block">Folio Assignment: <strong className="text-gray-700">{item.roomId || 'House Stock'}</strong></span>
                      <span className="block">Folio Billing cost: <strong className="text-gray-700">${item.cost}</strong></span>
                      <span className="block font-mono text-[9px] text-gray-400">Date Logged: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="text-right space-y-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                        item.status === 'Received' ? 'bg-gray-100 text-gray-600' :
                        item.status === 'In Progress' ? 'bg-orange-50 text-[#E67E22] border border-orange-100' :
                        item.status === 'Completed' ? 'bg-blue-50 text-[#1B4F72] border border-blue-100' :
                        'bg-green-50 text-green-700 border border-green-100'
                      }`}>
                        {item.status}
                      </span>
                      <div className="flex space-x-1 justify-end">
                        {item.status === 'Received' && (
                          <button
                            onClick={() => handleUpdateLaundryStatus(item.id, 'In Progress')}
                            className="bg-orange-500 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer"
                          >
                            Process
                          </button>
                        )}
                        {item.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateLaundryStatus(item.id, 'Completed')}
                            className="bg-blue-600 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                        {item.status === 'Completed' && (
                          <button
                            onClick={() => handleUpdateLaundryStatus(item.id, 'Delivered')}
                            className="bg-green-600 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer"
                          >
                            Deliver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOST & FOUND CATALOG BOOK */}
      {activeTab === 'lost_found' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Lost & Found Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Catalog Found Asset
            </h3>
            <form onSubmit={handleCreateLostFound} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Asset Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leather wallet with credit cards"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                  value={lfDesc}
                  onChange={(e) => setLfDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Found Location / Area</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym locker room shelf"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                  value={lfLoc}
                  onChange={(e) => setLfLoc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Additional Notes / Safe Box reference</label>
                <textarea
                  rows={2}
                  placeholder="Placed in lobby safe cabinet. Waiting for call..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={lfNotes}
                  onChange={(e) => setLfNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Log Found Asset
              </button>
            </form>
          </div>

          {/* Current Lost & found registry items */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Lost & Found catalog list ({db.lostAndFound.length})</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {db.lostAndFound.map(item => (
                <div key={item.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 flex items-start justify-between">
                  <div className="text-xs text-gray-500 font-semibold space-y-1">
                    <strong className="text-gray-800 text-sm block">{item.description}</strong>
                    <span className="block">Found Area: <strong className="text-gray-700">{item.foundLocation}</strong></span>
                    <span className="block">Date Found: <strong className="text-gray-700">{item.foundDate}</strong></span>
                    {item.notes && <p className="text-[11px] text-[#E67E22] bg-orange-50 border border-orange-100 p-2 rounded-lg mt-2 font-medium">{item.notes}</p>}
                  </div>

                  <div className="text-right space-y-3 shrink-0 pl-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                      item.status === 'Reported' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      {item.status}
                    </span>
                    {item.status === 'Reported' && (
                      <button
                        onClick={() => handleClaimLostFound(item.id)}
                        className="block px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Claim Asset
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FACILITY MAINTENANCE TICKETS */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Maintenance Request Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Open Engineering Work order
            </h3>
            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room ID (If applicable)</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={maintRoomId}
                    onChange={(e) => setMaintRoomId(e.target.value)}
                  >
                    <option value="">-- Choose Room --</option>
                    {db.rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Equipment Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Spa Aircon split"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    value={maintEquip}
                    onChange={(e) => setMaintEquip(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Severity Priority</label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={maintPriority}
                  onChange={(e) => setMaintPriority(e.target.value as any)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Severity</option>
                  <option value="High">Emergency (High)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Problem Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Summarize facility fault or utility problem..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Send Work Order
              </button>
            </form>
          </div>

          {/* Current Active Maintenance Tickets */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Engineering repair orders ({db.maintenanceRequests.length})</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {db.maintenanceRequests.map(req => (
                <div key={req.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 flex items-start justify-between">
                  <div className="text-xs text-gray-500 font-semibold space-y-1">
                    <div className="flex items-center space-x-2">
                      <strong className="text-gray-800 text-sm block">{req.description}</strong>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        req.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {req.priority}
                      </span>
                    </div>
                    {req.roomId && <span className="block">Location: <strong className="text-gray-700">Room {db.rooms.find(r => r.id === req.roomId)?.roomNumber}</strong></span>}
                    {req.equipmentName && <span className="block">Asset Equipment: <strong className="text-gray-700">{req.equipmentName}</strong></span>}
                    <span className="block font-mono text-[9px] text-gray-400">Created: {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="text-right space-y-3 shrink-0 pl-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                      req.status === 'Resolved' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-[#E67E22] border border-orange-100'
                    }`}>
                      {req.status}
                    </span>
                    {req.status !== 'Resolved' && (
                      <div className="flex space-x-1">
                        {req.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateMaintStatus(req.id, 'In Progress')}
                            className="bg-orange-500 text-white font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                          >
                            Dispatch
                          </button>
                        )}
                        {req.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateMaintStatus(req.id, 'Resolved')}
                            className="bg-green-600 text-white font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
