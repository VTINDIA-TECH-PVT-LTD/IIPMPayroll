/**
 * VIRTOY PAYROLL SOFTWARE - INTERACTIVE & MONEY RAIN ANIMATION ENGINE
 * VT INDIA TECH PVT LTD (Virtoy Technologies Pvt. Ltd.)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. MONEY RAIN PHYSICS & PARTICLE ANIMATION ENGINE
  // ==========================================================================
  const canvas = document.getElementById('moneyRainCanvas');
  const rainToggleBtn = document.getElementById('moneyRainControl');
  const rainStatusText = document.getElementById('moneyRainStatus');

  let ctx = null;
  let particles = [];
  let isRainActive = true;
  let animFrameId = null;
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (canvas) {
    ctx = canvas.getContext('2d');

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle Types: 0 = Currency Banknote (₹), 1 = Gold Coin, 2 = Floating Rupee Symbol (₹)
    class MoneyParticle {
      constructor(isBurst = false) {
        this.reset(isBurst);
      }

      reset(isBurst = false) {
        this.type = Math.floor(Math.random() * 3);
        this.x = Math.random() * width;
        this.y = isBurst ? Math.random() * (height * 0.3) - 50 : Math.random() * -height;
        
        // Size & Dimensions
        if (this.type === 0) {
          // Banknote
          this.width = Math.random() * 20 + 32; // 32px to 52px width
          this.height = this.width * 0.52;      // Banknote aspect ratio
        } else if (this.type === 1) {
          // Gold Coin
          this.radius = Math.random() * 6 + 9;  // 9px to 15px radius
        } else {
          // Rupee Symbol
          this.fontSize = Math.random() * 10 + 14;
        }

        // Velocities & Physics
        this.speedY = isBurst ? Math.random() * 4 + 2.5 : Math.random() * 2.2 + 1.2;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.angle = Math.random() * Math.PI * 2;
        this.angularSpeed = (Math.random() - 0.5) * 0.04;
        this.tilt = Math.random() * Math.PI;
        this.tiltSpeed = Math.random() * 0.05 + 0.02;

        // Color palettes (Virtoy Brand Rose, Gold, Lavender, Emerald)
        const noteColors = [
          { bg: '#eb1267', border: '#fbcfe8', text: '#ffffff', label: '₹2000' },
          { bg: '#e11d48', border: '#fda4af', text: '#ffffff', label: '₹500' },
          { bg: '#db2777', border: '#f472b6', text: '#ffffff', label: '₹200' },
          { bg: '#9333ea', border: '#d8b4fe', text: '#ffffff', label: '₹100' }
        ];
        this.colorData = noteColors[Math.floor(Math.random() * noteColors.length)];
        this.opacity = Math.random() * 0.35 + 0.65;
        this.windFactor = Math.random() * 0.8 + 0.4;
      }

      update(time) {
        this.y += this.speedY;
        this.x += Math.sin(time * 0.002 * this.windFactor + this.angle) * 1.2 + this.speedX;
        this.angle += this.angularSpeed;
        this.tilt += this.tiltSpeed;

        // Recycle particle when it goes below screen
        if (this.y > height + 50) {
          this.reset(false);
          this.y = -50;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 3D Flip effect using scale
        const scaleX = Math.cos(this.tilt);

        if (this.type === 0) {
          // DRAW BANKNOTE
          ctx.scale(scaleX, 1);
          ctx.fillStyle = this.colorData.bg;
          ctx.strokeStyle = this.colorData.border;
          ctx.lineWidth = 1.5;

          // Note body
          ctx.beginPath();
          ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 4);
          ctx.fill();
          ctx.stroke();

          // Watermark circle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, this.height * 0.32, 0, Math.PI * 2);
          ctx.fill();

          // Rupee text
          ctx.fillStyle = this.colorData.text;
          ctx.font = `bold ${Math.round(this.height * 0.48)}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.colorData.label, 0, 0);

        } else if (this.type === 1) {
          // DRAW GOLD COIN
          ctx.scale(scaleX, 1);
          const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius);
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.5, '#eab308');
          grad.addColorStop(1, '#ca8a04');

          ctx.fillStyle = grad;
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // ₹ on coin
          ctx.fillStyle = '#713f12';
          ctx.font = `bold ${Math.round(this.radius * 1.1)}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₹', 0, 0);

        } else {
          // DRAW FLOATING RUPEE SYMBOL
          ctx.scale(scaleX, 1);
          ctx.fillStyle = '#eb1267';
          ctx.shadowColor = 'rgba(235, 18, 103, 0.5)';
          ctx.shadowBlur = 6;
          ctx.font = `800 ${this.fontSize}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₹', 0, 0);
        }

        ctx.restore();
      }
    }

    // Initialize particle pool (adaptive based on screen size for 60fps)
    const particleCount = width < 768 ? 32 : 55;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new MoneyParticle());
    }

    let lastTime = 0;
    function animateMoneyRain(time) {
      if (!isRainActive) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(time);
        particles[i].draw();
      }

      animFrameId = requestAnimationFrame(animateMoneyRain);
    }

    // Start animation loop
    animFrameId = requestAnimationFrame(animateMoneyRain);

    // Trigger Money Shower Burst
    window.triggerMoneyShower = function(extraCount = 30) {
      if (!isRainActive) return;
      for (let i = 0; i < extraCount; i++) {
        particles.push(new MoneyParticle(true));
      }
      // Cap maximum particles for performance
      if (particles.length > 100) {
        particles.splice(0, particles.length - 85);
      }
    };

    // Toggle Money Rain Button Click -> Opens Piyali Mam Tribute Modal & Triggers Shower
    if (rainToggleBtn) {
      rainToggleBtn.addEventListener('click', () => {
        window.triggerMoneyShower(50);
        if (rainStatusText) {
          rainStatusText.innerText = '👉 Please click once more Mam please! 💸✨';
          setTimeout(() => {
            if (rainStatusText) rainStatusText.innerText = 'Active ● Click for Tribute & Rain';
          }, 3500);
        }
        if (typeof openTributeModal === 'function') {
          openTributeModal();
        }
      });
    }

    // Pause when tab is not visible to preserve battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameId);
      } else if (isRainActive) {
        animFrameId = requestAnimationFrame(animateMoneyRain);
      }
    });
  }

  // ==========================================================================
  // 2. MOBILE NAVIGATION TOGGLE
  // ==========================================================================
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
      document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ==========================================================================
  // 3. NAVBAR SCROLL EFFECT
  // ==========================================================================
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 25) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // ==========================================================================
  // 4. 7th CPC PAY MATRIX CALCULATION ENGINE
  // ==========================================================================
  const payLevelMap = {
    '10': { basic: 57700, desig: 'Assistant Professor (Entry)', levelName: 'Academic Level 10' },
    '11': { basic: 68900, desig: 'Assistant Professor (Senior Scale)', levelName: 'Academic Level 11' },
    '12': { basic: 101500, desig: 'Assistant Professor (Selection Grade)', levelName: 'Academic Level 12' },
    '13A': { basic: 131400, desig: 'Associate Professor', levelName: 'Academic Level 13A' },
    '14': { basic: 144200, desig: 'Professor', levelName: 'Academic Level 14' },
    '14A': { basic: 159100, desig: 'Senior Professor / Director', levelName: 'Academic Level 14A' },
    'admin_12': { basic: 78800, desig: 'Registrar / Finance Officer', levelName: 'Admin Level 12' },
    'admin_10': { basic: 56100, desig: 'Assistant Registrar', levelName: 'Admin Level 10' },
    'admin_7': { basic: 44900, desig: 'Technical Officer', levelName: 'Admin Level 7' },
    'admin_6': { basic: 35400, desig: 'Senior Assistant', levelName: 'Admin Level 6' }
  };

  const simLevel = document.getElementById('simLevel');
  const simCity = document.getElementById('simCity');
  const simDa = document.getElementById('simDa');
  const simTaxRegime = document.getElementById('simTaxRegime');

  const netAmountEl = document.getElementById('simNetAmount');
  const basicEl = document.getElementById('simBasic');
  const daEl = document.getElementById('simDaVal');
  const hraEl = document.getElementById('simHraVal');
  const taEl = document.getElementById('simTaVal');
  const npsEl = document.getElementById('simNpsVal');
  const tdsEl = document.getElementById('simTdsVal');

  let currentCalculatedData = {};

  function fmtINR(val) {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  }

  function numberToWordsINR(num) {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    num = Math.round(num);
    if (num === 0) return 'Zero Rupees Only';

    function convertTwoDigits(n) {
      if (n < 20) return a[n];
      return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    }

    function convertThreeDigits(n) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      let res = '';
      if (hundred > 0) res += a[hundred] + ' Hundred';
      if (rest > 0) res += (res ? ' ' : '') + convertTwoDigits(rest);
      return res;
    }

    let words = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = num;

    if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
    if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
    if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
    if (hundred > 0) words += convertThreeDigits(hundred) + ' ';

    return words.trim() + ' Rupees Only';
  }

  function calculateSimulator() {
    if (!simLevel || !simCity || !simDa) return;

    const levelKey = simLevel.value;
    const levelInfo = payLevelMap[levelKey] || payLevelMap['13A'];
    const basic = levelInfo.basic;
    const hraRate = parseFloat(simCity.value) || 0.18;
    const daRate = parseFloat(simDa.value) || 0.53;
    const isNewTax = simTaxRegime ? simTaxRegime.value === 'new' : true;

    // Allowances
    const da = Math.round(basic * daRate);
    const hra = Math.round(basic * hraRate);
    const baseTa = basic >= 100000 ? 3600 : 1800;
    const daOnTa = Math.round(baseTa * daRate);
    const totalTa = baseTa + daOnTa;
    const gross = basic + da + hra + totalTa;

    // Deductions
    const nps = Math.round((basic + da) * 0.10); // Employee 10%
    const cghs = basic >= 100000 ? 650 : 450;
    const pt = 200;

    // Projected Monthly TDS
    const annualGross = gross * 12;
    let annualTaxable = isNewTax ? (annualGross - 75000) : (annualGross - 50000 - 150000);
    if (annualTaxable < 0) annualTaxable = 0;

    let annualTax = 0;
    if (annualTaxable > 1500000) {
      annualTax = 140000 + (annualTaxable - 1500000) * 0.30;
    } else if (annualTaxable > 1200000) {
      annualTax = 80000 + (annualTaxable - 1200000) * 0.20;
    } else if (annualTaxable > 900000) {
      annualTax = 40000 + (annualTaxable - 900000) * 0.15;
    } else if (annualTaxable > 600000) {
      annualTax = 15000 + (annualTaxable - 600000) * 0.10;
    } else if (annualTaxable > 300000) {
      annualTax = (annualTaxable - 300000) * 0.05;
    }
    annualTax = Math.round(annualTax * 1.04);
    const monthlyTds = Math.round(annualTax / 12);

    const totalDeductions = nps + monthlyTds + cghs + pt;
    const net = gross - totalDeductions;

    currentCalculatedData = {
      basic,
      da,
      hra,
      baseTa,
      daOnTa,
      totalTa,
      gross,
      nps,
      monthlyTds,
      cghs,
      pt,
      totalDeductions,
      net,
      desig: levelInfo.desig,
      levelName: levelInfo.levelName
    };

    // Update UI
    if (basicEl) basicEl.innerText = fmtINR(basic);
    if (daEl) daEl.innerText = fmtINR(da);
    if (hraEl) hraEl.innerText = fmtINR(hra);
    if (taEl) taEl.innerText = fmtINR(totalTa);
    if (npsEl) npsEl.innerText = '-' + fmtINR(nps);
    if (tdsEl) tdsEl.innerText = '-' + fmtINR(monthlyTds);

    if (netAmountEl) {
      animateCounter(netAmountEl, parseInt(netAmountEl.innerText.replace(/[^0-9]/g, '')) || net, net, 350);
    }
  }

  function animateCounter(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      element.innerText = fmtINR(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.innerText = fmtINR(end);
      }
    };
    window.requestAnimationFrame(step);
  }

  if (simLevel && simCity && simDa) {
    simLevel.addEventListener('change', () => {
      calculateSimulator();
      if (window.triggerMoneyShower) window.triggerMoneyShower(12);
    });
    simCity.addEventListener('change', () => {
      calculateSimulator();
      if (window.triggerMoneyShower) window.triggerMoneyShower(12);
    });
    simDa.addEventListener('change', () => {
      calculateSimulator();
      if (window.triggerMoneyShower) window.triggerMoneyShower(12);
    });
    if (simTaxRegime) {
      simTaxRegime.addEventListener('change', () => {
        calculateSimulator();
        if (window.triggerMoneyShower) window.triggerMoneyShower(12);
      });
    }
    calculateSimulator();
  }

  // ==========================================================================
  // 5. LIVE TICKER ON SIMULATOR CARD
  // ==========================================================================
  const tickerText = document.getElementById('liveActionTicker');
  const tickerMessages = [
    'DA Indexed to 53% • Fully Compliant',
    '7th CPC Matrix Auto-Synchronized',
    'New vs Old Tax TDS Auto-Optimized',
    'NPS Tier-1 (10% + 14%) Synchronized',
    'Direct Bank NEFT File Generated'
  ];
  let tickerIdx = 0;
  if (tickerText) {
    setInterval(() => {
      tickerIdx = (tickerIdx + 1) % tickerMessages.length;
      tickerText.style.opacity = '0';
      setTimeout(() => {
        tickerText.innerText = tickerMessages[tickerIdx];
        tickerText.style.opacity = '1';
      }, 300);
    }, 3800);
  }

  // ==========================================================================
  // 6. SAMPLE PAYSLIP MODAL
  // ==========================================================================
  const payslipModal = document.getElementById('payslipModal');
  const openSamplePayslipBtn = document.getElementById('openSamplePayslipBtn');
  const closePayslipModalBtn = document.getElementById('closePayslipModalBtn');
  const closePayslipModalBtn2 = document.getElementById('closePayslipModalBtn2');

  function openPayslipModal() {
    if (!payslipModal) return;
    const d = currentCalculatedData;

    document.getElementById('psDesig').innerText = d.desig || 'Associate Professor';
    document.getElementById('psPayLevel').innerText = `${d.levelName} (${fmtINR(d.basic)})`;
    document.getElementById('psBasic').innerText = fmtINR(d.basic);
    document.getElementById('psDa').innerText = fmtINR(d.da);
    document.getElementById('psHra').innerText = fmtINR(d.hra);
    document.getElementById('psTa').innerText = fmtINR(d.baseTa);
    document.getElementById('psDaTa').innerText = fmtINR(d.daOnTa);
    document.getElementById('psGross').innerText = fmtINR(d.gross);

    document.getElementById('psNps').innerText = fmtINR(d.nps);
    document.getElementById('psTds').innerText = fmtINR(d.monthlyTds);
    document.getElementById('psDeductions').innerText = fmtINR(d.totalDeductions);
    document.getElementById('psNetFinal').innerText = fmtINR(d.net);
    document.getElementById('psNetWords').innerText = numberToWordsINR(d.net);

    const isNewTax = simTaxRegime ? simTaxRegime.value === 'new' : true;
    const taxRegimeEl = document.getElementById('psTaxRegimeDisplay');
    if (taxRegimeEl) {
      taxRegimeEl.innerText = isNewTax ? 'New Tax Regime (Sec 115BAC)' : 'Old Tax Regime (Sec 80C/80D)';
    }

    payslipModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.triggerMoneyShower) window.triggerMoneyShower(20);
  }

  function closePayslipModal() {
    if (!payslipModal) return;
    payslipModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (openSamplePayslipBtn) openSamplePayslipBtn.addEventListener('click', openPayslipModal);
  if (closePayslipModalBtn) closePayslipModalBtn.addEventListener('click', closePayslipModal);
  if (closePayslipModalBtn2) closePayslipModalBtn2.addEventListener('click', closePayslipModal);
  if (payslipModal) {
    payslipModal.addEventListener('click', (e) => {
      if (e.target === payslipModal) closePayslipModal();
    });
  }

  // ==========================================================================
  // 6B. PIYALI MAM SPECIAL LEADERSHIP TRIBUTE MODAL & PLAYFUL CLICK ENGINE
  // ==========================================================================
  const piyaliTributeModal = document.getElementById('piyaliTributeModal');
  const closeTributeModalBtn = document.getElementById('closeTributeModalBtn');
  const closeTributeModalBtn2 = document.getElementById('closeTributeModalBtn2');
  const tributeBurstBtn = document.getElementById('tributeBurstBtn');
  const tributeBurstBtnText = document.getElementById('tributeBurstBtnText');
  const tributeClickBanner = document.getElementById('tributeClickBanner');
  const tributeClickCounter = document.getElementById('tributeClickCounter');

  let mamClickCount = 0;
  const mamFunReactions = [
    {
      btnText: "🎉 Yaaay! Showering Salary Rain for Mam! 💸💰✨",
      bannerText: "<span class=\"pulse-hand-icon\">👉</span> <b>Please click once more Mam, shower even more Salary Rain! 💸✨</b> <span class=\"pulse-hand-icon\">👈</span>",
      rainStatus: "👑 Showering for Piyali Mam!"
    },
    {
      btnText: "😍 Double Bonus Salary Shower Activated for Mam! 💎🚀",
      bannerText: "<span class=\"pulse-hand-icon\">👉</span> <b>Please click once more Mam, let's make it triple! 💸✨</b> <span class=\"pulse-hand-icon\">👈</span>",
      rainStatus: "💎 Double Bonus Shower for Mam!"
    },
    {
      btnText: "👑 100% 7th CPC Precision & Triple Salary Rain! 💖✨",
      bannerText: "<span class=\"pulse-hand-icon\">👉</span> <b>Please click once more Mam, infinite smiles & salary rain! 💖✨</b> <span class=\"pulse-hand-icon\">👈</span>",
      rainStatus: "💖 7th CPC Precision for Mam!"
    },
    {
      btnText: "🌟 Infinite Salary Rain & Highest Respect for Piyali Mam! 🎊💸",
      bannerText: "👑 <b>Best Leader Ever! Virtoy Team thanks you wholeheartedly, Mam! 💖✨</b> 👑",
      rainStatus: "🌟 Infinite Tribute for Mam!"
    }
  ];

  function openTributeModal() {
    if (!piyaliTributeModal) return;
    piyaliTributeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.triggerMoneyShower) window.triggerMoneyShower(50);
  }

  function closeTributeModal() {
    if (!piyaliTributeModal) return;
    piyaliTributeModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.openTributeModal = openTributeModal;
  window.closeTributeModal = closeTributeModal;

  if (closeTributeModalBtn) closeTributeModalBtn.addEventListener('click', closeTributeModal);
  if (closeTributeModalBtn2) closeTributeModalBtn2.addEventListener('click', closeTributeModal);
  if (piyaliTributeModal) {
    piyaliTributeModal.addEventListener('click', (e) => {
      if (e.target === piyaliTributeModal) closeTributeModal();
    });
  }

  if (tributeBurstBtn) {
    tributeBurstBtn.addEventListener('click', () => {
      mamClickCount++;
      if (window.triggerMoneyShower) window.triggerMoneyShower(65);

      const reaction = mamFunReactions[Math.min(mamClickCount - 1, mamFunReactions.length - 1)];

      if (tributeBurstBtnText) {
        tributeBurstBtnText.innerText = reaction.btnText;
      }
      if (tributeClickBanner) {
        const textEl = tributeClickBanner.querySelector('.tribute-click-text');
        if (textEl) textEl.innerHTML = reaction.bannerText;
      }
      if (tributeClickCounter) {
        tributeClickCounter.innerHTML = `Mam's Rain Shower Count: <b>${mamClickCount}</b> 💖 (Keep Clicking Mam!)`;
      }
      if (rainStatusText) {
        rainStatusText.innerText = reaction.rainStatus;
      }

      // Card micro-bounce
      const modalBox = piyaliTributeModal.querySelector('.tribute-modal-card');
      if (modalBox) {
        modalBox.style.transform = 'scale(1.02)';
        setTimeout(() => {
          modalBox.style.transform = '';
        }, 180);
      }
    });
  }

  // Escape key closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (piyaliTributeModal && piyaliTributeModal.classList.contains('active')) closeTributeModal();
      if (payslipModal && payslipModal.classList.contains('active')) closePayslipModal();
    }
  });

  // ==========================================================================
  // 7. REAL-TIME BATCH RUNNER INTERACTIVE SIMULATION
  // ==========================================================================
  const startBatchBtn = document.getElementById('startBatchSimBtn');
  const batchProgressFill = document.getElementById('batchProgressFill');
  const batchProgressPercent = document.getElementById('batchProgressPercent');
  const batchProgressLabel = document.getElementById('batchProgressLabel');
  const terminalOutput = document.getElementById('terminalOutput');

  let isBatchRunning = false;

  function addTerminalLine(text, className = '') {
    if (!terminalOutput) return;
    const p = document.createElement('p');
    p.className = `term-line ${className}`;
    p.innerText = text;
    terminalOutput.appendChild(p);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  if (startBatchBtn) {
    startBatchBtn.addEventListener('click', () => {
      if (isBatchRunning) return;
      isBatchRunning = true;
      startBatchBtn.disabled = true;
      startBatchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Batch...';

      if (window.triggerMoneyShower) window.triggerMoneyShower(35);

      // Reset steps
      for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`bStep${i}`);
        const status = document.getElementById(`bStep${i}Status`);
        if (step) {
          step.className = 'batch-step-box';
        }
        if (status) status.innerText = 'Pending';
      }

      terminalOutput.innerHTML = '';
      addTerminalLine('[Batch Initialized] Starting 7th CPC Payroll Batch for 450 profiles...', 'text-brand');

      const steps = [
        {
          id: 1,
          label: 'Step 1/5: Ingesting Attendance & Bio-metric Leave logs...',
          term: '✓ Synchronized 450 attendance records. Zero leave deduction errors.',
          pct: 20
        },
        {
          id: 2,
          label: 'Step 2/5: Applying 7th CPC Matrix & DA Index (53%)...',
          term: '✓ Indexed Academic Levels 10-14A & Admin Levels 1-13. Computed HRA & TA.',
          pct: 45
        },
        {
          id: 3,
          label: 'Step 3/5: Computing Old/New Tax Regime TDS & NPS Deductions...',
          term: '✓ Section 80C/80D verified. NPS 10% + 14% Employer contribution balanced.',
          pct: 70
        },
        {
          id: 4,
          label: 'Step 4/5: Compiling Tamper-Proof PDF Payslips & Form 16...',
          term: '✓ 450 Encrypted PDF payslips generated. Verification barcodes signed.',
          pct: 90
        },
        {
          id: 5,
          label: 'Step 5/5: Generating SBI/HDFC Direct NEFT Bank Advice File...',
          term: '✓ Bank Direct Credit file export ready (₹7,84,32,190 disbursed with 0 errors).',
          pct: 100
        }
      ];

      let currentStepIdx = 0;

      function executeNextStep() {
        if (currentStepIdx >= steps.length) {
          // Batch Complete
          if (batchProgressLabel) batchProgressLabel.innerText = '✓ Batch Completed Successfully in 1.8 seconds!';
          if (batchProgressFill) batchProgressFill.style.width = '100%';
          if (batchProgressPercent) batchProgressPercent.innerText = '100%';

          addTerminalLine('[SUCCESS] All 450 payroll records locked and ready for approval.', 'text-brand');
          
          startBatchBtn.disabled = false;
          startBatchBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Run Simulation Again';
          isBatchRunning = false;

          if (window.triggerMoneyShower) window.triggerMoneyShower(50);

          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Batch Disbursal Simulated!',
              html: '450 Employee salary records computed in <b>1.8 seconds</b> with <b>100% 7th CPC accuracy</b>.<br/>Direct Bank NEFT file exported successfully.',
              confirmButtonColor: '#eb1267',
              confirmButtonText: 'Awesome!'
            });
          }
          return;
        }

        const stepObj = steps[currentStepIdx];
        const stepEl = document.getElementById(`bStep${stepObj.id}`);
        const statusEl = document.getElementById(`bStep${stepObj.id}Status`);

        if (stepEl) stepEl.className = 'batch-step-box active';
        if (statusEl) statusEl.innerText = 'Processing...';

        if (batchProgressLabel) batchProgressLabel.innerText = stepObj.label;
        if (batchProgressFill) batchProgressFill.style.width = `${stepObj.pct}%`;
        if (batchProgressPercent) batchProgressPercent.innerText = `${stepObj.pct}%`;

        setTimeout(() => {
          if (stepEl) stepEl.className = 'batch-step-box completed';
          if (statusEl) statusEl.innerText = 'Completed ✓';
          addTerminalLine(stepObj.term);

          currentStepIdx++;
          executeNextStep();
        }, 360);
      }

      executeNextStep();
    });
  }

  // ==========================================================================
  // 8. DEMO / CONTACT FORM SUBMISSION
  // ==========================================================================
  const demoForm = document.getElementById('demoForm');
  if (demoForm) {
    demoForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const submitBtn = demoForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      const name = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const org = document.getElementById('orgName').value.trim();

      if (!name || !email || !phone || !org) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Required Details Missing',
            text: 'Please enter your Full Name, Official Email, Phone, and Institute Name.',
            confirmButtonColor: '#eb1267'
          });
        } else {
          alert('Please fill in all mandatory fields.');
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Request...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        demoForm.reset();

        if (window.triggerMoneyShower) window.triggerMoneyShower(40);

        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'Demo Request Received!',
            html: `Thank you, <b>${name}</b>.<br/>Our payroll engineering specialist from <b>Virtoy Technologies (VT INDIA)</b> will connect with you at <b>${phone}</b> / <b>${email}</b> shortly.`,
            confirmButtonColor: '#eb1267',
            confirmButtonText: 'Great, Thank You!'
          });
        } else {
          alert(`Thank you, ${name}! Our payroll specialist from VT INDIA will connect with you shortly.`);
        }
      }, 700);
    });
  }
});
