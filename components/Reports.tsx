
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { AttendanceRecord, Class, STATUS_LABELS } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FileBarChart, TrendingUp, UserX, Info } from 'lucide-react';

const Reports: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  useEffect(() => {
    setAttendance(storage.getAttendance());
    setClasses(storage.getClasses());
  }, []);

  const getChartData = (classId: string) => {
    const filtered = classId === 'all' ? attendance : attendance.filter(a => a.classId === classId);
    
    const stats = {
      present: filtered.filter(a => a.status === 'present').length,
      pe_kit: filtered.filter(a => a.status === 'pe_kit').length,
      justified: filtered.filter(a => a.status === 'justified').length,
      absent: filtered.filter(a => a.status === 'absent').length,
    };

    const orderColors: Record<string, string> = {
      present: '#10b981', // ح - أخضر
      pe_kit: '#3b82f6',  // أ - أزرق
      justified: '#f59e0b', // ب - برتقالي
      absent: '#ef4444',  // ج - أحمر
    };

    return Object.entries(stats).map(([key, value]) => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
      statusKey: key,
      value,
      color: orderColors[key] || '#cbd5e1'
    }));
  };

  const chartData = getChartData(selectedClassId);
  const totalRecords = chartData.reduce((acc, curr) => acc + curr.value, 0);
  
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedClassName = selectedClassId === 'all' ? 'جميع الأقسام' : selectedClass?.name || '';
  const selectedTeacherName = selectedClassId === 'all' ? '..........................' : selectedClass?.teacherName || '..........................';

  const physicalPresenceCount = chartData
    .filter(d => d.statusKey === 'present' || d.statusKey === 'pe_kit')
    .reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20 font-cairo">
      
      {/* Header for Screen - Compact */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-100">
              <FileBarChart size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-none">إحصائيات الحضور</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">تحليل شامل لبيانات المنادات</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              className="w-full md:w-64 bg-slate-50 border-slate-200 rounded-xl py-2 px-4 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">كل الأقسام</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart Card - Improved Legend (No dots, colored text) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[450px] flex flex-col">
          <h4 className="text-sm font-black text-slate-800 mb-6 border-b border-slate-50 pb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" /> توزيع الحالات بيانياً
          </h4>
          
          {totalRecords > 0 ? (
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={true}
                  >
                    {chartData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Cairo', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={40} 
                    iconSize={0}
                    formatter={(value, entry: any) => {
                      const color = entry.payload?.color || '#000';
                      return <span className="font-black text-[11px] px-3" style={{ color }}>{value}</span>;
                    }}
                    wrapperStyle={{ paddingTop: '20px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4 py-16">
              <UserX size={60} className="opacity-10" />
              <p className="font-black text-sm text-slate-400">لا توجد بيانات متاحة</p>
            </div>
          )}
        </div>

        {/* Data Analysis Cards - Compact */}
        <div className="space-y-4">
          
          {/* Main Counter Card */}
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-[9px] font-black opacity-50 mb-1 uppercase tracking-widest">إحصائيات {selectedClassName}</h4>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-black leading-none">{totalRecords}</span>
                <span className="text-sm font-bold opacity-70 tracking-tight pb-1">سجل مناداة</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                  <p className="text-[8px] font-black opacity-50 uppercase mb-0.5">الأستاذ المسؤول</p>
                  <p className="text-[10px] font-black truncate">{selectedTeacherName}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                  <p className="text-[8px] font-black opacity-50 uppercase mb-0.5">نسبة الانضباط</p>
                  <p className="text-xl font-black">
                     {totalRecords > 0 ? ((physicalPresenceCount / totalRecords) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown List Card */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm">
              التفصيل العددي للحالات
            </h4>
            <div className="space-y-2">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs" style={{ color: item.color }}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      {totalRecords > 0 ? ((item.value / totalRecords) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-lg font-black text-slate-900 w-8 text-center">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-3">
              <Info className="text-indigo-600 shrink-0" size={16} />
              <p className="text-[9px] font-bold text-indigo-900 leading-relaxed">
                يتم عرض الإحصائيات بناءً على كافة حصص التربية الرياضية المسجلة.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Reports;
