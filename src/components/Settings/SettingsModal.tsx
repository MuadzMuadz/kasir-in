import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Check, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../UI/Toast";

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileUpdated?: () => void;
    userId: string;
}

export const SettingsDrawer = ({ isOpen, onClose, onProfileUpdated, userId }: SettingsDrawerProps) => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [qrisUrl, setQrisUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Fetch existing profile to get qris_url
        const loadProfile = async () => {
            if (!userId) return;
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("qris_url")
                    .eq("id", userId)
                    .single();

                if (error && error.code !== "PGRST116") throw error; // PGRST116 is 'not found'

                if (data?.qris_url) {
                    // Extract path: handles both old public URLs and new relative paths
                    const path = data.qris_url.includes('/public/')
                        ? data.qris_url.split('/public/bucket-qris/').pop()?.split('?')[0]
                        : data.qris_url;

                    if (path) {
                        const { data: signedData, error: signedError } = await supabase.storage
                            .from("bucket-qris")
                            .createSignedUrl(path, 3600);

                        if (!signedError && signedData) {
                            setQrisUrl(signedData.signedUrl);
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading profile:", err);
            }
        };
        if (isOpen) loadProfile();
    }, [isOpen, userId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!e.target.files || e.target.files.length === 0) {
                throw new Error("Pilih gambar terlebih dahulu.");
            }

            const file = e.target.files[0];
            const fileExt = file.name.split(".").pop();
            const filePath = `${userId}/qris-code.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("bucket-qris")
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                throw uploadError;
            }

            // Update profiles table with the new path/url
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({ id: userId, qris_url: filePath });

            if (profileError) throw profileError;

            // Generate a SIGNED URL for the preview (so it works even if bucket is private)
            const { data: signedData, error: signedError } = await supabase.storage
                .from("bucket-qris")
                .createSignedUrl(filePath, 3600);

            if (!signedError && signedData) {
                setQrisUrl(signedData.signedUrl);
            }

            if (onProfileUpdated) onProfileUpdated();
            toast("QRIS berhasil diperbarui!", "success");
        } catch (error: any) {
            console.error("Upload error:", error);
            toast("Gagal mengunggah: " + error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

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
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Toko</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Konfigurasi & QRIS</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-sm font-bold text-slate-700 block mb-3">Unggah Foto QRIS</span>
                                    <div
                                        className="border-2 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center gap-4 hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer group"
                                    >
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-teal-500" size={40} />
                                        ) : qrisUrl ? (
                                            <div className="flex flex-col items-center gap-4 w-full">
                                                <div className="relative w-full aspect-square max-w-[200px] border border-slate-100 rounded-3xl overflow-hidden shadow-2xl">
                                                    <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain p-2" />
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                                                        <Check size={16} />
                                                    </div>
                                                </div>
                                                <div className="bg-teal-50 px-4 py-2 rounded-xl">
                                                    <p className="text-xs font-black text-teal-600 uppercase tracking-wider">Klik untuk ganti foto</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-500 transition-all transform group-hover:scale-110">
                                                    <Upload size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-base font-bold text-slate-600">Klik untuk upload QRIS</p>
                                                    <p className="text-xs text-slate-400 mt-2 font-medium">PNG, JPG atau SVG (Maks. 2MB)</p>
                                                </div>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleUpload}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                </label>
                            </div>

                            {/* Add more settings sections here as needed */}

                            <div className="pt-12 pb-6 text-center border-t border-slate-50">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">&copy; 2024 TAP-In</p>
                                <p className="text-[10px] font-medium text-slate-400">Jualan lancar, tinggal TAP-In aja!<br />Made with ❤️ for UMKM</p>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={onClose}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-teal-200 transition-all transform hover:-translate-y-1 active:scale-95"
                            >
                                Simpan & Selesai
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
