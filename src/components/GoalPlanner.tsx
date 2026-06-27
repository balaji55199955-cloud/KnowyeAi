import React, { useState, useEffect } from "react";
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Flame,
  Activity,
  Sparkles,
  Check,
  Info,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DailyGoal, UserProfile, Micronutrients } from "../types";

interface GoalPlannerProps {
  currentGoal: DailyGoal;
  onUpdateGoals: (goals: DailyGoal) => void;
}

export default function GoalPlanner({ currentGoal, onUpdateGoals }: GoalPlannerProps) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("knowye_user_profile_v1");
      return saved ? JSON.parse(saved) : {
        weight: 70, height: 170, age: 25, gender: "male", activityLevel: "moderate", goal: "lose"
      };
    }
    return { weight: 70, height: 170, age: 25, gender: "male", activityLevel: "moderate", goal: "lose" };
  });

  const [hasCalculated, setHasCalculated] = useState(false);
  const [showAppliedSuccess, setShowAppliedSuccess] = useState(false);

  const [bmi, setBmi] = useState(0);
  const [bmiCategory, setBmiCategory] = useState("");
  const [bmiColor, setBmiColor] = useState("");
  const [bmr, setBmr] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [targetCalories, setTargetCalories] = useState(0);
  const [targetProtein, setTargetProtein] = useState(0);
  const [targetCarbs, setTargetCarbs] = useState(0);
  const [targetFat, setTargetFat] = useState(0);
  const [targetMicros, setTargetMicros] = useState<Micronutrients>({
    sodium: 1500, potassium: 3500, calcium: 1000, iron: 8, vitaminC: 90
  });

  useEffect(() => { calculateMetrics(); }, [profile]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    localStorage.setItem("knowye_user_profile_v1", JSON.stringify(updated));
  };

  const calculateMetrics = () => {
    const { weight, height, age, gender, activityLevel, goal } = profile;
    if (!weight || !height || !age) return;

    const heightInMeters = height / 100;
    const calculatedBmi = weight / (heightInMeters * heightInMeters);
    setBmi(parseFloat(calculatedBmi.toFixed(1)));

    if (calculatedBmi < 18.5) { setBmiCategory("Underweight"); setBmiColor("text-blue-500 bg-blue-50"); }
    else if (calculatedBmi < 25) { setBmiCategory("Normal"); setBmiColor("text-emerald-600 bg-emerald-50"); }
    else if (calculatedBmi < 30) { setBmiCategory("Overweight"); setBmiColor("text-amber-600 bg-amber-50"); }
    else { setBmiCategory("Obese"); setBmiColor("text-rose-500 bg-rose-50"); }

    let calculatedBmr = gender === "male"
      ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
      : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    setBmr(Math.round(calculatedBmr));

    let multiplier = 1.2;
    if (activityLevel === "light") multiplier = 1.375;
    if (activityLevel === "moderate") multiplier = 1.55;
    if (activityLevel === "active") multiplier = 1.725;

    const calculatedTdee = calculatedBmr * multiplier;
    setTdee(Math.round(calculatedTdee));

    let calGoal = calculatedTdee;
    if (goal === "lose") calGoal = Math.max(calculatedTdee - 500, 1200);
    else if (goal === "gain") calGoal = calculatedTdee + 450;
    const finalCalGoal = Math.round(calGoal);
    setTargetCalories(finalCalGoal);

    let proteinMultiplier = goal === "lose" ? 2.0 : goal === "gain" ? 1.8 : 1.6;
    const proteinGrams = Math.round(weight * proteinMultiplier);
    setTargetProtein(proteinGrams);

    const fatGrams = Math.round((finalCalGoal * 0.25) / 9);
    setTargetFat(fatGrams);

    const remainingCals = finalCalGoal - (proteinGrams * 4) - (fatGrams * 9);
    setTargetCarbs(Math.round(Math.max(remainingCals / 4, 30)));

    setTargetMicros({
      sodium: 1500,
      potassium: gender === "male" ? 3400 : 2600,
      calcium: age <= 50 ? 1000 : 1200,
      iron: gender === "male" ? 8 : 18,
      vitaminC: gender === "male" ? 90 : 75
    });

    setHasCalculated(true);
  };

  const handleApplyGoalsOnApp = () => {
    onUpdateGoals({ calories: targetCalories, protein: targetProtein, carbs: targetCarbs, fat: targetFat, micros: targetMicros });
    setShowAppliedSuccess(true);
    setTimeout(() => setShowAppliedSuccess(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="goal-planner-container">

      {/* Form */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-5">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-500" /> Body Metrics
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Input your data to calculate targets</p>
        </div>

        <div className="space-y-4">
          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Biological Sex</label>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((g) => (
                <button key={g} type="button" onClick={() => handleChange("gender", g)}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer min-h-[48px] capitalize ${
                    profile.gender === g ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                  }`}>{g}</button>
              ))}
            </div>
          </div>

          {/* Weight + Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight (kg)</label>
              <input type="number" min={30} max={250} value={profile.weight} onChange={(e) => handleChange("weight", parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-300 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Height (cm)</label>
              <input type="number" min={100} max={250} value={profile.height} onChange={(e) => handleChange("height", parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-300 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]" />
            </div>
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</label>
            <input type="number" min={1} max={120} value={profile.age} onChange={(e) => handleChange("age", parseInt(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-300 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]" />
          </div>

          {/* Activity */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activity Level</label>
            <select value={profile.activityLevel} onChange={(e) => handleChange("activityLevel", e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-300 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]">
              <option value="sedentary">Sedentary (desk job)</option>
              <option value="light">Light (1-3 days/week)</option>
              <option value="moderate">Moderate (3-5 days/week)</option>
              <option value="active">Active (6-7 days/week)</option>
            </select>
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fitness Goal</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => handleChange("goal", "lose")}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[48px] ${
                  profile.goal === "lose" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                }`}>
                <TrendingDown className="w-4 h-4" />
                <span>Lose Weight</span>
              </button>
              <button type="button" onClick={() => handleChange("goal", "gain")}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[48px] ${
                  profile.goal === "gain" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                }`}>
                <TrendingUp className="w-4 h-4" />
                <span>Gain Weight</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p>Uses revised Harris-Benedict equations for BMR estimation.</p>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-7 space-y-5">
        {hasCalculated ? (
          <>
            {/* BMI */}
            <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">BMI</span>
                <span className="text-4xl font-black text-slate-900 block font-display tracking-tight">{bmi}</span>
                <span className={`inline-block text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${bmiColor}`}>{bmiCategory}</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-2.5 bg-slate-100 rounded-full relative overflow-visible">
                  <div className="absolute -top-1 w-4 h-4 bg-white border-2 border-slate-800 rounded-full shadow-sm" style={{ left: `${Math.min(Math.max(((bmi - 15) / 25) * 100, 0), 100)}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono font-bold uppercase">
                  <span>18.5</span><span>25</span><span>30+</span>
                </div>
              </div>
            </div>

            {/* Energy */}
            <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <Flame className="w-4 h-4 text-emerald-500" /> Energy Budget
                </h3>
                <span className="text-[9px] bg-emerald-50 px-2 py-0.5 text-emerald-600 font-mono font-bold rounded-full uppercase">Calculated</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">BMR</span>
                  <span className="text-lg font-black text-slate-800 font-mono block mt-1">{bmr}</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">TDEE</span>
                  <span className="text-lg font-black text-slate-800 font-mono block mt-1">{tdee}</span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100/60 rounded-2xl text-center">
                  <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold block">Target</span>
                  <span className="text-lg font-black text-emerald-700 font-mono block mt-1">{targetCalories}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-medium text-right">
                {profile.goal === "lose" ? "500 kcal deficit applied" : "450 kcal surplus applied"}
              </div>
            </div>

            {/* Macros + Micros */}
            <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] space-y-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                <Sparkles className="w-4 h-4 text-emerald-500" /> Target Nutrients
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Protein", value: targetProtein, unit: "g", pct: `${(targetProtein * 4 / targetCalories * 100).toFixed(0)}%`, color: "bg-emerald-500" },
                  { label: "Carbs", value: targetCarbs, unit: "g", pct: `${(targetCarbs * 4 / targetCalories * 100).toFixed(0)}%`, color: "bg-blue-500" },
                  { label: "Fats", value: targetFat, unit: "g", pct: `${(targetFat * 9 / targetCalories * 100).toFixed(0)}%`, color: "bg-amber-400" },
                ].map((m) => (
                  <div key={m.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{m.label}</span>
                    <span className="text-xl font-black text-slate-800 block font-mono mt-1">{m.value}<span className="text-xs ml-0.5">{m.unit}</span></span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${m.color}`} />
                      <span className="text-[9px] text-slate-400 font-bold">{m.pct} of calories</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Micronutrients (daily RDA)</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Sodium", value: targetMicros.sodium },
                    { label: "Potassium", value: targetMicros.potassium },
                    { label: "Calcium", value: targetMicros.calcium },
                    { label: "Iron", value: targetMicros.iron },
                    { label: "Vitamin C", value: targetMicros.vitaminC },
                  ].map((micro) => (
                    <div key={micro.label} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">{micro.label}</span>
                      <span className="text-xs font-black text-slate-800 block mt-1 font-mono">{micro.value} mg</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                id="apply-fitness-targets-button"
                onClick={handleApplyGoalsOnApp}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-6 rounded-2xl font-bold transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer border-none min-h-[52px] active:scale-[0.98]"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Apply to Daily Goal</span>
              </button>

              <AnimatePresence>
                {showAppliedSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="p-3 bg-emerald-50 border border-emerald-200/60 text-emerald-700 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Targets applied successfully
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="h-full bg-white rounded-3xl p-10 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] flex flex-col items-center justify-center text-center space-y-3">
            <Activity className="w-10 h-10 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-800 font-display">Calculating...</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Enter your weight and height to see personalized metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
