
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storage';
import { Student, AttendanceRecord, STATUS_LABELS, STATUS_COLORS, Class, AttendanceStatus } from '../types';
import { Search, RotateCcw, History, FileCode, CheckCircle, AlertCircle, XCircle, Shirt, Calendar, Users } from 'lucide-react';

const AttendanceHistory: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAttendance(storage.getAttendance());
    setStudents(storage.getStudents());
    setClasses(storage.getClasses());
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterClass('all');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const getStatusLetter = (status: AttendanceStatus) => {
    switch(status) {
      case 'present': return 'ح';
      case 'pe_kit': return 'أ';
      case 'justified': return 'ب';
      case 'absent': return 'ج';
      default: return '-';
    }
  };

  const filteredAttendance = useMemo(() => {
    return attendance.filter(record => {
      let matchesDate = true;
      if (filterDateStart && record.date < filterDateStart) matchesDate = false;
      if (filterDateEnd && record.date > filterDateEnd) matchesDate = false;
      
      const student = students.find(s => s.id === record.studentId);
      if (!student) return false;
      
      const matchesClass = filterClass === 'all' || student.classId === filterClass;
      const matchesSearch = searchTerm === '' || student.name.includes(searchTerm) || student.id.includes(searchTerm);
      
      return matchesDate && matchesClass && matchesSearch;
    });
  }, [attendance, students, filterDateStart, filterDateEnd, filterClass, searchTerm]);

  const summaryStats = useMemo(() => {
    return {
      h: filteredAttendance.filter(a => a.status === 'present').length,
      a: filteredAttendance.filter(a => a.status === 'pe_kit').length,
      b: filteredAttendance.filter(a => a.status === 'justified').length,
      j: filteredAttendance.filter(a => a.status === 'absent').length
    };
  }, [filteredAttendance]);

  const groupedData = useMemo(() => {
    const groups: Record<string, AttendanceRecord[]> = {};
    filteredAttendance.forEach(record => {
      if (!groups[record.studentId]) groups[record.studentId] = [];
      groups[record.studentId].push(record);
    });

    return students
      .filter(student => {
        const matchesClass = filterClass === 'all' || student.classId === filterClass;
        const matchesSearch = searchTerm === '' || student.name.includes(searchTerm) || student.id.includes(searchTerm);
        return matchesClass && matchesSearch && (groups[student.id] || searchTerm !== '');
      })
      .map(student => ({
        ...student,
        records: (groups[student.id] || []).sort((a, b) => b.date.localeCompare(a.date)),
        className: classes.find(c => c.id === student.classId)?.name || 'قسم غير معروف',
        schoolName: classes.find(c => c.id === student.classId)?.schoolName || '',
        teacherName: classes.find(c => c.id === student.classId)?.teacherName || '..........................'
      }));
  }, [students, classes, filteredAttendance, searchTerm, filterClass]);

  const generatePrintableHTML = () => {
    const uniqueDates = (Array.from(new Set(filteredAttendance.map(a => a.date))) as string[])
      .sort((a, b) => a.localeCompare(b));

    const currentClass = filterClass !== 'all' ? classes.find(c => c.id === filterClass) : null;
    const currentClassName = currentClass ? currentClass.name : 'جميع الأقسام';
    const currentSchoolName = currentClass ? currentClass.schoolName : '..........................';
    const currentTeacherName = currentClass ? currentClass.teacherName : '..........................';
    const currentProvince = currentClass?.province || '..........................';

    const studentChunks = [];
    // وضع 45 تلميذاً لتقليل الأوراق
    for (let i = 0; i < groupedData.length; i += 45) {
      studentChunks.push(groupedData.slice(i, i + 45));
    }

    let pagesHtml = studentChunks.map((chunk, pageIndex) => `
        <div class="print-page">
            <div class="header">
                <div class="official-top">
                    <div class="ministry">وزارة التربية الوطنية</div>
                    <div class="direction">مديرية التربية لولاية ${currentProvince}</div>
                </div>
                <div class="info-row">
                    <span><strong>المؤسسة:</strong> ${currentSchoolName}</span>
                    <span><strong>الأستاذ:</strong> ${currentTeacherName}</span>
                    <span><strong>القسم:</strong> ${currentClassName}</span>
                </div>
                <h1 class="report-title">سجل المناداة</h1>
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="student-name-col">الاسم واللقب</th>
                        ${uniqueDates.map(date => `<th>${date.split('-').slice(1).reverse().join('/')}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${chunk.map(student => `
                        <tr>
                            <td class="student-name-col">${student.name}</td>
                            ${uniqueDates.map(date => {
                                const record = student.records.find(r => r.date === date);
                                const letter = record ? getStatusLetter(record.status) : '';
                                
                                // منطق تعيين الفئة الصحيحة للألوان
                                let statusClass = '';
                                if (record) {
                                  if (record.status === 'present') statusClass = 'status-h';
                                  else if (record.status === 'pe_kit') statusClass = 'status-a';
                                  else if (record.status === 'justified') statusClass = 'status-b';
                                  else if (record.status === 'absent') statusClass = 'status-j';
                                }
                                
                                return `<td><div class="status-cell ${statusClass}">${letter}</div></td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="legend">
                <span class="legend-item"><span class="status-cell status-h">ح</span> حاضر ببدلة</span>
                <span class="legend-item"><span class="status-cell status-a">أ</span> حاضر بدون بدلة</span>
                <span class="legend-item"><span class="status-cell status-b">ب</span> غياب مبرر</span>
                <span class="legend-item"><span class="status-cell status-j">ج</span> غياب غير مبرر</span>
            </div>
            
            <div class="footer-info">
                <span>توقيع الأستاذ: .................</span>
                <span>توقيع المدير(ة): ..........................</span>
            </div>
            
            <div class="page-number">صفحة ${pageIndex + 1} من ${studentChunks.length}</div>
        </div>
    `).join('');

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>سجل المناداة - ${currentClassName}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            body { font-family: 'Cairo', sans-serif; padding: 0; margin: 0; color: #000; background: white; }
            .print-page { padding: 10mm; page-break-after: always; min-height: 297mm; position: relative; box-sizing: border-box; background: white; }
            
            .header { text-align: center; margin-bottom: 10px; }
            .official-top { margin-bottom: 8px; font-weight: 900; font-size: 11px; text-align: center; }
            .ministry { margin-bottom: 2px; }
            
            .info-row { display: flex; justify-content: space-between; font-size: 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px; }
            .report-title { font-size: 16px; font-weight: 900; margin: 5px 0; color: #000; text-align: center; }
            
            table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.2px solid #000; }
            th, td { border: 1px solid #000; text-align: center; padding: 4px 1px; font-size: 8px; overflow: hidden; vertical-align: middle; }
            th { background-color: #f1f5f9 !important; font-weight: 900; color: #000; }
            .student-name-col { width: 150px; text-align: right; padding-right: 5px; font-weight: bold; font-size: 9px; color: #000; }
            
            .status-cell { 
              display: inline-flex; 
              align-items: center; 
              justify-content: center; 
              width: 16px; 
              height: 16px; 
              border-radius: 2px; 
              font-weight: 900; 
              color: white !important; 
              font-size: 9px; 
              -webkit-print-color-adjust: exact !important;
            }
            
            /* ألوان الحالات مثبتة للطباعة */
            .status-h { background-color: #10b981 !important; color: white !important; }
            .status-a { background-color: #3b82f6 !important; color: white !important; }
            .status-b { background-color: #f59e0b !important; color: white !important; }
            .status-j { background-color: #ef4444 !important; color: white !important; }
            
            .footer-info { margin-top: 20px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; color: #000; }
            .legend { margin-top: 15px; display: flex; gap: 15px; justify-content: center; padding: 5px; background: #f8fafc; border-radius: 6px; font-size: 9px; border: 1px solid #e2e8f0; }
            .legend-item { display: flex; align-items: center; gap: 4px; font-weight: 700; }
            .page-number { position: absolute; bottom: 5mm; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; }
            
            @media print { 
                .no-print { display: none !important; } 
                body { padding: 0; }
                .print-page { border: none; box-shadow: none; margin: 0; }
                th { background-color: #f1f5f9 !important; }
            }
        </style>
    </head>
    <body>
        ${pagesHtml}
        <div class="no-print" style="position: fixed; bottom: 30px; left: 30px; display: flex; gap: 10px; z-index: 9999;">
            <button onclick="window.print()" style="padding:14px 28px; background:#1e293b; color:#fff; border:none; cursor:pointer; font-family:Cairo; font-weight:900; border-radius:12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">إصدار أمر الطباعة</button>
            <button onclick="window.close()" style="padding:14px 28px; background:#f1f5f9; color:#475569; border:none; cursor:pointer; font-family:Cairo; font-weight:900; border-radius:12px;">إغلاق المعاينة</button>
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-16 font-cairo">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-100">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">سجل الغيابات والمتابعة</h2>
              <p className="text-[8px] text-slate-400 font-bold uppercase">إدارة الأرشيف والبحث</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              { label: 'ح', value: summaryStats.h, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'أ', value: summaryStats.a, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'ب', value: summaryStats.b, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'ج', value: summaryStats.j, color: 'text-rose-600', bg: 'bg-rose-50' }
            ].map((stat, idx) => (
              <div key={idx} className={`flex items-center gap-1.5 px-3 py-1 ${stat.bg} rounded-lg border border-transparent`}>
                <span className={`text-[10px] font-black ${stat.color}`}>{stat.label}: {stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-50">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="ابحث بالاسم أو الرقم التعريف..." 
                className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="w-full md:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="all">جميع الأقسام</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex flex-1 gap-2">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
                <span className="text-[9px] font-black text-slate-400 ml-2 whitespace-nowrap">من تاريخ:</span>
                <input 
                  type="date" 
                  className="w-full bg-transparent py-1.5 font-bold text-[10px] text-slate-900 outline-none" 
                  value={filterDateStart} 
                  onChange={e => setFilterDateStart(e.target.value)} 
                />
              </div>
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
                <span className="text-[9px] font-black text-slate-400 ml-2 whitespace-nowrap">إلى تاريخ:</span>
                <input 
                  type="date" 
                  className="w-full bg-transparent py-1.5 font-bold text-[10px] text-slate-900 outline-none" 
                  value={filterDateEnd} 
                  onChange={e => setFilterDateEnd(e.target.value)} 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={resetFilters} 
                className="bg-slate-100 px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-all shadow-sm flex items-center justify-center"
                title="إعادة تعيين الفلاتر"
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={generatePrintableHTML} 
                className="flex-1 md:w-40 bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 shadow-md hover:bg-black transition-all"
              >
                <FileCode size={14} /> طباعة السجل
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">تلميذ الفوج</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">آخر النشاطات (ح، أ، ب، ج)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">نسبة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groupedData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Users size={48} />
                      <p className="font-black text-sm">لا توجد بيانات</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedData.map((student) => {
                  const presenceCount = student.records.filter(r => r.status === 'present' || r.status === 'pe_kit').length;
                  const total = student.records.length;
                  const percentage = total > 0 ? Math.round((presenceCount / total) * 100) : 0;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-3.5">
                        <p className="font-black text-slate-900 text-sm">{student.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {student.id}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {student.records.slice(0, 10).map((record) => (
                            <div 
                              key={record.id}
                              title={`${record.date}: ${STATUS_LABELS[record.status]}`}
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] text-white font-black shadow-sm transform hover:scale-110 transition-transform cursor-help ${
                                record.status === 'present' ? 'bg-emerald-500' : 
                                record.status === 'pe_kit' ? 'bg-indigo-500' : 
                                record.status === 'justified' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            >
                              {getStatusLetter(record.status)}
                            </div>
                          ))}
                          {student.records.length > 10 && <span className="text-[9px] font-bold text-slate-300 self-center">+</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-1 bg-slate-100 rounded-full mb-1 overflow-hidden">
                             <div 
                              className={`h-full transition-all duration-1000 ${percentage > 80 ? 'bg-emerald-500' : percentage > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${percentage}%` }}
                             />
                          </div>
                          <span className={`text-[10px] font-black ${percentage > 80 ? 'text-emerald-600' : percentage > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;
