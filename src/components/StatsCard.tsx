"use client";

import { useState, useEffect } from 'react';
import '../styles/components/StatsCard.css';
import { supabase } from '../lib/supabase';
import { LogOut, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useAppSelector } from "../redux/hooks";

export const StatsCard = () => {
  const navigate = useNavigate();
  const [unicornCount, setUnicornCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimedGifts, setClaimedGifts] = useState<number[]>([]);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [activeGiftIndex, setActiveGiftIndex] = useState<number | null>(null);

  // 从 Redux 获取数据
  const { data: units } = useAppSelector((state) => state.units);
  const { data: unicornRecords } = useAppSelector((state) => state.unicornRecords);
  
  // 计算统计数据
  const completedUnits = units.filter((unit: any) => unit.completed).length;
  const totalUnits = units.length;
  const completionPercentage = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  useEffect(() => {
    const fetchUnicornCount = async () => {
      try {
        setLoading(true);
        if (loading) {
          
        }
        
        // 获取当前用户
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          console.log("No user data available");
          return;
        }
        
        // 查询用户的所有独角兽记录数量
        const { data: unicornData, error: unicornError } = await supabase
          .from('unicorn_records')
          .select('id')
          .eq('user_id', userData.user.id);
          
        if (unicornError) throw unicornError;
        
        // 设置独角兽数量
        setUnicornCount(unicornData.length);
        
        // 查询用户已领取的礼物
        const { data: giftData, error: giftError } = await supabase
          .from('gift_claims')
          .select('gift_index')
          .eq('user_id', userData.user.id);
          
        if (giftError) throw giftError;
        
        // 设置已领取的礼物索引
        setClaimedGifts(giftData.map(item => item.gift_index));
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUnicornCount();
  }, []);

  // 计算应该显示多少个礼物图标
  const giftCount = Math.floor(unicornCount / 15);
  
  // 处理礼物图标点击，添加礼花效果
  const handleGiftClick = (index: number) => {
    if (!claimedGifts.includes(index)) {
      setActiveGiftIndex(index);
      setShowGiftPopup(true);
      
      // 延迟一点时间后触发礼花效果，等弹窗显示出来
      setTimeout(() => {
        triggerConfetti();
      }, 300);
    }
  };
  
  // 触发礼花效果
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      gravity: 0.5,
      scalar: 1.4,
      shapes: ['circle', 'square', 'star'],
      ticks: 500,
      colors: ['#d3648b', '#f3cb6f', '#6b5ecd', '#418443', '#9335b9', '#da802c' ],
      zIndex: 2000 // 设置更高的 z-index 确保显示在弹窗前面
    });
  };
  
  // 处理礼物领取
  const handleClaimGift = async () => {
    if (activeGiftIndex === null) return;
    
    try {
      // 获取当前用户
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      
      // 记录礼物领取
      const { error } = await supabase
        .from('gift_claims')
        .insert({
          user_id: userData.user.id,
          gift_index: activeGiftIndex,
          claimed_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      // 更新已领取礼物列表
      setClaimedGifts([...claimedGifts, activeGiftIndex]);
      setShowGiftPopup(false);
      toast.success('Gift claimed successfully!');
      
    } catch (error) {
      console.error('Error claiming gift:', error);
      toast.error('Failed to claim gift');
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="stats-card">
      <h4 className="card-title">Unicorn Count</h4>
      <div className="card-content">
        {/* 独角兽计数显示 */}
        <div className="unicorn-counter">
          <div className="unicorn-icon-large">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="48" 
              height="48" 
              viewBox="0 0 32 32" 
              fill="none" 
              stroke="#8d4bb9" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-unicorn-head"
            >
              <path d="m15.6 4.8 2.7 2.3"/>
              <path d="M15.5 10S19 7 22 2c-6 2-10 5-10 5"/>
              <path d="M11.5 12H11"/>
              <path d="M5 15a4 4 0 0 0 4 4h7.8l.3.3a3 3 0 0 0 4-4.46L12 7c0-3-1-5-1-5S8 3 8 7c-4 1-6 3-6 3"/>
              <path d="M2 4.5C4 3 6 3 6 3l2 4"/>
              <path d="M6.14 17.8S4 19 2 22"/>
            </svg>
          </div>
          <div className="unicorn-count-display">
            <span className="unicorn-count-number">{unicornCount}</span>
            <span className="unicorn-count-label">Unicorns Collected</span>
          </div>
        </div>
        
        {/* 进度条显示 */}
        <div className="unicorn-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${Math.min((unicornCount % 15) / 15 * 100, 100)}%` }}
            ></div>
          </div>
          <div className="progress-text">{unicornCount % 15} of 15 to next gift</div>
          
          {/* 礼物图标显示 */}
          {giftCount > 0 && (
            <div className="gift-icons">
              {Array(giftCount).fill(0).map((_, index) => (
                <button
                  key={`gift-${index}`}
                  className={`gift-icon-button ${claimedGifts.includes(index) ? 'claimed' : ''}`}
                  onClick={() => handleGiftClick(index)}
                  disabled={claimedGifts.includes(index)}
                >
                  <Gift 
                    size={24} 
                    className={claimedGifts.includes(index) ? 'claimed' : ''} 
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 礼物弹窗 */}
        {showGiftPopup && (
          <div className="gift-popup-overlay" onClick={() => setShowGiftPopup(false)}>
            <div className="gift-popup" onClick={e => e.stopPropagation()}>
              <div className="gift-icons-container">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="48" 
                  height="48" 
                  viewBox="0 0 32 32" 
                  fill="none" 
                  stroke="#8d4bb9" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="lucide lucide-unicorn-head animate-float"
                >
                  <path d="m15.6 4.8 2.7 2.3"/>
                  <path d="M15.5 10S19 7 22 2c-6 2-10 5-10 5"/>
                  <path d="M11.5 12H11"/>
                  <path d="M5 15a4 4 0 0 0 4 4h7.8l.3.3a3 3 0 0 0 4-4.46L12 7c0-3-1-5-1-5S8 3 8 7c-4 1-6 3-6 3"/>
                  <path d="M2 4.5C4 3 6 3 6 3l2 4"/>
                  <path d="M6.14 17.8S4 19 2 22"/>
                </svg>
                <Gift 
                  size={48} 
                  color='#8d4bb9' 
                  strokeWidth={1.5} 
                  className="animate-bounce"
                />
              </div>
              <h3 className="celebration-title">🎉 Congratulations! 🎉</h3>
              <p>You have a Gift Award for your quiz performances, go ask mom for your gift!</p>
              <button 
                className="claim-gift-button"
                onClick={handleClaimGift}
              >
                Ask Mom for it
              </button>
              
              {/* 添加星星装饰 */}
              <div className="stars-decoration">
                <div className="star star1"></div>
                <div className="star star2"></div>
                <div className="star star3"></div>
                <div className="star star4"></div>
                <div className="star star5"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* MAP Growth Logo */}
        <div className="map-logo">
          <img 
            src="/images/map-growth.png" 
            alt="MAP Growth" 
            className="logo-image"
          />
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Lexiles Score */}
          <div className="stat-box lexiles">
            <div className="stat-value">210L</div>
            <div className="stat-label">Lexiles</div>
          </div>

          {/* AR Score */}
          <div className="stat-box ar">
            <div className="stat-value">21</div>
            <div className="stat-label">AR</div>
          </div>
        </div>
      </div>
      
      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="logout-button"
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </div>
  );
};


