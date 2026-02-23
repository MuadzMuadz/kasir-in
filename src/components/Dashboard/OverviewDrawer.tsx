import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, ShoppingBag, DollarSign, Calendar, ChevronRight } from "lucide-react";
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
    const [loading, setLoading] = useState(true);
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

                const { data, error } = await supabase
                    .from("orders")
                    .select("id, total_amount, created_at")
                    .eq("user_id", userId)
                    .gte("created_at", startDate.toISOString());

                if (error) throw error;

                const totalSales = data.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
                const orderCount = data.length;
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
    }, [period, userId, isOpen]);

    if (!isOpen) return null;

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
                            <stop offset="0%" style={{ stopColor: "rgb(37, 99, 235)", stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: "rgb(37, 99, 235)", stopOpacity: 0 }} />
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 0,${height} L ${points} L ${width},${height} Z`}
                        fill="url(#grad)"
                        className="animate-in fade-in duration-1000"
                    />
                    <polyline
                        fill="none"
                        stroke="rgb(37, 99, 235)"
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
                            stroke="rgb(37, 99, 235)"
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
                            <div className="flex p-1.5 bg-slate-100/50 rounded-[28px] max-w-sm mx-auto">
                                {(["day", "week", "month", "year"] as Period[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all",
                                            period === p ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {p === "day" ? "Hari" : p === "week" ? "Minggu" : p === "month" ? "Bulan" : "Tahun"}
                                    </button>
                                ))}
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <motion.div
                                    whileHover={{ y: -4 }}
                                    className="bg-blue-600 rounded-[32px] p-6 text-white shadow-xl shadow-blue-200"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                                        <DollarSign size={20} />
                                    </div>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.2em] mb-1">Total Sales</p>
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
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-blue-600">
                                        <TrendingUp size={20} />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Rata-rata</p>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Rp {Math.round(stats.averageValue).toLocaleString('id-ID')}</h3>
                                </motion.div>
                            </div>

                            {/* Chart Section */}
                            <div className="bg-slate-50/50 rounded-[40px] p-8 border border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={18} className="text-blue-600" />
                                        Trend Penjualan
                                    </h4>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">Live Updates</span>
                                </div>

                                <div className="h-48 w-full">
                                    {loading ? (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : (
                                        <SVGChart data={stats.chartData} />
                                    )}
                                </div>
                            </div>

                            {/* Credits Section */}
                            <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
                                <div className="p-6 bg-slate-50 rounded-[32px] w-full text-center space-y-2">
                                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Credits & Developer</h5>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed px-4">
                                        TAP-In developed with ❤️ for UMKM. Thanks for using our tools to scale your business.
                                    </p>
                                    <div className="pt-2 flex items-center justify-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                                        <span>&copy; 2024 TAP-In POS</span>
                                        <ChevronRight size={14} />
                                        <span>v1.0.4</span>
                                    </div>
                                </div>
                            </div>
                        </div>

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
