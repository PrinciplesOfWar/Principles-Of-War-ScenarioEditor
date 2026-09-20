import { useStore } from "../../state/store";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.substring(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function IconUploader({ iconKey }: { iconKey: string }) {
  const scenario = useStore((s) => s.scenario);
  const update = useStore((s) => s.update);
  const icon = scenario.unit_icons[iconKey];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      alert("Please upload a PNG image.");
      return;
    }
    const base64 = await fileToBase64(file);
    update((s) => {
      s.unit_icons[iconKey] = base64;
      return s;
    });
  }

  return (
    <div className="icon-uploader">
      {icon && <img src={`data:image/png;base64,${icon}`} alt={iconKey} width={48} height={48} />}
      <input type="file" accept="image/png" onChange={handleFile} />
    </div>
  );
}
