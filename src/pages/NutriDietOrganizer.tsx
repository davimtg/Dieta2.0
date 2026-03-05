import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Flame, Trash2 } from 'lucide-react';
import { useNutriData } from '../hooks/useNutriData';
import AddPlanoItemModal from '../components/AddPlanoItemModal';

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const mealTypes = [
    { id: 'cafe', title: 'Café da Manhã', icon: '☕' },
    { id: 'almoco', title: 'Almoço', icon: '🍛' },
    { id: 'lanche', title: 'Lanche', icon: '🥪' },
    { id: 'jantar', title: 'Jantar', icon: '🍲' }
];

export default function NutriDietOrganizer() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { planos, isLoading, deletePlanoItem } = useNutriData();
    const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<string>('cafe');

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-emerald-500 font-semibold animate-pulse">Carregando plano...</p></div>;
    }

    const plano = planos.find((p: any) => p.id === id);

    if (!plano) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
                <p className="text-gray-500 mb-4">Plano alimentar não encontrado.</p>
                <button onClick={() => navigate('/nutri')} className="text-emerald-600 font-bold hover:underline">Voltar ao Portal</button>
            </div>
        );
    }

    const nextDay = () => setSelectedDay(prev => prev === 6 ? 0 : prev + 1);
    const prevDay = () => setSelectedDay(prev => prev === 0 ? 6 : prev - 1);

    const openAddModal = (mealId: string) => {
        setSelectedMealType(mealId);
        setIsAddModalOpen(true);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (confirm('Remover este item do plano?')) {
            await deletePlanoItem(itemId);
        }
    };

    // Filtra apenas os itens do dia de hoje
    const itensHoje = plano.plano_alimentar_itens?.filter((item: any) => item.dia_semana === selectedDay) || [];

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
        } else if (item.receitas) {
            const rMacros = getReceitaMacros(item.receitas);
            const portions = item.quantidade_g;
            itemMacros = {
                carbo: rMacros.carbo * portions,
                prot: rMacros.prot * portions,
                gord: rMacros.gord * portions,
                kcal: rMacros.kcal * portions
            };
        }
        return {
            carbo: acc.carbo + itemMacros.carbo,
            prot: acc.prot + itemMacros.prot,
            gord: acc.gord + itemMacros.gord,
            kcal: acc.kcal + itemMacros.kcal
        };
    }, { carbo: 0, prot: 0, gord: 0, kcal: 0 });

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-emerald-600 px-6 pt-10 pb-24 rounded-b-[40px] text-white shadow-md relative">
                <button onClick={() => navigate('/nutri')} className="absolute top-10 left-6 text-emerald-100 hover:text-white transition">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center mt-2">
                    <h1 className="text-xl font-bold truncate px-10">{plano.nome}</h1>
                    <p className="text-emerald-200 text-sm mt-0.5">Editor de Prescrição</p>
                </div>

                <div className="flex items-center justify-between mt-8">
                    <button onClick={prevDay} className="p-2 hover:bg-emerald-500 rounded-full transition"><ChevronLeft size={24} /></button>
                    <div className="text-center">
                        <span className="text-xl font-bold">{diasSemana[selectedDay]}</span>
                    </div>
                    <button onClick={nextDay} className="p-2 hover:bg-emerald-500 rounded-full transition"><ChevronRight size={24} /></button>
                </div>
            </div>

            {/* Macros Summary Overlay */}
            <div className="px-6 -mt-16 relative z-10 mb-8">
                <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-emerald-900/5 border border-gray-100 flex flex-col items-center justify-center">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" className="stroke-gray-100" strokeWidth="8" fill="none" />
                            <circle cx="50" cy="50" r="45" className="stroke-emerald-500" strokeWidth="8" fill="none" strokeDasharray="283" strokeDashoffset="0" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <Flame size={24} className="text-emerald-500 mb-1" />
                            <span className="text-3xl font-black text-gray-800 tracking-tight leading-none">{Math.round(diaMacros.kcal)}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Kcal</span>
                        </div>
                    </div>
                    <div className="flex justify-between w-full px-4 text-center">
                        <div>
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1">Carbos</p>
                            <p className="text-gray-800 font-bold">{Math.round(diaMacros.carbo)}g</p>
                            <div className="h-1.5 w-12 bg-gray-100 rounded-full mt-2 mx-auto overflow-hidden">
                                <div className="h-full bg-emerald-400 w-full rounded-full" />
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1">Proteínas</p>
                            <p className="text-gray-800 font-bold">{Math.round(diaMacros.prot)}g</p>
                            <div className="h-1.5 w-12 bg-gray-100 rounded-full mt-2 mx-auto overflow-hidden">
                                <div className="h-full bg-blue-400 w-full rounded-full" />
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1">Gorduras</p>
                            <p className="text-gray-800 font-bold">{Math.round(diaMacros.gord)}g</p>
                            <div className="h-1.5 w-12 bg-gray-100 rounded-full mt-2 mx-auto overflow-hidden">
                                <div className="h-full bg-amber-400 w-full rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meals */}
            <div className="px-6 space-y-6">
                {mealTypes.map((meal) => {
                    const mealItems = itensHoje.filter((item: any) => item.tipo_refeicao === meal.id);

                    const mealMacros = mealItems.reduce((acc: any, item: any) => {
                        let kcal = 0;
                        if (item.alimentos) {
                            kcal = item.alimentos.kcal * (item.quantidade_g / item.alimentos.porcao_base_g);
                        } else if (item.receitas) {
                            kcal = getReceitaMacros(item.receitas).kcal * item.quantidade_g;
                        }
                        return acc + kcal;
                    }, 0);

                    return (
                        <div key={meal.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-gray-100/50">
                                        {meal.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{meal.title}</h3>
                                        <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">
                                            {Math.round(mealMacros)} kcal
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openAddModal(meal.id)}
                                    className="w-10 h-10 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center transition-colors"
                                >
                                    <Plus size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {mealItems.length === 0 ? (
                                    <button
                                        onClick={() => openAddModal(meal.id)}
                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-semibold hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Adicionar item
                                    </button>
                                ) : (
                                    mealItems.map((item: any) => {
                                        const isReceita = !!item.receita_id;
                                        const baseItem = isReceita ? item.receitas : item.alimentos;
                                        let itemMacros = { carbo: 0, prot: 0, gord: 0, kcal: 0 };

                                        if (isReceita) {
                                            const rMacros = getReceitaMacros(baseItem);
                                            const portions = item.quantidade_g;
                                            itemMacros = {
                                                carbo: rMacros.carbo * portions,
                                                prot: rMacros.prot * portions,
                                                gord: rMacros.gord * portions,
                                                kcal: rMacros.kcal * portions
                                            };
                                        } else {
                                            const ratio = item.quantidade_g / baseItem.porcao_base_g;
                                            itemMacros = {
                                                carbo: baseItem.carbo * ratio,
                                                prot: baseItem.prot * ratio,
                                                gord: baseItem.gord * ratio,
                                                kcal: baseItem.kcal * ratio
                                            };
                                        }

                                        return (
                                            <div key={item.id} className="group flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition shadow-sm border border-gray-100/50 relative">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h4 className="font-bold text-gray-800 text-sm truncate">{baseItem.nome}</h4>
                                                        <span className="font-bold text-gray-800 text-sm ml-2 bg-white px-2 py-0.5 rounded-lg border border-gray-200 shadow-sm shrink-0">
                                                            {Math.round(itemMacros.kcal)}<span className="text-[10px] text-gray-400 ml-0.5 font-semibold">kcal</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs text-gray-500 font-medium truncate">
                                                            {isReceita ? `${Math.round(item.quantidade_g)} Porções` : `${Math.round(item.quantidade_g)}g`} • {isReceita ? 'Receita' : baseItem.marca || 'Genérico'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 mt-1.5 opacity-80">
                                                        <span className="text-[10px] font-bold text-gray-600 bg-gray-200/50 px-1.5 py-0.5 rounded">C: {Math.round(itemMacros.carbo)}g</span>
                                                        <span className="text-[10px] font-bold text-gray-600 bg-gray-200/50 px-1.5 py-0.5 rounded">P: {Math.round(itemMacros.prot)}g</span>
                                                        <span className="text-[10px] font-bold text-gray-600 bg-gray-200/50 px-1.5 py-0.5 rounded">G: {Math.round(itemMacros.gord)}g</span>
                                                    </div>

                                                    {/* Ingredientes de Receitan */}
                                                    {isReceita && baseItem.receita_ingredientes?.length > 0 && (
                                                        <div className="mt-2 pl-2 border-l-2 border-gray-200 space-y-1 py-1">
                                                            {baseItem.receita_ingredientes.map((ri: any) => {
                                                                const subIsReceita = !!ri.receitas;
                                                                const subBaseItem = subIsReceita ? ri.receitas : ri.alimentos;

                                                                let subMacros = { carbo: 0, prot: 0, gord: 0 };
                                                                if (subIsReceita) {
                                                                    const rMacros = getReceitaMacros(subBaseItem);
                                                                    const subPortions = ri.quantidade_g * item.quantidade_g;
                                                                    subMacros = { carbo: rMacros.carbo * subPortions, prot: rMacros.prot * subPortions, gord: rMacros.gord * subPortions };
                                                                } else {
                                                                    const subRatio = (ri.quantidade_g * item.quantidade_g) / subBaseItem.porcao_base_g;
                                                                    subMacros = { carbo: subBaseItem.carbo * subRatio, prot: subBaseItem.prot * subRatio, gord: subBaseItem.gord * subRatio };
                                                                }

                                                                return (
                                                                    <div key={ri.id} className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                                                                        <span className="truncate flex-1">- {subBaseItem.nome} {subIsReceita ? `(${Math.round(ri.quantidade_g * item.quantidade_g)} porções)` : `(${Math.round(ri.quantidade_g * item.quantidade_g)}g)`}</span>
                                                                        <span className="opacity-80 ml-2 whitespace-nowrap">C: {Math.round(subMacros.carbo)} P: {Math.round(subMacros.prot)} G: {Math.round(subMacros.gord)}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0 m-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isAddModalOpen && (
                <AddPlanoItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    planoId={plano.id}
                    diaSemana={selectedDay}
                    tipoRefeicao={selectedMealType}
                />
            )}
        </div>
    );
}
