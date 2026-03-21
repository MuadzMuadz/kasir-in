import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, QrCode, Banknote, Loader2, Share2, PartyPopper } from "lucide-react";
import { useToast } from "../UI/Toast";
import { supabase } from "../../lib/supabase";
import { makeQrisDynamic } from "../../lib/qris";
import QRCode from "qrcode";

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
    discount?: number;
    qrisUrl?: string;
    qrisString?: string;
    storeName?: string;
    items: CartItem[];
    userId: string;
    onSuccess: () => void;
}

export function CheckoutDrawer({
    isOpen, onClose, total, discount = 0, qrisUrl, qrisString, storeName = "Toko", items, userId, onSuccess
}: CheckoutDrawerProps) {
    const { toast } = useToast();
    const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");
    const [amountPaid, setAmountPaid] = useState("");
    const [change, setChange] = useState(0);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"checkout" | "success">("checkout");
    const [savedPaymentMethod, setSavedPaymentMethod] = useState<"qris" | "cash">("qris");
    const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string | null>(null);

    // Generate dynamic QRIS when qrisString + total available
    useEffect(() => {
        if (!isOpen || paymentMethod !== "qris" || !qrisString || total <= 0) {
            setDynamicQrDataUrl(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const dynamicString = makeQrisDynamic(qrisString, total);
                const dataUrl = await QRCode.toDataURL(dynamicString, {
                    width: 280,
                    margin: 2,
                    color: { dark: "#1e293b", light: "#FFFFFF" },
                    errorCorrectionLevel: "M",
                });
                if (!cancelled) setDynamicQrDataUrl(dataUrl);
            } catch {
                if (!cancelled) setDynamicQrDataUrl(null);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, paymentMethod, qrisString, total]);

    // Reset state when drawer opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep("checkout");
            setAmountPaid("");
            setChange(0);
            setPaymentMethod("qris");
        }
    }, [isOpen]);

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

            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .insert([{
                    user_id: userId,
                    total_amount: total,
                    payment_method: paymentMethod,
                    ...(discount > 0 ? { discount_amount: discount } : {})
                }])
                .select()
                .single();

            if (orderError) throw orderError;

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

            // Decrement stock
            await Promise.all(items.map(async (item) => {
                const { data: prod, error: prodErr } = await supabase
                    .from("products")
                    .select("track_stock, stock")
                    .eq("id", item.id)
                    .single();
                if (prodErr || !prod?.track_stock || prod.stock == null) return;
                const newStock = Math.max(0, prod.stock - item.quantity);
                await supabase
                    .from("products")
                    .update({ stock: newStock })
                    .eq("id", item.id)
                    .eq("track_stock", true);
            }));

            setSavedPaymentMethod(paymentMethod);
            onSuccess();
            setStep("success");
        } catch (error: any) {
            console.error("Error saving order:", error);
            toast("Gagal mencatat pesanan: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const shareReceipt = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString("id-ID", {
            weekday: "long", year: "numeric", month: "long",
            day: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const itemLines = items
            .map(i => `• ${i.name} x${i.quantity}  →  Rp ${(i.price * i.quantity).toLocaleString("id-ID")}`)
            .join("\n");

        const lines = [
            `🧾 *Struk ${storeName}*`,
            `📅 ${dateStr}`,
            "",
            "*Detail Pesanan:*",
            itemLines,
            "",
            discount > 0 ? `Subtotal: Rp ${subtotal.toLocaleString("id-ID")}` : null,
            discount > 0 ? `Diskon: -Rp ${discount.toLocaleString("id-ID")}` : null,
            `*Total: Rp ${total.toLocaleString("id-ID")}*`,
            `Bayar: ${savedPaymentMethod === "qris" ? "QRIS" : "Tunai"}`,
            "",
            "_Terima kasih sudah berbelanja! 🙏_",
        ].filter(Boolean).join("\n");

        window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
    };

    const handleClose = () => {
        setStep("checkout");
        setAmountPaid("");
        onClose();
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
                        onClick={step === "success" ? handleClose : onClose}
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
                        {/* ── SUCCESS SCREEN ── */}
                        <AnimatePresence>
                            {step === "success" && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 z-10 bg-white flex flex-col"
                                >
                                    {/* Success Header */}
                                    <div className="p-6 flex justify-end">
                                        <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-start px-6 overflow-y-auto pb-6">
                                        {/* Checkmark */}
                                        <motion.div
                                            initial={{ scale: 0, rotate: -30 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", damping: 12, delay: 0.1 }}
                                            className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 mb-5"
                                        >
                                            <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 }}
                                            className="text-center mb-6"
                                        >
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <PartyPopper size={18} className="text-amber-400" />
                                                <h2 className="text-2xl font-black text-slate-800">Pembayaran Berhasil!</h2>
                                            </div>
                                            <p className="text-sm text-slate-400 font-medium">Pesanan telah dicatat</p>
                                        </motion.div>

                                        {/* Receipt Card */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.35 }}
                                            className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 mb-5"
                                        >
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ringkasan Pesanan</p>
                                            <div className="space-y-2 mb-4">
                                                {items.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600 font-medium">
                                                            {item.name} <span className="text-slate-400">×{item.quantity}</span>
                                                        </span>
                                                        <span className="font-bold text-slate-700">
                                                            Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between text-sm text-emerald-600 font-bold border-t border-slate-100 pt-2 mb-1">
                                                    <span>Diskon</span>
                                                    <span>- Rp {discount.toLocaleString("id-ID")}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-1">
                                                <span className="font-black text-slate-700">Total</span>
                                                <span className="text-xl font-black text-teal-600">Rp {total.toLocaleString("id-ID")}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${savedPaymentMethod === "qris" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                                                    {savedPaymentMethod === "qris" ? "QRIS" : "Tunai"}
                                                </span>
                                            </div>
                                        </motion.div>

                                        {/* Share WA Button */}
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.45 }}
                                            onClick={shareReceipt}
                                            className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2.5 shadow-lg shadow-green-200 hover:bg-[#1ebe5d] active:scale-95 transition-all mb-3"
                                        >
                                            <Share2 size={20} />
                                            Bagikan Struk via WhatsApp
                                        </motion.button>

                                        <motion.button
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            onClick={handleClose}
                                            className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 active:scale-95 transition-all"
                                        >
                                            Selesai
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── CHECKOUT FORM ── */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Checkout</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Selesaikan Pembayaran</p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                            {/* Payment Method Tabs */}
                            <div className="bg-slate-100/50 p-1.5 rounded-[28px] flex gap-1">
                                {(["qris", "cash"] as const).map((method) => (
                                    <motion.button
                                        key={method}
                                        animate={{
                                            backgroundColor: paymentMethod === method ? "#FFFFFF" : "transparent",
                                            color: paymentMethod === method ? "#0d9488" : "#94a3b8",
                                            boxShadow: paymentMethod === method ? "0 4px 6px -1px rgb(0 0 0 / 0.1)" : "none",
                                        }}
                                        transition={{ duration: 0.3 }}
                                        onClick={() => setPaymentMethod(method)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[24px] font-bold text-sm transition-all"
                                    >
                                        {method === "qris" ? <QrCode size={18} /> : <Banknote size={18} />}
                                        {method === "qris" ? "QRIS" : "Tunai"}
                                    </motion.button>
                                ))}
                            </div>

                            {/* QRIS Section */}
                            {paymentMethod === "qris" && (
                                <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                    {dynamicQrDataUrl ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black bg-teal-100 text-teal-600 px-2.5 py-1 rounded-full uppercase tracking-wider">QRIS Dinamis</span>
                                                <span className="text-xs text-slate-400 font-medium">Nominal otomatis tertanam</span>
                                            </div>
                                            <div className="aspect-square w-full max-w-[260px] bg-white rounded-[36px] border border-slate-100 shadow-2xl flex items-center justify-center p-4 overflow-hidden">
                                                <img src={dynamicQrDataUrl} alt="QRIS Dinamis" className="w-full h-full object-contain rounded-2xl" />
                                            </div>
                                            <p className="text-sm font-black text-teal-600">
                                                Scan & bayar Rp {total.toLocaleString("id-ID")}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-slate-500 text-sm font-semibold">Scan QRIS untuk membayar</p>
                                            <div className="aspect-square w-full max-w-[260px] bg-white rounded-[36px] border border-slate-100 shadow-2xl flex items-center justify-center p-4 overflow-hidden">
                                                {qrisUrl ? (
                                                    <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center">
                                                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-200 text-center px-4">QRIS Belum Diupload</span>
                                                    </div>
                                                )}
                                            </div>
                                            {!qrisString && (
                                                <p className="text-[11px] text-center text-amber-500 font-bold bg-amber-50 px-4 py-2 rounded-2xl max-w-[260px]">
                                                    Tambahkan String QRIS di Settings untuk nominal otomatis
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Cash Section */}
                            {paymentMethod === "cash" && (
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-slate-700 uppercase tracking-wider block">Uang Dibayar</label>
                                        <input
                                            type="number"
                                            value={amountPaid}
                                            onChange={(e) => setAmountPaid(e.target.value)}
                                            placeholder="Rp 0"
                                            className="w-full px-6 py-6 bg-slate-50 border-2 border-transparent rounded-[28px] focus:ring-4 focus:ring-teal-500/10 focus:bg-white focus:border-teal-500 transition-all outline-none font-black text-3xl text-teal-600 placeholder:text-slate-200"
                                            autoFocus
                                        />
                                    </div>

                                    <AnimatePresence>
                                        {amountPaid && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-emerald-50 rounded-[28px] p-6 border border-emerald-100/50 flex flex-col items-center gap-1"
                                            >
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Kembalian</p>
                                                <p className="text-4xl font-black text-emerald-700">
                                                    Rp {change.toLocaleString("id-ID")}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Total Card */}
                            <div className="bg-slate-50 rounded-[32px] p-6 flex flex-col gap-2 border border-slate-100">
                                {discount > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-400">Diskon</span>
                                        <span className="font-black text-emerald-600">- Rp {discount.toLocaleString("id-ID")}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total Tagihan</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">Rp {total.toLocaleString("id-ID")}</p>
                                    </div>
                                    <motion.div
                                        initial={{ backgroundColor: "#FFFFFF", color: "#94a3b8" }}
                                        animate={{ backgroundColor: "#0d9488", color: "#FFFFFF" }}
                                        transition={{ duration: 0.8, delay: 0.3 }}
                                        className="p-4 rounded-2xl shadow-xl shadow-teal-500/30"
                                    >
                                        <CheckCircle2 size={22} />
                                    </motion.div>
                                </div>
                            </div>

                            {/* Confirm Button */}
                            <motion.button
                                initial={{ backgroundColor: "#FFFFFF", color: "#94a3b8" }}
                                animate={{ backgroundColor: "#0f172a", color: "#FFFFFF" }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                                onClick={handleConfirmPayment}
                                disabled={loading}
                                className="w-full py-5 rounded-[28px] font-black text-lg shadow-2xl shadow-slate-900/10 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0"
                            >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : "Konfirmasi Pembayaran"}
                            </motion.button>

                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] text-center">
                                {paymentMethod === "qris"
                                    ? "Dana masuk ke rekening pedagang via QRIS"
                                    : "Pastikan uang tunai sudah diterima sebelum konfirmasi"}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
