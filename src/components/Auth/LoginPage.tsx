import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, Loader2, ArrowRight, UserPlus, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

export const LoginPage = () => {
    const [view, setView] = useState<"login" | "register" | "forgot">("login");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || "Gagal masuk. Periksa email & password.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                }
            });
            if (error) throw error;
            setSuccessMessage("Pendaftaran berhasil! Silahkan cek email kamu untuk konfirmasi.");
        } catch (err: any) {
            setError(err.message || "Gagal mendaftar. Silahkan coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setSuccessMessage("Link reset password telah dikirim ke email kamu.");
        } catch (err: any) {
            setError(err.message || "Gagal mengirim link reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Decorative Background Elements */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={cn(
                    "absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl transition-colors duration-500",
                    view === "login" ? "bg-blue-100/50" :
                        view === "register" ? "bg-emerald-100/50" :
                            "bg-orange-100/50"
                )}
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, -90, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className={cn(
                    "absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full blur-3xl transition-colors duration-500",
                    view === "login" ? "bg-blue-50/50" :
                        view === "register" ? "bg-emerald-50/50" :
                            "bg-orange-50/50"
                )}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[440px] z-10"
            >
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                            "inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl mb-6 transition-all duration-500",
                            view === "login" ? "bg-blue-600 shadow-blue-200" :
                                view === "register" ? "bg-emerald-600 shadow-emerald-200" :
                                    "bg-orange-600 shadow-orange-200"
                        )}
                    >
                        {view === "login" ? <LogIn className="text-white" size={32} /> :
                            view === "register" ? <UserPlus className="text-white" size={32} /> :
                                <KeyRound className="text-white" size={32} />}
                    </motion.div>
                    <h1 className={cn(
                        "text-4xl md:text-5xl font-black italic tracking-tighter mb-2 transition-colors duration-500",
                        view === "login" ? "text-blue-600" :
                            view === "register" ? "text-emerald-600" :
                                "text-orange-600"
                    )}>
                        TAP-In
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Portal Kasir Masa Kini</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-6 md:p-10 shadow-2xl shadow-blue-900/5 border border-white">
                    <div className="flex items-center gap-4 mb-8">
                        {view !== "login" && (
                            <button
                                onClick={() => { setView("login"); setSuccessMessage(null); setError(null); }}
                                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors duration-500"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                            {view === "login" ? "Selamat Datang Kembali!" :
                                view === "register" ? "Daftar Akun Baru" :
                                    "Reset Kata Sandi"}
                        </h2>
                    </div>

                    {successMessage ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8 space-y-6"
                        >
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-slate-800">Cek Email Kamu!</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    {successMessage}
                                </p>
                            </div>
                            <button
                                onClick={() => { setView("login"); setSuccessMessage(null); }}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all duration-500"
                            >
                                Kembali ke Masuk
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={view === "login" ? handleLogin : view === "register" ? handleRegister : handleResetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Email Bisnis</label>
                                <div className="relative group">
                                    <div className={cn(
                                        "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors duration-500",
                                        view === "login" ? "group-focus-within:text-blue-500" :
                                            view === "register" ? "group-focus-within:text-emerald-500" :
                                                "group-focus-within:text-orange-500"
                                    )}>
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={cn(
                                            "w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl transition-all duration-500 outline-none font-medium focus:ring-2 focus:bg-white",
                                            view === "login" ? "focus:ring-blue-500" :
                                                view === "register" ? "focus:ring-emerald-500" :
                                                    "focus:ring-orange-500"
                                        )}
                                        placeholder="nama@toko.id"
                                        required
                                    />
                                </div>
                            </div>

                            {view !== "forgot" && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-sm font-bold text-slate-700">Kata Sandi</label>
                                        {view === "login" && (
                                            <button
                                                type="button"
                                                onClick={() => setView("forgot")}
                                                className="text-xs font-bold text-blue-600 hover:underline transition-colors duration-500"
                                            >
                                                Lupa Password?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <div className={cn(
                                            "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors duration-500",
                                            view === "login" ? "group-focus-within:text-blue-500" :
                                                view === "register" ? "group-focus-within:text-emerald-500" :
                                                    "group-focus-within:text-orange-500"
                                        )}>
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={cn(
                                                "w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl transition-all duration-500 outline-none font-medium focus:ring-2 focus:bg-white",
                                                view === "login" ? "focus:ring-blue-500" :
                                                    view === "register" ? "focus:ring-emerald-500" :
                                                        "focus:ring-orange-500"
                                            )}
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className={cn(
                                                "absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 transition-colors duration-500",
                                                view === "login" ? "hover:text-blue-500" :
                                                    view === "register" ? "hover:text-emerald-500" :
                                                        "hover:text-orange-500"
                                            )}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all duration-500 transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none",
                                    view === "login" ? "bg-blue-600 shadow-blue-200 hover:bg-blue-700" :
                                        view === "register" ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700" :
                                            "bg-orange-600 shadow-orange-200 hover:bg-orange-700"
                                )}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        {view === "login" ? "Masuk Sekarang" :
                                            view === "register" ? "Daftar Akun" :
                                                "Kirim Link Reset"}
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center pt-8 border-t border-slate-100 flex flex-col items-center justify-center">
                        <p className="text-slate-400 text-sm font-medium transition-colors duration-500">
                            {view === "login" ? "Belum punya akun?" : "Sudah punya akun?"}
                            {" "}
                            <button
                                onClick={() => setView(view === "login" ? "register" : "login")}
                                className={cn(
                                    "font-bold hover:underline transition-all duration-500",
                                    view === "login" ? "text-blue-600" :
                                        view === "register" ? "text-emerald-600" :
                                            "text-orange-600"
                                )}
                            >
                                {view === "login" ? "Daftar Toko Gratis" : "Masuk Ke Toko"}
                            </button>
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="absolute bottom-8 text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                Empowered by TAP-In Technology
            </div>
        </div>
    );
};
