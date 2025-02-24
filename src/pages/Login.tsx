import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import '../styles/pages/Login.css';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('登录成功！');
      navigate('/units');
    } catch (error: any) {
      toast.error('邮箱或密码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const {error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/units`,
        }
      });

      if (error) throw error;
      
      toast.success('注册邮件已发送，请查收邮件完成验证！');
      setIsRegister(false); // 返回登录界面
    } catch (error: any) {
      toast.error(
        error.message === 'User already registered'
          ? '该邮箱已注册'
          : '注册失败，请重试'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2 className="login-title">
            {isRegister ? '注册账户' : '登录账户'}
          </h2>
          <p className="login-subtitle">
            {isRegister ? '创建新账户' : '使用邮箱登录'}
          </p>
        </div>
        
        <form className="login-form" onSubmit={isRegister ? handleSignUp : handleLogin}>
          <div className="form-fields">
            <div className="form-field">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-email"
                placeholder="邮箱地址"
              />
            </div>
            <div className="form-field">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-password ${!isRegister ? 'input-password-last' : ''}`}
                placeholder="密码"
                minLength={6}
              />
            </div>
            {isRegister && (
              <div className="form-field">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-password input-password-last"
                  placeholder="确认密码"
                  minLength={6}
                />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? (isRegister ? '注册中...' : '登录中...') : (isRegister ? '注册' : '登录')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="switch-button"
            >
              {isRegister ? '返回登录' : '注册账户'}
            </button>
          </div>

          <div className="form-info">
            <p>密码至少需要 6 个字符</p>
            {isRegister && (
              <p className="register-note">注册后需要验证邮箱才能登录</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}; 