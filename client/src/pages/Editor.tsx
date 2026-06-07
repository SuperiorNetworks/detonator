/* ============================================================
   Editor.tsx — Industrial Dark Console
   Main layout: persistent left sidebar, top tab bar,
   content area with right inspector panel.
   Amber = active/armed, Red = E-stop/fail, Green = pass.
   ============================================================ */
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import ProjectTab from "@/components/tabs/ProjectTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import VisualsTab from "@/components/tabs/VisualsTab";
import CamerasTab from "@/components/tabs/CamerasTab";
import RelayTestTab from "@/components/tabs/RelayTestTab";
import LiveControlTab from "@/components/tabs/LiveControlTab";
import LogsTab from "@/components/tabs/LogsTab";
import StatusBar from "@/components/StatusBar";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "project",   label: "PROJECT",   icon: "📁" },
  { id: "timeline",  label: "TIMELINE",  icon: "🎵" },
  { id: "visuals",   label: "VISUALS",   icon: "🖼" },
  { id: "cameras",   label: "CAMERAS",   icon: "📷" },
  { id: "relaytest", label: "RELAY TEST",icon: "🔌" },
  { id: "live",      label: "LIVE CTRL", icon: "▶" },
  { id: "logs",      label: "LOGS",      icon: "📋" },
];

function EditorInner() {
  const { activeTab, setActiveTab, mode, triggerEStop } = useProject();

  const headerBg =
    mode === "armed" || mode === "live"
      ? "bg-amber-900/60 border-amber-500/60"
      : mode === "estop"
      ? "bg-red-900/60 border-red-500/60"
      : "bg-[#0d0e10] border-[#1e2026]";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0e10] text-[#dde2e8]">
      {/* ── Top Header Bar ── */}
      <header className={cn(
        "flex items-center justify-between px-4 h-12 border-b shrink-0 transition-colors duration-200",
        headerBg
      )}>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-amber-400 text-sm tracking-widest uppercase">
            ShowCtrl
          </span>
          <span className="text-[#3a3f4a] text-xs font-mono">v1.0</span>
        </div>

        {/* Tab bar */}
        <nav className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1 text-xs font-mono font-semibold tracking-wider rounded-sm transition-all duration-120",
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "text-[#6b7280] hover:text-[#9ca3af] hover:bg-white/5 border border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* E-Stop */}
        <button
          onClick={triggerEStop}
          className={cn(
            "px-4 py-1.5 text-xs font-mono font-bold tracking-widest rounded-sm border transition-all duration-120 active:scale-95",
            mode === "estop"
              ? "bg-red-600 border-red-400 text-white animate-pulse"
              : "bg-red-900/40 border-red-700/60 text-red-400 hover:bg-red-800/60 hover:border-red-500"
          )}
        >
          ■ E-STOP
        </button>
      </header>

      {/* ── Content Area ── */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "project"   && <ProjectTab />}
        {activeTab === "timeline"  && <TimelineTab />}
        {activeTab === "visuals"   && <VisualsTab />}
        {activeTab === "cameras"   && <CamerasTab />}
        {activeTab === "relaytest" && <RelayTestTab />}
        {activeTab === "live"      && <LiveControlTab />}
        {activeTab === "logs"      && <LogsTab />}
      </main>

      {/* ── Status Bar ── */}
      <StatusBar />
    </div>
  );
}

export default function Editor() {
  return (
    <ProjectProvider>
      <EditorInner />
    </ProjectProvider>
  );
}
