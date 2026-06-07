/* LiveControlTab — Industrial Dark Console
   Show execution: Load → Simulation → Continuity → Approval → Arm → Countdown → Execute
   Live mode requires continuity pass + user approval + armed state. */
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const WORKFLOW_STEPS = [
  "LOAD PROJECT",
  "SIMULATION",
  "CONTINUITY TEST",
  "APPROVAL",
  "ARM",
  "COUNTDOWN",
  "EXECUTE",
];

export default function LiveControlTab() {
  const { mode, setMode, project, continuityResults, triggerEStop, addLog, setRelayStates, setCurrentTimeMs, setIsPlaying } = useProject();
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [approved, setApproved] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allPass = continuityResults.length > 0 && continuityResults.every(r => r.pass);

  function advanceStep() {
    if (step === 0) {
      // Load
      if (!project.projectName) { toast.error("No project loaded"); return; }
      setStep(1);
      addLog("info", "Workflow: LOAD PROJECT ✓");
    } else if (step === 1) {
      // Simulation
      setMode("simulation");
      setSimRunning(true);
      setIsPlaying(true);
      addLog("info", "Simulation started");
      setTimeout(() => {
        setSimRunning(false);
        setIsPlaying(false);
        setMode("idle");
        setStep(2);
        addLog("info", "Workflow: SIMULATION ✓");
      }, 3000);
    } else if (step === 2) {
      // Continuity
      if (!allPass) { toast.error("Continuity test must pass first (Relay Test tab)"); return; }
      setStep(3);
      addLog("info", "Workflow: CONTINUITY TEST ✓");
    } else if (step === 3) {
      // Approval
      setApproved(true);
      setStep(4);
      addLog("info", "Workflow: APPROVAL GRANTED ✓");
    } else if (step === 4) {
      // Arm
      setMode("armed");
      setStep(5);
      addLog("info", "Workflow: SYSTEM ARMED ✓");
    } else if (step === 5) {
      // Countdown
      setStep(6);
      setCountdown(5);
      let c = 5;
      countdownRef.current = setInterval(() => {
        c--;
        setCountdown(c);
        addLog("info", `Countdown: ${c}`);
        if (c <= 0) {
          clearInterval(countdownRef.current!);
          setMode("live");
          setIsPlaying(true);
          addLog("info", "Workflow: EXECUTE — show running");
        }
      }, 1000);
    }
  }

  function resetWorkflow() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setStep(0);
    setApproved(false);
    setCountdown(5);
    setSimRunning(false);
    setMode("idle");
    setIsPlaying(false);
    setRelayStates(Array(16).fill(false));
    setCurrentTimeMs(0);
    addLog("info", "Workflow reset");
  }

  const stepLabel = WORKFLOW_STEPS[step] ?? "COMPLETE";
  const isExecuting = mode === "live";
  const isEStop = mode === "estop";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: workflow */}
      <aside className="w-72 border-r border-[#1e2026] bg-[#0d0e10] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e2026]">
          <span className="text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase">
            Show Workflow
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {WORKFLOW_STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-sm border text-xs font-mono transition-all",
                i < step
                  ? "border-green-700/40 bg-green-900/10 text-green-400"
                  : i === step
                  ? "border-amber-500/50 bg-amber-900/20 text-amber-400"
                  : "border-[#1e2026] text-[#3a3f4a]"
              )}
            >
              <span className="w-4 text-center font-bold">
                {i < step ? "✓" : i === step ? "▶" : String(i + 1)}
              </span>
              {s}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#1e2026] space-y-2">
          {!isExecuting && !isEStop && step < WORKFLOW_STEPS.length && (
            <button
              onClick={advanceStep}
              disabled={simRunning}
              className="w-full py-2 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold rounded-sm hover:bg-amber-500/30 disabled:opacity-50 transition-colors tracking-wider"
            >
              {simRunning ? "SIMULATING…" : step === 5 ? "START COUNTDOWN" : `ADVANCE: ${WORKFLOW_STEPS[step]}`}
            </button>
          )}
          <button
            onClick={resetWorkflow}
            className="w-full py-2 bg-[#1a1c20] border border-[#2a2d35] text-[#6b7280] text-xs font-mono rounded-sm hover:bg-[#222530] transition-colors"
          >RESET WORKFLOW</button>
        </div>
      </aside>

      {/* Right: status display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {isEStop ? (
          <div className="text-center">
            <div className="text-6xl font-mono font-black text-red-500 tracking-widest animate-pulse mb-4">
              E-STOP
            </div>
            <div className="text-red-400 font-mono text-sm mb-6">All outputs disabled. Reset to continue.</div>
            <button onClick={resetWorkflow} className="px-6 py-3 bg-red-900/30 border border-red-700/50 text-red-400 font-mono text-sm rounded-sm hover:bg-red-900/50 transition-colors">
              RESET SYSTEM
            </button>
          </div>
        ) : step === 5 && mode === "armed" ? (
          <div className="text-center">
            <div className="text-8xl font-mono font-black text-amber-400 mb-4">{countdown}</div>
            <div className="text-amber-300 font-mono text-sm tracking-widest">COUNTDOWN</div>
          </div>
        ) : isExecuting ? (
          <div className="text-center">
            <div className="text-5xl font-mono font-black text-amber-400 tracking-widest mb-4 animate-pulse">
              ▶ LIVE
            </div>
            <div className="text-amber-300 font-mono text-sm mb-2">Show executing on ESP32</div>
            <div className="text-[#6b7280] font-mono text-xs">{project.projectName}</div>
          </div>
        ) : (
          <div className="text-center">
            <div className={cn(
              "text-4xl font-mono font-bold tracking-widest mb-4",
              step === 0 ? "text-[#3a3f4a]" : "text-amber-400"
            )}>
              {stepLabel}
            </div>
            <div className="text-[#6b7280] font-mono text-sm">
              Step {step + 1} of {WORKFLOW_STEPS.length}
            </div>

            {/* Continuity warning */}
            {step === 2 && !allPass && (
              <div className="mt-6 px-4 py-3 bg-red-900/20 border border-red-700/40 rounded-sm text-red-400 font-mono text-xs max-w-xs">
                ✗ Continuity test required — go to Relay Test tab and run the test first
              </div>
            )}

            {/* Project info */}
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <Stat label="PROJECT" value={project.projectName} />
              <Stat label="TRIGGERS" value={String(project.timeline.length)} />
              <Stat label="CONTINUITY" value={continuityResults.length === 0 ? "NOT RUN" : allPass ? "PASS" : "FAIL"} color={continuityResults.length === 0 ? undefined : allPass ? "text-green-400" : "text-red-400"} />
              <Stat label="MODE" value={mode.toUpperCase()} color={(mode as string) === "armed" || (mode as string) === "live" ? "text-amber-400" : undefined} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#14161a] border border-[#1e2026] rounded-sm p-3 text-center">
      <div className={cn("text-sm font-mono font-bold", color ?? "text-[#9ca3af]")}>{value}</div>
      <div className="text-[9px] font-mono text-[#4b5563] tracking-widest mt-0.5">{label}</div>
    </div>
  );
}
