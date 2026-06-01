import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as db from '../db';
import { GpxFile } from '../types';

// Helper component to adjust map bounds to fit all tracks
const FitBounds: React.FC<{ tracks: [number, number][][] }> = ({ tracks }) => {
    const map = useMap();
    useEffect(() => {
        if (tracks && tracks.length > 0) {
            const allPoints = tracks.flat();
            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints as L.LatLngTuple[]);
                // A brief delay can help ensure the map container has been sized correctly
                // by the browser, especially when rendering in a tab that was just revealed.
                const timer = setTimeout(() => {
                    map.invalidateSize(); // Force map to re-evaluate its container size
                    map.fitBounds(bounds.pad(0.1)); // Add 10% padding
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [tracks, map]);
    return null;
};

// Colors to cycle through for different tracks
const trackColors = ['#3388ff', '#ff5733', '#33ff57', '#ff33a1', '#a133ff', '#33fffb', '#f8ff33'];

interface TripMapProps {
    gpxFiles: GpxFile[];
}

const TripMap: React.FC<TripMapProps> = ({ gpxFiles }) => {
    const [tracks, setTracks] = useState<[number, number][][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTracks = async () => {
            if (!gpxFiles || gpxFiles.length === 0) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const contents = await Promise.all(gpxFiles.map(file => db.getGpx(file.id)));
                
                const parsedTracks: [number, number][][] = [];
                const parser = new DOMParser();

                contents.forEach((content, index) => {
                    if (content) {
                        try {
                            const xmlDoc = parser.parseFromString(content, "application/xml");
                            
                            const parserError = xmlDoc.querySelector('parsererror');
                            if (parserError) {
                                throw new Error(`XML parsing error in ${gpxFiles[index].name}: ${parserError.textContent}`);
                            }
                            
                            let segmentsFound = false;

                            // Priority 1: Parse <trkseg> elements. Most detailed.
                            const trackSegments = xmlDoc.querySelectorAll('trkseg');
                            if (trackSegments.length > 0) {
                                trackSegments.forEach(seg => {
                                    const points: [number, number][] = [];
                                    seg.querySelectorAll('trkpt').forEach(pt => {
                                        const lat = pt.getAttribute('lat');
                                        const lon = pt.getAttribute('lon');
                                        if (lat && lon) points.push([parseFloat(lat), parseFloat(lon)]);
                                    });
                                    if (points.length > 0) parsedTracks.push(points);
                                });
                                segmentsFound = true;
                            }

                            // Priority 2: Parse <rte> elements. Common for planned routes.
                            if (!segmentsFound) {
                                const routeElements = xmlDoc.querySelectorAll('rte');
                                if (routeElements.length > 0) {
                                    routeElements.forEach(rte => {
                                        const points: [number, number][] = [];
                                        rte.querySelectorAll('rtept').forEach(pt => {
                                            const lat = pt.getAttribute('lat');
                                            const lon = pt.getAttribute('lon');
                                            if (lat && lon) points.push([parseFloat(lat), parseFloat(lon)]);
                                        });
                                        if (points.length > 0) parsedTracks.push(points);
                                    });
                                    segmentsFound = true;
                                }
                            }

                            // Priority 3: Fallback. Treat all <trkpt> in the file as a single track.
                            if (!segmentsFound) {
                                const allTrackPoints = xmlDoc.querySelectorAll('trkpt');
                                if (allTrackPoints.length > 0) {
                                    const points: [number, number][] = [];
                                    allTrackPoints.forEach(pt => {
                                        const lat = pt.getAttribute('lat');
                                        const lon = pt.getAttribute('lon');
                                        if (lat && lon) points.push([parseFloat(lat), parseFloat(lon)]);
                                    });
                                    if (points.length > 0) parsedTracks.push(points);
                                }
                            }
                        } catch (parseError) {
                             console.warn(`Could not parse GPX file: ${gpxFiles[index].name}`, parseError);
                        }
                    } else {
                         console.warn(`No content found for GPX file: ${gpxFiles[index].name}`);
                    }
                });

                if (parsedTracks.length === 0) {
                    setError("Could not find any valid track or route data in the provided GPX files.");
                }

                setTracks(parsedTracks);
            } catch (err) {
                console.error("Failed to load or parse GPX files:", err);
                setError("An error occurred while loading the GPX data.");
            } finally {
                setIsLoading(false);
            }
        };

        loadTracks();
    }, [gpxFiles]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-96 text-gray-500">Loading map data...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-96 text-red-600 bg-red-50 rounded-lg p-4 text-center">{error}</div>;
    }
    
    if (tracks.length === 0 && !isLoading) {
        return <div className="flex items-center justify-center h-96 text-gray-500 bg-gray-50 rounded-lg">No displayable tracks found in the GPX files.</div>;
    }

    return (
        <div className="mt-8 rounded-lg shadow-md overflow-hidden border border-gray-200 h-[500px]" aria-label="Trip route map">
            <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {tracks.map((track, index) => (
                    <Polyline
                        key={index}
                        positions={track as L.LatLngExpression[]}
                        pathOptions={{ color: trackColors[index % trackColors.length], weight: 4, opacity: 0.8 }}
                    />
                ))}
                <FitBounds tracks={tracks} />
            </MapContainer>
        </div>
    );
};

export default TripMap;
