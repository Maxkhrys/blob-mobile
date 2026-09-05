import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DevPreset, ExpressionRecipe } from "../../domain/devlab/types";

const PRESETS_KEY = "cherripi.devlab.presets.v1";
const RECIPES_KEY = "cherripi.devlab.recipes.v1";

async function readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const DevLabStorage = {
  loadPresets: () => readArray<DevPreset>(PRESETS_KEY),
  savePresets: (value: DevPreset[]) =>
    AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(value)),
  loadRecipes: () => readArray<ExpressionRecipe>(RECIPES_KEY),
  saveRecipes: (value: ExpressionRecipe[]) =>
    AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(value)),
};
