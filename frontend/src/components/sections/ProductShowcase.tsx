import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Product } from '../../types';
import ProductCard from '../ProductCard';

interface ProductShowcaseProps {
  title: string;
  description: string;
  products: Product[];
  id: string;
}

const ProductShowcase = ({ title, description, products, id }: ProductShowcaseProps) => {
  // Don't render section if no products
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section id={id} className="py-16 sm:py-24 border-t border-gray-100 first:border-t-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-light tracking-widest">
            {title}
          </h2>
          <p className="mt-4 text-foreground text-lg">
            {description}
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 mt-16"
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-16">
            <Link 
              to="/products"
              className="inline-block bg-white text-foreground font-sans capitalize text-lg px-12 py-5 shadow-[0px_0px_30px_0px_rgba(116,144,155,0.06)] hover:bg-gray-100 transition-colors"
            >
              Explore The Full Collection
            </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
