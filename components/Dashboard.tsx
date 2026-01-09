
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { AttendanceRecord, Student, Class } from '../types';
import { Users, UserX, UserCheck, School, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    presentToday: 0,
    absentToday: 0,
    justifiedToday: 0,
    peKitToday: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const students = storage.getStudents();
    const classes = storage.getClasses();
    const attendance = storage.getAttendance();
    const today = new Date().toISOString().split('T')[0];
    
    const todayRecords = attendance.filter(a => a.date === today);
    
    setStats({
      totalStudents: students.length,
      totalClasses: classes.length,
      presentToday: todayRecords.filter(r => r.status === 'present').length,
      peKitToday: todayRecords.filter(r => r.status === 'pe_kit').length,
      justifiedToday: todayRecords.filter(r => r.status === 'justified').length,
      absentToday: todayRecords.filter(r => r.status === 'absent').length
    });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const records = attendance.filter(a => a.date === dateStr);
      
      const dayName = new Date(dateStr).toLocaleDateString('ar-u-nu-latn', { weekday: 'narrow' });

      return {
        date: dayName,
        'ح': records.filter(r => r.status === 'present').length,
        'أ': records.filter(r => r.status === 'pe_kit').length,
        'ب': records.filter(r => r.status === 'justified').length,
        'ج': records.filter(r => r.status === 'absent').length
      };
    }).reverse();

    setChartData(last7Days);
  }, []);

  const metricCards = [
    { label: 'إجمالي التلاميذ', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'حاضر (ح)', value: stats.presentToday, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'بدون بدلة (أ)', value: stats.peKitToday, icon: School, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'مبرر (ب)', value: stats.justifiedToday, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'غياب (ج)', value: stats.absentToday, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6 font-cairo">
      {/* Metrics Grid - Smaller Paddings and Fonts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className={`${card.bg} ${card.color} p-2 rounded-lg`}><card.icon size={16} /></div>
              <span className="text-slate-400 text-[8px] font-black">اليوم</span>
            </div>
            <h3 className="text-slate-500 text-[9px] font-black mb-0.5 uppercase tracking-tight">{card.label}</h3>
            <p className="text-xl font-black text-slate-800 leading-none">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Enhanced Precision and Text-only Legend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="text-indigo-600" size={16} /> التحليل التفصيلي للحالات الأربع
            </h3>
            <div className="flex gap-3">
               <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">ح</span>
               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">أ</span>
               <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded">ب</span>
               <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">ج</span>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontStyle: 'normal', fontWeight: '900', fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '700'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Cairo', fontSize: '10px', fontWeight: 'bold' }} 
                />
                {/* Custom Legend without colored circles */}
                <Legend 
                  iconSize={0} 
                  verticalAlign="bottom" 
                  height={30}
                  formatter={(value) => {
                    const colors: any = { 'ح': 'text-emerald-600', 'أ': 'text-indigo-600', 'ب': 'text-amber-600', 'ج': 'text-rose-600' };
                    return <span className={`font-black text-[10px] px-3 ${colors[value] || 'text-slate-600'}`}>{value}</span>;
                  }}
                  wrapperStyle={{ paddingTop: '15px' }} 
                />
                <Bar dataKey="ح" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="أ" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ب" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ج" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend Panel - More Compact with Consistent Icons */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-sm font-black text-slate-800 mb-4 border-b pb-2">دليل الرموز اليومي</h3>
          
          <div className="flex-1 space-y-2">
            {[
              { letter: 'ح', label: 'حاضر', desc: 'ببدلته الرياضية', color: 'bg-emerald-600', hover: 'hover:bg-emerald-50', text: 'text-emerald-600', val: stats.presentToday },
              { letter: 'أ', label: 'بدون بدلة', desc: 'يعتبر حاضراً دراسياً', color: 'bg-indigo-600', hover: 'hover:bg-indigo-50', text: 'text-indigo-600', val: stats.peKitToday },
              { letter: 'ب', label: 'مبرر', desc: 'غياب بعذر مقبول', color: 'bg-amber-500', hover: 'hover:bg-amber-50', text: 'text-amber-600', val: stats.justifiedToday },
              { letter: 'ج', label: 'غياب', desc: 'غياب غير مبرر', color: 'bg-rose-600', hover: 'hover:bg-rose-50', text: 'text-rose-600', val: stats.absentToday },
            ].map((item, idx) => (
              <div key={idx} className={`p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between group ${item.hover} transition-all`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 ${item.color} text-white rounded-lg flex items-center justify-center text-xs font-black`}>{item.letter}</div>
                  <div>
                    <p className="text-xs font-black text-slate-700 leading-tight">{item.label}</p>
                    <p className="text-[8px] text-slate-400 font-bold">{item.desc}</p>
                  </div>
                </div>
                <span className={`text-lg font-black ${item.text}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
