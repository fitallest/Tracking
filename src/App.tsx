import React, { useState, useEffect } from 'react';
import { Search, Package, Check, Loader2, AlertCircle, MapPin, User, FileText, CreditCard, Truck, Clock, ArrowRight, ShieldCheck, Zap, Shield, Headphones, Ship, Warehouse, X, Globe, Star, TrendingUp, Users, Quote, Calendar, Box, Home, ChevronDown, Building2, Briefcase, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// In a real scenario, replace this with the Google Sheets CSV publish link
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkCq0jHKbkhJ5hjRU6dFAK1wqkM7JpccQaXcwZhDJSg325PYzzdPU4fYyuazxLguXCmpRC9E6rTjhf/pub?output=csv"; 

interface HistoryItem {
  time: string;
  title: string;
  detail: string;
}

interface TrackingRecord {
  id: string;
  overallTime: string;
  overallStatus: string;
  senderName: string; // Người giao
  senderAddress: string; // Địa chỉ giao
  recipientName: string; // Tên người nhận
  recipientAddress: string; // Địa chỉ nhận hàng
  fee: string;
  note: string;
  history: HistoryItem[];
}

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let p = '';
  let inQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (char === '"') {
      if (inQuote && nextChar === '"') {
        p += '"'; // Escaped quote
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      row.push(p);
      p = '';
    } else if ((char === '\n' || char === '\r') && !inQuote) {
      if (char === '\r' && nextChar === '\n') i++; // Handle \r\n
      row.push(p);
      result.push(row);
      row = [];
      p = '';
    } else {
      p += char;
    }
  }
  if (p || row.length > 0) {
    row.push(p);
    result.push(row);
  }
  return result;
}

export default function App() {
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingRecord | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setResult(null);

    try {
      const response = await fetch(GOOGLE_SHEETS_CSV_URL);
      if (!response.ok) throw new Error('Failed to load data');
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      let foundRecord: TrackingRecord | null = null;

      // Skip header (index 0 and 1)
      for (let i = 2; i < rows.length; i++) {
        const parts = rows[i];
        const id = parts[1]?.trim();
        
        if (id && id.toUpperCase() === trackingId.trim().toUpperCase()) {
          const history: HistoryItem[] = [];
          
          // Các cột điểm bắt đầu từ cột thứ 11 (index 10) do đã thêm cột Người giao
          // Cứ 3 cột là 1 điểm: Tên kho (10), Thời gian (11), Nội dung (12)
          for (let j = 10; j < parts.length; j += 3) {
            const tenKho = parts[j]?.trim();
            const thoiGian = parts[j+1]?.trim();
            const noiDung = parts[j+2]?.trim();
            
            // Nếu có ít nhất 1 thông tin thì thêm vào lịch sử
            if (tenKho || thoiGian || noiDung) {
              history.push({
                title: tenKho || '',
                time: thoiGian || '',
                detail: noiDung || ''
              });
            }
          }

          // Đảo ngược lịch sử để điểm mới nhất (nhập sau cùng) hiển thị lên trên cùng
          history.reverse();

          foundRecord = {
            id: id.toUpperCase(),
            overallTime: parts[2]?.trim() || '',
            overallStatus: parts[3]?.trim() || '',
            senderName: parts[4]?.trim() || '', // Người giao
            senderAddress: parts[5]?.trim() || '', // Địa chỉ giao
            recipientName: parts[6]?.trim() || '', // Tên người nhận
            recipientAddress: parts[7]?.trim() || '', // Địa chỉ nhận hàng
            fee: parts[8]?.trim() || '',
            note: parts[9]?.trim() || '',
            history: history
          };
          break; // Tìm thấy thì dừng
        }
      }

      if (foundRecord) {
        setResult(foundRecord);
      } else {
        setError('Tracking number not found or shipment not yet updated.');
      }
    } catch (err) {
      setError('An error occurred while tracking. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hasSearched) {
        setHasSearched(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSearched]);

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (hasSearched) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [hasSearched]);

  const isDelivered = result?.overallStatus.toLowerCase().includes('delivered') || 
                      result?.overallStatus.toLowerCase().includes('thành công') ||
                      result?.overallStatus.toLowerCase().includes('đã giao');

  const formatFee = (fee: string) => {
    const num = Number(fee);
    if (!isNaN(num) && fee !== '') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    }
    return fee;
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col selection:bg-[#ea580c] selection:text-white">
      
      {/* Navigation Bar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src="https://raw.githubusercontent.com/fitallest/Tracking/main/src/image/logovietthai.png" 
              alt="Minh Thiện Logistics Logo" 
              className={`h-10 w-auto object-contain transition-all duration-300 ${!scrolled ? 'brightness-0 invert' : ''}`}
              referrerPolicy="no-referrer"
            />
            <span className={`text-xl font-black tracking-tight ${scrolled ? 'text-[#1e3a8a]' : 'text-white'}`}>
              MINH THIỆN <span className="text-[#ea580c]">LOGISTICS</span>
            </span>
          </div>
          <div className={`hidden md:flex gap-8 font-medium ${scrolled ? 'text-slate-600' : 'text-white/90'}`}>
            <a href="#tra-cuu" className="hover:text-[#ea580c] transition-colors">Track</a>
            <a href="#diem-manh" className="hover:text-[#ea580c] transition-colors">Why Us</a>
            <a href="#quy-trinh" className="hover:text-[#ea580c] transition-colors">Process</a>
            <a href="#dich-vu" className="hover:text-[#ea580c] transition-colors">Services</a>
            <a href="#faq" className="hover:text-[#ea580c] transition-colors">FAQ</a>
            <a href="#lien-he" className="hover:text-[#ea580c] transition-colors">Contact</a>
          </div>
        </div>
      </motion.nav>

      {/* Hero Search Section - Always at the top */}
      <div id="tra-cuu" className="bg-[#0f172a] relative overflow-hidden min-h-[85vh] flex items-center pt-20">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-30 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute -left-40 -bottom-40 w-[600px] h-[600px] bg-[#ea580c] rounded-full blur-[120px] opacity-20 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 sm:py-20 text-center w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            <img 
              src="https://raw.githubusercontent.com/fitallest/Tracking/main/src/image/logovietthai.png" 
              alt="Minh Thiện Logistics Logo" 
              className="h-24 md:h-32 mx-auto mb-10 object-contain bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight"
          >
            Vietnam - Thailand<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#ea580c]">Logistics Excellence.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-slate-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Enter your tracking number to monitor real-time delivery status between Vietnam and Thailand with military-grade precision.
          </motion.p>
          
          {/* Search Box */}
          <motion.form 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            onSubmit={handleSearch} 
            className="bg-white/10 backdrop-blur-md p-2 sm:p-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto relative z-30"
          >
            <div className="relative flex-1 flex items-center bg-white rounded-xl overflow-hidden">
              <Search className="absolute left-5 w-6 h-6 text-slate-400" />
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking number (e.g., MT123456789)"
                className="w-full pl-14 pr-4 py-4 sm:py-5 bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 text-lg font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-10 py-4 sm:py-5 bg-gradient-to-r from-[#ea580c] to-[#c24100] hover:from-[#d84d08] hover:to-[#a33600] text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-orange-500/30"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Track Shipment'}
            </button>
          </motion.form>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-12 text-slate-400 text-sm font-medium"
          >
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Bank-grade Security</div>
            <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" /> Real-time Updates</div>
            <div className="flex items-center gap-2"><Globe className="w-5 h-5 text-purple-400" /> Cross-border Network</div>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
        >
          <span className="text-xs uppercase tracking-widest">Discover More</span>
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-0.5 h-12 bg-gradient-to-b from-white/50 to-transparent rounded-full"
          />
        </motion.div>
      </div>

      {/* Tracking Result Modal */}
      <AnimatePresence>
        {hasSearched && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <div 
              className="absolute inset-0" 
              onClick={() => setHasSearched(false)}
              aria-label="Close modal"
            ></div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
            >
              {/* Close Button */}
              <button 
                onClick={() => setHasSearched(false)}
                className="absolute top-6 right-6 z-50 p-2 bg-slate-100/80 backdrop-blur rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                    <div className="w-20 h-20 border-4 border-[#ea580c] rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                    <Package className="w-8 h-8 text-[#1e3a8a] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-xl font-medium text-slate-600 mt-6 tracking-wide">Connecting to secure network...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-32 text-center px-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6"
                  >
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  </motion.div>
                  <p className="text-3xl text-slate-800 font-black mb-3">Shipment Not Found</p>
                  <p className="text-slate-500 text-lg max-w-md">{error}</p>
                  <button 
                    onClick={() => setHasSearched(false)}
                    className="mt-10 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
                  >
                    Try Another Number
                  </button>
                </div>
              ) : result ? (
                <div className="bg-white">
                  
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-10 sm:px-12 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-0 z-40">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tracking Number</p>
                      <h2 className="text-3xl sm:text-5xl font-black text-[#1e3a8a] flex items-center gap-4 flex-wrap">
                        <Package className="w-10 h-10 text-[#ea580c] shrink-0" />
                        <span className="break-all tracking-tight">{result.id}</span>
                      </h2>
                    </div>
                    <div className="flex flex-col md:items-end w-full md:w-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Status</p>
                      <div className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-lg shadow-sm ${isDelivered ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {isDelivered && <Check className="w-5 h-5" />}
                        {result.overallStatus || 'Processing'}
                      </div>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 bg-white">
                    
                    {/* Sender & Recipient Column */}
                    <div className="p-6 sm:p-12 space-y-10">
                      {/* Sender */}
                      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-5">
                          <User className="w-4 h-4" /> Sender Information
                        </h3>
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Sender</p>
                            <p className="font-bold text-slate-800 text-xl">{result.senderName || '---'}</p>
                          </div>
                          <div className="pt-4 border-t border-slate-50">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Origin Address</p>
                            <p className="text-slate-600 font-medium flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                              <span>{result.senderAddress || '---'}</span>
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Recipient */}
                      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-5">
                          <User className="w-4 h-4" /> Recipient Information
                        </h3>
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Recipient</p>
                            <p className="font-bold text-slate-800 text-xl">{result.recipientName || '---'}</p>
                          </div>
                          <div className="pt-4 border-t border-slate-50">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Destination Address</p>
                            <p className="text-slate-600 font-medium flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-[#1e3a8a] shrink-0 mt-0.5" />
                              <span>{result.recipientAddress || '---'}</span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Package Details Column */}
                    <div className="p-6 sm:p-12 bg-slate-50/50">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <FileText className="w-4 h-4" /> Shipment Details
                      </h3>
                      <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock className="w-7 h-7 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Creation Time</p>
                            <p className="font-bold text-slate-800 text-lg">{result.overallTime || '---'}</p>
                          </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                            <CreditCard className="w-7 h-7 text-[#ea580c]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Shipping Fee</p>
                            <p className="font-black text-2xl text-[#ea580c] tracking-tight">{formatFee(result.fee) || '---'}</p>
                          </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Notes & Instructions</p>
                          <p className="text-slate-600 font-medium leading-relaxed">
                            {result.note || 'No special instructions provided.'}
                          </p>
                        </motion.div>
                      </div>
                    </div>

                  </div>

                  {/* Timeline Section */}
                  <div className="p-6 sm:p-12 border-t border-slate-100 bg-white">
                    <h3 className="text-2xl font-black text-[#1e3a8a] mb-10 flex items-center gap-3">
                      <TrendingUp className="w-7 h-7 text-[#ea580c]" /> Tracking History
                    </h3>
                    
                    {result.history.length > 0 ? (
                      <div className="relative pl-6 md:pl-12 max-w-4xl mx-auto">
                        {/* Vertical line */}
                        <div className="absolute top-8 bottom-8 left-[38px] md:left-[62px] w-1 bg-slate-100 rounded-full"></div>
                        
                        <div className="space-y-10">
                          {result.history.map((item, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + (idx * 0.1) }}
                              key={idx} 
                              className="relative flex gap-6 md:gap-10 items-start group"
                            >
                              {/* Timeline Node */}
                              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1 transition-all duration-500 ${idx === 0 ? 'bg-gradient-to-br from-[#ea580c] to-[#c24100] text-white ring-8 ring-orange-50 shadow-xl scale-110' : 'bg-white text-slate-300 border-4 border-slate-100 group-hover:border-[#1e3a8a] group-hover:text-[#1e3a8a]'}`}>
                                {idx === 0 ? <Check className="w-5 h-5" strokeWidth={3} /> : <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                              </div>
                              
                              {/* Content Card */}
                              <div className={`flex-1 p-6 rounded-2xl border transition-all duration-300 ${idx === 0 ? 'border-[#ea580c]/20 shadow-lg bg-gradient-to-br from-orange-50/50 to-white' : 'border-slate-100 shadow-sm bg-white hover:border-slate-200 hover:shadow-md'}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                  <h4 className={`font-bold text-xl ${idx === 0 ? 'text-[#ea580c]' : 'text-slate-800'}`}>
                                    {item.title}
                                  </h4>
                                  {item.time && (
                                    <span className="text-slate-500 text-sm font-bold flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl w-fit">
                                      <Clock className="w-4 h-4 text-slate-400" />
                                      {item.time}
                                    </span>
                                  )}
                                </div>
                                {item.detail && (
                                  <p className="text-slate-600 font-medium leading-relaxed">
                                    {item.detail}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                        <Package className="w-20 h-20 mx-auto text-slate-300 mb-6" />
                        <p className="text-xl font-bold text-slate-700">No tracking history available yet.</p>
                        <p className="text-base mt-2">The shipment details will be updated shortly.</p>
                      </div>
                    )}
                  </div>

                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow w-full">
        
        {/* Statistics Section */}
        <section id="thong-ke" className="py-20 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
            >
              {[
                { icon: Globe, value: "15+", label: "Years Experience" },
                { icon: Package, value: "1M+", label: "Parcels Delivered" },
                { icon: Users, value: "50k+", label: "Happy Clients" },
                { icon: Star, value: "99%", label: "Satisfaction Rate" }
              ].map((stat, index) => (
                <motion.div key={index} variants={fadeInUp} className="text-center group">
                  <div className="w-16 h-16 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors duration-300 shadow-sm">
                    <stat.icon className="w-8 h-8 text-[#ea580c] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">{stat.value}</h3>
                  <p className="text-slate-500 font-medium uppercase tracking-wider text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Trusted By / Partners */}
        <section className="py-12 bg-white border-b border-slate-100 overflow-hidden flex flex-col items-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">Trusted by industry leaders</p>
          <div className="flex gap-12 md:gap-24 items-center justify-center flex-wrap opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <div className="flex items-center gap-2 font-black text-2xl text-slate-800"><Building2 className="w-8 h-8 text-[#1e3a8a]"/> VIETCORP</div>
            <div className="flex items-center gap-2 font-black text-2xl text-slate-800"><Briefcase className="w-8 h-8 text-[#ea580c]"/> THAIGLOBAL</div>
            <div className="flex items-center gap-2 font-black text-2xl text-slate-800"><Coffee className="w-8 h-8 text-emerald-600"/> MEKONG</div>
            <div className="flex items-center gap-2 font-black text-2xl text-slate-800"><Globe className="w-8 h-8 text-blue-500"/> ASIA EXPORT</div>
            <div className="flex items-center gap-2 font-black text-2xl text-slate-800"><Box className="w-8 h-8 text-purple-600"/> LOGISPRO</div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="quy-trinh" className="py-24 bg-slate-50 relative border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-sm font-bold text-[#ea580c] uppercase tracking-widest mb-3">Simple & Transparent</h2>
              <h3 className="text-4xl md:text-5xl font-black text-[#1e3a8a] mb-6 tracking-tight">How It Works</h3>
              <div className="w-24 h-1.5 bg-gradient-to-r from-[#ea580c] to-[#c24100] mx-auto mb-8 rounded-full"></div>
            </motion.div>

            <div className="relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-1 bg-slate-200 rounded-full"></div>
              
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10"
              >
                {[
                  { step: "01", icon: Calendar, title: "Book Service", desc: "Request a quote and schedule your shipment online or via hotline." },
                  { step: "02", icon: Box, title: "Pack & Pickup", desc: "We provide packaging guidelines and pick up the cargo at your door." },
                  { step: "03", icon: Truck, title: "Transit & Clear", desc: "Fast transportation and seamless customs clearance at borders." },
                  { step: "04", icon: Home, title: "Safe Delivery", desc: "Final mile delivery to the recipient's address with proof of receipt." }
                ].map((item, index) => (
                  <motion.div key={index} variants={fadeInUp} className="relative text-center group">
                    <div className="w-24 h-24 mx-auto bg-white border-4 border-slate-100 rounded-full flex items-center justify-center mb-6 relative z-10 group-hover:border-[#ea580c] transition-colors duration-500 shadow-xl shadow-slate-200/50">
                      <item.icon className="w-10 h-10 text-[#1e3a8a] group-hover:text-[#ea580c] transition-colors duration-500" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#ea580c] text-white font-bold rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                        {item.step}
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h4>
                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Strengths Section */}
        <section id="diem-manh" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-black text-[#1e3a8a] mb-6 tracking-tight">Why Choose Minh Thiện?</h2>
              <div className="w-24 h-1.5 bg-gradient-to-r from-[#ea580c] to-[#c24100] mx-auto mb-8 rounded-full"></div>
              <p className="text-slate-600 max-w-3xl mx-auto text-xl font-light leading-relaxed">
                We combine industry expertise with cutting-edge technology to deliver seamless logistics solutions across borders.
              </p>
            </motion.div>
            
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {[
                { icon: Zap, title: "Lightning Fast", desc: "Optimized routing algorithms ensure the fastest possible delivery times between Vietnam and Thailand.", color: "blue" },
                { icon: CreditCard, title: "Cost Effective", desc: "Transparent pricing models with zero hidden fees. We maximize your business savings.", color: "orange" },
                { icon: Shield, title: "Fully Secured", desc: "International standard packaging, comprehensive cargo insurance, and guaranteed compensation.", color: "emerald" },
                { icon: Headphones, title: "24/7 Support", desc: "Dedicated logistics experts available around the clock to assist with your shipments.", color: "purple" }
              ].map((item, index) => (
                <motion.div key={index} variants={fadeInUp} className="bg-white rounded-3xl p-10 text-center hover:-translate-y-2 transition-transform duration-300 shadow-xl shadow-slate-200/50 border border-slate-100 group">
                  <div className={`w-20 h-20 bg-${item.color}-50 rounded-2xl flex items-center justify-center mx-auto mb-8 transform group-hover:rotate-6 transition-transform duration-300`}>
                    <item.icon className={`w-10 h-10 text-${item.color}-600`} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section id="dich-vu" className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-black text-[#1e3a8a] mb-6 tracking-tight">Premium Services</h2>
              <div className="w-24 h-1.5 bg-gradient-to-r from-[#ea580c] to-[#c24100] mx-auto mb-8 rounded-full"></div>
              <p className="text-slate-600 max-w-3xl mx-auto text-xl font-light leading-relaxed">
                A comprehensive logistics ecosystem designed to meet the most demanding shipping requirements.
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-10"
            >
              {[
                { img: "https://i.pinimg.com/736x/27/9e/7f/279e7fcbdabf1a81a0dfaed6e02aa1ef.jpg", icon: Truck, title: "Road Freight", desc: "Modern truck fleet with daily fixed routes. Suitable for general cargo with flexible timing and door-to-door delivery options.", color: "blue" },
                { img: "https://i.pinimg.com/736x/80/81/c5/8081c519bd631844e676e42af2d7e41b.jpg", icon: Ship, title: "Sea Freight", desc: "Cost-effective solutions for bulky and large-volume cargo. Stable and safe shipping schedules with full container load (FCL) and less than container load (LCL) options.", color: "orange" },
                { img: "https://i.pinimg.com/1200x/0f/6a/cd/0f6acd8ba83f235de1aa1d64cc27913f.jpg", icon: Warehouse, title: "Warehousing & Customs", desc: "Large, secure warehousing system with advanced inventory management. Comprehensive, fast, and legal customs clearance support by our expert team.", color: "emerald" }
              ].map((service, index) => (
                <motion.div key={index} variants={fadeInUp} className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 group">
                  <div className="h-64 relative overflow-hidden">
                    <img 
                      src={service.img} 
                      alt={service.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{service.title}</h3>
                    </div>
                  </div>
                  <div className="p-8 relative">
                    <div className={`w-14 h-14 bg-${service.color}-50 rounded-2xl flex items-center justify-center absolute -top-14 right-8 shadow-lg border-4 border-white transform group-hover:-translate-y-2 transition-transform duration-300`}>
                      <service.icon className={`w-6 h-6 text-${service.color}-600`} />
                    </div>
                    <p className="text-slate-600 mb-6 leading-relaxed">{service.desc}</p>
                    <a href="#lien-he" className="inline-flex items-center gap-2 text-[#ea580c] font-bold hover:text-[#c24100] transition-colors group/link">
                      Explore Service 
                      <ArrowRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="danh-gia" className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-100">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#1e3a8a]/5 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-sm font-bold text-[#ea580c] uppercase tracking-widest mb-3">Client Stories</h2>
              <h3 className="text-4xl md:text-5xl font-black text-[#1e3a8a] mb-6 tracking-tight">Trusted by Thousands</h3>
              <div className="w-24 h-1.5 bg-gradient-to-r from-[#ea580c] to-[#c24100] mx-auto mb-8 rounded-full"></div>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                { name: "Phakhin Wattanapanich", role: "CEO, VietThai Foods", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop", quote: "Minh Thiện Logistics has completely transformed our supply chain to Thailand. Their speed and transparency are unmatched in the industry." },
                { name: "Kanya Wattana", role: "Operations Manager, Siam Trade", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop", quote: "We've been using their sea freight services for 3 years. Not a single delayed shipment. The 24/7 support team is incredibly responsive." },
                { name: "Chalita Suwanarat", role: "Cross-border E-commerce", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&auto=format&fit=crop", quote: "The real-time tracking system gives me and my customers peace of mind. Highly recommend their road freight for cross-border e-commerce." }
              ].map((testimonial, index) => (
                <motion.div key={index} variants={fadeInUp} className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative group hover:-translate-y-2 transition-transform duration-300">
                  <Quote className="absolute top-8 right-8 w-12 h-12 text-slate-50 group-hover:text-blue-50 transition-colors duration-300" />
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-slate-600 text-lg italic mb-8 relative z-10">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <img src={testimonial.img} alt={testimonial.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-bold text-slate-800">{testimonial.name}</h4>
                      <p className="text-sm text-slate-500">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-sm font-bold text-[#ea580c] uppercase tracking-widest mb-3">Support Center</h2>
              <h3 className="text-4xl md:text-5xl font-black text-[#1e3a8a] mb-6 tracking-tight">Frequently Asked Questions</h3>
              <div className="w-24 h-1.5 bg-gradient-to-r from-[#ea580c] to-[#c24100] mx-auto mb-8 rounded-full"></div>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-6"
            >
              {[
                { q: "How long does shipping from Vietnam to Thailand take?", a: "Road freight typically takes 3-5 days, while sea freight can take 7-10 days depending on the port of departure and destination." },
                { q: "Do you provide customs clearance services?", a: "Yes, we offer comprehensive end-to-door customs clearance services for both export in Vietnam and import in Thailand." },
                { q: "Is my cargo insured during transit?", a: "Absolutely. We provide 100% cargo insurance for all shipments, ensuring you are fully compensated in the rare event of damage or loss." },
                { q: "How can I track my shipment?", a: "You can use the tracking tool at the top of this page. Simply enter your Tracking ID (e.g., MT123456) to see real-time updates." }
              ].map((faq, index) => (
                <motion.div key={index} variants={fadeInUp} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-center gap-4">
                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-[#1e3a8a] transition-colors">{faq.q}</h4>
                  </div>
                  <p className="mt-4 text-slate-600 leading-relaxed text-lg">{faq.a}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden bg-[#1e3a8a]">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to ship with us?</h2>
              <p className="text-blue-100 text-lg md:text-xl mb-10 font-light">Experience the most reliable logistics network between Vietnam and Thailand.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#lien-he" className="px-8 py-4 bg-[#ea580c] hover:bg-[#d84d08] text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2">
                  Get a Quote <ArrowRight className="w-5 h-5" />
                </a>
                <a href="#lien-he" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  Contact Sales
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer id="lien-he" className="bg-[#0f172a] text-slate-400 py-16 border-t border-slate-800 mt-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1e3a8a] via-[#ea580c] to-[#1e3a8a]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img 
                  src="https://raw.githubusercontent.com/fitallest/Tracking/main/src/image/logovietthai.png" 
                  alt="Minh Thiện Logistics Logo" 
                  className="h-10 w-auto object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
                <h2 className="text-2xl font-black text-white tracking-tight">MINH THIỆN <span className="text-[#ea580c]">LOGISTICS</span></h2>
              </div>
              <p className="text-base leading-relaxed max-w-md mb-8">
                Premium freight forwarding unit for the Vietnam - Thailand route. We deliver excellence, speed, and reliability in every shipment.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Our Services</h3>
              <ul className="space-y-3 text-base">
                <li><a href="#dich-vu" className="hover:text-[#ea580c] transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Road Freight</a></li>
                <li><a href="#dich-vu" className="hover:text-[#ea580c] transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Sea Freight</a></li>
                <li><a href="#dich-vu" className="hover:text-[#ea580c] transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Customs Clearance</a></li>
                <li><a href="#dich-vu" className="hover:text-[#ea580c] transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Warehousing</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Contact Us</h3>
              <ul className="space-y-4 text-base">
                <li className="flex items-start gap-3">
                  <Headphones className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Hotline</p>
                    <p>0568701182</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Website</p>
                    <p>minhthienlogistics.net</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Headquarters</p>
                    <p>Ho Chi Minh City, Vietnam</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800/50 text-center md:text-left text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2023 Minh Thiện Logistics. All rights reserved.</p>
            <div className="flex gap-6 font-medium">
              <a href="#faq" className="hover:text-white transition-colors">Terms & Conditions</a>
              <a href="#faq" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
