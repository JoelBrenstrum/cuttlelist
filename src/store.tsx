import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type { StockType, CutItem, OptimizationResult } from "./types";

// ─── State Shape ────────────────────────────────────────────────

export interface AppState {
  stock: StockType[];
  cuts: CutItem[];
  altCuts: CutItem[];
  altEnabled: boolean;
  kerf: number;
  unit: "mm" | "in";
  results: OptimizationResult | null;
  altResults: OptimizationResult | null;
  currentSetName: string;
  chosenLabel: string | null;
}

const DEFAULT_STATE: AppState = {
  stock: [{ id: crypto.randomUUID(), length: 2400, quantity: 10, priority: 3 }],
  cuts: [{ id: crypto.randomUUID(), length: 600, quantity: 4 }],
  altCuts: [],
  altEnabled: false,
  kerf: 3,
  unit: "mm",
  results: null,
  altResults: null,
  currentSetName: "Untitled",
  chosenLabel: null,
};

// ─── Actions ────────────────────────────────────────────────────

type Action =
  | { type: "SET_STOCK"; stock: StockType[] }
  | { type: "ADD_STOCK"; stock: StockType }
  | { type: "UPDATE_STOCK"; id: string; updates: Partial<StockType> }
  | { type: "REMOVE_STOCK"; id: string }
  | { type: "SET_CUTS"; cuts: CutItem[] }
  | { type: "ADD_CUT"; cut: CutItem }
  | { type: "UPDATE_CUT"; id: string; updates: Partial<CutItem> }
  | { type: "REMOVE_CUT"; id: string }
  | { type: "SET_ALT_CUTS"; cuts: CutItem[] }
  | { type: "ADD_ALT_CUT"; cut: CutItem }
  | { type: "UPDATE_ALT_CUT"; id: string; updates: Partial<CutItem> }
  | { type: "REMOVE_ALT_CUT"; id: string }
  | { type: "TOGGLE_ALT"; enabled: boolean }
  | { type: "SET_KERF"; kerf: number }
  | { type: "SET_UNIT"; unit: "mm" | "in" }
  | { type: "SET_RESULTS"; results: OptimizationResult | null }
  | { type: "SET_ALT_RESULTS"; results: OptimizationResult | null }
  | { type: "SET_CHOSEN_LABEL"; label: string | null }
  | { type: "SET_NAME"; name: string }
  | { type: "LOAD_STATE"; state: Partial<AppState> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STOCK":
      return { ...state, stock: action.stock, results: null };
    case "ADD_STOCK":
      return { ...state, stock: [...state.stock, action.stock], results: null };
    case "UPDATE_STOCK":
      return {
        ...state,
        stock: state.stock.map((s) => (s.id === action.id ? { ...s, ...action.updates } : s)),
        results: null,
      };
    case "REMOVE_STOCK":
      return {
        ...state,
        stock: state.stock.filter((s) => s.id !== action.id),
        results: null,
      };
    case "SET_CUTS":
      return { ...state, cuts: action.cuts, results: null };
    case "ADD_CUT":
      return { ...state, cuts: [...state.cuts, action.cut], results: null };
    case "UPDATE_CUT":
      return {
        ...state,
        cuts: state.cuts.map((c) => (c.id === action.id ? { ...c, ...action.updates } : c)),
        results: null,
      };
    case "REMOVE_CUT":
      return {
        ...state,
        cuts: state.cuts.filter((c) => c.id !== action.id),
        results: null,
      };
    case "SET_ALT_CUTS":
      return { ...state, altCuts: action.cuts, altResults: null };
    case "ADD_ALT_CUT":
      return { ...state, altCuts: [...state.altCuts, action.cut], altResults: null };
    case "UPDATE_ALT_CUT":
      return {
        ...state,
        altCuts: state.altCuts.map((c) =>
          c.id === action.id ? { ...c, ...action.updates } : c,
        ),
        altResults: null,
      };
    case "REMOVE_ALT_CUT":
      return {
        ...state,
        altCuts: state.altCuts.filter((c) => c.id !== action.id),
        altResults: null,
      };
    case "TOGGLE_ALT":
      return { ...state, altEnabled: action.enabled, altResults: null };
    case "SET_KERF":
      return { ...state, kerf: action.kerf, results: null, altResults: null };
    case "SET_UNIT":
      return { ...state, unit: action.unit };
    case "SET_RESULTS":
      return { ...state, results: action.results };
    case "SET_ALT_RESULTS":
      return { ...state, altResults: action.results };
    case "SET_CHOSEN_LABEL":
      return { ...state, chosenLabel: action.label };
    case "SET_NAME":
      return { ...state, currentSetName: action.name };
    case "LOAD_STATE":
      return { ...DEFAULT_STATE, ...action.state, results: null, altResults: null };
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}

// ─── Convenience hooks ──────────────────────────────────────────

export function useStock() {
  const { state, dispatch } = useAppState();

  const addStock = useCallback(() => {
    dispatch({
      type: "ADD_STOCK",
      stock: {
        id: crypto.randomUUID(),
        length: 2400,
        quantity: 1,
        priority: 3,
      },
    });
  }, [dispatch]);

  const updateStock = useCallback(
    (id: string, updates: Partial<StockType>) => {
      dispatch({ type: "UPDATE_STOCK", id, updates });
    },
    [dispatch],
  );

  const removeStock = useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_STOCK", id });
    },
    [dispatch],
  );

  return { stock: state.stock, addStock, updateStock, removeStock };
}

export function useCuts() {
  const { state, dispatch } = useAppState();

  const addCut = useCallback(() => {
    dispatch({
      type: "ADD_CUT",
      cut: {
        id: crypto.randomUUID(),
        length: 300,
        quantity: 1,
      },
    });
  }, [dispatch]);

  const updateCut = useCallback(
    (id: string, updates: Partial<CutItem>) => {
      dispatch({ type: "UPDATE_CUT", id, updates });
    },
    [dispatch],
  );

  const removeCut = useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_CUT", id });
    },
    [dispatch],
  );

  return { cuts: state.cuts, addCut, updateCut, removeCut };
}

export function useAltCuts() {
  const { state, dispatch } = useAppState();

  const addAltCut = useCallback(() => {
    dispatch({
      type: "ADD_ALT_CUT",
      cut: {
        id: crypto.randomUUID(),
        length: 300,
        quantity: 1,
      },
    });
  }, [dispatch]);

  const updateAltCut = useCallback(
    (id: string, updates: Partial<CutItem>) => {
      dispatch({ type: "UPDATE_ALT_CUT", id, updates });
    },
    [dispatch],
  );

  const removeAltCut = useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_ALT_CUT", id });
    },
    [dispatch],
  );

  return { altCuts: state.altCuts, addAltCut, updateAltCut, removeAltCut };
}
