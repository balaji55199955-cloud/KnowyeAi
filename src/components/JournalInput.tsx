import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  Check,
  Loader2,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Camera,
  UploadCloud,
  FileText,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LoggedItem, MealCategory, Micronutrients } from "../types";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface JournalInputProps {
  onLogItems: (items: Omit<LoggedItem, "id" | "timestamp">[]) => void;
}

const SAMPLE_PROMPTS = [
  "2 soft boiled eggs on whole wheat toast with a black coffee for breakfast",
  "A grilled chicken Caesar salad, an apple, and 500ml water for lunch",
  "30 minutes of high-intensity indoor cycling workout",
  "Salmon steak with half cup quinoa, steamed broccoli, and 1 tbsp butter"
];

const LOADING_STEPS = [
  "Reading your meal parameters...",
  "Running nutritional estimation...",
  "Extracting protein, carbs, and fats...",
  "Computing micronutrient density...",
  "Finalizing your journal entry..."
];

const PHOTO_LOADING_STEPS = [
  "Reading food photo parameters...",
  "Identifying foods and ingredients...",
  "Evaluating mass and volume...",
  "Extracting macros and micros...",
  "Finalizing visual meal analysis..."
];

export default function JournalInput({ onLogItems }: JournalInputProps) {
  const [entryMode, setEntryMode] = useState<"text" | "photo">("text");
  const [journalText, setJournalText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviewItems, setReviewItems] = useState<Omit<LoggedItem, "id" | "timestamp">[] | null>(null);
  const [reviewSummary, setReviewSummary] = useState<string>("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      rec.onerror = () => setIsRecording(false);
      rec.onresult = (event) => {
        const transcript = event.results[event.resultIndex][0].transcript;
        setJournalText((prev) => (prev ? prev + " " + transcript : transcript));
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Chrome.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStepIdx(0);
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setApiError("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setSelectedImage(e.target.result);
        setApiError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
  };

  const handleAnalyzeText = async () => {
    if (!journalText.trim()) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await fetch("/api/parse-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: journalText, localTime: new Date().toISOString() })
      });
      if (!response.ok) throw new Error("Failed to parse journal text.");
      const data = await response.json();
      setReviewItems(data.items);
      setReviewSummary(data.summary || "Items analyzed successfully.");
    } catch (err: any) {
      setApiError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!selectedImage) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await fetch("/api/analyze-food-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedImage })
      });
      if (!response.ok) throw new Error("Failed to scan the food photograph.");
      const data = await response.json();
      setReviewItems(data.items);
      setReviewSummary(data.summary || "Photo analyzed successfully.");
    } catch (err: any) {
      setApiError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim() || !reviewItems) return;
    setIsRefining(true);
    setApiError(null);
    try {
      const response = await fetch("/api/refine-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentItems: reviewItems, instruction: refineInstruction })
      });
      if (!response.ok) throw new Error("Unable to refine. Try again.");
      const data = await response.json();
      setReviewItems(data.items);
      setReviewSummary(data.summary || "Modified as requested.");
      setRefineInstruction("");
    } catch (err: any) {
      setApiError(err.message || "Failed to refine.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleManualItemChange = (index: number, field: string, value: any) => {
    if (!reviewItems) return;
    const updated = [...reviewItems];
    updated[index] = { ...updated[index], [field]: value };
    setReviewItems(updated);
  };

  const handleManualMicroChange = (index: number, field: keyof Micronutrients, value: number) => {
    if (!reviewItems) return;
    const updated = [...reviewItems];
    const micros = updated[index].micros ? { ...updated[index].micros } : {};
    micros[field] = value;
    updated[index] = { ...updated[index], micros };
    setReviewItems(updated);
  };

  const handleRemoveReviewItem = (index: number) => {
    if (!reviewItems) return;
    setReviewItems(reviewItems.filter((_, idx) => idx !== index));
  };

  const handleAddReviewItem = () => {
    if (!reviewItems) return;
    const newItem: Omit<LoggedItem, "id" | "timestamp"> = {
      name: "New entry",
      calories: 120,
      protein: 6,
      carbs: 15,
      fat: 3,
      amount: "1 serving",
      category: "Snacks",
      isExercise: false,
      micros: { sodium: 100, potassium: 150, calcium: 30, iron: 1, vitaminC: 5 }
    };
    setReviewItems([...reviewItems, newItem]);
  };

  const handleConfirmLog = () => {
    if (!reviewItems || reviewItems.length === 0) return;
    onLogItems(reviewItems);
    setReviewItems(null);
    setReviewSummary("");
    setJournalText("");
    setSelectedImage(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5" id="journal-input-section">
      <AnimatePresence mode="wait">
        {!reviewItems ? (
          <motion.div
            key="input-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="bg-white rounded-3xl p-5 md:p-8 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)] border border-slate-100 flex flex-col gap-4"
          >
            {/* Header + Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 font-display">Record Food & Exercise</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Conversational or visual input</p>
                </div>
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryMode("text")}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] ${
                    entryMode === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Text / Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("photo")}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] ${
                    entryMode === "photo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Photo Scan</span>
                </button>
              </div>
            </div>

            {/* Text Mode */}
            {entryMode === "text" && (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    id="journal-input-textarea"
                    rows={4}
                    className="w-full h-36 md:h-32 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[15px] md:text-base text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 resize-none placeholder-slate-400 focus:outline-none transition-all duration-200"
                    placeholder="I had 2 scrambled eggs, a piece of sourdough toast, and a medium latte..."
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    {journalText && (
                      <button onClick={() => setJournalText("")} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      id="mic-recording-button"
                      onClick={toggleRecording}
                      className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        isRecording ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRecording && (
                  <div className="flex items-center gap-2 text-xs text-rose-500 font-medium justify-center">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Listening... describe your meals conversationally.
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Try a suggestion:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[68px] md:max-h-none overflow-hidden">
                    {SAMPLE_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setJournalText(prompt)}
                        className="text-[11px] bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-3 py-1.5 rounded-lg text-left border border-slate-100 hover:border-emerald-200 transition-all duration-200 truncate max-w-full cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Photo Mode */}
            {entryMode === "photo" && (
              <div className="space-y-4">
                {!selectedImage ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer ${
                      dragActive ? "border-emerald-400 bg-emerald-50/30" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300"
                    }`}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleChangeFile} accept="image/*" className="hidden" />
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Drop your food photo here</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">or click to browse</p>
                    </div>
                    <span className="text-[10px] bg-white px-3 py-1 rounded-md border border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      PNG, JPG, WEBP
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 max-w-md mx-auto">
                    <img src={selectedImage} alt="Food to scan" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 right-3">
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="p-2 bg-slate-900/70 hover:bg-rose-600 text-white rounded-xl transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                      <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Ready to scan. AI will estimate macros and micros.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {apiError && (
              <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-100">
                <p className="font-semibold mb-0.5">Error</p>
                <p>{apiError}</p>
              </div>
            )}

            {/* Action */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">knowye AI</span>
              {entryMode === "text" ? (
                <button
                  id="analyze-journal-button"
                  disabled={isLoading || !journalText.trim()}
                  onClick={handleAnalyzeText}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-100 transition-all duration-200 flex items-center gap-2 cursor-pointer border-none min-h-[48px] active:scale-[0.98]"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Analyze Meal</>}
                </button>
              ) : (
                <button
                  id="analyze-photo-button"
                  disabled={isLoading || !selectedImage}
                  onClick={handleAnalyzePhoto}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-100 transition-all duration-200 flex items-center gap-2 cursor-pointer border-none min-h-[48px] active:scale-[0.98]"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Sparkles className="w-4 h-4" /> Scan Photo</>}
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="review-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="bg-white rounded-3xl p-5 md:p-8 border border-slate-100 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.06)]"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-display font-bold text-slate-800 flex items-center gap-1.5">
                  <Check className="w-4.5 h-4.5 text-emerald-500" /> Review Results
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Adjust before saving</p>
              </div>
              <button onClick={() => setReviewItems(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSummary && (
              <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100/60 mb-5">
                <p className="text-sm text-indigo-800 leading-relaxed">{reviewSummary}</p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3 mb-5">
              {reviewItems.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border ${item.isExercise ? "bg-orange-50/40 border-orange-100/60" : "bg-slate-50/50 border-slate-100"} space-y-3`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        className="w-full bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
                        value={item.name}
                        onChange={(e) => handleManualItemChange(idx, "name", e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input type="text" className="w-24 bg-white px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Amount" value={item.amount} onChange={(e) => handleManualItemChange(idx, "amount", e.target.value)} />
                        <select className="bg-white px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" value={item.category} onChange={(e) => handleManualItemChange(idx, "category", e.target.value as MealCategory)}>
                          <option value="Breakfast">Breakfast</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Exercise">Exercise</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Cal", field: "calories", unit: "kcal", value: item.calories },
                        { label: "Pro", field: "protein", unit: "g", value: item.protein },
                        { label: "Carb", field: "carbs", unit: "g", value: item.carbs },
                        { label: "Fat", field: "fat", unit: "g", value: item.fat },
                      ].map((m) => (
                        <div key={m.field} className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">{m.label}</span>
                          <input
                            type="number"
                            disabled={item.isExercise && m.field !== "calories"}
                            className="w-full text-center bg-white border border-slate-200 rounded-md text-xs font-mono font-semibold py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-300"
                            value={m.value}
                            onChange={(e) => handleManualItemChange(idx, m.field, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      ))}
                    </div>

                    <button onClick={() => handleRemoveReviewItem(idx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center self-start md:self-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!item.isExercise && (
                    <div className="pt-2 border-t border-slate-100/60">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Micros (mg)</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {(["sodium", "potassium", "calcium", "iron", "vitaminC"] as const).map((field) => (
                          <div key={field} className="bg-white rounded-lg p-1.5 text-center border border-slate-200">
                            <span className="text-[8px] text-slate-400 block font-mono capitalize">{field === "vitaminC" ? "Vit C" : field}</span>
                            <input
                              type="number"
                              className="w-full text-center bg-transparent border-none text-[10px] font-mono font-bold focus:outline-none"
                              value={item.micros?.[field] ?? 0}
                              onChange={(e) => handleManualMicroChange(idx, field, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddReviewItem}
              className="text-xs text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-200 cursor-pointer mb-5 min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" /> Add item manually
            </button>

            {/* Refine */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Refine with AI:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
                  placeholder="e.g. 'Change apple to banana' or 'Double the chicken'"
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                />
                <button
                  disabled={isRefining || !refineInstruction.trim()}
                  onClick={handleRefine}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-none min-h-[44px] transition-all duration-200 active:scale-[0.98]"
                >
                  {isRefining && <Loader2 className="w-3 animate-spin" />}
                  Apply
                </button>
              </div>
            </div>

            {apiError && (
              <div className="p-3 mb-4 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-100">{apiError}</div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button onClick={() => setReviewItems(null)} className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer bg-transparent border-none min-h-[44px]">
                &larr; Back
              </button>
              <button
                id="confirm-journal-log-button"
                onClick={handleConfirmLog}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-100 flex items-center gap-1.5 transition-all duration-200 cursor-pointer border-none min-h-[48px] active:scale-[0.98]"
              >
                <Check className="w-4 h-4" /> Log {reviewItems.length} {reviewItems.length === 1 ? 'item' : 'items'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 border border-slate-100 shadow-2xl">
              <div className="flex justify-center">
                <div className="relative flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <Sparkles className="w-4 h-4 text-emerald-600 absolute" />
                </div>
              </div>
              <h3 className="text-base font-display font-semibold text-slate-800">
                {entryMode === "photo" ? "Scanning Photo" : "Analyzing"}
              </h3>
              <div className="h-8 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStepIdx}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -4, opacity: 0 }}
                    className="text-xs text-slate-500 font-medium"
                  >
                    {entryMode === "photo"
                      ? PHOTO_LOADING_STEPS[loadingStepIdx % PHOTO_LOADING_STEPS.length]
                      : LOADING_STEPS[loadingStepIdx % LOADING_STEPS.length]
                    }
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
