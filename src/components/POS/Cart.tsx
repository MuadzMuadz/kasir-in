import { Trash2, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface CartProps {
    items: CartItem[];
    onRemove: (id: string) => void;
    onCheckout: () => void;
    isMobileView?: boolean;
}

export function Cart({ items, onRemove, onCheckout, isMobileView }: CartProps) {
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

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
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700">{item.name}</span>
                                    <span className="text-sm text-slate-500">
                                        {item.quantity}x • Rp {item.price.toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-medium">Total Tagihan</span>
                    <span className="text-2xl font-black text-primary">
                        Rp {total.toLocaleString('id-ID')}
                    </span>
                </div>

                <button
                    onClick={onCheckout}
                    disabled={items.length === 0}
                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg ${items.length > 0
                        ? "bg-accent text-white shadow-emerald-200 hover:brightness-110"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                >
                    BAYAR SEKARANG
                </button>
            </div>
        </aside>
    );
}
