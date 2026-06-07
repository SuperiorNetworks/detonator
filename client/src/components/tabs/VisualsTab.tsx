/* VisualsTab — Industrial Dark Console
   Sprite groups: each linked to one relay.
   State recalculated from timeline at current time.
   Independent per-group state — no global switching. */
import { useProject, SpriteGroup } from "@/contexts/ProjectContext";
import { nanoid } from "nanoid";
import { useEffect } from "react";

export default function VisualsTab() {
  const { project, setProject, currentTimeMs } = useProject();

  // Recalculate sprite states from timeline at currentTimeMs
  useEffect(() => {
    setProject(p => ({
      ...p,
      sprites: p.sprites.map(sprite => {
        // Find all triggers for this sprite's relay up to currentTimeMs
        const relayTriggers = p.timeline
          .filter(t => t.relay === sprite.relay && t.timeMs <= currentTimeMs)
          .sort((a, b) => a.timeMs - b.timeMs);

        let state: "before" | "after" = "before";
        for (const t of relayTriggers) {
          if (t.action === "ON" || t.action === "PULSE") state = "after";
          else if (t.action === "OFF") state = "before";
          else if (t.action === "TOGGLE") state = state === "before" ? "after" : "before";
        }
        return { ...sprite, state };
      }),
    }));
  }, [currentTimeMs, setProject]);

  function addSprite() {
    const s: SpriteGroup = {
      id: nanoid(),
      name: `Sprite ${project.sprites.length + 1}`,
      relay: 1,
      beforeUrl: "",
      afterUrl: "",
      state: "before",
    };
    setProject(p => ({ ...p, sprites: [...p.sprites, s] }));
  }

  function updateSprite(id: string, patch: Partial<SpriteGroup>) {
    setProject(p => ({
      ...p,
      sprites: p.sprites.map(s => s.id === id ? { ...s, ...patch } : s),
    }));
  }

  function removeSprite(id: string) {
    setProject(p => ({ ...p, sprites: p.sprites.filter(s => s.id !== id) }));
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: sprite config */}
      <aside className="w-80 border-r border-[#1e2026] bg-[#0d0e10] flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#1e2026] flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase">
            Sprite Groups ({project.sprites.length}/5)
          </span>
          <button
            onClick={addSprite}
            disabled={project.sprites.length >= 5}
            className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono rounded-sm hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >+ ADD</button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1a1c20]">
          {project.sprites.map((s, i) => (
            <div key={s.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400">
                  GROUP {i + 1}
                </span>
                <button
                  onClick={() => removeSprite(s.id)}
                  className="text-[#6b7280] hover:text-red-400 text-xs transition-colors"
                >✕</button>
              </div>

              <SpriteField label="NAME">
                <input
                  value={s.name}
                  onChange={e => updateSprite(s.id, { name: e.target.value })}
                  className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-1 text-xs font-mono text-[#dde2e8] focus:outline-none focus:border-amber-500/60"
                />
              </SpriteField>

              <SpriteField label="RELAY">
                <input
                  type="number"
                  value={s.relay}
                  min={1}
                  max={15}
                  onChange={e => updateSprite(s.id, { relay: Math.min(15, Math.max(1, Number(e.target.value))) })}
                  className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-1 text-xs font-mono text-[#dde2e8] focus:outline-none focus:border-amber-500/60"
                />
              </SpriteField>

              <SpriteField label="BEFORE IMAGE URL">
                <input
                  value={s.beforeUrl}
                  onChange={e => updateSprite(s.id, { beforeUrl: e.target.value })}
                  placeholder="https://…"
                  className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-1 text-xs font-mono text-[#dde2e8] placeholder-[#3a3f4a] focus:outline-none focus:border-amber-500/60"
                />
              </SpriteField>

              <SpriteField label="AFTER IMAGE URL">
                <input
                  value={s.afterUrl}
                  onChange={e => updateSprite(s.id, { afterUrl: e.target.value })}
                  placeholder="https://…"
                  className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-1 text-xs font-mono text-[#dde2e8] placeholder-[#3a3f4a] focus:outline-none focus:border-amber-500/60"
                />
              </SpriteField>

              <div className="flex items-center gap-2 pt-1">
                <div className={`w-2 h-2 rounded-full ${s.state === "after" ? "led-amber" : "led-off"}`} />
                <span className="text-[10px] font-mono text-[#6b7280]">
                  STATE: <span className={s.state === "after" ? "text-amber-400" : "text-[#4b5563]"}>
                    {s.state.toUpperCase()}
                  </span>
                </span>
              </div>
            </div>
          ))}

          {project.sprites.length === 0 && (
            <div className="px-4 py-8 text-[#3a3f4a] text-xs font-mono text-center">
              No sprite groups — add up to 5
            </div>
          )}
        </div>
      </aside>

      {/* Right: visual canvas */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase mb-4">
          Visual Preview
        </div>

        {project.sprites.length === 0 ? (
          <div className="flex items-center justify-center h-64 border border-dashed border-[#2a2d35] rounded text-[#3a3f4a] font-mono text-sm">
            Add sprite groups to see visual simulation
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {project.sprites.map((s, i) => {
              const imgUrl = s.state === "after" ? s.afterUrl : s.beforeUrl;
              return (
                <div
                  key={s.id}
                  className={`border rounded-sm overflow-hidden transition-all duration-200 ${
                    s.state === "after"
                      ? "border-amber-500/50 shadow-[0_0_12px_2px_rgba(245,158,11,0.15)]"
                      : "border-[#1e2026]"
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#14161a] border-b border-[#1e2026]">
                    <span className="text-[10px] font-mono font-bold text-[#6b7280]">
                      {s.name} · R{s.relay}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${s.state === "after" ? "bg-amber-400 shadow-[0_0_4px_1px_rgba(245,158,11,0.7)]" : "bg-[#2a2d35]"}`} />
                      <span className={`text-[9px] font-mono ${s.state === "after" ? "text-amber-400" : "text-[#4b5563]"}`}>
                        {s.state.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="aspect-video bg-[#0a0b0d] flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#2a2d35] font-mono text-xs">
                        {s.state === "after" ? "AFTER" : "BEFORE"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SpriteField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-mono text-[#4b5563] tracking-widest uppercase mb-0.5">{label}</label>
      {children}
    </div>
  );
}
