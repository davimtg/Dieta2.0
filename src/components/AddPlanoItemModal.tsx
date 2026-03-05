import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { useNutriData } from '../hooks/useNutriData';

interface AddPlanoItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    planoId: string;
    diaSemana: number;
    tipoRefeicao: string;
}

export default function AddPlanoItemModal({ isOpen, onClose, planoId, diaSemana, tipoRefeicao }: AddPlanoItemModalProps) {
    const { alimentos, receitas } = useDietData();
    const { addPlanoItem } = useNutriData();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemType, setItemType] = useState<'alimento' | 'receita'>('alimento');
    const [quantidade, setQuantidade] = useState<string>('100');
    const [loading, setLoading] = useState(false);

    const filteredItems = [
        ...alimentos.map((a: any) => ({ ...a, type: 'alimento' })),
        ...receitas.map((r: any) => ({ ...r, type: 'receita' }))
    ].filter((item: any) =>
        item.nome.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async () => {
        if (!selectedItem || !planoId) return;
        setLoading(true);
        try {
            await addPlanoItem({
                plano_id: planoId,
                dia_semana: diaSemana,
                tipo_refeicao: tipoRefeicao,
                alimento_id: itemType === 'alimento' ? selectedItem.id : null,
                receita_id: itemType === 'receita' ? selectedItem.id : null,
                quantidade_g: Number(quantidade)
            });
            onClose();
            setSelectedItem(null);
            setSearch('');
            setQuantidade('100');
        } catch (e) {
            console.error(e);
            alert('Erro ao adicionar item ao plano');
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 min-h-[50vh] max-h-[90vh] flex flex-col focus:outline-none">

                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-emerald-800">
                            {selectedItem ? 'Detalhes da Porção' : 'Adicionar ao Plano'}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
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
                                    placeholder="Pesquisar alimento ou receita predefinida..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
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
                                            <div className="text-right">
                                                <span className="text-emerald-500 font-bold">{Math.round(macros.kcal)} kcal</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-3xl">
                                <h3 className="text-xl font-bold text-gray-800 mb-1">{selectedItem.nome}</h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    {itemType === 'receita' ? 'Receita • 1 Porção' : selectedItem.marca || 'Genérico'}
                                </p>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {itemType === 'receita' ? 'Quantidade de Porções' : 'Quantidade (g)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={quantidade}
                                        onChange={(e) => setQuantidade(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-center"
                                        min="1"
                                        placeholder="Ex: 100"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAdd}
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Anotando...' : 'Adicionar ao Plano'}
                            </button>

                            <button
                                onClick={() => setSelectedItem(null)}
                                className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 transition"
                            >
                                Voltar
                            </button>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
