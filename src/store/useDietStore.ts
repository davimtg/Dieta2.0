import { create } from 'zustand';

export interface Macro {
    carbs: number;
    protein: number;
    fat: number;
}

export interface Ingredient {
    id: string;
    name: string;
    portion: number; // in grams
    calories: number;
    macros: Macro;
}

export interface RecipeIngredient {
    ingredientId: string;
    amount: number; // in grams
}

export interface Recipe {
    id: string;
    name: string;
    image?: string;
    ingredients: RecipeIngredient[];
    instructions?: string;
    notes?: string;
}

export interface MealItem {
    id: string;
    type: 'ingredient' | 'recipe';
    itemId: string; // ID of either Ingredient or Recipe
    amount: number; // For ingredient: grams. For recipe: servings or multiplier (e.g. 1)
}

export interface Meal {
    id: string;
    name: string;
    items: MealItem[];
}

interface DietState {
    dailyGoalKcal: number;
    meals: Meal[];
    ingredientsDatabase: Ingredient[];
    recipesDatabase: Recipe[];

    // Actions
    updateIngredientAmountInMeal: (mealId: string, itemId: string, newAmount: number) => void;
    // We'll add more actions as needed...
}

// Initial Mock Data based on the inspirations
const mockIngredients: Ingredient[] = [
    { id: 'i1', name: 'Arroz integral', portion: 45, calories: 114, macros: { carbs: 25, protein: 2.5, fat: 0 } },
    { id: 'i2', name: 'Filé de Frango', portion: 125, calories: 130, macros: { carbs: 0, protein: 28, fat: 1.5 } },
    { id: 'i3', name: 'Pão francês', portion: 38, calories: 100, macros: { carbs: 20, protein: 3, fat: 1 } },
    { id: 'i4', name: 'Ovo cozido', portion: 50, calories: 75, macros: { carbs: 0.5, protein: 6, fat: 5 } },
    { id: 'i5', name: 'Aveia em flocos', portion: 30, calories: 115, macros: { carbs: 17, protein: 4, fat: 2 } },
    { id: 'i6', name: 'Banana', portion: 100, calories: 89, macros: { carbs: 23, protein: 1, fat: 0 } },
    { id: 'i7', name: 'Bowl de Frutas Vermelhas (Receita Mock)', portion: 1, calories: 300, macros: { carbs: 48.6, protein: 4.1, fat: 1.5 } },
];

export const useDietStore = create<DietState>((set) => ({
    dailyGoalKcal: 2000,
    ingredientsDatabase: mockIngredients,
    recipesDatabase: [
        {
            id: 'r1',
            name: 'Bowl de Frutas Vermelhas',
            ingredients: [
                { ingredientId: 'i5', amount: 30 },
                { ingredientId: 'i6', amount: 100 },
                // Assuming there are other fruits, but well keep it simple
            ],
            instructions: 'Misture tudo e sirva gelado.',
        }
    ],
    meals: [
        {
            id: 'm1',
            name: 'Café da Manhã',
            items: [
                { id: 'mi1', type: 'recipe', itemId: 'r1', amount: 1 },
                { id: 'mi2', type: 'ingredient', itemId: 'i3', amount: 38 },
            ]
        },
        {
            id: 'm2',
            name: 'Almoço',
            items: [
                { id: 'mi3', type: 'ingredient', itemId: 'i1', amount: 150 },
                { id: 'mi4', type: 'ingredient', itemId: 'i2', amount: 125 },
            ]
        },
        { id: 'm3', name: 'Lanche', items: [] },
        { id: 'm4', name: 'Jantar', items: [] },
    ],

    updateIngredientAmountInMeal: (mealId, itemId, newAmount) => set((state) => ({
        meals: state.meals.map(meal => {
            if (meal.id === mealId) {
                return {
                    ...meal,
                    items: meal.items.map(item => item.id === itemId ? { ...item, amount: newAmount } : item)
                };
            }
            return meal;
        })
    })),
}));
