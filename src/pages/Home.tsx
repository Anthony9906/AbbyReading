import { useEffect } from "react";
import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { LearningCard } from "../components/LearningCard";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchUser } from "../redux/slices/userSlice";
import { fetchUnits } from "../redux/slices/unitsSlice";
import { fetchUnicornRecords } from "../redux/slices/unicornRecordsSlice";
import { 
  selectUserData, 
  selectUserStatus, 
  selectUnitsStatus, 
  selectUnicornStatus,
  selectUserStats 
} from "../redux/selectors";
import "../styles/pages/Home.css";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "../components/ErrorMessage";
import { PageLoader } from "../components/PageLoader";

export default function Home() {
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectUserData);
  const userStatus = useAppSelector(selectUserStatus);
  const unitsStatus = useAppSelector(selectUnitsStatus);
  const unicornStatus = useAppSelector(selectUnicornStatus);
  const userStats = useAppSelector(selectUserStats);
  
  // 计算整体加载状态
  const isLoading = 
    userStatus === 'loading' || 
    unitsStatus === 'loading' || 
    unicornStatus === 'loading';
  
  // 只在组件首次挂载时获取数据
  useEffect(() => {
    // 如果用户数据尚未加载，则获取用户数据
    if (userStatus === 'idle') {
      dispatch(fetchUser());
    }
    
    // 如果单元数据尚未加载，则获取单元数据
    if (unitsStatus === 'idle') {
      dispatch(fetchUnits());
    }
    
    // 只有在获取到用户ID后才获取独角兽记录
    if (unicornStatus === 'idle' && userData?.id) {
      dispatch(fetchUnicornRecords(userData.id));
    }
  }, [dispatch, userStatus, unitsStatus, unicornStatus, userData]);
  
  // 显示加载状态
  if (isLoading) {
    return <PageLoader message="Loading your learning adventures..." />;
  }

  // 显示错误信息
  if (userStatus === 'failed' && userData?.error) {
    return <ErrorMessage message={userData.error} onRetry={() => dispatch(fetchUser())} />;
  }
  
  return (
    <div className="home-page">
      <div className="home-container">
        <UserHeader 
          avatar={userData?.avatar_url || "/images/avatar.svg"}
          name={userData?.name || "Abby"}
          stats={userStats}
        />
        <div className="cards-container">
          <div className="learning-card-container">
            <LearningCard />
          </div>
          <div className="stats-card-container">
            <StatsCard />
          </div>
        </div>
      </div>
    </div>
  );
} 