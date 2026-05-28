import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const VNPayCallbackRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    const target = `${API_BASE}/api/payments/vnpay-callback${location.search}`;
    window.location.replace(target);
  }, [location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default VNPayCallbackRedirect;
