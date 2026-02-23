import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Save, Image as ImageIcon, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../UI/Toast";
import { cn } from "../../lib/utils";

interface ProductDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onProductAdded: () => void;
    userId: string;
    initialData?: { id: string; name: string; price: number; image_url?: string } | null;
}

export const ProductDrawer = ({ isOpen, onClose, onProductAdded, userId, initialData }: ProductDrawerProps) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setPrice(initialData.price.toString());
            setImagePreview(initialData.image_url || null);
        } else {
            setName("");
            setPrice("");
            setImagePreview(null);
        }
        setImageFile(null);
    }, [initialData, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) return;

        try {
            setLoading(true);
            let finalImageUrl = initialData?.image_url || null;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${userId}/${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from("bucket-product")
                    .upload(fileName, imageFile, { upsert: true });

                if (uploadError) throw uploadError;
                finalImageUrl = fileName;
            }

            if (initialData) {
                const { error } = await supabase
                    .from("products")
                    .update({
                        name,
                        price: parseFloat(price),
                        image_url: finalImageUrl
                    })
                    .eq("id", initialData.id);
                if (error) throw error;
                toast("Produk berhasil diperbarui!", "success");
            } else {
                const { error } = await supabase
                    .from("products")
                    .insert([
                        {
                            name,
                            price: parseFloat(price),
                            user_id: userId,
                            image_url: finalImageUrl
                        }
                    ]);
                if (error) throw error;
                toast("Produk berhasil ditambahkan!", "success");
            }

            setName("");
            setPrice("");
            onProductAdded();
            onClose();
        } catch (error: any) {
            console.error("Error saving product:", error);
            toast("Gagal menyimpan produk: " + error.message, "error");
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
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {initialData ? "Edit Produk" : "Tambah Produk Baru"}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {initialData ? "Update Menu Jualan" : "Input Menu Jualan"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 p-8 space-y-6 overflow-y-auto">
                            {/* Image Upload Slot */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Foto Produk</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "relative aspect-video w-full rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all hover:border-teal-400 hover:bg-teal-50/30",
                                        imagePreview && "border-none"
                                    )}
                                >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Upload className="text-white" size={32} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 mb-3 group-hover:scale-110 transition-transform">
                                                <ImageIcon size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400">Klik untuk upload foto</p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Format: JPG, PNG, WEBP</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Nama Produk</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: Es Teh Manis"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Harga (Rp)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="Contoh: 5000"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none font-medium"
                                    required
                                />
                            </div>

                            {/* Spacer */}
                            <div className="flex-1" />
                        </form>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                            <motion.button
                                initial={{ backgroundColor: "#FFFFFF", color: "#94a3b8" }}
                                animate={{ backgroundColor: "#0d9488", color: "#FFFFFF" }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full font-black py-5 rounded-[24px] shadow-2xl shadow-teal-100 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none"
                            >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : (initialData ? <Save size={20} /> : <Plus size={20} />)}
                                {initialData ? "Simpan Perubahan" : "Tambah Produk"}
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
