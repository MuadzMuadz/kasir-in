import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, PlusCircle, ShoppingCart, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { ProductCard } from "./components/POS/ProductCard";
import { Cart } from "./components/POS/Cart";
import { CheckoutDrawer } from "./components/POS/CheckoutModal";
import { SettingsDrawer } from "./components/Settings/SettingsModal";
import { ProductDrawer } from "./components/Products/ProductModal";
import { OverviewDrawer } from "./components/Dashboard/OverviewDrawer";
import { LoginPage } from "./components/Auth/LoginPage";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "./components/UI/Toast";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  signed_image_url?: string;
}

interface CartItem extends Product {
  quantity: number;
}

function App() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", session?.user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const productsData: Product[] = data || [];

      // Generate signed URLs for product images
      const productsWithSignedUrls = await Promise.all(productsData.map(async (product) => {
        if (product.image_url) {
          // Handle both path or old public URL
          const path = product.image_url.includes('/public/')
            ? product.image_url.split('/public/bucket-product/').pop()?.split('?')[0]
            : product.image_url;

          if (path) {
            const { data: signedData, error: signedError } = await supabase.storage
              .from("bucket-product")
              .createSignedUrl(path, 3600);

            if (!signedError && signedData) {
              return { ...product, signed_image_url: signedData.signedUrl };
            }
          }
        }
        return product;
      }));

      setProducts(productsWithSignedUrls);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("qris_url")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data?.qris_url) {
        // Handle both path or old public URL
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
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchProducts();
      fetchProfile();
    }
  }, [session]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      toast(`${product.name} ditambahkan lagi`, "success");
      setCart(prev => prev.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      toast(`${product.name} masuk keranjang`, "success");
      setCart(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Yakin ingin hapus produk ini?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      removeFromCart(id);
      toast("Produk berhasil dihapus", "info");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast("Gagal menghapus produk", "error");
    }
  };

  const handleCheckout = () => {
    setIsCheckoutOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleProductDrawerClose = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const onProductSaved = () => {
    fetchProducts();
    // Sync cart with updated product info
    if (editingProduct) {
      setCart(prev => prev.map(item =>
        item.id === editingProduct.id
          ? { ...item, name: products.find(p => p.id === editingProduct.id)?.name || item.name, price: products.find(p => p.id === editingProduct.id)?.price || item.price }
          : item
      ));
    }
    // Re-fetch to be sure
    fetchProducts();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <LoginPage />;
  }

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-10">
        <div className="flex flex-col">
          <motion.h1
            initial={{ opacity: 0, x: -20, color: "#FFFFFF" }}
            animate={{ opacity: 1, x: 0, color: "#0d9488" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-3xl md:text-4xl font-black italic tracking-tighter"
          >
            TAP-In
          </motion.h1>
          <span className="text-[10px] md:text-xs font-bold text-slate-400 tracking-widest uppercase">Gampang Kasir Portal</span>
        </div>

        <div className="flex gap-2 md:gap-3">
          <motion.button
            initial={{ backgroundColor: "#FFFFFF", borderColor: "#f1f5f9", color: "#94a3b8" }}
            animate={{ backgroundColor: "#f0fdfa", borderColor: "#ccfbf1", color: "#0d9488" }}
            transition={{ duration: 0.8, delay: 0.5 }}
            onClick={() => setIsOverviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm border transition-all font-bold text-sm hover:bg-teal-100"
          >
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Dashboard</span>
          </motion.button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition-all font-bold text-sm"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 text-red-500 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start mb-24 lg:mb-0">

        {/* Product Selection */}
        <div className="w-full lg:col-span-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-black text-slate-800">Pilih Menu</h2>
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="flex items-center gap-2 text-primary font-bold text-xs md:text-sm hover:underline"
            >
              <PlusCircle size={18} />
              Tambah Produk
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {loading ? (
              <div className="col-span-full py-20 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              </div>
            ) : products.length > 0 ? (
              products.map(product => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  price={product.price}
                  imageUrl={product.signed_image_url}
                  onAdd={() => addToCart(product)}
                  onEdit={() => handleEdit(product)}
                  onDelete={() => deleteProduct(product.id)}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">Belum ada menu. Yuk tambah!</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Container - Desktop Only */}
        <div className="hidden lg:block lg:col-span-4 sticky top-8">
          <Cart
            items={cart}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
          />
        </div>

      </main>

      {/* Floating Cart Button - Mobile Only */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 whitespace-nowrap active:scale-95 transition-all border border-white/10"
          >
            <div className="relative bg-teal-600 p-2.5 rounded-2xl shadow-lg shadow-teal-500/20">
              <ShoppingCart size={20} />
              <span className="absolute -top-2 -right-2 bg-white text-teal-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex flex-col items-start pr-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Cek Pesanan</span>
              <span className="text-lg font-black leading-none">
                Rp {total.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowRight size={16} className="text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Drawer - Mobile Only */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-[40px] p-6 pb-12 shadow-2xl flex flex-col gap-4 max-h-[85vh]"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" onClick={() => setIsCartOpen(false)} />
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black text-slate-800">Keranjang Kamu</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-50 rounded-full">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Cart
                  items={cart}
                  onRemove={(id) => {
                    removeFromCart(id);
                    if (cart.length === 1) setIsCartOpen(false);
                  }}
                  onCheckout={() => {
                    setIsCartOpen(false);
                    handleCheckout();
                  }}
                  isMobileView
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total}
        qrisUrl={qrisUrl || undefined}
        items={cart}
        userId={session?.user?.id || ""}
        onSuccess={() => setCart([])}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onProfileUpdated={fetchProfile}
        userId={session?.user?.id || ""}
      />

      <ProductDrawer
        isOpen={isProductModalOpen}
        onClose={handleProductDrawerClose}
        onProductAdded={onProductSaved}
        userId={session?.user?.id || ""}
        initialData={editingProduct}
      />

      <OverviewDrawer
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        userId={session?.user?.id || ""}
      />

    </div>
  )
}

export default App
