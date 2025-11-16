"use client";

export default function ExportPage() {
  async function handleExport() {
    const res = await fetch("/api/export/excel");
    if (!res.ok) {
      alert("Failed to export");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "silver-king-products.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-white/60">Data</p>
        <h1 className="text-2xl font-semibold text-white">Export</h1>
        <p className="text-sm text-white/50">
          Download the entire dataset including products, QR records, and scan counts.
        </p>
      </div>
      <button
        onClick={handleExport}
        className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#C0C0C0] px-6 py-3 text-black font-semibold"
      >
        Export to Excel
      </button>
    </div>
  );
}

