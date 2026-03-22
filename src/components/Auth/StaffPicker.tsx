import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, User, Delete } from "lucide-react";

export interface Staff {
  id: string;
  name: string;
  pin: string;
}

export interface ActiveUser {
  type: "owner" | "staff";
  staffId?: string;
  name: string;
}

interface StaffPickerProps {
  storeName: string;
  ownerName: string;
  ownerPin?: string | null;
  staff: Staff[];
  onSelect: (user: ActiveUser) => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export const StaffPicker = ({ storeName, ownerName, ownerPin, staff, onSelect }: StaffPickerProps) => {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [ownerPinMode, setOwnerPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleStaffSelect = (s: Staff) => {
    setSelectedStaff(s);
    setOwnerPinMode(false);
    setPin("");
    setPinError(false);
  };

  const handleOwnerSelect = () => {
    if (ownerPin) {
      setOwnerPinMode(true);
      setSelectedStaff(null);
      setPin("");
      setPinError(false);
    } else {
      onSelect({ type: "owner", name: ownerName });
    }
  };

  const handlePinDigit = (digit: string) => {
    if (digit === "del") {
      setPin((prev) => prev.slice(0, -1));
      setPinError(false);
      return;
    }
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setPinError(false);

    if (newPin.length === 4) {
      if (ownerPinMode) {
        if (newPin === ownerPin) {
          onSelect({ type: "owner", name: ownerName });
        } else {
          setPinError(true);
          setTimeout(() => { setPin(""); setPinError(false); }, 800);
        }
      } else if (newPin === selectedStaff?.pin) {
        onSelect({ type: "staff", staffId: selectedStaff.id, name: selectedStaff.name });
      } else {
        setPinError(true);
        setTimeout(() => {
          setPin("");
          setPinError(false);
        }, 800);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <span className="text-4xl font-black italic tracking-tighter text-teal-400">TAP-In</span>
        <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">{storeName}</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!selectedStaff && !ownerPinMode ? (
          /* ── Profile Picker ── */
          <motion.div
            key="picker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-8 w-full max-w-md"
          >
            <h1 className="text-white text-2xl font-black text-center">Siapa yang jaga toko?</h1>

            <div className="flex flex-wrap gap-6 justify-center">
              {/* Owner Card */}
              <motion.button
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleOwnerSelect}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-xl shadow-teal-900/50 group-hover:shadow-teal-500/40 transition-all">
                  <Crown size={40} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-sm">{ownerName}</p>
                  <p className="text-teal-400 text-[10px] font-bold uppercase tracking-widest">Owner</p>
                </div>
              </motion.button>

              {/* Staff Cards */}
              {staff.map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleStaffSelect(s)}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-24 h-24 rounded-2xl bg-slate-700 flex items-center justify-center shadow-xl shadow-black/30 group-hover:bg-slate-600 transition-all">
                    <User size={40} className="text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-black text-sm">{s.name}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Kasir</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── PIN Entry ── */
          <motion.div
            key="pin"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${ownerPinMode ? "bg-gradient-to-br from-teal-500 to-teal-700" : "bg-slate-700"}`}>
                {ownerPinMode ? <Crown size={36} className="text-white" /> : <User size={36} className="text-slate-300" />}
              </div>
              <p className="text-white font-black text-lg">{ownerPinMode ? ownerName : selectedStaff?.name}</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Masukkan PIN</p>
            </div>

            {/* PIN Dots */}
            <motion.div
              animate={pinError ? { x: [-8, 8, -6, 6, -4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    i < pin.length
                      ? pinError
                        ? "bg-red-500 scale-110"
                        : "bg-teal-400 scale-110"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </motion.div>

            {pinError && (
              <p className="text-red-400 text-xs font-bold -mt-4">PIN salah, coba lagi</p>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {DIGITS.map((d, i) => {
                if (d === "") return <div key={i} />;
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePinDigit(d)}
                    className={`h-16 rounded-2xl font-black text-xl flex items-center justify-center transition-all ${
                      d === "del"
                        ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        : "bg-slate-800 text-white hover:bg-slate-700 active:bg-teal-700"
                    }`}
                  >
                    {d === "del" ? <Delete size={22} /> : d}
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={() => { setSelectedStaff(null); setOwnerPinMode(false); setPin(""); setPinError(false); }}
              className="text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors"
            >
              ← Ganti profil
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
