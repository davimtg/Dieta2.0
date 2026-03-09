// @ts-nocheck
import toast from 'react-hot-toast';
import { useBluetoothStore } from '../store/useBluetoothStore';

// UUIDS DE SERVIÇOS COMUNS
const WEIGHT_SCALE_SERVICE = '0000181d-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT_CHAR = '00002a9d-0000-1000-8000-00805f9b34fb';
const OKOK_SERVICE_FFF0 = '0000fff0-0000-1000-8000-00805f9b34fb';
const OKOK_SERVICE_FFE0 = '0000ffe0-0000-1000-8000-00805f9b34fb';

export function useBluetoothScale() {
    const store = useBluetoothStore();

    const connectToScale = async () => {
        try {
            store.setConnectionState(true, false, null);

            console.log('--- DIAGNÓSTICO DE AMBIENTE ---');
            console.log('HTTPS/Localhost (Secure Context):', window.isSecureContext);
            console.log('User Agent:', navigator.userAgent);

            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth não disponível. Use HTTPS/Localhost.');
            }

            // RESTAURADO: Mudança para acceptAllDevices: true (namePrefix vazio é proibido pelo navegador)
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    WEIGHT_SCALE_SERVICE,
                    OKOK_SERVICE_FFF0,
                    OKOK_SERVICE_FFE0,
                    '0000ffb0-0000-1000-8000-00805f9b34fb',
                    '0000ffb7-0000-1000-8000-00805f9b34fb',
                    '0000fee7-0000-1000-8000-00805f9b34fb',
                    '0000fee0-0000-1000-8000-00805f9b34fb'
                ],
                // LISTA MASSIVA DE IDs PARA BYPASS DE PRIVACIDADE (Weking, Chipsea, Nordic, etc)
                optionalManufacturerData: [
                    0x0000, 0x012D, 0x00D2, 0x0059, 0x004C, 0x000A, 0x0001,
                    0x0002, 0xFFFF, 0x015D, 0x5247, 0x2020, 0x4353, 0x12D2,
                    0x1901, 0x2017, 0xBEAF, 0x01AA, 0x01AB, 0x01AC, 0x546A,
                    0x02D7, 0x0057, 0x0102, 0x0113, 0x0132, 0x015B, 0x0191
                ]
            });

            console.log('Dispositivo selecionado:', device.name || 'Sem nome', '| ID:', device.id);

            // MODO BROADCAST (WATCH ADVERTISEMENTS)
            if (typeof device.watchAdvertisements === 'function') {
                console.log('[MODO] Ativando Escuta Broadcast...');

                device.addEventListener('advertisementreceived', (event: any) => {
                    const mf = event.manufacturerData;
                    const sd = event.serviceData;

                    // Se estiver vazio, vamos logar as chaves do evento para ver se há campos proprietários
                    if ((!mf || mf.size === 0) && (!sd || sd.size === 0)) {
                        console.log('[DEBUG] Pacote Vazio detectado. Chaves do evento:', Object.keys(event));
                        if (event.uuids) console.log('[DEBUG] UUIDs no pacote:', event.uuids);
                    }

                    // Log exaustivo para inspeção manual no console
                    console.log(`[PACOTE] RSSI: ${event.rssi} | Nome: ${event.name || 'N/A'}`);
                    console.dir(event); // Permite ao usuário clicar e ver campos ocultos

                    if (mf && mf.size > 0) {
                        mf.forEach((value: DataView, key: number) => {
                            const hex = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
                            console.log(`>>> MF [0x${key.toString(16).toUpperCase()}]:`, hex);
                            processPayload(new Uint8Array(value.buffer));
                        });
                    }
                    if (sd && sd.size > 0) {
                        sd.forEach((value: DataView, key: string) => {
                            const hex = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
                            console.log(`>>> SD [${key}]:`, hex);
                            processPayload(new Uint8Array(value.buffer));
                        });
                    }
                });

                try {
                    await device.watchAdvertisements();
                    store.setDevice(device, null, null);
                    store.setConnectionState(false, true, null);
                    toast.success('Modo Escuta Ativado!');
                    return;
                } catch (e) {
                    console.warn('[BROADCAST] Falhou ao iniciar:', e);
                }
            }

            // FALLBACK GATT
            toast.loading('Tentando conexão GATT...', { id: 'btConnect' });
            device.addEventListener('gattserverdisconnected', onDisconnected);

            let server = null;
            for (let i = 0; i < 3; i++) {
                try {
                    server = await device.gatt?.connect();
                    if (server?.connected) break;
                } catch (e) {
                    await new Promise(res => setTimeout(res, 1000));
                }
            }

            toast.dismiss('btConnect');
            if (!server?.connected) throw new Error('Não foi possível conectar via GATT.');

            const services = await server.getPrimaryServices();
            let targetChar = null;
            let isOKOK = false;

            for (const s of services) {
                const uuid = s.uuid.toLowerCase();
                if (uuid.includes('181d')) {
                    targetChar = await s.getCharacteristic(WEIGHT_MEASUREMENT_CHAR);
                    break;
                } else if (uuid.includes('fff0') || uuid.includes('ffe0')) {
                    isOKOK = true;
                    const chars = await s.getCharacteristics();
                    targetChar = chars.find((c: any) => c.properties.notify || c.properties.indicate);
                    break;
                }
            }

            if (!targetChar) throw new Error('Dados de peso não encontrados no dispositivo.');

            await targetChar.startNotifications();
            targetChar.addEventListener('characteristicvaluechanged', (event: any) => {
                processPayload(new Uint8Array(event.target.value.buffer), isOKOK);
            });

            store.setDevice(device, server, targetChar);
            store.setConnectionState(false, true, null);
            toast.success('Conectado via GATT!');

        } catch (err: any) {
            toast.dismiss('btConnect');
            console.error('Erro Bluetooth:', err);
            store.setConnectionState(false, false, err.message);
            toast.error(err.message);
        }
    };

    const processPayload = (bytes: Uint8Array, isOKOK = true) => {
        try {
            let weight = 0;
            if (isOKOK && bytes.length >= 6) {
                const raw = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
                weight = raw / 10;
                if (weight > 250 || weight < 5) weight = raw / 100;
            } else if (bytes.length >= 3) {
                weight = ((bytes[2] << 8) | bytes[1]) * 0.005;
            }

            if (weight > 5 && weight < 250) {
                const final = +(Math.round(weight * 10) / 10).toFixed(1);
                if (final !== store.currentWeight) {
                    console.log('Peso detectado:', final, 'kg');
                    store.setCurrentWeight(final);
                }
            }
        } catch (e) {
            console.warn('Erro payload:', e);
        }
    };

    const disconnect = () => {
        store.disconnect();
        toast('Desconectado.');
    };

    const onDisconnected = () => {
        store.setConnectionState(false, false, 'Desconectado');
        store.setDevice(null, null, null);
    };

    return {
        connectToScale,
        disconnect,
        device: store.device,
        isConnected: store.isConnected,
        isConnecting: store.isConnecting,
        currentWeight: store.currentWeight,
        error: store.error
    };
}
