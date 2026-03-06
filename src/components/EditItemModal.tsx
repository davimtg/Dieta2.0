import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { useGlobalDate } from '../contexts/DateContext';
import toast from 'react-hot-toast';

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any | null; // The consumed item (itens_consumidos row from DB)
}

export default function EditItemModal({ isOpen, onClose, item }: EditItemModalProps) {
    const { selectedDate } = useGlobalDate();
    const { updateItem } = useDietData(selectedDate);
    const [quantidade, setQuantidade] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            setQuantidade(item.quantidade_g.toString());
        }
    }, [item]);

    if (!item) return null;

    const isRecipe = !!item.receitas;
    const itemData = isRecipe ? item.receitas : item.alimentos;
    if (!itemData) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const numQtd = Number(quantidade.replace(',', '.'));
        if (!numQtd || numQtd <= 0) {
            toast.error("A quantidade deve ser maior que zero.");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateItem({ itemId: item.id, quantidade: numQtd });
            onClose();
            toast.success("Quantidade atualizada com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar quantidade do item.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 focus:outline-none shadow-2xl">
                    <Dialog.Title className="sr-only">Editar Quantidade</Dialog.Title>

                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Editar Quantidade</h2>
                        <Dialog.Close asChild>
                            <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="mb-6 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                        <h3 className="font-bold text-emerald-900 border-b border-emerald-100 pb-2 mb-2 line-clamp-1">{itemData.nome}</h3>
                        <p className="text-sm text-emerald-700 font-medium">
                            {isRecipe ? 'Atualizando número de porções consumidas.' : 'Atualizando gramatura (peso) consumido.'}
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {isRecipe ? 'Quantidade de Porções' : 'Quantidade (gramas)'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.1"
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pt-8 px-4 text-2xl font-bold text-center text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                />
                                <span className="absolute top-3 left-0 right-0 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {isRecipe ? 'Porções' : 'Gramas (g)'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !quantidade}
                                className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Salvando...' : 'Atualizar'}
                            </button>
                        </div>
                    </form>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
