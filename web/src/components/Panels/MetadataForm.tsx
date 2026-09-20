import { useStore } from "../../state/store";

export default function MetadataForm() {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const resizeMap = useStore((s) => s.resizeMap);
  const m = scenario.metadata;

  return (
    <div className="panel">
      <h3>Metadata</h3>
      <label>ID</label>
      <input
        value={m.id}
        onChange={(e) =>
          update((s) => {
            s.metadata.id = e.target.value;
            return s;
          })
        }
      />
      <label>Name</label>
      <input
        value={m.name}
        onChange={(e) =>
          update((s) => {
            s.metadata.name = e.target.value;
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
      <label>Version</label>
      <input
        value={m.version}
        onChange={(e) =>
          update((s) => {
            s.metadata.version = e.target.value;
            return s;
          })
        }
      />
      <label>Type</label>
      <input
        value={m.type}
        onChange={(e) =>
          update((s) => {
            s.metadata.type = e.target.value;
            return s;
          })
        }
      />
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
      <div className="row">
        <div>
          <label>Width</label>
          <input
            type="number"
            min={1}
            value={m.width}
            onChange={(e) => resizeMap(Number(e.target.value), m.height)}
          />
        </div>
        <div>
          <label>Height</label>
          <input
            type="number"
            min={1}
            value={m.height}
            onChange={(e) => resizeMap(m.width, Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
