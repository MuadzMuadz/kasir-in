import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Check, Loader2, Store, QrCode, Users, Plus, Trash2, Eye, EyeOff, Crown, ScanLine } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../UI/Toast";
import { validateQrisString } from "../../lib/qris";
import jsQR from "jsqr";

interface StaffMember {
  id: string;
  name: string;
  pin: string;
}

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

    // Owner PIN state
    const [ownerPin, setOwnerPin] = useState("");
    const [showOwnerPin, setShowOwnerPin] = useState(false);

    // Staff management state
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [newStaffName, setNewStaffName] = useState("");
    const [newStaffPin, setNewStaffPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [addingStaff, setAddingStaff] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (!userId) return;
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("qris_url, store_name, qris_string, owner_pin")
                    .eq("id", userId)
                    .single();

                if (error && error.code !== "PGRST116") throw error;

                if (data?.store_name) setStoreName(data.store_name);
                if (data?.owner_pin) setOwnerPin(data.owner_pin);
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
        const loadStaff = async () => {
            if (!userId) return;
            const { data } = await supabase
                .from("staff")
                .select("id, name, pin")
                .eq("owner_id", userId)
                .eq("is_active", true)
                .order("created_at", { ascending: true });
            setStaff(data || []);
        };

        if (isOpen) {
            loadProfile();
            loadStaff();
        }
    }, [isOpen, userId]);

    const handleQrisStringChange = (val: string) => {
        setQrisString(val);
        if (val.trim()) {
            setQrisStringValid(validateQrisString(val.trim()));
        } else {
            setQrisStringValid(null);
        }
    };

    const decodeQrFromFile = (file: File): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) { URL.revokeObjectURL(url); return resolve(null); }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                URL.revokeObjectURL(url);
                resolve(code?.data ?? null);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!e.target.files || e.target.files.length === 0) return;

            const file = e.target.files[0];

            // Decode QR string dari gambar
            const decoded = await decodeQrFromFile(file);
            if (decoded && validateQrisString(decoded)) {
                setQrisString(decoded);
                setQrisStringValid(true);
                toast("String QRIS berhasil dibaca dari gambar!", "success");
            } else if (decoded) {
                // QR terbaca tapi bukan QRIS valid — tetap isi, biarkan user lihat
                setQrisString(decoded);
                setQrisStringValid(false);
            }

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
            if (!decoded || !validateQrisString(decoded)) {
                toast("Foto QRIS berhasil diperbarui!", "success");
            }
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
            if (ownerPin && (ownerPin.length !== 4 || !/^\d{4}$/.test(ownerPin))) {
                toast("PIN Owner harus 4 digit angka", "error");
                return;
            }
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: userId,
                    store_name: storeName.trim() || null,
                    qris_string: qrisString.trim() || null,
                    owner_pin: ownerPin.trim() || null,
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

    const handleAddStaff = async () => {
        if (!newStaffName.trim()) { toast("Nama kasir tidak boleh kosong", "error"); return; }
        if (newStaffPin.length !== 4 || !/^\d{4}$/.test(newStaffPin)) {
            toast("PIN harus 4 digit angka", "error"); return;
        }
        try {
            setAddingStaff(true);
            const { data, error } = await supabase
                .from("staff")
                .insert({ owner_id: userId, name: newStaffName.trim(), pin: newStaffPin })
                .select("id, name, pin")
                .single();
            if (error) throw error;
            setStaff((prev) => [...prev, data]);
            setNewStaffName("");
            setNewStaffPin("");
            setShowAddForm(false);
            toast(`Kasir "${data.name}" berhasil ditambahkan`, "success");
        } catch (err: any) {
            toast("Gagal menambahkan kasir: " + err.message, "error");
        } finally {
            setAddingStaff(false);
        }
    };

    const handleDeleteStaff = async (id: string, name: string) => {
        if (!confirm(`Hapus kasir "${name}"?`)) return;
        const { error } = await supabase.from("staff").delete().eq("id", id);
        if (error) { toast("Gagal menghapus kasir", "error"); return; }
        setStaff((prev) => prev.filter((s) => s.id !== id));
        toast(`Kasir "${name}" dihapus`, "info");
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
                                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-3 flex gap-2">
                                    <ScanLine size={14} className="text-teal-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-teal-700 font-medium leading-relaxed">
                                        Otomatis terbaca saat upload foto QRIS di atas. Jika tidak terdeteksi, isi manual dari aplikasi bank/PJSP kamu → menu QRIS → Salin Kode.
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

                            {/* Owner PIN */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Crown size={15} className="text-teal-600" />
                                    PIN Owner
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Keamanan</span>
                                </label>
                                <p className="text-xs text-slate-400 font-medium">Lindungi akun owner dengan PIN 4 digit. Kasir harus masukkan PIN ini untuk masuk sebagai owner.</p>
                                <div className="relative">
                                    <input
                                        type={showOwnerPin ? "text" : "password"}
                                        value={ownerPin}
                                        onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        placeholder="Belum diset (siapapun bisa masuk sebagai owner)"
                                        inputMode="numeric"
                                        className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400/30 focus:bg-white transition-all pr-12 tracking-widest"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOwnerPin((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    >
                                        {showOwnerPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Tim Kasir */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Users size={15} className="text-teal-600" />
                                        Tim Kasir
                                    </label>
                                    <button
                                        onClick={() => { setShowAddForm((v) => !v); setNewStaffName(""); setNewStaffPin(""); }}
                                        className="flex items-center gap-1 text-xs font-black text-teal-600 hover:text-teal-700 transition-colors"
                                    >
                                        <Plus size={14} />
                                        Tambah
                                    </button>
                                </div>

                                {/* Add form */}
                                <AnimatePresence>
                                    {showAddForm && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                                <input
                                                    type="text"
                                                    value={newStaffName}
                                                    onChange={(e) => setNewStaffName(e.target.value)}
                                                    placeholder="Nama kasir (misal: Budi)"
                                                    maxLength={30}
                                                    className="w-full px-4 py-3 bg-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400/30 transition-all border border-slate-100"
                                                />
                                                <div className="relative">
                                                    <input
                                                        type={showPin ? "text" : "password"}
                                                        value={newStaffPin}
                                                        onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                                        placeholder="PIN 4 digit"
                                                        inputMode="numeric"
                                                        className="w-full px-4 py-3 bg-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400/30 transition-all border border-slate-100 pr-12 tracking-widest"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPin((v) => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                    >
                                                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={handleAddStaff}
                                                    disabled={addingStaff}
                                                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                                >
                                                    {addingStaff ? <Loader2 size={16} className="animate-spin" /> : "Simpan Kasir"}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Staff list */}
                                {staff.length === 0 && !showAddForm ? (
                                    <p className="text-xs text-slate-400 font-medium py-2">Belum ada kasir. Tambah untuk mulai delegasi jaga toko.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {staff.map((s) => (
                                            <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{s.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium tracking-widest">PIN: {"●".repeat(4)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteStaff(s.id, s.name)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
