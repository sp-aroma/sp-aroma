import { useEffect, useState } from 'react';
import { apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct, apiUploadProductImages, apiDeleteProductImage } from '../../lib/api';
import { Search, Plus, Edit2, Trash2, X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import CreateProductWizard from './CreateProductWizard';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmDialogContext';

interface Product {
  product_id: number;
  product_name: string;
  description: string;
  price: number;
  stock_quantity: number;
  status: string;
  variants?: Array<{ variant_id: number; price: number; stock: number }>;
  media?: Array<{ media_id: number; src: string; alt: string }>;
}

const ProductManagement = () => {
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    price: '',
    stock: '',
    status: 'active',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await apiGetProducts();
      setProducts(res?.products || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setShowWizard(true);
  };

  const handleCreateSimple = () => {
    setEditingProduct(null);
    setFormData({
      product_name: '',
      description: '',
      price: '',
      stock: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Get price and stock from first variant if exists
    const firstVariant = product.variants?.[0];
    setFormData({
      product_name: product.product_name,
      description: product.description,
      price: firstVariant?.price?.toString() || '0',
      stock: firstVariant?.stock?.toString() || '0',
      status: product.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        product_name: formData.product_name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        status: formData.status,
      };

      if (editingProduct) {
        await apiUpdateProduct(editingProduct.product_id, data);
      } else {
        await apiCreateProduct(data);
      }

      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      showError('Error: ' + (err?.body?.detail || 'Failed to save product'));
    }
  };

  const handleImageUpload = async (productId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      await apiUploadProductImages(productId, files);
      await loadProducts();
      showSuccess('Images uploaded successfully!');
    } catch (err: any) {
      showError('Error uploading images: ' + (err?.body?.detail || 'Failed to upload'));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (productId: number, mediaId: number) => {
    const confirmed = await confirm({
      message: 'Delete this image?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiDeleteProductImage(productId, mediaId.toString());
      await loadProducts();
    } catch (err: any) {
      showError('Error deleting image: ' + (err?.body?.detail || 'Failed to delete'));
    }
  };

  const handleDelete = async (productId: number) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this product?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiDeleteProduct(productId);
      await loadProducts();
    } catch (err: any) {
      showError('Error: ' + (err?.body?.detail || 'Failed to delete product'));
    }
  };

  const filteredProducts = products.filter((product) =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-light tracking-widest">Product Management</h2>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
              />
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-gray-600">Loading products...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-600">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Stock</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        {product.media?.[0]?.src && (
                          <img
                            src={product.media[0].src}
                            alt={product.product_name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.product_name}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-medium text-heading">
                        ₹{product.variants?.[0]?.price || 0}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-gray-600">{product.variants?.[0]?.stock || 0}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.product_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <p className="text-center py-8 text-gray-600">No products found</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-light tracking-widest">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {editingProduct && (
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ImageIcon className="inline w-4 h-4 mr-1" />
                      Product Images
                    </label>

                    {/* Existing Images */}
                    {editingProduct.media && editingProduct.media.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {editingProduct.media.map((img) => (
                          <div key={img.media_id} className="relative group">
                            <img
                              src={img.src}
                              alt={img.alt}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(editingProduct.product_id, img.media_id)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload New Images */}
                    <div className="flex items-center gap-2">
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(editingProduct.product_id, e.target.files)}
                        disabled={uploadingImages}
                        className="hidden"
                      />
                      <label
                        htmlFor="image-upload"
                        className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-heading transition-colors ${
                          uploadingImages ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload size={16} />
                        {uploadingImages ? 'Uploading...' : 'Upload Images'}
                      </label>
                      <span className="text-sm text-gray-500">
                        (Multiple files supported)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors"
                >
                  <Save size={18} />
                  {editingProduct ? 'Update' : 'Create'} Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Wizard Modal */}
      {showWizard && (
        <CreateProductWizard
          onClose={() => setShowWizard(false)}
          onSuccess={loadProducts}
        />
      )}
    </>
  );
};

export default ProductManagement;
