import type { CalculatorInputs } from '../components/profile/NutritionalCalculatorForm';

export interface NutritionCalculationResult {
    bmr: number;
    tdee: number;
    metaKcal: number;
    carbs: number;
    protein: number;
    fat: number;
    peso: number;
    objetivo: 'perder' | 'manter' | 'ganhar';
}

export function calculateNutritionTargets(data: CalculatorInputs): NutritionCalculationResult {
    let bmr = 0;

    if (data.formula === 'mifflin') {
        if (data.sexo === 'M') {
            bmr = (10 * data.peso) + (6.25 * data.altura) - (5 * data.idade) + 5;
        } else {
            bmr = (10 * data.peso) + (6.25 * data.altura) - (5 * data.idade) - 161;
        }
    } else {
        const bf = data.bf || 20;
        bmr = 370 + (21.6 * (1 - (bf / 100)) * data.peso);
    }

    const tdee = bmr * Number(data.fator_atividade);

    let metaKcal = Math.round(tdee);
    if (data.objetivo === 'perder') metaKcal -= 500;
    if (data.objetivo === 'ganhar') metaKcal += 500;

    const protein = Math.round(data.peso * 2.0);
    const fat = Math.round(data.peso * 1.0);
    const proteinKcal = protein * 4;
    const fatKcal = fat * 9;

    let carbsKcal = metaKcal - (proteinKcal + fatKcal);
    let carbs = Math.round(carbsKcal / 4);
    if (carbs < 0) carbs = 0;

    return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        metaKcal,
        carbs,
        protein,
        fat,
        peso: data.peso,
        objetivo: data.objetivo
    };
}
