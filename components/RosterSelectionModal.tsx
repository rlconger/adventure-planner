import React, { useState, useEffect, useMemo } from 'react';
import { Attendee, Theme, THEMES } from '../types';
import Modal from './Modal';
import AttendeeForm from './AttendeeForm';
import { PlusIcon } from './icons';

interface RosterSelectionModalProps {
    onClose: () => void;
    currentRoster: Attendee[];
    globalAttendees: Attendee[];
    onUpdateRoster: (newRoster: Attendee[]) => void;
    onSaveGlobalAttendee: (attendeeData: Omit<Attendee, 'id'>, idToUpdate?: string) => Attendee;
    theme: Theme;
}

const RosterSelectionModal: React.FC<RosterSelectionModalProps> = ({ onClose, currentRoster, globalAttendees, onUpdateRoster, onSaveGlobalAttendee, theme }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(currentRoster.map(a => a.id)));
    const [isAttendeeFormOpen, setIsAttendeeFormOpen] = useState(false);
    const themeClasses = THEMES[theme];

    const sortedGlobalAttendees = useMemo(() => {
        return [...globalAttendees].sort((a, b) => a.name.localeCompare(b.name));
    }, [globalAttendees]);

    const handleToggleSelection = (attendeeId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(attendeeId)) {
                newSet.delete(attendeeId);
            } else {
                newSet.add(attendeeId);
            }
            return newSet;
        });
    };

    const handleConfirmSelection = () => {
        const newRoster = globalAttendees.filter(a => selectedIds.has(a.id));
        onUpdateRoster(newRoster);
    };
    
    const handleCreateNewAttendee = (attendeeData: Omit<Attendee, 'id'>) => {
        const newAttendee = onSaveGlobalAttendee(attendeeData);
        // Automatically select the newly created person
        setSelectedIds(prev => new Set(prev).add(newAttendee.id));
        setIsAttendeeFormOpen(false);
    };


    const footer = (
        <div className="flex justify-between items-center w-full">
            <button
                type="button"
                onClick={() => setIsAttendeeFormOpen(true)}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}
            >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create New Person
            </button>
            <div className="flex space-x-3">
                <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    Cancel
                </button>
                <button type="button" onClick={handleConfirmSelection} className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                    Update Roster
                </button>
            </div>
        </div>
    );

    return (
        <>
            <Modal onClose={onClose} title="Manage Trip Roster" footer={footer}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Select people from your address book to add them to this trip's roster.</p>
                    {sortedGlobalAttendees.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto pr-2 -mr-2 space-y-2">
                        {sortedGlobalAttendees.map(attendee => (
                             <label
                                key={attendee.id}
                                htmlFor={`attendee-${attendee.id}`}
                                className="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <input
                                    id={`attendee-${attendee.id}`}
                                    type="checkbox"
                                    className={`h-5 w-5 rounded border-gray-300 ${themeClasses.primaryTextClass} ${themeClasses.ringClass}`}
                                    checked={selectedIds.has(attendee.id)}
                                    onChange={() => handleToggleSelection(attendee.id)}
                                />
                                <span className="ml-4 flex flex-col">
                                    <span className="font-medium text-gray-900">{attendee.name}</span>
                                    {attendee.email && <span className="text-sm text-gray-500">{attendee.email}</span>}
                                </span>
                            </label>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                             <p className="text-gray-500">Your global address book is empty.</p>
                             <p className="text-gray-500 mt-1">Start by creating a new person.</p>
                        </div>
                    )}
                </div>
            </Modal>
            
            {isAttendeeFormOpen && (
                 <AttendeeForm
                    onClose={() => setIsAttendeeFormOpen(false)}
                    onSave={handleCreateNewAttendee}
                    attendeeToEdit={null}
                    theme={theme}
                />
            )}
        </>
    );
};

export default RosterSelectionModal;
