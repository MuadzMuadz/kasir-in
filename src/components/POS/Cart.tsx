import { Trash2, ShoppingCart, Minus, Plus, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface CartProps {
    items: CartItem[];
    onRemove: (id: string) => void;
    onUpdateQty: (id: string, qty: number) => void;
    onCheckout: (discount: number) => void;
    isMobileView?: boolean;
}

export function Cart({ items, onRemove, onUpdateQty, onCheckout, isMobileView }: CartProps) {
    const [discountInput, setDiscountInput] = useState("");
    const [discountType, setDiscountType] = useState<"nominal" | "persen">("nominal");

    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const discountValue = (() => {
        const val = parseFloat(discountInput) || 0;
        if (discountType === "persen") return Math.min(Math.round(subtotal * val / 100), subtotal);
        return Math.min(val, subtotal);
    })();

    const total = subtotal - discountValue;

    return (
        <aside className={`${isMobileView ? "bg-transparent border-none shadow-none p-0 sticky-none" : "bg-white rounded-3xl shadow-xl border border-slate-100 p-6 h-fit sticky top-8"} flex flex-col gap-4 min-w-full lg:min-w-[320px]`}>
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
                <ShoppingCart className="text-primary" size={24} />
                <h2 className="font-bold text-2xl tracking-tight">Keranjang</h2>
            </div>

            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {items.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-12 text-center text-slate-400 italic"
                        >
                            Belum ada belanjaan, cuy.
                        </motion.div>
                    ) : (
                        items.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl group"
                            >
                                <div className="flex flex-col flex-1 min-w-0 mr-2">
                                    <span className="font-bold text-slate-700 truncate">{item.name}</span>
                                    <span className="text-sm text-slate-500">
                                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => item.quantity === 1 ? onRemove(item.id) : onUpdateQty(item.id, item.quantity - 1)}
                                        className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90",
                                            item.quantity === 1
                                                ? "bg-red-50 text-red-400 hover:bg-red-100"
                                                : "bg-white text-slate-500 hover:bg-slate-200 border border-slate-200"
                                        )}
                                    >
                                        {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                                    </button>
                                    <span className="w-6 text-center font-black text-sm text-slate-700">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                        className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 flex items-center justify-center transition-all active:scale-90"
                                    >
                                        <Plus size={13} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Diskon */}
            {items.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Tag size={13} className="text-slate-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Diskon</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setDiscountType("nominal")}
                                className={cn("text-[10px] font-black px-2.5 py-1 rounded-lg transition-all", discountType === "nominal" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}
                            >Rp</button>
                            <button
                                onClick={() => setDiscountType("persen")}
                                className={cn("text-[10px] font-black px-2.5 py-1 rounded-lg transition-all", discountType === "persen" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}
                            >%</button>
                        </div>
                        <input
                            type="number"
                            min="0"
                            max={discountType === "persen" ? 100 : subtotal}
                            value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            placeholder={discountType === "persen" ? "0%" : "0"}
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                        />
                    </div>
                    {discountValue > 0 && (
                        <div className="flex justify-between text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                            <span>Hemat</span>
                            <span>- Rp {discountValue.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col gap-4">
                {discountValue > 0 && (
                    <div className="flex justify-between items-center text-sm text-slate-400">
                        <span>Subtotal</span>
                        <span className="line-through">Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                )}
                <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-medium">Total Tagihan</span>
                    <span className="text-2xl font-black text-primary">
                        Rp {total.toLocaleString('id-ID')}
                    </span>
                </div>

                <motion.button
                    initial={{ backgroundColor: "#FFFFFF", color: "#94a3b8" }}
                    animate={{
                        backgroundColor: items.length > 0 ? "#0d9488" : "#f1f5f9",
                        color: items.length > 0 ? "#FFFFFF" : "#94a3b8"
                    }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    onClick={() => onCheckout(discountValue)}
                    disabled={items.length === 0}
                    className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-teal-100 disabled:shadow-none disabled:cursor-not-allowed"
                >
                    BAYAR SEKARANG
                </motion.button>
            </div>
        </aside>
    );
}
