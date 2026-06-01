
import React, { ReactNode, useEffect, useRef } from 'react';
import { XMarkIcon } from './icons';

interface ModalProps {
    children: ReactNode;
    onClose: () => void;
    title: string;
    footer?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title, footer }) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownTarget.current = e.target;
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (mouseDownTarget.current === backdropRef.current && e.target === backdropRef.current) {
            onClose();
        }
        mouseDownTarget.current = null;
    };

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]">
                <header className="bg-gray-100 px-6 py-4 rounded-t-lg flex justify-between items-center flex-shrink-0 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
                {footer && (
                    <footer className="bg-gray-50 px-6 py-4 rounded-b-lg flex-shrink-0 border-t border-gray-200">
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    );
};

export default Modal;
