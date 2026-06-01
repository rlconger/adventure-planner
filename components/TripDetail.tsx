import React, { useState } from 'react';
import { Trip, Leg, Theme, THEMES, GpxFile, TripStatus, Attendee } from '../types';
import LegCard from './LegCard';
import TripRoster from './TripRoster';
import TripMap from './TripMap';
import { PlusIcon, PencilIcon, TrashIcon, CopyIcon, DocumentIcon, DownloadIcon, StarIcon, UsersIcon, MapIcon, PrinterIcon } from './icons';

interface TripDetailProps {
    trip: Trip;
    onBack: () => void;
    onEditTrip: () => void;
    onDeleteTrip: (tripId: string) => void;
    onCopyTrip: (tripId: string) => void;
    onAddLeg: () => void;
    onEditLeg: (leg: Leg) => void;
    onDeleteLeg: (legId: string) => void;
    onDownloadGpx: (file: GpxFile) => void;
    onFinalizeTrip: (tripId: string) => void;
    onUpdateRoster: (roster: Attendee[]) => void;
    onSendItinerary: () => void;
    globalAttendees: Attendee[];
    onSaveGlobalAttendee: (attendeeData: Omit<Attendee, 'id'>, idToUpdate?: string) => Attendee;
    theme: Theme;
    onPrintTrip: (tripId: string) => void;
}

type ActiveTab = 'legs' | 'map' | 'gpx' | 'roster';

const TripDetail: React.FC<TripDetailProps> = ({ trip, onBack, onEditTrip, onDeleteTrip, onCopyTrip, onAddLeg, onEditLeg, onDeleteLeg, onDownloadGpx, onFinalizeTrip, onUpdateRoster, onSendItinerary, globalAttendees, onSaveGlobalAttendee, theme, onPrintTrip }) => {
    const totalMiles = trip.legs.filter(leg => !leg.isTravelDay).reduce((sum, leg) => sum + (leg.miles || 0), 0);
    const themeClasses = THEMES[theme];
    
    const hasGpxFiles = trip.gpxFiles && trip.gpxFiles.length > 0;
    const [activeTab, setActiveTab] = useState<ActiveTab>('legs');

    const formatDateRange = (start?: string, end?: string) => {
        if (!start || !end) {
            return 'Unscheduled';
        }
        const startDate = new Date(start.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const endDate = new Date(end.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        return `${startDate} - ${endDate}`;
    }

    const statusColors: Record<TripStatus, string> = {
        [TripStatus.Planning]: 'bg-yellow-100 text-yellow-800',
        [TripStatus.Upcoming]: themeClasses.statusUpcomingClass,
        [TripStatus.Completed]: 'bg-green-100 text-green-800',
    };
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'map':
                return (
                    <TripMap gpxFiles={trip.gpxFiles!} />
                );
            case 'gpx':
                return (
                    <div className="mt-8">
                        <div className="space-y-3 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                            {trip.gpxFiles!.map(file => (
                                <div key={file.id} className={`flex items-center justify-between p-3 ${themeClasses.lightBgClass} rounded-md`}>
                                    <span className={`font-medium ${themeClasses.textClass} truncate pr-4`}>{file.name}</span>
                                    <button
                                        onClick={() => onDownloadGpx(file)}
                                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}
                                    >
                                        <DownloadIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                                        Download
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'roster':
                return <TripRoster 
                    trip={trip} 
                    onUpdateRoster={onUpdateRoster} 
                    onSendItinerary={onSendItinerary} 
                    globalAttendees={globalAttendees}
                    onSaveGlobalAttendee={onSaveGlobalAttendee}
                    theme={theme} 
                />;
            case 'legs':
            default:
                return (
                    <>
                        <div className="flex justify-between items-center my-6">
                            <h3 className="text-2xl font-bold">Trip Legs</h3>
                             <button onClick={onAddLeg} className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                Add Leg
                            </button>
                        </div>
                        {trip.legs.length > 0 ? (
                            <div className="space-y-4">
                                {trip.legs.map((leg, index) => (
                                    <LegCard key={leg.id} leg={leg} index={index} onEdit={() => onEditLeg(leg)} onDelete={() => onDeleteLeg(leg.id)} theme={theme} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                <h4 className="text-xl font-semibold">No legs planned for this trip yet.</h4>
                                <p className="text-gray-500 mt-2">Start by adding the first day of your journey!</p>
                                 <button onClick={onAddLeg} className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Add First Leg
                                </button>
                            </div>
                        )}
                    </>
                );
        }
    };


    return (
        <div>
            <button onClick={onBack} className="mb-6 text-sm font-semibold text-gray-600 hover:text-gray-900">&larr; Back to All Trips</button>

            <div className={`p-6 rounded-lg shadow-lg bg-white mb-8 border-l-4 ${themeClasses.primaryBorderClass}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h2 className="text-3xl font-bold">{trip.title}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${statusColors[trip.status]}`}>
                                {trip.status}
                            </span>
                        </div>
                        <p className="text-md text-gray-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                        {trip.status === TripStatus.Planning && (
                             <button onClick={() => onFinalizeTrip(trip.id)} className="p-2 rounded-full hover:bg-gray-200 transition-colors text-amber-500" title="Finalize Plan"><StarIcon className="h-5 w-5" /></button>
                        )}
                        <button onClick={() => onPrintTrip(trip.id)} className="p-2 rounded-full hover:bg-gray-200 transition-colors text-teal-600" title="Print Tank Bag Slip"><PrinterIcon className="h-5 w-5" /></button>
                        <button onClick={() => onCopyTrip(trip.id)} className="p-2 rounded-full hover:bg-gray-200 transition-colors text-indigo-500" title="Copy Trip"><CopyIcon className="h-5 w-5" /></button>
                        <button onClick={onEditTrip} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Edit Trip"><PencilIcon className="h-5 w-5" /></button>
                        <button onClick={() => onDeleteTrip(trip.id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors" title="Delete Trip"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                </div>
                <div className="flex items-center space-x-6 text-center">
                    <div>
                        <p className="text-2xl font-bold">{totalMiles.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total Miles</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{trip.legs.length}</p>
                        <p className="text-sm text-gray-500">Days / Legs</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold">{trip.routeType}</p>
                        <p className="text-sm text-gray-500">Route Type</p>
                    </div>
                </div>
            </div>

             <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('legs')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'legs' ? `${themeClasses.primaryBorderClass} ${themeClasses.primaryTextClass}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Itinerary
                    </button>
                    {hasGpxFiles && (
                         <button
                            onClick={() => setActiveTab('map')}
                            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'map' ? `${themeClasses.primaryBorderClass} ${themeClasses.primaryTextClass}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                             <MapIcon className={`mr-2 h-5 w-5 ${activeTab === 'map' ? themeClasses.primaryTextMutedClass : 'text-gray-400 group-hover:text-gray-500'}`} />
                            Map
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'roster' ? `${themeClasses.primaryBorderClass} ${themeClasses.primaryTextClass}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                         <UsersIcon className={`mr-2 h-5 w-5 ${activeTab === 'roster' ? themeClasses.primaryTextMutedClass : 'text-gray-400 group-hover:text-gray-500'}`} />
                        Roster
                    </button>
                    {hasGpxFiles && (
                         <button
                            onClick={() => setActiveTab('gpx')}
                            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'gpx' ? `${themeClasses.primaryBorderClass} ${themeClasses.primaryTextClass}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                             <DocumentIcon className={`mr-2 h-5 w-5 ${activeTab === 'gpx' ? themeClasses.primaryTextMutedClass : 'text-gray-400 group-hover:text-gray-500'}`} />
                            GPX Routes
                        </button>
                    )}
                </nav>
            </div>
            
            {renderTabContent()}

        </div>
    );
};

export default TripDetail;