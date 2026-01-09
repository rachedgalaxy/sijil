
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Student, Class } from '../types';
import { Trash2, Edit2, UserPlus, Search, FileSpreadsheet, User, X, AlertOctagon, UserCheck, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  
  const [securityCode, setSecurityCode] = useState('');
  const SECURITY_PIN = '6723';

  const [newStudent, setNewStudent] = useState({ id: '', name: '', classId: '' });

  useEffect(() => {
    const loadedStudents = storage.getStudents();
    const loadedClasses = storage.getClasses();
    setStudents(loadedStudents);
    setClasses(loadedClasses);
    if (loadedClasses.length > 0) {
      setNewStudent(prev => ({ ...prev, classId: loadedClasses[0].id }));
    }
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.id || !newStudent.name || !newStudent.classId) return;
    
    if (students.find(s => String(s.id) === String(newStudent.id))) {
      alert('هذا الرقم موجود مسبقاً لتلميذ آخر');
      return;
    }

    const updated = [...students, { ...newStudent }];
    setStudents(updated);
    storage.saveStudents(updated);
    setNewStudent({ ...newStudent, id: '', name: '' });
    setIsAdding(false);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updated = students.map(s => String(s.id) === String(editingStudent.id) ? editingStudent : s);
    setStudents(updated);
    storage.saveStudents(updated);
    setEditingStudent(null);
  };

  const handleConfirmDelete = () => {
    if (securityCode !== SECURITY_PIN || !pendingDelete) return;

    const updated = students.filter(s => String(s.id) !== String(pendingDelete.id));
    setStudents(updated);
    storage.saveStudents(updated);
    
    const allAttendance = storage.getAttendance();
    storage.saveAttendance(allAttendance.filter(a => String(a.studentId) !== String(pendingDelete.id)));

    setPendingDelete(null);
    setSecurityCode('');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        const importedStudents: Student[] = data.map(row => {
          const id = String(row['رقم التعريف'] || row['ID'] || row['رقم التسجيل'] || row['id']);
          let fullName = '';
          if (row['اللقب'] && row['الاسم']) {
            fullName = `${row['اللقب']} ${row['الاسم']}`;
          } else {
            fullName = String(row['الاسم الكامل'] || row['الاسم'] || row['Name'] || row['name']);
          }

          return {
            id: id.trim(),
            name: fullName.trim(),
            classId: newStudent.classId, 
          };
        }).filter(s => s.id && s.id !== "undefined" && s.name && s.name !== "undefined");

        if (importedStudents.length === 0) {
          alert('لم يتم العثور على بيانات صالحة في الملف.');
          return;
        }

        const currentStudents = storage.getStudents();
        const updated = [...currentStudents, ...importedStudents];
        const uniqueUpdated = Array.from(new Map(updated.map(item => [item.id, item])).values());
        
        setStudents(uniqueUpdated);
        storage.saveStudents(uniqueUpdated);
        alert(`تم استيراد ${importedStudents.length} تلاميذ بنجاح.`);
      } catch (err) {
        alert('خطأ في قراءة الملف.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filtered = students.filter(s => 
    s.name.includes(searchTerm) || s.id.includes(searchTerm)
  );

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-16 font-cairo">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <UserPlus size={16} /> تلميذ جديد
          </button>
          <label className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 hover:border-green-400 transition-all group">
            <FileSpreadsheet size={16} className="text-green-600 group-hover:scale-110 transition-transform" /> استيراد قائمة مسار
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} />
          </label>
        </div>

        <div className="relative w-full lg:max-w-md">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={15} />
          </div>
          <input 
            type="text" 
            placeholder="ابحث برقم التعريف أو الاسم..." 
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white font-bold text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[9px] uppercase tracking-widest">رقم التعريف</th>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[9px] uppercase tracking-widest">الاسم واللقب</th>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[9px] uppercase tracking-widest">القسم</th>
                <th className="px-6 py-3.5 text-slate-400 font-black text-[9px] uppercase tracking-widest text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                       <User size={40} />
                       <p className="font-black text-[10px] uppercase tracking-widest">لا توجد بيانات متاحة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 font-mono font-black text-[10px]">{student.id}</td>
                    <td className="px-6 py-3 text-slate-900 font-black text-xs">{student.name}</td>
                    <td className="px-6 py-3">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-blue-100">
                        {classes.find(c => String(c.id) === String(student.classId))?.name || 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => setEditingStudent(student)}
                          className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setPendingDelete(student)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">إضافة تلميذ جديد</h3>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase tracking-widest">رقم التعريف</label>
                <input 
                  type="text" 
                  className="w-full border-slate-200 bg-slate-50 rounded-xl py-2 px-3 font-mono font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600" 
                  value={newStudent.id} 
                  onChange={e => setNewStudent({...newStudent, id: e.target.value})} 
                  placeholder="مثال: 123456" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase tracking-widest">الاسم الكامل</label>
                <input 
                  type="text" 
                  className="w-full border-slate-200 bg-slate-50 rounded-xl py-2 px-3 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600" 
                  value={newStudent.name} 
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})} 
                  placeholder="اللقب والاسم" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase tracking-widest">اختيار القسم</label>
                <div className="relative">
                  <select 
                    className="w-full border-slate-200 bg-slate-50 rounded-xl py-2 pr-3 pl-8 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer" 
                    value={newStudent.classId} 
                    onChange={e => setNewStudent({...newStudent, classId: e.target.value})} 
                    required
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-all">
                  حفظ التلميذ في القائمة
                </button>
                <button type="button" onClick={() => setIsAdding(false)} className="w-full py-2 text-slate-400 font-black text-[10px]">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-indigo-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">تعديل بيانات التلميذ</h3>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase tracking-widest opacity-60">رقم التعريف (ثابت)</label>
                <input 
                  type="text" 
                  disabled
                  className="w-full border-slate-100 bg-slate-50 rounded-xl py-2 px-3 font-mono font-black text-xs text-slate-400 cursor-not-allowed" 
                  value={editingStudent.id} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase tracking-widest">الاسم الكامل</label>
                <input 
                  type="text" 
                  className="w-full border-slate-200 bg-white rounded-xl py-2 px-3 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 border shadow-inner" 
                  value={editingStudent.name} 
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} 
                  placeholder="تعديل الاسم" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase tracking-widest">تغيير القسم</label>
                <div className="relative">
                  <select 
                    className="w-full border-slate-200 bg-white rounded-xl py-2 pr-3 pl-8 font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer border shadow-inner" 
                    value={editingStudent.classId} 
                    onChange={e => setEditingStudent({...editingStudent, classId: e.target.value})} 
                    required
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  <UserCheck size={16} /> حفظ التعديلات
                </button>
                <button type="button" onClick={() => setEditingStudent(null)} className="w-full py-2 text-slate-400 font-black text-[10px]">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Delete Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-t-8 border-red-600 animate-in zoom-in-95">
            <div className="flex justify-center">
              <div className="p-3.5 bg-red-50 rounded-full text-red-600"><AlertOctagon size={40} /></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900">حذف نهائي</h3>
              <p className="text-slate-500 font-bold text-[11px] mt-2 leading-relaxed">
                هل أنت متأكد من حذف التلميذ <span className="text-red-600 font-black">"{pendingDelete.name}"</span>؟ 
                <br /> سيتم مسح كافة سجلات الحضور الخاصة به.
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">أدخل الرمز (6723) للمتابعة:</label>
              <input 
                type="text" 
                maxLength={4} 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 text-center font-black text-2xl tracking-[0.5em] text-slate-900 focus:border-red-600 focus:bg-white outline-none transition-all" 
                value={securityCode} 
                onChange={e => setSecurityCode(e.target.value)} 
                autoFocus 
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button 
                onClick={handleConfirmDelete} 
                disabled={securityCode !== SECURITY_PIN} 
                className="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-[11px] shadow-lg disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> تأكيد الحذف
              </button>
              <button onClick={() => { setPendingDelete(null); setSecurityCode(''); }} className="w-full text-slate-400 py-1 font-black text-[10px]">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
