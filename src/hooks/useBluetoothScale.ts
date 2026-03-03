import { useState } from 'react';

export function useBluetoothScale() {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connectToScale = async () => {
        try {
            setIsConnecting(true);
            setError(null);

            // @ts-ignore - Web Bluetooth API Support
            if (!navigator.bluetooth) {
                throw new Error('Navegador não suporta Web Bluetooth API. Use o Chrome no Android ou Desktop.');
            }

            // @ts-ignore
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service', 'weight_scale']
            });

            console.log('Bluetooth Device selected:', device.name);
            alert(`Sincronização iniciada com: ${device.name || 'Balança'}`);

            setIsConnected(true);
            // Futuro: conectar ao servidor GATT do device e decodificar dados
            // const server = await device.gatt.connect();

        } catch (err: any) {
            console.error('Erro no Bluetooth:', err);
            setError(err.message || 'Erro ao conectar');
            alert(`Erro de conexão Bluetooth: ${err.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    return {
        connectToScale,
        isConnected,
        isConnecting,
        error
    };
}
