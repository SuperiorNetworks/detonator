/* LogsTab — Industrial Dark Console
   Event history: login, approval, trigger execution,
   continuity results, errors, E-stop activation. */
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

const TYPE_STYLES = {
  info:  "text-[#9ca3af]",
  warn:  "text-amber-400",
  error: "text-red-400",
  event: "text-cyan-400",
};

const TYPE_PREFIX = {
  info:  "INFO ",
  warn:  "WARN ",
  error: "ERR  ",
  event: "EVENT",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

export default function LogsTab() {
  const { logs, clearLogs } = useProject();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#1e2026] bg-[#0d0e10]">
        <span className="text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase">
          Event Log ({logs.length} entries)
        </span>
        <button
          onClick={clearLogs}
          className="px-3 py-1 bg-[#1a1c20] border border-[#2a2d35] text-[#6b7280] text-xs font-mono rounded-sm hover:bg-[#222530] hover:text-[#9ca3af] transition-colors"
        >CLEAR</button>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs bg-[#0a0b0d]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#3a3f4a]">
            No log entries yet
          </div>
        ) : (
          <div className="divide-y divide-[#12141a]">
            {[...logs].reverse().map(entry => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-1.5 hover:bg-[#12141a] transition-colors">
                <span className="text-[#3a3f4a] shrink-0 w-28">{formatTime(entry.timestamp)}</span>
                <span className={cn("shrink-0 font-bold w-10", TYPE_STYLES[entry.type])}>
                  {TYPE_PREFIX[entry.type]}
                </span>
                <span className={cn(TYPE_STYLES[entry.type])}>{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
