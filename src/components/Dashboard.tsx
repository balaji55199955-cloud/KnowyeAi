import React, { useState } from "react";
import {
  Flame,
  Droplet,
  Scale,
  Award,
  Plus
} from "lucide-react";
import { motion } from "motion/react";
import { LoggedItem, DailyGoal, WaterLog, WeightLog } from "../types";

interface DashboardProps {
  loggedItems: LoggedItem[];
  dailyGoal: DailyGoal;
  waterLogs: WaterLog[];
  weightLogs: WeightLog[];
  onAddWater: (amount: number) => void;
  onLogWeight: (weight: number) => void;
  onUpdateGoals: (goals: DailyGoal) => void;
}

export default function Dashboard({
  loggedItems,
  dailyGoal,
  waterLogs,
  weightLogs,
  onAddWater,
  onLogWeight,
  onUpdateGoals
}: DashboardProps) {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInputs, setGoalInputs] = useState({
    calories: dailyGoal.calories,
    protein: dailyGoal.protein,
    carbs: dailyGoal.carbs,
    fat: dailyGoal.fat,
  });

  const [weightInput, setWeightInput] = useState(
    weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight.toString() : ""
  );

  const consumedCalories = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + item.calories, 0);

  const burnedCalories = loggedItems
    .filter(item => item.isExercise)
    .reduce((sum, item) => sum + (item.calories || 0), 0);

  const netCalories = consumedCalories - burnedCalories;
  const caloriesRemaining = dailyGoal.calories - netCalories;

  const totalProtein = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + item.protein, 0);

  const totalCarbs = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + item.carbs, 0);

  const totalFat = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + item.fat, 0);

  const totalSodium = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + (item.micros?.sodium || 0), 0);

  const totalPotassium = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + (item.micros?.potassium || 0), 0);

  const totalCalcium = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + (item.micros?.calcium || 0), 0);

  const totalIron = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + (item.micros?.iron || 0), 0);

  const totalVitaminC = loggedItems
    .filter(item => !item.isExercise)
    .reduce((sum, item) => sum + (item.micros?.vitaminC || 0), 0);

  const targetMicros = dailyGoal.micros || {
    sodium: 1500,
    potassium: 3500,
    calcium: 1000,
    iron: 8,
    vitaminC: 90
  };

  const totalWater = waterLogs.reduce((sum, item) => sum + item.amount, 0);
  const waterTarget = 3000;

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGoals(goalInputs);
    setShowGoalForm(false);
  };

  const handleLogWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      onLogWeight(w);
    }
  };

  const percentOfGoal = Math.min(Math.max((netCalories / dailyGoal.calories) * 100, 0), 100);
  const proteinPercent = Math.min((totalProtein / dailyGoal.protein) * 100, 100);
  const carbsPercent = Math.min((totalCarbs / dailyGoal.carbs) * 100, 100);
  const fatPercent = Math.min((totalFat / dailyGoal.fat) * 100, 100);
  const waterPercent = Math.min((totalWater / waterTarget) * 100, 100);

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;

  return (
    <div className="space-y-5" id="dashboard-widget-container">

      {/* Calorie Ring + Stats */}
      <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)]">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

          {/* Ring */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-48 h-48 md:w-40 md:h-40 flex items-center justify-center rounded-full shadow-[0_0_48px_rgba(16,185,129,0.1)]">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                <circle
                  cx="50" cy="50" r="40"
                  stroke="#10B981"
                  strokeWidth="11"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * percentOfGoal) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl md:text-3xl font-black tracking-tight text-slate-900 block font-display" id="net-intake-value">
                  {Math.round(netCalories)}
                </span>
                <span className="text-[10px] font-mono tracking-widest text-emerald-600 font-bold block uppercase mt-0.5">
                  Net kcal
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consumed</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{Math.round(consumedCalories)} kcal</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (consumedCalories / dailyGoal.calories) * 100)}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Burned
              </span>
              <span className="text-sm font-bold text-slate-800 font-mono">{Math.round(burnedCalories)} kcal</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, burnedCalories > 0 ? (burnedCalories / 500) * 100 : 0)}%` }} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Remaining</span>
                <span className={`text-2xl font-black font-display ${caloriesRemaining >= 0 ? 'text-slate-900' : 'text-rose-500'}`} id="calories-remaining-value">
                  {Math.round(caloriesRemaining)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1 font-mono uppercase font-bold">kcal</span>
              </div>
              <button
                id="update-goals-toggle-button"
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="text-[11px] bg-slate-50 text-slate-600 font-bold border border-slate-150 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer min-h-[44px] active:scale-[0.98]"
              >
                Adjust Goals
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full border border-slate-100 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-800 font-display">
              Nutrition Targets
            </h3>
            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Daily calories (kcal)</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 min-h-[44px]"
                  value={goalInputs.calories}
                  onChange={(e) => setGoalInputs({ ...goalInputs, calories: parseInt(e.target.value) || 2000 })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Protein (g)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 px-2 py-2.5 rounded-xl text-xs text-center font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]" value={goalInputs.protein} onChange={(e) => setGoalInputs({ ...goalInputs, protein: parseInt(e.target.value) || 120 })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Carbs (g)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 px-2 py-2.5 rounded-xl text-xs text-center font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]" value={goalInputs.carbs} onChange={(e) => setGoalInputs({ ...goalInputs, carbs: parseInt(e.target.value) || 200 })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Fats (g)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 px-2 py-2.5 rounded-xl text-xs text-center font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]" value={goalInputs.fat} onChange={(e) => setGoalInputs({ ...goalInputs, fat: parseInt(e.target.value) || 60 })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowGoalForm(false)} className="text-xs text-slate-500 hover:text-slate-700 font-bold px-4 py-2.5 min-h-[44px] cursor-pointer">Cancel</button>
                <button id="save-nutrition-targets-button" type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold px-5 py-2.5 cursor-pointer border-none min-h-[44px] active:scale-[0.98] transition-all duration-200">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Macros — Stacked Bars (single card) */}
      <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-5" id="macronutrient-breakdown-cards">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Macronutrients</span>
          <span className="text-[10px] font-mono text-slate-400">Target / Day</span>
        </div>

        {/* Protein */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">Protein</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-mono" id="protein-eaten-value">{Math.round(totalProtein)}g</span>
              <span className="text-[10px] text-slate-400 font-mono">/ {dailyGoal.protein}g</span>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${proteinPercent}%` }} />
          </div>
        </div>

        {/* Carbs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-700">Carbs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-mono" id="carbs-eaten-value">{Math.round(totalCarbs)}g</span>
              <span className="text-[10px] text-slate-400 font-mono">/ {dailyGoal.carbs}g</span>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${carbsPercent}%` }} />
          </div>
        </div>

        {/* Fat */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-sm font-semibold text-slate-700">Fats</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-mono" id="fat-eaten-value">{Math.round(totalFat)}g</span>
              <span className="text-[10px] text-slate-400 font-mono">/ {dailyGoal.fat}g</span>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${fatPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Micronutrients */}
      <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-4" id="micronutrient-breakdown-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Micronutrients</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">RDA</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Sodium", value: totalSodium, target: targetMicros.sodium!, color: "bg-slate-400", isLimit: true },
            { label: "Potassium", value: totalPotassium, target: targetMicros.potassium!, color: "bg-blue-400", isLimit: false },
            { label: "Calcium", value: totalCalcium, target: targetMicros.calcium!, color: "bg-teal-400", isLimit: false },
            { label: "Iron", value: totalIron, target: targetMicros.iron!, color: "bg-purple-400", isLimit: false },
            { label: "Vitamin C", value: totalVitaminC, target: targetMicros.vitaminC!, color: "bg-emerald-400", isLimit: false },
          ].map((micro) => {
            const pct = Math.min((micro.value / micro.target) * 100, 100);
            const exceeded = micro.isLimit && micro.value > micro.target;
            return (
              <div key={micro.label} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-500">{micro.label}</span>
                  <span className={`font-mono ${exceeded ? 'text-rose-500' : 'text-slate-500'}`}>
                    {Math.round(micro.value)}/{micro.target}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${exceeded ? 'bg-rose-400' : micro.color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[9px] text-slate-400 font-mono text-right">
                  {exceeded ? <span className="text-rose-500 font-bold">Exceeded</span> : `${Math.round(pct)}%`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Water + Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Water */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 block">Water</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Target: {waterTarget / 1000}L</span>
              </div>
            </div>
            <span className="text-lg font-bold text-blue-600 font-mono" id="water-logged-value">{totalWater}ml</span>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${waterPercent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>0</span>
              <span className="text-blue-500">{Math.round(waterPercent)}%</span>
              <span>{waterTarget}ml</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[250, 500, 750].map((amount) => (
              <button
                key={amount}
                id={`add-water-${amount}-button`}
                onClick={() => onAddWater(amount)}
                className="bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl py-3 text-xs font-bold text-slate-600 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer min-h-[48px] active:scale-[0.98]"
              >
                <span className="text-[10px] text-blue-500 font-bold mb-0.5">+</span>
                {amount}ml
              </button>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 block">Weight</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Track progress</span>
              </div>
            </div>
            <div id="latest-weight-value">
              {latestWeight ? (
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {latestWeight} <span className="text-xs text-slate-400">kg</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-mono italic">No logs</span>
              )}
            </div>
          </div>

          <form onSubmit={handleLogWeightSubmit} className="flex gap-2">
            <input
              type="number"
              step="0.1"
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl text-sm px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 min-h-[44px]"
              placeholder="Weight in kg"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
            <button
              id="log-weight-confirm-button"
              type="submit"
              disabled={!weightInput.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-xl text-xs font-semibold px-4 cursor-pointer border-none transition-all duration-200 min-h-[44px] active:scale-[0.98]"
            >
              Log
            </button>
          </form>

          <div className="p-3.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed flex items-start gap-2 border border-slate-100">
            <Award className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>Track regularly for accurate trendlines. Daily fluctuation is normal.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
