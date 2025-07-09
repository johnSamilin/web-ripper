import React, { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalInput from './BrutalInput';
import BrutalButton from './BrutalButton';
import AlertMessage from './AlertMessage';

interface AuthFormData {
  username: string;
  email: string;
  password: string;
}

interface AuthFormProps {
  onSubmit: (formData: AuthFormData, isLogin: boolean) => void;
  loading: boolean;
  error: string;
  onClose: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSubmit, loading, error, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthFormData>({
    username: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, isLogin);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <BrutalCard title={isLogin ? 'AUTHENTICATE' : 'CREATE ACCOUNT'} titleBg="bg-red-500">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
            USERNAME {!isLogin && '/ EMAIL'}
          </label>
          <BrutalInput
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder={isLogin ? "username" : "username or email"}
            required
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
              EMAIL
            </label>
            <BrutalInput
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
            PASSWORD
          </label>
          <BrutalInput
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        {error && (
          <AlertMessage type="error" message={error} />
        )}

        <BrutalButton
          type="submit"
          disabled={loading}
          className="w-full"
          variant="primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              PROCESSING...
            </>
          ) : (
            <>
              <Key className="w-5 h-5" />
              {isLogin ? 'BREACH SECURITY' : 'CREATE ACCOUNT'}
            </>
          )}
        </BrutalButton>
      </form>

      <div className="mt-6 pt-4 border-t-4 border-gray-200 space-y-3">
        <button
          onClick={toggleMode}
          className="w-full text-center text-sm font-bold text-gray-700 hover:text-black uppercase tracking-wide"
        >
          {isLogin ? 'NEED ACCOUNT? REGISTER' : 'HAVE ACCOUNT? LOGIN'}
        </button>
        
        <BrutalButton
          onClick={onClose}
          className="w-full"
          variant="secondary"
        >
          CONTINUE WITHOUT ACCOUNT
        </BrutalButton>
      </div>
    </BrutalCard>
  );
};

export default AuthForm;