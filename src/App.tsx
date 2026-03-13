import React, { useState } from 'react';
import { Search, Package, Check, Loader2, AlertCircle, MapPin, User, FileText, CreditCard, Truck, Clock, ArrowRight, ShieldCheck, Zap, Shield, Headphones, Ship, Warehouse } from 'lucide-react';

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setResult(null);

    try {
      const response = await fetch(GOOGLE_SHEETS_CSV_URL);
      if (!response.ok) throw new Error('Không thể tải dữ liệu');
      
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
        setError('Không tìm thấy mã vận đơn hoặc đơn hàng chưa được cập nhật.');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tra cứu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col">
      {/* Hero Search Section - Always at the top */}
      <div id="tra-cuu" className="bg-[#1e3a8a] relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-[#ea580c] rounded-full blur-3xl opacity-20"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <img 
            src="https://raw.githubusercontent.com/fitallest/Tracking/main/src/image/logovietthai.png" 
            alt="Minh Thiên Logistics Logo" 
            className="h-28 md:h-36 mx-auto mb-8 object-contain bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:shadow-[0_0_45px_rgba(255,255,255,0.8)] transition-shadow duration-300"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Tra Cứu Hành Trình Đơn Hàng
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto font-medium">
            Nhập mã vận đơn của bạn để theo dõi tình trạng giao hàng theo thời gian thực giữa Việt Nam và Thái Lan.
          </p>
          
          {/* Search Box */}
          <form onSubmit={handleSearch} className="bg-white p-3 sm:p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto transform transition-all hover:shadow-blue-900/20 relative z-30">
            <div className="relative flex-1 flex items-center bg-slate-50 sm:bg-transparent rounded-xl sm:rounded-none border border-slate-200 sm:border-none focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 sm:focus-within:border-none sm:focus-within:ring-0 transition-all">
              <Search className="absolute left-4 w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Nhập mã vận đơn..."
                className="w-full pl-12 sm:pl-14 pr-4 py-3.5 sm:py-5 bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 text-base sm:text-xl font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-5 bg-[#ea580c] hover:bg-[#d84d08] text-white font-bold text-base sm:text-lg rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap shadow-lg hover:shadow-orange-500/30"
            >
              {loading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : 'Tra Cứu Ngay'}
            </button>
          </form>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-blue-200 text-sm font-medium">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Bảo mật thông tin</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Cập nhật 24/7</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow w-full">
        {hasSearched && (
          <div className="max-w-5xl mx-auto px-4 py-12 -mt-12 relative z-20">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
                <Loader2 className="w-12 h-12 animate-spin text-[#ea580c] mb-4" />
                <p className="text-lg font-medium text-slate-600">Đang kết nối hệ thống...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl shadow-sm border border-red-100">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <p className="text-2xl text-slate-800 font-bold mb-2">Không tìm thấy đơn hàng</p>
                <p className="text-slate-500 max-w-md">{error}</p>
              </div>
            ) : result ? (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                
                {/* Order Header */}
                <div className="bg-slate-50 px-6 py-8 sm:px-10 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Mã Vận Đơn</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-[#1e3a8a] flex items-center gap-3 flex-wrap">
                      <Package className="w-8 h-8 text-[#ea580c] shrink-0" />
                      <span className="break-all">{result.id}</span>
                    </h2>
                  </div>
                  <div className="flex flex-col md:items-end w-full md:w-auto">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Trạng Thái</p>
                    <div className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-lg ${isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                      {isDelivered && <Check className="w-5 h-5" />}
                      {result.overallStatus || 'Đang xử lý'}
                    </div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                  
                  {/* Sender & Recipient Column */}
                  <div className="p-6 sm:p-10 space-y-8">
                    {/* Sender */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <User className="w-4 h-4" /> Thông Tin Người Giao
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Người giao</p>
                          <p className="font-bold text-slate-800 text-lg">{result.senderName || '---'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Địa chỉ giao</p>
                          <p className="text-slate-700 font-medium flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{result.senderAddress || '---'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className="flex justify-center">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <ArrowRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>

                    {/* Recipient */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <User className="w-4 h-4" /> Thông Tin Người Nhận
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Người nhận</p>
                          <p className="font-bold text-slate-800 text-lg">{result.recipientName || '---'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Địa chỉ nhận</p>
                          <p className="text-slate-700 font-medium flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{result.recipientAddress || '---'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Package Details Column */}
                  <div className="p-6 sm:p-10 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <FileText className="w-4 h-4" /> Chi Tiết Vận Đơn
                    </h3>
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                          <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Thời gian tạo đơn</p>
                          <p className="font-bold text-slate-800">{result.overallTime || '---'}</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
                          <CreditCard className="w-6 h-6 text-[#ea580c]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Phí vận chuyển</p>
                          <p className="font-black text-xl text-[#ea580c]">{formatFee(result.fee) || '---'}</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Ghi chú đơn hàng</p>
                        <p className="text-slate-700 font-medium">
                          {result.note || 'Không có ghi chú'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Timeline Section */}
                <div className="p-6 sm:p-10 border-t border-slate-200 bg-white">
                  <h3 className="text-xl font-black text-[#1e3a8a] mb-8 flex items-center gap-3">
                    <Truck className="w-6 h-6 text-[#ea580c]" /> Lịch Trình Vận Chuyển
                  </h3>
                  
                  {result.history.length > 0 ? (
                    <div className="relative pl-6 md:pl-10 max-w-4xl mx-auto">
                      {/* Vertical line */}
                      <div className="absolute top-6 bottom-6 left-[38px] md:left-[54px] w-1 bg-slate-100 rounded-full"></div>
                      
                      <div className="space-y-8">
                        {result.history.map((item, idx) => (
                          <div key={idx} className="relative flex gap-6 md:gap-8 items-start group">
                            {/* Timeline Node */}
                            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 transition-all duration-300 ${idx === 0 ? 'bg-[#ea580c] text-white ring-8 ring-orange-50 shadow-lg scale-110' : 'bg-white text-slate-400 border-4 border-slate-200 group-hover:border-[#1e3a8a] group-hover:text-[#1e3a8a]'}`}>
                              {idx === 0 ? <Check className="w-4 h-4" strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                            </div>
                            
                            {/* Content Card */}
                            <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 ${idx === 0 ? 'border-[#ea580c]/30 shadow-md bg-orange-50/20' : 'border-slate-100 shadow-sm bg-white hover:border-slate-300 hover:shadow-md'}`}>
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                                <h4 className={`font-bold text-lg ${idx === 0 ? 'text-[#ea580c]' : 'text-slate-800'}`}>
                                  {item.title}
                                </h4>
                                {item.time && (
                                  <span className="text-slate-600 text-sm font-semibold flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
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
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                      <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                      <p className="text-lg font-semibold text-slate-600">Chưa có thông tin cập nhật hành trình cho đơn hàng này.</p>
                      <p className="text-sm mt-2">Vui lòng quay lại sau.</p>
                    </div>
                  )}
                </div>

              </div>
            ) : null}
            </div>
          </div>
        )}

        {/* Strengths Section */}
        <section id="diem-manh" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#1e3a8a] mb-4">Tại Sao Chọn Minh Thiên Logistics?</h2>
              <div className="w-24 h-1 bg-[#ea580c] mx-auto mb-6 rounded-full"></div>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">Chúng tôi cam kết mang đến dịch vụ vận chuyển chất lượng cao, an toàn và tối ưu chi phí nhất cho mọi khách hàng.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Item 1 */}
              <div className="bg-slate-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-slate-100">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Tốc Độ Nhanh Chóng</h3>
                <p className="text-slate-600">Tối ưu hóa tuyến đường, đảm bảo thời gian giao hàng nhanh nhất từ Việt Nam sang Thái Lan và ngược lại.</p>
              </div>
              
              {/* Item 2 */}
              <div className="bg-slate-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-slate-100">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3">
                  <CreditCard className="w-8 h-8 text-[#ea580c]" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Chi Phí Tối Ưu</h3>
                <p className="text-slate-600">Bảng giá cạnh tranh, minh bạch, không phát sinh phụ phí ẩn. Tiết kiệm tối đa cho doanh nghiệp.</p>
              </div>
              
              {/* Item 3 */}
              <div className="bg-slate-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-slate-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <Shield className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">An Toàn Tuyệt Đối</h3>
                <p className="text-slate-600">Quy trình đóng gói chuẩn quốc tế, bảo hiểm hàng hóa 100%, cam kết đền bù nếu xảy ra rủi ro.</p>
              </div>
              
              {/* Item 4 */}
              <div className="bg-slate-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-slate-100">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3">
                  <Headphones className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Hỗ Trợ 24/7</h3>
                <p className="text-slate-600">Đội ngũ chăm sóc khách hàng chuyên nghiệp, sẵn sàng giải đáp và hỗ trợ mọi lúc, mọi nơi.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="dich-vu" className="py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#1e3a8a] mb-4">Dịch Vụ Nổi Bật</h2>
              <div className="w-24 h-1 bg-[#ea580c] mx-auto mb-6 rounded-full"></div>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">Hệ sinh thái logistics toàn diện, đáp ứng đa dạng nhu cầu vận chuyển của bạn.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Service 1 */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-slate-100 group">
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src="https://i.pinimg.com/736x/27/9e/7f/279e7fcbdabf1a81a0dfaed6e02aa1ef.jpg" 
                    alt="Vận chuyển đường bộ" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="p-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 -mt-14 relative z-10 border-4 border-white shadow-sm">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Vận Chuyển Đường Bộ</h3>
                  <p className="text-slate-600 mb-4">Đội xe tải hiện đại, chạy tuyến cố định hàng ngày. Phù hợp cho hàng hóa thông thường, linh hoạt thời gian.</p>
                  <a href="#" className="text-[#ea580c] font-semibold flex items-center gap-1 hover:gap-2 transition-all">Tìm hiểu thêm <ArrowRight className="w-4 h-4" /></a>
                </div>
              </div>

              {/* Service 2 */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-slate-100 group">
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src="https://i.pinimg.com/736x/80/81/c5/8081c519bd631844e676e42af2d7e41b.jpg" 
                    alt="Vận chuyển đường biển" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="p-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 -mt-14 relative z-10 border-4 border-white shadow-sm">
                    <Ship className="w-5 h-5 text-[#ea580c]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Vận Chuyển Đường Biển</h3>
                  <p className="text-slate-600 mb-4">Giải pháp tối ưu chi phí cho hàng hóa cồng kềnh, số lượng lớn. Lịch trình tàu ổn định, an toàn.</p>
                  <a href="#" className="text-[#ea580c] font-semibold flex items-center gap-1 hover:gap-2 transition-all">Tìm hiểu thêm <ArrowRight className="w-4 h-4" /></a>
                </div>
              </div>

              {/* Service 3 */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-slate-100 group">
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src="https://i.pinimg.com/1200x/0f/6a/cd/0f6acd8ba83f235de1aa1d64cc27913f.jpg" 
                    alt="Kho bãi và Hải quan" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="p-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 -mt-14 relative z-10 border-4 border-white shadow-sm">
                    <Warehouse className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Kho Bãi & Hải Quan</h3>
                  <p className="text-slate-600 mb-4">Hệ thống kho bãi rộng lớn, an ninh. Hỗ trợ xử lý thủ tục hải quan trọn gói, nhanh chóng, hợp pháp.</p>
                  <a href="#" className="text-[#ea580c] font-semibold flex items-center gap-1 hover:gap-2 transition-all">Tìm hiểu thêm <ArrowRight className="w-4 h-4" /></a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer id="lien-he" className="bg-[#0f172a] text-slate-400 py-12 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-6 h-6 text-white" />
                <h2 className="text-xl font-black text-white tracking-tight">MINH THIỆN <span className="text-[#ea580c]">LOGISTICS</span></h2>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Đơn vị vận chuyển hàng hóa chuyên nghiệp tuyến Việt Nam - Thái Lan. Nhanh chóng, an toàn và tiết kiệm.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Dịch vụ</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Vận chuyển đường bộ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Vận chuyển đường biển</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Dịch vụ hải quan</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Giao hàng tận nơi</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Liên hệ</h3>
              <ul className="space-y-2 text-sm">
                <li>Hotline: Thịnh - 0787353440</li>
                <li>Website: minhthienlogistics.net</li>
                <li>Địa chỉ: TP. Hồ Chí Minh, Việt Nam</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2026 Minh Thiên Logistics. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
              <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
