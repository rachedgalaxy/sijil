
import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../services/storage';
import { Student, Class, AttendanceRecord, AttendanceStatus, STATUS_LABELS, STATUS_COLORS } from '../types';
import { CheckCircle2, XCircle, Shirt, AlertCircle, Save, Users, Zap, Search } from 'lucide-react';

const AttendanceMarking: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadedClasses = storage.getClasses();
    setClasses(loadedClasses);
    if (loadedClasses.length > 0) setSelectedClassId(loadedClasses[0].id);
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      const allStudents = storage.getStudents();
      const classStudents = allStudents.filter(s => s.classId === selectedClassId);
      setStudents(classStudents);

      const allAttendance = storage.getAttendance();
      const existingToday = allAttendance.filter(a => a.classId === selectedClassId && a.date === date);
      
      const initialMap: Record<string, AttendanceStatus | undefined> = {};
      classStudents.forEach(s => {
        const record = existingToday.find(a => a.studentId === s.id);
        initialMap[s.id] = record ? record.status : undefined;
      });
      setCurrentAttendance(initialMap);
    }
  }, [selectedClassId, date]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setCurrentAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllAsPresent = () => {
    const newMap: Record<string, AttendanceStatus | undefined> = { ...currentAttendance };
    students.forEach(s => {
      if (!newMap[s.id]) newMap[s.id] = 'present';
    });
    setCurrentAttendance(newMap);
  };

  const handleSave = () => {
    const unMarkedCount = students.filter(s => !currentAttendance[s.id]).length;
    
    if (unMarkedCount > 0) {
      alert(`تنبيه: يوجد ${unMarkedCount} تلاميذ لم يتم تحديد حالتهم بعد.`);
      return;
    }

    const allAttendance = storage.getAttendance();
    const filteredAttendance = allAttendance.filter(a => !(a.classId === selectedClassId && a.date === date));
    
    const newRecords: AttendanceRecord[] = students.map(s => ({
      id: `${Date.now()}-${s.id}`,
      studentId: s.id,
      classId: selectedClassId,
      status: currentAttendance[s.id] as AttendanceStatus,
      date: date,
    }));

    storage.saveAttendance([...filteredAttendance, ...newRecords]);
    alert('تم حفظ كشف الحضور بنجاح.');
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(s => 
      s.name.includes(searchTerm) || s.id.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const markedCount = Object.values(currentAttendance).filter(v => v !== undefined).length;

  return (
    <div className="relative space-y-4 max-w-[1600px] mx-auto pb-24 font-cairo">
      {/* Header Bar - Compact & Refined with Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">القسم التربوي</label>
              <select 
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 pr-3 pl-8 font-black text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">تاريخ المناداة</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 px-3 font-black text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={markAllAsPresent}
              className="flex-1 md:flex-none bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-all border border-indigo-100 whitespace-nowrap"
            >
              <Zap size={14} /> البقية حاضر (ح)
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={14} />
          </div>
          <input 
            type="text" 
            placeholder="ابحث عن تلميذ بالاسم أو الرقم..." 
            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Grid - More Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <Users size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-slate-300 font-black text-[11px] uppercase tracking-tighter">
              {students.length === 0 ? 'يرجى إضافة تلاميذ أولاً' : 'لا توجد نتائج مطابقة للبحث'}
            </p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const status = currentAttendance[student.id];
            return (
              <div key={student.id} className={`bg-white p-3 rounded-2xl shadow-sm border transition-all ${status ? 'border-indigo-200 bg-indigo-50/5' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0">
                    <span className="text-[7px] font-black text-slate-400 bg-slate-50 px-1 py-0.5 rounded uppercase">ID: {student.id}</span>
                    <h3 className="font-black text-slate-800 text-xs leading-tight mt-0.5 truncate">{student.name}</h3>
                  </div>
                  {status ? (
                    <div className={`shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black border ${STATUS_COLORS[status]}`}>
                      {status === 'present' ? 'ح' : status === 'pe_kit' ? 'أ' : status === 'justified' ? 'ب' : 'ج'}
                    </div>
                  ) : (
                    <div className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black border border-slate-50 bg-slate-50 text-slate-300">
                      ؟
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { s: 'present', l: 'حاضر (ح)', c: 'bg-emerald-600', ic: CheckCircle2 },
                    { s: 'pe_kit', l: 'بدلة (أ)', c: 'bg-indigo-600', ic: Shirt },
                    { s: 'justified', l: 'مبرر (ب)', c: 'bg-amber-500', ic: AlertCircle },
                    { s: 'absent', l: 'غياب (ج)', c: 'bg-rose-600', ic: XCircle },
                  ].map(btn => (
                    <button 
                      key={btn.s}
                      onClick={() => handleStatusChange(student.id, btn.s as AttendanceStatus)} 
                      className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-black transition-all border ${status === btn.s ? `${btn.c} border-transparent text-white shadow-sm` : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                    >
                      <btn.ic size={10} /> {btn.l}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Save Bar - Refined */}
      {students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:right-64 bg-white/80 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl z-40 no-print">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-64 flex flex-col gap-1">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">اكتمال المناداة</span>
                <span className="text-[10px] font-black text-indigo-600">{markedCount} / {students.length}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full border border-slate-50 overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${(markedCount / (students.length || 1)) * 100}%` }}
                />
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              className={`w-full sm:w-auto px-10 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all text-xs shadow-lg ${markedCount === students.length ? 'bg-slate-900 text-white hover:bg-black active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Save size={16} /> حفظ الكشف النهائي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarking;
