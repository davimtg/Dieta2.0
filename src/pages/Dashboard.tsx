import { useState } from 'react';
import { useDietData } from '../hooks/useDietData';
import { useGlobalDate } from '../contexts/DateContext';
import AddFoodModal from '../components/AddFoodModal';
import EditItemModal from '../components/EditItemModal';
import { Plus, ChevronLeft, ChevronRight, Calendar, Edit2, Trash2, Check } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
    const { selectedDate, setSelectedDate } = useGlobalDate();
    const { refeicoes, perfil, isLoading, deleteItem, updateItemSugestao } = useDietData(selectedDate);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemToEdit, setSelectedItemToEdit] = useState<any | null>(null);

    // Helpers para formatar o título da data
    const getDateTitle = () => {
        const weekday = format(selectedDate, "EEEE", { locale: ptBR });
        if (isToday(selectedDate)) return `Hoje, ${weekday}`;
        if (isTomorrow(selectedDate)) return `Amanhã, ${weekday}`;
        if (isYesterday(selectedDate)) return `Ontem, ${weekday}`;
        return format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
    };

    if (isLoading) {
        return <div className="min-h-screen bg-emerald-500 flex flex-col items-center justify-center text-white">
            <Calendar size={48} className="mb-4 animate-bounce text-emerald-200" />
            <p className="font-semibold">Carregando Diário de {getDateTitle()}...</p>
        </div>;
    }

    const goalKcal = perfil?.meta_kcal || 2000;

    // Helpers
    const getReceitaMacros = (receita: any): any => {
        let totalC = 0, totalP = 0, totalG = 0, totalK = 0;
        receita.receita_ingredientes?.forEach((ri: any) => {
            if (ri.alimentos) {
                const ratio = ri.quantidade_g / ri.alimentos.porcao_base_g;
                totalC += ri.alimentos.carbo * ratio;
                totalP += ri.alimentos.prot * ratio;
                totalG += ri.alimentos.gord * ratio;
                totalK += ri.alimentos.kcal * ratio;
            } else if (ri.receitas) {
                const subMacros = getReceitaMacros(ri.receitas);
                const portions = ri.quantidade_g;
                totalC += subMacros.carbo * portions;
                totalP += subMacros.prot * portions;
                totalG += subMacros.gord * portions;
                totalK += subMacros.kcal * portions;
            }
        });
        const porcoes = receita.rendimento_porcoes || 1;
        return {
            carbo: totalC / porcoes,
            prot: totalP / porcoes,
            gord: totalG / porcoes,
            kcal: totalK / porcoes
        };
    };

    // Calcula totais
    let totalKcal = 0;
    let totalCarbs = 0;
    let totalProt = 0;
    let totalFat = 0;

    refeicoes.forEach((meal: any) => {
        meal.itens_consumidos?.forEach((item: any) => {
            if (item.is_sugestao) return; // Ignora sugestões pros totais

            if (item.alimentos) {
                const ratio = item.quantidade_g / item.alimentos.porcao_base_g;
                totalKcal += item.alimentos.kcal * ratio;
                totalCarbs += item.alimentos.carbo * ratio;
                totalProt += item.alimentos.prot * ratio;
                totalFat += item.alimentos.gord * ratio;
            }
            if (item.receitas) {
                const rMacros = getReceitaMacros(item.receitas);
                const ratio = item.quantidade_g; // quantidade_g para receita guarda o número de porções
                totalKcal += rMacros.kcal * ratio;
                totalCarbs += rMacros.carbo * ratio;
                totalProt += rMacros.prot * ratio;
                totalFat += rMacros.gord * ratio;
            }
        });
    });

    // Mock das metas de Macros (ideais da dieta)
    const goalCarbs = Math.round((goalKcal * 0.45) / 4); // 45% carbs
    const goalProt = Math.round((goalKcal * 0.3) / 4); // 30% prot
    const goalFat = Math.round((goalKcal * 0.25) / 9); // 25% fat

    const remainingKcal = Math.max(0, goalKcal - Math.round(totalKcal));
    const circlePercentage = Math.min(100, (Math.round(totalKcal) / goalKcal) * 100);
    const circleDasharray = 351.85; // 2 * pi * r (r=56)
    const circleDashoffset = circleDasharray - (circleDasharray * circlePercentage) / 100;

    // Ordered meals for UI
    const mealOrder = ['cafe', 'almoco', 'lanche', 'jantar'];
    const mealNames: Record<string, string> = {
        cafe: 'Café da Manhã',
        almoco: 'Almoço',
        lanche: 'Lanche',
        jantar: 'Jantar'
    };

    const sortedMeals = [...refeicoes].sort((a, b) => mealOrder.indexOf(a.tipo_refeicao) - mealOrder.indexOf(b.tipo_refeicao));

    return (
        <div className="bg-emerald-500 pt-8 pb-32 min-h-screen text-white rounded-b-[40px]">
            <div className="px-6 mb-8 flex justify-between items-center">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                            className="p-1 rounded-full hover:bg-emerald-600 transition"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <div className="relative group">
                            <h1 className="text-xl font-bold capitalize select-none cursor-pointer flex items-center gap-2">
                                {getDateTitle()}
                            </h1>
                            <input
                                type="date"
                                value={format(selectedDate, 'yyyy-MM-dd')}
                                onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            />
                        </div>

                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-1 rounded-full hover:bg-emerald-600 transition"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
                {!isToday(selectedDate) && (
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="text-xs bg-emerald-600 px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-emerald-700 transition"
                    >
                        Voltar a Hoje
                    </button>
                )}
            </div>

            <div className="px-6 relative">
                {/* Main Progress Card */}
                <div className="bg-white rounded-[32px] p-6 text-gray-800 shadow-xl mb-6 relative">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{Math.round(totalKcal)}</p>
                            <p className="text-xs text-gray-500">Consumidas</p>
                        </div>

                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                                <circle
                                    cx="64" cy="64" r="56"
                                    fill="transparent"
                                    stroke="#10b981"
                                    strokeWidth="12"
                                    strokeDasharray={circleDasharray}
                                    strokeDashoffset={circleDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute text-center flex flex-col items-center">
                                <span className="text-2xl font-bold text-emerald-600">{remainingKcal}</span>
                                <span className="text-xs text-gray-500 font-medium">Restantes</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-2xl font-bold">{goalKcal}</p>
                            <p className="text-xs text-gray-500">Meta Kcal</p>
                        </div>
                    </div>

                    <div className="flex justify-between mt-6 px-2">
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-semibold text-gray-500 mb-1">Carboidratos</p>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                                <div className="bg-blue-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalCarbs / goalCarbs) * 100)}%` }}></div>
                            </div>
                            <p className="text-xs font-bold text-gray-700">{Math.round(totalCarbs)}<span className="text-gray-400 font-normal">/{goalCarbs}g</span></p>
                        </div>
                        <div className="text-center flex-1 px-4 border-x border-gray-100 mx-4">
                            <p className="text-[10px] font-semibold text-gray-500 mb-1">Proteínas</p>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                                <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalProt / goalProt) * 100)}%` }}></div>
                            </div>
                            <p className="text-xs font-bold text-gray-700">{Math.round(totalProt)}<span className="text-gray-400 font-normal">/{goalProt}g</span></p>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-semibold text-gray-500 mb-1">Gorduras</p>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                                <div className="bg-amber-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalFat / goalFat) * 100)}%` }}></div>
                            </div>
                            <p className="text-xs font-bold text-gray-700">{Math.round(totalFat)}<span className="text-gray-400 font-normal">/{goalFat}g</span></p>
                        </div>
                    </div>
                </div>

                {/* Meals List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4 text-emerald-950 px-2 mt-8">
                        <h2 className="text-lg font-bold">Hoje</h2>
                    </div>

                    {sortedMeals.map((meal: any) => {
                        let mealKcal = 0;
                        meal.itens_consumidos?.forEach((item: any) => {
                            if (item.is_sugestao) return; // Ignora sugestões pro total da refeição
                            if (item.alimentos) {
                                mealKcal += item.alimentos.kcal * (item.quantidade_g / item.alimentos.porcao_base_g);
                            }
                            if (item.receitas) {
                                mealKcal += getReceitaMacros(item.receitas).kcal * item.quantidade_g;
                            }
                        });

                        return (
                            <div key={meal.id} className="bg-white p-5 rounded-3xl shadow-sm border border-emerald-50/50 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">{mealNames[meal.tipo_refeicao]}</h3>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{Math.round(mealKcal)} kcal</span>
                                </div>

                                <div className="space-y-2">
                                    {(!meal.itens_consumidos || meal.itens_consumidos.length === 0) ? (
                                        <p className="text-sm text-gray-400 italic">Nenhum item adicionado</p>
                                    ) : (
                                        meal.itens_consumidos.map((item: any) => {
                                            if (item.alimentos) {
                                                const itemKcal = Math.round(item.alimentos.kcal * (item.quantidade_g / item.alimentos.porcao_base_g));
                                                const itemRatio = item.quantidade_g / item.alimentos.porcao_base_g;
                                                const itemC = Math.round(item.alimentos.carbo * itemRatio);
                                                const itemP = Math.round(item.alimentos.prot * itemRatio);
                                                const itemG = Math.round(item.alimentos.gord * itemRatio);

                                                const containerClass = item.is_sugestao
                                                    ? "flex flex-col opacity-75 border-dashed border-2 border-emerald-200 bg-emerald-50/30 p-3 rounded-2xl relative group"
                                                    : "flex flex-col bg-gray-50 p-3 rounded-2xl relative group";

                                                return (
                                                    <div key={item.id} className={containerClass}>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-sm font-semibold text-gray-700">{item.alimentos.nome}</span>
                                                            <span className="text-xs font-bold text-gray-900">{itemKcal} kcal</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-700 font-medium">{item.quantidade_g}g</span>
                                                                <span className="text-[10.5px] text-gray-500 mt-0.5 whitespace-nowrap">
                                                                    C: <span className="font-medium text-gray-600">{itemC}g</span> •
                                                                    P: <span className="font-medium text-gray-600">{itemP}g</span> •
                                                                    G: <span className="font-medium text-gray-600">{itemG}g</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {item.is_sugestao && (
                                                                <button
                                                                    onClick={() => updateItemSugestao({ itemId: item.id, isSugestao: false })}
                                                                    className="p-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-colors"
                                                                    title="Confirmar consumo"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => { setSelectedItemToEdit(item); setIsEditModalOpen(true); }}
                                                                className="p-1.5 text-emerald-500 hover:bg-emerald-100 rounded-lg transition-colors"
                                                                title="Editar quantidade"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteItem(item.id)}
                                                                className="p-1.5 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                                                                title="Remover item"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            } else if (item.receitas) {
                                                const rMacros = getReceitaMacros(item.receitas);
                                                const itemKcal = Math.round(rMacros.kcal * item.quantidade_g);
                                                const recC = Math.round(rMacros.carbo * item.quantidade_g);
                                                const recP = Math.round(rMacros.prot * item.quantidade_g);
                                                const recG = Math.round(rMacros.gord * item.quantidade_g);

                                                const containerClass = item.is_sugestao
                                                    ? "flex flex-col opacity-75 border-dashed border-2 border-emerald-200 bg-emerald-50/30 p-3 rounded-2xl relative group transition-colors hover:bg-emerald-50/50"
                                                    : "flex flex-col bg-emerald-50/40 border border-emerald-100 p-3 rounded-2xl relative group transition-colors hover:bg-emerald-50/60";

                                                return (
                                                    <div key={item.id} className={containerClass}>
                                                        <div className="flex justify-between items-start mb-1 gap-2">
                                                            <span className="text-sm font-bold text-gray-800 leading-tight pt-1">{item.receitas.nome}</span>
                                                            <div className="flex items-center justify-end h-8 min-w-[80px]">
                                                                <span className="text-xs font-bold text-emerald-700 group-hover:hidden">{itemKcal} kcal</span>
                                                                <div className="hidden group-hover:flex items-center gap-1 -mr-1">
                                                                    {item.is_sugestao && (
                                                                        <button
                                                                            onClick={() => updateItemSugestao({ itemId: item.id, isSugestao: false })}
                                                                            className="p-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-colors"
                                                                            title="Confirmar consumo"
                                                                        >
                                                                            <Check size={16} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => { setSelectedItemToEdit(item); setIsEditModalOpen(true); }}
                                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-200/50 rounded-lg transition-colors"
                                                                        title="Editar porções"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteItem(item.id)}
                                                                        className="p-1.5 text-red-400 hover:bg-red-200/50 hover:text-red-600 rounded-lg transition-colors"
                                                                        title="Remover receita"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="text-xs font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">{item.quantidade_g} {item.quantidade_g === 1 ? 'porção' : 'porções'}</span>
                                                                <span className="text-[10.5px] text-emerald-600/80 mt-0.5 whitespace-nowrap pl-0.5">
                                                                    C: <span className="font-medium text-emerald-700/80">{recC}g</span> •
                                                                    P: <span className="font-medium text-emerald-700/80">{recP}g</span> •
                                                                    G: <span className="font-medium text-emerald-700/80">{recG}g</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Nested Ingredients */}
                                                        {item.receitas.receita_ingredientes?.length > 0 && (
                                                            <div className="mt-1 pl-3 border-l-2 border-emerald-100 space-y-2 py-1">
                                                                {item.receitas.receita_ingredientes.map((ri: any) => {
                                                                    if (!ri.alimentos) return null;
                                                                    const ingrRatio = (ri.quantidade_g * item.quantidade_g) / ri.alimentos.porcao_base_g;
                                                                    const scaledAmount = Math.round(ri.quantidade_g * item.quantidade_g);
                                                                    const ingrKcal = Math.round(ri.alimentos.kcal * ingrRatio);
                                                                    const ingrC = Math.round(ri.alimentos.carbo * ingrRatio);
                                                                    const ingrP = Math.round(ri.alimentos.prot * ingrRatio);
                                                                    const ingrG = Math.round(ri.alimentos.gord * ingrRatio);

                                                                    return (
                                                                        <div key={ri.id} className="flex flex-col justify-center">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[11px] text-gray-600 font-medium flex items-center gap-1.5 line-clamp-1"><span className="w-1 h-1 rounded-full bg-emerald-300 flex-shrink-0"></span> {ri.alimentos.nome}</span>
                                                                                <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap ml-2">{scaledAmount}g • {ingrKcal} kcal</span>
                                                                            </div>
                                                                            <span className="text-[9.5px] text-gray-400 mt-0.5 pl-2.5">C:{ingrC}g P:{ingrP}g G:{ingrG}g</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}


                                                    </div>
                                                );
                                            }
                                            return null;
                                        })
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedMealId(meal.id);
                                        setIsAddModalOpen(true);
                                    }}
                                    className="flex items-center justify-center gap-2 text-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold py-3 rounded-xl transition-colors"
                                >
                                    <Plus size={16} /> Adicionar Item
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <AddFoodModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setSelectedMealId(null);
                }}
                refeicaoId={selectedMealId}
            />

            <EditItemModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedItemToEdit(null);
                }}
                item={selectedItemToEdit}
            />
        </div>
    );
}
