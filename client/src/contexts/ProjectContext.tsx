/* ============================================================
   ProjectContext — Industrial Dark Console design system
   Manages all project state: timeline triggers, sprites,
   cameras, relay config, simulation/live mode, continuity.
   ============================================================ */
import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type TriggerAction = "ON" | "OFF" | "TOGGLE" | "PULSE";

export interface Trigger {
  id: string;
  timeMs: number;
  relay: number;
  action: TriggerAction;
  duration?: number; // ms, only for PULSE
}

export interface SpriteGroup {
  id: string;
  name: string;
  relay: number;
  beforeUrl: string;
  afterUrl: string;
  state: "before" | "after";
}

export interface Camera {
  id: string;
  name: string;
  ip: string;
  streamUrl: string;
  snapshotUrl: string;
}

export interface RelayConfig {
  relay: number;
  name: string;
  gpio: number;
  activeLow: boolean;
  pulseMs: number;
}

export interface Project {
  projectName: string;
  description: string;
  audioUrl: string;
  timeline: Trigger[];
  sprites: SpriteGroup[];
  cameras: Camera[];
  relayConfig: RelayConfig[];
}

export type SystemMode = "idle" | "simulation" | "continuity" | "armed" | "live" | "estop";

export interface ContinuityResult {
  relay: number;
  pass: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "info" | "warn" | "error" | "event";
  message: string;
}

interface ProjectContextValue {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  mode: SystemMode;
  setMode: (m: SystemMode) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  currentTimeMs: number;
  setCurrentTimeMs: (t: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  continuityResults: ContinuityResult[];
  setContinuityResults: React.Dispatch<React.SetStateAction<ContinuityResult[]>>;
  relayStates: boolean[];
  setRelayStates: React.Dispatch<React.SetStateAction<boolean[]>>;
  logs: LogEntry[];
  addLog: (type: LogEntry["type"], message: string) => void;
  clearLogs: () => void;
  triggerEStop: () => void;
  projects: string[];
  setProjects: React.Dispatch<React.SetStateAction<string[]>>;
}

const defaultRelayConfig: RelayConfig[] = Array.from({ length: 16 }, (_, i) => ({
  relay: i + 1,
  name: i === 15 ? "Continuity Test" : `Effect ${i + 1}`,
  gpio: i + 4,
  activeLow: true,
  pulseMs: 250,
}));

const defaultProject: Project = {
  projectName: "New Project",
  description: "",
  audioUrl: "",
  timeline: [],
  sprites: [],
  cameras: [],
  relayConfig: defaultRelayConfig,
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

let logCounter = 0;

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(defaultProject);
  const [mode, setModeState] = useState<SystemMode>("idle");
  const [activeTab, setActiveTab] = useState("project");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [continuityResults, setContinuityResults] = useState<ContinuityResult[]>([]);
  const [relayStates, setRelayStates] = useState<boolean[]>(Array(16).fill(false));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [projects, setProjects] = useState<string[]>(["Demo Show", "Test Event"]);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs(prev => [
      ...prev.slice(-199),
      { id: String(++logCounter), timestamp: Date.now(), type, message },
    ]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const setMode = useCallback((m: SystemMode) => {
    setModeState(m);
    addLog("info", `System mode → ${m.toUpperCase()}`);
  }, [addLog]);

  const triggerEStop = useCallback(() => {
    setModeState("estop");
    setIsPlaying(false);
    setRelayStates(Array(16).fill(false));
    addLog("error", "E-STOP ACTIVATED — all outputs disabled");
  }, [addLog]);

  return (
    <ProjectContext.Provider value={{
      project, setProject,
      mode, setMode,
      activeTab, setActiveTab,
      currentTimeMs, setCurrentTimeMs,
      isPlaying, setIsPlaying,
      continuityResults, setContinuityResults,
      relayStates, setRelayStates,
      logs, addLog, clearLogs,
      triggerEStop,
      projects, setProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
