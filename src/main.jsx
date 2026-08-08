import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, Camera, Check, CheckCircle2, ChevronRight, CircleAlert, Crosshair, Footprints, HelpCircle, LocateFixed, MapPin, Navigation, RefreshCw, Road, ScanLine, ShieldCheck, Sparkles, SquareParking, X, Zap } from 'lucide-react';
import { analyzeParkingPhoto } from './services/parkingAnalysis';
import './styles.css';

const reasons = {
  1: { icon: Footprints, title: '점자블록을 침범했어요', desc: '시각장애인의 통행을 위해 점자블록에서 50cm 이상 떨어져 주세요.' },
  2: { icon: CircleAlert, title: '보행자 통행을 방해해요', desc: '킥보드를 건물 벽면 쪽으로 옮겨 보행 공간을 확보해 주세요.' },
  3: { icon: Road, title: '차도에는 주차할 수 없어요', desc: '안전한 인도 또는 지정 PM 주차구역으로 이동해 주세요.' },
  4: { icon: SquareParking, title: '지정 주차구역이 아니에요', desc: '지도에서 가까운 주차구역을 확인한 뒤 다시 촬영해 주세요.' },
  5: { icon: CircleAlert, title: '출입구를 막고 있어요', desc: '건물과 시설 출입구에서 충분히 떨어진 곳으로 이동해 주세요.' },
  6: { icon: Footprints, title: '횡단보도 주변에 주차했어요', desc: '보행자의 안전을 위해 횡단보도와 보행 진입로를 피해서 주차해 주세요.' },
};

function App() {
  const [screen, setScreen] = useState('home');
  const [photo, setPhoto] = useState(null);
  const [demoResult, setDemoResult] = useState(0);
  const [result, setResult] = useState(null);

  const goCamera = () => { setPhoto(null); setResult(null); setScreen('camera'); };
  const useDemoPhoto = () => {
    setPhoto('demo');
  };
  const analyze = async () => {
    setScreen('analyzing');
    const response = await analyzeParkingPhoto({ mockResult: demoResult });
    setResult(response);
    setScreen(response.approved ? 'success' : 'failure');
  };

  return (
    <main className="app-shell">
      <div className="phone">
        {screen === 'home' && <Home onStart={goCamera} />}
        {screen === 'camera' && <CameraScreen photo={photo} onBack={() => setScreen('home')} onDemo={useDemoPhoto} onNext={() => setScreen('location')} />}
        {screen === 'location' && <LocationScreen photo={photo} demoResult={demoResult} setDemoResult={setDemoResult} onBack={() => setScreen('camera')} onAnalyze={analyze} />}
        {screen === 'analyzing' && <Analyzing photo={photo} />}
        {screen === 'success' && <Success result={result} onDone={() => setScreen('home')} />}
        {screen === 'failure' && <Failure result={result} onRetry={goCamera} onMap={() => alert('프로토타입: 가까운 주차구역 지도를 엽니다.')} />}
      </div>
    </main>
  );
}

const Header = ({ title, onBack, dark = false }) => <header className={`header ${dark ? 'header-dark' : ''}`}><button className="icon-button" onClick={onBack} aria-label="뒤로 가기"><ArrowLeft /></button><strong>{title}</strong><button className="icon-button" aria-label="도움말"><HelpCircle /></button></header>;

function Home({ onStart }) {
  return <section className="screen home-screen">
    <div className="topbar"><div className="brand"><span className="brand-mark"><Zap fill="currentColor" /></span>MOVE</div><button className="icon-button glass" aria-label="도움말"><HelpCircle /></button></div>
    <div className="hero-copy"><span className="status-pill"><span /> 이용 중 · 12분</span><h1>안전하게 도착했나요?</h1><p>주변을 확인하고 킥보드를 바르게 주차한 뒤<br/>반납을 시작해 주세요.</p></div>
    <div className="scooter-art" aria-label="주차된 전동 킥보드 일러스트"><div className="sun"/><div className="city city-a"/><div className="city city-b"/><div className="ground-line"/><div className="scooter"><span className="handle"/><span className="stem"/><span className="deck"/><span className="wheel wheel-a"/><span className="wheel wheel-b"/></div><div className="parking-mark">P</div></div>
    <div className="bottom-sheet"><div className="ride-summary"><div><span>이용 시간</span><strong>12분 38초</strong></div><div className="divider"/><div><span>예상 요금</span><strong>2,300원</strong></div></div><button className="primary-button" onClick={onStart}>반납 시작하기 <ChevronRight /></button><p className="safety-note"><ShieldCheck/> 사진은 주차 상태 확인 후 안전하게 처리돼요</p></div>
  </section>;
}

function CameraScreen({ photo, onBack, onDemo, onNext }) {
  return <section className="screen camera-screen"><Header title="주차 사진 촬영" onBack={onBack} dark />
    <div className={`viewfinder ${photo ? 'has-photo' : ''}`}>
      {photo && photo !== 'demo' ? <img src={photo} alt="촬영한 주차 사진" /> : <div className="street-scene"><div className="scene-wall"/><div className="scene-sidewalk"/><div className="tactile"/><div className="mini-scooter">🛴</div></div>}
      {!photo && <><div className="guide-corners"><i/><i/><i/><i/></div><div className="camera-tip"><ScanLine/><span>킥보드와 주변 바닥이<br/>모두 나오게 촬영해 주세요</span></div></>}
      {photo && <div className="photo-badge"><Check/> 사진이 준비됐어요</div>}
    </div>
    <div className="camera-controls"><div className="photo-rules"><div><CheckCircle2/> 킥보드 전체</div><div><CheckCircle2/> 주변 바닥</div><div><CheckCircle2/> 밝은 환경</div></div><div className="shutter-row camera-only"><span/><button className="shutter" onClick={onDemo} aria-label="사진 촬영"><span><Camera/></span></button><span/></div>{photo && <button className="primary-button floating-next" onClick={onNext}>이 사진 사용하기 <ChevronRight/></button>}</div>
  </section>;
}

function LocationScreen({ photo, demoResult, setDemoResult, onBack, onAnalyze }) {
  return <section className="screen light-screen"><Header title="위치 확인" onBack={onBack}/><div className="content-pad">
    <div className="step-label">마지막 확인</div><h2>현재 위치가 맞나요?</h2><p className="subtext">정확한 반납 처리를 위해 위치 정보를 확인해 주세요.</p>
    <div className="map-card"><div className="map-lines"><i/><i/><i/><i/></div><div className="map-pin-pulse"><MapPin fill="currentColor"/></div><button className="locate"><Crosshair/></button></div>
    <div className="address-card"><div className="address-icon"><Navigation fill="currentColor"/></div><div><span>현재 반납 위치</span><strong>서울특별시 강남구 테헤란로 152</strong><small>역삼역 1번 출구 인근</small></div><CheckCircle2 className="address-check"/></div>
    <div className="check-row"><LocateFixed/><div><strong>GPS 위치 확인 완료</strong><span>정확도 약 8m</span></div><Check/></div>
    <div className="demo-panel"><div><strong>Vision Detection Code</strong><span>실제 앱에서는 AI가 자동 결정합니다</span></div><select value={demoResult} onChange={e => setDemoResult(Number(e.target.value))}><option value={0}>Code 0 · 적합 / 반납 승인</option><option value={1}>Code 1 · 점자블록 침범</option><option value={2}>Code 2 · 통행 방해</option><option value={3}>Code 3 · 차도 주차</option><option value={4}>Code 4 · 지정구역 아님</option><option value={5}>Code 5 · 출입구 방해</option><option value={6}>Code 6 · 횡단보도 주변</option></select></div>
  </div><div className="sticky-action"><button className="primary-button" onClick={onAnalyze}>위치 확인하고 분석하기 <Sparkles/></button></div></section>;
}

function Analyzing({ photo }) {
  const [step, setStep] = useState(0); useEffect(() => { const id = setInterval(() => setStep(s => Math.min(s + 1, 2)), 600); return () => clearInterval(id); }, []);
  const labels = ['킥보드 위치 확인', '주변 공간 분석', '주차 기준 검사'];
  return <section className="screen analyzing-screen"><div className="analysis-visual">{photo && photo !== 'demo' ? <img src={photo} alt="분석 중인 사진"/> : <div className="street-scene"><div className="scene-wall"/><div className="scene-sidewalk"/><div className="tactile"/><div className="mini-scooter">🛴</div></div>}<div className="scan-beam"/><div className="detect-box"><span>PM · 98%</span></div></div><div className="analysis-body"><div className="ai-orb"><Sparkles/></div><h2>AI가 주차 상태를<br/>확인하고 있어요</h2><p>잠시만 기다려 주세요</p><div className="analysis-steps">{labels.map((label, i) => <div className={i <= step ? 'active' : ''} key={label}><span>{i < step ? <Check/> : i === step ? <span className="dot"/> : null}</span>{label}</div>)}</div></div></section>;
}

function Success({ result, onDone }) { return <section className="screen result-screen success-screen"><div className="confetti">✦ <span>●</span> ◆ <i>✦</i></div><div className="result-icon success-icon"><Check/></div><h1>반납이 완료됐어요!</h1><p>안전하고 올바르게 주차해 주셔서 감사해요.</p><div className="receipt"><div className="receipt-brand"><span className="brand-mark"><Zap fill="currentColor"/></span><div><strong>이용 내역</strong><span>2026. 08. 07 · 23:48</span></div></div><div className="receipt-row"><span>이용 시간</span><strong>12분 38초</strong></div><div className="receipt-row"><span>이용 요금</span><strong>2,300원</strong></div><div className="receipt-row"><span>반납 위치</span><strong>역삼역 1번 출구 인근</strong></div><div className="discount"><Sparkles/> 바른 주차 리워드 <strong>+100P</strong></div></div><div className="sticky-action"><button className="primary-button" onClick={onDone}>확인</button></div></section> }

function Failure({ result, onRetry, onMap }) { const info = reasons[result?.reasonCode] || reasons[1]; const Icon = info.icon; return <section className="screen result-screen failure-screen"><div className="result-icon failure-icon"><X/></div><span className="fail-label">반납할 수 없어요</span><h1>{info.title}</h1><p>{info.desc}</p><div className="reason-visual"><div className="warning-zone"><Icon/><span>주차 금지 영역</span></div><div className="mini-pm">🛴</div><div className="arrow-move"><span>안전한 곳으로 이동</span>↗</div></div><div className="guide-box"><strong>이렇게 다시 주차해 주세요</strong><div><CheckCircle2/> 보행 공간을 1.5m 이상 확보하기</div><div><CheckCircle2/> 킥보드를 벽면과 나란히 세우기</div><div><CheckCircle2/> 출입구와 점자블록 피하기</div></div><div className="sticky-action dual"><button className="secondary-button" onClick={onMap}><MapPin/> 주차구역 찾기</button><button className="primary-button" onClick={onRetry}><RefreshCw/> 다시 촬영</button></div></section> }

createRoot(document.getElementById('root')).render(<App />);
