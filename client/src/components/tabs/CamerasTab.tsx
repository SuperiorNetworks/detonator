/* CamerasTab — Industrial Dark Console
   Supports up to 2 IP cameras / MJPEG streams. */
import { useProject, Camera } from "@/contexts/ProjectContext";
import { nanoid } from "nanoid";

export default function CamerasTab() {
  const { project, setProject } = useProject();

  function addCamera() {
    if (project.cameras.length >= 2) return;
    const c: Camera = { id: nanoid(), name: `Camera ${project.cameras.length + 1}`, ip: "", streamUrl: "", snapshotUrl: "" };
    setProject(p => ({ ...p, cameras: [...p.cameras, c] }));
  }

  function updateCamera(id: string, patch: Partial<Camera>) {
    setProject(p => ({ ...p, cameras: p.cameras.map(c => c.id === id ? { ...c, ...patch } : c) }));
  }

  function removeCamera(id: string) {
    setProject(p => ({ ...p, cameras: p.cameras.filter(c => c.id !== id) }));
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-mono font-bold text-amber-400 tracking-widest uppercase">
          Camera Monitoring ({project.cameras.length}/2)
        </h2>
        <button
          onClick={addCamera}
          disabled={project.cameras.length >= 2}
          className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono rounded-sm hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >+ ADD CAMERA</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {project.cameras.map((cam, i) => (
          <div key={cam.id} className="border border-[#1e2026] rounded-sm overflow-hidden bg-[#0d0e10]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#14161a] border-b border-[#1e2026]">
              <span className="text-xs font-mono font-bold text-amber-400">CAM {i + 1}: {cam.name || "Unnamed"}</span>
              <button onClick={() => removeCamera(cam.id)} className="text-[#6b7280] hover:text-red-400 text-xs">✕</button>
            </div>

            {/* Stream preview */}
            <div className="aspect-video bg-[#0a0b0d] flex items-center justify-center relative overflow-hidden">
              {cam.streamUrl ? (
                <img src={cam.streamUrl} alt={cam.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <div className="text-[#2a2d35] text-3xl mb-2">📷</div>
                  <div className="text-[#3a3f4a] font-mono text-xs">No stream configured</div>
                </div>
              )}
            </div>

            {/* Config */}
            <div className="p-4 space-y-2">
              {[
                { label: "NAME", key: "name" as const, placeholder: "Camera 1" },
                { label: "IP ADDRESS", key: "ip" as const, placeholder: "192.168.1.100" },
                { label: "STREAM URL (MJPEG)", key: "streamUrl" as const, placeholder: "http://…/stream" },
                { label: "SNAPSHOT URL", key: "snapshotUrl" as const, placeholder: "http://…/snapshot" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[9px] font-mono text-[#4b5563] tracking-widest uppercase mb-0.5">{f.label}</label>
                  <input
                    value={cam[f.key]}
                    onChange={e => updateCamera(cam.id, { [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full bg-[#1a1c20] border border-[#2a2d35] rounded-sm px-2 py-1 text-xs font-mono text-[#dde2e8] placeholder-[#3a3f4a] focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {project.cameras.length === 0 && (
          <div className="col-span-2 flex items-center justify-center h-48 border border-dashed border-[#2a2d35] rounded text-[#3a3f4a] font-mono text-sm">
            No cameras configured — add up to 2 IP/MJPEG cameras
          </div>
        )}
      </div>
    </div>
  );
}
