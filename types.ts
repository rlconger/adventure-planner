export interface GpxFile {
  id: string;
  name: string;
}

export enum RouteType {
  Paved = 'Paved',
  Mixed = 'Mixed Surface'
}

export enum AccommodationType {
  Dispersed = 'Dispersed Camping',
  Camping = 'Campground',
  Hotel = 'Hotel/Motel',
  Other = 'Other'
}

export interface Reservation {
  id: string;
  number: string;
}

export interface Leg {
  id:string;
  date?: string; // YYYY-MM-DD
  startLocation: string;
  endLocation: string;
  miles: number;
  accommodationType: AccommodationType;
  sites?: Reservation[];
  rooms?: Reservation[];
  notes?: string;
  isTravelDay?: boolean;
}

export enum TripStatus {
  Planning = 'Planning',
  Upcoming = 'Upcoming',
  Completed = 'Completed'
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  creatorId?: string;
}

export interface Trip {
  id: string;
  title: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  routeType: RouteType;
  imageUrl?: string;
  legs: Leg[];
  status: TripStatus;
  pollId?: string;
  gpxFiles?: GpxFile[];
  roster?: Attendee[];
  ownerId?: string;
  allowPublicEdit?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type Theme = 'slate' | 'sky' | 'amber' | 'emerald' | 'rose';

export const THEMES: Record<Theme, { 
    name: string; primary: string; textClass: string; bgClass: string; borderClass: string; accentClass: string; buttonClass: string; buttonHoverClass: string; ringClass: string; 
    primaryTextClass: string;
    primaryTextHoverClass: string;
    primaryTextMutedClass: string;
    primaryDarkTextClass: string;
    primaryBorderClass: string;
    primaryBgClass: string;
    lightBgClass: string;
    lightBgHoverClass: string;
    formInputFocusClass: string;
    legCardBorderClass: string;
    statusUpcomingClass: string;
}> = {
    slate: { name: 'Slate', primary: 'slate', textClass: 'text-slate-800', bgClass: 'bg-slate-50', borderClass: 'border-slate-300', accentClass: 'bg-slate-200', buttonClass: 'bg-slate-600', buttonHoverClass: 'hover:bg-slate-700', ringClass: 'focus:ring-slate-500',
        primaryTextClass: 'text-slate-600',
        primaryTextHoverClass: 'hover:text-slate-700',
        primaryTextMutedClass: 'text-slate-500',
        primaryDarkTextClass: 'text-slate-700',
        primaryBorderClass: 'border-slate-500',
        primaryBgClass: 'bg-slate-500',
        lightBgClass: 'bg-slate-100',
        lightBgHoverClass: 'hover:bg-slate-200',
        formInputFocusClass: 'focus:border-slate-500 focus:ring-1 focus:ring-slate-500',
        legCardBorderClass: 'border-slate-400',
        statusUpcomingClass: 'bg-slate-100 text-slate-800',
    },
    sky: { name: 'Sky', primary: 'sky', textClass: 'text-sky-800', bgClass: 'bg-sky-50', borderClass: 'border-sky-300', accentClass: 'bg-sky-200', buttonClass: 'bg-sky-600', buttonHoverClass: 'hover:bg-sky-700', ringClass: 'focus:ring-sky-500',
        primaryTextClass: 'text-sky-600',
        primaryTextHoverClass: 'hover:text-sky-700',
        primaryTextMutedClass: 'text-sky-500',
        primaryDarkTextClass: 'text-sky-700',
        primaryBorderClass: 'border-sky-500',
        primaryBgClass: 'bg-sky-500',
        lightBgClass: 'bg-sky-100',
        lightBgHoverClass: 'hover:bg-sky-200',
        formInputFocusClass: 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500',
        legCardBorderClass: 'border-sky-400',
        statusUpcomingClass: 'bg-sky-100 text-sky-800',
    },
    amber: { name: 'Amber', primary: 'amber', textClass: 'text-amber-800', bgClass: 'bg-amber-50', borderClass: 'border-amber-300', accentClass: 'bg-amber-200', buttonClass: 'bg-amber-600', buttonHoverClass: 'hover:bg-amber-700', ringClass: 'focus:ring-amber-500',
        primaryTextClass: 'text-amber-600',
        primaryTextHoverClass: 'hover:text-amber-700',
        primaryTextMutedClass: 'text-amber-500',
        primaryDarkTextClass: 'text-amber-700',
        primaryBorderClass: 'border-amber-500',
        primaryBgClass: 'bg-amber-500',
        lightBgClass: 'bg-amber-100',
        lightBgHoverClass: 'hover:bg-amber-200',
        formInputFocusClass: 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
        legCardBorderClass: 'border-amber-400',
        statusUpcomingClass: 'bg-amber-100 text-amber-800',
    },
    emerald: { name: 'Emerald', primary: 'emerald', textClass: 'text-emerald-800', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-300', accentClass: 'bg-emerald-200', buttonClass: 'bg-emerald-600', buttonHoverClass: 'hover:bg-emerald-700', ringClass: 'focus:ring-emerald-500',
        primaryTextClass: 'text-emerald-600',
        primaryTextHoverClass: 'hover:text-emerald-700',
        primaryTextMutedClass: 'text-emerald-500',
        primaryDarkTextClass: 'text-emerald-700',
        primaryBorderClass: 'border-emerald-500',
        primaryBgClass: 'bg-emerald-500',
        lightBgClass: 'bg-emerald-100',
        lightBgHoverClass: 'hover:bg-emerald-200',
        formInputFocusClass: 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
        legCardBorderClass: 'border-emerald-400',
        statusUpcomingClass: 'bg-emerald-100 text-emerald-800',
    },
    rose: { name: 'Rose', primary: 'rose', textClass: 'text-rose-800', bgClass: 'bg-rose-50', borderClass: 'border-rose-300', accentClass: 'bg-rose-200', buttonClass: 'bg-rose-600', buttonHoverClass: 'hover:bg-rose-700', ringClass: 'focus:ring-rose-500',
        primaryTextClass: 'text-rose-600',
        primaryTextHoverClass: 'hover:text-rose-700',
        primaryTextMutedClass: 'text-rose-500',
        primaryDarkTextClass: 'text-rose-700',
        primaryBorderClass: 'border-rose-500',
        primaryBgClass: 'bg-rose-500',
        lightBgClass: 'bg-rose-100',
        lightBgHoverClass: 'hover:bg-rose-200',
        formInputFocusClass: 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500',
        legCardBorderClass: 'border-rose-400',
        statusUpcomingClass: 'bg-rose-100 text-rose-800',
    },
};