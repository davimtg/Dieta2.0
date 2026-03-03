import { useState } from 'react';
import { useDietData } from '../hooks/useDietData';
import CreateFoodModal from '../components/CreateFoodModal';
import FoodDetailsModal from '../components/FoodDetailsModal';
import { Search, Plus, ImageIcon } from 'lucide-react';

export default function Ingredients() {
    const { alimentos, isLoading } = useDietData();
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Novas variáveis de estado para a modal de detalhes
    const [selectedFood, setSelectedFood] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const filteredAlimentos = alimentos.filter((a: any) =>
        a.nome.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenDetails = (alimento: any) => {
        setSelectedFood(alimento);
        setIsDetailsModalOpen(true);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mb-6 mt-4">
                <h1 className="text-2xl font-bold text-gray-900">Alimentos</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-emerald-500 text-white p-2 rounded-xl shadow-md hover:bg-emerald-600 transition"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar alimentos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white shadow-sm border-transparent rounded-2xl py-4 pl-12 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            {isLoading ? (
                <p className="text-center text-gray-500 mt-10">Carregando...</p>
            ) : (
                <div className="space-y-3">
                    {filteredAlimentos.map((alimento: any) => (
                        <button
                            key={alimento.id}
                            onClick={() => handleOpenDetails(alimento)}
                            className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-emerald-200 transition-colors gap-4"
                        >
                            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                {alimento.imagem_url ? (
                                    <img src={alimento.imagem_url} alt={alimento.nome} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 shadow-sm" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100 text-gray-400">
                                        <ImageIcon size={24} />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h4 className="font-semibold text-gray-800 flex items-center gap-2 truncate">
                                        {alimento.nome}
                                        {alimento.is_verified && <span className="flex-shrink-0 text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Verificado</span>}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{alimento.marca || 'Genérico'} • {alimento.porcao_base_g}g</p>
                                    <div className="flex gap-3 mt-1.5 text-[10px] font-semibold">
                                        <span className="text-blue-500">C: {alimento.carbo}g</span>
                                        <span className="text-emerald-500">P: {alimento.prot}g</span>
                                        <span className="text-amber-500">G: {alimento.gord}g</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-gray-800 block">{alimento.kcal}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Kcal</span>
                            </div>
                        </button>
                    ))}
                    {filteredAlimentos.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-500 mb-4">Nenhum alimento encontrado.</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-emerald-500 font-bold hover:underline"
                            >
                                + Cadastrar Novo
                            </button>
                        </div>
                    )}
                </div>
            )}

            <CreateFoodModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <FoodDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                alimento={selectedFood}
            />
        </div>
    );
}
