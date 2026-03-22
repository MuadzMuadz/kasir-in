import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Store, KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../UI/Toast";
import type { Session } from "@supabase/supabase-js";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  storeName: string;
}

export const ProfileDrawer = ({ isOpen, onClose, session, storeName }: ProfileDrawerProps) => {
  const { toast } = useToast();
  const email = session.user.email || "";
  const initials = email.slice(0, 2).toUpperCase();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !oldPassword) {
      toast("Isi semua kolom password", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Konfirmasi password tidak cocok", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("Password baru minimal 6 karakter", "error");
      return;
    }

    setSaving(true);
    try {
      // Re-auth with old password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        toast("Password lama salah", "error");
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast("Password berhasil diubah", "success");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch {
      toast("Gagal mengubah password", "error");
    } finally {
      setSaving(false);
    }
  };

  const createdAt = new Date(session.user.created_at);
  const joinedLabel = createdAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
            className="fixed inset-y-0 right-0 z-[60] w-full lg:max-w-sm bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Profil</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Akun & keamanan
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Avatar + identity */}
              <div className="flex flex-col items-center gap-3 py-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl border border-teal-100">
                <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center shadow-xl shadow-teal-200">
                  <span className="text-3xl font-black text-white tracking-tight">{initials}</span>
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-slate-800">{storeName || "—"}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{email}</p>
                </div>
              </div>

              {/* Info cards */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <Mail size={15} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <Store size={15} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Toko</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{storeName || "Belum diatur"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <User size={15} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bergabung sejak</p>
                    <p className="text-sm font-bold text-slate-700">{joinedLabel}</p>
                  </div>
                </div>
              </div>

              {/* Change password section */}
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setShowPasswordForm((v) => !v)}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <KeyRound size={15} className="text-teal-600" />
                  </div>
                  <span className="flex-1 text-sm font-black text-slate-700 text-left">Ganti Password</span>
                  <motion.span
                    animate={{ rotate: showPasswordForm ? 180 : 0 }}
                    className="text-slate-400 text-xs"
                  >
                    ▼
                  </motion.span>
                </button>

                <AnimatePresence>
                  {showPasswordForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 border-t border-slate-100">
                        {/* Old password */}
                        <div className="relative">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                            Password Lama
                          </label>
                          <div className="relative">
                            <input
                              type={showOld ? "text" : "password"}
                              value={oldPassword}
                              onChange={(e) => setOldPassword(e.target.value)}
                              className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOld((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                              {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* New password */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                            Password Baru
                          </label>
                          <div className="relative">
                            <input
                              type={showNew ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm password */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                            Konfirmasi Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirm ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`w-full pr-10 pl-3 py-2.5 rounded-xl border text-sm font-bold outline-none focus:ring-2 transition-all ${
                                confirmPassword && confirmPassword !== newPassword
                                  ? "border-red-300 focus:ring-red-300/20 focus:border-red-400"
                                  : confirmPassword && confirmPassword === newPassword
                                  ? "border-emerald-300 focus:ring-emerald-300/20 focus:border-emerald-400"
                                  : "border-slate-200 focus:ring-teal-400/20 focus:border-teal-400"
                              }`}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {confirmPassword && confirmPassword === newPassword && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Password cocok
                            </p>
                          )}
                          {confirmPassword && confirmPassword !== newPassword && (
                            <p className="text-[10px] font-bold text-red-500 mt-1">Password tidak cocok</p>
                          )}
                        </div>

                        <button
                          onClick={handleChangePassword}
                          disabled={saving}
                          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          {saving ? <Loader2 className="animate-spin" size={16} /> : "Simpan Password Baru"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
