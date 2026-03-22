import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, PlusCircle, ShoppingCart, X, ArrowRight, LayoutDashboard, Search, Users } from "lucide-react";
import { ProductCard } from "./components/POS/ProductCard";
import { Cart } from "./components/POS/Cart";
import { CheckoutDrawer } from "./components/POS/CheckoutModal";
import { SettingsDrawer } from "./components/Settings/SettingsModal";
import { ProductDrawer } from "./components/Products/ProductModal";
import { OverviewDrawer } from "./components/Dashboard/OverviewDrawer";
import { LoginPage } from "./components/Auth/LoginPage";
import { StaffPicker } from "./components/Auth/StaffPicker";
import type { Staff, ActiveUser } from "./components/Auth/StaffPicker";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "./components/UI/Toast";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  signed_image_url?: string;
  track_stock?: boolean;
  stock?: number | null;
  category?: string | null;
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
  const [qrisString, setQrisString] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("TAP-In");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [discount, setDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);
  const signedUrlCache = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getSignedUrl = async (path: string): Promise<string | null> => {
    const cached = signedUrlCache.current.get(path);
    const now = Date.now();
    if (cached && cached.expiresAt > now + 60_000) return cached.url;

    const { data: signedData, error: signedError } = await supabase.storage
      .from("bucket-product")
      .createSignedUrl(path, 3600);

    if (!signedError && signedData) {
      signedUrlCache.current.set(path, { url: signedData.signedUrl, expiresAt: now + 3600_000 });
      return signedData.signedUrl;
    }
    return null;
  };

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

      const productsWithSignedUrls = await Promise.all(productsData.map(async (product) => {
        if (product.image_url) {
          const path = product.image_url.includes('/public/')
            ? product.image_url.split('/public/bucket-product/').pop()?.split('?')[0]
            : product.image_url;
          if (path) {
            const signedUrl = await getSignedUrl(path);
            if (signedUrl) return { ...product, signed_image_url: signedUrl };
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
        .select("qris_url, qris_string, store_name")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.store_name) setStoreName(data.store_name);
      if (data?.qris_string) setQrisString(data.qris_string);

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
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchStaff = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("staff")
      .select("id, name, pin")
      .eq("owner_id", session.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setStaff(data || []);
  };

  useEffect(() => {
    if (session) {
      fetchProducts();
      fetchProfile();
      fetchStaff();
      setActiveUser(null); // reset on session change (new login)
    }
  }, [session]);

  const decrementLocalStock = (productId: string, qty = 1) => {
    setProducts(prev => prev.map(p =>
      p.id === productId && p.track_stock === true && typeof p.stock === "number"
        ? { ...p, stock: Math.max(0, p.stock - qty) }
        : p
    ));
  };

  const incrementLocalStock = (productId: string, qty = 1) => {
    setProducts(prev => prev.map(p =>
      p.id === productId && p.track_stock === true && typeof p.stock === "number"
        ? { ...p, stock: p.stock + qty }
        : p
    ));
  };

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
    decrementLocalStock(product.id);
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(i => i.id === id);
    if (item) incrementLocalStock(id, item.quantity);
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQty = (id: string, qty: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const diff = qty - item.quantity;
    if (diff > 0) decrementLocalStock(id, diff);
    else if (diff < 0) incrementLocalStock(id, Math.abs(diff));
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Yakin ingin hapus produk ini?")) return;
    try {
      const product = products.find(p => p.id === id);

      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      if (product?.image_url) {
        const path = product.image_url.includes('/public/')
          ? product.image_url.split('/public/bucket-product/').pop()?.split('?')[0]
          : product.image_url;
        if (path) {
          signedUrlCache.current.delete(path);
          await supabase.storage.from("bucket-product").remove([path]);
        }
      }

      setProducts(prev => prev.filter(p => p.id !== id));
      removeFromCart(id);
      toast("Produk berhasil dihapus", "info");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast("Gagal menghapus produk", "error");
    }
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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <LoginPage />;
  }

  // Show staff picker if staff exist and no one has been picked yet
  if (staff.length > 0 && !activeUser) {
    return (
      <StaffPicker
        storeName={storeName}
        ownerName={session.user.email?.split("@")[0] || "Owner"}
        staff={staff}
        onSelect={setActiveUser}
      />
    );
  }

  const isOwner = !activeUser || activeUser.type === "owner";

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const categories = ["Semua", ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))];
  const filteredProducts = products
    .filter(p => activeCategory === "Semua" || p.category === activeCategory)
    .filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center font-sans">

      {/* ── Header ─────────────────────────────────── */}
      <header className="w-full bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo + Store Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div>
              <motion.span
                initial={{ opacity: 0, color: "#FFFFFF" }}
                animate={{ opacity: 1, color: "#0d9488" }}
                transition={{ duration: 1 }}
                className="text-2xl font-black italic tracking-tighter block leading-none"
              >
                TAP-In
              </motion.span>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase leading-none">{storeName}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs hidden sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Active user badge + switch */}
            {staff.length > 0 && (
              <button
                onClick={() => setActiveUser(null)}
                title="Ganti pengguna"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100 transition-all"
              >
                <Users size={15} />
                <span className="text-xs font-black hidden sm:inline">
                  {activeUser ? activeUser.name : session.user.email?.split("@")[0]}
                </span>
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setIsOverviewOpen(true)}
                title="Dashboard"
                className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 hover:bg-teal-100 transition-all"
              >
                <LayoutDashboard size={18} />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Pengaturan"
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100 transition-all"
              >
                <Settings size={18} />
              </button>
            )}
            <button
              onClick={handleLogout}
              title="Keluar"
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-red-400 hover:bg-red-50 transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
            />
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────── */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-0 lg:gap-6 p-4 md:p-6 pb-28 lg:pb-6 items-start">

        {/* Product Panel */}
        <div className="w-full lg:flex-1 flex flex-col gap-4">

          {/* Category Filter + Add Product */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                    activeCategory === cat
                      ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                      : "bg-white text-slate-400 border border-slate-100 hover:border-teal-200 hover:text-teal-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {isOwner && (
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-black shadow-md shadow-teal-200 hover:bg-teal-700 transition-all"
              >
                <PlusCircle size={15} />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            )}
          </div>

          {/* Product Count */}
          {!loading && (
            <p className="text-xs font-bold text-slate-400">
              {filteredProducts.length} produk{searchQuery ? ` untuk "${searchQuery}"` : ""}
            </p>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {loading ? (
              <div className="col-span-full py-20 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  price={product.price}
                  imageUrl={product.signed_image_url}
                  trackStock={product.track_stock}
                  stock={product.stock}
                  onAdd={() => addToCart(product)}
                  onEdit={isOwner ? () => handleEdit(product) : undefined}
                  onDelete={isOwner ? () => deleteProduct(product.id) : undefined}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold text-sm">
                  {searchQuery
                    ? `Produk "${searchQuery}" tidak ditemukan`
                    : activeCategory === "Semua"
                      ? "Belum ada produk. Yuk tambah!"
                      : `Tidak ada produk di kategori "${activeCategory}"`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cart – Desktop */}
        <div className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-24">
          <Cart
            items={cart}
            onRemove={removeFromCart}
            onUpdateQty={updateCartQty}
            onCheckout={(discount) => { setDiscount(discount); setIsCheckoutOpen(true); }}
          />
        </div>

      </div>

      {/* ── Floating Cart Button – Mobile ───────────── */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3.5 rounded-[28px] shadow-2xl flex items-center gap-3 whitespace-nowrap active:scale-95 transition-all border border-white/10"
          >
            <div className="relative bg-teal-600 p-2 rounded-xl shadow-lg shadow-teal-500/20">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-teal-600 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-0.5">Keranjang</span>
              <span className="text-base font-black leading-none">Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <ArrowRight size={15} className="text-slate-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Cart Drawer – Mobile ─────────────────────── */}
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
              className="lg:hidden fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-[36px] p-5 pb-10 shadow-2xl flex flex-col gap-4 max-h-[88vh]"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" onClick={() => setIsCartOpen(false)} />
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800">Keranjang</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-50 rounded-full">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Cart
                  items={cart}
                  onRemove={(id) => {
                    removeFromCart(id);
                    if (cart.length === 1) setIsCartOpen(false);
                  }}
                  onUpdateQty={updateCartQty}
                  onCheckout={(discount) => {
                    setIsCartOpen(false);
                    setDiscount(discount);
                    setIsCheckoutOpen(true);
                  }}
                  isMobileView
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modals ──────────────────────────────────── */}
      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total - discount}
        discount={discount}
        qrisUrl={qrisUrl || undefined}
        qrisString={qrisString || undefined}
        storeName={storeName}
        items={cart}
        userId={session?.user?.id || ""}
        onSuccess={() => { setCart([]); setDiscount(0); fetchProducts(); }}
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
  );
}

export default App;
