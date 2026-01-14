import { useEffect, useState } from 'react';
import { apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmDialogContext';

const emptyNew = { product_name: '', description: '', status: '', price: '' };

const AdminProductsSection = () => {
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProd, setNewProd] = useState<any>(emptyNew);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGetProducts();
      setProducts(res?.products || []);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    try {
      await apiCreateProduct({
        product_name: newProd.product_name,
        description: newProd.description,
        status: newProd.status,
        price: Number(newProd.price || 0),
      });
      setNewProd(emptyNew);
      setCreating(false);
      await load();
      showSuccess('Product created successfully!');
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.body?.detail || err?.message || 'Failed to create product';
      showError('Error: ' + errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      message: 'Delete this product?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await apiDeleteProduct(id);
      await load();
      showSuccess('Product deleted');
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.body?.detail || err?.message || 'Failed to delete product';
      showError('Error: ' + errorMsg);
    }
  };

  const handleUpdate = async (id: number, updates: any) => {
    try {
      await apiUpdateProduct(id, updates);
      await load();
      showSuccess('Product updated');
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.body?.detail || err?.message || 'Failed to update product';
      showError('Error: ' + errorMsg);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-2xl font-light mb-4">Manage Products</h2>

      <div className="mb-4">
        <button
          onClick={() => setCreating(!creating)}
          className="bg-heading text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
        >
          {creating ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="space-y-3 mb-6 p-4 border border-gray-200 rounded">
          <input
            placeholder="Product Name"
            value={newProd.product_name}
            onChange={(e) =>
              setNewProd({ ...newProd, product_name: e.target.value })
            }
            className="w-full p-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
            required
          />
          <textarea
            placeholder="Description"
            value={newProd.description}
            onChange={(e) =>
              setNewProd({ ...newProd, description: e.target.value })
            }
            className="w-full p-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
            rows={3}
          />
          <input
            placeholder="Status (e.g., active, attar)"
            value={newProd.status}
            onChange={(e) =>
              setNewProd({ ...newProd, status: e.target.value })
            }
            className="w-full p-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
          />
          <input
            placeholder="Price"
            type="number"
            step="0.01"
            value={newProd.price}
            onChange={(e) =>
              setNewProd({ ...newProd, price: e.target.value })
            }
            className="w-full p-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
          />

          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
            Create Product
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-center py-4">Loading products…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="border-b">
                <th className="p-2">ID</th>
                <th className="p-2">Name</th>
                <th className="p-2">Description</th>
                <th className="p-2">Price</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{p.product_id}</td>
                  <td className="p-2">
                    <InlineEdit
                      value={p.product_name}
                      onSave={(v) => handleUpdate(p.product_id, { product_name: v })}
                    />
                  </td>
                  <td className="p-2">
                    <div className="text-sm text-gray-600 max-w-xs truncate">{p.description}</div>
                  </td>
                  <td className="p-2">
                    {p.price ??
                      (p.variants && p.variants[0] ? `₹${p.variants[0].price}` : '—')}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleDelete(p.product_id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const InlineEdit = ({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  useEffect(() => setV(value), [value]);

  if (!editing)
    return (
      <div className="flex items-center gap-2">
        <span>{value}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
      </div>
    );

  return (
    <div className="flex gap-2">
      <input
        className="p-1 border flex-1"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        className="text-green-600 hover:text-green-800"
        onClick={() => {
          onSave(v);
          setEditing(false);
        }}
      >
        Save
      </button>
      <button
        className="text-gray-600 hover:text-gray-800"
        onClick={() => {
          setV(value);
          setEditing(false);
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default AdminProductsSection;
