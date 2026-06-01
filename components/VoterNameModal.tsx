
import React, { useState, useId } from 'react';
import Modal from './Modal';
import { Theme, THEMES } from '../types';

interface VoterNameModalProps {
    onClose: () => void;
    onSave: (name: string) => void;
    theme: Theme;
}

const VoterNameModal: React.FC<VoterNameModalProps> = ({ onClose, onSave, theme }) => {
    const [name, setName] = useState('');
    const formId = useId();
    const themeClasses = THEMES[theme];

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    const footer = (
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Cancel
            </button>
            <button type="submit" form={formId} className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                Save and Vote
            </button>
        </div>
    );

    return (
        <Modal onClose={onClose} title="Enter Your Name to Vote" footer={footer}>
            <form id={formId} onSubmit={handleSave}>
                <p className="text-gray-600 mb-4">
                    To vote, please enter your name. This is saved on your device so you won't be asked again.
                </p>
                <div>
                    <label htmlFor="voterName" className="block text-sm font-medium text-gray-700 sr-only">Your Name</label>
                    <input
                        type="text"
                        id="voterName"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 bg-white border ${themeClasses.borderClass} rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none ${themeClasses.formInputFocusClass}`}
                        placeholder="e.g., Jane Doe"
                        required
                        autoFocus
                    />
                </div>
            </form>
        </Modal>
    );
};

export default VoterNameModal;
