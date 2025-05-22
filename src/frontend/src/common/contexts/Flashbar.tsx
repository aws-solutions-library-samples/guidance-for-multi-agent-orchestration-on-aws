import { createContext, useState } from "react";

type FlashbarType = "error" | "info" | "warning" | "success";

export interface FlashbarItem {
    type: FlashbarType;
    content: string;
}

export const FlashbarContext = createContext<{
    flashbarItems: FlashbarItem[];
    addFlashbarItem: (type: FlashbarType, content: string) => void;
    removeFlashbarItem: (index: number) => void;
}>({
    flashbarItems: [],
    addFlashbarItem: () => {},
    removeFlashbarItem: () => {},
});

export const FlashbarProvider = ({ children }: { children: React.ReactNode }) => {
    const [flashbarItems, setFlashbarItems] = useState<FlashbarItem[]>([]);

    const addFlashbarItem = (type: FlashbarType, content: string) => {
        setFlashbarItems((prevItems) => [...prevItems, { type, content }]);
    };

    const removeFlashbarItem = (index: number) => {
        setFlashbarItems((prevItems) => prevItems.filter((_, i) => i !== index));
    };

    return (
        <FlashbarContext.Provider
            value={{
                flashbarItems,
                addFlashbarItem,
                removeFlashbarItem,
            }}
        >
            {children}
        </FlashbarContext.Provider>
    );
};
