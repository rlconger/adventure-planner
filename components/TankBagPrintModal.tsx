import React, { useState } from 'react';
import { Trip, Leg, Theme, THEMES, AccommodationType } from '../types';
import { XMarkIcon, PrinterIcon } from './icons';

interface TankBagPrintModalProps {
    trip: Trip;
    onClose: () => void;
    theme: Theme;
}

type FilterType = 'camping' | 'all';
type LayoutStyle = 'list' | 'table';
type SlipSize = 'compact' | 'full';

export const TankBagPrintModal: React.FC<TankBagPrintModalProps> = ({ trip, onClose, theme }) => {
    const themeClasses = THEMES[theme];
    
    // Toggles for customization
    const [filterType, setFilterType] = useState<FilterType>('camping');
    const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('list');
    const [slipSize, setSlipSize] = useState<SlipSize>('compact');
    const [includeMiles, setIncludeMiles] = useState(true);
    const [includeNotes, setIncludeNotes] = useState(true);
    const [legsPerPage, setLegsPerPage] = useState<number>(3);

    const getSideLabel = (index: number) => {
        const charCode = 65 + index; // 'A' starts at 65
        return `Side ${String.fromCharCode(charCode)}`;
    };

    const getCardNumber = (index: number) => {
        return Math.floor(index / 2) + 1;
    };

    const getCardFace = (index: number) => {
        return index % 2 === 0 ? 'Front' : 'Back';
    };

    React.useEffect(() => {
        setLegsPerPage(layoutStyle === 'table' ? 4 : 3);
    }, [layoutStyle]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unscheduled';
        return new Date(dateString.replace(/-/g, '/')).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const getMatchingLegs = () => {
        return trip.legs.filter(leg => {
            if (filterType === 'camping') {
                return leg.accommodationType === AccommodationType.Camping || 
                       leg.accommodationType === AccommodationType.Dispersed;
            }
            return true;
        });
    };

    const matchingLegs = getMatchingLegs();

    // Helper to extract site or room numbers as individual lines
    const getReservationLines = (leg: Leg): string[] => {
        if (leg.accommodationType === AccommodationType.Camping || leg.accommodationType === AccommodationType.Dispersed) {
            if (leg.sites && leg.sites.length > 0) {
                return leg.sites
                    .map((s, index) => s.number ? `Reservation ${index + 1}: ${s.number}` : '')
                    .filter(Boolean);
            }
        } else if (leg.accommodationType === AccommodationType.Hotel) {
            if (leg.rooms && leg.rooms.length > 0) {
                return leg.rooms
                    .map((r, index) => r.number ? `Reservation ${index + 1}: ${r.number}` : '')
                    .filter(Boolean);
            }
        }
        return [];
    };

    const generateSlipHtml = () => {
        const isTable = layoutStyle === 'table';
        const isCompact = slipSize === 'compact';

        const style = `
            @media print {
                @page {
                    size: auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                .no-print {
                    display: none !important;
                }
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #000;
                background: #fff;
                padding: 0;
                line-height: 1.3;
            }
            .slip-container {
                border: 2px dashed #000;
                padding: 12px;
                background: #fff;
                box-sizing: border-box;
                ${isCompact ? 'width: 4.0in; height: 6.0in; max-height: 6.0in; min-height: 6.0in; overflow: hidden; page-break-after: always; break-after: page;' : 'width: 100%; max-width: 100%;'}
                margin: 0 auto;
                position: relative;
            }
            .cut-here-label {
                position: absolute;
                top: 0px;
                left: 10px;
                background: #fff;
                padding: 0 4px;
                font-size: 8px;
                font-family: monospace;
                color: #444;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .title-section {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 4px;
                margin-bottom: 8px;
            }
            .trip-title {
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 0;
                letter-spacing: 0.5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .trip-dates {
                font-size: 9px;
                color: #333;
                font-weight: bold;
                margin: 0;
            }
            /* Table mode styling */
            .table-layout {
                width: 100%;
                border-collapse: collapse;
                margin-top: 4px;
            }
            .table-layout th {
                border: 1px solid #000;
                background-color: #f0f0f0;
                padding: 3px 4px;
                font-size: 8px;
                font-weight: bold;
                text-align: left;
                text-transform: uppercase;
            }
            .table-layout td {
                border: 1px solid #777;
                padding: 3px 4px;
                font-size: 8.5px;
                vertical-align: top;
                line-height: 1.1;
            }
            /* List mode styling */
            .list-leg {
                border-bottom: 1px solid #ccc;
                padding: 4px 0;
            }
            .list-leg:last-child {
                border-bottom: none;
            }
            .leg-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 10px;
                margin-bottom: 1px;
            }
            .leg-route {
                font-size: 11px;
                font-weight: 700;
                margin-bottom: 2px;
            }
            .leg-meta {
                font-size: 9px;
                color: #222;
                margin-bottom: 2px;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .meta-item {
                display: inline-block;
            }
            .leg-notes-label {
                font-weight: bold;
            }
            .leg-notes-text {
                font-size: 8.5px;
                color: #444;
                font-style: italic;
                margin-top: 1px;
            }
            .placeholder-text {
                text-align: center;
                padding: 30px;
                font-style: italic;
                color: #666;
                font-size: 11px;
            }
        `;

        const chunks: Leg[][] = [];
        if (isCompact) {
            for (let i = 0; i < matchingLegs.length; i += legsPerPage) {
                chunks.push(matchingLegs.slice(i, i + legsPerPage));
            }
        } else {
            chunks.push(matchingLegs);
        }

        let contentHtml = '';

        if (matchingLegs.length === 0) {
            contentHtml = `
                <div class="slip-container">
                    <div class="title-section">
                        <h1 class="trip-title">${trip.title}</h1>
                        <p class="trip-dates">TANK BAG ROAD SLIP • Printed ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="placeholder-text">No ${
                        filterType === 'camping' ? 'camping' : ''
                    } accommodations found on this trip. Try changing the settings to include all accommodations.</div>
                </div>
            `;
        } else {
            contentHtml = chunks.map((chunk, chunkIdx) => {
                const startDayIdx = chunkIdx * legsPerPage;
                const startDay = startDayIdx + 1;
                const endDay = startDayIdx + chunk.length;
                const sideText = isCompact ? getSideLabel(chunkIdx) : '';
                const cardLabel = isCompact ? `Card ${getCardNumber(chunkIdx)} - ${getCardFace(chunkIdx)}` : '';
                
                let headerHtml = '';
                if (chunkIdx === 0) {
                    headerHtml = `
                        <div class="title-section">
                            <h1 class="trip-title" style="font-size: 14px;">${trip.title}</h1>
                            <p class="trip-dates">ROAD SLIP • ${sideText ? `${sideText.toUpperCase()} • ` : ''}DAYS ${startDay}–${endDay}</p>
                        </div>
                    `;
                } else {
                    headerHtml = `
                        <div class="title-section" style="padding-bottom: 4px; margin-bottom: 6px;">
                            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
                                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 1.8in;">${trip.title}</span>
                                <span style="color: #333; font-size: 9px;">${sideText.toUpperCase()} (D${startDay}–D${endDay})</span>
                            </div>
                        </div>
                    `;
                }

                let itemsHtml = '';
                if (isTable) {
                    itemsHtml = `
                        <table class="table-layout">
                            <thead>
                                <tr>
                                    <th style="width: 14%">Day</th>
                                    <th style="width: 38%">Route / Stop</th>
                                    <th style="width: 33%">Campground / Stay</th>
                                    ${includeMiles ? '<th style="width: 15%">Miles</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${chunk.map((leg, idx) => {
                                    const actualDayNumber = startDayIdx + idx + 1;
                                    const resLines = getReservationLines(leg);
                                    const stayDetails = `<span style="font-weight:600;">${leg.accommodationType}</span>${resLines.length > 0 ? resLines.map(line => `<br/><span style="font-size:7.5px; font-weight:bold; white-space: nowrap;">${line}</span>`).join('') : ''}`;
                                    return `
                                        <tr>
                                            <td>
                                                <strong>D${actualDayNumber}</strong>
                                                <div style="font-size: 7px; color: #555;">${leg.date ? new Date(leg.date.replace(/-/g, '/')).toLocaleDateString('en-US', {month: '2-digit', day: '2-digit'}) : ''}</div>
                                            </td>
                                            <td>
                                                <div style="font-weight: bold;">➔ ${leg.endLocation}</div>
                                                <div style="font-size:7px; color:#555;">From: ${leg.startLocation}</div>
                                                ${includeNotes && leg.notes ? `<div style="font-size:7px; color:#444; font-style:italic; margin-top:1px;">Note: ${leg.notes}</div>` : ''}
                                            </td>
                                            <td>${stayDetails}</td>
                                            ${includeMiles ? `<td>${leg.isTravelDay ? 'Travel' : `${leg.miles}m`}</td>` : ''}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `;
                } else {
                    itemsHtml = `
                        <div class="list-container">
                            ${chunk.map((leg, idx) => {
                                const actualDayNumber = startDayIdx + idx + 1;
                                const resLines = getReservationLines(leg);
                                return `
                                    <div class="list-leg" style="border-bottom: 1px solid #ccc; padding: 4px 0;">
                                        <div class="leg-header" style="display: flex; justify-content: space-between; font-weight: bold; font-size: 9.5px; margin-bottom: 1px;">
                                            <span>DAY ${actualDayNumber} ${leg.date ? ` — ${formatDate(leg.date)}` : ''}</span>
                                            <span>${leg.accommodationType}</span>
                                        </div>
                                        <div class="leg-route" style="font-size: 10.5px; font-weight: 700; margin-bottom: 2px;">
                                            ${leg.startLocation} ➔ ${leg.endLocation}
                                        </div>
                                        
                                        <div class="leg-details" style="background-color: #f9f9f9; padding: 3px 5px; border-left: 2px solid #ccc; font-size: 8.5px; margin-bottom: 2px;">
                                            ${includeMiles ? `<div style="font-weight: bold; margin-bottom: 1px;">DISTANCE: ${leg.isTravelDay ? 'TRAVEL DAY' : `${leg.miles} MILES`}</div>` : ''}
                                            ${resLines.map(line => `<div style="font-weight: bold; color: #111; margin-bottom: 0px;">${line.toUpperCase()}</div>`).join('')}
                                        </div>

                                        ${includeNotes && leg.notes ? `
                                            <div class="leg-notes-text" style="font-size: 8px; color: #444; font-style: italic; margin-top: 1px; padding-left: 6px;">
                                                <strong>Notes:</strong> ${leg.notes}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }

                return `
                    <div class="slip-container">
                        ${isCompact ? `<div class="cut-here-label">${cardLabel} • ${sideText}</div>` : ''}
                        ${headerHtml}
                        ${itemsHtml}
                    </div>
                `;
            }).join('\n');
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${trip.title} - Tank Bag Slip</title>
                <style>${style}</style>
            </head>
            <body>
                ${contentHtml}
            </body>
            </html>
        `;
    };

    const handlePrint = () => {
        // Create an invisible iframe for printing to avoid manipulating the main document's styles or view
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.style.top = '-10000px';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const bodyHtml = generateSlipHtml();
        // Append dynamic auto-print trigger for the printer iframe
        const triggerHtml = bodyHtml.replace('</body>', `
                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                        setTimeout(function() {
                            window.parent.postMessage('print-complete', '*');
                        }, 500);
                    };
                </script>
            </body>
        `);

        doc.open();
        doc.write(triggerHtml);
        doc.close();

        // Listen for done-printing, then remove iframe
        const handlePrintFinished = (event: MessageEvent) => {
            if (event.data === 'print-complete') {
                window.removeEventListener('message', handlePrintFinished);
                document.body.removeChild(iframe);
            }
        };
        window.addEventListener('message', handlePrintFinished);

        // Fail-safe cleanup
        setTimeout(() => {
            try {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            } catch (e) {
                // Ignore
            }
        }, 10000);
    };

    const handleDownloadHtml = () => {
        const fullHtml = generateSlipHtml();
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${trip.title.replace(/\s+/g, '_')}_tank_bag_slip.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <header className="bg-gray-100 px-6 py-4 rounded-t-lg flex justify-between items-center flex-shrink-0 border-b border-gray-200">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                            <PrinterIcon className="h-6 w-6 text-teal-600" />
                            <span>Tank Bag Print Preview</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Format camping accommodations to slip into a physical motorcycle tank bag window pocket</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    {/* Left Panel: Toggles */}
                    <div className="md:w-1/3 p-6 bg-gray-50 border-r border-gray-200 overflow-y-auto space-y-6">
                        <h4 className="font-semibold text-gray-800 border-b pb-2 text-sm uppercase tracking-wide">Slip Layout Settings</h4>
                        
                        {/* Accommodation Filter */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Accommodations</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setFilterType('camping')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                                        filterType === 'camping'
                                            ? `${themeClasses.primaryBgClass} text-white border-transparent`
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    Camping Only
                                </button>
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                                        filterType === 'all'
                                            ? `${themeClasses.primaryBgClass} text-white border-transparent`
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    All Stays
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                                {filterType === 'camping' 
                                    ? 'Filters legs down strictly to Campgrounds and Dispersed Camping (as requested).'
                                    : 'Includes hotel reservations, transfers, and general stops.'
                                }
                            </p>
                        </div>

                        {/* Format Style */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Format Style</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setLayoutStyle('list')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                                        layoutStyle === 'list'
                                            ? `${themeClasses.primaryBgClass} text-white border-transparent`
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    Bullet List
                                </button>
                                <button
                                    onClick={() => setLayoutStyle('table')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                                        layoutStyle === 'table'
                                            ? `${themeClasses.primaryBgClass} text-white border-transparent`
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    Compact Table
                                </button>
                            </div>
                        </div>

                        {/* Slip Size */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Paper Cutout Size</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setSlipSize('compact')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                                        slipSize === 'compact'
                                            ? `${themeClasses.primaryBgClass} text-white border-transparent`
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    4" x 6" Card
                                </button>
                                <button
                                    onClick={() => setSlipSize('full')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                                        slipSize === 'full'
                                            ? `${themeClasses.primaryBgClass} text-white border-transparent`
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    Full Sheet
                                </button>
                            </div>
                        </div>

                        {/* Max Stops per Side Customizer */}
                        {slipSize === 'compact' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Max Stops per Slip Side</label>
                                <select
                                    value={legsPerPage}
                                    onChange={(e) => setLegsPerPage(parseInt(e.target.value, 10))}
                                    className="block w-full py-2 px-3 text-xs border border-gray-300 bg-white text-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-semibold"
                                >
                                    <option value={2}>2 Stops per Side (Generous space for notes)</option>
                                    <option value={3}>3 Stops per Side (Standard - Recommended)</option>
                                    <option value={4}>4 Stops per Side (Compact)</option>
                                    <option value={5}>5 Stops per Side (Very tight)</option>
                                    <option value={6}>6 Stops per Side (Dense table-only)</option>
                                </select>
                                <p className="text-[11px] text-gray-500 mt-1.5 leading-normal">
                                    Divide stops across Card Faces (e.g., Front is Side A, Back is Side B) to prevent height exceeding 6". Great for dual-sided lamination!
                                </p>
                            </div>
                        )}

                        {/* Leg details toggles */}
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Include Details</label>
                            
                            <label className="flex items-center space-x-3 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeMiles}
                                    onChange={(e) => setIncludeMiles(e.target.checked)}
                                    className={`rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-gray-300`}
                                />
                                <span>Daily mileage and transit indicators</span>
                            </label>

                            <label className="flex items-center space-x-3 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeNotes}
                                    onChange={(e) => setIncludeNotes(e.target.checked)}
                                    className={`rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-gray-300`}
                                />
                                <span>Campsite reservation notes</span>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-xs text-yellow-800">
                                <strong>Motorcycle Rider Tip:</strong> Print double-sided or fold the cards, then cover or laminate them to keep them waterproof inside your window pocket!
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Interactive Sheet Preview */}
                    <div className="flex-1 p-6 bg-gray-200 overflow-y-auto flex flex-col items-center min-h-[400px]">
                        <span className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-widest">Live Slip Cutout Preview ({slipSize === 'compact' ? '4" x 6" Template' : 'Full Page'})</span>
                        
                        {matchingLegs.length === 0 ? (
                            <div className="bg-white text-black p-8 shadow-xl border-2 border-dashed border-gray-500 w-full max-w-[380px] min-h-[400px] flex justify-center items-center font-mono text-center text-gray-500 italic text-sm">
                                No camping accommodations planned for this trip. Click "All Stays" on the left options panel to preview.
                            </div>
                        ) : (() => {
                            const chunks: Leg[][] = [];
                            if (slipSize === 'compact') {
                                for (let i = 0; i < matchingLegs.length; i += legsPerPage) {
                                    chunks.push(matchingLegs.slice(i, i + legsPerPage));
                                }
                            } else {
                                chunks.push(matchingLegs);
                            }

                            return (
                                <div className="space-y-8 w-full flex flex-col items-center">
                                    {chunks.map((chunk, chunkIdx) => {
                                        const startDayIdx = chunkIdx * legsPerPage;
                                        const startDay = startDayIdx + 1;
                                        const endDay = startDayIdx + chunk.length;
                                        const sideText = slipSize === 'compact' ? getSideLabel(chunkIdx) : '';
                                        const cardLabel = slipSize === 'compact' ? `Card ${getCardNumber(chunkIdx)} - ${getCardFace(chunkIdx)}` : '';

                                        return (
                                            <div 
                                                key={chunkIdx}
                                                className={`bg-white text-black p-4 shadow-xl border-2 border-dashed border-gray-400 relative transition-all duration-300 flex flex-col ${
                                                    slipSize === 'compact' 
                                                        ? 'w-[4in] h-[6in] flex-shrink-0 overflow-hidden' 
                                                        : 'w-full max-w-2xl min-h-[400px]'
                                                }`}
                                                style={{ fontFamily: 'monospace, Courier New, Courier' }}
                                            >
                                                {/* Simulated printed cutout side indicator label */}
                                                {slipSize === 'compact' && (
                                                    <div className="absolute top-0 left-4 transform -translate-y-1/2 bg-gray-100 text-gray-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-gray-300 shadow-sm">
                                                        {cardLabel} ({sideText})
                                                    </div>
                                                )}

                                                {/* Header within card preview */}
                                                {chunkIdx === 0 ? (
                                                    <div className="text-center border-b-2 border-black pb-2 mb-3">
                                                        <h2 className="text-sm font-bold uppercase tracking-wide truncate">{trip.title}</h2>
                                                        <p className="text-[9px] text-gray-600 font-bold">
                                                            TANK BAG ROAD SLIP • {sideText ? `${sideText.toUpperCase()} • ` : ''}DAYS {startDay}–{endDay}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="border-b-2 border-black pb-1 mb-2 flex justify-between text-[10px] items-center">
                                                        <span className="font-bold uppercase truncate max-w-[150px]">{trip.title}</span>
                                                        <span className="font-bold text-gray-600 font-mono text-[9px]">{sideText.toUpperCase()} (DAYS {startDay}–{endDay})</span>
                                                    </div>
                                                )}

                                                {/* Card Content list or table */}
                                                <div className="flex-1 overflow-hidden select-none">
                                                    {layoutStyle === 'table' ? (
                                                        <table className="w-full text-left text-[9px] border-collapse border border-black">
                                                            <thead>
                                                                <tr className="bg-gray-100 border-b border-black text-[8px] font-bold">
                                                                    <th className="border-r border-black p-1">Day</th>
                                                                    <th className="border-r border-black p-1">Route</th>
                                                                    <th className="border-r border-black p-1">Stay</th>
                                                                    {includeMiles && <th className="p-1">Dist</th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {chunk.map((leg, index) => {
                                                                    const actualDayNumber = startDayIdx + index + 1;
                                                                    const resLines = getReservationLines(leg);
                                                                    return (
                                                                        <tr key={leg.id} className="border-b border-black last:border-b-0">
                                                                            <td className="border-r border-black p-1 font-bold text-[8.5px]">
                                                                                D{actualDayNumber}
                                                                                {leg.date && (
                                                                                    <div className="text-[7px] text-gray-600">
                                                                                        {new Date(leg.date.replace(/-/g, '/')).toLocaleDateString('en-US', {month: '2-digit', day: '2-digit'})}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="border-r border-black p-1 leading-tight text-[8.5px]">
                                                                                <div className="font-bold">➔ {leg.endLocation}</div>
                                                                                <div className="text-[7px] text-gray-500">From: {leg.startLocation}</div>
                                                                                {includeNotes && leg.notes && (
                                                                                    <div className="text-[7.3px] text-gray-500 italic mt-0.5 max-w-[130px] truncate" title={leg.notes}>
                                                                                        * {leg.notes}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="border-r border-black p-1 font-semibold text-[8.5px]">
                                                                                {leg.accommodationType}
                                                                                {resLines.map((line, lIdx) => (
                                                                                    <div key={lIdx} className="text-[7.5px] font-bold text-gray-700 mt-0.5">{line}</div>
                                                                                ))}
                                                                            </td>
                                                                            {includeMiles && (
                                                                                <td className="p-1 text-[8px]">
                                                                                    {leg.isTravelDay ? 'Travel' : `${leg.miles}m`}
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {chunk.map((leg, index) => {
                                                                const actualDayNumber = startDayIdx + index + 1;
                                                                const resLines = getReservationLines(leg);
                                                                return (
                                                                    <div key={leg.id} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0 text-[10px]">
                                                                        <div className="flex justify-between font-bold text-black border-b border-dashed border-gray-300 pb-0.5 text-[9px]">
                                                                            <span>DAY {actualDayNumber} {leg.date && `(${formatDate(leg.date)})`}</span>
                                                                            <span>{leg.accommodationType}</span>
                                                                        </div>
                                                                        <div className="font-bold mt-0.5 text-[10.5px]">
                                                                            {leg.startLocation} ➔ {leg.endLocation}
                                                                        </div>
                                                                        
                                                                        <div className="mt-0.5 bg-gray-50 p-1 border-l-2 border-gray-300 text-gray-700 font-bold text-[8.5px] space-y-0.5">
                                                                            {includeMiles && (
                                                                                <div>DISTANCE: {leg.isTravelDay ? 'TRAVEL DAY' : `${leg.miles} MILES`}</div>
                                                                            )}
                                                                            {resLines.map((line, lIdx) => (
                                                                                <div key={lIdx} className="text-black text-[9px]">
                                                                                    {line.toUpperCase()}
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {includeNotes && leg.notes && (
                                                                            <div className="text-[8px] text-gray-600 italic mt-1 leading-normal pl-2 border-l border-gray-300">
                                                                                <strong>Note:</strong> {leg.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Footer Controls */}
                <footer className="bg-gray-50 px-6 py-4 rounded-b-lg flex-shrink-0 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">
                        {matchingLegs.length} of {trip.legs.length} days matching accommodations.
                    </span>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-md text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDownloadHtml}
                            disabled={matchingLegs.length === 0}
                            title="Download standalone HTML slide to print locally or keep offline on your phone"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-semibold rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Download HTML</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={matchingLegs.length === 0}
                            className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <PrinterIcon className="-ml-1 mr-2 h-5 w-5" />
                            Print Slip
                        </button>
                    </div>
                </footer>

            </div>
        </div>
    );
};
