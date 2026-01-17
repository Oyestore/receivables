import React, { useState } from 'react';
import {
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiGlobe, FiChevronDown } from 'react-icons/fi';
import './LanguageSelector.css';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
];

interface LanguageSelectorProps {
    currentLanguage?: string;
    onLanguageChange: (languageCode: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    currentLanguage = 'en',
    onLanguageChange,
}) => {
    const [selectedLang, setSelectedLang] = useState(currentLanguage);
    const [isOpen, setIsOpen] = useState(false);

    const handleChange = (langCode: string) => {
        setSelectedLang(langCode);
        onLanguageChange(langCode);
        setIsOpen(false);

        // TODO: Integrate with i18n library (react-i18next)
        // i18n.changeLanguage(langCode);
    };

    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const closeDropdown = () => {
        setIsOpen(false);
    };

    return (
        <div className="language-selector">
            <button 
                className="language-button"
                onClick={toggleDropdown}
                aria-label="Select language"
            >
                <Icon as={FiGlobe} className="icon" />
                <span className="language-flag">{currentLangObj.flag}</span>
                <span className="language-name">{currentLangObj.nativeName}</span>
                <Icon as={FiChevronDown} className="icon" />
            </button>

            <div className={`language-dropdown ${isOpen ? '' : 'hidden'}`}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <div
                        key={lang.code}
                        className={`language-option ${selectedLang === lang.code ? 'selected' : ''}`}
                        onClick={() => handleChange(lang.code)}
                    >
                        <div className="language-option-flag">
                            <span className="flag-icon">{lang.flag}</span>
                        </div>
                        <div className="language-option-content">
                            <div className="language-option-name">{lang.name}</div>
                            <div className="language-option-native-name">{lang.nativeName}</div>
                        </div>
                        {selectedLang === lang.code && (
                            <div className="language-option-check">✓</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Overlay to close dropdown when clicking outside */}
            {isOpen && (
                <div 
                    className="dropdown-overlay"
                    onClick={closeDropdown}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                />
            )}
        </div>
    );
};

export default LanguageSelector;
