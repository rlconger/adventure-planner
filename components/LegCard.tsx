import React from 'react';
import { Leg, Theme, THEMES, AccommodationType } from '../types';
import { PencilIcon, TrashIcon, MapPinIcon, CalendarDaysIcon, TentIcon, HotelIcon, TreeIcon, QuestionMarkCircleIcon, ArrowRightIcon } from './icons';

interface LegCardProps {
    leg: Leg;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
    theme: Theme;
    isSignedIn?: boolean;
}

const AccommodationIcon: React.FC<{ type: AccommodationType; className?: string; }> = ({ type, className }) => {
    const props = { className, "aria-hidden": "true" };
    switch (type) {
        case AccommodationType.Camping:
            return <TentIcon {...props} />;
        case AccommodationType.Hotel:
            return <HotelIcon {...props} />;
        case AccommodationType.Dispersed:
            return <TreeIcon {...props} />;
        case AccommodationType.Other:
            return <QuestionMarkCircleIcon {...props} />;
        default:
            return null;
    }
};

const LegCard: React.FC<LegCardProps> = ({ leg, index, onEdit, onDelete, theme, isSignedIn = false }) => {
    const themeClasses = THEMES[theme];

    const formatDate = (dateString?: string) => {
        if (!dateString) {
            return "Unscheduled";
        }
        return new Date(dateString.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${themeClasses.legCardBorderClass}`}>
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-baseline space-x-4 mb-2">
                            <h4 className="text-xl font-bold">{`Day ${index + 1}`}</h4>
                            <div className="flex items-center text-sm text-gray-500">
                               <CalendarDaysIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                               <span title={leg.accommodationType}>
                                    <AccommodationIcon type={leg.accommodationType} className={`h-4 w-4 mr-1.5 flex-shrink-0 ${themeClasses.primaryTextClass}`} />
                               </span>
                               {formatDate(leg.date)}
                            </div>
                        </div>
                        <div className="flex items-center font-semibold text-lg">
                            <MapPinIcon className="h-5 w-5 mr-2 text-green-500"/> {leg.startLocation} &rarr; <MapPinIcon className="h-5 w-5 mx-2 text-red-500"/> {leg.endLocation}
                        </div>
                    </div>
                    {isSignedIn && (
                        <div className="flex items-center space-x-1">
                            <button onClick={onEdit} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><PencilIcon className="h-5 w-5" /></button>
                            <button onClick={onDelete} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {leg.isTravelDay ? (
                        <div className="flex items-center">
                             <ArrowRightIcon className={`h-5 w-5 mr-2 ${themeClasses.primaryTextMutedClass}`} aria-hidden="true"/>
                            <div>
                                <p className="text-gray-500">Mileage</p>
                                <p className="font-semibold">Travel Day</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-500">Mileage</p>
                            <p className="font-semibold">{leg.miles} miles</p>
                        </div>
                    )}
                     <div>
                        <p className="text-gray-500">Accommodations</p>
                        <p className="font-semibold">{leg.accommodationType}</p>
                    </div>
                    {(leg.sites && leg.sites.length > 0) && (
                         <div>
                            <p className="text-gray-500">Campsite Reservations</p>
                            <ul className="list-disc list-inside font-semibold">
                                {leg.sites.map(s => s.number && <li key={s.id}>{s.number}</li>)}
                            </ul>
                        </div>
                    )}
                    {(leg.rooms && leg.rooms.length > 0) && (
                         <div>
                            <p className="text-gray-500">Hotel Reservations</p>
                            <ul className="list-disc list-inside font-semibold">
                                {leg.rooms.map(r => r.number && <li key={r.id}>{r.number}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                {leg.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-bold uppercase text-gray-500 mb-1">Notes</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{leg.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegCard;
