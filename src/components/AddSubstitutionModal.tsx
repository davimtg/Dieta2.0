import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Plus, Check } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';

interface SubstitutionItem {
    nome: string;
    quantidade_g: number;
    alimento_id?: string;
    receita_id?: string;
}

interface AddSubstitutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    planoItem: any; // item atual do plano (para exibir nome e excluir duplicatas)
    // Callback: chamado em vez de salvar no DB diretamente
    onAdd: (sub: SubstitutionItem) => void;
}

export default function AddSubstitutionModal({ isOpen, onClose, planoItem, onAdd }: AddSubstitutionModalProps) {
    const { alimentos, receitas } = useDietData();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [quantidade, setQuantidade] = useState('100');

    const existingSubIds = (planoItem?.substituicoes ?? []).map((s: any) => s.alimento_id || s.receita_id);

    const filteredItems = [
        ...alimentos.map((a: any) => ({ ...a, type: 'alimento' })),
        ...receitas.map((r: any) => ({ ...r, type: 'receita' }))
    ].filter((item: any) =>
        item.nome.toLowerCase().includes(search.toLowerCase()) &&
        item.id !== (planoItem?.alimento_id || planoItem?.receita_id) &&
        !existingSubIds.includes(item.id)
    );

    const handleSave = () => {
        if (!selectedItem) return;
        onAdd({
            nome: selectedItem.nome,
            quantidade_g: Number(quantidade),
            ...(selectedItem.type === 'alimento' ? { alimento_id: selectedItem.id } : { receita_id: selectedItem.id })
        });
        setSelectedItem(null);
        setSearch('');
        setQuantidade('100');
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 min-h-[55vh] max-h-[90vh] flex flex-col focus:outline-none">

                    <div className="flex justify-between items-center mb-5">
                        <Dialog.Title className="text-lg font-bold text-gray-800">
                            + Adicionar Substituição
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                <X size={18} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {planoItem && (
                        <p className="text-xs text-gray-500 font-medium mb-4 bg-gray-50 px-3 py-2 rounded-xl">
                            Alternativa para: <strong className="text-gray-700">{planoItem.alimentos?.nome || planoItem.receitas?.nome}</strong>
                        </p>
                    )}

                    {!selectedItem ? (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar alimento ou receita substituta..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-700 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {filteredItems.slice(0, 15).map((item: any) => (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setQuantidade(item.type === 'receita' ? '1' : (item.porcao_base_g ?? 100).toString());
                                        }}
                                        className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors text-left"
                                    >
                                        <div>
                                            <span className="font-semibold text-gray-800 text-sm block">{item.nome}</span>
                                            <span className="text-xs text-gray-400">{item.type === 'receita' ? 'Receita' : (item.marca || 'Genérico')}</span>
                                        </div>
                                        <Plus size={16} className="text-emerald-500 shrink-0" />
                                    </button>
                                ))}
                                {filteredItems.length === 0 && search && (
                                    <p className="text-center text-sm text-gray-400 py-6">Nenhum resultado para "{search}"</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <h3 className="font-bold text-gray-800 mb-1">{selectedItem.nome}</h3>
                                <p className="text-sm text-gray-500 mb-4">{selectedItem.type === 'receita' ? 'Receita' : (selectedItem.marca || 'Genérico')}</p>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {selectedItem.type === 'receita' ? 'Quantidade de Porções' : 'Quantidade (g)'}
                                </label>
                                <input
                                    type="number"
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 text-lg font-bold focus:outline-none focus:border-emerald-500 text-center"
                                    min="1"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                Confirmar Substituição
                            </button>

                            <button onClick={() => setSelectedItem(null)} className="w-full py-2 text-gray-500 font-semibold text-sm hover:text-gray-700">
                                Voltar
                            </button>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
