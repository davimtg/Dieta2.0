import { useState } from 'react';
import { useDietData } from '../hooks/useDietData';
import { useGlobalDate } from '../contexts/DateContext';
import AddFoodModal from '../components/AddFoodModal';
import EditItemModal from '../components/EditItemModal';
import { Plus, ChevronLeft, ChevronRight, Calendar, Edit2, Trash2, Check, ArrowLeftRight, MoreHorizontal } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ClearDiaryModal from '../components/ClearDiaryModal';
import toast from 'react-hot-toast';

// Componente Wrapper para cada Refeição (Dnd-Kit)
function SortableMealCard({ meal, children, onDelete }: { meal: any, children: React.ReactNode, onDelete: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: meal.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto', position: 'relative' as const };

    // Nomes em PT-BR
    const mealNames: Record<string, string> = { cafe: 'Café da Manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar' };
    const mealName = meal.nome_refeicao || mealNames[meal.tipo_refeicao] || meal.tipo_refeicao;
    let mealKcal = 0;
    meal.itens_consumidos?.forEach((item: any) => {
        if (item.is_sugestao) return;
        if (item.alimentos) mealKcal += item.alimentos.kcal * (item.quantidade_g / item.alimentos.porcao_base_g);
        if (item.receitas) {
            const rendimento = parseFloat(item.receitas.rendimento_quantidade) || item.receitas.rendimento_porcoes || 1;
            let totalK = 0;
            item.receitas.receita_ingredientes?.forEach((ri: any) => {
                if (ri.alimentos) {
                    const ratio = ri.quantidade_g / ri.alimentos.porcao_base_g;
                    totalK += ri.alimentos.kcal * ratio;
                } else if (ri.receitas) {
                    // simplificado pro header
                    totalK += 0;
                }
            });
            mealKcal += (totalK / rendimento) * item.quantidade_g;
        }
    });

    return (
        <div ref={setNodeRef} style={style} className={`bg-white p-5 rounded-3xl shadow-sm border ${isDragging ? 'border-emerald-400 shadow-md opacity-90' : 'border-emerald-50/50'} flex flex-col gap-4`}>
            {/* Header da Refeição com Drag Handle e Delete */}
            <div className="flex justify-between items-center group/header">
                <div className="flex items-center gap-2">
                    <button {...attributes} {...listeners} className="text-gray-400 hover:text-emerald-500 cursor-grab active:cursor-grabbing p-1" title="Reordenar refeição">
                        <MoreHorizontal size={20} className="rotate-90" />
                    </button>
                    <h3 className="font-bold text-gray-800">{mealName}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{Math.round(mealKcal)} kcal</span>
                    <button onClick={() => { if (confirm(`Deseja remover a refeição ${mealName}?`)) onDelete(meal.id) }} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover/header:opacity-100 focus:opacity-100" title="Apagar refeição">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            {/* Corpo (Itens Consumidos) */}
            {children}
        </div>
    );
}

export default function Dashboard() {
    const { selectedDate, setSelectedDate } = useGlobalDate();
    const {
        refeicoes,
        perfil,
        isLoading,
        deleteItem,
        updateItemSugestao,
        swapSugestao,
        metasSugeridasPendentes,
        aceitarMetaSugerida,
        recusarMetaSugerida,
        isRespondendoMetaSugerida,
        clearDiary,
        deleteRefeicaoDiaria,
        reorderRefeicoesDiarias
    } = useDietData(selectedDate);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemToEdit, setSelectedItemToEdit] = useState<any | null>(null);

    // Clear diary state
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [showClearMenu, setShowClearMenu] = useState(false);

    // Swap sugestão state
    const [swapTarget, setSwapTarget] = useState<any | null>(null);

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
        const rendimento = parseFloat(receita.rendimento_quantidade) || receita.rendimento_porcoes || 1;

        return {
            carbo: totalC / rendimento,
            prot: totalP / rendimento,
            gord: totalG / rendimento,
            kcal: totalK / rendimento
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

    // Metas de Macros (do perfil, ou fallback default baseado nas kcals)
    const goalCarbs = perfil?.meta_carbo_g ? Number(perfil.meta_carbo_g) : Math.round((goalKcal * 0.45) / 4);
    const goalProt = perfil?.meta_prot_g ? Number(perfil.meta_prot_g) : Math.round((goalKcal * 0.3) / 4);
    const goalFat = perfil?.meta_gord_g ? Number(perfil.meta_gord_g) : Math.round((goalKcal * 0.25) / 9);

    const remainingKcal = Math.max(0, goalKcal - Math.round(totalKcal));
    const circlePercentage = Math.min(100, (Math.round(totalKcal) / goalKcal) * 100);
    const circleDasharray = 351.85; // 2 * pi * r (r=56)
    const circleDashoffset = circleDasharray - (circleDasharray * circlePercentage) / 100;

    const sortedMeals = [...refeicoes].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeA - timeB;
    });

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sortedMeals.findIndex(m => m.id === active.id);
            const newIndex = sortedMeals.findIndex(m => m.id === over.id);
            const newOrder = arrayMove(sortedMeals, oldIndex, newIndex);

            // UI optimistic update - a Query do useDietData refará após a api voltar.
            // Para isso chamamos a api silenciosamente
            toast.promise(reorderRefeicoesDiarias(newOrder), {
                loading: 'Salvando ordem...',
                success: 'Ordem alterada',
                error: 'Erro ao reordenar'
            });
        }
    };

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
                {/* Botão de ações do diário */}
                <div className="relative">
                    <button
                        onClick={() => setShowClearMenu(v => !v)}
                        className="p-2 rounded-full hover:bg-emerald-600 transition text-white/80 hover:text-white"
                        title="Ações do diário"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    {showClearMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowClearMenu(false)} />
                            <div className="absolute right-0 top-9 z-40 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[180px]">
                                <button
                                    onClick={() => { setShowClearMenu(false); setIsClearModalOpen(true); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 transition"
                                >
                                    <Trash2 size={15} /> Limpar registros...
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {metasSugeridasPendentes && metasSugeridasPendentes.length > 0 && (
                <div className="px-6 mb-6">
                    <div className="bg-emerald-600/50 backdrop-blur-sm border border-emerald-400 rounded-3xl p-4 flex flex-col gap-3 relative shadow-inner">
                        <div className="flex items-start gap-3">
                            <div className="bg-emerald-50 text-emerald-600 rounded-full p-2 shrink-0">
                                <Check size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Seu nutricionista sugeriu novas metas!</h3>
                                <p className="text-emerald-100 text-xs mt-1">
                                    {metasSugeridasPendentes[0].meta_kcal} kcal • Carb: {metasSugeridasPendentes[0].carbo_g}g • Prot: {metasSugeridasPendentes[0].prot_g}g • Gord: {metasSugeridasPendentes[0].gord_g}g
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={() => recusarMetaSugerida(metasSugeridasPendentes[0].id)}
                                disabled={isRespondendoMetaSugerida}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition disabled:opacity-50"
                            >
                                Recusar
                            </button>
                            <button
                                onClick={() => aceitarMetaSugerida(metasSugeridasPendentes[0].id)}
                                disabled={isRespondendoMetaSugerida}
                                className="flex-1 bg-white text-emerald-600 hover:bg-emerald-50 text-xs font-bold py-2 rounded-xl transition disabled:opacity-50 shadow-sm"
                            >
                                Aceitar Metas
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                {/* Meals List - Drag and Drop Enabled */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4 text-emerald-950 px-2 mt-8">
                            <h2 className="text-lg font-bold">Hoje</h2>
                        </div>

                        <SortableContext items={sortedMeals.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
                            {sortedMeals.map((meal: any) => {
                                return (
                                    <SortableMealCard key={meal.id} meal={meal} onDelete={deleteRefeicaoDiaria}>
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
                                                                <div className="flex items-start gap-3 w-full">
                                                                    {item.is_sugestao && (
                                                                        <button
                                                                            onClick={() => updateItemSugestao({ itemId: item.id, isSugestao: false })}
                                                                            className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 group/check transition-colors"
                                                                            title="Marcar como consumido"
                                                                        >
                                                                            <Check size={12} strokeWidth={4} className="text-white opacity-0 group-hover/check:opacity-100 transition-opacity" />
                                                                        </button>
                                                                    )}
                                                                    <div className="flex-1 w-full relative min-w-0">
                                                                        <div className="flex justify-between items-start mb-1 pr-6 gap-2">
                                                                            <span className="text-sm font-semibold text-gray-700 leading-tight break-words">{item.alimentos.nome}</span>
                                                                            <span className="text-xs font-bold text-gray-900 shrink-0">{itemKcal} kcal</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center pr-6">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs text-gray-700 font-medium">{item.quantidade_g}g</span>
                                                                                <span className="text-[10.5px] text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                                                    C: <span className="font-medium text-gray-600">{itemC}g</span> •
                                                                                    P: <span className="font-medium text-gray-600">{itemP}g</span> •
                                                                                    G: <span className="font-medium text-gray-600">{itemG}g</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute inset-y-0 right-0 top-1 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => { setSelectedItemToEdit(item); setIsEditModalOpen(true); }}
                                                                                className="p-1 text-emerald-500 hover:bg-emerald-100 rounded-lg transition-colors"
                                                                                title="Editar quantidade"
                                                                            >
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => deleteItem(item.id)}
                                                                                className="p-1 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                                                                                title="Remover item"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Troca de Sugestão (alimento) */}
                                                                {item.is_sugestao && item.substituicoes?.length > 0 && (
                                                                    <button
                                                                        onClick={() => setSwapTarget(item)}
                                                                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                                                    >
                                                                        <ArrowLeftRight size={11} /> Trocar item
                                                                    </button>
                                                                )}
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
                                                                <div className="flex items-start gap-3 w-full">
                                                                    {item.is_sugestao && (
                                                                        <button
                                                                            onClick={() => updateItemSugestao({ itemId: item.id, isSugestao: false })}
                                                                            className="mt-1 shrink-0 w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 group/check transition-colors"
                                                                            title="Marcar como consumido"
                                                                        >
                                                                            <Check size={12} strokeWidth={4} className="text-white opacity-0 group-hover/check:opacity-100 transition-opacity" />
                                                                        </button>
                                                                    )}
                                                                    <div className="flex-1 w-full relative min-w-0">
                                                                        <div className="flex justify-between items-start mb-1 gap-2 pr-6">
                                                                            <span className="text-sm font-bold text-gray-800 leading-tight pt-0.5 break-words">{item.receitas.nome}</span>
                                                                            <span className="text-xs font-bold text-emerald-700 shrink-0 pt-0.5">{itemKcal} kcal</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center mb-2 pr-6">
                                                                            <div className="flex flex-col items-start gap-1">
                                                                                <span className="text-xs font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                                                                                    {item.quantidade_g} {(item.receitas.tipo_rendimento === 'peso_volume' ? item.receitas.rendimento_unidade || 'g' : (item.quantidade_g === 1 ? 'porção' : 'porções'))}
                                                                                </span>
                                                                                <span className="text-[10.5px] text-emerald-600/80 mt-0.5 whitespace-nowrap pl-0.5 overflow-hidden text-ellipsis">
                                                                                    C: <span className="font-medium text-emerald-700/80">{recC}g</span> •
                                                                                    P: <span className="font-medium text-emerald-700/80">{recP}g</span> •
                                                                                    G: <span className="font-medium text-emerald-700/80">{recG}g</span>
                                                                                </span>
                                                                                <div className="absolute inset-y-0 right-0 top-0 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button
                                                                                        onClick={() => { setSelectedItemToEdit(item); setIsEditModalOpen(true); }}
                                                                                        className="p-1 text-emerald-600 hover:bg-emerald-200/50 rounded-lg transition-colors"
                                                                                        title="Editar porções"
                                                                                    >
                                                                                        <Edit2 size={16} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => deleteItem(item.id)}
                                                                                        className="p-1 text-red-400 hover:bg-red-200/50 hover:text-red-600 rounded-lg transition-colors"
                                                                                        title="Remover receita"
                                                                                    >
                                                                                        <Trash2 size={16} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Nested Ingredients */}
                                                                        {item.receitas.receita_ingredientes?.length > 0 && (
                                                                            <div className="mt-1 pl-3 border-l-2 border-emerald-100 space-y-2 py-1 pr-6">
                                                                                {item.receitas.receita_ingredientes.map((ri: any) => {
                                                                                    if (!ri.alimentos) return null;

                                                                                    const rendimento = parseFloat(item.receitas.rendimento_quantidade) || item.receitas.rendimento_porcoes || 1;
                                                                                    const proportionConsumed = item.quantidade_g / rendimento;

                                                                                    const scaledAmount = Math.round(ri.quantidade_g * proportionConsumed);
                                                                                    const ingrRatio = scaledAmount / ri.alimentos.porcao_base_g;

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
                                                                </div>

                                                                {/* Troca de Sugestão (receita) */}
                                                                {item.is_sugestao && item.substituicoes?.length > 0 && (
                                                                    <button
                                                                        onClick={() => setSwapTarget(item)}
                                                                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                                                    >
                                                                        <ArrowLeftRight size={11} /> Trocar item
                                                                    </button>
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
                                    </SortableMealCard>
                                );
                            })}
                        </SortableContext>
                    </div>
                </DndContext>
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

            {/* Bottom Sheet: Trocar Sugestão */}
            {swapTarget && (
                <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSwapTarget(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-t-[32px] w-full max-w-md p-6 z-10 animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                        <h3 className="font-bold text-gray-800 text-base mb-1">Trocar por:</h3>
                        <p className="text-xs text-gray-500 mb-4">Selecione uma das opções do plano do seu nutricionista</p>
                        <div className="space-y-2">
                            {(swapTarget.substituicoes ?? []).map((sub: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={async () => {
                                        await swapSugestao({
                                            itemId: swapTarget.id,
                                            alimentoId: sub.alimento_id,
                                            receitaId: sub.receita_id,
                                            quantidade: sub.quantidade_g
                                        });
                                        setSwapTarget(null);
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors text-left"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{sub.nome}</p>
                                        <p className="text-xs text-gray-400">{sub.quantidade_g}{sub.receita_id ? ' porções' : 'g'}</p>
                                    </div>
                                    <ArrowLeftRight size={16} className="text-emerald-500 shrink-0" />
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setSwapTarget(null)} className="mt-4 w-full py-3 text-center text-sm font-semibold text-gray-500 hover:text-gray-700">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Limpeza do Diário */}
            <ClearDiaryModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                selectedDate={selectedDate}
                onConfirm={async (scope, dateA, dateB) => {
                    try {
                        await clearDiary({ scope, dateA, dateB });
                        toast.success('Registros apagados com sucesso!');
                    } catch (e: any) {
                        toast.error(`Erro ao apagar: ${e.message}`);
                    }
                }}
            />
        </div >
    );
}
