import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import CreateFoodModal from './CreateFoodModal';
import CreateRecipeModal from './CreateRecipeModal';

interface AddFoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    refeicaoId: string | null;
}

export default function AddFoodModal({ isOpen, onClose, refeicaoId }: AddFoodModalProps) {
    const { alimentos, receitas, addItem } = useDietData();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemType, setItemType] = useState<'alimento' | 'receita'>('alimento');
    const [quantidade, setQuantidade] = useState<string>('100');
    const [loading, setLoading] = useState(false);

    // Modal states para criação in-flow
    const [isCreateFoodModalOpen, setIsCreateFoodModalOpen] = useState(false);
    const [isCreateRecipeModalOpen, setIsCreateRecipeModalOpen] = useState(false);

    // Combina e filtra alimentos e receitas
    const filteredItems = [
        ...alimentos.map((a: any) => ({ ...a, type: 'alimento' })),
        ...receitas.map((r: any) => ({ ...r, type: 'receita' }))
    ].filter((item: any) =>
        item.nome.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async () => {
        if (!selectedItem || !refeicaoId) return;
        setLoading(true);
        try {
            await addItem({
                refeicaoId,
                alimentoId: itemType === 'alimento' ? selectedItem.id : null,
                receitaId: itemType === 'receita' ? selectedItem.id : null,
                quantidade: Number(quantidade)
            });
            onClose();
            setSelectedItem(null);
            setSearch('');
            setQuantidade('100');
        } catch (e) {
            console.error(e);
            alert('Erro ao adicionar item');
        } finally {
            setLoading(false);
        }
    };

    const handleFoodCreated = (novoAlimento: any) => {
        setSelectedItem(novoAlimento);
        setItemType('alimento');
        setQuantidade(novoAlimento.porcao_base_g.toString());
        setSearch('');
    };

    // Helpers de cálculo para receitas aninhadas
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
                const portions = ri.quantidade_g; // Receitas são quantificadas em porções
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

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 h-[80vh] flex flex-col focus:outline-none">

                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-800">
                            {selectedItem ? 'Detalhes da Porção' : 'Adicionar Item'}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {!selectedItem ? (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar alimento ou receita..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {filteredItems.map((item: any) => {
                                    const isReceita = item.type === 'receita';
                                    const macros = isReceita ? getReceitaMacros(item) : item;

                                    return (
                                        <button
                                            key={`${item.type}-${item.id}`}
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setItemType(item.type);
                                                setQuantidade(isReceita ? '1' : item.porcao_base_g.toString());
                                            }}
                                            className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors text-left"
                                        >
                                            <div>
                                                <h4 className="font-semibold text-gray-800">{item.nome}</h4>
                                                <p className="text-xs text-gray-500">
                                                    {isReceita ? 'Receita • 1 Porção' : `${item.marca || 'Genérico'} • ${item.porcao_base_g}g`}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                {isReceita && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded ml-2 mb-1">Receita</span>}
                                                <span className="text-sm font-bold text-emerald-600">{Math.round(macros.kcal)} kcal</span>
                                            </div>
                                        </button>
                                    );
                                })}
                                {filteredItems.length === 0 && search.length > 0 && (
                                    <div className="text-center py-6 px-4">
                                        <p className="text-gray-500 text-sm mb-4">Nenhum item encontrado.</p>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => setIsCreateFoodModalOpen(true)}
                                                className="w-full text-center text-sm text-emerald-600 hover:bg-emerald-50 py-3 rounded-xl font-medium transition-colors border border-transparent hover:border-emerald-100"
                                            >
                                                + Cadastrar Alimento
                                            </button>
                                            <button
                                                onClick={() => setIsCreateRecipeModalOpen(true)}
                                                className="w-full text-center text-sm text-emerald-600 hover:bg-emerald-50 py-3 rounded-xl font-medium transition-colors border border-transparent hover:border-emerald-100"
                                            >
                                                + Criar Receita
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {filteredItems.length === 0 && search.length === 0 && (
                                    <p className="text-center text-gray-400 py-8 text-sm">Digite para pesquisar...</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {(() => {
                                const isReceita = itemType === 'receita';
                                const macros = isReceita ? getReceitaMacros(selectedItem) : selectedItem;
                                const multiplier = isReceita ? Number(quantidade) : (Number(quantidade) / selectedItem.porcao_base_g);

                                return (
                                    <>
                                        <div className="p-4 bg-emerald-50 rounded-2xl mb-6">
                                            <h3 className="font-bold text-lg text-emerald-950">{selectedItem.nome}</h3>
                                            <p className="text-sm text-emerald-700 mb-4">{isReceita ? 'Receita Pessoal' : selectedItem.marca || 'Genérico'}</p>

                                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                <div className="bg-white p-2 rounded-xl text-blue-600"><span className="block font-bold">{(macros.carbo * multiplier).toFixed(1)}g</span> Carbo</div>
                                                <div className="bg-white p-2 rounded-xl text-emerald-600"><span className="block font-bold">{(macros.prot * multiplier).toFixed(1)}g</span> Prot</div>
                                                <div className="bg-white p-2 rounded-xl text-amber-500"><span className="block font-bold">{(macros.gord * multiplier).toFixed(1)}g</span> Gord</div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantidade ({isReceita ? 'Porções' : 'Gramas'})</label>
                                            <input
                                                type="number"
                                                value={quantidade}
                                                onChange={(e) => setQuantidade(e.target.value)}
                                                className="w-full text-center text-3xl font-bold bg-gray-50 border border-gray-100 rounded-2xl py-4 text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div className="mt-auto space-y-3">
                                            <button
                                                onClick={handleAdd}
                                                disabled={loading || !quantidade || Number(quantidade) <= 0}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50"
                                            >
                                                {loading ? 'Adicionando...' : `Adicionar ${Math.round(macros.kcal * multiplier)} kcal`}
                                            </button>
                                            <button
                                                onClick={() => setSelectedItem(null)}
                                                className="w-full text-gray-500 font-semibold py-3"
                                            >
                                                Voltar
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>

            {/* Stacked Modals para criação in-flow */}
            <CreateFoodModal
                isOpen={isCreateFoodModalOpen}
                onClose={() => setIsCreateFoodModalOpen(false)}
                initialSearchName={search}
                onSuccess={handleFoodCreated}
            />

            <CreateRecipeModal
                isOpen={isCreateRecipeModalOpen}
                onClose={() => {
                    setIsCreateRecipeModalOpen(false);
                    // Como CreateRecipeModal não tem onSuccess callback nativo ainda,
                    // ele cria via store e teremos que fechar o painel e re-buscar
                    // Para ficar simples, apenas limparemos a pesquisa ao criar receita
                    setSearch('');
                }}
            />
        </Dialog.Root>
    );
}
