/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { store } from '../db/store';
import { Room, RoomType, RoomStatus, RoomInventoryItem } from '../types';
import { launchPrintPreview, getRoomSelectedReportHTML, getInRoomInventoryStatusReportHTML, getSingleRoomInventoryReportHTML } from '../utils/printService';
import { navigate } from '../utils/router';
import ServiceOrderModal from './ServiceOrderModal';
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
  Trash2,
  Printer,
  ShoppingCart,
  Package,
  ClipboardList,
  RotateCcw,
  Check,
  AlertCircle,
  FileText,
  Edit
} from 'lucide-react';

export default function RoomManagement({ initialTab }: { initialTab?: 'board' | 'setup' | 'types' | 'inventory' } = {}) {
  const [activeTab, setActiveTab] = useState<'board' | 'setup' | 'types' | 'inventory'>(initialTab || 'board');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const db = store.getDb();

  // Selected filters for status board
  const [selectedBuilding, setSelectedBuilding] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Service Order states
  const [isServiceOrderOpen, setIsServiceOrderOpen] = useState<boolean>(false);
  const [serviceOrderRoomNumber, setServiceOrderRoomNumber] = useState<string>('');
  const [serviceOrderReservationId, setServiceOrderReservationId] = useState<string>('');

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

  // Selected Rooms for printing reports
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // ============================================================================
  // ROOM INVENTORY ACTIONS
  // ============================================================================
  const [selectedInventoryRoomId, setSelectedInventoryRoomId] = useState<string | null>(null);
  
  // Modals / Forms state for Room Inventory
  const [isAddAssetOpen, setIsAddAssetOpen] = useState<boolean>(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<RoomInventoryItem | null>(null);

  // Add Asset form values
  const [newAssetName, setNewAssetName] = useState<string>('');
  const [newAssetCategory, setNewAssetCategory] = useState<string>('Minibar');
  const [newAssetQty, setNewAssetQty] = useState<number>(1);
  const [newAssetExpected, setNewAssetExpected] = useState<number>(1);
  const [newAssetProductId, setNewAssetProductId] = useState<string>('');
  const [newAssetNotes, setNewAssetNotes] = useState<string>('');

  // Edit Asset form values
  const [editAssetQty, setEditAssetQty] = useState<number>(0);
  const [editAssetExpected, setEditAssetExpected] = useState<number>(0);
  const [editAssetNotes, setEditAssetNotes] = useState<string>('');
  const [autoBillGuest, setAutoBillGuest] = useState<boolean>(false);
  const [billUnitPrice, setBillUnitPrice] = useState<number>(5);

  // Template duplicate state
  const [isDuplicateTemplateOpen, setIsDuplicateTemplateOpen] = useState<boolean>(false);
  const [sourceRoomId, setSourceRoomId] = useState<string>('');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryRoomId) return;

    const newAsset: RoomInventoryItem = {
      id: `ri_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      roomId: selectedInventoryRoomId,
      productId: newAssetProductId || undefined,
      name: newAssetName,
      category: newAssetCategory,
      quantity: Number(newAssetQty),
      expectedQuantity: Number(newAssetExpected),
      status: Number(newAssetQty) >= Number(newAssetExpected) ? 'In Stock' : (Number(newAssetQty) <= 0 ? 'Missing' : 'Needs Replenishment'),
      notes: newAssetNotes
    };

    store.saveRoomInventoryItem(newAsset);
    
    // Reset form
    setNewAssetName('');
    setNewAssetCategory('Minibar');
    setNewAssetQty(1);
    setNewAssetExpected(1);
    setNewAssetProductId('');
    setNewAssetNotes('');
    setIsAddAssetOpen(false);
  };

  const handleOpenEditAsset = (asset: RoomInventoryItem) => {
    setEditingAsset(asset);
    setEditAssetQty(asset.quantity);
    setEditAssetExpected(asset.expectedQuantity);
    setEditAssetNotes(asset.notes || '');
    setAutoBillGuest(false);
    setBillUnitPrice(5);
    setIsEditAssetOpen(true);
  };

  const handleSaveEditAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !selectedInventoryRoomId) return;

    const diff = editingAsset.quantity - editAssetQty; // Consumed amount
    const activeRoom = db.rooms.find(r => r.id === selectedInventoryRoomId);

    // If consumed & we checked autoBillGuest, post a charge to the active reservation
    if (diff > 0 && autoBillGuest && activeRoom?.currentReservationId) {
      store.addReservationCharge(activeRoom.currentReservationId, {
        description: `Minibar / Room Consumable: ${diff} x ${editingAsset.name}`,
        amount: billUnitPrice,
        quantity: diff,
        category: 'Minibar'
      });
    }

    const updatedAsset: RoomInventoryItem = {
      ...editingAsset,
      quantity: Number(editAssetQty),
      expectedQuantity: Number(editAssetExpected),
      status: Number(editAssetQty) >= Number(editAssetExpected) ? 'In Stock' : (Number(editAssetQty) <= 0 ? 'Missing' : 'Needs Replenishment'),
      notes: editAssetNotes
    };

    store.saveRoomInventoryItem(updatedAsset);
    setIsEditAssetOpen(false);
    setEditingAsset(null);
  };

  const handleReplenishAsset = (asset: RoomInventoryItem, deductCentral: boolean = true) => {
    const replenishQty = asset.expectedQuantity - asset.quantity;
    if (replenishQty <= 0) return;

    if (deductCentral && asset.productId) {
      // Deduct from central stock
      const prod = db.products.find(p => p.id === asset.productId);
      if (prod) {
        prod.currentStock = Math.max(0, prod.currentStock - replenishQty);
        store.addInventoryMovement(asset.productId, replenishQty, 'Out', `Replenished Room ${db.rooms.find(r => r.id === asset.roomId)?.roomNumber}`);
      }
    }

    const updated: RoomInventoryItem = {
      ...asset,
      quantity: asset.expectedQuantity,
      status: 'In Stock',
      notes: `Replenished on ${new Date().toLocaleDateString()}`
    };

    store.saveRoomInventoryItem(updated);
  };

  const handleDuplicateAssets = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryRoomId || !sourceRoomId) return;

    const sourceItems = store.getRoomInventoryItems().filter(i => i.roomId === sourceRoomId);
    if (sourceItems.length === 0) {
      alert('Source room has no inventory assets to duplicate!');
      return;
    }

    // Delete current room assets first to prevent doubling up
    const currentItems = store.getRoomInventoryItems().filter(i => i.roomId === selectedInventoryRoomId);
    currentItems.forEach(item => store.deleteRoomInventoryItem(item.id));

    // Copy source items to current room
    sourceItems.forEach(item => {
      const cloned: RoomInventoryItem = {
        ...item,
        id: `ri_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        roomId: selectedInventoryRoomId,
        notes: `Duplicated from Room ${db.rooms.find(r => r.id === sourceRoomId)?.roomNumber}`
      };
      store.saveRoomInventoryItem(cloned);
    });

    setIsDuplicateTemplateOpen(false);
    setSourceRoomId('');
    alert(`Successfully cloned ${sourceItems.length} inventory templates!`);
  };

  // Selection/Print handlers
  const handleToggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId) 
        : [...prev, roomId]
    );
  };

  const handleSelectAllRooms = (allRooms: Room[]) => {
    const roomIds = allRooms.map(r => r.id);
    const areAllSelected = roomIds.every(id => selectedRoomIds.includes(id));
    if (areAllSelected) {
      setSelectedRoomIds(prev => prev.filter(id => !roomIds.includes(id)));
    } else {
      setSelectedRoomIds(prev => {
        const union = new Set([...prev, ...roomIds]);
        return Array.from(union);
      });
    }
  };

  const handlePrintRoomReport = () => {
    const selectedRooms = db.rooms.filter(r => selectedRoomIds.includes(r.id));
    if (selectedRooms.length === 0) {
      alert("Please select at least one room to print.");
      return;
    }
    const html = getRoomSelectedReportHTML(selectedRooms);
    launchPrintPreview('Room Report', `Selected Room Inventory Report - ${selectedRooms.length} rooms`, html);
  };

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
            onClick={() => navigate('/rooms')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'board'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Visual Status Grid
          </button>
          <button
            onClick={() => navigate('/room-types')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'types'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Categories & Pricing
          </button>
          <button
            onClick={() => navigate('/room-inventory')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            In-Room Inventory
          </button>
          <button
            onClick={() => navigate('/rooms')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Physical Setup Config
          </button>
          
          <button
            onClick={() => {
              setServiceOrderRoomNumber('');
              setServiceOrderReservationId('');
              setIsServiceOrderOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold bg-[#E67E22] hover:bg-[#D35400] text-white rounded-xl transition duration-150 border border-transparent hover:scale-[1.02] cursor-pointer flex items-center space-x-1.5 shadow-md"
            title="Place Room Service or Client Order"
          >
            <ShoppingCart className="h-4 w-4 text-white" />
            <span>Place Client Order</span>
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
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-[11px] font-semibold truncate max-w-[75%]">
                              {guestLabel ? (
                                <span className="flex items-center text-blue-700 font-bold" title={`Guest: ${guestLabel}`}>👤 {guestLabel}</span>
                              ) : (
                                <span className="text-gray-400 font-normal">No active guest</span>
                              )}
                            </div>
                            {guestLabel && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setServiceOrderRoomNumber(rm.roomNumber);
                                  setServiceOrderReservationId(rm.currentReservationId || '');
                                  setIsServiceOrderOpen(true);
                                }}
                                className="p-1 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-lg transition cursor-pointer flex items-center shadow-xs hover:scale-105"
                                title="Place Client Order / Room Service"
                              >
                                <ShoppingCart className="h-3 w-3 text-white" />
                              </button>
                            )}
                          </div>

                          {/* Quick change status tray on hover */}
                          <div className="absolute inset-0 bg-[#1B4F72]/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-center p-2.5 space-y-1 z-10 font-sans">
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
                            <button
                              onClick={() => {
                                setServiceOrderRoomNumber(rm.roomNumber);
                                setServiceOrderReservationId(rm.currentReservationId || '');
                                setIsServiceOrderOpen(true);
                              }}
                              className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white py-1 rounded transition text-center cursor-pointer text-[9px] font-bold flex items-center justify-center gap-1 mt-1 shadow-xs"
                            >
                              <ShoppingCart className="h-3 w-3" /> Place Room Order
                            </button>
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
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base Price / Night ({store.getCurrencySymbol()})</label>
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
            
            {/* Printable Room Report Builder */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-gray-150 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-[#1B4F72] rounded-lg">
                  <Printer className="h-4 w-4" />
                </span>
                <div>
                  <strong className="text-gray-700 block">Room Report Builder</strong>
                  <span className="text-[10px] text-gray-400 font-medium">Select specific rooms from the table below, then compile into a formatted print report.</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllRooms(db.rooms)}
                  className="px-2.5 py-1.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {db.rooms.length > 0 && db.rooms.every(r => selectedRoomIds.includes(r.id)) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintRoomReport}
                  disabled={selectedRoomIds.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                    selectedRoomIds.length > 0
                      ? 'bg-[#1B4F72] hover:bg-[#153E5B] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" /> Print Selected ({selectedRoomIds.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                        checked={db.rooms.length > 0 && db.rooms.every(r => selectedRoomIds.includes(r.id))}
                        onChange={() => handleSelectAllRooms(db.rooms)}
                      />
                    </th>
                    <th className="py-2.5 px-3">Room Number</th>
                    <th className="py-2.5 px-3">Building / Floor</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Current Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {db.rooms.map(rm => {
                    const typeObj = db.roomTypes.find(t => t.id === rm.roomTypeId);
                    const isSelected = selectedRoomIds.includes(rm.id);
                    return (
                      <tr key={rm.id} className={`hover:bg-gray-50/50 ${isSelected ? 'bg-blue-50/20' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                            checked={isSelected}
                            onChange={() => handleToggleRoomSelection(rm.id)}
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-gray-800 text-sm">Room {rm.roomNumber}</td>
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
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setServiceOrderRoomNumber(rm.roomNumber);
                                setServiceOrderReservationId(rm.currentReservationId || '');
                                setIsServiceOrderOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100 cursor-pointer"
                              title="Place Room Order"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(rm.id)}
                              className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      {/* TAB 4: IN-ROOM INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {!selectedInventoryRoomId ? (
            /* Sub-tab main screen: Room Inventory Status Board */
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold text-gray-800 flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span>In-Room Inventory Status Board</span>
                  </h2>
                  <p className="text-xs text-gray-400">Track and replenish minibar stock, luxury linens, bath towels, and essential amenities across all rooms.</p>
                </div>
                <button
                  onClick={() => {
                    const reportHtml = getInRoomInventoryStatusReportHTML(db);
                    launchPrintPreview("Inventory Report", "In-Room Inventory Audit Checklist", reportHtml);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl transition duration-150 flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print In-Room Audit Checklist</span>
                </button>
              </div>

              {/* Room Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {db.rooms.map(rm => {
                  const roomItems = store.getRoomInventoryItems().filter(item => item.roomId === rm.id);
                  const totalItems = roomItems.length;
                  const needsRep = roomItems.filter(item => item.status === 'Needs Replenishment').length;
                  const missing = roomItems.filter(item => item.status === 'Missing').length;
                  const inStock = roomItems.filter(item => item.status === 'In Stock').length;

                  let cardBorder = "border-gray-150 hover:border-gray-250";
                  if (missing > 0) {
                    cardBorder = "border-red-200 hover:border-red-300 bg-red-50/5";
                  } else if (needsRep > 0) {
                    cardBorder = "border-amber-200 hover:border-amber-300 bg-amber-50/5";
                  } else if (totalItems > 0) {
                    cardBorder = "border-emerald-100 hover:border-emerald-250 bg-emerald-50/5";
                  }

                  return (
                    <div
                      key={rm.id}
                      className={`p-4 rounded-xl border transition duration-150 flex flex-col justify-between space-y-4 shadow-3xs bg-white ${cardBorder}`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-base font-black text-gray-800">Room {rm.roomNumber}</span>
                            <span className="block text-[10px] text-gray-400 font-medium">{rm.building} • {rm.floor}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rm.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-100' :
                            rm.status === 'Occupied' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {rm.status}
                          </span>
                        </div>

                        {/* Inventory summary counts */}
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                          <div className="flex justify-between text-[11px] font-medium text-gray-500">
                            <span>Registered Assets:</span>
                            <span className="font-bold text-gray-700">{totalItems}</span>
                          </div>
                          {totalItems > 0 ? (
                            <div className="grid grid-cols-3 gap-1 pt-1">
                              <div className="bg-emerald-50 text-emerald-700 text-[10px] p-1 rounded text-center font-bold">
                                <div>{inStock}</div>
                                <div className="text-[8px] font-normal uppercase">OK</div>
                              </div>
                              <div className={`${needsRep > 0 ? 'bg-amber-50 text-amber-700 font-bold' : 'bg-gray-50 text-gray-400'} text-[10px] p-1 rounded text-center font-bold`}>
                                <div>{needsRep}</div>
                                <div className="text-[8px] font-normal uppercase">Low</div>
                              </div>
                              <div className={`${missing > 0 ? 'bg-red-50 text-red-700 font-bold' : 'bg-gray-50 text-gray-400'} text-[10px] p-1 rounded text-center font-bold`}>
                                <div>{missing}</div>
                                <div className="text-[8px] font-normal uppercase">Miss</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2 text-[10px] text-gray-400 bg-gray-50 rounded">
                              No inventory assigned.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1">
                        <button
                          onClick={() => setSelectedInventoryRoomId(rm.id)}
                          className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-150 text-gray-700 font-bold text-[11px] rounded-lg border border-gray-200 transition cursor-pointer text-center"
                        >
                          Manage Inventory
                        </button>
                        {totalItems > 0 && (
                          <button
                            onClick={() => {
                              const reportHtml = getSingleRoomInventoryReportHTML(db, rm);
                              launchPrintPreview("Inventory Report", `Room ${rm.roomNumber} Inventory Report`, reportHtml);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg cursor-pointer"
                            title="Print Room Checklist"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Sub-tab detail screen: Manage single Room Inventory */
            (() => {
              const currentRoom = db.rooms.find(r => r.id === selectedInventoryRoomId);
              if (!currentRoom) return null;

              const roomItems = store.getRoomInventoryItems().filter(item => item.roomId === selectedInventoryRoomId);
              
              const totalItems = roomItems.length;
              const needsRep = roomItems.filter(item => item.status === 'Needs Replenishment').length;
              const missing = roomItems.filter(item => item.status === 'Missing').length;
              const inStock = roomItems.filter(item => item.status === 'In Stock').length;

              const activeReservation = db.reservations.find(res => res.roomId === selectedInventoryRoomId && (res.status === 'Checked In' || res.status === 'Confirmed'));
              const activeGuest = activeReservation ? db.guests.find(g => g.id === activeReservation.guestId) : null;

              return (
                <div className="space-y-6">
                  {/* Detail header */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedInventoryRoomId(null)}
                        className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition cursor-pointer border border-gray-250 font-bold text-xs"
                      >
                        ← Back to Rooms
                      </button>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                          <span>Room {currentRoom.roomNumber} Inventory Checklist</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            currentRoom.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-100' :
                            currentRoom.status === 'Occupied' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {currentRoom.status}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400">{currentRoom.building} • {currentRoom.floor} • {db.roomTypes.find(t => t.id === currentRoom.roomTypeId)?.name}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setIsAddAssetOpen(true)}
                        className="px-3.5 py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold text-xs rounded-xl transition duration-150 flex items-center space-x-1 shadow-sm cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Asset Item</span>
                      </button>

                      <button
                        onClick={() => setIsDuplicateTemplateOpen(true)}
                        className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition border border-gray-150 flex items-center space-x-1 shadow-sm cursor-pointer"
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                        <span>Duplicate Template From Room</span>
                      </button>

                      <button
                        onClick={() => {
                          const reportHtml = getSingleRoomInventoryReportHTML(db, currentRoom);
                          launchPrintPreview("Inventory Report", `Room ${currentRoom.roomNumber} Inventory`, reportHtml);
                        }}
                        className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl transition border border-gray-250 flex items-center space-x-1 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print Sheet</span>
                      </button>
                    </div>
                  </div>

                  {/* Room occupier and totals */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                      {/* Active Guest Card */}
                      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Occupancy</h3>
                        {activeGuest && activeReservation ? (
                          <div className="space-y-2">
                            <span className="block font-bold text-gray-800 text-sm">{activeGuest.firstName} {activeGuest.lastName}</span>
                            <span className="block text-[11px] text-gray-500">Check In: <strong className="text-gray-700">{activeReservation.checkInDate}</strong></span>
                            <span className="block text-[11px] text-gray-500">Check Out: <strong className="text-gray-700">{activeReservation.checkOutDate}</strong></span>
                            <span className="block text-[10px] text-blue-600 font-bold uppercase bg-blue-50 px-2 py-1 rounded inline-block mt-2">
                              Guest Bill ID: {activeReservation.id}
                            </span>
                          </div>
                        ) : (
                          <div className="py-4 text-center text-xs text-gray-400 italic bg-gray-50 rounded">
                            No active guest checked in.
                          </div>
                        )}
                      </div>

                      {/* Quick totals */}
                      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs space-y-2.5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventory Quality</h3>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 font-medium">Total Registered:</span>
                          <span className="font-bold text-gray-800">{totalItems} items</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-600 font-medium">In Stock (OK):</span>
                          <span className="font-bold text-green-700">{inStock}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-600 font-medium">Low (Replenish):</span>
                          <span className="font-bold text-amber-700">{needsRep}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-600 font-medium">Missing:</span>
                          <span className="font-bold text-red-700">{missing}</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3">
                      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                          <span className="font-bold text-xs text-gray-700">Room Assets Checklist</span>
                          <span className="text-[10px] text-gray-400">Updates sync in real-time to front desk checkouts</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 px-3">Asset Item</th>
                                <th className="py-2.5 px-3">Category</th>
                                <th className="py-2.5 px-3 text-center">Qty / Expected</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Notes</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {roomItems.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-10 text-center text-xs text-gray-400 bg-white">
                                    No assets mapped to this room yet. Add items or click "Duplicate Template" to get started!
                                  </td>
                                </tr>
                              ) : (
                                roomItems.map(item => (
                                  <tr key={item.id} className="hover:bg-gray-50/50 bg-white">
                                    <td className="py-3 px-3 bg-white">
                                      <div className="font-semibold text-gray-800">{item.name}</div>
                                      {item.productId && (
                                        <div className="text-[9px] text-gray-400 font-mono">Linked Central ID: {item.productId}</div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 bg-white">
                                      <span className="text-gray-600 text-[11px] bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                                        {item.category}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-bold bg-white">
                                      <span className={item.quantity < item.expectedQuantity ? 'text-red-500' : 'text-gray-700'}>
                                        {item.quantity}
                                      </span>
                                      <span className="text-gray-400 font-normal"> / {item.expectedQuantity}</span>
                                    </td>
                                    <td className="py-3 px-3 bg-white">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.status === 'In Stock' ? 'bg-green-50 text-green-700 border border-green-100' :
                                        item.status === 'Needs Replenishment' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                        'bg-red-50 text-red-700 border border-red-100'
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-gray-500 text-[11px] max-w-[150px] truncate bg-white" title={item.notes}>
                                      {item.notes || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-right bg-white">
                                      <div className="flex items-center justify-end space-x-1 bg-white">
                                        {item.quantity < item.expectedQuantity && (
                                          <button
                                            onClick={() => handleReplenishAsset(item, true)}
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded font-bold text-[10px] cursor-pointer"
                                            title="Replenish from Central Warehouse"
                                          >
                                            Replenish
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleOpenEditAsset(item)}
                                          className="text-gray-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded cursor-pointer"
                                          title="Edit Count / Post Charge"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`Remove asset "${item.name}" from Room ${currentRoom.roomNumber}?`)) {
                                              store.deleteRoomInventoryItem(item.id);
                                            }
                                          }}
                                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded cursor-pointer"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* MODAL: ADD ASSET ITEM */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-bold text-sm text-gray-800">Add In-Room Asset Item</span>
              <button onClick={() => setIsAddAssetOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black cursor-pointer">×</button>
            </div>
            <form onSubmit={handleAddAsset} className="p-5 space-y-4 bg-white">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Link Central Stock Product (Optional)</label>
                <select
                  value={newAssetProductId}
                  onChange={(e) => {
                    const prodId = e.target.value;
                    setNewAssetProductId(prodId);
                    if (prodId) {
                      const prod = db.products.find(p => p.id === prodId);
                      if (prod) {
                        setNewAssetName(prod.name);
                        setNewAssetCategory(prod.category === 'Linen' ? 'Linen' : (prod.category === 'Amenities' ? 'Amenities' : 'Minibar'));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Custom Item (Unlinked) --</option>
                  {db.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category} - Stock: {p.currentStock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scented Soap, Coca-Cola Can, Hairdryer"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newAssetCategory}
                    onChange={(e) => setNewAssetCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                  >
                    <option value="Minibar">Minibar</option>
                    <option value="Linen">Linen</option>
                    <option value="Toiletries">Toiletries</option>
                    <option value="Amenities">Amenities</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expected / Standard Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAssetExpected}
                    onChange={(e) => {
                      setNewAssetExpected(Number(e.target.value));
                      setNewAssetQty(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Quantity on Hand</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newAssetQty}
                  onChange={(e) => setNewAssetQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Expiring soon, Checked on Monday"
                  value={newAssetNotes}
                  onChange={(e) => setNewAssetNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAssetOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-250 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#E67E22] hover:bg-[#D35400] rounded-lg transition cursor-pointer shadow-sm"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / VERIFY ASSET PHYSICAL COUNT */}
      {isEditAssetOpen && editingAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-bold text-sm text-gray-800">Verify / Edit Physical Count</span>
              <button onClick={() => setIsEditAssetOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSaveEditAsset} className="p-5 space-y-4 bg-white">
              <div>
                <span className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Asset Item</span>
                <span className="block text-sm font-bold text-gray-800">{editingAsset.name} ({editingAsset.category})</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expected Standard</label>
                  <input
                    type="number"
                    disabled
                    value={editAssetExpected}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Physical Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editAssetQty}
                    onChange={(e) => setEditAssetQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Consumption / Billing Trigger */}
              {editingAsset.quantity > editAssetQty && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-amber-800">Consumption Detected!</span>
                      <p className="text-[10px] text-amber-600">Physical count dropped by {editingAsset.quantity - editAssetQty} items.</p>
                    </div>
                  </div>

                  {(() => {
                    const activeRoom = db.rooms.find(r => r.id === selectedInventoryRoomId);
                    const activeRes = activeRoom?.currentReservationId;
                    if (activeRes) {
                      return (
                        <div className="space-y-2 pt-1 border-t border-amber-100">
                          <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoBillGuest}
                              onChange={(e) => setAutoBillGuest(e.target.checked)}
                              className="rounded text-amber-600 border-gray-300 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span>Bill checked-in guest's room?</span>
                          </label>

                          {autoBillGuest && (
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Price per item:</span>
                              <div className="relative w-20">
                                <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-bold">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={billUnitPrice}
                                  onChange={(e) => setBillUnitPrice(Number(e.target.value))}
                                  className="w-full pl-6 pr-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-[9px] text-gray-400 italic">No guest checked in to bill for consumption.</p>
                      );
                    }
                  })()}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes / Observations</label>
                <input
                  type="text"
                  placeholder="e.g. Minibar soda consumed, Linen needs cleaning"
                  value={editAssetNotes}
                  onChange={(e) => setEditAssetNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditAssetOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-250 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#E67E22] hover:bg-[#D35400] rounded-lg transition cursor-pointer shadow-sm"
                >
                  Update & Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DUPLICATE TEMPLATE FROM OTHER ROOM */}
      {isDuplicateTemplateOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-bold text-sm text-gray-800">Duplicate Room Asset Template</span>
              <button onClick={() => setIsDuplicateTemplateOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black cursor-pointer">×</button>
            </div>
            <form onSubmit={handleDuplicateAssets} className="p-5 space-y-4 bg-white">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 text-[11px] leading-relaxed">
                Copying assets will replace all current inventory items in Room <strong>{db.rooms.find(r => r.id === selectedInventoryRoomId)?.roomNumber}</strong> with the asset checklist of the source room.
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Source Room Template</label>
                <select
                  required
                  value={sourceRoomId}
                  onChange={(e) => setSourceRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs"
                >
                  <option value="">-- Choose Room with Assets --</option>
                  {db.rooms
                    .filter(r => r.id !== selectedInventoryRoomId)
                    .map(r => {
                      const count = store.getRoomInventoryItems().filter(item => item.roomId === r.id).length;
                      return (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} ({count} assets mapped)
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDuplicateTemplateOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-250 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!sourceRoomId}
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#1B4F72] hover:bg-[#153E5B] disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition cursor-pointer shadow-sm"
                >
                  Clone Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE ORDER BUILDER MODAL */}
      <ServiceOrderModal
        isOpen={isServiceOrderOpen}
        onClose={() => setIsServiceOrderOpen(false)}
        targetRoomNumber={serviceOrderRoomNumber}
        targetReservationId={serviceOrderReservationId}
      />

    </div>
  );
}
