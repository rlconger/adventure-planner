import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db as firestoreDb, auth, handleFirestoreError, OperationType } from './firebase';
import { Trip, Leg, Theme, THEMES, RouteType, AccommodationType, GpxFile, TripStatus, Attendee } from './types';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import TripForm from './components/TripForm';
import LegForm from './components/LegForm';
import ThemeSwitcher from './components/ThemeSwitcher';
import Modal from './components/Modal';
import VoterNameModal from './components/VoterNameModal';
import { TankBagPrintModal } from './components/TankBagPrintModal';
import * as db from './db';

type Votes = { [pollId: string]: { [voterName: string]: string } }; // pollId -> voterName -> votedTripId

// Helper function to remove undefined properties for Firestore compatibility
const cleanForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => cleanForFirestore(item)).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = obj[key];
                if (val !== undefined && val !== null) {
                    cleaned[key] = cleanForFirestore(val);
                } else if (val === null) {
                    cleaned[key] = null;
                }
            }
        }
        return cleaned;
    }
    return obj;
};

// Helper function to ensure imported data is valid and has unique IDs
const validateAndPrepareTrips = async (data: any): Promise<Trip[]> => {
    if (!Array.isArray(data)) {
        throw new Error("Invalid data format: Expected an array of trips.");
    }

    const newTrips: Trip[] = [];
    for (const trip of data) {
         if (typeof trip !== 'object' || trip === null || !trip.title) {
            console.warn("Skipping invalid trip object (missing title):", trip);
            continue;
        }
        
        const newTrip: Trip = JSON.parse(JSON.stringify(trip));
        newTrip.id = crypto.randomUUID();
        newTrip.ownerId = auth.currentUser?.uid || 'anonymous';
        newTrip.createdAt = newTrip.createdAt || new Date().toISOString();
        newTrip.updatedAt = new Date().toISOString();
        
        newTrip.status = Object.values(TripStatus).includes(trip.status) ? trip.status : TripStatus.Planning;
        newTrip.routeType = trip.routeType && Object.values(RouteType).includes(trip.routeType) ? trip.routeType : RouteType.Paved;
        if (trip.pollId) {
            newTrip.pollId = trip.pollId;
        } else {
            delete newTrip.pollId;
        }
        if (trip.imageUrl) {
            newTrip.imageUrl = trip.imageUrl;
        } else {
            delete newTrip.imageUrl;
        }

        if (Array.isArray(trip.roster)) {
            newTrip.roster = trip.roster.map((attendee: any) => {
                if (typeof attendee === 'object' && attendee !== null && typeof attendee.name === 'string') {
                    return {
                        id: crypto.randomUUID(),
                        name: attendee.name,
                        email: attendee.email || '',
                        phone: attendee.phone || '',
                    };
                }
                return null;
            }).filter((a): a is Attendee => a !== null);
        } else {
            newTrip.roster = [];
        }

        // Handle GPX files: save content to DB, store metadata in trip object
        const gpxMetadata: GpxFile[] = [];
        if (Array.isArray(trip.gpxFiles)) {
            for (const gpx of trip.gpxFiles) {
                if (gpx && typeof gpx.name === 'string' && typeof gpx.content === 'string') {
                    const newGpxFile = {
                        id: crypto.randomUUID(),
                        name: gpx.name,
                    };
                    await db.saveGpx({ id: newGpxFile.id, content: gpx.content });
                    gpxMetadata.push(newGpxFile);
                }
            }
        }
        newTrip.gpxFiles = gpxMetadata;

        if (!Array.isArray(newTrip.legs)) {
            newTrip.legs = [];
        }

        newTrip.legs.forEach((leg: any) => {
            leg.id = crypto.randomUUID();
            leg.accommodationType = leg.accommodationType && Object.values(AccommodationType).includes(leg.accommodationType) ? leg.accommodationType : AccommodationType.Other;
            leg.notes = leg.notes || '';

            if (leg.sites && Array.isArray(leg.sites)) {
                leg.sites.forEach((site: any) => site.id = crypto.randomUUID());
            } else {
                leg.sites = [];
            }
            if (leg.rooms && Array.isArray(leg.rooms)) {
                leg.rooms.forEach((room: any) => room.id = crypto.randomUUID());
            } else {
                leg.rooms = [];
            }
        });
        newTrips.push(newTrip);
    }
    return newTrips;
};


function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [trips, setTrips] = useState<Trip[]>(() => {
        try {
            const savedTrips = localStorage.getItem('adventure-planner-trips');
            const parsedTrips = savedTrips ? JSON.parse(savedTrips) : [];
            
            if (!Array.isArray(parsedTrips)) {
                console.warn("Stored trips data is not an array, resetting.");
                return [];
            }

            // Migration logic for old 'active'/'completed' string statuses
            return parsedTrips.map((trip: any) => {
                let status = trip.status;
                if (status === 'active') {
                    status = (trip.startDate || trip.pollId) ? TripStatus.Upcoming : TripStatus.Planning;
                } else if (status === 'completed') {
                    status = TripStatus.Completed;
                } else if (!Object.values(TripStatus).includes(status)) {
                    // Fallback for any other invalid or old state
                    status = TripStatus.Planning;
                }
                return {
                    ...trip,
                    status,
                    pollId: trip.pollId || undefined,
                    gpxFiles: trip.gpxFiles || [],
                    roster: trip.roster || [],
                };
            });
        } catch (error) {
            console.error("Could not load trips from local storage", error);
            return [];
        }
    });
    
    const [globalAttendees, setGlobalAttendees] = useState<Attendee[]>(() => {
        try {
            const saved = localStorage.getItem('adventure-planner-global-attendees');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Could not load global attendees from local storage", error);
            return [];
        }
    });

    const [votes, setVotes] = useState<Votes>(() => {
        try {
            const savedVotes = localStorage.getItem('adventure-planner-votes');
            return savedVotes ? JSON.parse(savedVotes) : {};
        } catch (error) {
            console.error("Could not load votes from local storage", error);
            return {};
        }
    });

    const [voterName, setVoterName] = useState<string>(() => localStorage.getItem('adventure-planner-voterName') || '');
    const [isVoterNameModalOpen, setIsVoterNameModalOpen] = useState(false);
    const [pendingVote, setPendingVote] = useState<{ tripId: string; pollId: string } | null>(null);

    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('adventure-planner-theme');
        return (savedTheme && THEMES[savedTheme as Theme]) ? savedTheme as Theme : 'sky';
    });

    const [view, setView] = useState<'list' | 'detail'>('list');
    const [activeTripId, setActiveTripId] = useState<string | null>(null);
    
    const [isTripFormOpen, setIsTripFormOpen] = useState(false);
    const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
    
    const [isLegFormOpen, setIsLegFormOpen] = useState(false);
    const [legToEdit, setLegToEdit] = useState<Leg | null>(null);

    const [actionToConfirm, setActionToConfirm] = useState<{ message: string; onConfirm: () => void; confirmText: string; } | null>(null);
    const [tripToPrint, setTripToPrint] = useState<Trip | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize local IndexedDB cache
    useEffect(() => {
        db.initDB();
    }, []);

    // Firebase Auth Observer
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false);
            if (currentUser) {
                migrateLocalDataToCloud(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

    // Firestore real-time trips synchronization
    useEffect(() => {
        if (!user) {
            // When not logged in, keep local storage trips as the offline source of truth
            try {
                const savedTrips = localStorage.getItem('adventure-planner-trips');
                if (savedTrips) {
                    const parsedTrips = JSON.parse(savedTrips);
                    if (Array.isArray(parsedTrips)) {
                        setTrips(parsedTrips);
                    }
                }
            } catch (err) {
                console.error("Failed to restore offline trips from local storage:", err);
            }
            return;
        }

        const unsubscribe = onSnapshot(collection(firestoreDb, 'trips'), (snapshot) => {
            const cloudTrips: Trip[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data() as Trip;
                // Only sync trips owned by current user OR associated with active voting polls in the group
                if (data.ownerId === user.uid || data.pollId) {
                    cloudTrips.push(data);
                }
            });
            setTrips(cloudTrips);
        }, (error) => {
            console.error("Trips real-time sync subscription error:", error);
        });
        return () => unsubscribe();
    }, [user]);

    // Firestore real-time votes/polls synchronization
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(firestoreDb, 'votes'), (snapshot) => {
            const cloudVotes: Votes = {};
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.pollId && data.ballots) {
                    cloudVotes[data.pollId] = data.ballots;
                }
            });
            setVotes(cloudVotes);
        }, (error) => {
            console.error("Votes real-time sync subscription error:", error);
        });
        return () => unsubscribe();
    }, []);

    // Firestore real-time global attendees sync (requires Auth)
    useEffect(() => {
        if (!user) {
            // Keep local attendees if signed out
            try {
                const saved = localStorage.getItem('adventure-planner-global-attendees');
                const parsed = saved ? JSON.parse(saved) : [];
                setGlobalAttendees(Array.isArray(parsed) ? parsed : []);
            } catch (err) {
                setGlobalAttendees([]);
            }
            return;
        }
        const unsubscribe = onSnapshot(collection(firestoreDb, 'globalAttendees'), (snapshot) => {
            const cloudAttendees: Attendee[] = [];
            snapshot.forEach((docSnap) => {
                cloudAttendees.push(docSnap.data() as Attendee);
            });
            setGlobalAttendees(cloudAttendees);
        }, (error) => {
            console.error("Global attendees subscription error:", error);
        });
        return () => unsubscribe();
    }, [user]);

    // Helper to push/sync trip updates to cloud Firestore
    const syncTripUpdate = async (updatedTrip: Trip) => {
        // Optimistic state updates on client first
        setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));

        if (auth.currentUser && updatedTrip.ownerId === auth.currentUser.uid) {
            const path = `trips/${updatedTrip.id}`;
            try {
                await setDoc(doc(firestoreDb, 'trips', updatedTrip.id), cleanForFirestore({
                    ...updatedTrip,
                    updatedAt: new Date().toISOString()
                }));
            } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, path);
            }
        }
    };

    // Helper to migrate legacy local data to user's personal cloud database secure account
    const migrateLocalDataToCloud = async (currentUser: User) => {
        try {
            const savedTripsStr = localStorage.getItem('adventure-planner-trips');
            if (!savedTripsStr) return;
            const localTrips = JSON.parse(savedTripsStr);
            if (!Array.isArray(localTrips) || localTrips.length === 0) return;

            for (const trip of localTrips) {
                const tripRef = doc(firestoreDb, 'trips', trip.id);
                const docSnap = await getDoc(tripRef);
                if (!docSnap.exists()) {
                    const migratedTrip: Trip = {
                        ...trip,
                        ownerId: currentUser.uid,
                        createdAt: trip.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    await setDoc(tripRef, cleanForFirestore(migratedTrip));
                    
                    if (trip.gpxFiles && trip.gpxFiles.length > 0) {
                        for (const file of trip.gpxFiles) {
                            const content = await db.getGpx(file.id);
                            if (content) {
                                await db.saveGpx({ id: file.id, content });
                            }
                        }
                    }
                }
            }
            
            // Also migrate global attendees
            const savedAttendeesStr = localStorage.getItem('adventure-planner-global-attendees');
            if (savedAttendeesStr) {
                const localAttendees = JSON.parse(savedAttendeesStr);
                if (Array.isArray(localAttendees)) {
                    for (const attendee of localAttendees) {
                        const attRef = doc(firestoreDb, 'globalAttendees', attendee.id);
                        const attSnap = await getDoc(attRef);
                        if (!attSnap.exists()) {
                            await setDoc(attRef, cleanForFirestore({
                                ...attendee,
                                creatorId: currentUser.uid
                            }));
                        }
                    }
                }
            }

            console.log("Local items successfully migrated to Cloud Firestore!");
        } catch (e) {
            console.error("Local data cloud migration failure:", e);
        }
    };

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                await migrateLocalDataToCloud(result.user);
            }
        } catch (error) {
            console.error("Login failed:", error);
            alert("Google Login failed. Please check your browser popup permissions.");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    useEffect(() => {
        try {
            localStorage.setItem('adventure-planner-trips', JSON.stringify(trips));
        } catch (error) {
            console.error("Failed to save trips to local storage:", error);
            alert("An unknown error occurred while trying to save your trips.");
        }
    }, [trips]);
    
    useEffect(() => {
        try {
            localStorage.setItem('adventure-planner-global-attendees', JSON.stringify(globalAttendees));
        } catch (error) {
            console.error("Failed to save global attendees to local storage:", error);
        }
    }, [globalAttendees]);

     useEffect(() => {
        localStorage.setItem('adventure-planner-votes', JSON.stringify(votes));
    }, [votes]);

    useEffect(() => {
        if (voterName) {
            localStorage.setItem('adventure-planner-voterName', voterName);
        } else {
            localStorage.removeItem('adventure-planner-voterName');
        }
    }, [voterName]);

    useEffect(() => {
        localStorage.setItem('adventure-planner-theme', theme);
        document.documentElement.style.setProperty('--theme-primary', THEMES[theme].primary);
        document.body.className = `${THEMES[theme].bgClass} ${THEMES[theme].textClass} transition-colors duration-300`;
    }, [theme]);

    useEffect(() => {
        // This effect synchronizes the global attendees list with the rosters from all trips.
        // This fixes the issue where attendees from one trip's roster weren't available
        // in the "global address book" for other trips.
        const allRosterAttendees = trips.flatMap(trip => trip.roster || []);
        
        setGlobalAttendees(prevGlobalAttendees => {
            const combined = [...prevGlobalAttendees, ...allRosterAttendees];
            
            // Use a Map to deduplicate based on the attendee's name. This is a pragmatic approach
            // to consolidate contacts that might have different IDs due to imports or legacy data.
            const uniqueAttendeesMap = new Map<string, Attendee>();
            
            combined.forEach(attendee => {
                if (!attendee || !attendee.name) return; // Ignore invalid attendees

                const existing = uniqueAttendeesMap.get(attendee.name);
                if (!existing) {
                    // If we haven't seen this name before, add it.
                    uniqueAttendeesMap.set(attendee.name, { ...attendee });
                } else {
                    // If we have seen this name, merge info. Keep the original ID but fill in missing details.
                    const mergedAttendee: Attendee = {
                        id: existing.id, // Keep the ID of the first one we saw
                        name: existing.name,
                        email: existing.email || attendee.email || '',
                        phone: existing.phone || attendee.phone || '',
                    };
                    uniqueAttendeesMap.set(attendee.name, mergedAttendee);
                }
            });
            
            const newGlobalAttendees = Array.from(uniqueAttendeesMap.values());

            // Sort for a consistent order in the UI.
            newGlobalAttendees.sort((a, b) => a.name.localeCompare(b.name));

            // To prevent unnecessary re-renders and potential loops, only update the state
            // if the contents of the global attendees list have actually changed.
            if (JSON.stringify(prevGlobalAttendees) !== JSON.stringify(newGlobalAttendees)) {
                return newGlobalAttendees;
            }
            
            return prevGlobalAttendees;
        });
    }, [trips]);

    const activeTrip = useMemo(() => {
        return trips.find(t => t.id === activeTripId) || null;
    }, [trips, activeTripId]);

    const updateTripWithRecalculatedDates = (trip: Trip, updatedLegs: Leg[]): Trip => {
        const legDates = updatedLegs
            .map(l => l.date)
            .filter((d): d is string => !!d && d.length > 0);
        
        if (legDates.length > 0) {
            legDates.sort();
            const newStartDate = legDates[0];
            const newEndDate = legDates[legDates.length - 1];
            return { ...trip, legs: updatedLegs, startDate: newStartDate, endDate: newEndDate };
        } else {
            const newStatus = trip.status === TripStatus.Upcoming ? TripStatus.Planning : trip.status;
            return { ...trip, legs: updatedLegs, startDate: undefined, endDate: undefined, status: newStatus };
        }
    };

    const handleOpenTripForm = (trip: Trip | null = null) => {
        setTripToEdit(trip);
        setIsTripFormOpen(true);
    };
    
    const handleSaveTrip = async (tripData: Pick<Trip, 'title' | 'startDate' | 'endDate' | 'routeType' | 'pollId' | 'imageUrl'> & { gpxFiles: (GpxFile & { content?: string })[] }) => {
        const tripToEditBeforeChanges = tripToEdit ? trips.find(t => t.id === tripToEdit.id) : null;
        const originalGpxIds = new Set(tripToEditBeforeChanges?.gpxFiles?.map(f => f.id) || []);
        
        const newGpxMetadata = tripData.gpxFiles.map(({ id, name }) => ({ id, name }));
        const newGpxIds = new Set(newGpxMetadata.map(f => f.id));

        try {
            const idsToDelete = [...originalGpxIds].filter(id => !newGpxIds.has(id));
            if (idsToDelete.length > 0) {
                await Promise.all(idsToDelete.map(id => db.deleteGpx(id)));
            }

            const filesToSaveToDb = tripData.gpxFiles.filter(f => f.content);
            if (filesToSaveToDb.length > 0) {
                await Promise.all(filesToSaveToDb.map(file => db.saveGpx({ id: file.id, content: file.content! })));
            }

            const finalTripData = { ...tripData, gpxFiles: newGpxMetadata };

            if (tripToEdit) {
                const updatedTrip: Trip = {
                    ...tripToEdit,
                    ...finalTripData,
                    ownerId: tripToEdit.ownerId || auth.currentUser?.uid || 'anonymous',
                    updatedAt: new Date().toISOString()
                };
                await syncTripUpdate(updatedTrip);
            } else {
                const newId = crypto.randomUUID();
                const newTrip: Trip = {
                    id: newId,
                    ...finalTripData,
                    legs: [],
                    status: TripStatus.Planning,
                    roster: [],
                    ownerId: auth.currentUser?.uid || 'anonymous',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await syncTripUpdate(newTrip);
            }
            setIsTripFormOpen(false);
            setTripToEdit(null);
        } catch (error) {
            console.error("Failed to save trip and/or GPX files:", error);
            alert("An error occurred while saving. Please try again.");
        }
    };

    const handleDeleteTrip = (tripId: string) => {
        setActionToConfirm({
            message: 'Are you sure you want to delete this entire trip? This action cannot be undone.',
            confirmText: 'Delete Trip',
            onConfirm: async () => {
                const tripToDelete = trips.find(t => t.id === tripId);
                
                try {
                    if (tripToDelete?.gpxFiles && tripToDelete.gpxFiles.length > 0) {
                        await Promise.all(tripToDelete.gpxFiles.map(file => db.deleteGpx(file.id)));
                    }
                    
                    setTrips(prevTrips => prevTrips.filter(t => t.id !== tripId));
                    
                    if (auth.currentUser && tripToDelete?.ownerId === auth.currentUser.uid) {
                        await deleteDoc(doc(firestoreDb, 'trips', tripId));
                    }
                    
                    if (tripToDelete?.pollId) {
                        try {
                            await deleteDoc(doc(firestoreDb, 'votes', tripToDelete.pollId));
                        } catch (e) {
                            console.warn("Could not delete poll votes from cloud:", e);
                        }
                        
                        setVotes(prevVotes => {
                            const newVotes = { ...prevVotes };
                            delete newVotes[tripToDelete.pollId!];
                            return newVotes;
                        });
                    }

                    setView('list');
                    setActiveTripId(null);
                } catch (error) {
                    console.error("Failed to delete trip and its GPX files:", error);
                    alert("An error occurred while deleting the trip. Please try again.");
                }
            },
        });
    };
    
    const handleMarkTripComplete = async (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        if (trip) {
            const updated = { ...trip, status: TripStatus.Completed, updatedAt: new Date().toISOString() };
            await syncTripUpdate(updated);
        }
    };

    const handleRestoreTrip = async (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        if (trip) {
            const updated = { ...trip, status: TripStatus.Upcoming, updatedAt: new Date().toISOString() };
            await syncTripUpdate(updated);
        }
    };

    const handleFinalizeTrip = async (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        if (trip) {
            const updated = { ...trip, status: TripStatus.Upcoming, updatedAt: new Date().toISOString() };
            await syncTripUpdate(updated);
        }
    };

    const handleCopyTrip = async (tripId: string) => {
        const tripToCopy = trips.find(t => t.id === tripId);
        if (!tripToCopy) return;

        try {
            const newTrip: Trip = JSON.parse(JSON.stringify(tripToCopy));

            newTrip.id = crypto.randomUUID();
            newTrip.title = `${newTrip.title} (Copy)`;
            newTrip.status = TripStatus.Planning;
            newTrip.pollId = undefined;
            newTrip.imageUrl = tripToCopy.imageUrl;
            newTrip.ownerId = auth.currentUser?.uid || 'anonymous';
            newTrip.createdAt = new Date().toISOString();
            newTrip.updatedAt = new Date().toISOString();

            if (newTrip.gpxFiles) {
                const newGpxFiles: GpxFile[] = [];
                for (const file of newTrip.gpxFiles) {
                    const content = await db.getGpx(file.id);
                    if (typeof content === 'string') {
                        const newFile = { ...file, id: crypto.randomUUID() };
                        await db.saveGpx({ id: newFile.id, content });
                        newGpxFiles.push(newFile);
                    }
                }
                newTrip.gpxFiles = newGpxFiles;
            }

            newTrip.legs.forEach(leg => {
                leg.id = crypto.randomUUID();
                if (leg.sites) leg.sites.forEach(site => site.id = crypto.randomUUID());
                if (leg.rooms) leg.rooms.forEach(room => room.id = crypto.randomUUID());
            });

            if (newTrip.roster) {
                newTrip.roster.forEach(attendee => attendee.id = crypto.randomUUID());
            }
            
            await syncTripUpdate(newTrip);
            setActiveTripId(newTrip.id);
            setView('detail');
        } catch (error) {
            console.error("Failed to copy trip:", error);
            alert("An error occurred while copying the trip.");
        }
    };

    const handlePrintTrip = (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        if (trip) {
            setTripToPrint(trip);
        }
    };


    const handleSelectTrip = (tripId: string) => {
        setActiveTripId(tripId);
        setView('detail');
    };

    const handleOpenLegForm = (leg: Leg | null = null) => {
        setLegToEdit(leg);
        setIsLegFormOpen(true);
    };
    
    const handleLegFormClose = useCallback(() => {
        setIsLegFormOpen(false);
        setLegToEdit(null);
    }, []);

    const handleSaveLeg = async (legData: Omit<Leg, 'id'>, insertionIndex?: number) => {
        if (!activeTripId) return;

        const trip = trips.find(t => t.id === activeTripId);
        if (!trip) return;

        let updatedLegs: Leg[];

        if (legToEdit) {
            // Logic for editing an existing leg
            const legIndex = trip.legs.findIndex(l => l.id === legToEdit.id);
            if (legIndex === -1) return;

            updatedLegs = [...trip.legs]; // Create a mutable copy

            // Update the leg being edited
            const updatedLeg = { ...updatedLegs[legIndex], ...legData };
            updatedLegs[legIndex] = updatedLeg;

            // If the end location changed, update the next leg's start location
            if (updatedLeg.endLocation !== legToEdit.endLocation && legIndex < updatedLegs.length - 1) {
                const nextLeg = updatedLegs[legIndex + 1];
                updatedLegs[legIndex + 1] = { ...nextLeg, startLocation: updatedLeg.endLocation };
            }

            // If the start location changed, update the previous leg's end location
            if (updatedLeg.startLocation !== legToEdit.startLocation && legIndex > 0) {
                const prevLeg = updatedLegs[legIndex - 1];
                updatedLegs[legIndex - 1] = { ...prevLeg, endLocation: updatedLeg.startLocation };
            }
        } else {
            // Logic for adding a new leg
            const newLeg = { ...legData, id: crypto.randomUUID() };
            updatedLegs = [...trip.legs];
            const insertionPoint = insertionIndex ?? trip.legs.length;
            
            updatedLegs.splice(insertionPoint, 0, newLeg);

            // After inserting, ensure adjacent legs are connected.
            const prevLeg = updatedLegs[insertionPoint - 1];
            if (prevLeg && prevLeg.endLocation !== newLeg.startLocation) {
                updatedLegs[insertionPoint - 1] = { ...prevLeg, endLocation: newLeg.startLocation };
            }
            
            const nextLeg = updatedLegs[insertionPoint + 1];
            if (nextLeg && nextLeg.startLocation !== newLeg.endLocation) {
                updatedLegs[insertionPoint + 1] = { ...nextLeg, startLocation: newLeg.endLocation };
            }
        }

        const recalculated = updateTripWithRecalculatedDates(trip, updatedLegs);
        await syncTripUpdate(recalculated);

        setIsLegFormOpen(false);
        setLegToEdit(null);
    };

    const handleDeleteLeg = (legId: string) => {
         if (!activeTripId) return;
         setActionToConfirm({
            message: 'Are you sure you want to delete this leg of the trip?',
            confirmText: 'Delete Leg',
            onConfirm: async () => {
                const trip = trips.find(t => t.id === activeTripId);
                if (!trip) return;

                const updatedLegs = trip.legs.filter(l => l.id !== legId);
                const deletedLegIndex = trip.legs.findIndex(l => l.id === legId);
                
                if (deletedLegIndex > 0 && deletedLegIndex < trip.legs.length - 1) {
                    const prevLeg = updatedLegs[deletedLegIndex - 1];
                    const nextLeg = updatedLegs[deletedLegIndex]; // next leg is now at the deleted index
                    if (prevLeg && nextLeg) {
                        prevLeg.endLocation = nextLeg.startLocation;
                    }
                }
                
                const recalculated = updateTripWithRecalculatedDates(trip, updatedLegs);
                await syncTripUpdate(recalculated);
            }
        });
    };

    const handleUpdateRoster = async (tripId: string, roster: Attendee[]) => {
        const trip = trips.find(t => t.id === tripId);
        if (trip) {
            const updated = { ...trip, roster, updatedAt: new Date().toISOString() };
            await syncTripUpdate(updated);
        }
    };
    
    const handleSaveGlobalAttendee = (attendeeData: Omit<Attendee, 'id'>, idToUpdate?: string): Attendee => {
        const targetId = idToUpdate || crypto.randomUUID();
        const savedAttendee: Attendee = { 
            ...attendeeData, 
            id: targetId, 
            creatorId: auth.currentUser?.uid || 'anonymous' 
        };
        
        // Optimistic local state update
        setGlobalAttendees(prev => {
            const index = prev.findIndex(a => a.id === targetId || a.name.toLowerCase() === attendeeData.name.toLowerCase());
            if (index !== -1) {
                return prev.map((a, i) => i === index ? savedAttendee : a);
            }
            return [...prev, savedAttendee];
        });

        // Run async database sync in background to match sync signature
        if (auth.currentUser) {
            const path = `globalAttendees/${targetId}`;
            setDoc(doc(firestoreDb, 'globalAttendees', targetId), cleanForFirestore(savedAttendee))
                .catch(error => {
                    console.error("Global attendee Firestore sync failure:", error);
                });
        }
        
        return savedAttendee;
    };


    const formatItineraryForEmail = (trip: Trip): string => {
        const formatDate = (dateString?: string) => {
            if (!dateString) return "Unscheduled";
            return new Date(dateString.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        };
        const totalMiles = trip.legs.filter(leg => !leg.isTravelDay).reduce((sum, leg) => sum + (leg.miles || 0), 0);
        
        const bodyParts: string[] = [];

        bodyParts.push(`Hello team,`);
        bodyParts.push(`\nHere is the itinerary for our upcoming trip: "${trip.title}".\n`);
        
        bodyParts.push(`====================`);
        bodyParts.push(`TRIP SUMMARY`);
        bodyParts.push(`====================`);
        bodyParts.push(`Dates: ${trip.startDate && trip.endDate ? `${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}` : 'Unscheduled'}`);
        bodyParts.push(`Total Driving Miles: ${totalMiles.toLocaleString()} miles`);
        bodyParts.push(`Route Type: ${trip.routeType}\n`);

        if (trip.legs.length > 0) {
            bodyParts.push(`====================`);
            bodyParts.push(`DAILY ITINERARY`);
            bodyParts.push(`====================\n`);

            trip.legs.forEach((leg, index) => {
                bodyParts.push(`DAY ${index + 1}: ${formatDate(leg.date)}`);
                bodyParts.push(`--------------------`);
                bodyParts.push(`From: ${leg.startLocation}`);
                bodyParts.push(`To: ${leg.endLocation}`);
                bodyParts.push(`Mileage: ${leg.isTravelDay ? 'Travel Day (no miles)' : `${leg.miles} miles`}`);
                bodyParts.push(`Accommodation: ${leg.accommodationType}`);
                
                if (leg.sites && leg.sites.length > 0) {
                    const siteNumbers = leg.sites.map(s => s.number).filter(Boolean).join(', ');
                    if (siteNumbers) {
                       bodyParts.push(`Campsite Reservations: ${siteNumbers}`);
                    }
                }
                if (leg.rooms && leg.rooms.length > 0) {
                    const roomNumbers = leg.rooms.map(r => r.number).filter(Boolean).join(', ');
                     if (roomNumbers) {
                        bodyParts.push(`Hotel Reservations: ${roomNumbers}`);
                     }
                }
                if (leg.notes) {
                    bodyParts.push(`Notes: ${leg.notes}`);
                }
                bodyParts.push(`\n`);
            });
        }
        
        bodyParts.push(`Looking forward to our adventure!`);
        
        return bodyParts.join('\n');
    };

    const handleSendItinerary = async (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        if (!trip || !trip.roster || trip.roster.length === 0) {
            alert("There's no one in the roster to send the itinerary to.");
            return;
        }

        const emails = trip.roster.map(a => a.email).filter(Boolean).join(',');
        if (!emails) {
            alert("No attendees have email addresses saved in the roster.");
            return;
        }

        const subject = `Trip Itinerary: ${trip.title}`;
        const body = formatItineraryForEmail(trip);
        const mailtoLink = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        const MAILTO_MAX_LENGTH = 2000;

        if (mailtoLink.length > MAILTO_MAX_LENGTH) {
            try {
                await navigator.clipboard.writeText(body);
                alert("The trip itinerary is very long and might not open correctly in your email app. It has been copied to your clipboard. Please paste it into a new email to the trip roster.");
            } catch (err) {
                console.error('Failed to copy text: ', err);
                alert("The trip itinerary is very long and might not open correctly in your email app. Please copy the details manually.");
            }
        } else {
            window.location.href = mailtoLink;
        }
    };

    const handleVoteAttempt = (tripId: string, pollId: string) => {
        if (voterName) {
            handleVote(tripId, pollId, voterName);
        } else {
            setPendingVote({ tripId, pollId });
            setIsVoterNameModalOpen(true);
        }
    };

    const handleVote = async (tripId: string, pollId: string, voter: string) => {
        const newPollVotes = { ...(votes[pollId] || {}), [voter]: tripId };
        
        // Optimistic UI update
        setVotes(prev => ({ ...prev, [pollId]: newPollVotes }));

        const path = `votes/${pollId}`;
        try {
            await setDoc(doc(firestoreDb, 'votes', pollId), cleanForFirestore({
                pollId,
                ballots: newPollVotes,
                updatedAt: new Date().toISOString()
            }));
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
        }
    };

    const handleSaveVoterName = (name: string) => {
        const trimmedName = name.trim();
        if (trimmedName) {
            setVoterName(trimmedName);
            setIsVoterNameModalOpen(false);
            if (pendingVote) {
                handleVote(pendingVote.tripId, pendingVote.pollId, trimmedName);
                setPendingVote(null);
            }
        }
    };

    const handleBackToList = () => {
        setView('list');
        setActiveTripId(null);
    };

    const handleExportTrips = async () => {
        if (trips.length === 0) {
            alert("There are no trips to export.");
            return;
        }

        try {
            const tripsWithGpxContent = await Promise.all(
                trips.map(async trip => {
                    if (!trip.gpxFiles || trip.gpxFiles.length === 0) {
                        return trip;
                    }
                    const gpxFilesWithContent = await Promise.all(
                        (trip.gpxFiles as GpxFile[]).map(async (file: GpxFile) => {
                            const content = await db.getGpx(file.id);
                            return { ...file, content: content || '' };
                        })
                    );
                    return { ...trip, gpxFiles: gpxFilesWithContent };
                })
            );

            const dataStr = JSON.stringify(tripsWithGpxContent, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const timestamp = `${year}-${month}-${day}-${hours}${minutes}`;
            link.download = `adventure-planner-export-${timestamp}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export trips:", error);
            alert("An error occurred while preparing the export file.");
        }
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Relaxed JSON check to support systems missing formal JSON MIME-type mapping
        const isJson = file.type === "application/json" || file.name.toLowerCase().endsWith('.json');
        if (!isJson) {
            alert("Please select a valid JSON file.");
            return;
        }
    
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Failed to read file content.");
                
                const importedData = JSON.parse(text);
                const validatedTrips = await validateAndPrepareTrips(importedData);
    
                if (validatedTrips.length === 0) {
                    alert("No valid trips were found in the selected file or the file was empty.");
                    return;
                }
    
                if (auth.currentUser) {
                    for (const trip of validatedTrips) {
                        const tripRef = doc(firestoreDb, 'trips', trip.id);
                        await setDoc(tripRef, cleanForFirestore({
                            ...trip,
                            ownerId: auth.currentUser.uid,
                            updatedAt: new Date().toISOString()
                        }));
                    }
                }
                
                setTrips(prevTrips => {
                    const uniqueTrips = [...prevTrips];
                    validatedTrips.forEach(vt => {
                        if (!uniqueTrips.some(t => t.id === vt.id)) {
                            uniqueTrips.push(vt);
                        }
                    });
                    return uniqueTrips;
                });
                alert(`${validatedTrips.length} trip(s) imported successfully! Look under the "Upcoming", "Planning", or "Completed" tabs to see them.`);
                setView('list');
                setActiveTripId(null);
    
            } catch (error) {
                console.error("Failed to import trips:", error);
                alert(`Error importing file: ${error instanceof Error ? error.message : "Unknown error"}`);
            } finally {
                if (event.target) event.target.value = "";
            }
        };
        reader.readAsText(file);
    };

     const handleDownloadGpx = async (file: GpxFile) => {
        try {
            const content = await db.getGpx(file.id);
            if (!content) {
                alert("Could not find the GPX file data. It may have been deleted.");
                return;
            }
            const blob = new Blob([content], { type: 'application/gpx+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download GPX file:", error);
            alert("An error occurred while trying to download the file.");
        }
    };

    return (
        <div className="min-h-screen font-sans">
            <header className={`sticky top-0 z-20 shadow-md ${THEMES[theme].bgClass}`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" onClick={handleBackToList} style={{cursor: 'pointer'}}>
                        Adventure Planner
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <ThemeSwitcher currentTheme={theme} setTheme={setTheme} />
                        
                        {/* Google Auth Status / Actions */}
                        <div className="flex items-center border-l pl-4 border-gray-300 dark:border-gray-700 gap-3">
                            {user ? (
                                <div className="flex items-center gap-2">
                                    {user.photoURL && (
                                        <img 
                                            src={user.photoURL} 
                                            alt={user.displayName || "User Avatar"} 
                                            className="w-8 h-8 rounded-full border border-gray-350 shadow-xs"
                                            referrerPolicy="no-referrer"
                                        />
                                    )}
                                    <div className="hidden md:block text-left">
                                        <div className="text-xs font-semibold text-gray-850 leading-none">
                                            {user.displayName || "Rider"}
                                        </div>
                                        <div className="text-[10px] text-gray-500 leading-none mt-0.5">
                                            {user.email}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-xs font-medium text-red-600 hover:text-red-705 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleLogin}
                                    className={`text-xs font-bold text-white px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm transition-all cursor-pointer ${THEMES[theme].buttonClass} ${THEMES[theme].buttonHoverClass}`}
                                >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                        <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.45 1.615l2.455-2.45C17.29 1.635 14.89 1 12.24 1 6.574 1 2 5.574 2 11.24s4.574 10.24 10.24 10.24c5.795 0 10.24-4.065 10.24-10.24 0-.69-.08-1.36-.22-2H12.24z"/>
                                    </svg>
                                    Sign in with Google
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {view === 'list' && (
                    <TripList
                        trips={trips}
                        votes={votes}
                        voterName={voterName}
                        onNewTrip={() => handleOpenTripForm(null)}
                        onSelectTrip={handleSelectTrip}
                        theme={theme}
                        onImportTrips={handleImportClick}
                        onExportTrips={handleExportTrips}
                        onMarkTripComplete={handleMarkTripComplete}
                        onRestoreTrip={handleRestoreTrip}
                        onCopyTrip={handleCopyTrip}
                        onVote={handleVoteAttempt}
                        onFinalizeTrip={handleFinalizeTrip}
                        onPrintTrip={handlePrintTrip}
                    />
                )}
                {view === 'detail' && activeTrip && (
                    <TripDetail
                        trip={activeTrip}
                        onBack={handleBackToList}
                        onEditTrip={() => handleOpenTripForm(activeTrip)}
                        onDeleteTrip={handleDeleteTrip}
                        onAddLeg={() => handleOpenLegForm(null)}
                        onEditLeg={(leg) => handleOpenLegForm(leg)}
                        onDeleteLeg={handleDeleteLeg}
                        onCopyTrip={handleCopyTrip}
                        onDownloadGpx={handleDownloadGpx}
                        onFinalizeTrip={handleFinalizeTrip}
                        onUpdateRoster={(roster) => handleUpdateRoster(activeTrip.id, roster)}
                        onSendItinerary={() => handleSendItinerary(activeTrip.id)}
                        globalAttendees={globalAttendees}
                        onSaveGlobalAttendee={handleSaveGlobalAttendee}
                        theme={theme}
                        onPrintTrip={handlePrintTrip}
                    />
                )}
            </main>

            {isTripFormOpen && (
                <TripForm
                    onClose={() => setIsTripFormOpen(false)}
                    onSave={handleSaveTrip}
                    tripToEdit={tripToEdit}
                    allTrips={trips}
                    theme={theme}
                />
            )}

            {isLegFormOpen && activeTrip && (
                <LegForm
                    key={legToEdit?.id || 'new-leg'}
                    onClose={handleLegFormClose}
                    onSave={handleSaveLeg}
                    legToEdit={legToEdit}
                    trip={activeTrip}
                    theme={theme}
                />
            )}

            {actionToConfirm && (
                <Modal
                    onClose={() => setActionToConfirm(null)}
                    title="Confirm Action"
                    footer={
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setActionToConfirm(null)}
                                className="px-6 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    actionToConfirm.onConfirm();
                                    setActionToConfirm(null);
                                }}
                                className="px-6 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                {actionToConfirm.confirmText}
                            </button>
                        </div>
                    }
                >
                    <p className="text-lg">{actionToConfirm.message}</p>
                </Modal>
            )}
             {isVoterNameModalOpen && (
                <VoterNameModal
                    onClose={() => {
                        setIsVoterNameModalOpen(false);
                        setPendingVote(null);
                    }}
                    onSave={handleSaveVoterName}
                    theme={theme}
                />
            )}

            {tripToPrint && (
                <TankBagPrintModal
                    trip={tripToPrint}
                    onClose={() => setTripToPrint(null)}
                    theme={theme}
                />
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                className="hidden"
                accept="application/json"
            />
        </div>
    );
}

export default App;