import React, { useState } from 'react';
import { Search, Package, Check, Loader2, AlertCircle } from 'lucide-react';

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
  recipientName: string;
  deliveryAddress: string;
  receivingAddress: string;
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
          
          // Các cột điểm bắt đầu từ cột thứ 10 (index 9)
          // Cứ 3 cột là 1 điểm: Tên kho (9), Thời gian (10), Nội dung (11)
          for (let j = 9; j < parts.length; j += 3) {
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
            recipientName: parts[4]?.trim() || '',
            deliveryAddress: parts[5]?.trim() || '',
            receivingAddress: parts[6]?.trim() || '',
            fee: parts[7]?.trim() || '',
            note: parts[8]?.trim() || '',
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
    <div className="min-h-screen bg-[#f4f6f8] font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white py-4 shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-900" />
          <h1 className="text-xl font-bold text-blue-900">Tra cứu vận đơn</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Nhập mã vận đơn..."
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-[#2b4162] hover:bg-[#1e2e45] text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tra cứu'}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-white rounded-lg shadow-sm border border-slate-200">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-lg animate-pulse">Đang tìm kiếm...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-lg text-slate-700 font-medium">{error}</p>
              </div>
            ) : result ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                
                {/* Top Info Card */}
                <div className="p-6 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Người nhận:</span>
                      <span className="font-semibold text-slate-800">{result.recipientName || '-'}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Địa chỉ giao:</span>
                      <span className="text-slate-800">{result.deliveryAddress || '-'}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Địa chỉ nhận:</span>
                      <span className="text-slate-800">{result.receivingAddress || '-'}</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6">
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Mã vận đơn:</span>
                      <span className="font-bold text-blue-900">{result.id}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Trạng thái:</span>
                      <span className={`font-semibold ${isDelivered ? 'text-emerald-500' : 'text-blue-600'}`}>
                        {result.overallStatus || '-'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Phí vận chuyển:</span>
                      <span className="text-slate-800">{formatFee(result.fee) || '-'}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-32 shrink-0">Ghi chú:</span>
                      <span className="text-slate-800">{result.note || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="p-6 bg-white">
                  <h3 className="text-lg font-semibold text-slate-800 mb-6">Lịch sử hành trình</h3>
                  {result.history.length > 0 ? (
                    <div className="relative pl-2 md:pl-4">
                      {/* Vertical line */}
                      <div className="absolute top-4 bottom-4 left-[19px] md:left-[27px] w-px bg-slate-200"></div>
                      
                      <div className="space-y-0">
                        {result.history.map((item, idx) => (
                          <div key={idx} className="relative flex gap-4 md:gap-6 items-start py-4 border-b border-slate-100 last:border-0">
                            {/* Check icon */}
                            <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${idx === 0 ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 'bg-slate-200 text-slate-500'}`}>
                              <Check className="w-4 h-4" strokeWidth={3} />
                            </div>
                            
                            <div className="flex-1">
                              <h4 className={`font-medium text-[15px] ${idx === 0 ? 'text-blue-900' : 'text-slate-800'}`}>
                                {item.title}
                              </h4>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                                {item.time && (
                                  <span className="text-slate-500 text-sm font-medium">
                                    {item.time}
                                  </span>
                                )}
                                {item.time && item.detail && <span className="hidden sm:inline text-slate-300">•</span>}
                                {item.detail && (
                                  <span className="text-slate-600 text-sm">
                                    {item.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                      Chưa có thông tin hành trình cho đơn hàng này.
                    </div>
                  )}
                </div>

              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
