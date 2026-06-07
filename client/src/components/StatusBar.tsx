/* StatusBar — Industrial Dark Console */
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ms2 = ms % 1000;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(ms2).padStart(3,"0")}`;
}

export default function StatusBar() {
  const { mode, currentTimeMs, project, relayStates } = useProject();

  const activeCount = relayStates.filter(Boolean).length;

  const modeColor =
    mode === "armed" || mode === "live" ? "text-amber-400" :
    mode === "estop" ? "text-red-400" :
    mode === "simulation" ? "text-cyan-400" :
    "text-[#6b7280]";

  return (
    <footer className="flex items-center justify-between px-4 h-7 bg-[#0a0b0d] border-t border-[#1e2026] text-[10px] font-mono shrink-0">
      <div className="flex items-center gap-4">
        <span className={cn("font-bold tracking-widest uppercase", modeColor)}>
          {mode === "idle" ? "STANDBY" : mode.toUpperCase()}
        </span>
        <span className="text-[#3a3f4a]">|</span>
        <span className="text-[#6b7280]">
          PROJECT: <span className="text-[#9ca3af]">{project.projectName}</span>
        </span>
        <span className="text-[#3a3f4a]">|</span>
        <span className="text-[#6b7280]">
          RELAYS ACTIVE: <span className={cn(activeCount > 0 ? "text-amber-400" : "text-[#6b7280]")}>{activeCount}</span>/15
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[#6b7280]">
          TIME: <span className="text-[#9ca3af]">{formatMs(currentTimeMs)}</span>
        </span>
        <span className="text-[#3a3f4a]">|</span>
        <span className="text-[#4b5563]">ShowCtrl Editor v1.0 — ESP32 T-Display S3</span>
      </div>
    </footer>
  );
}
