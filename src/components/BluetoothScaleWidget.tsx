import { useState, useEffect } from 'react';
import { Bluetooth, Scale, Clock, Save, Coffee, Droplets, CheckCircle2, Plus, Info } from 'lucide-react';
import { useBluetoothScale } from '../hooks/useBluetoothScale';

interface BluetoothScaleWidgetProps {
    onSaveWeight: (data: any) => void;
}

export default function BluetoothScaleWidget({ onSaveWeight }: BluetoothScaleWidgetProps) {
    const { isConnected, isConnecting, currentWeight: realTimeWeight, connectToScale, disconnect } = useBluetoothScale();

    const [isManual, setIsManual] = useState(false);
    const [displayedWeight, setDisplayedWeight] = useState<number>(0);
    const [ateRecently, setAteRecently] = useState(false);
    const [drankRecently, setDrankRecently] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Sincroniza peso da balança se não estiver no manual
    useEffect(() => {
        if (realTimeWeight && realTimeWeight > 0 && !isManual) {
            setDisplayedWeight(realTimeWeight);
        }
    }, [realTimeWeight, isManual]);

    const getShift = (date: Date) => {
        const hours = date.getHours();
        if (hours >= 6 && hours < 12) return 'Manhã';
        if (hours >= 12 && hours < 18) return 'Tarde';
        return 'Noite';
    };

    const handleSave = () => {
        if (displayedWeight <= 0) return;
        const now = new Date();
        const record = {
            weight: +(Math.round(displayedWeight * 10) / 10).toFixed(1),
            ateRecently,
            drankRecently,
            date: now.toLocaleDateString('pt-BR'),
            time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            shift: getShift(now),
            timestamp: now.getTime()
        };

        onSaveWeight(record);
        setShowToast(true);
        setTimeout(() => {
            setDisplayedWeight(0);
            setAteRecently(false);
            setDrankRecently(false);
            setShowToast(false);
        }, 3000);
    };

    return (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 bg-emerald-500 text-white p-3 text-center text-sm font-bold flex items-center justify-center gap-2 transition-transform duration-300 z-10 ${showToast ? 'translate-y-0' : '-translate-y-full'}`}>
                <CheckCircle2 size={16} /> Medição registrada com sucesso!
            </div>

            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Scale className="text-blue-500" size={20} />
                    {isManual ? 'Entrada Manual' : 'Balança Bluetooth'}
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setIsManual(!isManual);
                            if (!isManual) setDisplayedWeight(0);
                        }}
                        className={`p-2 rounded-xl transition ${isManual ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        title={isManual ? 'Voltar para Bluetooth' : 'Digitar Manualmente'}
                    >
                        <Plus size={20} />
                    </button>
                    {isConnected && !isManual ? (
                        <button onClick={disconnect} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-red-50 hover:text-red-500 transition shadow-sm">
                            <Bluetooth size={20} />
                        </button>
                    ) : (
                        <button onClick={connectToScale} disabled={isConnecting || isManual} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition disabled:opacity-50">
                            <Bluetooth size={20} className={isConnecting ? 'animate-pulse' : ''} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-2xl mb-6 relative border border-gray-100/50">
                {isManual ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                        <p className="text-[10px] text-blue-500 font-black mb-2 uppercase tracking-widest">Peso (kg)</p>
                        <div className="flex items-baseline gap-1">
                            <input
                                type="number"
                                step="0.1"
                                autoFocus
                                value={displayedWeight || ''}
                                onChange={(e) => setDisplayedWeight(parseFloat(e.target.value) || 0)}
                                className="text-5xl font-black text-gray-800 tracking-tighter bg-transparent border-b-4 border-blue-200 outline-none w-32 text-center focus:border-blue-500 transition-colors"
                            />
                            <span className="text-lg font-bold text-gray-400">kg</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-widest">Leitura em tempo real</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-gray-800 tracking-tighter">
                                {displayedWeight > 0 ? displayedWeight.toFixed(1) : '--'}
                            </span>
                            <span className="text-lg font-bold text-gray-400">kg</span>
                        </div>
                    </>
                )}

                {isConnecting && !isManual && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                            <span className="text-blue-600 font-black text-xs uppercase tracking-widest">Iniciando Scanner...</span>
                        </div>
                    </div>
                )}

                {isConnected && displayedWeight === 0 && !isManual && (
                    <div className="absolute inset-0 bg-emerald-50/90 flex flex-col items-center justify-center rounded-2xl p-4 text-center animate-in fade-in duration-500">
                        <Scale className="text-emerald-500 mb-2 animate-bounce" size={28} />
                        <span className="text-emerald-800 font-black text-sm uppercase tracking-wider">Pode subir na balança</span>
                        <p className="text-[10px] text-emerald-600 mt-1 font-bold">Aguardando estabilização do peso...</p>
                    </div>
                )}
            </div>

            <div className={`space-y-4 transition-all duration-300 ${(displayedWeight > 0 || isManual) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <Clock size={14} /> Condições da Pesagem
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={() => setAteRecently(!ateRecently)}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${ateRecently ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-600 hover:border-amber-200'}`}
                        >
                            <Coffee size={18} />
                            <span className="text-xs font-bold">Comi nas últimas 4h</span>
                        </button>

                        <button
                            onClick={() => setDrankRecently(!drankRecently)}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${drankRecently ? 'bg-blue-500 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'}`}
                        >
                            <Droplets size={18} />
                            <span className="text-xs font-bold">Bebi líquidos nas últimas 4h</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={displayedWeight <= 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-sm"
                >
                    <Save size={20} /> Salvar Registro
                </button>
            </div>

            {!isConnected && !isConnecting && !isManual && !displayedWeight && (
                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100/50 flex items-start gap-3">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        Dica: Ative o Bluetooth do Windows e certifique-se que a balança está ligada antes de conectar. Se preferir, use o botão <Plus size={10} className="inline" /> para digitar manualmente.
                    </p>
                </div>
            )}
        </div>
    );
}
