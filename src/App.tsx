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
  Link
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
import { AnalysisResult, Pillar, Fighter, ChatMessage } from "./types";
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

type Tab = "analyze" | "fighters" | "history" | "system" | "ai-coach";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  
  // Analysis State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      setFile(selectedFile);
      setVideoUrl("");
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null);
      setError(null);
      setSaveSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
      "video/*": [".mp4", ".mov", ".avi"],
    },
    multiple: false,
  } as any);

  const handleAnalyze = async () => {
    if (!videoUrl && (!file || !preview)) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      let analysis;
      if (videoUrl) {
        analysis = await analyzeCombatVideoUrl(videoUrl);
      } else {
        const isPhoto = file!.type.startsWith("image/");
        analysis = await analyzeCombatMedia(preview!, file!.type, isPhoto);
      }
      setResult(analysis);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze media. Please try again.");
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
              Analyze
            </button>
            <button 
              onClick={() => setActiveTab("fighters")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "fighters" && "text-red-500 opacity-100")}
            >
              Fighters
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "history" && "text-red-500 opacity-100")}
            >
              History
            </button>
            <button 
              onClick={() => setActiveTab("system")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "system" && "text-red-500 opacity-100")}
            >
              System
            </button>
            <button 
              onClick={() => setActiveTab("ai-coach")}
              className={cn("hover:text-red-500 transition-colors", activeTab === "ai-coach" && "text-red-500 opacity-100")}
            >
              AI Coach
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[8px] uppercase tracking-widest text-white/40 hover:text-red-500 transition-colors">Sign Out</button>
                </div>
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-white/20" />
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <User className="w-3 h-3" />
                Sign In
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
                        Objective <br />
                        <span className="text-red-600">Combat</span> <br />
                        Intelligence
                      </h2>
                      <p className="text-lg text-white/60 max-w-md leading-relaxed">
                        The TCHUNGU System replaces subjective bias with mathematical precision. 
                        Upload combat footage for frame-by-frame 7-pillar analysis.
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
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/50">
                              <Play className="w-8 h-8 text-white fill-current" />
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-widest">Click to Change</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-white/40 group-hover:text-red-500 transition-colors" />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm font-bold uppercase tracking-widest">Drop Combat Media</p>
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
                        Initialize Analysis
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
                    <h3 className="text-2xl font-bold uppercase tracking-widest italic">Processing Neural Layers</h3>
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
                          Analysis <span className="text-red-600">Report</span>
                        </h2>
                        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                          Session ID: {Math.random().toString(36).substring(7).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    {user && (
                      <div className="flex items-center gap-4">
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
                      <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-black relative">
                        {file?.type.startsWith("video/") ? (
                          <video src={preview!} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={preview!} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-red-500">
                          <Info className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-widest">Executive Summary</h4>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed italic font-serif italic">
                          "{result?.summary}"
                        </p>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
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
                          Add New Fighter
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
                            <label className="text-[10px] uppercase tracking-widest text-white/40">Full Name</label>
                            <input 
                              required
                              value={newFighter.name}
                              onChange={e => setNewFighter({...newFighter, name: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              placeholder="e.g. Alex Pereira"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Stance</label>
                              <select 
                                value={newFighter.stance}
                                onChange={e => setNewFighter({...newFighter, stance: e.target.value as any})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              >
                                <option value="Orthodox">Orthodox</option>
                                <option value="Southpaw">Southpaw</option>
                                <option value="Switch">Switch</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Weight (lbs)</label>
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
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Reach (in)</label>
                              <input 
                                type="number"
                                value={newFighter.reach}
                                onChange={e => setNewFighter({...newFighter, reach: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                                placeholder="79"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Height (in)</label>
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
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Wins</label>
                              <input 
                                type="number"
                                value={newFighter.wins}
                                onChange={e => setNewFighter({...newFighter, wins: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Losses</label>
                              <input 
                                type="number"
                                value={newFighter.losses}
                                onChange={e => setNewFighter({...newFighter, losses: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase tracking-widest text-white/40">Draws</label>
                              <input 
                                type="number"
                                value={newFighter.draws}
                                onChange={e => setNewFighter({...newFighter, draws: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-white/40">Notes</label>
                            <textarea 
                              value={newFighter.notes}
                              onChange={e => setNewFighter({...newFighter, notes: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors min-h-[100px] resize-none"
                              placeholder="Add fighter notes, style analysis, or weaknesses..."
                            />
                          </div>
                        </div>
                        <button 
                          disabled={isAddingFighter}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                        >
                          {isAddingFighter ? "Adding..." : "Create Profile"}
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
                          <p className="text-xs uppercase tracking-widest text-white/20 italic">No fighters registered yet</p>
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
                    Analysis <span className="text-red-600">History</span>
                  </h2>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Historical performance tracking</p>
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
                    The <span className="text-red-600">tChungu</span> <br />
                    Philosophy
                  </h2>
                  <p className="text-xl text-white/80 leading-relaxed font-medium">
                    tChungu is more than a system; it is a core philosophy for every fighter, coach, and practitioner seeking to master the art of combat.
                  </p>
                </div>
                
                <div className="prose prose-invert max-w-none text-white/60 space-y-6 leading-relaxed">
                  <p>
                    Our mission is to reach every practitioner and make them aware of the vital importance of tChungu in developing the skills of every fighter—whether in self-defense, mixed martial arts, cage boxing, or the traditional ring. We establish this idea as a fundamental path for anyone seeking to transcend their current limits.
                  </p>
                  <p>
                    To make this philosophy clear, we present it through two main directions that converge into a thorough and detailed mastery of combat. Each of the seven pillars represents a complete system, studied from A to Z, integrating the physical and psychological worlds.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    pillar: Pillar.TECHNIQUE,
                    title: "Technique (T): The Mechanics of Being",
                    description: "Technique is the study of the body's mechanics: how it moves, coordinates, and reaches its goals. It involves the physical world—strength, joints, and the energy present inside organs, nerves, and muscles—and the psychological world that directs it. Building good technique requires understanding the basic permanent joints and the energy flow required to create any movement.",
                    color: PILLAR_COLORS[Pillar.TECHNIQUE]
                  },
                  {
                    pillar: Pillar.COMBAT,
                    title: "Combat (C): Intelligent Engagement",
                    description: "Combat is the exploitation of gaps and weaknesses. We reach these vulnerabilities by deceiving the opponent's body through intelligent, calculated movements. It is the art of creating a defect in the mechanisms of the other body to achieve dominance.",
                    color: PILLAR_COLORS[Pillar.COMBAT]
                  },
                  {
                    pillar: Pillar.HARMONY,
                    title: "Harmony (H): Fluid Integration",
                    description: "The balance between the physical and psychological worlds. Harmony ensures that energy is extracted and accessed efficiently, maintaining fluidity even under extreme pressure.",
                    color: PILLAR_COLORS[Pillar.HARMONY]
                  },
                  {
                    pillar: Pillar.UNION,
                    title: "Union (U): The Science of Engineering",
                    description: "Knowledge of the formation of bodily energy and how to access it. Union applies the principles of physics, mathematics, and detailed engineering to the human form, building muscles and movements that act as a single, cohesive unit.",
                    color: PILLAR_COLORS[Pillar.UNION]
                  },
                  {
                    pillar: Pillar.NOTES,
                    title: "Notes (N): Tactical Intelligence",
                    description: "The psychological world of combat. It involves tactical awareness, pattern recognition, and the intelligence required to focus on the minute details of every pillar, turning them into a basic philosophy of action.",
                    color: PILLAR_COLORS[Pillar.NOTES]
                  },
                  {
                    pillar: Pillar.GESTURE,
                    title: "Gesture (G): Deceptive Movement",
                    description: "The use of intelligent movements to deceive and manipulate the opponent's perception. Gesture is the bridge between thought and impact, using biomechanics to hide intent until the moment of execution.",
                    color: PILLAR_COLORS[Pillar.GESTURE]
                  },
                  {
                    pillar: Pillar.ULTIMATE,
                    title: "Ultimate (U): The Peak of Mastery",
                    description: "The final objective where intelligence, strength, and philosophy meet. Reaching the Ultimate means ending the match with absolute precision, having mastered the world of physics and psychology to achieve total victory.",
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
                    <h3 className="text-2xl font-bold uppercase tracking-widest italic">Neural Adjudication</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Our neural engine processes 240 frames per second, identifying over 1,200 biomechanical data points per fighter. 
                      This data is fed into a custom physics core that calculates real-time energy transfer, removing the "eye test" from the scoring process.
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
                        const response = await chatWithAICoach(chatInput, chatMessages, chatContext);
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
              <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">Basic Information</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Full Name</label>
                  <input 
                    required
                    value={newFighter.name}
                    onChange={e => setNewFighter({...newFighter, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Stance</label>
                    <select 
                      value={newFighter.stance}
                      onChange={e => setNewFighter({...newFighter, stance: e.target.value as any})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    >
                      <option value="Orthodox">Orthodox</option>
                      <option value="Southpaw">Southpaw</option>
                      <option value="Switch">Switch</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Weight (lbs)</label>
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
              <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">Physical Metrics & Record</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Reach (in)</label>
                    <input 
                      type="number"
                      value={newFighter.reach}
                      onChange={e => setNewFighter({...newFighter, reach: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Height (in)</label>
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
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Wins</label>
                    <input 
                      type="number"
                      value={newFighter.wins}
                      onChange={e => setNewFighter({...newFighter, wins: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Losses</label>
                    <input 
                      type="number"
                      value={newFighter.losses}
                      onChange={e => setNewFighter({...newFighter, losses: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Draws</label>
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
            <label className="text-[10px] uppercase tracking-widest text-white/40">Notes</label>
            <textarea 
              value={newFighter.notes}
              onChange={e => setNewFighter({...newFighter, notes: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500 transition-colors min-h-[150px] resize-none"
              placeholder="Add fighter notes..."
            />
          </div>
          <div className="flex gap-4">
            <button 
              type="submit"
              disabled={isUpdating}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Save Changes"}
            </button>
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 text-red-500" />
                Physical Profile
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Reach</p>
                  <p className="text-xl font-black">{fighter.reach || "--"} <span className="text-[10px] font-normal text-white/20">in</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Height</p>
                  <p className="text-xl font-black">{fighter.height || "--"} <span className="text-[10px] font-normal text-white/20">in</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Weight</p>
                  <p className="text-xl font-black">{fighter.weight || "--"} <span className="text-[10px] font-normal text-white/20">lbs</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Stance</p>
                  <p className="text-xl font-black">{fighter.stance}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Brain className="w-4 h-4 text-red-500" />
                Fighter Notes
              </h4>
              <div className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">
                {fighter.notes || "No notes added yet."}
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
                  <p className="text-[10px] text-white/20 italic text-center py-4">No analysis data available</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  Performance Trends
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
                    <p className="text-[10px] uppercase tracking-widest text-white/20 italic">Insufficient data for trend analysis</p>
                    <p className="text-[8px] uppercase tracking-widest text-white/10 mt-1">Requires at least 2 analysis sessions</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Total Analyses</p>
                <p className="text-3xl font-black text-red-500">{analyses.length}</p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Avg. Ultimate Score</p>
                <p className="text-3xl font-black text-red-500">
                  {(analyses.reduce((acc, a) => acc + (a.scores.find(s => s.pillar === Pillar.ULTIMATE)?.score || 0), 0) / (analyses.length || 1)).toFixed(1)}
                </p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Win Rate</p>
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
