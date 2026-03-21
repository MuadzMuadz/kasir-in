import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Check, Loader2, Store, QrCode, Info } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../UI/Toast";
import { validateQrisString } from "../../lib/qris";

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileUpdated?: () => void;
    userId: string;
}

export const SettingsDrawer = ({ isOpen, onClose, onProfileUpdated, userId }: SettingsDrawerProps) => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [qrisUrl, setQrisUrl] = useState<string | null>(null);
    const [storeName, setStoreName] = useState("");
    const [qrisString, setQrisString] = useState("");
    const [qrisStringValid, setQrisStringValid] = useState<boolean | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!userId) return;
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("qris_url, store_name, qris_string")
                    .eq("id", userId)
                    .single();

                if (error && error.code !== "PGRST116") throw error;

                if (data?.store_name) setStoreName(data.store_name);
                if (data?.qris_string) {
                    setQrisString(data.qris_string);
                    setQrisStringValid(validateQrisString(data.qris_string));
                }

                if (data?.qris_url) {
                    const path = data.qris_url.includes('/public/')
                        ? data.qris_url.split('/public/bucket-qris/').pop()?.split('?')[0]
                        : data.qris_url;

                    if (path) {
                        const { data: signedData, error: signedError } = await supabase.storage
                            .from("bucket-qris")
                            .createSignedUrl(path, 3600);
                        if (!signedError && signedData) setQrisUrl(signedData.signedUrl);
                    }
                }
            } catch (err) {
                console.error("Error loading profile:", err);
            }
        };
        if (isOpen) loadProfile();
    }, [isOpen, userId]);

    const handleQrisStringChange = (val: string) => {
        setQrisString(val);
        if (val.trim()) {
            setQrisStringValid(validateQrisString(val.trim()));
        } else {
            setQrisStringValid(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!e.target.files || e.target.files.length === 0) return;

            const file = e.target.files[0];
            const fileExt = file.name.split(".").pop();
            const filePath = `${userId}/qris-code.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("bucket-qris")
                .upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({ id: userId, qris_url: filePath });
            if (profileError) throw profileError;

            const { data: signedData, error: signedError } = await supabase.storage
                .from("bucket-qris")
                .createSignedUrl(filePath, 3600);
            if (!signedError && signedData) setQrisUrl(signedData.signedUrl);

            if (onProfileUpdated) onProfileUpdated();
            toast("Foto QRIS berhasil diperbarui!", "success");
        } catch (error: any) {
            toast("Gagal mengunggah: " + error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (qrisString.trim() && !qrisStringValid) {
            toast("String QRIS tidak valid, periksa kembali", "error");
            return;
        }
        try {
            setSaving(true);
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: userId,
                    store_name: storeName.trim() || null,
                    qris_string: qrisString.trim() || null,
                });
            if (error) throw error;
            if (onProfileUpdated) onProfileUpdated();
            toast("Pengaturan berhasil disimpan!", "success");
            onClose();
        } catch (error: any) {
            toast("Gagal menyimpan: " + error.message, "error");
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
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Toko</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Profil & QRIS</p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-7">
                            {/* Store Name */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Store size={15} className="text-teal-600" />
                                    Nama Toko
                                </label>
                                <input
                                    type="text"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    placeholder="Contoh: Warung Bu Sari"
                                    maxLength={60}
                                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400/30 focus:bg-white transition-all"
                                />
                            </div>

                            {/* QRIS Image Upload */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <QrCode size={15} className="text-teal-600" />
                                    Foto QRIS Statis
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-[28px] p-8 flex flex-col items-center justify-center gap-4 hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer group"
                                >
                                    {uploading ? (
                                        <Loader2 className="animate-spin text-teal-500" size={36} />
                                    ) : qrisUrl ? (
                                        <div className="flex flex-col items-center gap-3 w-full">
                                            <div className="relative w-full aspect-square max-w-[180px] border border-slate-100 rounded-3xl overflow-hidden shadow-xl">
                                                <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain p-2" />
                                                <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                                                    <Check size={14} />
                                                </div>
                                            </div>
                                            <p className="text-xs font-black text-teal-600 uppercase tracking-wider">Klik untuk ganti foto</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-500 transition-all">
                                                <Upload size={28} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-600">Klik untuk upload QRIS</p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG atau SVG (Maks. 2MB)</p>
                                            </div>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            {/* QRIS String - Dynamic QRIS */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <QrCode size={15} className="text-teal-600" />
                                    String QRIS
                                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">QRIS Dinamis</span>
                                </label>
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex gap-2">
                                    <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                        Opsional. Jika diisi, nominal tagihan otomatis tertanam di QR saat checkout (seperti mesin EDC). Dapatkan dari aplikasi bank/PJSP kamu → menu QRIS → Salin Kode.
                                    </p>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={qrisString}
                                        onChange={(e) => handleQrisStringChange(e.target.value)}
                                        placeholder="000201010211..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-teal-400/30 focus:bg-white transition-all resize-none"
                                    />
                                    {qrisStringValid !== null && (
                                        <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${qrisStringValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                            {qrisStringValid ? '✓ Valid' : '✗ Tidak Valid'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 pb-2 text-center border-t border-slate-50">
                                <p className="text-[10px] font-medium text-slate-400">TAP-In • Jualan lancar, tinggal TAP-In aja!</p>
                            </div>
                        </div>

                        {/* Footer Save Button */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black py-4 rounded-[22px] shadow-xl shadow-teal-100 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : "Simpan & Selesai"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
