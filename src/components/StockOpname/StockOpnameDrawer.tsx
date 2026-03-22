import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ClipboardList, Loader2, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../UI/Toast";

interface StockOpnameDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onDone: () => void; // refresh products in parent after save
}

interface StockItem {
  id: string;
  name: string;
  category?: string | null;
  systemStock: number;
  actualStock: string; // string so input can be empty
}

export const StockOpnameDrawer = ({ isOpen, onClose, userId, onDone }: StockOpnameDrawerProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTrackedProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, stock")
        .eq("user_id", userId)
        .eq("track_stock", true)
        .order("name", { ascending: true });

      if (error) {
        toast("Gagal memuat data produk", "error");
      } else {
        setItems(
          (data || []).map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            systemStock: p.stock ?? 0,
            actualStock: String(p.stock ?? 0),
          }))
        );
      }
      setLoading(false);
    };
    fetchTrackedProducts();
  }, [isOpen, userId]);

  const handleActualChange = (id: string, val: string) => {
    // only allow non-negative integers
    if (val !== "" && (!/^\d+$/.test(val) || Number(val) < 0)) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, actualStock: val } : it)));
  };

  const changedItems = items.filter(
    (it) => it.actualStock !== "" && Number(it.actualStock) !== it.systemStock
  );

  const handleSave = async () => {
    if (changedItems.length === 0) {
      toast("Tidak ada perubahan stok", "info");
      onClose();
      return;
    }
    try {
      setSaving(true);
      await Promise.all(
        changedItems.map((it) =>
          supabase
            .from("products")
            .update({ stock: Number(it.actualStock) })
            .eq("id", it.id)
            .eq("user_id", userId)
        )
      );
      toast(`${changedItems.length} produk berhasil diperbarui`, "success");
      onDone();
      onClose();
    } catch {
      toast("Gagal menyimpan stok opname", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[60] w-full lg:max-w-md bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Stok Opname</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Hitung & sesuaikan stok fisik
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-teal-500" size={32} />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Package size={40} className="text-slate-300" />
                  <p className="text-slate-400 font-bold text-sm">
                    Belum ada produk dengan pelacakan stok aktif.
                  </p>
                  <p className="text-slate-400 text-xs">
                    Aktifkan "Lacak Stok" di pengaturan produk dulu.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    <span className="flex-1">Produk</span>
                    <span className="w-16 text-center">Sistem</span>
                    <span className="w-20 text-center">Aktual</span>
                  </div>

                  {items.map((item) => {
                    const actual = item.actualStock === "" ? null : Number(item.actualStock);
                    const diff = actual !== null ? actual - item.systemStock : 0;
                    const hasChange = actual !== null && actual !== item.systemStock;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          hasChange
                            ? diff < 0
                              ? "bg-red-50 border-red-100"
                              : "bg-emerald-50 border-emerald-100"
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                          {item.category && (
                            <p className="text-[10px] text-slate-400 font-medium">{item.category}</p>
                          )}
                        </div>

                        {/* System stock */}
                        <div className="w-16 text-center">
                          <span className="text-sm font-black text-slate-500">{item.systemStock}</span>
                        </div>

                        {/* Actual input */}
                        <div className="w-20 flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={item.actualStock}
                            onChange={(e) => handleActualChange(item.id, e.target.value)}
                            className={`w-full text-center px-2 py-2 rounded-xl text-sm font-black outline-none focus:ring-2 transition-all border ${
                              hasChange
                                ? diff < 0
                                  ? "bg-white border-red-200 text-red-600 focus:ring-red-300/30"
                                  : "bg-white border-emerald-200 text-emerald-600 focus:ring-emerald-300/30"
                                : "bg-white border-slate-200 text-slate-700 focus:ring-teal-400/20"
                            }`}
                          />
                          {hasChange && (
                            <span
                              className={`text-[10px] font-black ${
                                diff < 0 ? "text-red-500" : "text-emerald-600"
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
              {/* Summary */}
              {changedItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3"
                >
                  <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  <p className="text-xs font-bold text-amber-700">
                    {changedItems.length} produk akan diperbarui
                  </p>
                </motion.div>
              )}
              {items.length > 0 && changedItems.length === 0 && !loading && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-emerald-700">Stok sistem sudah sesuai</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || loading || items.length === 0}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black py-4 rounded-[22px] shadow-xl shadow-teal-100 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <ClipboardList size={18} />
                    Simpan Stok Opname
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
