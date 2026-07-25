/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { store } from '../db/store';
import { Guest, Reservation, Room, PaymentMethod, ReservationStatus } from '../types';
import { launchPrintPreview, getCheckoutInvoiceHTML, getFrontDeskSelectedReportHTML } from '../utils/printService';
import { navigate } from '../utils/router';
import ServiceOrderModal from './ServiceOrderModal';
import {
  Users,
  Calendar,
  Check,
  Plus,
  ArrowLeftRight,
  FileText,
  Printer,
  ChevronRight,
  Trash2,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';

export default function FrontOffice({ initialTab }: { initialTab?: 'bookings' | 'guests' | 'new_booking' } = {}) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'guests' | 'new_booking'>(initialTab || 'bookings');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const db = store.getDb();

  // Selected state for dialogs / secondary forms
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);

  // Service Order states
  const [isServiceOrderOpen, setIsServiceOrderOpen] = useState<boolean>(false);
  const [serviceOrderRoomNumber, setServiceOrderRoomNumber] = useState<string>('');
  const [serviceOrderReservationId, setServiceOrderReservationId] = useState<string>('');
  const [transferRoomId, setTransferRoomId] = useState<string>('');

  // Extra dynamic charges & payment states for guest bill ledger in real-time
  const [extraChargeDesc, setExtraChargeDesc] = useState('');
  const [extraChargeAmount, setExtraChargeAmount] = useState<number>(0);
  const [extraChargeQty, setExtraChargeQty] = useState<number>(1);
  const [extraChargeCat, setExtraChargeCat] = useState<'Room' | 'Minibar' | 'Laundry' | 'Dining' | 'Spa' | 'Other'>('Other');
  
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payRef, setPayRef] = useState('');

  // Selected Booking IDs for printing reports
  const [selectedReservationIds, setSelectedReservationIds] = useState<string[]>([]);

  // Selection/Print handlers
  const handleToggleReservationSelection = (resId: string) => {
    setSelectedReservationIds(prev => 
      prev.includes(resId) 
        ? prev.filter(id => id !== resId) 
        : [...prev, resId]
    );
  };

  const handleSelectAllReservations = (allReservations: Reservation[]) => {
    const resIds = allReservations.map(r => r.id);
    const areAllSelected = resIds.every(id => selectedReservationIds.includes(id));
    if (areAllSelected) {
      setSelectedReservationIds(prev => prev.filter(id => !resIds.includes(id)));
    } else {
      setSelectedReservationIds(prev => {
        const union = new Set([...prev, ...resIds]);
        return Array.from(union);
      });
    }
  };

  const handlePrintFrontDeskReport = () => {
    const selectedReservations = db.reservations.filter(r => selectedReservationIds.includes(r.id));
    if (selectedReservations.length === 0) {
      alert("Please select at least one booking to print.");
      return;
    }
    const html = getFrontDeskSelectedReportHTML(selectedReservations);
    launchPrintPreview('Front Office Report', `Selected Bookings Ledger - ${selectedReservations.length} items`, html);
  };

  // ============================================================================
  // TAB 1: BOOKINGS LIST & CONTROL
  // ============================================================================
  const [bookingFilter, setBookingFilter] = useState<ReservationStatus | 'All'>('All');
  const [searchBooking, setSearchBooking] = useState('');

  const filteredBookings = useMemo(() => {
    return db.reservations.filter(res => {
      const guest = db.guests.find(g => g.id === res.guestId);
      const room = db.rooms.find(r => r.id === res.roomId);
      const guestName = `${guest?.firstName || ''} ${guest?.lastName || ''}`.toLowerCase();
      const matchesSearch = guestName.includes(searchBooking.toLowerCase()) || (room?.roomNumber || '').includes(searchBooking);
      const matchesFilter = bookingFilter === 'All' || res.status === bookingFilter;
      return matchesSearch && matchesFilter;
    });
  }, [db, bookingFilter, searchBooking]);

  const handleCheckIn = (resId: string) => {
    store.performCheckIn(resId);
    setSelectedRes(null);
  };

  const handleCheckOut = (resId: string, method: PaymentMethod) => {
    store.performCheckOut(resId, method);
    setSelectedRes(null);
  };

  const handleRoomTransfer = (resId: string) => {
    if (!transferRoomId) return;
    const resObj = store.performRoomTransfer(resId, transferRoomId);
    if (resObj.success) {
      setIsTransferOpen(false);
      setSelectedRes(null);
      setTransferRoomId('');
    } else {
      alert(resObj.error || 'Failed to transfer room');
    }
  };

  const handleAddFolioCharge = (e: React.FormEvent, resId: string) => {
    e.preventDefault();
    if (!extraChargeDesc || extraChargeAmount <= 0 || extraChargeQty <= 0) return;
    store.addReservationCharge(resId, {
      description: extraChargeDesc,
      amount: extraChargeAmount,
      quantity: extraChargeQty,
      category: extraChargeCat
    });
    // Sync local selectedRes so the UI updates
    const updated = store.getDb().reservations.find(r => r.id === resId);
    if (updated) setSelectedRes(updated);

    // Reset fields
    setExtraChargeDesc('');
    setExtraChargeAmount(0);
    setExtraChargeQty(1);
    setExtraChargeCat('Other');
  };

  const handlePostFolioPayment = (e: React.FormEvent, resId: string) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    store.postReservationPayment(resId, payAmount, payMethod, payRef);
    // Sync local selectedRes so the UI updates
    const updated = store.getDb().reservations.find(r => r.id === resId);
    if (updated) setSelectedRes(updated);

    // Reset fields
    setPayAmount(0);
    setPayRef('');
  };

  // ============================================================================
  // TAB 2: GUEST DIRECTORY
  // ============================================================================
  const [searchGuest, setSearchGuest] = useState('');
  const [newGuestFirstName, setNewGuestFirstName] = useState('');
  const [newGuestLastName, setNewGuestLastName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestDocType, setNewGuestDocType] = useState('Passport');
  const [newGuestDocNum, setNewGuestDocNum] = useState('');
  const [newGuestCountry, setNewGuestCountry] = useState('United States');
  const [newGuestAddress, setNewGuestAddress] = useState('');
  const [newGuestNotes, setNewGuestNotes] = useState('');

  const filteredGuests = useMemo(() => {
    return db.guests.filter(g =>
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(searchGuest.toLowerCase()) ||
      g.email.toLowerCase().includes(searchGuest.toLowerCase())
    );
  }, [db, searchGuest]);

  const handleRegisterGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestFirstName || !newGuestLastName || !newGuestEmail) return;

    const guest: Guest = {
      id: `gst_${Date.now()}`,
      firstName: newGuestFirstName,
      lastName: newGuestLastName,
      email: newGuestEmail,
      phone: newGuestPhone,
      idDocumentType: newGuestDocType,
      idDocumentNumber: newGuestDocNum,
      address: newGuestAddress,
      country: newGuestCountry,
      notes: newGuestNotes
    };

    store.saveGuest(guest);
    
    // Clear inputs
    setNewGuestFirstName('');
    setNewGuestLastName('');
    setNewGuestEmail('');
    setNewGuestPhone('');
    setNewGuestDocNum('');
    setNewGuestAddress('');
    setNewGuestNotes('');
    navigate('/reservations');
  };

  // ============================================================================
  // TAB 3: NEW BOOKING WIZARD & WALK-INS
  // ============================================================================
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [numGuests, setNumGuests] = useState(1);
  const [downpayment, setDownpayment] = useState<number>(0);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);

  // Available Rooms lookup for dates
  const availableRooms = useMemo(() => {
    return db.rooms.filter(r => r.status === 'Available');
  }, [db]);

  const calculatedTotal = useMemo(() => {
    if (!selectedRoomId || !checkInDate || !checkOutDate) return 0;
    const room = db.rooms.find(r => r.id === selectedRoomId);
    if (!room) return 0;
    const type = db.roomTypes.find(t => t.id === room.roomTypeId);
    if (!type) return 0;

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays * type.basePrice : 0;
  }, [db, selectedRoomId, checkInDate, checkOutDate]);

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuestId || !selectedRoomId || !checkInDate || !checkOutDate) return;

    const resId = `res_${Date.now()}`;
    const reservation: Reservation = {
      id: resId,
      guestId: selectedGuestId,
      roomId: selectedRoomId,
      checkInDate,
      checkOutDate,
      numberOfGuests: numGuests,
      totalAmount: calculatedTotal,
      amountPaid: isWalkIn ? calculatedTotal : downpayment,
      status: isWalkIn ? 'Checked In' : 'Confirmed',
      notes: bookingNotes,
      createdAt: new Date().toISOString()
    };

    store.saveReservation(reservation);

    // If downpayment / upfront payout is made, register ledger entry
    const upfront = isWalkIn ? calculatedTotal : downpayment;
    if (upfront > 0) {
      store.addFinanceTransaction(
        'acc_2', // main bank account
        'Income',
        upfront,
        'Room Revenue',
        `Upfront ${isWalkIn ? 'Walk-In CheckIn' : 'Reservation downpayment'} reservation ID: ${resId}`,
        resId
      );
    }

    // Set Room status
    const room = db.rooms.find(r => r.id === selectedRoomId);
    if (room) {
      room.status = isWalkIn ? 'Occupied' : 'Reserved';
      room.currentReservationId = resId;
      store.saveRoom(room);
    }

    // Clear and redirect
    setSelectedGuestId('');
    setSelectedRoomId('');
    setCheckOutDate('');
    setBookingNotes('');
    setDownpayment(0);
    setIsWalkIn(false);
    navigate('/reservations');
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-[#1B4F72] rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Front Office Desk</h1>
            <p className="text-xs text-gray-400">Manage arrivals, registrations, checked-in guests, and cashier check-outs.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/reservations')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Reservations Queue
          </button>
          <button
            onClick={() => navigate('/front-office')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'new_booking'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Create Reservation / Walk-In
          </button>
          <button
            onClick={() => navigate('/guests')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'guests'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Guest Registry
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

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        
        {/* TAB 1: RESERVATIONS QUEUE */}
        {activeTab === 'bookings' && (
          <div className="p-6 space-y-6">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-150 self-start">
                {['All', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setBookingFilter(status as any)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      bookingFilter === status ? 'bg-white text-gray-800 shadow-sm border border-gray-150' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search guest or room number..."
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-700 w-full sm:w-64"
                value={searchBooking}
                onChange={(e) => setSearchBooking(e.target.value)}
              />
            </div>

            {/* Printable Front Desk Booking Report Builder */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-gray-150 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-[#1B4F72] rounded-lg">
                  <Printer className="h-4 w-4" />
                </span>
                <div>
                  <strong className="text-gray-700 block">Front Desk Booking Report Builder</strong>
                  <span className="text-[10px] text-gray-400 font-medium">Select specific active guest bookings below to compile a printable guest ledger / booking statement.</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllReservations(filteredBookings)}
                  className="px-2.5 py-1.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {filteredBookings.length > 0 && filteredBookings.every(r => selectedReservationIds.includes(r.id)) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintFrontDeskReport}
                  disabled={selectedReservationIds.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                    selectedReservationIds.length > 0
                      ? 'bg-[#1B4F72] hover:bg-[#153E5B] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" /> Print Selected ({selectedReservationIds.length})
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                        checked={filteredBookings.length > 0 && filteredBookings.every(r => selectedReservationIds.includes(r.id))}
                        onChange={() => handleSelectAllReservations(filteredBookings)}
                      />
                    </th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Room Location</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Ledger Status</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No reservations matching criteria were found.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((res) => {
                      const guest = db.guests.find(g => g.id === res.guestId);
                      const room = db.rooms.find(r => r.id === res.roomId);
                      const roomType = room ? db.roomTypes.find(t => t.id === room.roomTypeId) : null;
                      const balance = res.totalAmount - res.amountPaid;
                      const isSelected = selectedReservationIds.includes(res.id);

                      return (
                        <tr key={res.id} className={`hover:bg-gray-50/30 ${isSelected ? 'bg-blue-50/20' : ''}`}>
                          <td className="py-4 px-4 text-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                              checked={isSelected}
                              onChange={() => handleToggleReservationSelection(res.id)}
                            />
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-800">
                            <div>
                              <span>{guest?.firstName} {guest?.lastName}</span>
                              <span className="text-[10px] text-gray-400 block font-normal">{guest?.email}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            <div>
                              <span className="font-bold text-gray-700">Room {room?.roomNumber}</span>
                              <span className="text-[10px] text-gray-400 block">{roomType?.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-500 font-medium">
                            <div className="flex items-center space-x-1">
                              <span>{res.checkInDate}</span>
                              <ChevronRight className="h-3 w-3 text-gray-300" />
                              <span>{res.checkOutDate}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            <div>
                              <span className="font-bold block">{store.formatMoney(res.totalAmount)} Total</span>
                              <span className={`text-[10px] font-semibold ${balance === 0 ? 'text-green-600' : 'text-[#E67E22]'}`}>
                                {balance === 0 ? 'Fully Paid' : `${store.formatMoney(balance)} Pending`}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              res.status === 'Confirmed' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              res.status === 'Checked In' ? 'bg-green-50 text-green-700 border border-green-100' :
                              res.status === 'Checked Out' ? 'bg-gray-100 text-gray-600 border border-gray-150' :
                              'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {res.status === 'Confirmed' && (
                                <button
                                  onClick={() => handleCheckIn(res.id)}
                                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                >
                                  Check In
                                </button>
                              )}
                              {res.status === 'Checked In' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setServiceOrderRoomNumber(room?.roomNumber || '');
                                      setServiceOrderReservationId(res.id);
                                      setIsServiceOrderOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center space-x-1 shadow-sm animate-pulse"
                                    title="Create Client Order"
                                  >
                                    <ShoppingCart className="h-3.5 w-3.5 text-white" />
                                    <span>Place Order</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedRes(res);
                                      setIsTransferOpen(true);
                                    }}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition border border-gray-200 cursor-pointer"
                                    title="Room Transfer"
                                  >
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleCheckOut(res.id, 'Cash')}
                                    className="px-2.5 py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    Check Out
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedRes(res);
                                  setIsInvoiceOpen(true);
                                }}
                                className="p-1.5 text-[#1B4F72] hover:bg-blue-50 rounded-lg transition border border-blue-100 cursor-pointer"
                                title="View Bill Invoice"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: GUEST DIRECTORY & CREATE GUEST */}
        {activeTab === 'guests' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Directory Search */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Registered Guests List</h3>
                <input
                  type="text"
                  placeholder="Search directory..."
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none"
                  value={searchGuest}
                  onChange={(e) => setSearchGuest(e.target.value)}
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredGuests.map((gst) => (
                  <div key={gst.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-gray-800">{gst.firstName} {gst.lastName}</span>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-500 mt-1.5">
                        <span>Email: <strong className="text-gray-700">{gst.email}</strong></span>
                        <span>Phone: <strong className="text-gray-700">{gst.phone || 'N/A'}</strong></span>
                        <span>Doc: <strong className="text-gray-700">{gst.idDocumentType} ({gst.idDocumentNumber})</strong></span>
                        <span>Country: <strong className="text-gray-700">{gst.country}</strong></span>
                      </div>
                      {gst.notes && (
                        <p className="text-[10px] text-[#D35400] font-semibold mt-2 bg-orange-50 p-1.5 rounded border border-orange-100 inline-block">
                          ★ Preference: {gst.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Register Guest Profile Form */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Register Guest Profile
              </h3>
              <form onSubmit={handleRegisterGuest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      value={newGuestFirstName}
                      onChange={(e) => setNewGuestFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      value={newGuestLastName}
                      onChange={(e) => setNewGuestLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                    value={newGuestEmail}
                    onChange={(e) => setNewGuestEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ID Document Type</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      value={newGuestDocType}
                      onChange={(e) => setNewGuestDocType(e.target.value)}
                    >
                      <option value="Passport">Passport</option>
                      <option value="National ID">National ID</option>
                      <option value="Driving License">Driving License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Document Number</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      value={newGuestDocNum}
                      onChange={(e) => setNewGuestDocNum(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Country</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      value={newGuestCountry}
                      onChange={(e) => setNewGuestCountry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Home Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      value={newGuestAddress}
                      onChange={(e) => setNewGuestAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Guest Preferences / VIP Notes</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                    placeholder="e.g. Jasmine incense, late checkout, featherless pillows..."
                    value={newGuestNotes}
                    onChange={(e) => setNewGuestNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  Save Guest Profile
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: CREATE RESERVATION / WALK-IN */}
        {activeTab === 'new_booking' && (
          <div className="p-6">
            <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Step 1: Select Guest */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-150">
                  1. Link Guest Profile
                </h3>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Registered Guest</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    value={selectedGuestId}
                    onChange={(e) => setSelectedGuestId(e.target.value)}
                  >
                    <option value="">-- Choose guest --</option>
                    {db.guests.map(g => (
                      <option key={g.id} value={g.id}>{g.firstName} {g.lastName} ({g.email})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 text-[11px] text-gray-500">
                  <span className="font-bold text-[#E67E22] block mb-1">Guest not listed?</span>
                  Create their profile first under the **Guest Registry** tab to register their document credentials.
                </div>
              </div>

              {/* Step 2: Select Room & Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-150">
                  2. Room & Stay Parameters
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Check In Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Check Out Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Available Room</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                  >
                    <option value="">-- Select clean available room --</option>
                    {availableRooms.map(rm => {
                      const typeObj = db.roomTypes.find(t => t.id === rm.roomTypeId);
                      return (
                        <option key={rm.id} value={rm.id}>
                          Room {rm.roomNumber} ({typeObj?.name} - {store.formatMoney(typeObj?.basePrice || 0)}/night)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Number of Guests</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                      value={numGuests}
                      onChange={(e) => setNumGuests(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-5">
                    <input
                      type="checkbox"
                      id="walkinCheck"
                      className="h-4 w-4 text-[#1B4F72] border-gray-300 rounded focus:ring-[#1B4F72]"
                      checked={isWalkIn}
                      onChange={(e) => setIsWalkIn(e.target.checked)}
                    />
                    <label htmlFor="walkinCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
                      Direct Walk-In CheckIn
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 3: Checkout Ledger */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-150">
                  3. Booking Invoice Settlement
                </h3>

                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Nights Total:</span>
                    <span className="font-semibold text-gray-800">{store.formatMoney(calculatedTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Charges ({db.settings.profile.taxRate}%):</span>
                    <span className="font-semibold text-gray-800">
                      {store.formatMoney(Math.round(calculatedTotal * (db.settings.profile.taxRate / 100)))}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between text-sm font-bold text-gray-800">
                    <span>Total Amount:</span>
                    <span>{store.formatMoney(calculatedTotal)}</span>
                  </div>
                </div>

                {!isWalkIn && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Downpayment Deposit ({store.getCurrencySymbol()})</label>
                    <input
                      type="number"
                      max={calculatedTotal}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      value={downpayment}
                      onChange={(e) => setDownpayment(Number(e.target.value))}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Front Desk Notes</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none"
                    placeholder="Note down guest requests or key arrivals details..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-xl font-bold text-xs transition active:scale-[0.98] shadow-md shadow-[#E67E22]/10 cursor-pointer"
                >
                  {isWalkIn ? 'Check-In Walk-In Guest' : 'Confirm Future Reservation'}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>

      {/* MODAL 1: VIEW BILL INVOICE */}
      {isInvoiceOpen && selectedRes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1B4F72] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Guest Bill Settlement</h3>
                <span className="text-xs text-blue-100 font-mono">Invoice Reference ID: {selectedRes.id}</span>
              </div>
              <button
                onClick={() => setIsInvoiceOpen(false)}
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/10 px-3 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Print Area */}
            <div className="p-8 space-y-6" id="invoice-print-section">
              {/* Hotel Header */}
              <div className="flex justify-between border-b border-gray-200 pb-4">
                <div>
                  <h4 className="text-base font-bold text-gray-800">{db.settings.profile.name || 'Grand Horizon Resort'}</h4>
                  <p className="text-[10px] text-gray-400">{db.settings.profile.address}, {db.settings.profile.country}</p>
                  <p className="text-[10px] text-gray-400">Phone: {db.settings.profile.phone} | {db.settings.profile.website}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Invoice Receipt</span>
                  <span className="text-[10px] text-gray-500 block mt-1">Date: {new Date().toLocaleDateString()}</span>
                  <span className="text-[10px] text-gray-500 block">VAT ID: {db.settings.profile.taxNumber || 'TX-98421'}</span>
                </div>
              </div>

              {/* Guest & Stay Summary */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-150 text-xs">
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Billed To:</span>
                  <strong className="text-gray-800 block mt-1">
                    {db.guests.find(g => g.id === selectedRes.guestId)?.firstName} {db.guests.find(g => g.id === selectedRes.guestId)?.lastName}
                  </strong>
                  <span className="text-gray-500 block">{db.guests.find(g => g.id === selectedRes.guestId)?.email}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Reservation:</span>
                  <strong className="text-gray-800 block mt-1">Room {db.rooms.find(r => r.id === selectedRes.roomId)?.roomNumber}</strong>
                  <span className="text-gray-500 block">{selectedRes.checkInDate} to {selectedRes.checkOutDate}</span>
                </div>
              </div>

              {/* Ledger Items */}
              <div className="space-y-4">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-150">Itemized Folio Statements</span>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-2">Description</th>
                      <th className="py-2 text-center">Category</th>
                      <th className="py-2 text-right">Quantity</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {/* 1. Base Room Nights Charge */}
                    {(() => {
                      const nights = Math.ceil(Math.abs(new Date(selectedRes.checkOutDate).getTime() - new Date(selectedRes.checkInDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
                      const roomObj = db.rooms.find(r => r.id === selectedRes.roomId);
                      const roomTypeObj = roomObj ? db.roomTypes.find(t => t.id === roomObj.roomTypeId) : null;
                      const baseRate = roomTypeObj?.basePrice || 0;
                      const baseTotal = nights * baseRate;

                      return (
                        <tr>
                          <td className="py-2.5 font-bold text-gray-800">
                            Room Nights Stay ({roomTypeObj?.name || 'Standard'})
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Room</span>
                          </td>
                          <td className="py-2.5 text-right font-semibold">{nights} nights</td>
                          <td className="py-2.5 text-right font-semibold">{store.formatMoney(baseRate)}</td>
                          <td className="py-2.5 text-right font-black text-gray-800">{store.formatMoney(baseTotal)}</td>
                          <td className="py-2.5 text-right text-gray-400 font-normal italic">-</td>
                        </tr>
                      );
                    })()}

                    {/* 2. Extra dynamic charges */}
                    {selectedRes.charges && selectedRes.charges.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 text-gray-800 font-semibold">{c.description}</td>
                        <td className="py-2.5 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            c.category === 'Minibar' ? 'bg-amber-50 text-amber-700' :
                            c.category === 'Dining' ? 'bg-emerald-50 text-emerald-700' :
                            c.category === 'Laundry' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {c.category}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-gray-600">x{c.quantity}</td>
                        <td className="py-2.5 text-right font-mono text-gray-600">{store.formatMoney(c.amount)}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-gray-800">{store.formatMoney(c.amount * c.quantity)}</td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove charge "${c.description}"?`)) {
                                store.removeReservationCharge(selectedRes.id, c.id);
                                const updated = store.getDb().reservations.find(r => r.id === selectedRes.id);
                                if (updated) setSelectedRes(updated);
                              }
                            }}
                            className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded cursor-pointer font-bold text-[11px]"
                            title="Delete Charge"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* REAL-TIME FOLIO TRANSACTION INPUTS BENTO CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                
                {/* CARD A: POST NEW DYNAMIC CHARGE */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-3">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Post New Dynamic Charge</span>
                  <form onSubmit={(e) => handleAddFolioCharge(e, selectedRes.id)} className="space-y-2.5 text-xs">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Charge description (e.g. Minibar beer, Lost card)"
                        value={extraChargeDesc}
                        onChange={(e) => setExtraChargeDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-250 rounded-lg text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="1"
                          required
                          title="Quantity"
                          placeholder="Qty"
                          value={extraChargeQty}
                          onChange={(e) => setExtraChargeQty(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-gray-250 rounded-lg text-center font-bold"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          title="Price per item"
                          placeholder="Price"
                          value={extraChargeAmount || ''}
                          onChange={(e) => setExtraChargeAmount(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-gray-250 rounded-lg text-center font-bold"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={extraChargeCat}
                          onChange={(e) => setExtraChargeCat(e.target.value as any)}
                          className="w-full px-1 py-1.5 bg-white border border-gray-250 rounded-lg font-bold text-[10px]"
                        >
                          <option value="Minibar">Minibar</option>
                          <option value="Laundry">Laundry</option>
                          <option value="Dining">Dining</option>
                          <option value="Spa">Spa</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      + Add Folio Charge
                    </button>
                  </form>
                </div>

                {/* CARD B: RECORD PAYMENT RECEIPT */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-150 space-y-3">
                  <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">Record Cashier Payment Receipt</span>
                  <form onSubmit={(e) => handlePostFolioPayment(e, selectedRes.id)} className="space-y-2.5 text-xs">
                    <div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="Payment amount received"
                        value={payAmount || ''}
                        onChange={(e) => setPayAmount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-250 rounded-lg font-bold text-blue-800 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white border border-blue-250 rounded-lg font-bold text-xs"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="Mobile Money">Mobile Money</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Ref / Receipt #"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-blue-250 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Post Payment Transaction
                    </button>
                  </form>
                </div>

              </div>

              {/* Financial Calculation */}
              <div className="flex justify-end pt-4 border-t border-gray-200 bg-gray-50/50 p-4 rounded-xl">
                <div className="w-64 space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal Billed (Base + Extras):</span>
                    <span className="font-bold text-gray-700">{store.formatMoney(selectedRes.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes Inclusive ({db.settings.profile.taxRate}%):</span>
                    <span>{store.formatMoney(Math.round(selectedRes.totalAmount * (db.settings.profile.taxRate / 100)))}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-150 pt-2 font-bold text-gray-800">
                    <span>Total Net Invoice Folio:</span>
                    <span>{store.formatMoney(selectedRes.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Accumulated Paid Credits:</span>
                    <span>-{store.formatMoney(selectedRes.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-150 pt-2 font-bold text-lg text-[#E67E22]">
                    <span>Net Balance Due:</span>
                    <span>{store.formatMoney(selectedRes.totalAmount - selectedRes.amountPaid)}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-gray-400 pt-2">
                Thank you for your stay at {db.settings.profile.name || 'The Grand Horizon'}. Have a safe journey!
              </div>
            </div>

            {/* Print Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              <button
                onClick={() => {
                  try {
                    const res = selectedRes;
                    const guest = db.guests.find(g => g.id === res.guestId);
                    const room = db.rooms.find(r => r.id === res.roomId);
                    const roomType = db.roomTypes.find(t => t.id === room?.roomTypeId);
                    const nights = Math.ceil(Math.abs(new Date(res.checkOutDate).getTime() - new Date(res.checkInDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
                    
                    const basePrice = roomType?.basePrice || 0;
                    const baseRoomCharge = nights * basePrice;

                    const chargesList = [
                      {
                        date: res.checkInDate,
                        description: `Room Nights Stay (${roomType?.name || 'Standard'}) - ${nights} nights at ${store.formatMoney(basePrice)}/night`,
                        amount: baseRoomCharge
                      },
                      ...(res.charges || []).map(c => ({
                        date: c.date,
                        description: `${c.description} [${c.category}] (x${c.quantity})`,
                        amount: c.amount * c.quantity
                      }))
                    ];

                    const invoiceHtml = getCheckoutInvoiceHTML(guest, room, res, roomType, chargesList);
                    launchPrintPreview('Invoice', `Checkout Folio - Room ${room?.roomNumber || 'N/A'}`, invoiceHtml);
                    
                    // Centralized Thermal Printer Spool Integration fallback
                    let txt = `========================================\n`;
                    txt += `       THE GRAND HORIZON RESORT & SPA     \n`;
                    txt += `  TIN: ${db.settings.profile.taxNumber || 'TX-984-110A'}\n`;
                    txt += `  Address: ${db.settings.profile.address}\n`;
                    txt += `========================================\n`;
                    txt += `             CHECKOUT INVOICE            \n`;
                    txt += `========================================\n`;
                    txt += `Guest:       ${guest?.firstName || ''} ${guest?.lastName || ''}\n`;
                    txt += `Room Number: Room ${room?.roomNumber || 'N/A'}\n`;
                    txt += `Room Type:   ${roomType?.name || 'Standard'}\n`;
                    txt += `Dates:       ${res.checkInDate} to ${res.checkOutDate}\n`;
                    txt += `Duration:    ${nights} nights\n`;
                    txt += `----------------------------------------\n`;
                    txt += `CHARGES SUMMARY:\n`;
                    txt += `Room Stay:                    ${store.formatMoney(baseRoomCharge)}\n`;
                    (res.charges || []).forEach(c => {
                      const descStr = (c.description.length > 20 ? c.description.substring(0, 17) + "..." : c.description).padEnd(20, ' ');
                      txt += `${descStr} x${c.quantity}  ${store.formatMoney(c.amount * c.quantity)}\n`;
                    });
                    txt += `Taxes Inclusive (${db.settings.profile.taxRate}%):         ${store.formatMoney(Math.round(res.totalAmount * (db.settings.profile.taxRate / 100)))}\n`;
                    txt += `----------------------------------------\n`;
                    txt += `Total Billed:                 ${store.formatMoney(res.totalAmount)}\n`;
                    txt += `Amount Paid:                 -${store.formatMoney(res.amountPaid)}\n`;
                    txt += `----------------------------------------\n`;
                    txt += `Balance Due:                  ${store.formatMoney(res.totalAmount - res.amountPaid)}\n`;
                    txt += `========================================\n`;
                    txt += `    Have a safe journey! Visit again.   \n`;
                    txt += `========================================\n`;

                    store.addPrintJob(`Checkout Folio - Room ${room?.roomNumber || 'N/A'}`, 'Reception', 'Invoice', txt, 1);
                    store.addNotification('Invoice Spooled', `Checkout folio printed automatically on Front Desk thermal printer.`, 'checkout');
                  } catch (err) {
                    console.error('Thermal invoice print job failed to spool:', err);
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs border border-gray-300 transition cursor-pointer"
              >
                <Printer className="h-4 w-4 mr-1.5" /> Print Invoice Receipt
              </button>
              <button
                onClick={() => setIsInvoiceOpen(false)}
                className="px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: ROOM TRANSFER PANEL */}
      {isTransferOpen && selectedRes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1B4F72] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Room Transfer Protocol</h3>
                <span className="text-xs text-blue-100">Reservation Reference: {selectedRes.id}</span>
              </div>
              <button onClick={() => setIsTransferOpen(false)} className="text-white hover:text-gray-200 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-[11px] text-gray-600">
                <AlertCircle className="h-5 w-5 text-[#1B4F72] shrink-0" />
                <p>
                  Transferring Room releases the guest's current room, marking it as **Dirty** automatically for Housekeeping. The new room is flagged as **Occupied**.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select New Clean Room</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  value={transferRoomId}
                  onChange={(e) => setTransferRoomId(e.target.value)}
                >
                  <option value="">-- Choose New Available Room --</option>
                  {availableRooms.map(rm => {
                    const typeObj = db.roomTypes.find(t => t.id === rm.roomTypeId);
                    return (
                      <option key={rm.id} value={rm.id}>
                        Room {rm.roomNumber} ({typeObj?.name} - {store.formatMoney(typeObj?.basePrice || 0)}/night)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4">
                <button
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRoomTransfer(selectedRes.id)}
                  className="px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
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
