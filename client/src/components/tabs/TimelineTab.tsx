/* TimelineTab — Industrial Dark Console
   Audio timeline with relay trigger editing.
   Triggers sorted by time, editable inline.
   Audio acts as master reference (millisecond resolution). */
import { useProject, Trigger, TriggerAction } from "@/contexts/ProjectContext";
import { useRef, useEffect, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

const ACTIONS: TriggerAction[] = ["ON", "OFF", "TOGGLE", "PULSE"];
const ACTION_COLORS: Record<TriggerAction, string> = {
  ON:     "text-green-400 border-green-700/50 bg-green-900/20",
  OFF:    "text-red-400 border-red-700/50 bg-red-900/20",
  TOGGLE: "text-cyan-400 border-cyan-700/50 bg-cyan-900/20",
  PULSE:  "text-amber-400 border-amber-700/50 bg-amber-900/20",
};

function formatMs(ms: number) {
  const s = (ms / 1000).toFixed(3);
  return s;
}

export default function TimelineTab() {
  const { project, setProject, currentTimeMs, setCurrentTimeMs, isPlaying, setIsPlaying, addLog } = useProject();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);

  const sorted = [...project.timeline].sort((a, b) => a.timeMs - b.timeMs);

  // Sync audio time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTimeMs(Math.round(audio.currentTime * 1000));
    const onDuration = () => setDuration(audio.duration * 1000);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
    };
  }, [setCurrentTimeMs]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  }

  function addTrigger() {
    const t: Trigger = {
      id: nanoid(),
      timeMs: currentTimeMs,
      relay: 1,
      action: "ON",
    };
    setProject(p => ({ ...p, timeline: [...p.timeline, t] }));
    addLog("info", `Added trigger: Relay ${t.relay} ${t.action} @ ${formatMs(t.timeMs)}s`);
  }

  function updateTrigger(id: string, patch: Partial<Trigger>) {
    setProject(p => ({
      ...p,
      timeline: p.timeline.map(t => t.id === id ? { ...t, ...patch } : t),
    }));
  }

  function deleteTrigger(id: string) {
    setProject(p => ({ ...p, timeline: p.timeline.filter(t => t.id !== id) }));
    addLog("warn", "Trigger deleted");
  }

  function duplicateTrigger(t: Trigger) {
    const copy = { ...t, id: nanoid(), timeMs: t.timeMs + 100 };
    setProject(p => ({ ...p, timeline: [...p.timeline, copy] }));
  }

  function moveToNow(id: string) {
    updateTrigger(id, { timeMs: currentTimeMs });
    toast.success(`Moved to ${formatMs(currentTimeMs)}s`);
  }

  function nudge(id: string, delta: number) {
    const t = project.timeline.find(x => x.id === id);
    if (!t) return;
    updateTrigger(id, { timeMs: Math.max(0, t.timeMs + delta) });
  }

  // Timeline ruler progress
  const progress = duration > 0 ? (currentTimeMs / duration) * 100 : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Audio player + controls */}
      <div className="shrink-0 px-4 py-3 border-b border-[#1e2026] bg-[#0d0e10] flex items-center gap-4">
        {project.audioUrl ? (
          <audio ref={audioRef} src={project.audioUrl} />
        ) : (
          <audio ref={audioRef} />
        )}

        <button
          onClick={togglePlay}
          disabled={!project.audioUrl}
          className="w-8 h-8 flex items-center justify-center bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-sm hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Scrubber */}
        <div className="flex-1 relative h-6 flex items-center">
          <div className="w-full h-1.5 bg-[#1e2026] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/60 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={10}
            value={currentTimeMs}
            onChange={e => {
              const ms = Number(e.target.value);
              setCurrentTimeMs(ms);
              if (audioRef.current) audioRef.current.currentTime = ms / 1000;
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="font-mono text-xs text-[#9ca3af] w-28 text-right">
          {formatMs(currentTimeMs)}s / {formatMs(duration)}s
        </span>

        <button
          onClick={addTrigger}
          className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold rounded-sm hover:bg-amber-500/30 transition-colors tracking-wider"
        >
          + ADD TRIGGER
        </button>
      </div>

      {/* Trigger table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[#3a3f4a] font-mono text-sm">
            No triggers — press + ADD TRIGGER at the desired audio time
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-[#0d0e10] border-b border-[#1e2026]">
              <tr>
                {["#", "TIME (s)", "RELAY", "ACTION", "DURATION (ms)", "CONTROLS"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-[#6b7280] tracking-widest font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b border-[#1a1c20] hover:bg-[#14161a] transition-colors ${
                    Math.abs(t.timeMs - currentTimeMs) < 200 ? "bg-amber-900/10" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-[#4b5563]">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={(t.timeMs / 1000).toFixed(3)}
                      step="0.001"
                      min="0"
                      onChange={e => updateTrigger(t.id, { timeMs: Math.round(Number(e.target.value) * 1000) })}
                      className="w-24 bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-0.5 text-[#dde2e8] focus:outline-none focus:border-amber-500/60"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={t.relay}
                      min={1}
                      max={15}
                      onChange={e => updateTrigger(t.id, { relay: Math.min(15, Math.max(1, Number(e.target.value))) })}
                      className="w-14 bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-0.5 text-[#dde2e8] focus:outline-none focus:border-amber-500/60"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={t.action}
                      onChange={e => updateTrigger(t.id, { action: e.target.value as TriggerAction })}
                      className={`bg-[#1a1c20] border rounded-sm px-2 py-0.5 focus:outline-none ${ACTION_COLORS[t.action]}`}
                    >
                      {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {t.action === "PULSE" ? (
                      <input
                        type="number"
                        value={t.duration ?? 250}
                        min={10}
                        step={10}
                        onChange={e => updateTrigger(t.id, { duration: Number(e.target.value) })}
                        className="w-20 bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-0.5 text-[#dde2e8] focus:outline-none focus:border-amber-500/60"
                      />
                    ) : (
                      <span className="text-[#3a3f4a]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn onClick={() => moveToNow(t.id)} title="Move to current time">Now</Btn>
                      <Btn onClick={() => nudge(t.id, -100)}>−</Btn>
                      <Btn onClick={() => nudge(t.id, 100)}>+</Btn>
                      <Btn onClick={() => duplicateTrigger(t)}>⧉</Btn>
                      <Btn onClick={() => deleteTrigger(t.id)} danger>✕</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Btn({ children, onClick, title, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-1.5 py-0.5 text-[10px] font-mono rounded-sm border transition-colors ${
        danger
          ? "border-red-800/50 text-red-500 hover:bg-red-900/30"
          : "border-[#2a2d35] text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#1a1c20]"
      }`}
    >
      {children}
    </button>
  );
}
