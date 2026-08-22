import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  ExternalLink, 
  Activity, 
  ChevronDown, 
  Radio,
  Zap,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { demoAttacks } from './demo_attacks';
import MaterialDesignRipple from './components/ui/motion-material-design-ripple';
import GlowingShadow from './components/ui/glowing-shadow';

const BACKEND_URL = 'http://localhost:4000';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [expandedTxHash, setExpandedTxHash] = useState(null);
  const [isLoadingReplay, setIsLoadingReplay] = useState(false);
  const [activeReplayType, setActiveReplayType] = useState(null); // 'quick' or 'full'
  const [isConnected, setIsConnected] = useState(false);
  const [latestTxHash, setLatestTxHash] = useState(null);

  // 1. WebSockets & Initial History Setup
  useEffect(() => {
    fetch(`${BACKEND_URL}/transactions`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTransactions(data);
        }
      })
      .catch((err) => console.error("Error loading initial history:", err));

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('initialHistory', (history) => {
      if (Array.isArray(history) && history.length > 0) {
        setTransactions(history);
      }
    });

    socket.on('newDecision', (newDecision) => {
      setTransactions((prev) => {
        if (prev.some((t) => t.txHash === newDecision.txHash)) {
          return prev;
        }
        return [newDecision, ...prev];
      });

      setLatestTxHash(newDecision.txHash);
      setTimeout(() => setLatestTxHash(null), 2000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 2. Trigger Batch Replay Demo (Quick = 1 tx, Full = 6 txs)
  const handleRunDemoReplay = async (type = 'full') => {
    setIsLoadingReplay(true);
    setActiveReplayType(type);
    try {
      const payload = type === 'quick' ? [demoAttacks[0]] : demoAttacks;
      const response = await fetch(`${BACKEND_URL}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      console.log(`Replay ${type} Batch Response:`, result);
    } catch (error) {
      console.error(`Error running ${type} replay demo:`, error);
      alert('Failed to run demo replay batch. Is the backend running on port 4000?');
    } finally {
      setIsLoadingReplay(false);
      setActiveReplayType(null);
    }
  };

  // 3. Computed Dashboard Metrics
  const totalCount = transactions.length;
  const blockedCount = transactions.filter((t) => t.isSuspicious || t.label === 'suspicious').length;
  const blockRate = totalCount > 0 ? ((blockedCount / totalCount) * 100).toFixed(1) : '0.0';
  
  const avgConfidence = totalCount > 0 
    ? ((transactions.reduce((acc, t) => acc + (t.confidence || 1.0), 0) / totalCount) * 100).toFixed(1)
    : '100.0';

  // 4. Utility Formatters
  const truncateHash = (hash) => {
    if (!hash) return '0x000...000';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'just now';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const toggleRowExpand = (txHash) => {
    setExpandedTxHash(expandedTxHash === txHash ? null : txHash);
  };

  // Standardized Grid Template Columns to prevent label overlaps
  const gridTemplate = '75px 180px 130px 120px 110px 1fr 40px';

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* HEADER SECTION - SLEEK OBSIDIAN BLACK THEME */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)',
            border: '1px solid var(--border-highlight)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.8)'
          }}>
            <ShieldAlert size={28} color="#f8fafc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: '#f8fafc' }}>
                ChainMind Sentinel
              </h1>
              <span style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#f8fafc',
                border: '1px solid var(--border-highlight)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Sepolia Security Gate Live
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Real-time AI Anomaly Classification & On-Chain Smart Contract Audit Trail
            </p>
          </div>
        </div>

        {/* CONNECTION STATUS & DUAL REPLAY DEMO ACTION BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#090d16',
            border: '1px solid var(--border-color)',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px'
          }}>
            <Radio size={14} color={isConnected ? '#10b981' : '#ef4444'} className={isConnected ? '' : 'spin-icon'} />
            <span style={{ color: isConnected ? '#10b981' : '#ef4444', fontWeight: '600' }}>
              {isConnected ? 'WebSocket Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Quick Demo (1) Button */}
          <button
            onClick={() => handleRunDemoReplay('quick')}
            disabled={isLoadingReplay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-highlight)',
              color: '#f8fafc',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isLoadingReplay ? 'not-allowed' : 'pointer',
              opacity: isLoadingReplay && activeReplayType !== 'quick' ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isLoadingReplay && activeReplayType === 'quick' ? (
              <>
                <Activity size={16} className="spin-icon" />
                <span>Running Quick Demo...</span>
              </>
            ) : (
              <>
                <Zap size={16} color="#38bdf8" />
                <span>Quick Demo (1)</span>
              </>
            )}
          </button>

          {/* Full Demo (6) Button */}
          <MaterialDesignRipple
            onClick={() => handleRunDemoReplay('full')}
            disabled={isLoadingReplay}
          >
            {isLoadingReplay && activeReplayType === 'full' ? (
              <>
                <Activity size={18} className="spin-icon" />
                <span>Running Full Replay...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="#ffffff" />
                <span>Full Demo (6)</span>
              </>
            )}
          </MaterialDesignRipple>
        </div>
      </header>

      {/* STATS BAR CARDS */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Card 1: Total Monitored */}
        <div style={{
          background: '#0b0f19',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Total Monitored</p>
            <h3 className="mono" style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', color: '#f8fafc' }}>{totalCount}</h3>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', border: '1px solid var(--border-highlight)' }}>
            <Activity color="#f8fafc" size={24} />
          </div>
        </div>

        {/* Card 2: Total Blocked */}
        <div style={{
          background: '#0b0f19',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Threats Blocked</p>
            <h3 className="mono" style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', color: '#ef4444' }}>
              {blockedCount}
            </h3>
          </div>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <ShieldAlert color="#ef4444" size={24} />
          </div>
        </div>

        {/* Card 3: Block Rate */}
        <div style={{
          background: '#0b0f19',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Block Rate %</p>
            <h3 className="mono" style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', color: '#f59e0b' }}>
              {blockRate}%
            </h3>
          </div>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Zap color="#f59e0b" size={24} />
          </div>
        </div>

        {/* Card 4: Avg Confidence */}
        <div style={{
          background: '#0b0f19',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Avg Model Confidence</p>
            <h3 className="mono" style={{ fontSize: '28px', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
              {avgConfidence}%
            </h3>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <ShieldCheck color="#10b981" size={24} />
          </div>
        </div>
      </section>

      {/* LIVE FEED TABLE SECTION */}
      <section>
        <GlowingShadow alwaysActive={true}>
          <div style={{ overflow: 'hidden', borderRadius: '16px' }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#090d16'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={20} color="#f8fafc" />
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>Live Security Audit Feed</h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {transactions.length} recent classifications (Real-time Socket.io Stream)
              </span>
            </div>

            {/* TABLE HEADER */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              padding: '12px 24px',
              background: '#050811',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <div>Status</div>
              <div>Mock Tx Hash</div>
              <div>Verdict</div>
              <div>Confidence</div>
              <div>Time</div>
              <div>On-Chain Summary</div>
              <div></div>
            </div>

            {/* FEED ROWS OR EMPTY STATE */}
            {transactions.length === 0 ? (
              <div style={{
                padding: '64px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: '#0b0f19'
              }}>
                <ShieldAlert size={48} color="var(--border-highlight)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)' }}>No Transactions Monitored Yet</h3>
                <p style={{ fontSize: '14px', marginTop: '6px', maxWidth: '480px', margin: '6px auto 20px' }}>
                  The SentinelGate audit log is empty. Click below to simulate attack patterns and process real-time Sepolia decisions.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '16px' }}>
                  <button
                    onClick={() => handleRunDemoReplay('quick')}
                    disabled={isLoadingReplay}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-highlight)',
                      color: '#f8fafc',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: isLoadingReplay ? 'not-allowed' : 'pointer',
                      opacity: isLoadingReplay && activeReplayType !== 'quick' ? 0.5 : 1
                    }}
                  >
                    {isLoadingReplay && activeReplayType === 'quick' ? (
                      <>
                        <Activity size={16} className="spin-icon" />
                        <span>Running Quick Demo...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} color="#38bdf8" />
                        <span>Quick Demo (1)</span>
                      </>
                    )}
                  </button>

                  <MaterialDesignRipple
                    onClick={() => handleRunDemoReplay('full')}
                    disabled={isLoadingReplay}
                  >
                    {isLoadingReplay && activeReplayType === 'full' ? (
                      <>
                        <Activity size={18} className="spin-icon" />
                        <span>Running Full Replay...</span>
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="#ffffff" />
                        <span>Full Demo (6)</span>
                      </>
                    )}
                  </MaterialDesignRipple>
                </div>
              </div>
            ) : (
              <div style={{ background: '#0b0f19' }}>
                {transactions.map((tx, idx) => {
                  const isSuspicious = tx.isSuspicious || tx.label === 'suspicious';
                  const isExpanded = expandedTxHash === tx.txHash;
                  const isNew = latestTxHash === tx.txHash;

                  return (
                    <div 
                      key={tx.txHash || idx}
                      className={isNew ? 'animate-new-row' : ''}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* SUMMARY ROW */}
                      <div
                        onClick={() => toggleRowExpand(tx.txHash)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: gridTemplate,
                          padding: '16px 24px',
                          alignItems: 'center',
                          cursor: 'pointer',
                          background: isExpanded ? 'var(--bg-card-hover)' : 'transparent',
                        }}
                      >
                        {/* Status Indicator Dot */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: isSuspicious ? '#ef4444' : '#10b981',
                            boxShadow: isSuspicious ? '0 0 10px rgba(239, 68, 68, 0.7)' : '0 0 8px rgba(16, 185, 129, 0.5)'
                          }} />
                        </div>

                        {/* Mock Tx Hash */}
                        <div className="mono" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '500' }}>
                          {truncateHash(tx.txHash)}
                        </div>

                        {/* Verdict Badge */}
                        <div>
                          <span style={{
                            background: isSuspicious ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isSuspicious ? '#f87171' : '#34d399',
                            border: `1px solid ${isSuspicious ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase'
                          }}>
                            {isSuspicious ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                            {isSuspicious ? 'BLOCKED' : 'APPROVED'}
                          </span>
                        </div>

                        {/* Confidence Score */}
                        <div className="mono" style={{ fontSize: '13px', fontWeight: '600' }}>
                          {((tx.confidence || 1.0) * 100).toFixed(0)}%
                        </div>

                        {/* Relative Time */}
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {getRelativeTime(tx.timestamp)}
                        </div>

                        {/* Short Reason Preview */}
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          paddingRight: '16px'
                        }}>
                          {tx.reason}
                        </div>

                        {/* Rotating Chevron Icon */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                          >
                            <ChevronDown size={18} color="var(--text-muted)" />
                          </motion.div>
                        </div>
                      </div>

                      {/* EXPANDED DETAIL VIEW */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '20px 24px 24px 75px',
                              background: 'var(--bg-expanded)',
                              borderTop: '1px solid var(--border-color)',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '24px'
                            }}>
                              {/* Left Detail Column: Audit Decision, Gen-AI Explanation & Sepolia Proof */}
                              <div>
                                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                  Rule-Based Decision Trigger
                                </h4>
                                <div style={{
                                  background: isSuspicious ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  border: `1px solid ${isSuspicious ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                  padding: '14px',
                                  borderRadius: '8px',
                                  color: 'var(--text-main)',
                                  fontSize: '13px',
                                  lineHeight: '1.6',
                                  marginBottom: '16px'
                                }}>
                                  {tx.reason}
                                </div>

                                {/* AI-Generated Analyst Insight (Only present when ai_explanation exists for suspicious calls) */}
                                {tx.ai_explanation && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                      <Sparkles size={14} color="#c084fc" />
                                      <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#c084fc', fontWeight: '700', letterSpacing: '0.5px' }}>
                                        AI-Generated Analyst Insight (Gemini 3.5)
                                      </h4>
                                    </div>
                                    <div style={{
                                      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                      border: '1px solid rgba(192, 132, 252, 0.4)',
                                      padding: '14px',
                                      borderRadius: '8px',
                                      color: '#e9d5ff',
                                      fontSize: '13px',
                                      lineHeight: '1.6',
                                      boxShadow: '0 0 15px rgba(192, 132, 252, 0.12)'
                                    }}>
                                      {tx.ai_explanation}
                                    </div>
                                  </div>
                                )}

                                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                  On-Chain Sepolia Blockchain Proof
                                </h4>
                                <div style={{ fontSize: '13px' }}>
                                  <a
                                    href={`https://sepolia.etherscan.io/tx/${tx.sepoliaTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mono"
                                    style={{
                                      color: '#38bdf8',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      background: '#090d16',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)'
                                    }}
                                  >
                                    <span>Tx: {tx.sepoliaTxHash}</span>
                                    <ExternalLink size={14} />
                                  </a>
                                  <p style={{ marginTop: '8px', color: 'var(--text-dim)', fontSize: '12px' }}>
                                    Confirmed in Sepolia Block #{tx.blockNumber || 'N/A'} • {new Date(tx.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Right Detail Column: Raw Feature Parameters */}
                              {tx.txFeatures && (
                                <div>
                                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Evaluated Transaction Parameters
                                  </h4>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    background: '#090d16',
                                    padding: '14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px'
                                  }}>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)' }}>Value Transferred:</span>
                                      <p className="mono" style={{ fontWeight: '600', marginTop: '2px', color: '#f8fafc' }}>{tx.txFeatures.value_eth} ETH</p>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)' }}>Gas Price Paid:</span>
                                      <p className="mono" style={{ fontWeight: '600', marginTop: '2px', color: '#f8fafc' }}>{tx.txFeatures.gas_price_gwei} Gwei</p>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)' }}>Sender Wallet Age:</span>
                                      <p className="mono" style={{ fontWeight: '600', marginTop: '2px', color: '#f8fafc' }}>{tx.txFeatures.from_address_age_days} days</p>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)' }}>Contract Age:</span>
                                      <p className="mono" style={{ fontWeight: '600', marginTop: '2px', color: '#f8fafc' }}>{tx.txFeatures.to_contract_age_days} days</p>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)' }}>Tx Call Frequency:</span>
                                      <p className="mono" style={{ fontWeight: '600', marginTop: '2px', color: '#f8fafc' }}>{tx.txFeatures.tx_frequency_last_hour} calls/hr</p>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)' }}>Flash Loan Pattern:</span>
                                      <p className="mono" style={{ fontWeight: '600', marginTop: '2px', color: tx.txFeatures.is_flash_loan_pattern ? '#ef4444' : '#10b981' }}>
                                        {tx.txFeatures.is_flash_loan_pattern ? 'YES (1)' : 'NO (0)'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlowingShadow>
      </section>
    </div>
  );
}
