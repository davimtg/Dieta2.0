import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingCart, CheckCircle2, Circle, Calendar, Receipt, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useShoppingStore } from '../store/useShoppingStore';

export default function ShoppingList() {
    const { session } = useAuth();
    const userId = session?.user?.id;

    // Zustand Persisted Store
    const { checkedItems, prices, quantities, toggleItem, setPrice, setQuantity, clearCart } = useShoppingStore();

    // UI state for expanding items
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    // Date range state
    const today = new Date();
    const [startDate, setStartDate] = useState<Date>(today);
    const [endDate, setEndDate] = useState<Date>(addDays(today, 7));

    const { data: weekMeals = [], isLoading } = useQuery({
        queryKey: ['weekMeals', userId, startDate, endDate],
        queryFn: async () => {
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            const { data, error } = await supabase
                .from('refeicoes_diarias')
                .select('*, itens_consumidos(*, alimentos(*), receitas(receita_ingredientes(*, alimentos(*))))')
                .eq('user_id', userId)
                .gte('data', startDateStr)
                .lte('data', endDateStr);

            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    // Aggregate items
    const aggregatedList = useMemo(() => {
        const itemsMap: Record<string, { nome: string; quantidade: number; checked: boolean }> = {};

        weekMeals.forEach((meal: any) => {
            meal.itens_consumidos?.forEach((item: any) => {
                if (item.alimentos) {
                    const id = item.alimentos.id;
                    if (!itemsMap[id]) {
                        itemsMap[id] = { nome: item.alimentos.nome, quantidade: 0, checked: false };
                    }
                    itemsMap[id].quantidade += Number(item.quantidade_g);
                }
                if (item.receitas) {
                    // Se for receita, somamos os ingredientes daquela receita
                    item.receitas.receita_ingredientes?.forEach((ri: any) => {
                        if (ri.alimentos) {
                            const id = ri.alimentos.id;
                            if (!itemsMap[id]) {
                                itemsMap[id] = { nome: ri.alimentos.nome, quantidade: 0, checked: false };
                            }
                            // Multiplicando a proporção pelo que a pessoa consumiu (se consumiu 1 porção da receita etc)
                            // Simplificação: soma exatamente as gramas da receita toda (uma porção dela)
                            itemsMap[id].quantidade += Number(ri.quantidade_g);
                        }
                    });
                }
            });
        });

        return Object.entries(itemsMap).map(([id, data]) => ({
            id,
            ...data
        })).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [weekMeals]);

    const hasItems = aggregatedList.length > 0;

    // Helper to calculate total
    const totalCartValue = useMemo(() => {
        let total = 0;
        aggregatedList.forEach(item => {
            if (checkedItems[item.id] && prices[item.id]) {
                // Convert pt-BR decimal to float (10,50 -> 10.50)
                const priceNum = parseFloat(prices[item.id].replace(',', '.'));
                if (!isNaN(priceNum)) {
                    total += priceNum; // Assume input is the total price for the item
                }
            }
        });
        return total;
    }, [aggregatedList, checkedItems, prices]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mt-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mercado</h1>
                    <p className="text-sm text-gray-500">Gere ingredientes das refeições cadastradas</p>
                </div>
            </div>

            {/* Date Range Picker */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-2 mb-6 text-sm">
                <div className="flex flex-col flex-1 relative group">
                    <label className="text-xs font-semibold text-gray-400 mb-0.5 ml-1">De</label>
                    <div className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-2 rounded-xl border border-transparent group-hover:border-emerald-200 transition">
                        <Calendar size={14} className="text-emerald-500" />
                        <span className="font-medium truncate">{format(startDate, "dd 'de' MMM", { locale: ptBR })}</span>
                        <input
                            type="date"
                            value={format(startDate, 'yyyy-MM-dd')}
                            onChange={(e) => setStartDate(new Date(e.target.value + 'T00:00:00'))}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                    </div>
                </div>
                <div className="flex flex-col flex-1 relative group">
                    <label className="text-xs font-semibold text-gray-400 mb-0.5 ml-1">Até</label>
                    <div className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-2 rounded-xl border border-transparent group-hover:border-emerald-200 transition">
                        <Calendar size={14} className="text-emerald-500" />
                        <span className="font-medium truncate">{format(endDate, "dd 'de' MMM", { locale: ptBR })}</span>
                        <input
                            type="date"
                            min={format(startDate, 'yyyy-MM-dd')}
                            value={format(endDate, 'yyyy-MM-dd')}
                            onChange={(e) => setEndDate(new Date(e.target.value + 'T00:00:00'))}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <p className="text-center text-gray-500 mt-10">Carregando lista...</p>
            ) : !hasItems ? (
                <div className="bg-white rounded-[32px] p-8 text-center shadow-sm border border-gray-100 flex flex-col items-center mt-6">
                    <div className="bg-emerald-50 p-4 rounded-full mb-4 text-emerald-500">
                        <ShoppingCart size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Sua lista está vazia</h3>
                    <p className="text-sm text-gray-500 mb-6">Planeje suas refeições na semana para gerar os ingredientes de compras automaticamente.</p>
                </div>
            ) : (
                <div className="space-y-3 pb-24">
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={() => {
                                if (window.confirm("Deseja realmente limpar todos os preços e marcações do carrinho?")) {
                                    clearCart();
                                }
                            }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14} /> Limpar Carrinho
                        </button>
                    </div>

                    {aggregatedList.map((item) => {
                        const isChecked = checkedItems[item.id];
                        const isExpanded = expandedItem === item.id;

                        // Default to suggested quantity if no custom quantity is saved.
                        const displayQty = quantities[item.id] !== undefined ? quantities[item.id] : Math.round(item.quantidade).toString();
                        const displayPrice = prices[item.id] !== undefined ? prices[item.id] : '';

                        return (
                            <div
                                key={item.id}
                                className={`w-full flex flex-col p-4 rounded-2xl shadow-sm border transition-all ${isChecked
                                    ? 'bg-gray-50 border-gray-200'
                                    : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-md'
                                    }`}
                            >
                                {/* Top Row - Header */}
                                <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => {
                                    if (isChecked && !isExpanded) setExpandedItem(item.id);
                                    else if (!isChecked && !isExpanded) setExpandedItem(item.id);
                                    else setExpandedItem(isExpanded ? null : item.id);
                                }}>
                                    <div className="flex items-center gap-4 flex-1" onClick={(e) => {
                                        e.stopPropagation();
                                        toggleItem(item.id);
                                        // Auto-expand if checking for the first time
                                        if (!isChecked && !isExpanded) setExpandedItem(item.id);
                                    }}>
                                        {isChecked ? (
                                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={24} />
                                        ) : (
                                            <Circle className="text-gray-300 flex-shrink-0" size={24} />
                                        )}
                                        <div className="flex flex-col items-start flex-1 min-w-0 pr-2">
                                            <span className={`font-semibold text-base leading-tight mt-0.5 line-clamp-2 break-words w-full ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {item.nome}
                                            </span>
                                            {/* Subtitle mapping items to avoid overlap */}
                                            {isChecked && prices[item.id] && (
                                                <span className="text-xs font-bold text-emerald-600">R$ {prices[item.id]}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                                        <span className={`font-bold text-sm px-2.5 py-1 rounded-lg ${isChecked ? 'bg-gray-200 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {displayQty}g
                                        </span>
                                        <button className="text-gray-400 p-1">
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content (Inputs) */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col">
                                            <label className="text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Qtd Real Comprada</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={displayQty}
                                                    onChange={(e) => setQuantity(item.id, e.target.value)}
                                                    className={`w-full bg-gray-50 border ${isChecked ? 'border-gray-200' : 'border-gray-200'} rounded-xl py-2 pl-3 pr-8 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500`}
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">g</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col">
                                            <label className="text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Preço Total do Item</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600">R$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={displayPrice}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                                        setPrice(item.id, val);
                                                        // Auto check if they type a price
                                                        if (val && !isChecked) {
                                                            toggleItem(item.id, true);
                                                        }
                                                    }}
                                                    className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl py-2 pl-10 pr-3 text-sm font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sticky Total Bar */}
            {totalCartValue > 0 && (
                <div className="fixed bottom-20 left-4 right-4 z-40 bg-emerald-900 rounded-3xl p-4 shadow-2xl flex items-center justify-between pointer-events-auto border border-emerald-800 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-800 p-2 rounded-2xl">
                            <Receipt size={24} className="text-emerald-300" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">Total do Carrinho</span>
                            <span className="text-2xl font-black text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCartValue)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
