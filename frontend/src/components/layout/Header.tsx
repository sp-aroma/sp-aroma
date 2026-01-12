import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, ShoppingBag, LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Our Story", href: "/#our-story" },
    { name: "Shop", href: "/products" },
    { name: "Custom Scents", href: "/#custom-scents" },
    { name: "Reviews", href: "/#reviews" },
    { name: "Connect", href: "/#connect" },
  ];

  const handleUserIconClick = () => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (user?.is_admin || user?.is_superuser) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const renderNavLink = (link: { name: string, href: string }, isMobile: boolean = false) => {
    const className = isMobile
      ? "text-xl font-light text-dark-text hover:text-heading transition-colors capitalize"
      : "text-lg font-light text-dark-text hover:text-heading transition-colors capitalize";

    if (link.href.startsWith('/#')) {
      return (
        <a key={link.name} href={link.href} className={className} onClick={() => isMobile && setIsMenuOpen(false)}>
          {link.name}
        </a>
      );
    }
    return (
      <Link key={link.name} to={link.href} className={className} onClick={() => isMobile && setIsMenuOpen(false)}>
        {link.name}
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/20 backdrop-blur-lg border-b border-white/30 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <Link to="/" className="font-jost text-3xl font-light tracking-[0.2em] text-heading uppercase">
            SP Aroma
          </Link>
          
          <div className="flex items-center gap-10">
            <nav className="hidden lg:flex items-center gap-10">
              {navLinks.map(link => renderNavLink(link))}
            </nav>
            <div className="hidden lg:flex items-center gap-6">
              <button 
                onClick={handleUserIconClick} 
                className="text-dark-text hover:text-heading transition-colors" 
                aria-label={isAuthenticated ? ((user?.is_admin || user?.is_superuser) ? "Admin Dashboard" : "My Dashboard") : "Login"}
                title={isAuthenticated ? ((user?.is_admin || user?.is_superuser) ? "Admin Dashboard" : "My Dashboard") : "Login"}
              >
                {isAuthenticated ? <LayoutDashboard size={22} strokeWidth={1.5} /> : <User size={22} strokeWidth={1.5} />}
              </button>
              <Link to="/cart" className="relative text-dark-text hover:text-heading transition-colors" aria-label="Shopping Cart">
                <ShoppingBag size={22} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-heading text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              {isAuthenticated && (
                <button 
                  onClick={handleLogout}
                  className="text-dark-text hover:text-heading transition-colors" 
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut size={22} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 lg:hidden">
            <button 
              onClick={handleUserIconClick} 
              className="text-dark-text hover:text-heading transition-colors" 
              aria-label={isAuthenticated ? ((user?.is_admin || user?.is_superuser) ? "Admin Dashboard" : "My Dashboard") : "Login"}
            >
              {isAuthenticated ? <LayoutDashboard size={26} strokeWidth={1.5} /> : <User size={26} strokeWidth={1.5} />}
            </button>
            <Link to="/cart" className="relative text-dark-text hover:text-heading transition-colors" aria-label="Shopping Cart">
                <ShoppingBag size={26} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-heading text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            {isAuthenticated && (
              <button 
                onClick={handleLogout}
                className="text-dark-text hover:text-heading transition-colors" 
                aria-label="Logout"
              >
                <LogOut size={26} strokeWidth={1.5} />
              </button>
            )}
            <button
              className="p-2 text-dark-text hover:text-heading"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
        isMenuOpen ? "max-h-screen" : "max-h-0",
        "bg-white/80 backdrop-blur-md absolute w-full shadow-lg"
      )}>
        <nav className="flex flex-col items-center gap-6 py-8">
          {navLinks.map(link => renderNavLink(link, true))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
