import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ShoppingState {
    checkedItems: Record<string, boolean>;
    prices: Record<string, string>;
    quantities: Record<string, string>;

    toggleItem: (id: string, isChecked?: boolean) => void;
    setPrice: (id: string, price: string) => void;
    setQuantity: (id: string, quantity: string) => void;
    clearCart: () => void;
}

export const useShoppingStore = create<ShoppingState>()(
    persist(
        (set) => ({
            checkedItems: {},
            prices: {},
            quantities: {},

            toggleItem: (id, isChecked) => set((state) => ({
                checkedItems: {
                    ...state.checkedItems,
                    [id]: isChecked !== undefined ? isChecked : !state.checkedItems[id]
                }
            })),

            setPrice: (id, price) => set((state) => ({
                prices: { ...state.prices, [id]: price }
            })),

            setQuantity: (id, quantity) => set((state) => ({
                quantities: { ...state.quantities, [id]: quantity }
            })),

            clearCart: () => set({ checkedItems: {}, prices: {}, quantities: {} })
        }),
        {
            name: 'shopping-cart-storage', // key in localStorage
        }
    )
);
