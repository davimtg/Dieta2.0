import { createContext, useContext, useState, type ReactNode } from 'react';

interface DateContextType {
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
    const [selectedDate, setSelectedDate] = useState(new Date());

    return (
        <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
            {children}
        </DateContext.Provider>
    );
}

export function useGlobalDate() {
    const context = useContext(DateContext);
    if (context === undefined) {
        throw new Error('useGlobalDate must be used within a DateProvider');
    }
    return context;
}
