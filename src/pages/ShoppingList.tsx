import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { ShoppingCart, CheckCircle2, Circle } from 'lucide-react';

export default function ShoppingList() {
    const { session } = useAuth();
    const userId = session?.user?.id;
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(today, { weekStartsOn: 0 }); // Saturday

    const { data: weekMeals = [], isLoading } = useQuery({
        queryKey: ['weekMeals', userId, start, end],
        queryFn: async () => {
            const startDateStr = format(start, 'yyyy-MM-dd');
            const endDateStr = format(end, 'yyyy-MM-dd');

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

    const toggleCheck = (id: string) => {
        setCheckedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const hasItems = aggregatedList.length > 0;

    return (
        <div className="p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mb-6 mt-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mercado</h1>
                    <p className="text-sm text-gray-500">Lista gerada da dieta da semana</p>
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
                <div className="space-y-3">
                    {aggregatedList.map((item) => {
                        const isChecked = checkedItems[item.id];
                        return (
                            <button
                                key={item.id}
                                onClick={() => toggleCheck(item.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all ${isChecked
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                                    : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {isChecked ? (
                                        <CheckCircle2 className="text-emerald-500" size={24} />
                                    ) : (
                                        <Circle className="text-gray-300" size={24} />
                                    )}
                                    <span className={`font-semibold text-lg ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {item.nome}
                                    </span>
                                </div>
                                <span className={`font-bold px-3 py-1 rounded-lg ${isChecked ? 'bg-gray-200 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {Math.round(item.quantidade)}g
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
