import { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { X, Download, ArrowLeftRight } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const mealTypes = [
    { id: 'cafe', title: 'Café da Manhã', icon: '☕' },
    { id: 'almoco', title: 'Almoço', icon: '🍛' },
    { id: 'lanche', title: 'Lanche', icon: '🥪' },
    { id: 'jantar', title: 'Jantar', icon: '🍲' }
];

interface PlanoPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    plano: any;
    nomeCliente?: string;
}

function getReceitaMacros(receita: any): { kcal: number; carbo: number; prot: number; gord: number } {
    let totalC = 0, totalP = 0, totalG = 0, totalK = 0;
    receita.receita_ingredientes?.forEach((ri: any) => {
        if (ri.alimentos) {
            const ratio = ri.quantidade_g / ri.alimentos.porcao_base_g;
            totalC += ri.alimentos.carbo * ratio;
            totalP += ri.alimentos.prot * ratio;
            totalG += ri.alimentos.gord * ratio;
            totalK += ri.alimentos.kcal * ratio;
        } else if (ri.receitas) {
            const sub = getReceitaMacros(ri.receitas);
            totalC += sub.carbo * ri.quantidade_g;
            totalP += sub.prot * ri.quantidade_g;
            totalG += sub.gord * ri.quantidade_g;
            totalK += sub.kcal * ri.quantidade_g;
        }
    });
    const qtd = receita.rendimento_quantidade || receita.rendimento_porcoes || 1;
    return { carbo: totalC / qtd, prot: totalP / qtd, gord: totalG / qtd, kcal: totalK / qtd };
}

function getItemMacros(item: any) {
    if (item.alimentos) {
        const ratio = item.quantidade_g / item.alimentos.porcao_base_g;
        return { kcal: item.alimentos.kcal * ratio, carbo: item.alimentos.carbo * ratio, prot: item.alimentos.prot * ratio, gord: item.alimentos.gord * ratio };
    }
    if (item.receitas) {
        const rM = getReceitaMacros(item.receitas);
        return { kcal: rM.kcal * item.quantidade_g, carbo: rM.carbo * item.quantidade_g, prot: rM.prot * item.quantidade_g, gord: rM.gord * item.quantidade_g };
    }
    return { kcal: 0, carbo: 0, prot: 0, gord: 0 };
}

// Componente da área que será impressa
function PrintableArea({ plano, nomeCliente }: { plano: any; nomeCliente?: string }) {
    return (
        <div className="p-8 bg-white font-sans">
            {/* Header do PDF */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-emerald-500">
                <div>
                    <h1 className="text-2xl font-black text-emerald-600">Nutriplanner</h1>
                    <p className="text-gray-500 text-sm">Plano Alimentar Prescrito</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-gray-800 text-lg">{plano.nome}</p>
                    {nomeCliente && <p className="text-gray-500 text-sm">Paciente: {nomeCliente}</p>}
                </div>
            </div>

            {/* Dias */}
            {diasSemana.map((dia, diaIdx) => {
                const itensDia = (plano.plano_alimentar_itens ?? []).filter((i: any) => i.dia_semana === diaIdx);
                if (itensDia.length === 0) return null;

                const diaTotal = itensDia.reduce((acc: any, item: any) => {
                    const m = getItemMacros(item);
                    return { kcal: acc.kcal + m.kcal, carbo: acc.carbo + m.carbo, prot: acc.prot + m.prot, gord: acc.gord + m.gord };
                }, { kcal: 0, carbo: 0, prot: 0, gord: 0 });

                // Extrair tipos de refeição únicos presentes neste dia (já estarão na ordem do DB)
                const sortedMeals = Array.from(new Set<string>(itensDia.map((i: any) => i.tipo_refeicao as string)));

                return (
                    <div key={diaIdx} className="mb-8 break-inside-avoid">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-black text-gray-800">{dia}</h2>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                {Math.round(diaTotal.kcal)} kcal • C:{Math.round(diaTotal.carbo)}g • P:{Math.round(diaTotal.prot)}g • G:{Math.round(diaTotal.gord)}g
                            </span>
                        </div>

                        {sortedMeals.map(mealId => {
                            const mealItems = itensDia.filter((i: any) => i.tipo_refeicao === mealId);
                            if (mealItems.length === 0) return null;

                            // Tenta pegar o nome formatado do primeiro item
                            const mealLabel = mealItems[0].nome_refeicao ||
                                mealTypes.find(m => m.id === mealId)?.title ||
                                mealId.charAt(0).toUpperCase() + mealId.slice(1).replace(/_/g, ' ');
                            const mealIcon = mealTypes.find(m => m.id === mealId)?.icon || '🥣';

                            return (
                                <div key={mealId} className="mb-4 ml-2">
                                    <h3 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                                        {mealIcon} {mealLabel}
                                    </h3>
                                    <div className="ml-4 space-y-2">
                                        {mealItems.map((item: any) => {
                                            const isRec = !!item.receita_id;
                                            const base = isRec ? item.receitas : item.alimentos;
                                            const m = getItemMacros(item);
                                            const subs: any[] = item.substituicoes ?? [];

                                            return (
                                                <div key={item.id}>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-semibold text-gray-800">
                                                            {base?.nome} — {Math.round(item.quantidade_g)}{isRec ? ' por.' : 'g'}
                                                        </span>
                                                        <span className="text-gray-500 text-xs">
                                                            {Math.round(m.kcal)} kcal • C:{Math.round(m.carbo)} P:{Math.round(m.prot)} G:{Math.round(m.gord)}
                                                        </span>
                                                    </div>
                                                    {subs.length > 0 && (
                                                        <div className="ml-4 mt-0.5 space-y-0.5">
                                                            {subs.map((s: any, i: number) => (
                                                                <p key={i} className="text-xs text-gray-400">
                                                                    ↳ Ou: {s.nome} ({s.quantidade_g}{s.receita_id ? ' por.' : 'g'})
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            <p className="text-center text-xs text-gray-400 mt-8 pt-4 border-t">Gerado pelo Nutriplanner • Plano prescrito por profissional habilitado.</p>
        </div>
    );
}

export default function PlanoPreviewModal({ isOpen, onClose, plano, nomeCliente }: PlanoPreviewModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handlePrint = async () => {
        if (!printRef.current) return;
        setIsGeneratingPDF(true);
        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `Plano Alimentar - ${plano.nome}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        try {
            await html2pdf().from(printRef.current).set(opt).save();
        } catch (e) {
            console.error('Erro ao gerar PDF', e);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (!plano) return null;

    const allItens = plano.plano_alimentar_itens ?? [];

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="fixed inset-0 z-50 bg-gray-50 flex flex-col focus:outline-none max-w-xl mx-auto"
                >
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-5 flex items-center justify-between shrink-0">
                        <div>
                            <Dialog.Title className="font-bold text-gray-900 text-lg leading-none">{plano.nome}</Dialog.Title>
                            <p className="text-xs text-gray-400 mt-0.5">Pré-visualização do Plano</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                disabled={isGeneratingPDF}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm py-2 px-3 rounded-xl transition disabled:opacity-50"
                            >
                                <Download size={15} />
                                {isGeneratingPDF ? 'Gerando...' : 'Exportar PDF'}
                            </button>
                            <Dialog.Close asChild>
                                <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                    <X size={20} />
                                </button>
                            </Dialog.Close>
                        </div>
                    </div>

                    {/* Conteúdo scrollável */}
                    <div className="flex-1 overflow-y-auto pb-8">
                        {/* Abas de dias */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
                            <div className="flex gap-1 px-4 py-2 overflow-x-auto">
                                {diasSemana.map((dia, diaIdx) => {
                                    const hasItems = allItens.some((i: any) => i.dia_semana === diaIdx);
                                    return (
                                        <a
                                            key={diaIdx}
                                            href={`#dia-${diaIdx}`}
                                            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${hasItems ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'text-gray-400 bg-gray-100'}`}
                                        >
                                            {dia.slice(0, 3)}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Visualização por Dia */}
                        <div className="px-4 pt-4 space-y-6">
                            {diasSemana.map((dia, diaIdx) => {
                                const itensDia = allItens.filter((i: any) => i.dia_semana === diaIdx);
                                if (itensDia.length === 0) return null;

                                const diaTotal = itensDia.reduce((acc: any, item: any) => {
                                    const m = getItemMacros(item);
                                    return { kcal: acc.kcal + m.kcal, carbo: acc.carbo + m.carbo, prot: acc.prot + m.prot, gord: acc.gord + m.gord };
                                }, { kcal: 0, carbo: 0, prot: 0, gord: 0 });

                                return (
                                    <div key={diaIdx} id={`dia-${diaIdx}`}>
                                        {/* Header do dia */}
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-base font-black text-gray-800">{dia}</h2>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-emerald-600">{Math.round(diaTotal.kcal)} kcal</span>
                                                <span className="text-xs text-gray-400 ml-2">C:{Math.round(diaTotal.carbo)} • P:{Math.round(diaTotal.prot)} • G:{Math.round(diaTotal.gord)}</span>
                                            </div>
                                        </div>

                                        {/* Refeições do dia */}
                                        <div className="space-y-3">
                                            {(() => {
                                                const sortedMeals = Array.from(new Set<string>(itensDia.map((i: any) => i.tipo_refeicao as string)));

                                                return sortedMeals.map(mealId => {
                                                    const mealItems = itensDia.filter((i: any) => i.tipo_refeicao === mealId);
                                                    if (mealItems.length === 0) return null;

                                                    const mealLabel = mealItems[0].nome_refeicao ||
                                                        mealTypes.find(m => m.id === mealId)?.title ||
                                                        mealId.charAt(0).toUpperCase() + mealId.slice(1).replace(/_/g, ' ');
                                                    const mealIcon = mealTypes.find(m => m.id === mealId)?.icon || '🥣';
                                                    const mealKcal = mealItems.reduce((acc: number, item: any) => acc + getItemMacros(item).kcal, 0);

                                                    return (
                                                        <div key={mealId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                                <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                                    {mealIcon} {mealLabel}
                                                                </span>
                                                                <span className="text-xs font-semibold text-emerald-500">{Math.round(mealKcal)} kcal</span>
                                                            </div>
                                                            <div className="divide-y divide-gray-50">
                                                                {mealItems.map((item: any) => {
                                                                    const isRec = !!item.receita_id;
                                                                    const base = isRec ? item.receitas : item.alimentos;
                                                                    const m = getItemMacros(item);
                                                                    const subs: any[] = item.substituicoes ?? [];

                                                                    return (
                                                                        <div key={item.id} className="px-4 py-3">
                                                                            {/* Item principal */}
                                                                            <div className="flex items-start justify-between">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-semibold text-gray-800 text-sm">{base?.nome}</p>
                                                                                    <p className="text-xs text-gray-400">
                                                                                        {Math.round(item.quantidade_g)}{isRec ? ' porções' : 'g'} • {Math.round(m.kcal)} kcal
                                                                                    </p>
                                                                                    <div className="flex gap-2 mt-1">
                                                                                        <span className="text-[10px] text-blue-500 font-bold">C:{Math.round(m.carbo)}g</span>
                                                                                        <span className="text-[10px] text-emerald-500 font-bold">P:{Math.round(m.prot)}g</span>
                                                                                        <span className="text-[10px] text-amber-500 font-bold">G:{Math.round(m.gord)}g</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Substituições */}
                                                                            {subs.length > 0 && (
                                                                                <div className="mt-2 space-y-1">
                                                                                    {subs.map((sub: any, i: number) => (
                                                                                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                                                                                            <ArrowLeftRight size={10} className="shrink-0" />
                                                                                            <span>Ou: <strong className="text-gray-500">{sub.nome}</strong> ({sub.quantidade_g}{sub.receita_id ? ' por.' : 'g'})</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Área de impressão oculta */}
                    <div className="hidden print:block">
                        <div ref={printRef}>
                            <PrintableArea plano={plano} nomeCliente={nomeCliente} />
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
