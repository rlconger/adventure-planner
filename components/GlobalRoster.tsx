import React, { useState, useMemo } from 'react';
import { Attendee, Trip, Theme, THEMES } from '../types';
import AttendeeForm from './AttendeeForm';
import { PlusIcon, PencilIcon, TrashIcon, EnvelopeIcon, PhoneIcon, UsersIcon, CalendarDaysIcon } from './icons';

interface GlobalRosterProps {
    globalAttendees: Attendee[];
    trips: Trip[];
    onSaveGlobalAttendee: (attendeeData: Omit<Attendee, 'id'>, idToUpdate?: string) => Attendee;
    onDeleteGlobalAttendee: (attendeeId: string) => void;
    onSelectTrip: (tripId: string) => void;
    theme: Theme;
}

const GlobalRoster: React.FC<GlobalRosterProps> = ({
    globalAttendees,
    trips,
    onSaveGlobalAttendee,
    onDeleteGlobalAttendee,
    onSelectTrip,
    theme
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [attendeeToEdit, setAttendeeToEdit] = useState<Attendee | null>(null);

    const themeClasses = THEMES[theme];

    // Filter and sort attendees
    const filteredAttendees = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let result = [...globalAttendees];

        if (query) {
            result = result.filter(
                a =>
                    a.name.toLowerCase().includes(query) ||
                    (a.email && a.email.toLowerCase().includes(query)) ||
                    (a.phone && a.phone.includes(query))
            );
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [globalAttendees, searchQuery]);

    // Map attendee ID to the trips they are attending
    const attendeeTripsMap = useMemo(() => {
        const map: { [attendeeId: string]: Trip[] } = {};
        
        // Pre-populate for everyone
        globalAttendees.forEach(a => {
            map[a.id] = [];
        });

        // Find matches in trip rosters
        trips.forEach(trip => {
            const roster = trip.roster || [];
            roster.forEach(member => {
                if (map[member.id]) {
                    map[member.id].push(trip);
                } else {
                    // Falls back to title/name matching if IDs differ in edge cases
                    const match = globalAttendees.find(
                        g => g.name.toLowerCase().trim() === member.name.toLowerCase().trim()
                    );
                    if (match) {
                        map[match.id] = map[match.id] || [];
                        if (!map[match.id].some(t => t.id === trip.id)) {
                            map[match.id].push(trip);
                        }
                    }
                }
            });
        });

        return map;
    }, [globalAttendees, trips]);

    const handleOpenAddForm = () => {
        setAttendeeToEdit(null);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (attendee: Attendee) => {
        setAttendeeToEdit(attendee);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setAttendeeToEdit(null);
        setIsFormOpen(false);
    };

    const handleSaveAttendee = (attendeeData: Omit<Attendee, 'id'>) => {
        onSaveGlobalAttendee(attendeeData, attendeeToEdit?.id);
        handleCloseForm();
    };

    const handleDeleteClick = (attendee: Attendee) => {
        const attendingList = attendeeTripsMap[attendee.id] || [];
        let confirmMsg = `Are you sure you want to delete ${attendee.name} from the Global Roster?`;
        
        if (attendingList.length > 0) {
            confirmMsg += `\n\nWarning: This person is currently assigned to ${attendingList.length} trip(s):\n`;
            attendingList.forEach(t => {
                confirmMsg += `- ${t.title}\n`;
            });
            confirmMsg += `\nDeleting them will also remove them from these trip rosters.`;
        }

        if (window.confirm(confirmMsg)) {
            onDeleteGlobalAttendee(attendee.id);
        }
    };

    // Helper to get initials
    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="space-y-6">
            {/* Header section with actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Main Roster & Contact Directory</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your overall database of riders, friends, and co-travelers here.
                    </p>
                </div>
                <button
                    onClick={handleOpenAddForm}
                    className={`inline-flex items-center self-start sm:self-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}
                >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Add New Person
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative">
                    <label htmlFor="roster-search" className="sr-only">Search Roster</label>
                    <input
                        id="roster-search"
                        type="text"
                        placeholder="Search by name, email, or telephone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`w-full pl-4 pr-10 py-2 border ${themeClasses.borderClass} rounded-md text-sm placeholder-gray-405 focus:outline-none ${themeClasses.formInputFocusClass}`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                            title="Clear search"
                        >
                            <svg className="h-5 w-5 fill-none stroke-current" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* List and Cards */}
            {filteredAttendees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAttendees.map(attendee => {
                        const initials = getInitials(attendee.name);
                        const assignedTrips = attendeeTripsMap[attendee.id] || [];
                        
                        return (
                            <div
                                key={attendee.id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Initials badge */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-gray-700 flex-shrink-0 bg-gray-100 border border-gray-200`}>
                                        {initials}
                                    </div>

                                    {/* Name & Contact Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-gray-900 truncate" title={attendee.name}>
                                            {attendee.name}
                                        </h3>
                                        
                                        <div className="mt-2 space-y-1.5 text-sm text-gray-650">
                                            {attendee.email ? (
                                                <a
                                                    href={`mailto:${attendee.email}`}
                                                    className="flex items-center hover:underline hover:text-gray-900 truncate"
                                                    title={attendee.email}
                                                >
                                                    <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                                    {attendee.email}
                                                </a>
                                            ) : (
                                                <span className="flex items-center text-gray-400 italic">
                                                    <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-300 flex-shrink-0" />
                                                    No email specified
                                                </span>
                                            )}

                                            {attendee.phone ? (
                                                <a
                                                    href={`tel:${attendee.phone}`}
                                                    className="flex items-center hover:underline hover:text-gray-900"
                                                >
                                                    <PhoneIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                                    {attendee.phone}
                                                </a>
                                            ) : (
                                                <span className="flex items-center text-gray-400 italic">
                                                    <PhoneIcon className="h-4 w-4 mr-2 text-gray-300 flex-shrink-0" />
                                                    No phone specified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Trips list */}
                                <div className="mt-4 pt-4 border-t border-gray-150">
                                    <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        <CalendarDaysIcon className="h-3.5 w-3.5 mr-1.5" />
                                        Attending ({assignedTrips.length} trip{assignedTrips.length === 1 ? '' : 's'})
                                    </div>
                                    {assignedTrips.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {assignedTrips.map(trip => (
                                                <button
                                                    key={trip.id}
                                                    onClick={() => onSelectTrip(trip.id)}
                                                    className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-800 hover:bg-gray-100 hover:text-gray-950 border border-gray-200 transition-colors cursor-pointer`}
                                                    title={`Click to view ${trip.title} trip schedule`}
                                                >
                                                    <span className="max-w-[150px] truncate">{trip.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No scheduled trips. Use the trip planner to assign them.</span>
                                    )}
                                </div>

                                {/* Custom quick action footer */}
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
                                    <button
                                        onClick={() => handleOpenEditForm(attendee)}
                                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                                        title="Edit contact info"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(attendee)}
                                        className="p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete from list"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                        {searchQuery ? 'No matching people found' : 'No one in roster directory'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-550">
                        {searchQuery
                            ? 'Try refining your search keyword above.'
                            : 'Start by adding a person who you expect to join future adventure trips!'}
                    </p>
                    {!searchQuery && (
                        <div className="mt-6">
                            <button
                                onClick={handleOpenAddForm}
                                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass}`}
                            >
                                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                Add First Rider
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isFormOpen && (
                <AttendeeForm
                    onClose={handleCloseForm}
                    onSave={handleSaveAttendee}
                    attendeeToEdit={attendeeToEdit}
                    theme={theme}
                />
            )}
        </div>
    );
};

export default GlobalRoster;
