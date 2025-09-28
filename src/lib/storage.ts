const SELECTION_KEY = "maiprofile.selection";
const FAVORITES_KEY = "maiprofile.favorites";

export type SelectionState = {
    frameId?: string;
    nameplateId?: string;
    iconId?: string;
    fanBattleClassId?: string;
    dansId?: string;
    titleKey?: string;
    rating?: string;
    username?: string;
};

export type FavoritesState = {
    frames: string[];
    nameplates: string[];
    icons: string[];
    titles: string[];
};

const defaultFavorites: FavoritesState = {
    frames: [],
    nameplates: [],
    icons: [],
    titles: [],
};

function isBrowser() {
    return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
    );
}

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadSelection(): SelectionState | null {
    if (!isBrowser()) return null;
    return safeParse<SelectionState>(
        window.localStorage.getItem(SELECTION_KEY)
    );
}

export function saveSelection(state: SelectionState) {
    if (!isBrowser()) return;
    window.localStorage.setItem(SELECTION_KEY, JSON.stringify(state));
}

export function loadFavorites(): FavoritesState {
    if (!isBrowser()) return structuredClone(defaultFavorites);
    return (
        safeParse<FavoritesState>(window.localStorage.getItem(FAVORITES_KEY)) ??
        structuredClone(defaultFavorites)
    );
}

export function saveFavorites(state: FavoritesState) {
    if (!isBrowser()) return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(state));
}
