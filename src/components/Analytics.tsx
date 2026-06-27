import React, { useState } from "react";
import { LoggedItem, WeightLog } from "../types";
import { TrendingUp, BarChart3, PieChart, Info, Scale } from "lucide-react";

interface AnalyticsProps {
  loggedItems: LoggedItem[];
  weightLogs: WeightLog[];
}

export default function Analytics({ loggedItems, weightLogs }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState<"7days" | "30days">("7days");

  const daysPreset = [
    { name: "Mon", calories: 1850, protein: 110, carbs: 190, fat: 55 },
    { name: "Tue", calories: 2150, protein: 130, carbs: 220, fat: 65 },
    { name: "Wed", calories: 1600, protein: 95, carbs: 170, fat: 50 },
    { name: "Thu", calories: 1950, protein: 120, carbs: 200, fat: 58 },
    { name: "Fri", calories: 2300, protein: 140, carbs: 240, fat: 70 },
    { name: "Sat", calories: 1750, protein: 105, carbs: 180, fat: 52 },
    { name: "Sun", calories: 2000, protein: 125, carbs: 205, fat: 60 }
  ];

  const todayCalories = loggedItems.filter(item => !item.isExercise).reduce((sum, item) => sum + item.calories, 0);
  const todayProtein = loggedItems.filter(item => !item.isExercise).reduce((sum, item) => sum + item.protein, 0);
  const todayCarbs = loggedItems.filter(item => !item.isExercise).reduce((sum, item) => sum + item.carbs, 0);
  const todayFat = loggedItems.filter(item => !item.isExercise).reduce((sum, item) => sum + item.fat, 0);

  const finalChartData = [...daysPreset];
  if (todayCalories > 0) {
    finalChartData[finalChartData.length - 1] = {
      name: "Today",
      calories: Math.round(todayCalories),
      protein: Math.round(todayProtein),
      carbs: Math.round(todayCarbs),
      fat: Math.round(todayFat)
    };
  }

  const defaultWeightLogs = [
    { day: "May 30", weight: 75.8 },
    { day: "May 31", weight: 75.5 },
    { day: "Jun 01", weight: 75.2 },
    { day: "Jun 02", weight: 75.3 },
    { day: "Jun 03", weight: 75.0 },
    { day: "Jun 04", weight: 74.8 },
    { day: "Today", weight: weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 74.6 }
  ];

  const maxCalories = Math.max(...finalChartData.map(d => d.calories), 2500);
  const weights = defaultWeightLogs.map(w => w.weight);
  const minWeight = Math.min(...weights) - 0.5;
  const maxWeight = Math.max(...weights) + 0.5;
  const weightRange = maxWeight - minWeight;

  return (
    <div className="space-y-5" id="analytics-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">Analytics</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Nutrition and weight trends</p>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-xl self-start">
          <button
            onClick={() => setTimeRange("7days")}
            className={`text-[11px] font-bold px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] flex items-center ${
              timeRange === "7days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange("30days")}
            className={`text-[11px] font-bold px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] flex items-center ${
              timeRange === "30days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Calorie Bar Chart */}
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
              <BarChart3 className="w-4 h-4 text-emerald-500" /> Daily Calories
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider">kcal</span>
          </div>

          <div className="h-56 md:h-48 flex items-end justify-between gap-2 pt-6 border-b border-slate-100">
            {finalChartData.map((day, idx) => {
              const heightPercent = `${(day.calories / maxCalories) * 100}%`;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-mono rounded-lg px-2.5 py-2 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                    <span className="font-bold text-emerald-400">{day.calories} kcal</span>
                    <span className="block text-[9px] text-slate-300 mt-0.5">P:{day.protein}g C:{day.carbs}g F:{day.fat}g</span>
                  </div>
                  <div
                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all duration-300 cursor-pointer"
                    style={{ height: heightPercent }}
                  />
                  <span className="text-[10px] text-slate-400 mt-2 font-bold font-mono">{day.name}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            Hover bars for detailed breakdown.
          </p>
        </div>

        {/* Weight Line Chart */}
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
              <Scale className="w-4 h-4 text-emerald-500" /> Weight Progress
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider">kg</span>
          </div>

          <div className="h-56 md:h-48 relative">
            <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
              <g className="opacity-30">
                <line x1="0" y1="40" x2="100%" y2="40" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="90" x2="100%" y2="90" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="140" x2="100%" y2="140" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3" />
              </g>

              {(() => {
                const points = defaultWeightLogs.map((log, index) => {
                  const x = (index / (defaultWeightLogs.length - 1)) * 100;
                  const y = 160 - ((log.weight - minWeight) / weightRange) * 120;
                  return { x, y, weight: log.weight, day: log.day };
                });

                const dPathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x}% ${p.y}`).join(" ");
                const dPathArea = `${dPathLine} L 100% 180 L 0% 180 Z`;

                return (
                  <>
                    <path d={dPathArea} fill="rgba(16, 185, 129, 0.04)" />
                    <path d={dPathLine} fill="transparent" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <g key={i} className="group cursor-pointer">
                        <circle cx={`${p.x}%`} cy={p.y} r="4.5" fill="#ffffff" stroke="#10B981" strokeWidth="2.5" />
                        <foreignObject x={`${Math.max(2, p.x - 10)}%`} y={p.y - 32} width="60" height="26" className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity overflow-visible">
                          <div className="bg-slate-900 text-emerald-400 text-[9px] font-mono rounded-lg font-bold px-1.5 text-center py-0.5 shadow-lg">
                            {p.weight} kg
                          </div>
                        </foreignObject>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>

            <div className="absolute bottom-0 inset-x-0 flex justify-between px-1">
              {defaultWeightLogs.map((log, idx) => (
                <span key={idx} className="text-[9px] text-slate-400 font-bold font-mono">
                  {log.day.replace("May ", "").replace("Jun ", "6/")}
                </span>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Daily fluctuation is normal due to hydration and sodium.
          </p>
        </div>
      </div>

      {/* Macro Ratios */}
      <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-4 space-y-1.5">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
            <PieChart className="w-4 h-4 text-emerald-500" /> Macro Ratios
          </span>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Optimal distribution for your body type and goals.
          </p>
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Carbohydrates", value: "45%", sub: "Primary fuel", color: "bg-blue-50 text-blue-600" },
            { label: "Proteins", value: "30%", sub: "Muscle recovery", color: "bg-emerald-50 text-emerald-600" },
            { label: "Fats", value: "25%", sub: "Hormonal balance", color: "bg-amber-50 text-amber-600" },
          ].map((macro) => (
            <div key={macro.label} className={`p-5 rounded-2xl border border-slate-100 ${macro.color.split(' ')[0]}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">{macro.label}</span>
              <span className={`text-2xl font-black block mt-1.5 font-display ${macro.color.split(' ')[1]}`}>{macro.value}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{macro.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
