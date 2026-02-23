import { useState, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = "success") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 items-end pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            className={cn(
                                "px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[240px] pointer-events-auto backdrop-blur-md transition-all",
                                t.type === "success" && "bg-white/95 text-emerald-600 border-emerald-100",
                                t.type === "error" && "bg-white/95 text-red-600 border-red-100",
                                t.type === "info" && "bg-white/95 text-teal-600 border-teal-100"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                t.type === "success" && "bg-emerald-50",
                                t.type === "error" && "bg-red-50",
                                t.type === "info" && "bg-teal-50"
                            )}>
                                {t.type === "success" && <CheckCircle size={18} />}
                                {t.type === "error" && <AlertCircle size={18} />}
                                {t.type === "info" && <Info size={18} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold tracking-tight">{t.message}</p>
                            </div>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="p-1 hover:bg-slate-50 rounded-lg text-slate-300 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
