// @ts-nocheck
import { create } from 'zustand';

interface BluetoothScaleState {
    device: BluetoothDevice | null;
    server: BluetoothRemoteGATTServer | null;
    characteristic: BluetoothRemoteGATTCharacteristic | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    currentWeight: number | null;

    setConnectionState: (connecting: boolean, connected: boolean, error?: string | null) => void;
    setDevice: (device: BluetoothDevice | null, server: BluetoothRemoteGATTServer | null, characteristic: BluetoothRemoteGATTCharacteristic | null) => void;
    setCurrentWeight: (weight: number | null) => void;
    disconnect: () => void;
}

export const useBluetoothStore = create<BluetoothScaleState>((set, get) => ({
    device: null,
    server: null,
    characteristic: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    currentWeight: null,

    setConnectionState: (connecting, connected, error = null) =>
        set({ isConnecting: connecting, isConnected: connected, error }),

    setDevice: (device, server, characteristic) =>
        set({ device, server, characteristic }),

    setCurrentWeight: (weight) =>
        set({ currentWeight: weight }),

    disconnect: () => {
        const { device } = get();
        if (device && device.gatt?.connected) {
            device.gatt.disconnect();
        }
        set({
            device: null,
            server: null,
            characteristic: null,
            isConnected: false,
            isConnecting: false,
            currentWeight: null
        });
    }
}));
