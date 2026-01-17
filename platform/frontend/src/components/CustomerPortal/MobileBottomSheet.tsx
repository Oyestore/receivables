import React, { useState } from 'react';
import {
    VStack,
    Button,
    IconButton,
    Box,
    HStack,
    Text,
    Icon,
} from '@chakra-ui/react';
import { FiMenu, FiCreditCard, FiMessageSquare, FiBriefcase, FiSettings, FiShare2 } from 'react-icons/fi';
import './MobileBottomSheet.css';

interface MobileBottomSheetProps {
    onPayNow?: () => void;
    onOpenChat?: () => void;
    onViewVendors?: () => void;
    onShare?: () => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    onPayNow,
    onOpenChat,
    onViewVendors,
    onShare,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        {
            label: 'Pay Invoice',
            icon: FiCreditCard,
            onClick: () => {
                onPayNow?.();
                setIsOpen(false);
            },
            colorScheme: 'green',
        },
        {
            label: 'Chat with AI',
            icon: FiMessageSquare,
            onClick: () => {
                onOpenChat?.();
                setIsOpen(false);
            },
            colorScheme: 'blue',
        },
        {
            label: 'View Vendors',
            icon: FiBriefcase,
            onClick: () => {
                onViewVendors?.();
                setIsOpen(false);
            },
            colorScheme: 'purple',
        },
        {
            label: 'Share & Earn ₹500',
            icon: FiShare2,
            onClick: () => {
                onShare?.();
                setIsOpen(false);
            },
            colorScheme: 'orange',
        },
        {
            label: 'Settings',
            icon: FiSettings,
            onClick: () => {
                // TODO: Implement settings navigation
                setIsOpen(false);
            },
            colorScheme: 'gray',
        },
    ];

    const openBottomSheet = () => {
        setIsOpen(true);
    };

    const closeBottomSheet = () => {
        setIsOpen(false);
    };

    const getMenuVariant = (colorScheme: string) => {
        switch (colorScheme) {
            case 'green':
                return 'menu-item-success';
            case 'blue':
                return 'menu-item-primary';
            case 'purple':
                return 'menu-item-primary';
            case 'orange':
                return 'menu-item-warning';
            case 'gray':
                return '';
            default:
                return '';
        }
    };

    return (
        <>
            {/* Mobile Menu Trigger */}
            <button className="mobile-menu-trigger" onClick={openBottomSheet}>
                <Icon as={FiMenu} className="mobile-menu-trigger-icon" />
            </button>

            {/* Overlay */}
            <div 
                className={`mobile-bottom-sheet-overlay ${isOpen ? 'open' : ''}`}
                onClick={closeBottomSheet}
            />

            {/* Bottom Sheet */}
            <div className={`mobile-bottom-sheet ${isOpen ? 'open' : ''}`}>
                {/* Drawer Handle */}
                <div className="drawer-handle" />

                {/* Header */}
                <div className="mobile-bottom-sheet-header">
                    <h3 className="mobile-bottom-sheet-title">Quick Actions</h3>
                    <button className="mobile-bottom-sheet-close" onClick={closeBottomSheet}>
                        <Icon className="icon">✕</Icon>
                    </button>
                </div>

                {/* Body */}
                <div className="mobile-bottom-sheet-body">
                    <div className="mobile-bottom-sheet-content">
                        {menuItems.map((item, index) => (
                            <div
                                key={index}
                                className={`menu-item ${getMenuVariant(item.colorScheme)}`}
                                onClick={item.onClick}
                            >
                                <div className="menu-item-icon">
                                    <Icon as={item.icon} className="icon-lg" />
                                </div>
                                <div className="menu-item-content">
                                    <div className="menu-item-title">{item.label}</div>
                                </div>
                                <div className="menu-item-arrow">›</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileBottomSheet;
