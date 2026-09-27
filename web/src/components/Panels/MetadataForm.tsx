import { useStore } from "../../state/store";

function formatTimestamp(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  return new Date(epochSeconds * 1000).toLocaleString();
}

export default function MetadataForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const m = scenario.metadata;

  return (
    <div className="panel">
      <h3>Metadata</h3>
      <label>Name</label>
      <input
        value={m.name}
        onChange={(e) => {
          const name = e.target.value.replace(/[^a-zA-Z0-9 ]/g, "");
          const id = name.toLowerCase().replace(/ /g, "_");
          update((s) => {
            s.metadata.name = name;
            s.metadata.id = id;
            return s;
          });
        }}
        onBlur={(e) => {
          const name = e.target.value.trim();
          const id = name.toLowerCase().replace(/ /g, "_");
          update((s) => {
            s.metadata.name = name;
            s.metadata.id = id;
            return s;
          });
        }}
      />
      <label>Type</label>
      <select
        value={m.type}
        onChange={(e) =>
          update((s) => {
            s.metadata.type = e.target.value;
            return s;
          })
        }
      >
        <option value="original">Original</option>
        <option value="custom">Custom</option>
      </select>
      <label>Description</label>
      <textarea
        value={m.description}
        onChange={(e) =>
          update((s) => {
            s.metadata.description = e.target.value;
            return s;
          })
        }
      />
      <label>Creator</label>
      <input
        value={m.creator}
        onChange={(e) =>
          update((s) => {
            s.metadata.creator = e.target.value;
            return s;
          })
        }
      />
      <label>ID (auto-generated)</label>
      <input value={m.id} readOnly disabled />
      <label>Created At</label>
      <input value={formatTimestamp(m.created_at)} readOnly disabled />
      <label>Updated At</label>
      <input value={formatTimestamp(m.updated_at)} readOnly disabled />
      <label>Version</label>
      <input value={m.version} readOnly disabled />
      <label>Hash</label>
      <input value={m.hash} readOnly disabled />
    </div>
  );
}
