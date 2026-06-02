import React, { useState, useMemo } from 'react';
import { Trip, Theme, THEMES, TripStatus } from '../types';
import TripCard from './TripCard';
import { PlusIcon, UploadIcon, DownloadIcon, CalendarDaysIcon, UsersIcon, CheckIcon } from './icons';

type Votes = { [pollId: string]: { [voterName: string]: string } };

interface TripListProps {
    trips: Trip[];
    votes: Votes;
    voterName: string;
    onNewTrip: () => void;
    onSelectTrip: (tripId: string) => void;
    onImportTrips: () => void;
    onExportTrips: () => void;
    theme: Theme;
    onMarkTripComplete: (tripId: string) => void;
    onRestoreTrip: (tripId: string) => void;
    onFinalizeTrip: (tripId: string) => void;
    onCopyTrip: (tripId: string) => void;
    onVote: (tripId: string, pollId: string) => void;
    onPrintTrip: (tripId: string) => void;
    isSignedIn?: boolean;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TripList: React.FC<TripListProps> = ({ trips, votes, voterName, onNewTrip, onSelectTrip, onImportTrips, onExportTrips, theme, onMarkTripComplete, onRestoreTrip, onFinalizeTrip, onCopyTrip, onVote, onPrintTrip, isSignedIn = false }) => {
    const [activeTab, setActiveTab] = useState<TripStatus>(TripStatus.Upcoming);
    const themeClasses = THEMES[theme];

    // Correctly categorize and sort trips
    const { polls, upcomingNonVotableTrips, planningTrips, completedTrips } = useMemo((): { polls: { [pollId: string]: Trip[] }; upcomingNonVotableTrips: Trip[]; planningTrips: Trip[]; completedTrips: Trip[] } => {
        const polls: { [pollId: string]: Trip[] } = {};
        const upcomingNonVotable: Trip[] = [];
        const planning: Trip[] = [];
        const completed: Trip[] = [];
        const pollTripIds = new Set<string>();

        // First, find all poll IDs and the trips associated with them.
        trips.forEach(trip => {
            if (trip.pollId) {
                if (!polls[trip.pollId]) {
                    polls[trip.pollId] = [];
                }
                polls[trip.pollId].push(trip);
                pollTripIds.add(trip.id);
            }
        });

        // Now, categorize the remaining trips.
        trips.forEach(trip => {
            if (pollTripIds.has(trip.id)) {
                return; // Skip poll trips, they are handled separately.
            }

            switch (trip.status) {
                case TripStatus.Upcoming:
                    upcomingNonVotable.push(trip);
                    break;
                case TripStatus.Planning:
                    planning.push(trip);
                    break;
                case TripStatus.Completed:
                    completed.push(trip);
                    break;
            }
        });

        const parseDate = (dateString?: string): number | null => {
            if (!dateString) return null;
            return new Date(dateString.replace(/-/g, '/')).getTime();
        };

        // Sort upcoming and planning trips: soonest first, undated last
        const sortAsc = (a: Trip, b: Trip) => {
            const dateA = parseDate(a.startDate);
            const dateB = parseDate(b.startDate);
            if (dateA && dateB) return dateA - dateB;
            if (dateA) return -1; // a has a date, b doesn't -> a comes first
            if (dateB) return 1;  // b has a date, a doesn't -> b comes first
            return 0;
        };
        
        // Sort completed trips: most recent first, undated last
        const sortDesc = (a: Trip, b: Trip) => {
            const dateA = parseDate(a.endDate || a.startDate);
            const dateB = parseDate(b.endDate || b.startDate);
            if (dateA && dateB) return dateB - dateA;
            if (dateA) return -1;
            if (dateB) return 1;
            return 0;
        };
        
        upcomingNonVotable.sort(sortAsc);
        planning.sort(sortAsc);
        completed.sort(sortDesc);

        // Sort trips within each poll group: by votes (desc), then title (asc)
        for (const pollId in polls) {
            const pollVotes = votes[pollId] || {};
            polls[pollId].sort((a, b) => {
                const votesA = Object.values(pollVotes).filter(v => v === a.id).length;
                const votesB = Object.values(pollVotes).filter(v => v === b.id).length;
                if (votesB !== votesA) {
                    return votesB - votesA;
                }
                return a.title.localeCompare(b.title);
            });
        }

        return {
            polls,
            upcomingNonVotableTrips: upcomingNonVotable,
            planningTrips: planning,
            completedTrips: completed
        };
    }, [trips, votes]);


    if (trips.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-semibold mb-4">No Adventures Planned Yet!</h2>
                <p className="text-lg text-gray-600 mb-8">Let's get started by planning a new adventure or importing existing ones.</p>
                <button
                    onClick={onNewTrip}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}
                >
                    <PlusIcon className="-ml-1 mr-3 h-5 w-5" />
                    Plan a New Adventure
                </button>
                 <div className="mt-8">
                    <button onClick={onImportTrips} className={`text-sm font-medium ${themeClasses.primaryTextClass} hover:underline`}>
                        Or import trips from a file
                    </button>
                </div>
            </div>
        );
    }
    
    const renderTripGrid = (tripsToDisplay: Trip[], emptyMessage: string) => {
        if (tripsToDisplay.length === 0) {
            return (
                <div className="text-center py-10">
                    <p className="text-gray-500 italic">{emptyMessage}</p>
                </div>
            );
        }
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tripsToDisplay.map(trip => (
                    <TripCard
                        key={trip.id}
                        trip={trip}
                        onSelectTrip={onSelectTrip}
                        theme={theme}
                        onMarkTripComplete={onMarkTripComplete}
                        onRestoreTrip={onRestoreTrip}
                        onFinalizeTrip={onFinalizeTrip}
                        onCopyTrip={onCopyTrip}
                        onPrintTrip={onPrintTrip}
                        isSignedIn={isSignedIn}
                    />
                ))}
            </div>
        );
    };

    const renderPolls = () => (
        <div className="mb-12">
            <h3 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">Active Polls</h3>
            <div className="space-y-8">
                {Object.entries(polls).map(([pollId, pollTripsData]) => {
                    const pollTrips = pollTripsData as Trip[];
                    const pollVotes = votes[pollId] || {};
                    const totalVotes = Object.keys(pollVotes).length;
                    const userVotedFor = voterName ? pollVotes[voterName] : null;

                    return (
                    <div key={pollId} className={`p-6 ${themeClasses.accentClass} rounded-lg shadow-md border ${themeClasses.borderClass}`}>
                        <h4 className="text-xl font-semibold mb-1 text-gray-900">{pollId}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                            <UsersIcon className="h-4 w-4" />
                            <span>{totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}</span>
                        </div>
                        <div className="space-y-4">
                            {pollTrips.map(trip => {
                                const tripVoteCount = Object.values(pollVotes).filter(votedTripId => votedTripId === trip.id).length;
                                const votePercentage = totalVotes > 0 ? (tripVoteCount / totalVotes) * 100 : 0;
                                const userSelectedThis = userVotedFor === trip.id;

                                return (
                                    <div key={trip.id}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <a href="#" onClick={(e) => { e.preventDefault(); onSelectTrip(trip.id); }} className={`font-bold text-lg ${themeClasses.primaryTextClass} ${themeClasses.primaryTextHoverClass} hover:underline`}>
                                                    {trip.title}
                                                </a>
                                                <p className="text-xs text-gray-500 italic mt-1">Click title for full trip details.</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 pl-4 pt-1">
                                                <span className="text-sm font-medium text-gray-700">{tripVoteCount} {tripVoteCount === 1 ? 'vote' : 'votes'}</span>
                                            </div>
                                        </div>

                                        <div className="w-full bg-gray-300/70 rounded-full h-2.5 mb-2">
                                            <div className={`${themeClasses.primaryBgClass} h-2.5 rounded-full`} style={{ width: `${votePercentage}%` }}></div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center text-xs text-gray-500">
                                                <CalendarDaysIcon className="h-4 w-4 mr-1.5" />
                                                {trip.startDate && trip.endDate ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}` : 'Unscheduled'}
                                            </div>
                                            <button
                                                onClick={() => onVote(trip.id, pollId)}
                                                disabled={!isSignedIn || userSelectedThis}
                                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                                    !isSignedIn
                                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                                                        : userSelectedThis
                                                            ? `bg-green-600 text-white`
                                                            : `${themeClasses.buttonClass} text-white ${themeClasses.buttonHoverClass}`
                                                }`}
                                            >
                                                {userSelectedThis 
                                                    ? <span className="flex items-center"><CheckIcon className="h-4 w-4 mr-1.5"/> Voted</span> 
                                                    : !isSignedIn 
                                                        ? 'Sign in to vote' 
                                                        : 'Vote'
                                                }
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
             <hr className="my-8 border-gray-300"/>
        </div>
    );

    const renderTabContent = () => {
        switch(activeTab) {
            case TripStatus.Upcoming:
                return (
                    <>
                        {Object.keys(polls).length > 0 && renderPolls()}
                        {renderTripGrid(upcomingNonVotableTrips, Object.keys(polls).length > 0 ? "No other upcoming trips." : "You have no upcoming trips finalized.")}
                    </>
                );
            case TripStatus.Planning:
                return renderTripGrid(planningTrips, "You have no trips in the planning stage.");
            case TripStatus.Completed:
                return renderTripGrid(completedTrips, "You haven't completed any adventures yet.");
            default:
                return null;
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold tracking-tight">Your Adventures</h2>
                <div className="flex items-center space-x-2">
                    {isSignedIn && (
                        <button
                            onClick={onImportTrips}
                            className={`p-2 rounded-full ${themeClasses.primaryDarkTextClass} ${themeClasses.lightBgClass} ${themeClasses.lightBgHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass} transition-colors`}
                            title="Import Trips from JSON"
                        >
                            <UploadIcon className="h-5 w-5" />
                        </button>
                    )}
                     <button
                        onClick={onExportTrips}
                        className={`p-2 rounded-full ${themeClasses.primaryDarkTextClass} ${themeClasses.lightBgClass} ${themeClasses.lightBgHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass} transition-colors`}
                        title="Export Trips to JSON"
                    >
                        <DownloadIcon className="h-5 w-5" />
                    </button>
                    {isSignedIn && (
                        <button
                            onClick={onNewTrip}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}
                        >
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                            New Trip
                        </button>
                    )}
                </div>
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[TripStatus.Upcoming, TripStatus.Planning, TripStatus.Completed].map(status => {
                         const upcomingCount = upcomingNonVotableTrips.length + Object.values(polls).reduce((acc, pollTrips) => acc + (pollTrips as Trip[]).length, 0);
                         const count = status === TripStatus.Upcoming ? upcomingCount : status === TripStatus.Planning ? planningTrips.length : completedTrips.length;
                         const isActive = activeTab === status;
                         return (
                            <button
                                key={status}
                                onClick={() => setActiveTab(status)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isActive ? `${themeClasses.primaryBorderClass} ${themeClasses.primaryTextClass}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {status} ({count})
                            </button>
                         );
                    })}
                </nav>
            </div>

            <div>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default TripList;