import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Check, Plus } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import CreateFoodModal from './CreateFoodModal';
import CreateRecipeModal from './CreateRecipeModal';

interface AddPlanoItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    diaSemana?: number;
    tipoRefeicao?: string;
    onAdd?: (item: {
        alimento_id?: string;
        receita_id?: string;
        quantidade_g: number;
        dia_semana: number;
        tipo_refeicao: string;
        alimentos?: any;
        receitas?: any;
        substituicoes: any[];
    }) => void;
}

export default function AddPlanoItemModal({
    isOpen,
    onClose,
    diaSemana = 0,
    tipoRefeicao = 'cafe',
    onAdd
}: AddPlanoItemModalProps) {
    const { alimentos, receitas } = useDietData();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemType, setItemType] = useState<'alimento' | 'receita'>('alimento');
    const [quantidade, setQuantidade] = useState<string>('100');

    // Modais de criação in-flow
    const [isCreateFoodOpen, setIsCreateFoodOpen] = useState(false);
    const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);

    const handleFoodCreated = (novoAlimento: any) => {
        setSelectedItem({ ...novoAlimento, type: 'alimento' });
        setItemType('alimento');
        setQuantidade(novoAlimento.porcao_base_g?.toString() ?? '100');
        setSearch('');
        setIsCreateFoodOpen(false);
    };

    const filteredItems = [
        ...alimentos.map((a: any) => ({ ...a, type: 'alimento' })),
        ...receitas.map((r: any) => ({ ...r, type: 'receita' }))
    ].filter((item: any) =>
        item.nome.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = () => {
        if (!selectedItem) return;
        if (onAdd) {
            onAdd({
                dia_semana: diaSemana,
                tipo_refeicao: tipoRefeicao,
                alimento_id: itemType === 'alimento' ? selectedItem.id : undefined,
                receita_id: itemType === 'receita' ? selectedItem.id : undefined,
                quantidade_g: Number(quantidade),
                alimentos: itemType === 'alimento' ? selectedItem : undefined,
                receitas: itemType === 'receita' ? selectedItem : undefined,
                substituicoes: []
            });
        }
        setSelectedItem(null);
        setSearch('');
        setQuantidade('100');
        onClose();
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
        const rendimento = parseFloat(receita.rendimento_quantidade) || receita.rendimento_porcoes || 1;
        return { carbo: totalC / rendimento, prot: totalP / rendimento, gord: totalG / rendimento, kcal: totalK / rendimento };
    };

    return (
        <>
            <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                    <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 min-h-[55vh] max-h-[90vh] flex flex-col focus:outline-none">

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
                                        placeholder="Pesquisar alimento ou receita..."
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

                                    {filteredItems.length === 0 && search && (
                                        <p className="text-center text-sm text-gray-400 py-4">Nenhum resultado para "{search}"</p>
                                    )}

                                    {/* Botões de criação in-flow */}
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <button
                                            onClick={() => setIsCreateFoodOpen(true)}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                        >
                                            <Plus size={15} />
                                            <span className="text-sm font-semibold">
                                                {search ? `Cadastrar "${search}" como alimento` : 'Cadastrar novo alimento'}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => { setIsCreateRecipeOpen(true); }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 transition-colors"
                                        >
                                            <Plus size={15} />
                                            <span className="text-sm font-semibold">
                                                {search ? `Criar receita "${search}"` : 'Criar nova receita'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-6 rounded-3xl">
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{selectedItem.nome}</h3>
                                    <p className="text-gray-500 text-sm mb-6">
                                        {itemType === 'receita' ? 'Receita' : selectedItem.marca || 'Genérico'}
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
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAdd}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Adicionar ao Plano
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

            {/* Modal de criação de alimento - com callback de seleção automática */}
            <CreateFoodModal
                isOpen={isCreateFoodOpen}
                onClose={() => setIsCreateFoodOpen(false)}
                onSuccess={handleFoodCreated}
                initialSearchName={search}
            />

            {/* Modal de criação de receita - fecha e o nutri busca a receita criada */}
            <CreateRecipeModal
                isOpen={isCreateRecipeOpen}
                onClose={() => {
                    setIsCreateRecipeOpen(false);
                    // A receita criada aparecerá automaticamente na lista via react-query invalidate
                }}
            />
        </>
    );
}
