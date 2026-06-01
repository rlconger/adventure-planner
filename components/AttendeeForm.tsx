
import React, { useState, useEffect, useId, useRef } from 'react';
import { Attendee, Theme, THEMES } from '../types';
import Modal from './Modal';

interface AttendeeFormProps {
    onClose: () => void;
    onSave: (attendee: Omit<Attendee, 'id'>) => void;
    attendeeToEdit: Attendee | null;
    theme: Theme;
}

const AttendeeForm: React.FC<AttendeeFormProps> = ({ onClose, onSave, attendeeToEdit, theme }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const themeClasses = THEMES[theme];
    const formId = useId();
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (attendeeToEdit) {
            setName(attendeeToEdit.name);
            setEmail(attendeeToEdit.email);
            setPhone(attendeeToEdit.phone);
        }
        // Focus the name input when the form opens
        nameInputRef.current?.focus();
    }, [attendeeToEdit]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, email, phone });
    };

    const inputClass = `mt-1 block w-full px-3 py-2 bg-white border ${themeClasses.borderClass} rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none ${themeClasses.formInputFocusClass}`;

    const footer = (
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Cancel
            </button>
            <button type="submit" form={formId} className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${themeClasses.buttonClass} ${themeClasses.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.ringClass}`}>
                {attendeeToEdit ? 'Save Changes' : 'Add to Roster'}
            </button>
        </div>
    );

    return (
        <Modal onClose={onClose} title={attendeeToEdit ? 'Edit Attendee' : 'Add Attendee'} footer={footer}>
            <form id={formId} onSubmit={handleSave} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        ref={nameInputRef}
                        type="text"
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Jane Doe"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="jane.doe@example.com" />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(555) 123-4567" />
                </div>
            </form>
        </Modal>
    );
};

export default AttendeeForm;
