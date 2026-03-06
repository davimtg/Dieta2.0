import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Flame, Trash2, X, Save, Send, Check } from 'lucide-react';
import { useNutriData } from '../hooks/useNutriData';
import AddPlanoItemModal from '../components/AddPlanoItemModal';
import AddSubstitutionModal from '../components/AddSubstitutionModal';

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
import { Edit2 } from 'lucide-react';

const DEFAULT_MEALS = [
    { id: 'cafe', title: 'Café da Manhã', icon: '☕' },
    { id: 'almoco', title: 'Almoço', icon: '🍛' },
    { id: 'lanche', title: 'Lanche', icon: '🥪' },
    { id: 'jantar', title: 'Jantar', icon: '🍲' }
];

// Tipo local do item do plano (com dados joined para exibição)
interface LocalItem {
    _localId: string;   // ID temporário único (não vai para o DB)
    alimento_id?: string;
    receita_id?: string;
    dia_semana: number;
    tipo_refeicao: string;
    nome_refeicao?: string;
    quantidade_g: number;
    alimentos?: any;
    receitas?: any;
    substituicoes: Array<{
        nome: string;
        quantidade_g: number;
        alimento_id?: string;
        receita_id?: string;
    }>;
}

const makeLocalId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const isPesoVolumeRecipe = (receita: any) => receita?.tipo_rendimento === 'peso_volume';

const getRecipeMultiplier = (receita: any, quantidade: number) =>
    isPesoVolumeRecipe(receita) ? quantidade / 100 : quantidade;

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
    const qtd = parseFloat(receita.rendimento_quantidade) || receita.rendimento_porcoes || 1;

    if (isPesoVolumeRecipe(receita)) {
        const ratio = 100 / qtd;
        return { carbo: totalC * ratio, prot: totalP * ratio, gord: totalG * ratio, kcal: totalK * ratio };
    }

    return { carbo: totalC / qtd, prot: totalP / qtd, gord: totalG / qtd, kcal: totalK / qtd };
};

export default function NutriDietOrganizer() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { planos, clientes, isLoading, saveDraft, isSavingDraft, updatePlanoStatus, isUpdatingStatus } = useNutriData();

    const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
    const [localItems, setLocalItems] = useState<LocalItem[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<string>('cafe');
    const [isSubsModalOpen, setIsSubsModalOpen] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState<string | null>(null);

    const [localMeals, setLocalMeals] = useState<any[]>(DEFAULT_MEALS);
    const [editingMealId, setEditingMealId] = useState<string | null>(null);
    const [editMealName, setEditMealName] = useState('');

    // Inicializar o estado local com os dados do plano ao montar
    const plano = planos.find((p: any) => p.id === id);
    const pacientePerfil = clientes.find((c: any) => c.cliente_id === plano?.cliente_id)?.usuarios_perfil as any;

    useEffect(() => {
        if (plano?.plano_alimentar_itens) {
            const initial: LocalItem[] = plano.plano_alimentar_itens.map((item: any) => ({
                _localId: makeLocalId(),
                alimento_id: item.alimento_id,
                receita_id: item.receita_id,
                dia_semana: item.dia_semana,
                tipo_refeicao: item.tipo_refeicao,
                nome_refeicao: item.nome_refeicao,
                quantidade_g: item.quantidade_g,
                alimentos: item.alimentos,
                receitas: item.receitas,
                substituicoes: item.substituicoes ?? []
            }));
            setLocalItems(initial);

            const customMealsMap = new Map();
            plano.plano_alimentar_itens.forEach((item: any) => {
                if (!DEFAULT_MEALS.find(m => m.id === item.tipo_refeicao)) {
                    if (!customMealsMap.has(item.tipo_refeicao)) {
                        customMealsMap.set(item.tipo_refeicao, {
                            id: item.tipo_refeicao,
                            title: item.nome_refeicao || 'Nova Refeição',
                            icon: '🍽️'
                        });
                    }
                }
            });
            setLocalMeals([...DEFAULT_MEALS, ...Array.from(customMealsMap.values())]);
            setIsDirty(false);
        }
    }, [plano?.id]);

    // Aviso de navegação com alterações não salvas
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const handleBack = useCallback(() => {
        if (isDirty) {
            const ok = window.confirm('Há alterações não salvas. Deseja sair sem salvar o rascunho?');
            if (!ok) return;
        }
        navigate('/nutri');
    }, [isDirty, navigate]);

    // Ações locais
    const addLocalItem = (item: Omit<LocalItem, '_localId'>) => {
        const mealObj = localMeals.find(m => m.id === item.tipo_refeicao);
        const mealName = mealObj ? mealObj.title : 'Refeição';
        setLocalItems(prev => [...prev, { ...item, nome_refeicao: mealName, _localId: makeLocalId() }]);
        setIsDirty(true);
    };

    const removeLocalItem = (localId: string) => {
        setLocalItems(prev => prev.filter(i => i._localId !== localId));
        setIsDirty(true);
    };

    const addLocalSubstituicao = (localId: string, sub: any) => {
        setLocalItems(prev => prev.map(item =>
            item._localId === localId
                ? { ...item, substituicoes: [...item.substituicoes, sub] }
                : item
        ));
        setIsDirty(true);
    };

    const removeLocalSubstituicao = (localId: string, subIdx: number) => {
        setLocalItems(prev => prev.map(item => {
            if (item._localId !== localId) return item;
            const subs = [...item.substituicoes];
            subs.splice(subIdx, 1);
            return { ...item, substituicoes: subs };
        }));
        setIsDirty(true);
    };

    const handleAddMeal = () => {
        const newMealId = `custom_${Date.now()}`;
        setLocalMeals([...localMeals, { id: newMealId, title: 'Nova Refeição', icon: '🍽️' }]);
    };

    const handleRenameMeal = (mealId: string, newName: string) => {
        if (!newName.trim()) return;
        setLocalMeals(prev => prev.map(m => m.id === mealId ? { ...m, title: newName.trim() } : m));
        setLocalItems(prev => prev.map(item => item.tipo_refeicao === mealId ? { ...item, nome_refeicao: newName.trim() } : item));
        setIsDirty(true);
    };

    // Salvar rascunho no DB
    const handleSaveDraft = async () => {
        if (!id) return;
        try {
            await saveDraft({ planoId: id, itens: localItems });
            setIsDirty(false);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar rascunho.');
        }
    };

    // Enviar ao paciente
    const handleSendToPatient = async () => {
        if (!id) return;
        const ok = window.confirm('Enviar este plano ao paciente? Ele ficará visível no app do cliente imediatamente.');
        if (!ok) return;
        try {
            await saveDraft({ planoId: id, itens: localItems });
            await updatePlanoStatus({ planoId: id, status: 'enviado' });
            setIsDirty(false);
            navigate('/nutri');
        } catch (e) {
            console.error(e);
            alert('Erro ao enviar o plano.');
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-emerald-500 font-semibold animate-pulse">Carregando plano...</p></div>;
    }

    if (!plano) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
                <p className="text-gray-500 mb-4">Plano alimentar não encontrado.</p>
                <button onClick={() => navigate('/nutri')} className="text-emerald-600 font-bold hover:underline">Voltar ao Portal</button>
            </div>
        );
    }

    const itensHoje = localItems.filter(item => item.dia_semana === selectedDay);

    const diaMacros = itensHoje.reduce((acc: any, item: any) => {
        let itemMacros = { carbo: 0, prot: 0, gord: 0, kcal: 0 };
        if (item.alimentos) {
            const ratio = item.quantidade_g / item.alimentos.porcao_base_g;
            itemMacros = {
                carbo: item.alimentos.carbo * ratio,
                prot: item.alimentos.prot * ratio,
                gord: item.alimentos.gord * ratio,
                kcal: item.alimentos.kcal * ratio
            };
        }
        if (item.receitas) {
            const rMacros = getReceitaMacros(item.receitas);
            const multiplier = getRecipeMultiplier(item.receitas, item.quantidade_g);
            itemMacros = {
                carbo: rMacros.carbo * multiplier,
                prot: rMacros.prot * multiplier,
                gord: rMacros.gord * multiplier,
                kcal: rMacros.kcal * multiplier
            };
        }
        return {
            carbo: acc.carbo + itemMacros.carbo,
            prot: acc.prot + itemMacros.prot,
            gord: acc.gord + itemMacros.gord,
            kcal: acc.kcal + itemMacros.kcal
        };
    }, { carbo: 0, prot: 0, gord: 0, kcal: 0 });

    const metasPaciente = {
        kcal: Number(pacientePerfil?.meta_kcal) || 0,
        carbo: Number(pacientePerfil?.meta_carbo_g) || 0,
        prot: Number(pacientePerfil?.meta_prot_g) || 0,
        gord: Number(pacientePerfil?.meta_gord_g) || 0
    };

    // items for the currently selected day

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <button onClick={handleBack} className="flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline">Voltar</span>
                        </button>

                        <div className="text-center">
                            <h1 className="font-bold text-gray-800 text-base leading-tight">{plano.nome}</h1>
                            <div className="flex items-center justify-center gap-2 mt-0.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plano.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {plano.status === 'enviado' ? '✅ Enviado' : '📝 Rascunho'}
                                </span>
                                {isDirty && <span className="text-xs text-orange-500 font-medium">● Não salvo</span>}
                                {savedSuccess && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check size={12} /> Salvo!</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSaveDraft}
                                disabled={isSavingDraft || isUpdatingStatus}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                <Save size={16} />
                                <span className="hidden sm:inline">{isSavingDraft ? 'Salvando...' : 'Rascunho'}</span>
                            </button>
                            <button
                                onClick={handleSendToPatient}
                                disabled={isSavingDraft || isUpdatingStatus}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition disabled:opacity-50"
                            >
                                <Send size={16} />
                                <span className="hidden sm:inline">{isUpdatingStatus ? 'Enviando...' : 'Enviar'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Navegação de dias */}
                    <div className="flex items-center justify-center gap-3 mt-3 pb-1">
                        <button onClick={() => setSelectedDay(prev => prev === 0 ? 6 : prev - 1)} className="p-1 text-gray-400 hover:text-gray-700">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex gap-1 overflow-x-auto">
                            {diasSemana.map((dia, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDay(idx)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${selectedDay === idx ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {dia.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setSelectedDay(prev => prev === 6 ? 0 : prev + 1)} className="p-1 text-gray-400 hover:text-gray-700">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                </div>
            </div>

            {/* Macros do dia / Resumo Planejado vs Meta */}
            <div className="max-w-2xl mx-auto px-4 py-3">
                <div className="bg-white rounded-3xl p-5 border border-gray-100 mb-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Flame size={16} className="text-orange-400" /> Resumo de {diasSemana[selectedDay]}
                        </h3>
                    </div>

                    <div className="flex items-center gap-5 mb-5 pb-5 border-b border-gray-50">
                        {/* Calorias Ring */}
                        <div className="relative w-[72px] h-[72px] flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="36" cy="36" r="32" fill="transparent" stroke="#f3f4f6" strokeWidth="6" />
                                <circle
                                    cx="36" cy="36" r="32"
                                    fill="transparent"
                                    stroke="#10b981"
                                    strokeWidth="6"
                                    strokeDasharray={201.06}
                                    strokeDashoffset={201.06 - (201.06 * Math.min(100, Math.round(diaMacros.kcal) / (metasPaciente.kcal || 1) * 100)) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-sm font-bold text-emerald-600 leading-none">{Math.round(diaMacros.kcal)}</span>
                                <span className="text-[9px] text-gray-400 font-medium mt-0.5">kcal</span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1.5 text-xs">
                                <span className="font-bold text-gray-700">Calorias (kcal)</span>
                                <span className="text-gray-400">Meta: <span className="font-bold text-gray-800">{metasPaciente.kcal || 0}</span></span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (Math.round(diaMacros.kcal) / (metasPaciente.kcal || 1)) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50/70 rounded-2xl p-3 text-center border border-blue-100/50">
                            <span className="block text-[10px] font-bold text-blue-500 mb-1 tracking-wide">CARBOS</span>
                            <div className="flex items-baseline justify-center gap-0.5">
                                <span className="text-lg font-black text-gray-800 leading-none">{Math.round(diaMacros.carbo)}</span>
                                <span className="text-[10px] font-bold text-gray-500">g</span>
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400 font-medium bg-white/50 py-1 rounded-lg">Meta: {metasPaciente.carbo || 0}g</div>
                        </div>

                        <div className="bg-red-50/70 rounded-2xl p-3 text-center border border-red-100/50">
                            <span className="block text-[10px] font-bold text-red-500 mb-1 tracking-wide">PROTEÍNAS</span>
                            <div className="flex items-baseline justify-center gap-0.5">
                                <span className="text-lg font-black text-gray-800 leading-none">{Math.round(diaMacros.prot)}</span>
                                <span className="text-[10px] font-bold text-gray-500">g</span>
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400 font-medium bg-white/50 py-1 rounded-lg">Meta: {metasPaciente.prot || 0}g</div>
                        </div>

                        <div className="bg-yellow-50/70 rounded-2xl p-3 text-center border border-yellow-100/50">
                            <span className="block text-[10px] font-bold text-yellow-600 mb-1 tracking-wide">GORDURAS</span>
                            <div className="flex items-baseline justify-center gap-0.5">
                                <span className="text-lg font-black text-gray-800 leading-none">{Math.round(diaMacros.gord)}</span>
                                <span className="text-[10px] font-bold text-gray-500">g</span>
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400 font-medium bg-white/50 py-1 rounded-lg">Meta: {metasPaciente.gord || 0}g</div>
                        </div>
                    </div>
                </div>

                {/* Refeições */}
                {localMeals.map(meal => {
                    const itensMeal = itensHoje.filter(item => item.tipo_refeicao === meal.id);

                    // Calculando subtotais da refeição (ignorando substituições)
                    let mealMacros = { carbo: 0, prot: 0, gord: 0, kcal: 0 };
                    itensMeal.forEach(item => {
                        if (item.alimentos) {
                            const ratio = item.quantidade_g / item.alimentos.porcao_base_g;
                            mealMacros.carbo += item.alimentos.carbo * ratio;
                            mealMacros.prot += item.alimentos.prot * ratio;
                            mealMacros.gord += item.alimentos.gord * ratio;
                            mealMacros.kcal += item.alimentos.kcal * ratio;
                        } else if (item.receitas) {
                            const rMacros = getReceitaMacros(item.receitas);
                            const multiplier = getRecipeMultiplier(item.receitas, item.quantidade_g);
                            mealMacros.carbo += rMacros.carbo * multiplier;
                            mealMacros.prot += rMacros.prot * multiplier;
                            mealMacros.gord += rMacros.gord * multiplier;
                            mealMacros.kcal += rMacros.kcal * multiplier;
                        }
                    });

                    return (
                        <div key={meal.id} className="bg-white rounded-2xl border border-gray-100 mb-3 overflow-hidden">
                            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-50 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span>{meal.icon}</span>
                                    {editingMealId === meal.id ? (
                                        <input
                                            autoFocus
                                            value={editMealName}
                                            onChange={e => setEditMealName(e.target.value)}
                                            onBlur={() => { handleRenameMeal(meal.id, editMealName); setEditingMealId(null); }}
                                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            className="bg-transparent border-b border-emerald-300 focus:outline-none focus:border-emerald-500 px-1 font-bold text-gray-700 text-sm max-w-[140px]"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-1 group">
                                            <span className="font-bold text-gray-700 text-sm">{meal.title}</span>
                                            <button
                                                onClick={() => { setEditingMealId(meal.id); setEditMealName(meal.title); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-600 transition"
                                                aria-label="Renomear refeição"
                                                title="Renomear refeição"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-400 hidden sm:inline">({itensMeal.length} {itensMeal.length === 1 ? 'item' : 'itens'})</span>

                                    {mealMacros.kcal > 0 && (
                                        <div className="ml-2 text-[11px] text-gray-500 font-medium hidden sm:flex items-center gap-1.5">
                                            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">{Math.round(mealMacros.kcal)} kcal</span>
                                            <span>|</span>
                                            <span>C: {Math.round(mealMacros.carbo)}g • P: {Math.round(mealMacros.prot)}g • G: {Math.round(mealMacros.gord)}g</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto overflow-hidden">
                                    {mealMacros.kcal > 0 && (
                                        <div className="text-[11px] text-gray-500 font-medium sm:hidden flex items-center gap-1.5 shrink-0">
                                            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{Math.round(mealMacros.kcal)} kcal</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setSelectedMealType(meal.id); setIsAddModalOpen(true); }}
                                        className="flex items-center justify-center sm:justify-start gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg w-full sm:w-auto shrink-0 transition"
                                    >
                                        <Plus size={13} /> Adicionar
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 space-y-2">
                                {itensMeal.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic text-center py-2">Vazio — clique em Adicionar</p>
                                ) : (
                                    itensMeal.map((item) => {
                                        const nome = item.alimentos?.nome || item.receitas?.nome || '?';
                                        let kcal = 0;
                                        if (item.alimentos) {
                                            kcal = Math.round(item.alimentos.kcal * (item.quantidade_g / item.alimentos.porcao_base_g));
                                        }
                                        if (item.receitas) {
                                            kcal = Math.round(getReceitaMacros(item.receitas).kcal * getRecipeMultiplier(item.receitas, item.quantidade_g));
                                        }
                                        const unidade = item.receitas
                                            ? (isPesoVolumeRecipe(item.receitas)
                                                ? ` ${item.receitas.rendimento_unidade || 'g'}`
                                                : (item.quantidade_g === 1 ? ' porção' : ' porções'))
                                            : 'g';

                                        return (
                                            <div key={item._localId} className="bg-gray-50 rounded-xl p-3">
                                                {/* Item principal */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-semibold text-gray-800 text-sm">{nome}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500">{item.quantidade_g}{unidade}</span>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {/* Badge de Calorias */}
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                                                                    {kcal} kcal
                                                                </span>

                                                                {/* Macros Detalhados */}
                                                                {(() => {
                                                                    let macros = { p: 0, c: 0, g: 0 };
                                                                    if (item.alimentos) {
                                                                        const ratio = item.quantidade_g / item.alimentos.porcao_base_g;
                                                                        macros = {
                                                                            p: item.alimentos.prot * ratio,
                                                                            c: item.alimentos.carbo * ratio,
                                                                            g: item.alimentos.gord * ratio
                                                                        };
                                                                    } else if (item.receitas) {
                                                                        const r = getReceitaMacros(item.receitas);
                                                                        const multiplier = getRecipeMultiplier(item.receitas, item.quantidade_g);
                                                                        macros = {
                                                                            p: r.prot * multiplier,
                                                                            c: r.carbo * multiplier,
                                                                            g: r.gord * multiplier
                                                                        };
                                                                    }

                                                                    return (
                                                                        <div className="flex gap-1.5">
                                                                            <span className="text-[10px] font-medium text-blue-600">
                                                                                <span className="opacity-60">C:</span> {Math.round(macros.c)}g
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-red-600">
                                                                                <span className="opacity-60">P:</span> {Math.round(macros.p)}g
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-amber-600">
                                                                                <span className="opacity-60">G:</span> {Math.round(macros.g)}g
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeLocalItem(item._localId)}
                                                        className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition shrink-0"
                                                        title="Remover item"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>

                                                {/* Lista de Substituições */}
                                                {item.substituicoes.length > 0 && (
                                                    <div className="mt-2 pl-3 border-l-2 border-emerald-100 space-y-1">
                                                        {item.substituicoes.map((sub, subIdx) => (
                                                            <div key={subIdx} className="flex items-center justify-between gap-2">
                                                                <span className="text-xs text-gray-500">
                                                                    ↳ Ou: <span className="font-medium text-gray-700">{sub.nome}</span>
                                                                    <span className="text-gray-400"> — {sub.quantidade_g}{sub.receita_id ? ' porç.' : 'g'}</span>
                                                                </span>
                                                                <button
                                                                    onClick={() => removeLocalSubstituicao(item._localId, subIdx)}
                                                                    className="p-0.5 text-red-400 hover:text-red-600 shrink-0"
                                                                    title="Remover substituição"
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Botão + Substituição */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedItemIndex(item._localId);
                                                        setIsSubsModalOpen(true);
                                                    }}
                                                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-500 hover:text-emerald-700 transition-colors"
                                                >
                                                    <Plus size={11} /> Adicionar substituição
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}

                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleAddMeal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                    >
                        <Plus size={18} /> Adicionar Nova Refeição
                    </button>
                </div>
            </div>

            {/* Floating action: Salvar Rascunho */}
            {isDirty && (
                <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                    <button
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft}
                        className="pointer-events-auto flex items-center gap-2 bg-white shadow-xl border border-emerald-200 text-emerald-700 font-bold px-6 py-3.5 rounded-full text-sm transition hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSavingDraft ? 'Salvando...' : 'Salvar Rascunho'}
                    </button>
                </div>
            )}

            {/* Modal: Adicionar item */}
            <AddPlanoItemModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                diaSemana={selectedDay}
                tipoRefeicao={selectedMealType}
                onAdd={addLocalItem}
            />

            {/* Modal: Adicionar substituição */}
            {isSubsModalOpen && selectedItemIndex !== null && (() => {
                const targetItem = localItems.find(i => i._localId === selectedItemIndex);
                if (!targetItem) return null;
                return (
                    <AddSubstitutionModal
                        isOpen={isSubsModalOpen}
                        onClose={() => { setIsSubsModalOpen(false); setSelectedItemIndex(null); }}
                        planoItem={targetItem}
                        onAdd={(sub) => addLocalSubstituicao(targetItem._localId, sub)}
                    />
                );
            })()}
        </div>
    );
}
