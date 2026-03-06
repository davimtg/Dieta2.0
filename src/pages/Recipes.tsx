import { useState } from 'react';
import { useDietData } from '../hooks/useDietData';
import CreateRecipeModal from '../components/CreateRecipeModal';
import RecipeDetailsModal from '../components/RecipeDetailsModal';
import { Plus, BookOpen, Clock, Image as ImageIcon, Search, Edit2 } from 'lucide-react';

export default function Recipes() {
    const { receitas, isLoading } = useDietData();
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Novas variáveis de estado para a modal de detalhes
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const handleOpenDetails = (receita: any) => {
        setSelectedRecipe(receita);
        setIsDetailsModalOpen(true);
    };

    const filteredReceitas = receitas.filter((r: any) =>
        r.nome.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mb-6 mt-4">
                <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-emerald-500 text-white p-2 flex items-center gap-2 rounded-xl shadow-md hover:bg-emerald-600 transition px-4"
                >
                    <Plus size={20} /> <span className="font-bold text-sm">Nova Receita</span>
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar receitas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white shadow-sm border-transparent rounded-2xl py-4 pl-12 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            {isLoading ? (
                <p className="text-center text-gray-500 mt-10">Carregando...</p>
            ) : filteredReceitas.length === 0 ? (
                <div className="bg-white rounded-[32px] p-8 text-center shadow-sm border border-gray-100 flex flex-col items-center mt-12">
                    <div className="bg-emerald-50 p-4 rounded-full mb-4 text-emerald-500">
                        <BookOpen size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Sua lista está vazia</h3>
                    <p className="text-sm text-gray-500 mb-6">Crie suas próprias receitas para facilitar o registro das suas refeições.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-emerald-500 font-bold bg-emerald-50 px-6 py-3 rounded-xl hover:bg-emerald-100 transition"
                    >
                        Criar Primeira Receita
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReceitas.map((receita: any) => {
                        let totalKcal = 0;
                        let totalCarbo = 0;
                        let totalProt = 0;
                        let totalGord = 0;

                        receita.receita_ingredientes?.forEach((ri: any) => {
                            if (ri.alimentos) {
                                const ratio = ri.quantidade_g / ri.alimentos.porcao_base_g;
                                totalKcal += ri.alimentos.kcal * ratio;
                                totalCarbo += ri.alimentos.carbo * ratio;
                                totalProt += ri.alimentos.prot * ratio;
                                totalGord += ri.alimentos.gord * ratio;
                            }
                        });

                        const portionKcal = Math.round(totalKcal / receita.rendimento_porcoes);

                        return (
                            <button
                                key={receita.id}
                                onClick={() => handleOpenDetails(receita)}
                                className="relative w-full text-left bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:border-emerald-200 transition-colors group block"
                            >
                                {/* Quick Edit Hover Button */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <div className="bg-white/90 backdrop-blur p-2 rounded-full shadow-sm text-emerald-600 hover:bg-white transition-colors" aria-label="Acessar Detalhes para Editar">
                                        <Edit2 size={18} />
                                    </div>
                                </div>

                                {receita.imagem_url ? (
                                    <div className="h-32 w-full bg-gray-200 relative">
                                        <img src={receita.imagem_url} alt={receita.nome} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-20 w-full bg-gray-50 flex items-center justify-center text-gray-300">
                                        <ImageIcon size={32} />
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-800 leading-tight">{receita.nome}</h3>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <span className="text-xl font-bold text-emerald-600 block">{portionKcal}</span>
                                            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Kcal / porção</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 text-xs font-medium text-gray-500 mb-4 bg-gray-50 p-2.5 rounded-xl w-fit">
                                        <span className="flex items-center gap-1.5"><Clock size={14} /> {receita.tempo_preparo_min || '--'} min</span>
                                        <span className="text-gray-300">|</span>
                                        <span>Rende {receita.rendimento_porcoes} {receita.rendimento_porcoes === 1 ? 'porção' : 'porções'}</span>
                                    </div>

                                    <div className="flex gap-4 text-[11px] font-semibold">
                                        <span className="text-blue-500 flex flex-col"><span>Carb</span> <span className="text-sm">{Math.round(totalCarbo / receita.rendimento_porcoes)}g</span></span>
                                        <span className="text-emerald-500 flex flex-col"><span>Prot</span> <span className="text-sm">{Math.round(totalProt / receita.rendimento_porcoes)}g</span></span>
                                        <span className="text-amber-500 flex flex-col"><span>Gord</span> <span className="text-sm">{Math.round(totalGord / receita.rendimento_porcoes)}g</span></span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <CreateRecipeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <RecipeDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                receita={selectedRecipe}
            />
        </div>
    );
}
