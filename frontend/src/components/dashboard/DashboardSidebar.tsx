import { User, Package, LogOut, ShoppingCart, Database, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashboardView } from '../../pages/AccountPage';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardSidebarProps {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
}

const DashboardSidebar = ({ activeView, setActiveView }: DashboardSidebarProps) => {
  const { user } = useAuth();
  const isAdmin = !!user?.is_superuser;

  const navItems = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'addresses', label: 'My Addresses', icon: MapPin },
  ];

  if (isAdmin) {
    navItems.push({ id: 'sales', label: 'Sales / Orders', icon: ShoppingCart });
    navItems.push({ id: 'products', label: 'Products (Admin)', icon: Database });
  }

  return (
    <aside className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
      <nav className="space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as DashboardView)}
            className={cn(
              'w-full flex items-center gap-4 px-4 py-3 rounded-md text-left text-lg transition-colors',
              activeView === item.id
                ? 'bg-primary-bg text-heading font-bold'
                : 'text-foreground hover:bg-gray-100'
            )}
          >
            <item.icon size={22} strokeWidth={1.5} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="border-t border-gray-200 !mt-4 pt-4">
            <LogoutButton />
        </div>
      </nav>
    </aside>
  );
};

const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <button
      onClick={() => logout()}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-md text-left text-lg text-foreground hover:bg-gray-100 transition-colors"
    >
      <LogOut size={22} strokeWidth={1.5} />
      <span>Logout</span>
    </button>
  );
};

export default DashboardSidebar;
