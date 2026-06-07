/* ProjectTab — Industrial Dark Console */
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

export default function ProjectTab() {
  const { project, setProject, projects, setProjects, addLog } = useProject();
  const [newName, setNewName] = useState("");

  function handleCreate() {
    const name = newName.trim() || `Project ${projects.length + 1}`;
    setProjects(p => [...p, name]);
    setProject(prev => ({ ...prev, projectName: name, timeline: [], sprites: [], audioUrl: "" }));
    addLog("info", `Created project: ${name}`);
    setNewName("");
    toast.success(`Project "${name}" created`);
  }

  function handleLoad(name: string) {
    setProject(prev => ({ ...prev, projectName: name }));
    addLog("info", `Loaded project: ${name}`);
    toast.success(`Loaded "${name}"`);
  }

  function handleDelete(name: string) {
    setProjects(p => p.filter(x => x !== name));
    addLog("warn", `Deleted project: ${name}`);
    toast.warning(`Deleted "${name}"`);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.projectName.replace(/\s+/g, "_")}.tdproj`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("info", `Exported project: ${project.projectName}`);
    toast.success("Project exported as .tdproj");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setProject(data);
        addLog("info", `Imported project: ${data.projectName}`);
        toast.success(`Imported "${data.projectName}"`);
      } catch {
        toast.error("Invalid .tdproj file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: project list */}
      <aside className="w-64 border-r border-[#1e2026] bg-[#0d0e10] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e2026]">
          <span className="text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase">
            Projects
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {projects.map(name => (
            <div
              key={name}
              className={`group flex items-center justify-between px-4 py-2 cursor-pointer border-b border-[#1a1c20] hover:bg-[#1a1c20] transition-colors ${
                project.projectName === name ? "bg-amber-900/20 border-l-2 border-l-amber-500" : ""
              }`}
              onClick={() => handleLoad(name)}
            >
              <span className="text-xs font-mono text-[#9ca3af] truncate">{name}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(name); }}
                className="opacity-0 group-hover:opacity-100 text-[#6b7280] hover:text-red-400 text-xs ml-2 transition-opacity"
              >✕</button>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="px-4 py-6 text-[#3a3f4a] text-xs font-mono text-center">
              No projects yet
            </div>
          )}
        </div>
        {/* New project input */}
        <div className="p-3 border-t border-[#1e2026] flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Project name…"
            className="flex-1 bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-1 text-xs font-mono text-[#9ca3af] placeholder-[#3a3f4a] focus:outline-none focus:border-amber-500/60"
          />
          <button
            onClick={handleCreate}
            className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono rounded-sm hover:bg-amber-500/30 transition-colors"
          >+</button>
        </div>
      </aside>

      {/* Right: project details */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-xl">
          <h2 className="text-sm font-mono font-bold text-amber-400 tracking-widest uppercase mb-6">
            Project Settings
          </h2>

          <div className="space-y-4">
            <Field label="PROJECT NAME">
              <input
                value={project.projectName}
                onChange={e => setProject(p => ({ ...p, projectName: e.target.value }))}
                className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-3 py-2 text-sm font-mono text-[#dde2e8] focus:outline-none focus:border-amber-500/60"
              />
            </Field>

            <Field label="DESCRIPTION">
              <textarea
                value={project.description}
                onChange={e => setProject(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-3 py-2 text-sm font-mono text-[#dde2e8] focus:outline-none focus:border-amber-500/60 resize-none"
              />
            </Field>

            <Field label="AUDIO FILE (URL or path)">
              <input
                value={project.audioUrl}
                onChange={e => setProject(p => ({ ...p, audioUrl: e.target.value }))}
                placeholder="https://… or /audio/show.mp3"
                className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-3 py-2 text-sm font-mono text-[#dde2e8] placeholder-[#3a3f4a] focus:outline-none focus:border-amber-500/60"
              />
            </Field>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold rounded-sm hover:bg-amber-500/30 transition-colors tracking-wider"
            >
              ↓ EXPORT .tdproj
            </button>
            <label className="px-4 py-2 bg-[#1a1c20] border border-[#2a2d35] text-[#9ca3af] text-xs font-mono font-bold rounded-sm hover:bg-[#222530] transition-colors tracking-wider cursor-pointer">
              ↑ IMPORT .tdproj
              <input type="file" accept=".tdproj,.json" className="hidden" onChange={handleImport} />
            </label>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "TRIGGERS", value: project.timeline.length },
              { label: "SPRITES", value: project.sprites.length },
              { label: "CAMERAS", value: project.cameras.length },
            ].map(s => (
              <div key={s.label} className="bg-[#14161a] border border-[#1e2026] rounded-sm p-3 text-center">
                <div className="text-xl font-mono font-bold text-amber-400">{s.value}</div>
                <div className="text-[10px] font-mono text-[#6b7280] tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono font-bold text-[#6b7280] tracking-widest uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
