
import React from 'react';
import { Trip, RouteType, Theme, THEMES, TripStatus } from '../types';
import { RoadIcon, MountainIcon, CalendarDaysIcon, CheckCircleIcon, ArrowUturnLeftIcon, CopyIcon, GaugeIcon, StarIcon, UsersIcon, PrinterIcon } from './icons';

interface TripCardProps {
    trip: Trip;
    onSelectTrip: (tripId: string) => void;
    theme: Theme;
    onMarkTripComplete: (tripId: string) => void;
    onRestoreTrip: (tripId: string) => void;
    onFinalizeTrip: (tripId: string) => void;
    onCopyTrip: (tripId: string) => void;
    onPrintTrip: (tripId: string) => void;
    isSignedIn?: boolean;
}


const DEFAULT_PAVED_IMAGE = 'https://www.madornomad.com/wp-content/uploads/2020/11/Suzuki-V-Strom-DL650A-Review-2.jpg';
const DEFAULT_MIXED_IMAGE = 'https://t4.ftcdn.net/jpg/02/07/97/37/360_F_207973769_MqzKNrSHDvHxT4G7w5EXZmjpfVRiLfUY.jpg';

const TripCard: React.FC<TripCardProps> = ({ trip, onSelectTrip, theme, onMarkTripComplete, onRestoreTrip, onFinalizeTrip, onCopyTrip, onPrintTrip, isSignedIn = false }) => {
    const themeClasses = THEMES[theme];
    const isPaved = trip.routeType === RouteType.Paved;
    
    const imageUrl = trip.imageUrl || (isPaved ? DEFAULT_PAVED_IMAGE : DEFAULT_MIXED_IMAGE);

    const totalMiles = trip.legs.filter(leg => !leg.isTravelDay).reduce((sum, leg) => sum + (leg.miles || 0), 0);
    const numberOfDays = trip.legs.length;
    const rosterSize = trip.roster?.length || 0;

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation(); // Prevent card's onSelectTrip from firing
        action();
    };

    const cardBorderColor = isPaved ? themeClasses.primaryBorderClass : 'border-amber-700';
    const iconBgColor = isPaved ? themeClasses.lightBgClass : 'bg-amber-100';
    const iconTextColor = isPaved ? themeClasses.primaryTextClass : 'text-amber-700';
    const routeTypeTextColor = isPaved ? themeClasses.primaryDarkTextClass : 'text-amber-800';
    const cardOpacity = trip.status === TripStatus.Completed ? 'opacity-75 hover:opacity-100' : '';

    return (
        <div 
            className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border-t-4 ${cardBorderColor} ${cardOpacity} overflow-hidden`}
        >
            <div className="flex-grow flex cursor-pointer" onClick={() => onSelectTrip(trip.id)}>
                <div className="w-2/3 p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <div className="pr-4">
                                <h3 className="text-xl font-bold">{trip.title}</h3>
                                {numberOfDays > 0 && (
                                    <p className="text-sm text-gray-500">{numberOfDays} {numberOfDays === 1 ? 'Day' : 'Days'}</p>
                                )}
                            </div>
                            <div className={`p-2 rounded-full ${iconBgColor} flex-shrink-0`}>
                                {isPaved ? <RoadIcon className={`h-6 w-6 ${iconTextColor}`} /> : <MountainIcon className={`h-6 w-6 ${iconTextColor}`} />}
                            </div>
                        </div>
                        <p className={`text-sm font-medium mt-2 ${routeTypeTextColor}`}>{trip.routeType}</p>
                    </div>

                    <div className="space-y-2 mt-4">
                        <div className="flex items-center text-sm text-gray-600">
                            <GaugeIcon className="h-5 w-5 mr-1.5 text-gray-400" />
                            <span className="font-medium">{totalMiles.toLocaleString()}</span>
                            <span className="ml-1">total miles</span>
                        </div>
                        {rosterSize > 0 && (
                            <div className="flex items-center text-sm text-gray-600">
                                <UsersIcon className="h-5 w-5 mr-1.5 text-gray-400" />
                                <span className="font-medium">{rosterSize}</span>
                                <span className="ml-1">{rosterSize === 1 ? 'person' : 'people'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-1/3 relative">
                    <img src={imageUrl} alt={trip.title} className="absolute h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent"></div>
                </div>
            </div>
            <div className={`border-t ${themeClasses.borderClass} px-5 py-3 bg-gray-50/80 backdrop-blur-sm`}>
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                        <CalendarDaysIcon className="h-5 w-5" />
                        <span>
                            {trip.startDate && trip.endDate ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}` : 'Unscheduled'}
                        </span>
                    </div>
                    <div className="flex items-center space-x-1">
                        {isSignedIn && trip.status === TripStatus.Planning && (
                            <button onClick={(e) => handleActionClick(e, () => onFinalizeTrip(trip.id))} title="Finalize Plan" className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <StarIcon className="h-6 w-6 text-amber-500 hover:text-amber-600"/>
                            </button>
                        )}
                        {isSignedIn && trip.status === TripStatus.Upcoming && (
                            <button onClick={(e) => handleActionClick(e, () => onMarkTripComplete(trip.id))} title="Mark as Complete" className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <CheckCircleIcon className="h-6 w-6 text-green-500 hover:text-green-700"/>
                            </button>
                        )}
                        {isSignedIn && trip.status === TripStatus.Completed && (
                             <button onClick={(e) => handleActionClick(e, () => onRestoreTrip(trip.id))} title="Restore to Upcoming" className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <ArrowUturnLeftIcon className="h-6 w-6 text-sky-500 hover:text-sky-700"/>
                             </button>
                        )}
                          <button onClick={(e) => handleActionClick(e, () => onPrintTrip(trip.id))} title="Print Tank Bag Slip" className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                            <PrinterIcon className="h-6 w-6 text-teal-600 hover:text-teal-800"/>
                        </button>
                        {isSignedIn && (
                             <button onClick={(e) => handleActionClick(e, () => onCopyTrip(trip.id))} title="Copy to New Trip" className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <CopyIcon className="h-6 w-6 text-indigo-500 hover:text-indigo-700"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripCard;
