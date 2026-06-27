import React from "react";
import {
  Coffee,
  Utensils,
  MoonStar,
  Cookie,
  Dumbbell,
  Trash2,
  Clock
} from "lucide-react";
import { LoggedItem, MealCategory } from "../types";

interface DiaryTimelineProps {
  loggedItems: LoggedItem[];
  onDeleteItem: (id: string) => void;
}

interface CategoryConfig {
  title: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
}

const CATEGORY_CONFIGS: Record<MealCategory, CategoryConfig> = {
  Breakfast: {
    title: "Breakfast",
    icon: <Coffee className="w-4 h-4" />,
    bgClass: "bg-amber-50 border-amber-100/60",
    textClass: "text-amber-700",
  },
  Lunch: {
    title: "Lunch",
    icon: <Utensils className="w-4 h-4" />,
    bgClass: "bg-emerald-50 border-emerald-100/60",
    textClass: "text-emerald-700",
  },
  Dinner: {
    title: "Dinner",
    icon: <MoonStar className="w-4 h-4" />,
    bgClass: "bg-indigo-50 border-indigo-100/60",
    textClass: "text-indigo-700",
  },
  Snacks: {
    title: "Snacks",
    icon: <Cookie className="w-4 h-4" />,
    bgClass: "bg-rose-50 border-rose-100/60",
    textClass: "text-rose-700",
  },
  Exercise: {
    title: "Exercise",
    icon: <Dumbbell className="w-4 h-4" />,
    bgClass: "bg-orange-50 border-orange-100/60",
    textClass: "text-orange-700",
  }
};

export default function DiaryTimeline({ loggedItems, onDeleteItem }: DiaryTimelineProps) {
  const categories: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snacks", "Exercise"];

  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat] = loggedItems.filter(item => item.category === cat);
    return acc;
  }, {} as Record<MealCategory, LoggedItem[]>);

  const totalLoggedCount = loggedItems.length;

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-5" id="diary-timeline-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">Today's Log</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Food intake and activity</p>
        </div>
        <span className="text-[10px] bg-emerald-50 px-2.5 py-1 text-emerald-600 font-mono font-bold rounded-full uppercase tracking-wider">
          {totalLoggedCount} {totalLoggedCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {totalLoggedCount === 0 ? (
        <div className="py-14 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-[0_0_32px_rgba(16,185,129,0.08)]">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700">Nothing logged yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Describe what you ate or your workout in the journal tab to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((cat) => {
            const items = groupedItems[cat];
            if (items.length === 0) return null;

            const config = CATEGORY_CONFIGS[cat];
            const groupCaloriesSum = items.reduce((sum, item) => sum + item.calories, 0);

            return (
              <div key={cat} className="space-y-2">
                <div className={`p-3 rounded-xl border flex items-center justify-between min-h-[44px] ${config.bgClass}`}>
                  <div className="flex items-center gap-2">
                    <span className={config.textClass}>{config.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${config.textClass}`}>
                      {config.title}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${config.textClass}`}>
                    {cat === "Exercise" ? `-${groupCaloriesSum}` : groupCaloriesSum} kcal
                  </span>
                </div>

                <div className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition-all duration-200 gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-medium shrink-0">
                            {item.amount}
                          </span>
                        </div>

                        {!item.isExercise && (
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              P: <strong className="text-slate-600">{item.protein}g</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              C: <strong className="text-slate-600">{item.carbs}g</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              F: <strong className="text-slate-600">{item.fat}g</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-mono font-bold ${item.isExercise ? 'text-amber-600' : 'text-slate-800'}`}>
                          {item.isExercise ? `-${item.calories}` : item.calories}
                        </span>

                        <button
                          id={`delete-timeline-item-${item.id}`}
                          onClick={() => onDeleteItem(item.id)}
                          className="text-slate-300 hover:text-rose-500 p-2.5 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
