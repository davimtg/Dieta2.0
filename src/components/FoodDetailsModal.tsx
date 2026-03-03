import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Edit2, Trash2, Camera } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';

const foodSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    marca: z.string().optional(),
    porcao_base_g: z.number().min(1, 'Porção deve ser maior que 0'),
    kcal: z.number().min(0, 'Não pode ser negativo'),
    carbo: z.number().min(0, 'Não pode ser negativo'),
    prot: z.number().min(0, 'Não pode ser negativo'),
    gord: z.number().min(0, 'Não pode ser negativo'),
    imagem_url: z.string().optional()
});

type FoodFormInputs = z.infer<typeof foodSchema>;

interface FoodDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    alimento: any | null;
}

export default function FoodDetailsModal({ isOpen, onClose, alimento }: FoodDetailsModalProps) {
    const { session } = useAuth();
    const { updateAlimento, deleteAlimento } = useDietData();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // States for image upload
    const [isUploading, setIsUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);

    const isOwner = session?.user?.id === alimento?.user_id;

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FoodFormInputs>({
        resolver: zodResolver(foodSchema)
    });

    const currentImageUrl = watch('imagem_url');

    // Reset form when alimento changes
    useEffect(() => {
        if (alimento) {
            reset({
                nome: alimento.nome,
                marca: alimento.marca || '',
                porcao_base_g: alimento.porcao_base_g,
                kcal: alimento.kcal,
                carbo: alimento.carbo,
                prot: alimento.prot,
                gord: alimento.gord,
                imagem_url: alimento.imagem_url || ''
            });
        }
    }, [alimento, reset]);

    if (!alimento) return null;

    const handleClose = () => {
        setIsEditing(false);
        setShowUrlInput(false);
        onClose();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `alimentos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            setValue('imagem_url', publicUrl, { shouldDirty: true });
        } catch (err) {
            console.error('Erro no upload de imagem:', err);
            alert('Erro ao enviar imagem. Verifique sua conexão ou tente novamente.');
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (data: FoodFormInputs) => {
        setLoading(true);
        try {
            await updateAlimento({
                id: alimento.id,
                ...data
            });
            setIsEditing(false);
            // Optional: alert('Alimento atualizado sucesso');
        } catch (e) {
            console.error(e);
            alert('Erro ao atualizar alimento');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Certeza que deseja deletar este alimento permanentemente?")) {
            try {
                await deleteAlimento(alimento.id);
                handleClose();
            } catch (e) {
                alert("Erro ao deletar.");
            }
        }
    };

    // Calcula percentuais para o Donut Chart Visual
    const totalMacros = Number(alimento.carbo) + Number(alimento.prot) + Number(alimento.gord) || 1;
    const pCarbo = Math.round((Number(alimento.carbo) / totalMacros) * 100);
    const pProt = Math.round((Number(alimento.prot) / totalMacros) * 100);
    const pGord = Math.round((Number(alimento.gord) / totalMacros) * 100);

    // Dash arrays para SVG simples
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const carboDash = (pCarbo / 100) * circumference;
    const protDash = (pProt / 100) * circumference;
    const gordDash = (pGord / 100) * circumference;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto focus:outline-none">

                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-800">
                            {isEditing ? 'Editar Alimento' : 'Detalhes'}
                        </Dialog.Title>
                        <div className="flex items-center gap-2">
                            {isOwner && !isEditing && (
                                <button onClick={() => setIsEditing(true)} className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                                    <Edit2 size={18} />
                                </button>
                            )}
                            {isOwner && isEditing && (
                                <button onClick={handleDelete} className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 mr-2">
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <Dialog.Close asChild>
                                <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                    <X size={20} />
                                </button>
                            </Dialog.Close>
                        </div>
                    </div>

                    {!isEditing ? (
                        <div className="space-y-6">
                            {/* Image Banner */}
                            <div className="-mx-6 -mt-2 mb-2 aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
                                {alimento.imagem_url ? (
                                    <img src={alimento.imagem_url} alt={alimento.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-300">
                                        <Camera size={48} strokeWidth={1} />
                                        <span className="text-xs mt-2 font-medium">Sem foto</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900">{alimento.nome}</h2>
                                <p className="text-gray-500">{alimento.marca || 'Genérico'} • {alimento.porcao_base_g}g</p>
                            </div>

                            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    {/* Background */}
                                    <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="20" />

                                    {/* Carbo (Blue) */}
                                    <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray={`${carboDash} ${circumference}`} strokeLinecap="round" />

                                    {/* Prot (Emerald) - offset by Carbo*/}
                                    <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#10b981" strokeWidth="20" strokeDasharray={`${protDash} ${circumference}`} strokeDashoffset={-carboDash} strokeLinecap="round" />

                                    {/* Gord (Amber) - offset by Carbo+Prot */}
                                    <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#f59e0b" strokeWidth="20" strokeDasharray={`${gordDash} ${circumference}`} strokeDashoffset={-(carboDash + protDash)} strokeLinecap="round" />
                                </svg>
                                <div className="absolute text-center flex flex-col items-center">
                                    <span className="text-3xl font-bold text-gray-800">{alimento.kcal}</span>
                                    <span className="text-xs text-gray-500 font-semibold uppercase">Kcal</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 p-4 rounded-2xl text-center">
                                    <p className="text-[10px] font-bold text-blue-500 uppercase">Carboidratos</p>
                                    <p className="text-xl font-bold text-blue-700">{alimento.carbo}g</p>
                                    <p className="text-[10px] text-blue-500">{pCarbo}%</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Proteínas</p>
                                    <p className="text-xl font-bold text-emerald-700">{alimento.prot}g</p>
                                    <p className="text-[10px] text-emerald-500">{pProt}%</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl text-center">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase">Gorduras</p>
                                    <p className="text-xl font-bold text-amber-700">{alimento.gord}g</p>
                                    <p className="text-[10px] text-amber-500">{pGord}%</p>
                                </div>
                            </div>

                            {!isOwner && !alimento.user_id && (
                                <p className="text-center text-xs text-gray-400 mt-4">Este é um alimento global e não pode ser editado.</p>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Upload de Imagem */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto do Alimento (Opcional)</label>

                                {currentImageUrl ? (
                                    <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-2 group border border-gray-100">
                                        <img src={currentImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setValue('imagem_url', '', { shouldDirty: true })}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : showUrlInput ? (
                                    <div className="space-y-2">
                                        <input
                                            type="url"
                                            {...register('imagem_url')}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500"
                                            placeholder="Ex: https://site.com/foto.jpg"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowUrlInput(false)}
                                            className="text-xs text-center w-full text-emerald-600 font-medium hover:text-emerald-700"
                                        >
                                            Voltar para envio de arquivo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative border-2 border-dashed border-emerald-200 rounded-2xl p-6 text-center hover:bg-emerald-50 transition-colors bg-emerald-50/50">
                                            <input
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.webp"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                                title="Clique ou toque para escolher a imagem"
                                            />
                                            <div className="flex flex-col items-center gap-2 text-emerald-700 pointer-events-none">
                                                {isUploading ? (
                                                    <span className="text-sm font-medium">Enviando foto...</span>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-emerald-500 mb-1 shadow-sm">
                                                            <Camera size={24} />
                                                        </div>
                                                        <span className="text-sm font-semibold">Escolher da Galeria ou Câmera</span>
                                                        <span className="text-xs text-emerald-600/70">PNG, JPG até 5MB</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowUrlInput(true)}
                                            className="w-full text-center text-sm text-emerald-600 font-semibold py-2 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-100"
                                        >
                                            Ou colar o link público de uma imagem
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome</label>
                                <input type="text" {...register('nome')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 focus:outline-emerald-500" />
                                {errors.nome && <span className="text-red-500 text-[10px]">{errors.nome.message}</span>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Marca</label>
                                    <input type="text" {...register('marca')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 focus:outline-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Porção (g)</label>
                                    <input type="number" {...register('porcao_base_g', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 focus:outline-emerald-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Calorias (kcal)</label>
                                <input type="number" step="0.1" {...register('kcal', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 focus:outline-emerald-500" />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 mb-1">Carbo (g)</label>
                                    <input type="number" step="0.1" {...register('carbo', { valueAsNumber: true })} className="w-full text-center bg-gray-50 border border-gray-100 rounded-xl py-2 focus:outline-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-emerald-600 mb-1">Prot (g)</label>
                                    <input type="number" step="0.1" {...register('prot', { valueAsNumber: true })} className="w-full text-center bg-gray-50 border border-gray-100 rounded-xl py-2 focus:outline-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-500 mb-1">Gord (g)</label>
                                    <input type="number" step="0.1" {...register('gord', { valueAsNumber: true })} className="w-full text-center bg-gray-50 border border-gray-100 rounded-xl py-2 focus:outline-amber-500" />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading || isUploading} className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition disabled:opacity-50">
                                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    )}

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
