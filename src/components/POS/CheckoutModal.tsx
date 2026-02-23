import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, QrCode, Banknote, Loader2 } from "lucide-react";
import { useToast } from "../UI/Toast";
import { supabase } from "../../lib/supabase";

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface CheckoutDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    qrisUrl?: string;
    items: CartItem[];
    userId: string;
    onSuccess: () => void;
}

export function CheckoutDrawer({ isOpen, onClose, total, qrisUrl, items, userId, onSuccess }: CheckoutDrawerProps) {
    const { toast } = useToast();
    const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");
    const [amountPaid, setAmountPaid] = useState<string>("");
    const [change, setChange] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (paymentMethod === "cash" && amountPaid) {
            const paid = parseFloat(amountPaid);
            setChange(paid > total ? paid - total : 0);
        } else {
            setChange(0);
        }
    }, [amountPaid, paymentMethod, total]);

    const handleConfirmPayment = async () => {
        if (paymentMethod === "cash") {
            const paid = parseFloat(amountPaid);
            if (!amountPaid || paid < total) {
                toast("Uang yang dibayarkan kurang!", "error");
                return;
            }
        }

        try {
            setLoading(true);

            // 1. Create Order
            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .insert([{
                    user_id: userId,
                    total_amount: total,
                    payment_method: paymentMethod
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = items.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                product_name: item.name,
                price: item.price,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems);

            if (itemsError) throw itemsError;

            toast("Pembayaran Berhasil! Pesanan telah dicatat.", "success");
            setAmountPaid("");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error saving order:", error);
            toast("Gagal mencatat pesanan: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-[60] w-full lg:max-w-md bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col"
                    >
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Checkout</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Selesaikan Pembayaran</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 p-6 md:p-8 flex flex-col gap-10 overflow-y-auto">
                            {/* Payment Method Tabs */}
                            <div className="bg-slate-100/50 p-1.5 rounded-[28px] flex gap-1">
                                <button
                                    onClick={() => setPaymentMethod("qris")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[24px] font-bold text-sm transition-all ${paymentMethod === "qris" ? "bg-white text-blue-600 shadow-md shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                                        }`}
                                >
                                    <QrCode size={18} />
                                    QRIS
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("cash")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[24px] font-bold text-sm transition-all ${paymentMethod === "cash" ? "bg-white text-blue-600 shadow-md shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                                        }`}
                                >
                                    <Banknote size={18} />
                                    Tunai
                                </button>
                            </div>

                            {paymentMethod === "qris" ? (
                                <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <p className="text-slate-500 text-sm font-semibold">Silahkan scan QRIS untuk membayar</p>
                                    <div className="aspect-square w-full max-w-[280px] bg-white rounded-[40px] border border-slate-100 shadow-2xl flex items-center justify-center relative overflow-hidden group p-4">
                                        {qrisUrl ? (
                                            <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <div className="w-40 h-40 border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center bg-slate-50/50">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-200 text-center px-4">QRIS Belum Diupload</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end px-1">
                                            <label className="text-sm font-black text-slate-800 uppercase tracking-widest">Uang Dibayar</label>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Tunai</span>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={amountPaid}
                                                onChange={(e) => setAmountPaid(e.target.value)}
                                                placeholder="Rp. 0-"
                                                className="w-full px-8 py-7 bg-slate-50 border-2 border-transparent rounded-[32px] focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all outline-none font-black text-4xl text-blue-600 placeholder:text-slate-200"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {amountPaid && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100/50 flex flex-col items-center justify-center gap-1 shadow-sm shadow-emerald-100/50"
                                            >
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Kembalian</p>
                                                <p className="text-4xl font-black text-emerald-700">
                                                    Rp {change.toLocaleString('id-ID')}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <div className="w-full bg-slate-50 rounded-[40px] p-8 flex justify-between items-center border border-slate-100 shadow-sm">
                                <div className="text-left flex flex-col gap-1">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total Tagihan</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">Rp {total.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-blue-600 text-white p-5 rounded-[24px] shadow-xl shadow-blue-500/30">
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>

                            <div className="space-y-4 w-full">
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={loading}
                                    className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[32px] font-black text-lg shadow-2xl shadow-slate-900/10 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : "Konfirmasi Pembayaran"}
                                </button>
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] text-center">
                                        Digital Receipt • Secure Payment • No Hidden Fees
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/80 border-t border-slate-100 mt-auto">
                            <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-center italic">
                                {paymentMethod === "qris"
                                    ? "Dana masuk ke rekening pedagang secara real-time via QRIS Network."
                                    : "Pastikan jumlah uang tunai yang diterima sudah benar sebelum konfirmasi."}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
