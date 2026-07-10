/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { Guest, Reservation, Room, PaymentMethod, ReservationStatus } from '../types';
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
  AlertCircle
} from 'lucide-react';

export default function FrontOffice() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'guests' | 'new_booking'>('bookings');
  const db = store.getDb();

  // Selected state for dialogs / secondary forms
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [transferRoomId, setTransferRoomId] = useState<string>('');

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
    setActiveTab('bookings');
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
    setActiveTab('bookings');
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
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Reservations Queue
          </button>
          <button
            onClick={() => setActiveTab('new_booking')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'new_booking'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Create Reservation / Walk-In
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'guests'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Guest Registry
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

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
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
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No reservations matching criteria were found.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((res) => {
                      const guest = db.guests.find(g => g.id === res.guestId);
                      const room = db.rooms.find(r => r.id === res.roomId);
                      const roomType = room ? db.roomTypes.find(t => t.id === room.roomTypeId) : null;
                      const balance = res.totalAmount - res.amountPaid;

                      return (
                        <tr key={res.id} className="hover:bg-gray-50/30">
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
                          Room {rm.roomNumber} ({typeObj?.name} - ${typeObj?.basePrice}/night)
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
                    <span className="font-semibold text-gray-800">${calculatedTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Charges ({db.settings.profile.taxRate}%):</span>
                    <span className="font-semibold text-gray-800">
                      ${Math.round(calculatedTotal * (db.settings.profile.taxRate / 100))}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between text-sm font-bold text-gray-800">
                    <span>Total Amount:</span>
                    <span>${calculatedTotal}</span>
                  </div>
                </div>

                {!isWalkIn && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Downpayment Deposit ($)</label>
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
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Quantity</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 font-semibold text-gray-800">
                      Room Nights Stay ({db.roomTypes.find(t => t.id === db.rooms.find(r => r.id === selectedRes.roomId)?.roomTypeId)?.name})
                    </td>
                    <td className="py-3 text-right">
                      {Math.ceil(Math.abs(new Date(selectedRes.checkOutDate).getTime() - new Date(selectedRes.checkInDate).getTime()) / (1000 * 60 * 60 * 24))} nights
                    </td>
                    <td className="py-3 text-right">
                      ${db.roomTypes.find(t => t.id === db.rooms.find(r => r.id === selectedRes.roomId)?.roomTypeId)?.basePrice}
                    </td>
                    <td className="py-3 text-right font-bold text-gray-800">${selectedRes.totalAmount}</td>
                  </tr>
                  {/* Any additional charges like restaurant tab can go here */}
                </tbody>
              </table>

              {/* Financial Calculation */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="w-64 space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal Charges:</span>
                    <span>${selectedRes.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes Inclusive ({db.settings.profile.taxRate}%):</span>
                    <span>${Math.round(selectedRes.totalAmount * (db.settings.profile.taxRate / 100))}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-150 pt-2 font-bold text-gray-800">
                    <span>Total Amount Billed:</span>
                    <span>${selectedRes.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Amount Paid:</span>
                    <span>-${selectedRes.amountPaid}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-150 pt-2 font-bold text-lg text-[#E67E22]">
                    <span>Pending Balance:</span>
                    <span>${selectedRes.totalAmount - selectedRes.amountPaid}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-gray-400 pt-6 border-t border-gray-200">
                Thank you for your stay at {db.settings.profile.name || 'The Grand Horizon'}. Have a safe journey!
              </div>
            </div>

            {/* Print Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              <button
                onClick={() => window.print()}
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
                        Room {rm.roomNumber} ({typeObj?.name} - ${typeObj?.basePrice}/night)
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

    </div>
  );
}
