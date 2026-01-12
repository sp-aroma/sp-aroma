import { useState } from 'react';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import OrderHistorySection from '../components/dashboard/OrderHistorySection';
import ProfileSection from '../components/dashboard/ProfileSection';
import SalesSection from '../components/dashboard/SalesSection';
import AdminProductsSection from '../components/dashboard/AdminProductsSection';
import AddressesSection from '../components/dashboard/AddressesSection';

export type DashboardView = 'profile' | 'orders' | 'addresses' | 'sales' | 'products';

const AccountPage = () => {
  const [activeView, setActiveView] = useState<DashboardView>('profile');

  return (
    <main className="pt-32 pb-24 bg-primary-bg min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-light tracking-widest text-center mb-12">
          My Account
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          <DashboardSidebar activeView={activeView} setActiveView={setActiveView} />
          <div className="lg:col-span-3">
            {activeView === 'profile' && <ProfileSection />}
            {activeView === 'orders' && <OrderHistorySection />}
            {activeView === 'addresses' && <AddressesSection />}
            {activeView === 'sales' && <SalesSection />}
            {activeView === 'products' && <AdminProductsSection />}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AccountPage;
