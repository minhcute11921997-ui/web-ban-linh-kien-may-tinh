import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { googleLogin } from '../api/authApi';
import useAuthStore from '../store/authStore';

const GoogleAuthButton = ({ onSuccessRedirect, text = 'continue_with' }) => {
  const { setAuth } = useAuthStore();
  const isConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const handleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse.credential;
      if (!credential) throw new Error('Google credential is missing');

      const res = await googleLogin(credential);
      setAuth(res.data.user, res.data.token, res.data.refreshToken);
      onSuccessRedirect?.(res.data.user);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dang nhap Google that bai');
    }
  };

  if (!isConfigured) {
    return (
      <button
        type="button"
        disabled
        className="w-full border border-gray-300 text-gray-400 py-2 rounded-lg cursor-not-allowed"
      >
        Google login chua duoc cau hinh
      </button>
    );
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Khong the dang nhap bang Google')}
        text={text}
        shape="rectangular"
        width="360"
      />
    </div>
  );
};

export default GoogleAuthButton;
