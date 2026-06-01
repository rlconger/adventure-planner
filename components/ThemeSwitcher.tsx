import React from 'react';
import { Theme, THEMES } from '../types';
import { CheckIcon } from './icons';

interface ThemeSwitcherProps {
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, setTheme }) => {
    return (
        <div className="flex items-center space-x-2">
            {(Object.keys(THEMES) as Theme[]).map((themeKey) => {
                const theme = THEMES[themeKey];
                const isActive = currentTheme === themeKey;
                return (
                    <button
                        key={themeKey}
                        onClick={() => setTheme(themeKey)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform transform hover:scale-110 ${isActive ? theme.primaryBorderClass : 'border-transparent'}`}
                        aria-label={`Switch to ${theme.name} theme`}
                    >
                        <span className={`w-6 h-6 rounded-full ${theme.primaryBgClass} flex items-center justify-center`}>
                           {isActive && <CheckIcon className="w-4 h-4 text-white" />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default ThemeSwitcher;
