import { useState } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Scope = 'selected' | 'specific' | 'range' | 'future' | 'all';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    onConfirm: (scope: Scope, dateA?: string, dateB?: string) => Promise<void>;
}

export default function ClearDiaryModal({ isOpen, onClose, selectedDate, onConfirm }: Props) {
    const [scope, setScope] = useState<Scope>('selected');
    const [specificDate, setSpecificDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
    const [rangeStart, setRangeStart] = useState(format(selectedDate, 'yyyy-MM-dd'));
    const [rangeEnd, setRangeEnd] = useState(format(selectedDate, 'yyyy-MM-dd'));
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const selectedDateStr = format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            if (scope === 'selected') {
                await onConfirm('selected', format(selectedDate, 'yyyy-MM-dd'));
            } else if (scope === 'specific') {
                await onConfirm('specific', specificDate);
            } else if (scope === 'range') {
                await onConfirm('range', rangeStart, rangeEnd);
            } else if (scope === 'future') {
                await onConfirm('future');
            } else {
                await onConfirm('all');
            }
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const isDestructive = scope === 'all' || scope === 'future';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-[slideUp_0.25s_ease-out]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-50 rounded-xl">
                            <Trash2 size={18} className="text-red-500" />
                        </div>
                        <h2 className="font-black text-gray-800 text-base">Limpar Registros</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-gray-100 transition text-gray-400"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="px-5 text-xs text-gray-500 mb-4">
                    Esta ação apagará <strong>permanentemente</strong> os alimentos registrados e as sugestões aplicadas no período selecionado.
                </p>

                {/* Scope options */}
                <div className="px-5 space-y-2 mb-4">
                    {/* Opção 1: Dia selecionado */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${scope === 'selected' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <input
                            type="radio"
                            name="scope"
                            value="selected"
                            checked={scope === 'selected'}
                            onChange={() => setScope('selected')}
                            className="mt-0.5 accent-emerald-500"
                        />
                        <div>
                            <p className="text-sm font-semibold text-gray-700">O dia selecionado</p>
                            <p className="text-xs text-gray-400 capitalize">{selectedDateStr}</p>
                        </div>
                    </label>

                    {/* Opção 2: Dia específico */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${scope === 'specific' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <input
                            type="radio"
                            name="scope"
                            value="specific"
                            checked={scope === 'specific'}
                            onChange={() => setScope('specific')}
                            className="mt-0.5 accent-emerald-500"
                        />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-700">Um dia específico</p>
                            {scope === 'specific' && (
                                <input
                                    type="date"
                                    value={specificDate}
                                    onChange={e => setSpecificDate(e.target.value)}
                                    className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                                    onClick={e => e.stopPropagation()}
                                />
                            )}
                        </div>
                    </label>

                    {/* Opção 3: Intervalo */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${scope === 'range' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <input
                            type="radio"
                            name="scope"
                            value="range"
                            checked={scope === 'range'}
                            onChange={() => setScope('range')}
                            className="mt-0.5 accent-emerald-500"
                        />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-700">Um intervalo de dias</p>
                            {scope === 'range' && (
                                <div className="mt-2 flex gap-2 items-center">
                                    <input
                                        type="date"
                                        value={rangeStart}
                                        onChange={e => setRangeStart(e.target.value)}
                                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <span className="text-gray-400 text-xs">até</span>
                                    <input
                                        type="date"
                                        value={rangeEnd}
                                        min={rangeStart}
                                        onChange={e => setRangeEnd(e.target.value)}
                                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            )}
                        </div>
                    </label>

                    {/* Opção 4: Dias futuros */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${scope === 'future' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <input
                            type="radio"
                            name="scope"
                            value="future"
                            checked={scope === 'future'}
                            onChange={() => setScope('future')}
                            className="mt-0.5 accent-orange-500"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-gray-700">Dias futuros</p>
                                <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">a partir de amanhã</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">Remove o planejamento futuro, preserva o histórico passado</p>
                        </div>
                    </label>

                    {/* Opção 5: Todo o histórico */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${scope === 'all' ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <input
                            type="radio"
                            name="scope"
                            value="all"
                            checked={scope === 'all'}
                            onChange={() => setScope('all')}
                            className="mt-0.5 accent-red-500"
                        />
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={15} className="text-red-400 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">TODO o meu histórico</p>
                                <p className="text-xs text-red-400">Apaga absolutamente todos os registros</p>
                            </div>
                        </div>
                    </label>
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition disabled:opacity-60 ${isDestructive
                            ? 'bg-red-500 hover:bg-red-600 active:scale-[0.97]'
                            : 'bg-gray-800 hover:bg-gray-900 active:scale-[0.97]'
                            }`}
                    >
                        {isLoading ? (
                            <><Loader2 size={16} className="animate-spin" /> Apagando...</>
                        ) : (
                            <><Trash2 size={16} /> Sim, apagar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
