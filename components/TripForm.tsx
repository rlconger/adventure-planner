import React, { useState, useEffect, useId, useMemo, useRef } from 'react';
import { Trip, RouteType, Theme, THEMES, GpxFile } from '../types';
import Modal from './Modal';
import { UploadIcon, XMarkIcon } from './icons';
import { generateUUID } from '../db';

type GpxFileWithContent = GpxFile & { content?: string };

interface TripFormProps {
    onClose: () => void;
    onSave: (trip: Pick<Trip, 'title' | 'startDate' | 'endDate' | 'routeType' | 'pollId' | 'imageUrl' | 'allowPublicEdit'> & { gpxFiles: GpxFileWithContent[] }) => void;
    tripToEdit: Trip | null;
    allTrips: Trip[];
    theme: Theme;
}

const TripForm: React.FC<TripFormProps> = ({ onClose, onSave, tripToEdit, allTrips, theme }) => {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [routeType, setRouteType] = useState<RouteType>(RouteType.Paved);
    const [pollId, setPollId] = useState('');
    const [gpxFiles, setGpxFiles] = useState<GpxFileWithContent[]>([]);
    const [imageUrl, setImageUrl] = useState('');
    const [allowPublicEdit, setAllowPublicEdit] = useState(false);

    const themeClasses = THEMES[theme];
    const formId = useId();
    const pollDatalistId = useId();
    const gpxInputRef = useRef<HTMLInputElement>(null);

    const existingPollIds = useMemo(() => {
        const ids = new Set(allTrips.map(t => t.pollId).filter((id): id is string => !!id));
        return Array.from(ids);
    }, [allTrips]);

    useEffect(() => {
        if (tripToEdit) {
            setTitle(tripToEdit.title);
            setStartDate(tripToEdit.startDate || '');
            setEndDate(tripToEdit.endDate || '');
            setRouteType(tripToEdit.routeType);
            setPollId(tripToEdit.pollId || '');
            setGpxFiles(tripToEdit.gpxFiles || []);
            setImageUrl(tripToEdit.imageUrl || '');
            setAllowPublicEdit(tripToEdit.allowPublicEdit || false);
        } else {
            // Reset for a new trip
            setTitle('');
            setStartDate('');
            setEndDate('');
            setRouteType(RouteType.Paved);
            setPollId('');
            setGpxFiles([]);
            setImageUrl('');
            setAllowPublicEdit(false);
        }
    }, [tripToEdit]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) {
            alert("Please provide a trip title.");
            return;
        }
        onSave({ title, startDate, endDate, routeType, pollId: pollId.trim() || undefined, gpxFiles, imageUrl: imageUrl.trim() || undefined, allowPublicEdit });
    };

    const handleGpxUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from<File>(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) {
                    const newGpxFile: GpxFileWithContent = {
                        id: generateUUID(),
                        name: file.name,
                        content,
                    };
                    setGpxFiles(prev => [...prev, newGpxFile]);
                }
            };
            reader.readAsText(file);
        });

        if (event.target) {
            event.target.value = "";
        }
    };

    const handleRemoveGpx = (fileId: string) => {
        setGpxFiles(prev => prev.filter(f => f.id !== fileId));
    };
    
    const inputClass = `mt-1 block w-full px-3 py-2 bg-white border ${themeClasses.borderClass} rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none ${themeClasses.formInputFocusClass}`;

    const footer = (
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Cancel
            </button>
            <button type="submit" form={formId} className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                {tripToEdit ? 'Save Changes' : 'Create Trip'}
            </button>
        </div>
    );

    return (
        <Modal onClose={onClose} title={tripToEdit ? "Edit Trip" : "Create New Trip"} footer={footer}>
            <form id={formId} onSubmit={handleSave} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Trip Title</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g., California Coast Adventure" required/>
                </div>
                <div>
                    <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
                    <input type="url" id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={inputClass} placeholder="https://example.com/image.jpg"/>
                    <p className="mt-1 text-xs text-gray-500">Provide a link to a custom image for the trip card.</p>
                    <p className="mt-1 text-xs text-gray-500">Ideal image is a portrait (vertical) photo, approx. 400px wide by 600px tall.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date (Optional)</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className={inputClass} />
                    </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50/70 border border-gray-155 p-3 rounded-lg leading-relaxed -mt-3">
                    💡 <strong>Dates are optional up front!</strong> You can leave these blank. Let your adventure idea take shape first without date constraints. Once you have dates finalized, adding them here will automatically extend to schedule and align your trip legs.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Route Type</label>
                        <div className="mt-2 flex space-x-4">
                            <label className="flex items-center">
                                <input type="radio" name="routeType" value={RouteType.Paved} checked={routeType === RouteType.Paved} onChange={() => setRouteType(RouteType.Paved)} className={`form-radio h-4 w-4 ${themeClasses.primaryTextClass} ${themeClasses.ringClass}`}/>
                                <span className="ml-2 text-sm">Paved</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="routeType" value={RouteType.Mixed} checked={routeType === RouteType.Mixed} onChange={() => setRouteType(RouteType.Mixed)} className={`form-radio h-4 w-4 ${themeClasses.primaryTextClass} ${themeClasses.ringClass}`}/>
                                <span className="ml-2 text-sm">Mixed Surface</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="pollId" className="block text-sm font-medium text-gray-700">Poll Name (Optional)</label>
                        <input
                            type="text"
                            id="pollId"
                            value={pollId}
                            onChange={e => setPollId(e.target.value)}
                            className={inputClass}
                            placeholder="e.g., Summer Trip Options"
                            list={pollDatalistId}
                        />
                         <datalist id={pollDatalistId}>
                            {existingPollIds.map(id => <option key={id} value={id} />)}
                        </datalist>
                        <p className="mt-1 text-xs text-gray-500">Group trips by giving them the same poll name.</p>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">GPX Files</label>
                     <div className="mt-2 p-4 border-2 border-dashed rounded-md space-y-3 bg-gray-50/50">
                        {gpxFiles.length > 0 && gpxFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm border">
                                <span className="text-sm font-medium text-gray-800 truncate pr-2">{file.name}</span>
                                <button type="button" onClick={() => handleRemoveGpx(file.id)} className="text-gray-400 hover:text-red-600 flex-shrink-0">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => gpxInputRef.current?.click()}
                            className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}
                        >
                            <UploadIcon className="-ml-1 mr-2 h-5 w-5" />
                            Upload GPX File(s)
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={gpxInputRef}
                        onChange={handleGpxUpload}
                        className="hidden"
                        accept=".gpx"
                        multiple
                    />
                    <p className="mt-1 text-xs text-gray-500">Upload GPX route files for this trip.</p>
                </div>
                <div className="border-t pt-4">
                    <label className="flex items-start cursor-pointer">
                        <div className="flex items-center h-5">
                            <input
                                id="allowPublicEdit"
                                name="allowPublicEdit"
                                type="checkbox"
                                checked={allowPublicEdit}
                                onChange={e => setAllowPublicEdit(e.target.checked)}
                                className={`h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500`}
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <span className="font-semibold text-gray-800">Allow other users to edit this trip</span>
                            <p className="text-gray-500">Enable this to allow any signed-in user to collaborate, manage legs, update times, and configure the roster.</p>
                        </div>
                    </label>
                </div>
            </form>
        </Modal>
    );
};

export default TripForm;