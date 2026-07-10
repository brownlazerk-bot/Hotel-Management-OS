/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { Room, RoomType, RoomStatus } from '../types';
import {
  Grid,
  Settings,
  Plus,
  Compass,
  DollarSign,
  PenTool,
  CheckCircle,
  AlertTriangle,
  Flame,
  Wrench,
  Activity,
  Trash2
} from 'lucide-react';

export default function RoomManagement() {
  const [activeTab, setActiveTab] = useState<'board' | 'setup' | 'types'>('board');
  const db = store.getDb();

  // Selected filters for status board
  const [selectedBuilding, setSelectedBuilding] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Dialog/Modal configurations
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // Room Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomBuilding, setRoomBuilding] = useState('');
  const [roomFloor, setRoomFloor] = useState('');
  const [roomStatusState, setRoomStatusState] = useState<RoomStatus>('Available');

  // Room Type Form State
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [typePrice, setTypePrice] = useState<number>(100);
  const [typeCap, setTypeCap] = useState<number>(2);
  const [typeAmenities, setTypeAmenities] = useState<string>('Wi-Fi, Air Conditioning');

  // ============================================================================
  // CALCULATIONS & FILTERS
  // ============================================================================
  const filteredRooms = useMemo(() => {
    return db.rooms.filter(r => {
      const bMatch = selectedBuilding === 'All' || r.building === selectedBuilding;
      const sMatch = selectedStatus === 'All' || r.status === selectedStatus;
      return bMatch && sMatch;
    });
  }, [db, selectedBuilding, selectedStatus]);

  // Group rooms by floors for the visual dashboard layout
  const roomsByFloor = useMemo(() => {
    const groups: { [floor: string]: Room[] } = {};
    db.settings.structure.floors.forEach(f => {
      groups[f] = [];
    });
    // Append safety bucket for unspecified floors
    filteredRooms.forEach(r => {
      if (!groups[r.floor]) {
        groups[r.floor] = [];
      }
      groups[r.floor].push(r);
    });
    return groups;
  }, [db, filteredRooms]);

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !roomTypeId || !roomBuilding || !roomFloor) return;

    const room: Room = {
      id: `rm_${roomNumber}`,
      roomNumber,
      roomTypeId,
      building: roomBuilding,
      floor: roomFloor,
      status: roomStatusState
    };

    store.saveRoom(room);
    setIsRoomModalOpen(false);
    setRoomNumber('');
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName || typePrice <= 0) return;

    const rt: RoomType = {
      id: `rt_${typeName.toLowerCase().replace(/\s+/g, '_')}`,
      name: typeName,
      description: typeDesc,
      basePrice: typePrice,
      capacity: typeCap,
      amenities: typeAmenities.split(',').map(a => a.trim()).filter(a => a.length > 0)
    };

    store.saveRoomType(rt);
    setIsTypeModalOpen(false);
    setTypeName('');
    setTypeDesc('');
    setTypePrice(100);
  };

  const handleDeleteRoom = (id: string) => {
    const res = store.deleteRoom(id);
    if (!res.success) {
      alert(res.error);
    }
  };

  const handleDeleteRoomType = (id: string) => {
    const res = store.deleteRoomType(id);
    if (!res.success) {
      alert(res.error);
    }
  };

  const handleQuickStatusChange = (roomId: string, status: RoomStatus) => {
    const room = db.rooms.find(r => r.id === roomId);
    if (room) {
      const updated = { ...room, status };
      store.saveRoom(updated);
      
      // If manually set to dirty, trigger cleaning task
      if (status === 'Dirty') {
        store.createHousekeepingTask(roomId, 'Medium');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-[#1B4F72] rounded-xl">
            <Grid className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Room Inventory Board</h1>
            <p className="text-xs text-gray-400">Map out physical room states, pricing plans, amenities, and floor allocations.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'board'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Visual Status Grid
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'types'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Categories & Pricing
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Physical Setup Config
          </button>
        </div>
      </div>

      {/* TAB 1: VISUAL ROOM STATUS MAP */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Filters Area */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
            <div className="flex items-center space-x-4">
              {/* Building filter */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Filter Building</span>
                <select
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  <option value="All">All Buildings</option>
                  {db.settings.structure.buildings.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Filter Status</span>
                <select
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  {['Available', 'Occupied', 'Reserved', 'Dirty', 'Cleaning', 'Maintenance'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary status pills */}
            <div className="flex space-x-2 text-[10px] font-bold">
              <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-100 flex items-center">
                ● Available ({db.rooms.filter(r => r.status === 'Available').length})
              </span>
              <span className="bg-blue-50 text-[#1B4F72] px-2 py-1 rounded-lg border border-blue-100 flex items-center">
                ● Occupied ({db.rooms.filter(r => r.status === 'Occupied').length})
              </span>
              <span className="bg-orange-50 text-[#E67E22] px-2 py-1 rounded-lg border border-orange-100 flex items-center">
                ● Dirty ({db.rooms.filter(r => r.status === 'Dirty').length})
              </span>
              <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg border border-red-100 flex items-center">
                ● Maintenance ({db.rooms.filter(r => r.status === 'Maintenance').length})
              </span>
            </div>
          </div>

          {/* Visual Grid mapped by Floor */}
          <div className="space-y-6">
            {Object.keys(roomsByFloor).map(floor => {
              const roomsOnFloor = roomsByFloor[floor] || [];
              if (roomsOnFloor.length === 0) return null;

              return (
                <div key={floor} className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-[#1B4F72] uppercase tracking-wider">{floor}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{roomsOnFloor.length} rooms mapped</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {roomsOnFloor.map(rm => {
                      const typeObj = db.roomTypes.find(t => t.id === rm.roomTypeId);
                      
                      // Find current guest name if occupied
                      let guestLabel = '';
                      if (rm.status === 'Occupied' && rm.currentReservationId) {
                        const res = db.reservations.find(r => r.id === rm.currentReservationId);
                        const gst = res ? db.guests.find(g => g.id === res.guestId) : null;
                        if (gst) guestLabel = `${gst.lastName}`;
                      }

                      return (
                        <div
                          key={rm.id}
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between h-28 shadow-sm transition hover:shadow-md cursor-default group relative ${
                            rm.status === 'Available' ? 'bg-green-50/50 border-green-200 text-green-800' :
                            rm.status === 'Occupied' ? 'bg-blue-50/50 border-blue-200 text-[#1B4F72]' :
                            rm.status === 'Reserved' ? 'bg-purple-50/50 border-purple-200 text-purple-800' :
                            rm.status === 'Dirty' ? 'bg-[#FFF5EB] border-[#FFE8D1] text-[#D35400]' :
                            rm.status === 'Cleaning' ? 'bg-yellow-50/50 border-yellow-200 text-yellow-800' :
                            'bg-red-50/50 border-red-200 text-red-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-base font-bold tracking-tight">{rm.roomNumber}</span>
                              <span className="text-[9px] font-mono tracking-wide bg-white/70 border px-1 rounded uppercase">
                                {rm.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium block mt-1 truncate">{typeObj?.name}</span>
                          </div>

                          {/* Occupying guest description or status */}
                          <div className="text-[11px] font-semibold mt-2 truncate">
                            {guestLabel ? (
                              <span className="flex items-center text-blue-700">👤 Guest: {guestLabel}</span>
                            ) : (
                              <span className="text-gray-400 font-normal">No active guest</span>
                            )}
                          </div>

                          {/* Quick change status tray on hover */}
                          <div className="absolute inset-0 bg-[#1B4F72]/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-center p-2.5 space-y-1 z-10">
                            <span className="text-[9px] text-gray-300 font-bold block text-center uppercase tracking-wider mb-0.5">Quick Actions</span>
                            <div className="grid grid-cols-2 gap-1 text-[9px] font-bold">
                              <button
                                onClick={() => handleQuickStatusChange(rm.id, 'Available')}
                                className="bg-white/10 hover:bg-white/20 text-white p-1 rounded transition text-center cursor-pointer"
                              >
                                Clean/Avail
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(rm.id, 'Dirty')}
                                className="bg-white/10 hover:bg-white/20 text-white p-1 rounded transition text-center cursor-pointer"
                              >
                                Set Dirty
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(rm.id, 'Maintenance')}
                                className="bg-white/10 hover:bg-white/20 text-white p-1 rounded transition text-center cursor-pointer"
                              >
                                Set Maint
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(rm.id, 'Cleaning')}
                                className="bg-white/10 hover:bg-white/20 text-white p-1 rounded transition text-center cursor-pointer"
                              >
                                Set Cleaning
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ROOM TYPES & CONFIG */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form to Append New Room Category */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Create Room Category
            </h3>
            <form onSubmit={handleSaveRoomType} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Ocean Suite"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Summarize visual and layout themes..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base Price / Night ($)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={typePrice}
                    onChange={(e) => setTypePrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={typeCap}
                    onChange={(e) => setTypeCap(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Included Amenities (Comma list)</label>
                <input
                  type="text"
                  placeholder="Wi-Fi, Jacuzzi, Balcony, Safe"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={typeAmenities}
                  onChange={(e) => setTypeAmenities(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Register Room Category
              </button>
            </form>
          </div>

          {/* Table display of current categories */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Configured Room Categories ({db.roomTypes.length})</h3>
            <div className="space-y-4 overflow-y-auto max-h-[500px]">
              {db.roomTypes.map(rt => {
                const linkCount = db.rooms.filter(r => r.roomTypeId === rt.id).length;
                return (
                  <div key={rt.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 flex justify-between items-start">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <strong className="text-gray-800 text-sm">{rt.name}</strong>
                        <span className="bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-100 px-2 py-0.5 rounded">
                          {linkCount} Linked Rooms
                        </span>
                      </div>
                      <p className="text-gray-500 leading-normal">{rt.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {rt.amenities.map(a => (
                          <span key={a} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded">
                            ✓ {a}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right space-y-3 shrink-0 pl-4">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Base Rate</span>
                        <strong className="text-lg font-bold text-gray-800">${rt.basePrice}/night</strong>
                      </div>
                      <button
                        onClick={() => handleDeleteRoomType(rt.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg border border-red-200 hover:bg-red-50 cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL ROOM MAPPING SETUP */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New Room Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Deploy New Room Entry
            </h3>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 203B, 405"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room Category</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {db.roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name} (${rt.basePrice}/night)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Building</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={roomBuilding}
                    onChange={(e) => setRoomBuilding(e.target.value)}
                  >
                    <option value="">-- Choose Wing --</option>
                    {db.settings.structure.buildings.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Floor Level</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                  >
                    <option value="">-- Choose Floor --</option>
                    {db.settings.structure.floors.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Initial Status</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={roomStatusState}
                  onChange={(e) => setRoomStatusState(e.target.value as any)}
                >
                  <option value="Available">Available</option>
                  <option value="Dirty">Dirty</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Deploy Room Entry
              </button>
            </form>
          </div>

          {/* Rooms Inventory List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">All Deployed Room Inventory ({db.rooms.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Room Number</th>
                    <th className="py-2.5 px-3">Building / Floor</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Current Status</th>
                    <th className="py-2.5 px-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {db.rooms.map(rm => {
                    const typeObj = db.roomTypes.find(t => t.id === rm.roomTypeId);
                    return (
                      <tr key={rm.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-gray-800 text-sm">{rm.roomNumber}</td>
                        <td className="py-3 px-3 text-gray-600">
                          <span className="block font-semibold">{rm.building}</span>
                          <span className="text-[10px] text-gray-400">{rm.floor}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-700">{typeObj?.name}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rm.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-100' :
                            rm.status === 'Occupied' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            rm.status === 'Reserved' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            rm.status === 'Dirty' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                            rm.status === 'Cleaning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {rm.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteRoom(rm.id)}
                            className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
