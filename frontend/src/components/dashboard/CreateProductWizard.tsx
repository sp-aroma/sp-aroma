import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Eye, Upload, Trash2 } from 'lucide-react';
import { apiCreateProductComprehensive, apiUploadImageTemp } from '../../lib/api';

interface Option {
  option_name: string;
  items: string[];
}

interface VariantImage {
  src: string;
  cloudinary_id: string;
  alt?: string;
  type: string;
  file?: File;
}

interface Variant {
  option1?: string;
  option2?: string;
  option3?: string;
  price: number;
  stock: number;
  images: VariantImage[];
}

interface ProductFormData {
  product_name: string;
  description: string;
  status: string;
  options: Option[];
  variants: Variant[];
  product_images: VariantImage[];
}

interface CreateProductWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateProductWizard = ({ onClose, onSuccess }: CreateProductWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    description: '',
    status: 'draft',
    options: [],
    variants: [],
    product_images: [],
  });

  // State for adding options
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionItems, setNewOptionItems] = useState('');

  const steps = [
    'Basic Info',
    'Options',
    'Variants',
    'Preview',
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddOption = () => {
    if (!newOptionName || !newOptionItems) return;

    const items = newOptionItems.split(',').map(item => item.trim()).filter(Boolean);
    if (items.length === 0) return;

    setFormData({
      ...formData,
      options: [...formData.options, { option_name: newOptionName, items }],
    });

    setNewOptionName('');
    setNewOptionItems('');
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const generateVariants = () => {
    const { options } = formData;
    if (options.length === 0) {
      // No options - create one default variant
      return [{
        price: 0,
        stock: 0,
        images: [],
      }];
    }

    // Generate all combinations of option values
    const combinations: string[][] = [[]];
    
    for (const option of options) {
      const newCombinations: string[][] = [];
      for (const combo of combinations) {
        for (const item of option.items) {
          newCombinations.push([...combo, item]);
        }
      }
      combinations.splice(0, combinations.length, ...newCombinations);
    }

    return combinations.map(combo => ({
      option1: combo[0] || undefined,
      option2: combo[1] || undefined,
      option3: combo[2] || undefined,
      price: 0,
      stock: 0,
      images: [],
    }));
  };

  const handleGenerateVariants = () => {
    const variants = generateVariants();
    setFormData({ ...formData, variants });
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const handleImageUpload = async (file: File, isProductImage: boolean, variantIndex?: number) => {
    try {
      // Upload image and get base64 preview with temp ID
      const upload = await apiUploadImageTemp(file);
      
      const imageData: VariantImage = {
        src: upload.src,
        cloudinary_id: upload.cloudinary_id,
        alt: formData.product_name,
        type: upload.type,
        file,
      };

      if (isProductImage) {
        setFormData({
          ...formData,
          product_images: [...formData.product_images, imageData],
        });
      } else if (variantIndex !== undefined) {
        const newVariants = [...formData.variants];
        newVariants[variantIndex].images.push(imageData);
        setFormData({ ...formData, variants: newVariants });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image');
    }
  };

  const handleRemoveImage = (isProductImage: boolean, imageIndex: number, variantIndex?: number) => {
    if (isProductImage) {
      setFormData({
        ...formData,
        product_images: formData.product_images.filter((_, i) => i !== imageIndex),
      });
    } else if (variantIndex !== undefined) {
      const newVariants = [...formData.variants];
      newVariants[variantIndex].images = newVariants[variantIndex].images.filter((_, i) => i !== imageIndex);
      setFormData({ ...formData, variants: newVariants });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Filter out temp images (those with base64 src) for now
      // In production, these should be uploaded to Cloudinary first
      const submitData = {
        ...formData,
        product_images: [],  // Skip images for now - can be added after product creation
        variants: formData.variants.map(v => ({
          ...v,
          images: []  // Skip variant images for now
        }))
      };
      
      await apiCreateProductComprehensive(submitData);
      alert('Product created successfully! You can now add images using the edit product option.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      alert('Error: ' + (err?.body?.detail || 'Failed to create product'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Product Information</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Product Name *</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter product name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={4}
                placeholder="Enter product description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product Options (Color, Size, etc.)</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Add options like Color, Size, Material. Maximum 3 options allowed.
              </p>
            </div>
            
            {/* Add Option Form */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Option Name</label>
                  <input
                    type="text"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Color, Size"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Values (comma-separated)</label>
                  <input
                    type="text"
                    value={newOptionItems}
                    onChange={(e) => setNewOptionItems(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Red, Blue, Green"
                  />
                </div>
              </div>
              <button
                onClick={handleAddOption}
                disabled={formData.options.length >= 3}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
              >
                Add Option
              </button>
            </div>

            {/* Display Options */}
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="border rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{option.option_name}</p>
                    <p className="text-sm text-gray-600">{option.items.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product Variants</h3>
            
            {formData.options.length > 0 && formData.variants.length === 0 && (
              <button
                onClick={handleGenerateVariants}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Generate Variants from Options
              </button>
            )}

            {formData.variants.length === 0 && formData.options.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No options defined. A default variant will be created.</p>
              </div>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {formData.variants.map((variant, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <p className="font-semibold mb-3">
                    Variant: {[variant.option1, variant.option2, variant.option3].filter(Boolean).join(' / ') || 'Default'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, 'price', parseFloat(e.target.value))}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Stock *</label>
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preview Product</h3>
            <p className="text-sm text-gray-600">Review your product before creation</p>
            
            {/* Product Card Preview */}
            <div className="border rounded-lg overflow-hidden bg-white shadow-lg max-w-sm mx-auto">
              <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                <p className="text-gray-400">No image (add after creation)</p>
              </div>
              
              <div className="p-6">
                <h4 className="text-xl font-bold mb-2">{formData.product_name || 'Product Name'}</h4>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {formData.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    {formData.variants.length > 0 && (
                      <p className="text-2xl font-bold text-indigo-600">
                        ${Math.min(...formData.variants.map(v => v.price)).toFixed(2)}
                        {formData.variants.length > 1 && ' - '}
                        {formData.variants.length > 1 && `$${Math.max(...formData.variants.map(v => v.price)).toFixed(2)}`}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    formData.status === 'active' ? 'bg-green-100 text-green-800' :
                    formData.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.status}
                  </span>
                </div>

                {formData.options.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index}>
                        <p className="text-sm font-medium text-gray-700">{option.option_name}:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {option.items.slice(0, 3).map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {item}
                            </span>
                          ))}
                          {option.items.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{option.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-2">Summary</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {formData.variants.length} variant(s)</li>
                <li>• Status: {formData.status}</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Images can be added after product creation using the Product Management interface.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Create New Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="border-b p-4 bg-gray-50">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex flex-col items-center ${index <= currentStep - 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    index < currentStep - 1 ? 'bg-indigo-600 border-indigo-600' :
                    index === currentStep - 1 ? 'border-indigo-600' :
                    'border-gray-300'
                  }`}>
                    {index < currentStep - 1 ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span className={index === currentStep - 1 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-8 md:w-16 mx-1 ${index < currentStep - 1 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              disabled={currentStep === 1 && !formData.product_name}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Product'}
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateProductWizard;
