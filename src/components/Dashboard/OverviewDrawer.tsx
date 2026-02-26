import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, ShoppingBag, DollarSign, Calendar, ChevronRight, CalendarSearch } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

interface OverviewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

type Period = "day" | "week" | "month" | "year";

interface Stats {
    totalSales: number;
    orderCount: number;
    averageValue: number;
    chartData: { label: string; value: number }[];
}

export const OverviewDrawer = ({ isOpen, onClose, userId }: OverviewDrawerProps) => {
    const [period, setPeriod] = useState<Period>("week");
    const [specificDate, setSpecificDate] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [stats, setStats] = useState<Stats>({
        totalSales: 0,
        orderCount: 0,
        averageValue: 0,
        chartData: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (!userId || !isOpen) return;
            try {
                setLoading(true);

                let query = supabase
                    .from("orders")
                    .select("id, total_amount, created_at, payment_method, order_items(product_name,price,quantity)")
                    .eq("user_id", userId);

                if (specificDate) {
                    const start = new Date(specificDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(specificDate);
                    end.setHours(23, 59, 59, 999);
                    query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
                } else {
                    let startDate = new Date();
                    if (period === "day") {
                        startDate.setHours(0, 0, 0, 0);
                    } else if (period === "week") {
                        startDate.setDate(startDate.getDate() - 7);
                    } else if (period === "month") {
                        startDate.setMonth(startDate.getMonth() - 1);
                    } else if (period === "year") {
                        startDate.setFullYear(startDate.getFullYear() - 1);
                    }
                    query = query.gte("created_at", startDate.toISOString());
                }

                const { data, error } = await query;

                if (error) throw error;

                const totalSales = data.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
                const orderCount = data.length;
                setOrders(data);
                const averageValue = orderCount > 0 ? totalSales / orderCount : 0;

                // Simple chart data aggregation
                const chartData = data.reduce((acc: any[], curr) => {
                    const date = new Date(curr.created_at).toLocaleDateString();
                    const existing = acc.find(d => d.label === date);
                    if (existing) {
                        existing.value += Number(curr.total_amount);
                    } else {
                        acc.push({ label: date, value: Number(curr.total_amount) });
                    }
                    return acc;
                }, []).slice(-7); // Keep last 7 days of active data for simplicity

                setStats({ totalSales, orderCount, averageValue, chartData });
            } catch (err) {
                console.error("Error fetching stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [period, specificDate, userId, isOpen]);

    if (!isOpen) return null;

    const periodLabel: Record<Period, string> = {
        day: "Hari Ini",
        week: "7 Hari Terakhir",
        month: "Bulan Ini",
        year: "Tahun Ini",
    };

    const activePeriodLabel = specificDate
        ? new Date(specificDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : periodLabel[period];

    const groupKeyFn = (dateStr: string) => {
        const d = new Date(dateStr);
        if (period === "day") {
            return d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else if (period === "week") {
            return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
        } else if (period === "month") {
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
        } else {
            return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        }
    };

    const groupedOrders = orders
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .reduce((acc: Record<string, any[]>, o) => {
            const key = groupKeyFn(o.created_at);
            if (!acc[key]) acc[key] = [];
            acc[key].push(o);
            return acc;
        }, {});

    // Simple SVG Chart Component
    const SVGChart = ({ data }: { data: { label: string; value: number }[] }) => {
        if (data.length === 0) return (
            <div className="h-full w-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">
                Belum ada data transaksi
            </div>
        );

        const max = Math.max(...data.map(d => d.value)) || 1;
        const width = 100;
        const height = 40;
        const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d.value / max) * height}`).join(" ");

        return (
            <div className="w-full h-full relative flex flex-col pt-4">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "rgb(13, 148, 136)", stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: "rgb(13, 148, 136)", stopOpacity: 0 }} />
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 0,${height} L ${points} L ${width},${height} Z`}
                        fill="url(#grad)"
                        className="animate-in fade-in duration-1000"
                    />
                    <motion.polyline
                        initial={{ stroke: "rgba(255, 255, 255, 0)" }}
                        animate={{ stroke: "rgb(13, 148, 136)" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        fill="none"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                        className="animate-in slide-in-from-left-full duration-1000"
                    />
                    {data.map((d, i) => (
                        <circle
                            key={i}
                            cx={(i / (data.length - 1)) * width}
                            cy={height - (d.value / max) * height}
                            r="1.5"
                            fill="white"
                            stroke="rgb(13, 148, 136)"
                            strokeWidth="1"
                        />
                    ))}
                </svg>
                <div className="flex justify-between mt-4">
                    {data.map((d, i) => (
                        <div key={i} className="text-[10px] font-bold text-slate-400 rotate-45 origin-left">
                            {d.label.split('/')[0]}/{d.label.split('/')[1]}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

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
                        className="fixed inset-y-0 right-0 z-[60] w-full lg:max-w-xl bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col"
                    >
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Overview Penjualan</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pantau Performa Bisnis</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Period Tabs */}
                            <div className="space-y-3">
                                <div className={cn(
                                    "flex p-1.5 bg-slate-100/50 rounded-[28px] max-w-sm mx-auto transition-opacity",
                                    specificDate && "opacity-40 pointer-events-none"
                                )}>
                                    {(["day", "week", "month", "year"] as Period[]).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={cn(
                                                "flex-1 py-2.5 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all",
                                                period === p ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                            )}
                                        >
                                            {p === "day" ? "Hari" : p === "week" ? "Minggu" : p === "month" ? "Bulan" : "Tahun"}
                                        </button>
                                    ))}
                                </div>

                                {/* Specific Date Picker */}
                                <div className="flex items-center gap-2 max-w-sm mx-auto">
                                    <div className="relative flex-1">
                                        <CalendarSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            value={specificDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setSpecificDate(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                                        />
                                    </div>
                                    {specificDate && (
                                        <button
                                            onClick={() => setSpecificDate("")}
                                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-2xl transition-all whitespace-nowrap"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <motion.div
                                    whileHover={{ y: -4 }}
                                    initial={{ backgroundColor: "#FFFFFF", color: "#94a3b8" }}
                                    animate={{ backgroundColor: "#0d9488", color: "#FFFFFF" }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                    className="rounded-[32px] p-6 shadow-xl shadow-teal-200"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                                        <DollarSign size={20} />
                                    </div>
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-[0.2em] mb-1">Total Sales</p>
                                    <h3 className="text-xl font-black tracking-tight">Rp {stats.totalSales.toLocaleString('id-ID')}</h3>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -4 }}
                                    className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl shadow-slate-200"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Total Order</p>
                                    <h3 className="text-xl font-black tracking-tight">{stats.orderCount} Pesanan</h3>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -4 }}
                                    className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm"
                                >
                                    <motion.div
                                        initial={{ color: "#94a3b8" }}
                                        animate={{ color: "#0d9488" }}
                                        transition={{ duration: 1, delay: 0.6 }}
                                        className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mb-4"
                                    >
                                        <TrendingUp size={20} />
                                    </motion.div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Rata-rata</p>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Rp {Math.round(stats.averageValue).toLocaleString('id-ID')}</h3>
                                </motion.div>
                            </div>

                            {/* Chart Section */}
                            <div className="bg-slate-50/50 rounded-[40px] p-8 border border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={18} className="text-teal-600" />
                                        Trend Penjualan
                                    </h4>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">Live Updates</span>
                                </div>

                                <div className="h-48 w-full">
                                    {loading ? (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                        </div>
                                    ) : (
                                        <SVGChart data={stats.chartData} />
                                    )}
                                </div>
                            </div>

                                {/* Detail History Section */}
                                <div className="bg-white rounded-[20px] p-6 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">History Pesanan</h4>
                                            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">{activePeriodLabel}</p>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">{orders.length} transaksi</span>
                                    </div>

                                    {loading ? (
                                        <div className="py-6 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                                        </div>
                                    ) : orders.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Belum ada pesanan</p>
                                            <p className="text-slate-300 text-xs mt-1">{periodLabel[period]}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {Object.entries(groupedOrders).map(([groupLabel, groupOrders]) => (
                                                <div key={groupLabel}>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{groupLabel}</div>
                                                    <div className="space-y-1">
                                                        {groupOrders.map((o: any) => (
                                                            <div key={o.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-bold text-slate-800 truncate">#{o.id.slice(0, 8).toUpperCase()}</div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <div className="text-xs text-slate-400">
                                                                            {new Date(o.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                        <span className={cn(
                                                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                                            o.payment_method === 'cash'
                                                                                ? "bg-amber-50 text-amber-600"
                                                                                : "bg-blue-50 text-blue-600"
                                                                        )}>
                                                                            {o.payment_method === 'cash' ? 'Tunai' : 'QRIS'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-2">
                                                                    <div className="text-sm font-black text-slate-800">Rp {Number(o.total_amount).toLocaleString('id-ID')}</div>
                                                                    <button
                                                                        onClick={() => setSelectedOrder(o)}
                                                                        className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full transition-colors"
                                                                    >
                                                                        Detail
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            {/* Credits Section */}
                            <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
                                <div className="p-6 bg-slate-50 rounded-[32px] w-full text-center space-y-2">
                                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Credits & Developer</h5>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed px-4">
                                        TAP-In developed with ❤️ for UMKM. Thanks for using our tools to scale your business.
                                    </p>
                                    <div className="pt-2 flex items-center justify-center gap-2 text-teal-600 font-black text-[10px] uppercase tracking-widest">
                                        <span>&copy; 2024 TAP-In POS</span>
                                        <ChevronRight size={14} />
                                        <span>v1.0.4</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Detail Modal */}
                        {selectedOrder && (
                            <div className="fixed inset-0 z-[80] flex items-center justify-center">
                                <div onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/30" />
                                <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl p-6 shadow-xl border">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-black">Detail Pesanan</h3>
                                        <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">Tutup</button>
                                    </div>
                                    <div className="space-y-3 text-sm text-slate-700">
                                        <div><strong>ID:</strong> {selectedOrder.id}</div>
                                        <div><strong>Tanggal:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</div>
                                        <div><strong>Total:</strong> Rp {Number(selectedOrder.total_amount).toLocaleString('id-ID')}</div>
                                                                <div>
                                                                    <strong>Rincian:</strong>
                                                                    <div className="mt-2 bg-slate-50 rounded-md p-3">
                                                                        {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                                                                            <div className="space-y-2">
                                                                                {selectedOrder.order_items.map((it: any, idx: number) => (
                                                                                    <div key={idx} className="flex justify-between items-center">
                                                                                        <div>
                                                                                            <div className="font-bold text-sm">{it.product_name}</div>
                                                                                            <div className="text-xs text-slate-400">Qty: {it.quantity} × Rp {Number(it.price).toLocaleString('id-ID')}</div>
                                                                                        </div>
                                                                                        <div className="font-black">Rp {(Number(it.price) * Number(it.quantity)).toLocaleString('id-ID')}</div>
                                                                                    </div>
                                                                                ))}
                                                                                <div className="border-t pt-2 mt-2 flex justify-between font-black">
                                                                                    <div>Total</div>
                                                                                    <div>Rp {Number(selectedOrder.total_amount).toLocaleString('id-ID')}</div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-xs text-slate-400">Tidak ada rincian item.</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-8 border-t border-slate-100 bg-white">
                            <button
                                onClick={onClose}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-5 rounded-[24px] transition-all"
                            >
                                Tutup Dashboard
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
