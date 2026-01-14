import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGetProduct, apiGetProducts } from '../lib/api';
import { Plus, Minus, ChevronRight, Check, ShoppingBag, Heart, Share2, Package, Shield, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import ProductCard from '../components/ProductCard';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductVariant {
  variant_id: number;
  price: number;
  stock: number;
  option1?: number;
  option2?: number;
  option3?: number;
  option1_name?: string;
  option2_name?: string;
  option3_name?: string;
  images?: string[];
}

const ProductDetailPage = () => {
  const { productId } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');
  const [isAdded, setIsAdded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const { addToCart } = useCart();
  const { error: showError, success: showSuccess } = useToast();

  const [product, setProduct] = useState<any | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!productId) return;
      setLoading(true);
      setSelectedImageIndex(0);
      try {
        const res = await apiGetProduct(productId);
        const p = res?.product;
        
        if (!p) {
          if (mounted) setProduct(null);
          return;
        }

        // Organize media by variant
        const productImages = (p.media || []).filter((m: any) => !m.variant_id).map((m: any) => m.src);
        const variantsWithImages = (p.variants || []).map((v: any) => ({
          ...v,
          images: (p.media || [])
            .filter((m: any) => m.variant_id === v.variant_id)
            .map((m: any) => m.src)
        }));

        const mapped = {
          id: p.product_id,
          name: p.product_name,
          type: p.product_type === 'attar' ? 'Attar' : 'Perfume',
          price: p.price || (variantsWithImages[0] ? variantsWithImages[0].price : 0),
          originalPrice: undefined,
          productImages: productImages.length > 0 ? productImages : ['/placeholder.png'],
          categories: [],
          category: p.category,
          product_type: p.product_type,
          shortDescription: p.description || '',
          longDescription: p.description || '',
          ingredients: p.ingredients || '',
          howToUse: p.how_to_use || '',
          variants: variantsWithImages,
          options: p.options || [],
        };

        if (mounted) {
          setProduct(mapped);
          // Set initial variant and images
          if (variantsWithImages.length > 0) {
            const firstVariant = variantsWithImages[0];
            setSelectedVariant(firstVariant);
            setCurrentImages(firstVariant.images.length > 0 ? firstVariant.images : mapped.productImages);
          } else {
            setCurrentImages(mapped.productImages);
          }
        }

        // Load all products for related list
        const allRes = await apiGetProducts();
        const items = allRes?.products || [];
        const mappedAll = items.map((it: any) => ({
          id: it.product_id,
          name: it.product_name,
          type: it.product_type === 'attar' ? 'Attar' : 'Perfume',
          price: it.price ? `₹${it.price}` : (it.variants && it.variants[0] ? `₹${it.variants[0].price}` : '₹0'),
          imageUrl: (it.media && it.media[0] && it.media[0].src) || '/placeholder.png',
          shortDescription: it.description || '',
          category: it.category,
        }));
        if (mounted && mapped) {
          setRelatedProducts(mappedAll.filter((x: any) => x.id !== mapped.id).slice(0,3));
        } else if (mounted) {
          setRelatedProducts(mappedAll.slice(0,3));
        }
      } catch (err) {
        console.warn('Failed to load product', err);
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [productId]);

  // Update images when variant changes
  useEffect(() => {
    if (selectedVariant && product) {
      if (selectedVariant.images && selectedVariant.images.length > 0) {
        setCurrentImages(selectedVariant.images);
      } else {
        setCurrentImages(product.productImages);
      }
      setSelectedImageIndex(0);
    }
  }, [selectedVariant, product]);

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (product && selectedVariant) {
      try {
        const cartProduct = {
          ...product,
          price: `₹${selectedVariant.price}`,
          variantId: selectedVariant.variant_id,
        };
        await addToCart(cartProduct, quantity);
        setIsAdded(true);
        showSuccess(`Added ${quantity} item(s) to cart!`);
      } catch (err: any) {
        showError(err.message || 'Failed to add to cart');
      }
    }
  };

  useEffect(() => {
    if (isAdded) {
      const timer = setTimeout(() => setIsAdded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAdded]);
  
  if (loading) {
    return (
      <div className="pt-32 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-heading border-t-transparent mb-4"></div>
        <h1 className="text-4xl font-light tracking-widest">Loading...</h1>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl font-light tracking-widest">Product Not Found</h1>
        <p className="mt-4 text-foreground">We couldn't find the fragrance you were looking for.</p>
        <Link 
          to="/products"
          className="mt-8 inline-block bg-heading text-white font-sans capitalize text-lg px-12 py-4 rounded-full hover:bg-opacity-90 transition-colors"
        >
          Back to All Products
        </Link>
      </div>
    );
  }

  const accordionItems = [
    { 
      title: 'Description', 
      content: product.longDescription || 'No description available.',
      icon: Sparkles
    },
    { 
      title: 'Ingredients', 
      content: product.ingredients || 'Ingredients information not available.',
      icon: Package
    },
    { 
      title: 'How to Use', 
      content: product.howToUse || 'Usage instructions not available.',
      icon: Shield
    },
  ];

  return (
    <main className="pt-20 bg-background">
      {/* Breadcrumb */}
      <div className="bg-primary-bg border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Link to="/" className="hover:text-heading transition-colors">Home</Link>
            <ChevronRight size={14} />
            <Link to="/products" className="hover:text-heading transition-colors">Products</Link>
            <ChevronRight size={14} />
            <span className="text-heading font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-20">
          {/* Image Gallery Column */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col"
          >
            {/* Main Image with Badge */}
            <div className="relative bg-primary-bg rounded-2xl overflow-hidden aspect-square mb-4 group">
              <motion.img 
                key={`${selectedVariant?.variant_id}-${selectedImageIndex}`}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                src={currentImages[selectedImageIndex]} 
                alt={`${product.name} - Image ${selectedImageIndex + 1}`} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <span className="text-xs font-jost uppercase tracking-widest text-heading">{product.type}</span>
              </div>
              {product.category && (
                <div className="absolute top-4 right-4 bg-heading/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                  <span className="text-xs font-jost uppercase tracking-widest text-white">{product.category}</span>
                </div>
              )}
              {selectedVariant && product.variants.length > 1 && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                  <span className="text-xs font-jost uppercase tracking-widest text-heading">
                    {selectedVariant.option1_name || 'Variant'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {currentImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-heading scrollbar-track-gray-100">
                {currentImages.map((img: string, index: number) => (
                  <motion.button
                    key={`thumb-${selectedVariant?.variant_id}-${index}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                      selectedImageIndex === index 
                        ? "border-heading shadow-lg scale-105" 
                        : "border-gray-200 hover:border-heading/50"
                    )}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} thumbnail ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Variant Image Count Badge */}
            {selectedVariant && selectedVariant.images && selectedVariant.images.length > 0 && (
              <div className="mt-3 text-center">
                <span className="inline-block px-3 py-1 bg-primary-bg rounded-full text-xs text-foreground">
                  {selectedVariant.images.length} {selectedVariant.images.length === 1 ? 'image' : 'images'} for this variant
                </span>
              </div>
            )}
          </motion.div>

          {/* Product Details Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Product Title & Price */}
            <div className="mb-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-widest mb-4">{product.name}</h1>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-sans text-heading font-medium">
                  ₹{selectedVariant?.price || product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-2xl text-gray-400 line-through">{product.originalPrice}</span>
                )}
              </div>
              {selectedVariant && selectedVariant.stock !== undefined && (
                <p className="mt-2 text-sm text-foreground">
                  {selectedVariant.stock > 0 ? (
                    <span className="text-green-600">In Stock ({selectedVariant.stock} available)</span>
                  ) : (
                    <span className="text-red-600">Out of Stock</span>
                  )}
                </p>
              )}
            </div>

            {/* Short Description */}
            <p className="text-lg text-foreground leading-relaxed mb-8 pb-8 border-b border-gray-200">
              {product.shortDescription}
            </p>

            {/* Variant Selector */}
            {product.variants && product.variants.length > 1 && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <label className="block text-sm font-jost uppercase tracking-widest text-foreground mb-4">
                  Select Variant
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {product.variants.map((variant: ProductVariant) => (
                    <motion.button
                      key={variant.variant_id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVariantSelect(variant)}
                      disabled={variant.stock === 0}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all text-left",
                        selectedVariant?.variant_id === variant.variant_id
                          ? "border-heading bg-primary-bg shadow-md"
                          : "border-gray-200 hover:border-heading/50",
                        variant.stock === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-heading">
                          {variant.option1_name || `Variant ${variant.variant_id}`}
                        </span>
                        <span className="text-xs text-foreground">₹{variant.price}</span>
                        {variant.images && variant.images.length > 0 && (
                          <span className="text-xs text-gray-400 mt-1">
                            {variant.images.length} {variant.images.length === 1 ? 'photo' : 'photos'}
                          </span>
                        )}
                      </div>
                      {selectedVariant?.variant_id === variant.variant_id && (
                        <motion.div
                          layoutId="selected-variant"
                          className="absolute -top-1 -right-1 w-6 h-6 bg-heading rounded-full flex items-center justify-center"
                        >
                          <Check size={14} className="text-white" />
                        </motion.div>
                      )}
                      {variant.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                          <span className="text-xs font-medium text-red-600">Out of Stock</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-jost uppercase tracking-widest text-foreground mb-3">Quantity</label>
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center border-2 border-gray-200 rounded-full overflow-hidden">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-primary-bg transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={18} />
                    </motion.button>
                    <span className="w-16 h-12 flex items-center justify-center font-sans text-xl font-medium">{quantity}</span>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-primary-bg transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={18} />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 font-sans uppercase tracking-wider px-8 py-4 rounded-full transition-all duration-300 shadow-lg",
                    isAdded 
                      ? "bg-green-500 text-white" 
                      : selectedVariant && selectedVariant.stock > 0
                      ? "bg-heading text-white hover:bg-opacity-90 hover:shadow-xl"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                  disabled={isAdded || !selectedVariant || selectedVariant.stock === 0}
                >
                  {isAdded ? (
                    <>
                      <Check size={20} /> Added to Cart!
                    </>
                  ) : selectedVariant && selectedVariant.stock === 0 ? (
                    <>Out of Stock</>
                  ) : (
                    <>
                      <ShoppingBag size={20} /> Add to Cart
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-14 h-14 flex items-center justify-center border-2 border-gray-200 rounded-full hover:border-heading hover:text-heading transition-colors"
                  aria-label="Add to wishlist"
                >
                  <Heart size={20} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-14 h-14 flex items-center justify-center border-2 border-gray-200 rounded-full hover:border-heading hover:text-heading transition-colors"
                  aria-label="Share product"
                >
                  <Share2 size={20} />
                </motion.button>
              </div>
            </div>

            {/* Product Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 p-6 bg-primary-bg rounded-2xl">
              <div className="text-center">
                <Package className="w-8 h-8 text-heading mx-auto mb-2" />
                <p className="text-xs font-jost uppercase tracking-widest text-foreground">Premium Quality</p>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 text-heading mx-auto mb-2" />
                <p className="text-xs font-jost uppercase tracking-widest text-foreground">100% Authentic</p>
              </div>
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-heading mx-auto mb-2" />
                <p className="text-xs font-jost uppercase tracking-widest text-foreground">Handcrafted</p>
              </div>
            </div>

            {/* Accordion Details */}
            <div className="space-y-3">
              {accordionItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div 
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow"
                  >
                    <button 
                      className="w-full flex justify-between items-center text-left px-6 py-5 hover:bg-primary-bg/30 transition-colors"
                      onClick={() => setOpenAccordion(openAccordion === item.title.toLowerCase() ? null : item.title.toLowerCase())}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-heading" />
                        <h4 className="text-lg font-jost tracking-widest uppercase">{item.title}</h4>
                      </div>
                      <motion.div
                        animate={{ rotate: openAccordion === item.title.toLowerCase() ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Plus className="w-5 h-5 text-heading" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openAccordion === item.title.toLowerCase() && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-5 pt-2">
                            <p className="text-foreground leading-relaxed">{item.content}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 sm:py-24 bg-primary-bg">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl sm:text-5xl font-light tracking-widest mb-4">
                You Might Also Like
              </h2>
              <p className="text-foreground text-lg">Discover more exquisite fragrances</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {relatedProducts.map((p, index) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default ProductDetailPage;
