
import React, { useState } from 'react';
import { Trip, Attendee, Theme, THEMES } from '../types';
import AttendeeForm from './AttendeeForm';
import RosterSelectionModal from './RosterSelectionModal';
import { PlusIcon, UsersIcon, EnvelopeIcon, PhoneIcon, PencilIcon, TrashIcon } from './icons';

interface TripRosterProps {
    trip: Trip;
    onUpdateRoster: (roster: Attendee[]) => void;
    onSendItinerary: () => void;
    globalAttendees: Attendee[];
    onSaveGlobalAttendee: (attendeeData: Omit<Attendee, 'id'>, idToUpdate?: string) => Attendee;
    theme: Theme;
}

const TripRoster: React.FC<TripRosterProps> = ({ trip, onUpdateRoster, onSendItinerary, globalAttendees, onSaveGlobalAttendee, theme }) => {
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [attendeeToEdit, setAttendeeToEdit] = useState<Attendee | null>(null);

    const roster = trip.roster || [];
    const themeClasses = THEMES[theme];

    const handleOpenEditForm = (attendee: Attendee) => {
        setAttendeeToEdit(attendee);
        setIsEditFormOpen(true);
    };

    const handleCloseEditForm = () => {
        setAttendeeToEdit(null);
        setIsEditFormOpen(false);
    };

    const handleSaveEditedAttendee = (attendeeData: Omit<Attendee, 'id'>) => {
        if (!attendeeToEdit) return;

        // Save to global list first
        const savedAttendee = onSaveGlobalAttendee(attendeeData, attendeeToEdit.id);

        // Then update the roster for this specific trip
        const updatedRoster = roster.map(a => (a.id === attendeeToEdit.id ? savedAttendee : a));
        onUpdateRoster(updatedRoster);
        handleCloseEditForm();
    };

    const handleDeleteAttendee = (attendeeId: string) => {
        if (window.confirm("Are you sure you want to remove this person from the roster? This will only remove them from this trip.")) {
            const updatedRoster = roster.filter(a => a.id !== attendeeId);
            onUpdateRoster(updatedRoster);
        }
    };

    return (
        <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-2xl font-bold flex items-center">
                    Trip Roster ({roster.length})
                </h3>
                 <div className="flex items-center space-x-2">
                     <button 
                        onClick={onSendItinerary} 
                        disabled={roster.length === 0}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                    >
                        <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
                        Send Itinerary
                    </button>
                    <button onClick={() => setIsSelectionModalOpen(true)} className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                        <UsersIcon className="-ml-1 mr-2 h-5 w-5" />
                        Manage Roster
                    </button>
                 </div>
            </div>
            {roster.length > 0 ? (
                <div className="space-y-3 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                    {roster.map(attendee => (
                        <div key={attendee.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex-grow mb-2 sm:mb-0">
                                <p className="font-bold text-lg text-gray-800">{attendee.name}</p>
                                <div className="flex flex-wrap items-center text-sm text-gray-600 mt-1">
                                    {attendee.email && (
                                        <a href={`mailto:${attendee.email}`} className="flex items-center mr-4 hover:underline">
                                            <EnvelopeIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                                            {attendee.email}
                                        </a>
                                    )}
                                    {attendee.phone && (
                                        <a href={`tel:${attendee.phone}`} className="flex items-center hover:underline">
                                            <PhoneIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                                            {attendee.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                                <button onClick={() => handleOpenEditForm(attendee)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Edit Attendee"><PencilIcon className="h-5 w-5" /></button>
                                <button onClick={() => handleDeleteAttendee(attendee.id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors" title="Remove Attendee"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h4 className="text-xl font-semibold">No one is on the roster yet.</h4>
                    <p className="text-gray-500 mt-2">Add attendees to share trip details.</p>
                </div>
            )}
            
            {isSelectionModalOpen && (
                <RosterSelectionModal
                    onClose={() => setIsSelectionModalOpen(false)}
                    currentRoster={roster}
                    globalAttendees={globalAttendees}
                    onUpdateRoster={(newRoster) => {
                        onUpdateRoster(newRoster);
                        setIsSelectionModalOpen(false);
                    }}
                    onSaveGlobalAttendee={onSaveGlobalAttendee}
                    theme={theme}
                />
            )}

            {isEditFormOpen && (
                <AttendeeForm 
                    onClose={handleCloseEditForm}
                    onSave={handleSaveEditedAttendee}
                    attendeeToEdit={attendeeToEdit}
                    theme={theme}
                />
            )}
        </div>
    );
};

export default TripRoster;
