import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreVertical, Trash2, Edit } from "lucide-react";
import { cn } from "../../lib/utils";
import { useState } from "react";

interface ProductCardProps {
    name: string;
    price: number;
    imageUrl?: string;
    onAdd: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
}

export function ProductCard({ name, price, imageUrl, onAdd, onDelete, onEdit }: ProductCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 flex flex-col gap-3 group transition-all hover:shadow-md cursor-pointer relative"
            onClick={onAdd}
        >
            <div className="aspect-square w-full bg-slate-50 rounded-xl overflow-hidden relative">
                {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-3xl md:text-4xl">
                        {name.charAt(0)}
                    </div>
                )}

                {/* Top Buttons Layer */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className="p-1.5 bg-white/90 backdrop-blur-sm text-slate-600 rounded-lg shadow-sm border border-slate-100 hover:bg-white transition-all overflow-visible"
                        >
                            <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        className="absolute left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden"
                                    >
                                        {onEdit && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onEdit();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                            >
                                                <Edit size={14} className="text-blue-500" />
                                                Edit
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onDelete();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                                Hapus
                                            </button>
                                        )}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                            <Plus size={20} fontWeight="bold" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col">
                <h3 className="font-bold text-slate-800 text-base md:text-lg leading-tight">{name}</h3>
                <p className="text-accent font-black text-lg md:text-xl">
                    Rp {price.toLocaleString('id-ID')}
                </p>
            </div>

            <button
                className={cn(
                    "w-full py-3 rounded-xl font-bold transition-all active:scale-95",
                    "bg-slate-50 text-slate-600 group-hover:bg-primary group-hover:text-white"
                )}
            >
                Tambah ke Keranjang
            </button>
        </motion.div>
    );
}
