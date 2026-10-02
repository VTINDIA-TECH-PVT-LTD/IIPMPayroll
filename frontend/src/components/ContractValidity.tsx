import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ShieldCheck, Timer } from 'lucide-react';
import '../styles/ContractValidity.css';

export const useContractTimer = () => {
  const calculate = () => {
    // 2-Year Contract: 25 Sept 2026 to 24 Sept 2028 (730 Days)
    const targetExpiryDate = new Date('2028-09-24T23:59:59+05:30').getTime();
    const contractStartDate = new Date('2026-09-25T00:00:00+05:30').getTime();
    const now = new Date().getTime();

    const totalDurationMs = targetExpiryDate - contractStartDate;
    const remainingMs = Math.max(0, targetExpiryDate - now);

    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
    const seconds = Math.floor((remainingMs / 1000) % 60);
    const progressPercent = Math.min(100, Math.max(0, (remainingMs / totalDurationMs) * 100));

    return { days, hours, minutes, seconds, progressPercent };
  };

  const [time, setTime] = useState(calculate);

  useEffect(() => {
    const interval = setInterval(() => setTime(calculate()), 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
};

/**
 * Topbar compact pill (visible in the top navigation bar across all pages)
 */
export const TopbarContractPill: React.FC = () => {
  const time = useContractTimer();

  return (
    <div className="topbar-contract-pill" title="IIPE Official 2-Year Payroll Agreement (730 Days)">
      <span className="tcp-pulse-dot"></span>
      <div className="tcp-date-group">
        <span className="tcp-lbl">Start:</span>
        <b className="tcp-val">25 Sept 2026</b>
      </div>
      <span className="tcp-divider">|</span>
      <div className="tcp-countdown-group">
        <span className="tcp-lbl">Expires in:</span>
        <b className="tcp-val-amber">{time.days}d {time.hours}h {time.minutes}m {time.seconds}s</b>
      </div>
      <span className="tcp-tag">730 Days</span>
    </div>
  );
};

/**
 * Dashboard Banner Card (embedded into Admin & Employee Dashboards)
 */
export const DashboardContractCard: React.FC = () => {
  const time = useContractTimer();

  return (
    <div className="dash-contract-card">
      <div className="dcc-header">
        <div className="dcc-live-tag">
          <span className="dcc-dot"></span>
          <span>PAYROLL SYSTEM LIVE</span>
        </div>
        <div className="dcc-period-tag">
          <ShieldCheck size={13} className="dcc-shield-icon" />
          <span>2-Year Agreement (730 Days)</span>
        </div>
      </div>

      <div className="dcc-dates-row">
        <div className="dcc-date-cell">
          <Calendar size={13} className="dcc-icon-blue" />
          <span>Start: <b>25th Sept 2026</b></span>
        </div>
        <div className="dcc-date-sep">➔</div>
        <div className="dcc-date-cell">
          <Clock size={13} className="dcc-icon-gold" />
          <span>Expiry: <b>24th Sept 2028</b></span>
        </div>
      </div>

      <div className="dcc-countdown-row">
        <div className="dcc-cd-title">
          <Timer size={13} className="dcc-cd-icon" />
          <span>EXPIRES IN</span>
        </div>
        <div className="dcc-cd-digits">
          <span className="dcc-cd-box"><b>{String(time.days).padStart(3, '0')}</b><small>DAYS</small></span>
          <span className="dcc-colon">:</span>
          <span className="dcc-cd-box"><b>{String(time.hours).padStart(2, '0')}</b><small>HRS</small></span>
          <span className="dcc-colon">:</span>
          <span className="dcc-cd-box"><b>{String(time.minutes).padStart(2, '0')}</b><small>MIN</small></span>
          <span className="dcc-colon">:</span>
          <span className="dcc-cd-box sec"><b>{String(time.seconds).padStart(2, '0')}</b><small>SEC</small></span>
        </div>
      </div>
    </div>
  );
};
