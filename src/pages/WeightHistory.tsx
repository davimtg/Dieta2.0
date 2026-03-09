import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Download, Plus, Scale, Activity, Droplets, Coffee, Calendar, Moon, Sun, Sunrise, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import BluetoothScaleWidget from '../components/BluetoothScaleWidget';

export interface WeightRecord {
    id: string;
    weight: number;
    ateRecently: boolean;
    drankRecently: boolean;
    date: string; // DD/MM/YYYY
    time: string; // HH:MM
    shift: string; // Manhã | Tarde | Noite
    timestamp: number;
}

const INITIAL_MOCKS: WeightRecord[] = [
    { id: '1', weight: 82.5, ateRecently: false, drankRecently: false, date: '04/03/2026', time: '07:30', shift: 'Manhã', timestamp: new Date('2026-03-04T07:30:00').getTime() },
    { id: '2', weight: 81.8, ateRecently: false, drankRecently: false, date: '05/03/2026', time: '08:15', shift: 'Manhã', timestamp: new Date('2026-03-05T08:15:00').getTime() },
    { id: '3', weight: 83.0, ateRecently: true, drankRecently: true, date: '05/03/2026', time: '19:45', shift: 'Noite', timestamp: new Date('2026-03-05T19:45:00').getTime() },
    { id: '4', weight: 81.2, ateRecently: false, drankRecently: false, date: '07/03/2026', time: '06:45', shift: 'Manhã', timestamp: new Date('2026-03-07T06:45:00').getTime() }
];

export default function WeightHistory() {
    const navigate = useNavigate();
    const [records, setRecords] = useState<WeightRecord[]>(INITIAL_MOCKS);
    const [fastingOnly, setFastingOnly] = useState(false);
    const [showAddWidget, setShowAddWidget] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const filteredRecords = useMemo(() => {
        let sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
        if (fastingOnly) {
            sorted = sorted.filter(r => !r.ateRecently && !r.drankRecently);
        }
        return sorted;
    }, [records, fastingOnly]);

    const chartData = useMemo(() => {
        return [...filteredRecords].reverse().map(r => ({
            name: `${r.date.slice(0, 5)}`,
            peso: r.weight,
            detalhe: r
        }));
    }, [filteredRecords]);

    const handleSaveWeight = (data: Omit<WeightRecord, 'id'>) => {
        const newRecord = { ...data, id: Date.now().toString() };
        setRecords(prev => [newRecord, ...prev]);
        setTimeout(() => setShowAddWidget(false), 2000);
    };

    const downloadCSV = () => {
        if (filteredRecords.length === 0) return;
        const headers = "Data,Hora,Turno,Peso(kg),Comeu Recente?,Bebeu Recente?\n";
        const rows = filteredRecords.map(r =>
            `${r.date},${r.time},${r.shift},${r.weight},${r.ateRecently ? 'Sim' : 'Não'},${r.drankRecently ? 'Sim' : 'Não'}`
        ).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `evolucao_peso_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 md:pb-0">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-800 transition rounded-full hover:bg-gray-50">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="text-center">
                        <h1 className="font-bold text-gray-800 text-lg flex items-center justify-center gap-2">
                            <Scale size={18} className="text-blue-500" /> Evolução de Peso
                        </h1>
                    </div>
                    <button onClick={downloadCSV} className="p-2 -mr-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition rounded-full" title="Exportar CSV">
                        <Download size={22} />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
                {!showAddWidget ? (
                    <button
                        onClick={() => setShowAddWidget(true)}
                        className="w-full bg-white border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] transition-all rounded-3xl p-4 flex flex-col items-center justify-center gap-2 group text-blue-600 font-bold shadow-sm"
                    >
                        <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition">
                            <Plus size={24} />
                        </div>
                        <span>Nova Pesagem</span>
                    </button>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-4 relative">
                        <button onClick={() => setShowAddWidget(false)} className="absolute -top-3 -right-3 z-10 bg-white border border-gray-100 rounded-full p-1.5 text-gray-400 hover:text-red-500 shadow-sm">
                            <ArrowLeft size={16} />
                        </button>
                        <BluetoothScaleWidget onSaveWeight={handleSaveWeight} />
                    </div>
                )}

                <section className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Activity size={18} className="text-emerald-500" /> Gráfico de Progresso</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Visão geral do seu histórico</p>
                        </div>
                    </div>

                    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 200, minHeight: 200, overflow: 'hidden' }}>
                        {isMounted && chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#6B7280', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                                        itemStyle={{ color: '#10B981', fontWeight: '900' }}
                                        formatter={(value: any) => [`${value} kg`, 'Peso']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="peso"
                                        stroke="#3B82F6"
                                        strokeWidth={4}
                                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 opacity-50 border-2 border-dashed border-gray-100 rounded-2xl">
                                <Activity size={32} />
                                <p className="text-xs font-semibold mt-2">
                                    {chartData.length <= 1 ? "Dados insuficientes para gráfico" : "Aguardando carregamento..."}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Calendar size={18} className="text-blue-500" /> Histórico</h2>
                        <button
                            onClick={() => setFastingOnly(prev => !prev)}
                            className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm active:scale-95 transition"
                        >
                            <div className={`w-8 h-4 rounded-full flex items-center transition-colors duration-300 p-0.5 ${fastingOnly ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${fastingOnly ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </div>
                            <span className="text-xs font-bold text-gray-600">Apenas Jejum</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {filteredRecords.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                <Info size={28} className="text-gray-300 mb-3" />
                                <p className="text-gray-500 font-semibold text-sm">Nenhum registro encontrado.</p>
                            </div>
                        ) : (
                            filteredRecords.map((record) => {
                                const shiftIcon = record.shift === 'Manhã' ? <Sunrise size={16} className="text-orange-400" />
                                    : record.shift === 'Tarde' ? <Sun size={16} className="text-yellow-500" />
                                        : <Moon size={16} className="text-indigo-400" />;
                                const showWarning = record.ateRecently || record.drankRecently;
                                return (
                                    <div key={record.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-800">{record.date}</span>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{record.time}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-gray-500">
                                                    {shiftIcon} {record.shift}
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-2xl font-black text-gray-800">{record.weight.toFixed(1)}</span>
                                                <span className="text-xs font-bold text-gray-400">kg</span>
                                            </div>
                                        </div>
                                        {showWarning && (
                                            <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                                                {record.ateRecently && <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-bold outline outline-1 outline-amber-100"><Coffee size={12} /> Comidinha</div>}
                                                {record.drankRecently && <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-bold outline outline-1 outline-blue-100"><Droplets size={12} /> Água</div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
