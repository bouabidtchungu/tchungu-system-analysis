/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { 
  MessageSquare,
  Shield, 
  Upload, 
  Activity, 
  Zap, 
  Target, 
  Brain, 
  Maximize, 
  Trophy,
  Loader2,
  ChevronRight,
  Info,
  Play,
  User,
  LogOut,
  Plus,
  Trash2,
  History,
  Save,
  CheckCircle2,
  Edit,
  ArrowLeft,
  TrendingUp,
  Camera,
  Link,
  BookOpen,
  Scroll,
  Quote,
  AlertTriangle
} from "lucide-react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { analyzeCombatMedia, analyzeCombatVideoUrl, chatWithAICoach } from "./services/geminiService";
import { AnalysisResult, Pillar, Fighter, ChatMessage, Division } from "./types";
import { BOOKLET_CONTENT } from "./constants/booklet";
import { DIVISIONS_DATA } from "./constants/divisions";
import { TRANSLATIONS, Language } from "./constants/translations";
import { auth, db, storage } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const PILLAR_ICONS: Record<string, any> = {
  [Pillar.TECHNIQUE]: Target,
  [Pillar.COMBAT]: Activity,
  [Pillar.HARMONY]: Shield,
  [Pillar.UNION]: Maximize,
  [Pillar.NOTES]: Brain,
  [Pillar.GESTURE]: Zap,
  [Pillar.ULTIMATE]: Trophy,
};

const PILLAR_COLORS: Record<string, string> = {
  [Pillar.TECHNIQUE]: "#3b82f6", // blue
  [Pillar.COMBAT]: "#ef4444",    // red
  [Pillar.HARMONY]: "#10b981",   // emerald
  [Pillar.UNION]: "#8b5cf6",    // violet
  [Pillar.NOTES]: "#f59e0b",    // amber
  [Pillar.GESTURE]: "#06b6d4",   // cyan
  [Pillar.ULTIMATE]: "#ec4899",  // pink
};

type Tab = "analyze" | "fighters" | "history" | "system" | "ai-coach" | "founder" | "divisions";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [lang, setLang] = useState<Language>((localStorage.getItem('tchungu_lang') as Language) || 'en');

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('tchungu_lang', lang);
  }, [lang]);
  
  // Analysis State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPlayingCommentary, setIsPlayingCommentary] = useState(false);

  const playCommentary = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a deep, professional sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google UK English Male') || 
      v.name.includes('Male') || 
      v.lang.startsWith('en-GB')
    );
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 0.85; // Calm, deliberate pacing
    utterance.pitch = 0.8; // Deeper tone for philosophical weight
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsPlayingCommentary(true);
    utterance.onend = () => setIsPlayingCommentary(false);
    utterance.onerror = () => setIsPlayingCommentary(false);
    
    window.speechSynthesis.speak(utterance);
  }, []);

  // Fighter State
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [selectedFighterId, setSelectedFighterId] = useState<string>("");
  const [viewingFighterId, setViewingFighterId] = useState<string | null>(null);
  const [isEditingFighter, setIsEditingFighter] = useState(false);
  const [newFighter, setNewFighter] = useState({ 
    name: "", 
    stance: "Orthodox" as const,
    reach: "",
    height: "",
    weight: "",
    wins: "0",
    losses: "0",
    draws: "0",
    notes: "",
    photoUrl: ""
  });
  const [fighterPhoto, setFighterPhoto] = useState<File | null>(null);
  const [fighterPhotoPreview, setFighterPhotoPreview] = useState<string | null>(null);
  const [isAddingFighter, setIsAddingFighter] = useState(false);

  // History State
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);

  // AI Coach State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatContext, setChatContext] = useState<AnalysisResult | undefined>(undefined);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Booklet State
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Intelligence Mode State
  const [intelligenceModeEnabled, setIntelligenceModeEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [insightFilter, setInsightFilter] = useState<string>("All");

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fighters Listener
  useEffect(() => {
    if (!user) {
      setFighters([]);
      return;
    }
    const q = query(collection(db, "fighters"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fighter));
      setFighters(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // Analyses Listener
  useEffect(() => {
    if (!user) {
      setAnalyses([]);
      return;
    }
    const q = query(collection(db, "analyses"), where("ownerId", "==", user.uid), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalysisResult));
      setAnalyses(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // Chat Sessions Listener
  useEffect(() => {
    if (!user) {
      setChatSessions([]);
      return;
    }
    const q = query(collection(db, "chat_sessions"), where("ownerId", "==", user.uid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatSessions(docs);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError("Login failed.");
    }
  };

  const handleLogout = () => signOut(auth);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      console.log("File dropped:", selectedFile.name, selectedFile.size);
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File size exceeds 50MB limit.");
        return;
      }
      setFile(selectedFile);
      setVideoUrl("");
      
      // Clean up previous preview if it was an object URL
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      // Use Object URL for immediate preview without memory overhead of Data URL
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setResult(null);
      setError(null);
      setSaveSuccess(false);
    }
  }, [preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
      "video/*": [".mp4", ".mov", ".avi"],
    },
    multiple: false,
  } as any);

  const handleAnalyze = async () => {
    console.log("Initializing analysis...", { hasVideoUrl: !!videoUrl, hasFile: !!file });
    if (!videoUrl && !file) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      let analysis: AnalysisResult;
      
      if (videoUrl) {
        console.log("Analyzing video URL:", videoUrl);
        analysis = await analyzeCombatVideoUrl(videoUrl, lang);
      } else if (file) {
        console.log("Reading file as base64...");
        // Convert file to base64 only when needed for the API call
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => {
            console.error("FileReader Error:", e);
            reject(new Error("Failed to read file."));
          };
          reader.readAsDataURL(file);
        });
        console.log("Calling analyzeCombatMedia...");
        analysis = await analyzeCombatMedia(base64, file.type, file.type.startsWith("image/"), lang);
      } else {
        throw new Error("No media selected.");
      }
      
      console.log("Analysis complete:", analysis);
      setResult(analysis);
      if (analysis.philosophicalCommentary) {
        playCommentary(analysis.philosophicalCommentary);
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "Failed to analyze media. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!user || !result || !selectedFighterId) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "analyses"), {
        ...result,
        fighterId: selectedFighterId,
        ownerId: user.uid,
        timestamp: new Date().toISOString()
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save analysis.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFighterPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFighterPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFighterPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFighterPhoto = async (fighterId: string, file: File) => {
    const storageRef = ref(storage, `fighters/${fighterId}/profile.jpg`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleAddFighter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFighter.name) return;
    setIsAddingFighter(true);
    try {
      const fighterRef = await addDoc(collection(db, "fighters"), {
        name: newFighter.name,
        stance: newFighter.stance,
        reach: newFighter.reach ? parseFloat(newFighter.reach) : undefined,
        height: newFighter.height ? parseFloat(newFighter.height) : undefined,
        weight: newFighter.weight ? parseFloat(newFighter.weight) : undefined,
        record: {
          wins: parseInt(newFighter.wins) || 0,
          losses: parseInt(newFighter.losses) || 0,
          draws: parseInt(newFighter.draws) || 0,
        },
        notes: newFighter.notes || "",
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });

      if (fighterPhoto) {
        const photoUrl = await uploadFighterPhoto(fighterRef.id, fighterPhoto);
        await updateDoc(fighterRef, { photoUrl });
      }

      setNewFighter({ 
        name: "", 
        stance: "Orthodox",
        reach: "",
        height: "",
        weight: "",
        wins: "0",
        losses: "0",
        draws: "0",
        notes: "",
        photoUrl: ""
      });
      setFighterPhoto(null);
      setFighterPhotoPreview(null);
    } catch (err) {
      console.error(err);
      setError("Failed to add fighter.");
    } finally {
      setIsAddingFighter(false);
    }
  };

  const handleUpdateFighter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !viewingFighterId || !newFighter.name) return;
    setIsAddingFighter(true);
    try {
      let photoUrl = newFighter.photoUrl;
      if (fighterPhoto) {
        photoUrl = await uploadFighterPhoto(viewingFighterId, fighterPhoto);
      }

      await updateDoc(doc(db, "fighters", viewingFighterId), {
        name: newFighter.name,
        stance: newFighter.stance,
        reach: newFighter.reach ? parseFloat(newFighter.reach) : undefined,
        height: newFighter.height ? parseFloat(newFighter.height) : undefined,
        weight: newFighter.weight ? parseFloat(newFighter.weight) : undefined,
        record: {
          wins: parseInt(newFighter.wins) || 0,
          losses: parseInt(newFighter.losses) || 0,
          draws: parseInt(newFighter.draws) || 0,
        },
        notes: newFighter.notes || "",
        photoUrl: photoUrl || ""
      });
      setIsEditingFighter(false);
      setFighterPhoto(null);
      setFighterPhotoPreview(null);
    } catch (err) {
      console.error(err);
      setError("Failed to update fighter.");
    } finally {
      setIsAddingFighter(false);
    }
  };

  const handleDeleteFighter = async (id: string) => {
    if (!confirm("Delete this fighter and all associated data?")) return;
    try {
      await deleteDoc(doc(db, "fighters", id));
      // Optionally delete associated analyses too
    } catch (err) {
      console.error(err);
      setError("Failed to delete fighter.");
    }
  };

  const reset = () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setVideoUrl("");
    setResult(null);
    setError(null);
    setSaveSuccess(false);
  };

  const getFighterName = (id: string) => fighters.find(f => f.id === id)?.name || "Unknown";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-sm flex items-center justify-center rotate-45">
              <Shield className="w-5 h-5 text-white -rotate-45" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">
              TCHUNGU <span className="text-red-600">System</span>
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            <button 
              onClick={() => setActiveTab("analyze")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "analyze" && "text-red-500 opacity-100")}
            >
              {t.analyze}
            </button>
            <button 
              onClick={() => setActiveTab("fighters")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "fighters" && "text-red-500 opacity-100")}
            >
              {t.fighters}
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "history" && "text-red-500 opacity-100")}
            >
              {t.history}
            </button>
            <button 
              onClick={() => setActiveTab("system")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "system" && "text-red-500 opacity-100")}
            >
              {t.system}
            </button>
            <button 
              onClick={() => setActiveTab("founder")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "founder" && "text-red-500 opacity-100")}
            >
              {t.founder}
            </button>
            <button 
              onClick={() => setActiveTab("divisions")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "divisions" && "text-red-500 opacity-100")}
            >
              {t.divisions}
            </button>
            <button 
              onClick={() => setActiveTab("ai-coach")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "ai-coach" && "text-red-500 opacity-100")}
            >
              {t.aiCoach}
            </button>
            <div className="flex items-center gap-2 border-l border-white/10 pl-8">
              <select 
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-transparent text-white outline-none cursor-pointer hover:text-red-500 transition-colors uppercase"
              >
                <option value="en" className="bg-black">EN</option>
                <option value="ar" className="bg-black">AR</option>
                <option value="fr" className="bg-black">FR</option>
                <option value="zh" className="bg-black">ZH</option>
              </select>
            </div>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[8px] uppercase tracking-widest text-white/40 hover:text-red-500 transition-colors">{t.signOut}</button>
                </div>
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-white/20" />
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <User className="w-3 h-3" />
                {t.signIn}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === "analyze" && (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!result && !isAnalyzing ? (
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h2 className="text-6xl font-black tracking-tighter leading-none uppercase italic">
                        {t.objectiveCombat.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-red-600 font-sans">Combat</span> <br />
                        {t.objectiveCombat.split(' ').slice(-1)}
                      </h2>
                      <p className="text-lg text-white/60 max-w-md leading-relaxed">
                        {t.objectiveHeroSubtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Technique", icon: Target },
                        { label: "Combat", icon: Activity },
                        { label: "Harmony", icon: Shield },
                        { label: "Union", icon: Maximize },
                        { label: "Notes", icon: Brain },
                        { label: "Gesture", icon: Zap },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                          <item.icon className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div 
                      {...getRootProps()} 
                      className={cn(
                        "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all cursor-pointer group overflow-hidden relative",
                        isDragActive ? "border-red-500 bg-red-500/5" : "border-white/10 bg-white/5 hover:border-white/30"
                      )}
                    >
                      <input {...getInputProps()} />
                      
                      {preview ? (
                        <div className="absolute inset-0 group">
                          {file?.type.startsWith("video/") ? (
                            <video src={preview} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                          ) : (
                            <img src={preview} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/50 group-hover:scale-110 transition-transform">
                              <Play className="w-8 h-8 text-white fill-current" />
                            </div>
                            <div className="mt-4 text-center space-y-1">
                              <p className="text-xs font-bold uppercase tracking-widest text-white">Ready for Analysis</p>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest group-hover:text-red-500 transition-colors">Click to Change File</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-white/40 group-hover:text-red-500 transition-colors" />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm font-bold uppercase tracking-widest">{t.dropMedia}</p>
                            <p className="text-xs text-white/40">MP4, MOV, JPG, PNG up to 50MB</p>
                          </div>
                        </>
                      )}
                    </div>

                    {(preview || videoUrl) && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleAnalyze}
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-red-600/50 transition-all active:scale-95 z-10"
                      >
                        <Activity className="w-5 h-5" />
                        {t.initializeAnalysis}
                      </motion.button>
                    )}
                  </div>

                  <div className="mt-8 space-y-4 lg:col-span-2">
                    <div className="flex items-center gap-4 text-white/20">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-bold">OR ANALYZE VIA LINK</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="relative max-w-2xl mx-auto w-full">
                      <Link className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="url"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setPreview(null);
                          setFile(null);
                        }}
                        placeholder="Paste YouTube, Vimeo, or direct video URL..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-sm outline-none focus:border-red-500 transition-all placeholder:text-white/10"
                      />
                    </div>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8">
                  <div className="relative">
                    <Loader2 className="w-24 h-24 text-red-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold uppercase tracking-widest italic">{t.processing}</h3>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-red-600"
                          animate={{ width: ["0%", "100%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono opacity-40 uppercase">
                        <span>Pose Estimation</span>
                        <span>Physics Engine</span>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs uppercase tracking-widest animate-pulse">
                      Analyzing biomechanics and impact force...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={reset} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronRight className="w-6 h-6 rotate-180" />
                      </button>
                      <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                          {result?.fighterName || "Analysis"} <span className="text-red-600">{t.report}</span>
                        </h2>
                        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                          Session ID: {Math.random().toString(36).substring(7).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    {user && (
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setIntelligenceModeEnabled(!intelligenceModeEnabled)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                            intelligenceModeEnabled 
                              ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20" 
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          )}
                        >
                          <Zap className={cn("w-3 h-3", intelligenceModeEnabled ? "fill-current" : "")} />
                          Intelligence Mode
                        </button>
                        <button 
                          onClick={async () => {
                            setChatContext(result);
                            setActiveTab("ai-coach");
                            const initialMsg: ChatMessage = {
                              role: "model",
                              content: `Hello! I've loaded your analysis. Based on these results, we should focus on developing your ${result.scores.sort((a,b) => a.score - b.score)[0].pillar}. How can I help you understand the physics or psychology behind this specific area?`,
                              timestamp: new Date().toISOString()
                            };
                            setChatMessages([initialMsg]);
                            
                            if (user) {
                              const docRef = await addDoc(collection(db, "chat_sessions"), {
                                ownerId: user.uid,
                                analysisId: result.id || "temp",
                                messages: [initialMsg],
                                updatedAt: new Date().toISOString()
                              });
                              setCurrentSessionId(docRef.id);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <MessageSquare className="w-3 h-3 text-red-500" />
                          Consult AI Coach
                        </button>
                        <select 
                          value={selectedFighterId}
                          onChange={(e) => setSelectedFighterId(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-red-500 transition-colors"
                        >
                          <option value="">Select Fighter</option>
                          {fighters.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                        <button 
                          disabled={!selectedFighterId || isSaving || saveSuccess}
                          onClick={handleSaveAnalysis}
                          className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                            saveSuccess ? "bg-emerald-600/20 text-emerald-500 border border-emerald-600" : "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                          )}
                        >
                          {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                          {saveSuccess ? "Saved" : isSaving ? "Saving..." : "Save Result"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-black relative group">
                        {file?.type.startsWith("video/") ? (
                          <video 
                            src={preview!} 
                            controls 
                            className="w-full h-full object-cover" 
                            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                          />
                        ) : (
                          <img src={preview!} className="w-full h-full object-cover" />
                        )}
                        
                        {/* Intelligence Mode Overlay */}
                        <AnimatePresence>
                          {intelligenceModeEnabled && (
                            <div className="absolute inset-0 pointer-events-none z-20">
                              {/* Filter Controls (Visible on hover) */}
                              <div className="absolute top-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                {["All", "Errors", "Opportunities", "Strategy"].map((f: any) => {
                                  const label = f === "All" ? t.all : f === "Errors" ? t.errors : f === "Opportunities" ? t.opportunities : t.strategy;
                                  return (
                                    <button
                                      key={f}
                                      onClick={() => setInsightFilter(f)}
                                      className={cn(
                                        "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all border",
                                        insightFilter === f 
                                          ? "bg-red-600 border-red-600 text-white" 
                                          : "bg-black/60 border-white/10 text-white/40 hover:bg-black/80"
                                      )}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Active Insights */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 space-y-4">
                                {result?.intelligenceInsights?.filter(insight => {
                                  if (insightFilter === "All") return true;
                                  if (insightFilter === "Errors") return insight.type === "Error" || insight.type === "Inefficiency";
                                  if (insightFilter === "Opportunities") return insight.type === "Opportunity";
                                  if (insightFilter === "Strategy") return insight.type === "Strategy";
                                  return true;
                                }).filter(insight => {
                                  return currentTime >= insight.timestamp && currentTime <= insight.timestamp + 3;
                                }).map((insight, idx) => (
                                  <motion.div
                                    key={`${insight.timestamp}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                    className={cn(
                                      "max-w-xs w-full p-4 rounded-xl border backdrop-blur-md shadow-2xl",
                                      insight.severity === "high" ? "bg-red-600/20 border-red-600/40" : 
                                      insight.severity === "medium" ? "bg-orange-600/20 border-orange-600/40" : 
                                      "bg-blue-600/20 border-blue-600/40"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {insight.type === "Error" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                        {insight.type === "Opportunity" && <Target className="w-3 h-3 text-emerald-500" />}
                                        {insight.type === "Strategy" && <Brain className="w-3 h-3 text-blue-500" />}
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/60">{insight.type}</span>
                                      </div>
                                      <span className="text-[8px] font-mono text-white/40">{Math.floor(insight.timestamp / 60)}:{(insight.timestamp % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                    <h5 className="text-xs font-bold text-white mb-1 uppercase tracking-tight">{insight.message}</h5>
                                    <p className="text-[10px] text-white/60 leading-relaxed italic">
                                      {insight.explanation}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                                      <span className="text-[7px] uppercase tracking-[0.2em] text-red-500 font-bold">{insight.pillar}</span>
                                      <div className="flex gap-0.5">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                          <div 
                                            key={i} 
                                            className={cn(
                                              "w-1 h-1 rounded-full",
                                              i < (insight.severity === "high" ? 3 : insight.severity === "medium" ? 2 : 1) 
                                                ? "bg-red-500" 
                                                : "bg-white/10"
                                            )} 
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}

                                {/* Philosophical Layer */}
                                {currentTime % 15 < 4 && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute bottom-24 left-0 right-0 px-12 text-center"
                                  >
                                    <p className="text-sm font-serif italic text-white/40 tracking-wide">
                                      "{t.quotes[Math.floor(currentTime / 15) % t.quotes.length]}"
                                    </p>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          )}
                        </AnimatePresence>

                        {/* Video Overlay Insights */}
                        <AnimatePresence>
                          {result?.philosophicalCommentary && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute bottom-12 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
                            >
                              <p className="text-lg font-serif italic text-white text-center leading-relaxed drop-shadow-lg">
                                {result.philosophicalCommentary}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Philosophical Commentary Section */}
                      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Brain className="w-24 h-24" />
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {t.summary}
                          </h4>
                          <button 
                            onClick={() => playCommentary(result?.philosophicalCommentary || "")}
                            className={cn(
                              "p-2 rounded-full border border-white/10 transition-all",
                              isPlayingCommentary ? "bg-red-600 text-white animate-pulse" : "hover:bg-white/10 text-white/40"
                            )}
                          >
                            <Play className={cn("w-4 h-4", isPlayingCommentary && "fill-current")} />
                          </button>
                        </div>
                        <p className="text-2xl font-serif italic text-white leading-relaxed tracking-tight">
                          {result?.philosophicalCommentary}
                        </p>
                        <div className="h-px w-12 bg-red-600" />
                        <p className="text-xs text-white/40 leading-relaxed uppercase tracking-widest">
                          {result?.summary}
                        </p>
                      </div>

                      {/* Fight Segmentation */}
                      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{t.fightSegmentation}</h4>
                        <div className="space-y-4">
                          {result?.segments?.map((segment, idx) => (
                            <div key={idx} className="flex gap-4 group">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-600" />
                                {idx !== result.segments!.length - 1 && <div className="w-px flex-1 bg-white/10" />}
                              </div>
                              <div className="pb-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-mono text-red-500">{segment.timestamp}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{segment.phase}</span>
                                </div>
                                <p className="text-xs text-white/40 group-hover:text-white/80 transition-colors">
                                  {segment.insight}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                      {/* Detected Division Card */}
                      {result?.dominantDivision && (
                        <div className="p-8 bg-gradient-to-br from-red-600/20 to-transparent border border-red-600/20 rounded-2xl flex items-center justify-between gap-8 group cursor-pointer hover:bg-red-600/30 transition-all"
                             onClick={() => setActiveTab("divisions")}>
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-600/40 group-hover:scale-110 transition-transform">
                              {(() => {
                                const divInfo = DIVISIONS_DATA[lang].find(d => d.id === result.dominantDivision);
                                const Icon = divInfo?.icon || Shield;
                                return <Icon className="w-8 h-8 text-white" />;
                              })()}
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-black">{t.detectedDivision}</p>
                              <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                                {DIVISIONS_DATA[lang].find(d => d.id === result.dominantDivision)?.title || result.dominantDivision}
                              </h3>
                              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                                {DIVISIONS_DATA[lang].find(d => d.id === result.dominantDivision)?.focus}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                              {t.viewPathDetails}
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                          <h4 className="text-xs font-bold uppercase tracking-widest mb-6 self-start">Pillar Distribution</h4>
                          <div className="w-full aspect-square max-w-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={result?.scores}>
                                <PolarGrid stroke="#ffffff20" />
                                <PolarAngleAxis dataKey="pillar" tick={{ fill: '#ffffff60', fontSize: 10, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                <Radar dataKey="score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                          <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Quantified Metrics</h4>
                          <div className="w-full h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={result?.scores} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" domain={[0, 10]} hide />
                                <YAxis dataKey="pillar" type="category" tick={{ fill: '#ffffff60', fontSize: 10, fontWeight: 'bold' }} width={80} />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                  {result?.scores.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PILLAR_COLORS[entry.pillar] || "#ef4444"} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {result?.scores.map((score) => {
                          const Icon = PILLAR_ICONS[score.pillar] || Activity;
                          return (
                            <div key={score.pillar} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 group hover:bg-white/10 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-white/5 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-widest">{score.pillar}</span>
                                </div>
                                <span className="text-lg font-black font-mono text-red-500">{score.score.toFixed(1)}</span>
                              </div>
                              <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3 group-hover:text-white/70 transition-colors">
                                {score.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "fighters" && (
            <motion.div
              key="fighters"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!viewingFighterId ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                        Fighter <span className="text-red-600">Profiles</span>
                      </h2>
                      <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Manage your roster</p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                      <form onSubmit={handleAddFighter} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <Plus className="w-4 h-4 text-red-500" />
                          {t.addNewFighter}
                        </h4>
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <div className="relative group">
                              <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center overflow-hidden">
                                {fighterPhotoPreview ? (
                                  <img src={fighterPhotoPreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User className="w-8 h-8 text-white/20" />
                                )}
                              </div>
                              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                <Camera className="w-5 h-5 text-white" />
                                <input type="file" accept="image/*" onChange={handleFighterPhotoChange} className="hidden" />
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-white/40">{t.fullName}</label>
                            <input 
                              required
                              value={newFighter.name}
                              onChange={e => setNewFighter({...newFighter, name: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              placeholder={lang === 'ar' ? 'مثال: أليكس بيريرا' : 'e.g. Alex Pereira'}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.stance}</label>
                              <select 
                                value={newFighter.stance}
                                onChange={e => setNewFighter({...newFighter, stance: e.target.value as any})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              >
                                {['Orthodox', 'Southpaw', 'Switch'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.weight}</label>
                              <input 
                                type="number"
                                value={newFighter.weight}
                                onChange={e => setNewFighter({...newFighter, weight: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                                placeholder="185"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.reach}</label>
                              <input 
                                type="number"
                                value={newFighter.reach}
                                onChange={e => setNewFighter({...newFighter, reach: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                                placeholder="79"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.height}</label>
                              <input 
                                type="number"
                                value={newFighter.height}
                                onChange={e => setNewFighter({...newFighter, height: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                                placeholder="76"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.wins}</label>
                              <input 
                                type="number"
                                value={newFighter.wins}
                                onChange={e => setNewFighter({...newFighter, wins: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.losses}</label>
                              <input 
                                type="number"
                                value={newFighter.losses}
                                onChange={e => setNewFighter({...newFighter, losses: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.draws}</label>
                              <input 
                                type="number"
                                value={newFighter.draws}
                                onChange={e => setNewFighter({...newFighter, draws: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-white/40">{t.fighterNotes}</label>
                            <textarea 
                              value={newFighter.notes}
                              onChange={e => setNewFighter({...newFighter, notes: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors min-h-[100px] resize-none"
                              placeholder={lang === 'ar' ? 'أضف ملاحظات المقاتل، تحليل الأسلوب، أو نقاط الضعف...' : 'Add fighter notes, style analysis, or weaknesses...'}
                            />
                          </div>
                        </div>
                        <button 
                          disabled={isAddingFighter}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                        >
                          {isAddingFighter ? (lang === 'ar' ? 'جاري الإضافة...' : 'Adding...') : t.createProfile}
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 content-start">
                      {fighters.map(fighter => (
                        <div 
                          key={fighter.id} 
                          onClick={() => setViewingFighterId(fighter.id!)}
                          className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:border-red-500/30 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center overflow-hidden text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                              {fighter.photoUrl ? (
                                <img src={fighter.photoUrl} alt={fighter.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold uppercase tracking-tight">{fighter.name}</h5>
                              <p className="text-[10px] uppercase tracking-widest text-white/40">
                                {fighter.stance} • {fighter.record?.wins || 0}-{fighter.record?.losses || 0}-{fighter.record?.draws || 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-red-500 transition-colors" />
                          </div>
                        </div>
                      ))}
                      {fighters.length === 0 && (
                        <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl">
                          <p className="text-xs uppercase tracking-widest text-white/20 italic">{t.noFighters}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <FighterDetailView 
                  fighter={fighters.find(f => f.id === viewingFighterId)!}
                  analyses={analyses.filter(a => a.fighterId === viewingFighterId)}
                  onBack={() => {
                    setViewingFighterId(null);
                    setIsEditingFighter(false);
                  }}
                  onDelete={() => {
                    handleDeleteFighter(viewingFighterId);
                    setViewingFighterId(null);
                  }}
                  isEditing={isEditingFighter}
                  setIsEditing={setIsEditingFighter}
                  onUpdate={handleUpdateFighter}
                  newFighter={newFighter}
                  setNewFighter={setNewFighter}
                  isUpdating={isAddingFighter}
                  fighterPhotoPreview={fighterPhotoPreview}
                  handleFighterPhotoChange={handleFighterPhotoChange}
                  setFighterPhotoPreview={setFighterPhotoPreview}
                />
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                    {t.analysisHistory.split(' ').slice(0, -1).join(' ')} <span className="text-red-600 font-sans">{t.analysisHistory.split(' ').slice(-1)}</span>
                  </h2>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest">{t.historicalTracking}</p>
                </div>
              </div>

              <div className="space-y-4">
                {analyses.map(analysis => (
                  <div key={analysis.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl grid md:grid-cols-4 gap-6 items-center hover:bg-white/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-white/40">Fighter</p>
                      <h5 className="font-bold uppercase tracking-tight">{getFighterName(analysis.fighterId!)}</h5>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-white/40">Date</p>
                      <p className="text-xs font-mono">{new Date(analysis.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      {analysis.scores.map(s => (
                        <div 
                          key={s.pillar} 
                          className="w-4 h-4 rounded-sm" 
                          style={{ backgroundColor: PILLAR_COLORS[s.pillar], opacity: s.score / 10 }}
                          title={`${s.pillar}: ${s.score}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          setResult(analysis);
                          setActiveTab("analyze");
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                ))}
                {analyses.length === 0 && (
                  <div className="py-24 text-center border border-dashed border-white/10 rounded-2xl">
                    <History className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-xs uppercase tracking-widest text-white/20 italic">No historical data found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "system" && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              <div className="max-w-4xl space-y-8">
                <div className="space-y-4">
                  <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none">
                    {t.philosophyTitle.split(' ').slice(0, -1).join(' ')} <span className="text-red-600 font-sans">{t.philosophyTitle.split(' ').slice(-1)}</span>
                  </h2>
                  <p className="text-xl text-white/80 leading-relaxed font-medium">
                    {t.philosophySubtitle}
                  </p>
                </div>
                
                <div className="prose prose-invert max-w-none text-white/60 space-y-6 leading-relaxed">
                  <p>
                    {t.philosophyP1}
                  </p>
                  <p>
                    {t.philosophyP2}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    pillar: Pillar.TECHNIQUE,
                    title: t.pillars.technique.title,
                    description: t.pillars.technique.description,
                    color: PILLAR_COLORS[Pillar.TECHNIQUE]
                  },
                  {
                    pillar: Pillar.COMBAT,
                    title: t.pillars.combat.title,
                    description: t.pillars.combat.description,
                    color: PILLAR_COLORS[Pillar.COMBAT]
                  },
                  {
                    pillar: Pillar.HARMONY,
                    title: t.pillars.harmony.title,
                    description: t.pillars.harmony.description,
                    color: PILLAR_COLORS[Pillar.HARMONY]
                  },
                  {
                    pillar: Pillar.UNION,
                    title: t.pillars.union.title,
                    description: t.pillars.union.description,
                    color: PILLAR_COLORS[Pillar.UNION]
                  },
                  {
                    pillar: Pillar.NOTES,
                    title: t.pillars.notes.title,
                    description: t.pillars.notes.description,
                    color: PILLAR_COLORS[Pillar.NOTES]
                  },
                  {
                    pillar: Pillar.GESTURE,
                    title: t.pillars.gesture.title,
                    description: t.pillars.gesture.description,
                    color: PILLAR_COLORS[Pillar.GESTURE]
                  },
                  {
                    pillar: Pillar.ULTIMATE,
                    title: t.pillars.ultimate.title,
                    description: t.pillars.ultimate.description,
                    color: PILLAR_COLORS[Pillar.ULTIMATE]
                  }
                ].map((item) => {
                  const Icon = PILLAR_ICONS[item.pillar];
                  return (
                    <div key={item.pillar} className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-4 group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold uppercase tracking-widest text-sm">{item.pillar}</h4>
                      </div>
                      <h5 className="text-xs font-bold text-white/80">{item.title}</h5>
                      <p className="text-xs text-white/40 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-center border-t border-white/10 pt-16">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold uppercase tracking-widest italic">{t.neuralAdjudication}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {t.neuralDescription}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-black/40 border border-white/5 rounded-xl space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Latency</p>
                      <p className="text-2xl font-mono font-bold text-red-500">124ms</p>
                    </div>
                    <div className="p-6 bg-black/40 border border-white/5 rounded-xl space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Precision</p>
                      <p className="text-2xl font-mono font-bold text-red-500">99.9%</p>
                    </div>
                  </div>
                </div>
                <div className="aspect-video bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
                    <div className="grid grid-cols-12 h-full w-full">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="border-r border-white/5 h-full" />
                      ))}
                    </div>
                  </div>
                  <Activity className="w-16 h-16 text-red-500 animate-pulse" />
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[8px] uppercase tracking-[0.3em] text-white/40">Physics Core v4.2</p>
                      <p className="text-[10px] font-mono text-emerald-500">SYSTEM_STABLE</p>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-1 h-4 bg-red-500/40 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "founder" && (
            <motion.div
              key="founder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                    The <span className="text-red-600">Origin</span>
                  </h2>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                    Bouabid Cherkaoui & The Birth of TCHUNGU
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                    <Scroll className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {lang === 'ar' ? 'الفصل' : 'Chapter'} {currentChapterIndex + 1} {lang === 'ar' ? 'من' : 'of'} {BOOKLET_CONTENT[lang].length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-4 gap-12">
                {/* Chapter Navigation */}
                <div className="lg:col-span-1 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4 px-4">{lang === 'ar' ? 'الفصول' : 'Chapters'}</h4>
                  {BOOKLET_CONTENT[lang].map((chapter, idx) => (
                    <button
                      key={chapter.id}
                      onClick={() => setCurrentChapterIndex(idx)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border",
                        currentChapterIndex === idx 
                          ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20" 
                          : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10"
                      )}
                    >
                      {idx + 1}. {chapter.title.split(' (')[0]}
                    </button>
                  ))}
                </div>

                {/* Reading Interface */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="p-12 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                      <BookOpen className="w-64 h-64" />
                    </div>
                    
                    <motion.div
                      key={currentChapterIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8 relative z-10"
                    >
                      <div className="space-y-2">
                        <span className="text-red-600 font-mono text-sm font-bold uppercase tracking-[0.3em]">{lang === 'ar' ? 'الفصل' : 'Chapter'} {BOOKLET_CONTENT[lang][currentChapterIndex].id}</span>
                        <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                          {BOOKLET_CONTENT[lang][currentChapterIndex].title}
                        </h3>
                      </div>

                      <div className="prose prose-invert max-w-none">
                        <p className="text-xl text-white/80 leading-relaxed font-serif italic">
                          {BOOKLET_CONTENT[lang][currentChapterIndex].content}
                        </p>
                      </div>

                      <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-start gap-4">
                        <Quote className="w-6 h-6 text-red-600 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-1">{lang === 'ar' ? 'الفكرة الأساسية' : 'Core Insight'}</p>
                          <p className="text-lg font-black uppercase italic tracking-tight text-white">
                            {BOOKLET_CONTENT[lang][currentChapterIndex].keyIdea}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-8 border-t border-white/10">
                        <div className="flex gap-4">
                          <button
                            disabled={currentChapterIndex === 0}
                            onClick={() => setCurrentChapterIndex(prev => prev - 1)}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-20"
                          >
                            {lang === 'ar' ? 'السابق' : 'Previous'}
                          </button>
                          <button
                            disabled={currentChapterIndex === BOOKLET_CONTENT[lang].length - 1}
                            onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-20"
                          >
                            {lang === 'ar' ? 'التالي' : 'Next'}
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab("ai-coach");
                            const initialMsg: ChatMessage = {
                              role: "model",
                              content: lang === 'ar' 
                                ? `أرى أنك تقرأ الفصل ${BOOKLET_CONTENT[lang][currentChapterIndex].id}: ${BOOKLET_CONTENT[lang][currentChapterIndex].title}. هذا الجزء من قصة تشونغو رائع. كيف يمكنني مساعدتك في فهم العمق الفلسفي أو الدروس العملية من هذا الفصل؟`
                                : `I see you're reading Chapter ${BOOKLET_CONTENT[lang][currentChapterIndex].id}: ${BOOKLET_CONTENT[lang][currentChapterIndex].title}. This part of the TCHUNGU origin story is fascinating. How can I help you understand the philosophical depth or the practical lessons from this chapter?`,
                              timestamp: new Date().toISOString()
                            };
                            setChatMessages([initialMsg]);
                          }}
                          className="flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <Brain className="w-4 h-4" />
                          {lang === 'ar' ? 'اسأل الذكاء الاصطناعي حول هذا الفصل' : 'Ask AI about this chapter'}
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  {/* Contextual Link to Analysis */}
                  {result && (
                    <div className="p-8 bg-gradient-to-br from-red-600/20 to-transparent border border-red-600/20 rounded-3xl flex items-center justify-between gap-8">
                      <div className="space-y-2">
                        <h4 className="text-lg font-black uppercase italic tracking-tight">Contextual Connection</h4>
                        <p className="text-sm text-white/60 leading-relaxed max-w-xl">
                          Your current analysis of <span className="text-white font-bold">{result.fighterName}</span> shows a gap in <span className="text-red-500 font-bold">{result.scores.sort((a,b) => a.score - b.score)[0].pillar}</span>. 
                          This directly relates to the lessons of adaptation mentioned in the founder's journey.
                        </p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("ai-coach")}
                        className="shrink-0 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                      >
                        Deep Dive with AI
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "divisions" && (
            <motion.div
              key="divisions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                    {t.divisionsTitle.split(' ').slice(0, -1).join(' ')} <span className="text-red-600 font-sans">{t.divisionsTitle.split(' ').slice(-1)}</span>
                  </h2>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-[0.3em]">
                    {t.divisionsSubtitle}
                  </p>
                </div>
                <div className="max-w-md text-right">
                  <p className="text-xs text-white/40 leading-relaxed uppercase tracking-widest font-bold">
                    {t.divisionsOverview}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {DIVISIONS_DATA[lang].map((division) => (
                  <motion.div
                    key={division.id}
                    whileHover={{ y: -5 }}
                    className={cn(
                      "group p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6 transition-all hover:bg-white/10 hover:border-red-500/50 relative overflow-hidden",
                      result?.dominantDivision === division.id && "border-red-600 bg-red-600/5 ring-1 ring-red-600"
                    )}
                  >
                    {result?.dominantDivision === division.id && (
                      <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] rounded-bl-xl z-10">
                        {lang === 'ar' ? 'موصى به لك' : 'Recommended for You'}
                      </div>
                    )}
                    
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <division.icon className="w-6 h-6" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black uppercase italic tracking-tight leading-tight">
                        {division.title}
                      </h3>
                      <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-widest font-bold">
                        {division.focus}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-red-500 font-black">{lang === 'ar' ? 'الهدف' : 'Goal'}</p>
                        <p className="text-xs text-white/80 leading-relaxed italic">
                          {division.goal}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-red-500 font-black">{lang === 'ar' ? 'مصفوفة التقييم' : 'Evaluation Matrix'}</p>
                        <div className="flex flex-wrap gap-2">
                          {division.evaluation.map((item) => (
                            <span key={item} className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold uppercase tracking-widest text-white/60">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setActiveTab("ai-coach");
                        const initialMsg: ChatMessage = {
                          role: "model",
                          content: lang === 'ar'
                            ? `أرى أنك مهتم بـ ${division.title}. يركز هذا القسم على ${division.focus}. إنه مسار حاسم في نظام تشونغو. كيف يمكنني مساعدتك في تطوير المهارات المحددة المطلوبة لهذا التخصص؟`
                            : `I see you're interested in the ${division.title}. This division focuses on ${division.focus}. It's a critical path in the TCHUNGU system. How can I help you develop the specific skills needed for this specialization?`,
                          timestamp: new Date().toISOString()
                        };
                        setChatMessages([initialMsg]);
                      }}
                      className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all"
                    >
                      {lang === 'ar' ? 'استكشف مسار التدريب' : 'Explore Training Path'}
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="p-12 bg-gradient-to-br from-red-600/10 to-transparent border border-red-600/20 rounded-[3rem] flex flex-col items-center text-center space-y-8">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/40">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="max-w-2xl space-y-4">
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                    {t.levelsTitle}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {t.levelsDescription}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl pt-8 border-t border-white/10">
                  <div className="space-y-1">
                    <p className="text-2xl font-black italic tracking-tighter">0-15</p>
                    <p className="text-[8px] uppercase tracking-widest opacity-40">{lang === 'ar' ? 'مبتدئ' : 'Initiate'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black italic tracking-tighter">16-35</p>
                    <p className="text-[8px] uppercase tracking-widest opacity-40">{lang === 'ar' ? 'ممارس' : 'Practitioner'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black italic tracking-tighter">36-55</p>
                    <p className="text-[8px] uppercase tracking-widest opacity-40">{lang === 'ar' ? 'خبير' : 'Master'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black italic tracking-tighter">56-70</p>
                    <p className="text-[8px] uppercase tracking-widest opacity-40">{lang === 'ar' ? 'أستاذ كبير' : 'Grandmaster'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "ai-coach" && (
            <motion.div
              key="ai-coach"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                    AI <span className="text-red-600">Coach</span>
                  </h2>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                    Specialized skill development tracking
                  </p>
                </div>
                {chatContext && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Context: Active Analysis</span>
                    <button 
                      onClick={() => setChatContext(undefined)}
                      className="text-[10px] text-white/40 hover:text-white transition-colors ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <Brain className="w-12 h-12" />
                      <div className="max-w-sm space-y-2">
                        <p className="text-sm font-bold uppercase tracking-widest">Start a session with your AI Coach</p>
                        <p className="text-xs leading-relaxed">
                          Ask about specific pillars, how to develop your body's mechanics, or get detailed feedback on your latest analysis.
                        </p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col max-w-[80%] space-y-2",
                        msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div 
                        className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                          msg.role === "user" 
                            ? "bg-red-600 text-white rounded-tr-none" 
                            : "bg-white/10 text-white/90 rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[8px] uppercase tracking-widest opacity-30">
                        {msg.role === "user" ? "You" : "AI Coach"} • {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex items-center gap-2 text-red-500 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Coach is thinking...</span>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!chatInput.trim() || isChatting) return;
                      
                      const userMsg: ChatMessage = {
                        role: "user",
                        content: chatInput,
                        timestamp: new Date().toISOString()
                      };
                      
                      const newMessages = [...chatMessages, userMsg];
                      setChatMessages(newMessages);
                      setChatInput("");
                      setIsChatting(true);
                      
                      try {
                        const response = await chatWithAICoach(chatInput, chatMessages, lang, chatContext);
                        const modelMsg: ChatMessage = {
                          role: "model",
                          content: response,
                          timestamp: new Date().toISOString()
                        };
                        const finalMessages = [...newMessages, modelMsg];
                        setChatMessages(finalMessages);
                        
                        if (user && currentSessionId) {
                          await updateDoc(doc(db, "chat_sessions", currentSessionId), {
                            messages: finalMessages,
                            updatedAt: new Date().toISOString()
                          });
                        } else if (user) {
                          const docRef = await addDoc(collection(db, "chat_sessions"), {
                            ownerId: user.uid,
                            messages: finalMessages,
                            updatedAt: new Date().toISOString(),
                            analysisId: chatContext?.id || null
                          });
                          setCurrentSessionId(docRef.id);
                        }
                      } catch (err) {
                        console.error(err);
                        setError("Failed to get response from AI Coach.");
                      } finally {
                        setIsChatting(false);
                      }
                    }}
                    className="flex gap-4"
                  >
                    <input 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask your AI Coach anything..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm outline-none focus:border-red-500 transition-all"
                    />
                    <button 
                      disabled={isChatting || !chatInput.trim()}
                      className="px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-24 py-12 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold uppercase tracking-widest italic">TCHUNGU System</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              The proprietary 7-pillar analysis metric digitizes combat sports adjudication, removing human bias through deep learning and biomechanical physics.
            </p>
          </div>
          <div className="space-y-4">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">System Status</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="opacity-40 uppercase">Neural Engine</span>
                <span className="text-emerald-500 uppercase">Operational</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="opacity-40 uppercase">Physics Core</span>
                <span className="text-emerald-500 uppercase">Operational</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="opacity-40 uppercase">API Latency</span>
                <span className="text-emerald-500 uppercase">124ms</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Legal</h5>
            <div className="flex flex-wrap gap-4 text-[10px] font-mono opacity-40 uppercase">
              <a href="#" className="hover:opacity-100">Privacy Policy</a>
              <a href="#" className="hover:opacity-100">Terms of Service</a>
              <a href="#" className="hover:opacity-100">API Documentation</a>
            </div>
          </div>
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right">
          <Info className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">{error}</span>
          <button onClick={() => setError(null)} className="ml-4 opacity-60 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  );
}

function FighterDetailView({ 
  fighter, 
  analyses, 
  onBack, 
  onDelete, 
  isEditing, 
  setIsEditing, 
  onUpdate,
  newFighter,
  setNewFighter,
  isUpdating,
  fighterPhotoPreview,
  handleFighterPhotoChange,
  setFighterPhotoPreview
}: { 
  fighter: Fighter; 
  analyses: AnalysisResult[]; 
  onBack: () => void; 
  onDelete: () => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onUpdate: (e: React.FormEvent) => void;
  newFighter: any;
  setNewFighter: (val: any) => void;
  isUpdating: boolean;
  fighterPhotoPreview: string | null;
  handleFighterPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFighterPhotoPreview: (val: string | null) => void;
}) {
  const trendData = analyses.slice().reverse().map(a => {
    const data: any = { date: new Date(a.timestamp).toLocaleDateString() };
    a.scores.forEach(s => {
      data[s.pillar] = s.score;
    });
    return data;
  });

  const handleStartEdit = () => {
    setNewFighter({
      name: fighter.name,
      stance: fighter.stance,
      reach: fighter.reach?.toString() || "",
      height: fighter.height?.toString() || "",
      weight: fighter.weight?.toString() || "",
      wins: fighter.record?.wins.toString() || "0",
      losses: fighter.record?.losses.toString() || "0",
      draws: fighter.record?.draws.toString() || "0",
      notes: fighter.notes || "",
      photoUrl: fighter.photoUrl || "",
    });
    setFighterPhotoPreview(fighter.photoUrl || null);
    setIsEditing(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full overflow-hidden flex items-center justify-center">
            {fighter.photoUrl ? (
              <img src={fighter.photoUrl} alt={fighter.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-8 h-8 text-white/20" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">
              {fighter.name}
            </h2>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
              {fighter.stance} • {fighter.record?.wins || 0}-{fighter.record?.losses || 0}-{fighter.record?.draws || 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleStartEdit}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-all"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-lg text-red-500 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={onUpdate} className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-8">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-32 h-32 bg-white/5 border border-white/10 rounded-full flex items-center justify-center overflow-hidden">
                {fighterPhotoPreview ? (
                  <img src={fighterPhotoPreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-12 h-12 text-white/20" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleFighterPhotoChange} className="hidden" />
              </label>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">{t.basicInformation}</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">{t.fullName}</label>
                  <input 
                    required
                    value={newFighter.name}
                    onChange={e => setNewFighter({...newFighter, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.stance}</label>
                    <select 
                      value={newFighter.stance}
                      onChange={e => setNewFighter({...newFighter, stance: e.target.value as any})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    >
                      {['Orthodox', 'Southpaw', 'Switch'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.weight}</label>
                    <input 
                      type="number"
                      value={newFighter.weight}
                      onChange={e => setNewFighter({...newFighter, weight: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">{t.physicalMetricsRecord}</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.reach}</label>
                    <input 
                      type="number"
                      value={newFighter.reach}
                      onChange={e => setNewFighter({...newFighter, reach: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.height}</label>
                    <input 
                      type="number"
                      value={newFighter.height}
                      onChange={e => setNewFighter({...newFighter, height: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.wins}</label>
                    <input 
                      type="number"
                      value={newFighter.wins}
                      onChange={e => setNewFighter({...newFighter, wins: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.losses}</label>
                    <input 
                      type="number"
                      value={newFighter.losses}
                      onChange={e => setNewFighter({...newFighter, losses: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">{t.draws}</label>
                    <input 
                      type="number"
                      value={newFighter.draws}
                      onChange={e => setNewFighter({...newFighter, draws: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">{t.fighterNotes}</label>
            <textarea 
              value={newFighter.notes}
              onChange={e => setNewFighter({...newFighter, notes: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors min-h-[150px] resize-none"
              placeholder={lang === 'ar' ? 'أضف ملاحظات المقاتل...' : 'Add fighter notes...'}
            />
          </div>
          <div className="flex gap-4">
            <button 
              type="submit"
              disabled={isUpdating}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
            >
              {isUpdating ? (lang === 'ar' ? 'جاري التحديث...' : 'Updating...') : t.saveChanges}
            </button>
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 text-red-500" />
                {t.physicalProfile}
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{t.reach.split(' ')[0]}</p>
                  <p className="text-xl font-black">{fighter.reach || "--"} <span className="text-[10px] font-normal text-white/20">in</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{t.height.split(' ')[0]}</p>
                  <p className="text-xl font-black">{fighter.height || "--"} <span className="text-[10px] font-normal text-white/20">in</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{t.weight.split(' ')[0]}</p>
                  <p className="text-xl font-black">{fighter.weight || "--"} <span className="text-[10px] font-normal text-white/20">lbs</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{t.stance}</p>
                  <p className="text-xl font-black">{fighter.stance}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Brain className="w-4 h-4 text-red-500" />
                {t.fighterNotes}
              </h4>
              <div className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">
                {fighter.notes || t.noNotesYet}
              </div>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="space-y-2">
                {analyses.slice(0, 5).map(analysis => (
                  <div key={analysis.id} className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <span className="text-[10px] font-mono opacity-60">{new Date(analysis.timestamp).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      {analysis.scores.map(s => (
                        <div 
                          key={s.pillar} 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: PILLAR_COLORS[s.pillar], opacity: s.score / 10 }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {analyses.length === 0 && (
                  <p className="text-[10px] text-white/20 italic text-center py-4">{t.noAnalysisData}</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  {t.performanceTrends}
                </h4>
                <div className="flex gap-4">
                  {Object.entries(PILLAR_COLORS).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[8px] uppercase tracking-widest opacity-40">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-full h-[300px]">
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#ffffff40" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#ffffff40" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 10]}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                      />
                      {Object.keys(PILLAR_COLORS).map(pillar => (
                        <Line 
                          key={pillar}
                          type="monotone" 
                          dataKey={pillar} 
                          stroke={PILLAR_COLORS[pillar]} 
                          strokeWidth={2}
                          dot={{ r: 3, fill: PILLAR_COLORS[pillar] }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                    <Activity className="w-8 h-8 text-white/10 mb-2" />
                    <p className="text-[10px] uppercase tracking-widest text-white/20 italic">{t.insufficientDataTrend}</p>
                    <p className="text-[8px] uppercase tracking-widest text-white/10 mt-1">{t.requiresTwoSessions}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">{t.totalAnalyses}</p>
                <p className="text-3xl font-black text-red-500">{analyses.length}</p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">{t.avgUltimateScore}</p>
                <p className="text-3xl font-black text-red-500">
                  {(analyses.reduce((acc, a) => acc + (a.scores.find(s => s.pillar === Pillar.ULTIMATE)?.score || 0), 0) / (analyses.length || 1)).toFixed(1)}
                </p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">{t.winRate}</p>
                <p className="text-3xl font-black text-red-500">
                  {((fighter.record?.wins || 0) / ((fighter.record?.wins || 0) + (fighter.record?.losses || 0) + (fighter.record?.draws || 0) || 1) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
