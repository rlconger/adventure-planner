import React, { useState, useEffect, useId } from 'react';
import { Leg, Trip, AccommodationType, Reservation, Theme, THEMES } from '../types';
import Modal from './Modal';

interface LegFormProps {
    onClose: () => void;
    onSave: (leg: Omit<Leg, 'id'>, insertionIndex?: number) => void;
    legToEdit: Leg | null;
    trip: Trip;
    theme: Theme;
}

const LegForm: React.FC<LegFormProps> = ({ onClose, onSave, legToEdit, trip, theme }) => {
    const [date, setDate] = useState('');
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [miles, setMiles] = useState<string>('');
    const [accommodationType, setAccommodationType] = useState<AccommodationType>(AccommodationType.Dispersed);
    const [sites, setSites] = useState<Reservation[]>([]);
    const [rooms, setRooms] = useState<Reservation[]>([]);
    const [notes, setNotes] = useState('');
    const [isTravelDay, setIsTravelDay] = useState(false);
    const [insertionIndex, setInsertionIndex] = useState(trip.legs.length);

    const themeClasses = THEMES[theme];
    const formId = useId();

    useEffect(() => {
        if (legToEdit) {
            // Populate form for editing an existing leg
            setDate(legToEdit.date || '');
            setStartLocation(legToEdit.startLocation);
            setEndLocation(legToEdit.endLocation);
            setMiles(legToEdit.miles ? legToEdit.miles.toString() : '');
            setAccommodationType(legToEdit.accommodationType);
            setSites(legToEdit.sites || []);
            setRooms(legToEdit.rooms || []);
            setNotes(legToEdit.notes || '');
            setIsTravelDay(legToEdit.isTravelDay || false);
        } else {
            // Pre-fill form for adding a new leg based on insertionIndex
            const index = insertionIndex;
            const prevLeg = index > 0 ? trip.legs[index - 1] : null;
            const nextLeg = index < trip.legs.length ? trip.legs[index] : null;

            const newStart = prevLeg ? prevLeg.endLocation : '';
            const newEnd = nextLeg ? nextLeg.startLocation : '';

            let newDate = '';
            if (prevLeg?.date) {
                const d = new Date(prevLeg.date.replace(/-/g, '/'));
                d.setDate(d.getDate() + 1);
                newDate = d.toISOString().split('T')[0];
            } else if (nextLeg?.date) {
                 const d = new Date(nextLeg.date.replace(/-/g, '/'));
                d.setDate(d.getDate() - 1);
                newDate = d.toISOString().split('T')[0];
            } else if (index === 0) {
                 newDate = trip.startDate || '';
            }

            setStartLocation(newStart);
            setEndLocation(newEnd);
            setDate(newDate);

            // Reset other fields to default for a new leg form
            setMiles('');
            setAccommodationType(AccommodationType.Dispersed);
            setSites([]);
            setRooms([]);
            setNotes('');
            setIsTravelDay(false);
        }
    }, [legToEdit, trip, insertionIndex]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(
            { date, startLocation, endLocation, miles: isTravelDay ? 0 : Number(miles) || 0, accommodationType, sites, rooms, notes, isTravelDay },
            legToEdit ? undefined : insertionIndex
        );
    };

    const handleReservationChange = (id: string, value: string, type: 'sites' | 'rooms') => {
        const updater = type === 'sites' ? setSites : setRooms;
        updater(prev => prev.map(r => r.id === id ? { ...r, number: value } : r));
    }

    const handleCountChange = (count: number, type: 'sites' | 'rooms') => {
        const updater = type === 'sites' ? setSites : setRooms;
        updater(prev => {
            const newReservations = Array.from({ length: count }, (_, i) => {
                return prev[i] || { id: crypto.randomUUID(), number: '' };
            });
            return newReservations;
        });
    }
    
    const inputClass = `mt-1 block w-full px-3 py-2 bg-white border ${themeClasses.borderClass} rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none ${themeClasses.formInputFocusClass} disabled:bg-gray-100 disabled:cursor-not-allowed`;

    const footer = (
         <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Cancel
            </button>
            <button type="submit" form={formId} className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                {legToEdit ? 'Save Changes' : 'Save Leg'}
            </button>
        </div>
    );

    return (
        <Modal onClose={onClose} title={legToEdit ? 'Edit Leg' : 'Add a Leg'} footer={footer}>
            <form id={formId} onSubmit={handleSave} className="space-y-6">
                {!legToEdit && (
                    <div>
                        <label htmlFor="insertionIndex" className="block text-sm font-medium text-gray-700">Position in Trip</label>
                        <select
                            id="insertionIndex"
                            value={insertionIndex}
                            onChange={(e) => setInsertionIndex(Number(e.target.value))}
                            className={inputClass}
                        >
                            <option value={trip.legs.length}>At the End</option>
                            <option value={0}>At the Beginning</option>
                            {trip.legs.map((leg, index) => (
                                <option key={leg.id} value={index + 1}>
                                    After Day {index + 1}: {leg.endLocation}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="startLocation" className="block text-sm font-medium text-gray-700">Start Location</label>
                        <input type="text" id="startLocation" value={startLocation} onChange={e => setStartLocation(e.target.value)} className={inputClass} required />
                    </div>
                     <div>
                        <label htmlFor="endLocation" className="block text-sm font-medium text-gray-700">End Location</label>
                        <input type="text" id="endLocation" value={endLocation} onChange={e => setEndLocation(e.target.value)} className={inputClass} required />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="miles" className="block text-sm font-medium text-gray-700">Miles</label>
                        <input type="number" id="miles" value={isTravelDay ? '0' : miles} placeholder="0" onChange={e => setMiles(e.target.value)} className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} required disabled={isTravelDay} />
                    </div>
                    <div>
                         <label htmlFor="accommodationType" className="block text-sm font-medium text-gray-700">Accommodations</label>
                         <select id="accommodationType" value={accommodationType} onChange={e => setAccommodationType(e.target.value as AccommodationType)} className={inputClass}>
                            {Object.values(AccommodationType).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>

                 <div className="pt-1">
                    <label className="flex items-center">
                        <input
                            id="isTravelDay"
                            type="checkbox"
                            checked={isTravelDay}
                            onChange={(e) => setIsTravelDay(e.target.checked)}
                            className={`h-4 w-4 rounded border-gray-300 ${themeClasses.primaryTextClass} ${themeClasses.ringClass}`}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Mark as a travel day (miles won't count towards trip total)
                        </span>
                    </label>
                </div>


                {accommodationType === AccommodationType.Camping && (
                    <div className="p-4 bg-gray-50 rounded-md space-y-4">
                        <label htmlFor="siteCount" className="block text-sm font-medium text-gray-700">Number of Sites</label>
                        <input type="number" id="siteCount" value={sites.length || ''} placeholder="0" onChange={e => handleCountChange(Number(e.target.value), 'sites')} min="0" className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                        {sites.map((site, index) => (
                             <div key={site.id}>
                                <label htmlFor={`site-${index}`} className="block text-sm font-medium text-gray-500">Reservation #{index + 1}</label>
                                <input type="text" id={`site-${index}`} value={site.number} onChange={e => handleReservationChange(site.id, e.target.value, 'sites')} className={inputClass} />
                            </div>
                        ))}
                    </div>
                )}

                {accommodationType === AccommodationType.Hotel && (
                    <div className="p-4 bg-gray-50 rounded-md space-y-4">
                        <label htmlFor="roomCount" className="block text-sm font-medium text-gray-700">Number of Rooms</label>
                        <input type="number" id="roomCount" value={rooms.length || ''} placeholder="0" onChange={e => handleCountChange(Number(e.target.value), 'rooms')} min="0" className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                        {rooms.map((room, index) => (
                            <div key={room.id}>
                                <label htmlFor={`room-${index}`} className="block text-sm font-medium text-gray-500">Reservation #{index + 1}</label>
                                <input type="text" id={`room-${index}`} value={room.number} onChange={e => handleReservationChange(room.id, e.target.value, 'rooms')} className={inputClass} />
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Campground is first-come, first-served."
                    />
                </div>
            </form>
        </Modal>
    );
};

export default LegForm;
