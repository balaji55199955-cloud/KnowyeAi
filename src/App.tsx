import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  TrendingUp,
  Heart,
  Activity,
  Scale,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LoggedItem, DailyGoal, WaterLog, WeightLog } from "./types";
import JournalInput from "./components/JournalInput";
import Dashboard from "./components/Dashboard";
import DiaryTimeline from "./components/DiaryTimeline";
import Analytics from "./components/Analytics";
import GoalPlanner from "./components/GoalPlanner";

export default function App() {
  const [activeTab, setActiveTab] = useState<"journal" | "dashboard" | "analytics" | "planner">("journal");

  // ----------------- STATE INITIALIZATION & MIGRATIONS -----------------
  
  const [loggedItems, setLoggedItems] = useState<LoggedItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedNew = localStorage.getItem("knowye_food_logs_v1");
      if (savedNew) return JSON.parse(savedNew);
      // Fallback and migrate from legacy brand
      const savedLegacy = localStorage.getItem("journable_food_logs_v1");
      return savedLegacy ? JSON.parse(savedLegacy) : [];
    }
    return [];
  });

  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(() => {
    if (typeof window !== "undefined") {
      const savedNew = localStorage.getItem("knowye_daily_goals_v1");
      if (savedNew) return JSON.parse(savedNew);
      // Fallback/migrate
      const savedLegacy = localStorage.getItem("journable_daily_goals_v1");
      return savedLegacy ? JSON.parse(savedLegacy) : { calories: 2000, protein: 125, carbs: 220, fat: 65 };
    }
    return { calories: 2000, protein: 125, carbs: 220, fat: 65 };
  });

  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(() => {
    if (typeof window !== "undefined") {
      const savedNew = localStorage.getItem("knowye_water_logs_v1");
      if (savedNew) return JSON.parse(savedNew);
      // Fallback/migrate
      const savedLegacy = localStorage.getItem("journable_water_logs_v1");
      return savedLegacy ? JSON.parse(savedLegacy) : [];
    }
    return [];
  });

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => {
    if (typeof window !== "undefined") {
      const savedNew = localStorage.getItem("knowye_weight_logs_v1");
      if (savedNew) return JSON.parse(savedNew);
      // Fallback/migrate
      const savedLegacy = localStorage.getItem("journable_weight_logs_v1");
      return savedLegacy ? JSON.parse(savedLegacy) : [];
    }
    return [];
  });

  // ----------------- PERSISTENCE EFFECTS -----------------

  useEffect(() => {
    localStorage.setItem("knowye_food_logs_v1", JSON.stringify(loggedItems));
  }, [loggedItems]);

  useEffect(() => {
    localStorage.setItem("knowye_daily_goals_v1", JSON.stringify(dailyGoal));
  }, [dailyGoal]);

  useEffect(() => {
    localStorage.setItem("knowye_water_logs_v1", JSON.stringify(waterLogs));
  }, [waterLogs]);

  useEffect(() => {
    localStorage.setItem("knowye_weight_logs_v1", JSON.stringify(weightLogs));
  }, [weightLogs]);

  // Helper helper to filter for CURRENT calendar date (Today only)
  const isToday = (timestamp: number) => {
    const logDate = new Date(timestamp);
    const today = new Date();
    return (
      logDate.getDate() === today.getDate() &&
      logDate.getMonth() === today.getMonth() &&
      logDate.getFullYear() === today.getFullYear()
    );
  };

  // ----------------- STATE ACTIONS -----------------

  const handleLogParsedItems = (newParsedItems: Omit<LoggedItem, "id" | "timestamp">[]) => {
    const timestamp = Date.now();
    const itemsWithIds: LoggedItem[] = newParsedItems.map((item, index) => ({
      ...item,
      id: `item-${timestamp}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp
    }));
    
    setLoggedItems((prev) => [itemsWithIds[0], ...itemsWithIds.slice(1), ...prev]);
    
    // Automatically transition to the dashboard view once things are successfully logged
    setActiveTab("dashboard");
  };

  const handleDeleteItem = (id: string) => {
    setLoggedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddWater = (amount: number) => {
    const newLog: WaterLog = {
      id: `water-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      amount,
      timestamp: Date.now()
    };
    setWaterLogs((prev) => [...prev, newLog]);
  };

  const handleLogWeight = (weight: number) => {
    const newWeight: WeightLog = {
      id: `weight-${Date.now()}`,
      weight,
      timestamp: Date.now()
    };
    setWeightLogs((prev) => [...prev, newWeight]);
  };

  // Reset day action
  const handleClearTodayLogs = () => {
    if (confirm("Are you sure you want to completely reset all logged food and water items for today? This cannot be undone.")) {
      setLoggedItems((prev) => prev.filter(item => !isToday(item.timestamp)));
      setWaterLogs((prev) => prev.filter(item => !isToday(item.timestamp)));
    }
  };

  // Helper elements for Today metrics
  const todayLoggedItems = loggedItems.filter((item) => isToday(item.timestamp));
  const todayWaterLogs = waterLogs.filter((log) => isToday(log.timestamp));

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFB] text-[#0f172a] selection:bg-emerald-100">

      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-lg tracking-tighter font-display">
              ky
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-lg tracking-tight text-slate-900">
                  knowye
                </span>
                <span className="bg-emerald-50 text-emerald-600 text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md uppercase">
                  AI
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-400 font-medium -mt-0.5">Nutrition intelligence</p>
            </div>
          </div>

          <button
            id="clear-logs-btn"
            onClick={handleClearTodayLogs}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 font-semibold px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer border border-slate-100 hover:border-emerald-200 active:scale-[0.98] min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Today</span>
          </button>
        </div>
      </header>

      {/* Desktop Navigation */}
      <div className="hidden md:block border-b border-slate-100 bg-white/50">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <nav className="flex gap-1" id="navigation-tabs-bar">
            {[
              { key: "journal" as const, icon: BookOpen, label: "AI Journal" },
              { key: "dashboard" as const, icon: Activity, label: "Dashboard" },
              { key: "planner" as const, icon: Scale, label: "Goal Planner" },
              { key: "analytics" as const, icon: TrendingUp, label: "Analytics" },
            ].map((tab) => (
              <button
                key={tab.key}
                id={`tab-btn-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 py-3.5 px-4 border-b-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer min-h-[44px] ${
                  activeTab === tab.key
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6 md:space-y-8 pb-24 md:pb-8">

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="w-full"
          >
            {activeTab === "journal" && (
              <div className="space-y-6">
                <JournalInput onLogItems={handleLogParsedItems} />
                <DiaryTimeline loggedItems={todayLoggedItems} onDeleteItem={handleDeleteItem} />
              </div>
            )}

            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <Dashboard
                  loggedItems={todayLoggedItems}
                  dailyGoal={dailyGoal}
                  waterLogs={todayWaterLogs}
                  weightLogs={weightLogs}
                  onAddWater={handleAddWater}
                  onLogWeight={handleLogWeight}
                  onUpdateGoals={setDailyGoal}
                />
                <DiaryTimeline loggedItems={todayLoggedItems} onDeleteItem={handleDeleteItem} />
              </div>
            )}

            {activeTab === "planner" && (
              <div className="space-y-6">
                <GoalPlanner currentGoal={dailyGoal} onUpdateGoals={setDailyGoal} />
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                <Analytics loggedItems={loggedItems} weightLogs={weightLogs} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Footer — desktop only */}
      <footer className="hidden md:block border-t border-slate-100 bg-white py-5 mt-8">
        <div className="max-w-3xl mx-auto px-4 md:px-6 flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1">
            <span>Private, local-first nutrition tracking</span>
          </div>
          <p>&copy; {new Date().getFullYear()} knowye</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/80 backdrop-blur-xl border-t border-slate-200/60" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-4">
          {[
            { key: "journal" as const, icon: BookOpen, label: "Journal" },
            { key: "dashboard" as const, icon: Activity, label: "Dashboard" },
            { key: "planner" as const, icon: Scale, label: "Planner" },
            { key: "analytics" as const, icon: TrendingUp, label: "Analytics" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-all duration-200 cursor-pointer ${
                activeTab === tab.key
                  ? "text-emerald-600"
                  : "text-slate-400"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.key ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
              {activeTab === tab.key && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-1.5" />
              )}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
