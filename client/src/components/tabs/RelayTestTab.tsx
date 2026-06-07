/* RelayTestTab — Industrial Dark Console
   Relay diagnostics: individual toggle, continuity test sequence.
   Relay 16 reserved for continuity test only. */
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function RelayTestTab() {
  const { relayStates, setRelayStates, continuityResults, setContinuityResults, addLog, project, setProject } = useProject();
  const [testing, setTesting] = useState(false);

  function toggleRelay(idx: number) {
    if (idx === 15) return; // relay 16 reserved
    setRelayStates(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      addLog("info", `Relay ${idx + 1} → ${next[idx] ? "ON" : "OFF"}`);
      return next;
    });
  }

  function allOff() {
    setRelayStates(Array(16).fill(false));
    addLog("info", "All relays → OFF");
  }

  async function runContinuityTest() {
    setTesting(true);
    addLog("info", "Continuity test started");
    // Simulate: all OFF → relay 16 ON → read → relay 16 OFF
    setRelayStates(Array(16).fill(false));
    await delay(300);
    setRelayStates(prev => { const n = [...prev]; n[15] = true; return n; });
    await delay(500);
    // Simulate results based on relay config
    const results = project.relayConfig.slice(0, 15).map(rc => ({
      relay: rc.relay,
      pass: Math.random() > 0.15, // simulated
    }));
    setContinuityResults(results);
    setRelayStates(Array(16).fill(false));
    const failed = results.filter(r => !r.pass);
    if (failed.length === 0) {
      addLog("info", "Continuity test PASSED — all circuits detected");
    } else {
      addLog("error", `Continuity test FAILED — ${failed.length} circuit(s) missing: ${failed.map(r => `R${r.relay}`).join(", ")}`);
    }
    setTesting(false);
  }

  function updateRelayName(idx: number, name: string) {
    setProject(p => ({
      ...p,
      relayConfig: p.relayConfig.map((rc, i) => i === idx ? { ...rc, name } : rc),
    }));
  }

  const allPass = continuityResults.length > 0 && continuityResults.every(r => r.pass);
  const anyFail = continuityResults.some(r => !r.pass);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Relay grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono font-bold text-amber-400 tracking-widest uppercase">
            Relay Diagnostics
          </h2>
          <div className="flex gap-2">
            <button
              onClick={allOff}
              className="px-3 py-1.5 bg-[#1a1c20] border border-[#2a2d35] text-[#9ca3af] text-xs font-mono rounded-sm hover:bg-[#222530] transition-colors"
            >ALL OFF</button>
            <button
              onClick={runContinuityTest}
              disabled={testing}
              className="px-3 py-1.5 bg-cyan-900/30 border border-cyan-700/50 text-cyan-400 text-xs font-mono rounded-sm hover:bg-cyan-900/50 disabled:opacity-50 transition-colors"
            >{testing ? "TESTING…" : "RUN CONTINUITY TEST"}</button>
          </div>
        </div>

        <div className="grid grid-cols-4 xl:grid-cols-5 gap-3">
          {project.relayConfig.map((rc, i) => {
            const isReserved = i === 15;
            const isOn = relayStates[i];
            const contResult = continuityResults.find(r => r.relay === rc.relay);

            return (
              <div
                key={rc.relay}
                onClick={() => !isReserved && toggleRelay(i)}
                className={cn(
                  "relative border rounded-sm p-3 transition-all duration-120 select-none",
                  isReserved
                    ? "border-[#2a2d35] bg-[#0d0e10] cursor-not-allowed opacity-50"
                    : isOn
                    ? "border-amber-500/60 bg-amber-900/20 cursor-pointer shadow-[0_0_8px_1px_rgba(245,158,11,0.2)]"
                    : "border-[#1e2026] bg-[#0d0e10] cursor-pointer hover:bg-[#14161a] hover:border-[#2a2d35]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-[#6b7280]">R{rc.relay}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isOn ? "bg-amber-400 shadow-[0_0_4px_1px_rgba(245,158,11,0.7)]" : "bg-[#2a2d35]"
                  )} />
                </div>
                <div className="text-xs font-mono text-[#9ca3af] truncate mb-1">
                  {isReserved ? "CONT. TEST" : (
                    <input
                      value={rc.name}
                      onChange={e => { e.stopPropagation(); updateRelayName(i, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className="w-full bg-transparent text-[#9ca3af] focus:outline-none focus:text-amber-400"
                    />
                  )}
                </div>
                {contResult && (
                  <div className={cn(
                    "text-[9px] font-mono font-bold tracking-widest mt-1",
                    contResult.pass ? "text-green-400" : "text-red-400"
                  )}>
                    {contResult.pass ? "✓ PASS" : "✗ FAIL"}
                  </div>
                )}
                <div className={cn(
                  "text-[9px] font-mono font-bold tracking-widest",
                  isOn ? "text-amber-400" : "text-[#3a3f4a]"
                )}>
                  {isReserved ? "RESERVED" : isOn ? "ON" : "OFF"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: continuity results */}
      <aside className="w-56 border-l border-[#1e2026] bg-[#0d0e10] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e2026]">
          <span className="text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase">
            Continuity Results
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {continuityResults.length === 0 ? (
            <div className="text-[#3a3f4a] font-mono text-xs text-center py-8">
              Run continuity test to see results
            </div>
          ) : (
            <>
              <div className={cn(
                "text-center py-2 mb-3 rounded-sm text-xs font-mono font-bold tracking-widest",
                allPass ? "bg-green-900/30 border border-green-700/50 text-green-400" : "bg-red-900/30 border border-red-700/50 text-red-400"
              )}>
                {allPass ? "✓ ALL PASS" : `✗ ${continuityResults.filter(r => !r.pass).length} FAIL`}
              </div>
              <div className="space-y-1">
                {continuityResults.map(r => (
                  <div key={r.relay} className="flex items-center justify-between px-2 py-1 rounded-sm bg-[#14161a]">
                    <span className="text-xs font-mono text-[#6b7280]">R{r.relay}</span>
                    <span className={cn("text-xs font-mono font-bold", r.pass ? "text-green-400" : "text-red-400")}>
                      {r.pass ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
