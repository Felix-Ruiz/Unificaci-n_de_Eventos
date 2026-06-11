"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  ShieldCheck, UserPlus, Loader2, Edit, Trash2, X, CheckSquare, 
  Square, AlertCircle, CheckCircle2, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GestionUsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    permissions: [] as string[]
  });

  const availablePermissions = [
    { id: 'eventos', label: 'Gestión Completa de Eventos (Crear, Editar, Ver Inscritos)' },
    { id: 'asistencia', label: 'Control de Asistencia (Módulo Check-In y Escáner QR)' },
    { id: 'historico', label: 'Base de Datos Histórica Global' },
    { id: 'usuarios', label: 'Gestión de Usuarios (Admin Master)' }
  ];

  // ==========================================
  // SISTEMA NATIVO DE NOTIFICACIONES Y MODALES
  // ==========================================
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const session = localStorage.getItem('acofi-session');
    if (session) {
      const user = JSON.parse(session);
      if (user.role !== 'MASTER' && !user.permissions.includes('usuarios')) {
        window.location.replace('/admin/dashboard');
        return;
      }
    }
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) setUsers(data);
    setLoading(false);
  }

  const handleOpenModal = (userToEdit?: any) => {
    if (userToEdit) {
      setEditId(userToEdit.id);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: userToEdit.password,
        role: userToEdit.role,
        permissions: userToEdit.permissions || []
      });
    } else {
      setEditId(null);
      setFormData({ name: '', email: '', password: '', role: 'STAFF', permissions: [] });
    }
    setShowModal(true);
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      if (prev.permissions.includes(permId)) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] };
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const finalPermissions = formData.role === 'MASTER' ? ['all'] : formData.permissions;

      if (editId) {
        const { error } = await supabase
          .from('system_users')
          .update({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            permissions: finalPermissions
          })
          .eq('id', editId);
        if (error) throw error;
        showToast('Usuario Actualizado', `El perfil de ${formData.name} ha sido modificado.`, 'success');
      } else {
        const { error } = await supabase
          .from('system_users')
          .insert([{
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            permissions: finalPermissions
          }]);
        if (error) throw error;
        showToast('Usuario Creado', `El usuario ${formData.name} ya tiene acceso al sistema.`, 'success');
      }
      
      setShowModal(false);
      loadUsers();
      
    } catch (error: any) {
      showToast('Error al Guardar', 'Verifica los datos. Es posible que el correo ya esté registrado en el sistema.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setConfirmModal({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    
    try {
      const { error } = await supabase.from('system_users').delete().eq('id', confirmModal.id);
      if (error) throw error;
      
      showToast('Acceso Revocado', `El usuario ${confirmModal.name} fue eliminado correctamente.`, 'success');
      loadUsers();
    } catch (error: any) {
      showToast('Error', 'Hubo un problema al intentar eliminar este usuario.', 'error');
    } finally {
      setConfirmModal(null);
    }
  };

  if (loading && !confirmModal) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 relative">
      
      {/* ========================================================= */}
      {/* CONTENEDOR DE NOTIFICACIONES TOAST                        */}
      {/* ========================================================= */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/30' : 
                toast.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 
                'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              {toast.type === 'error' && <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />}
              {toast.type === 'info' && <Info className="h-6 w-6 text-blue-400 shrink-0" />}
              
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-300 leading-snug">{toast.desc}</p>
              </div>
              
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL 4D DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h2 className="text-2xl font-bold text-white mb-3">Revocar Acceso</h2>
              <p className="text-gray-300 mb-8">
                ¿Estás seguro de eliminar permanentemente al usuario <strong>{confirmModal.name}</strong>? Esta persona perderá acceso inmediato a la plataforma.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium">Cancelar</button>
                <button 
                  onClick={confirmDelete} 
                  className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 transition-transform active:scale-95 shadow-4d-static"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Control de Personal
          </h1>
          <p className="text-gray-400">Administra los roles y permisos de acceso para tu equipo.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-4d-static transition-transform active:translate-y-1 active:shadow-none"
        >
          <UserPlus className="h-5 w-5" /> Nuevo Usuario
        </button>
      </header>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap min-w-150">
          <thead className="bg-black/30 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-4 font-bold">Nombre del Staff</th>
              <th className="px-6 py-4 font-bold">Correo (Usuario)</th>
              <th className="px-6 py-4 font-bold">Rol</th>
              <th className="px-6 py-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{u.name}</td>
                <td className="px-6 py-4 text-gray-400">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border ${
                    u.role === 'MASTER' 
                      ? 'bg-primary/20 text-primary border-primary/30' 
                      : 'bg-accent/10 text-accent border-accent/20'
                  }`}>
                    {u.role}
                  </span>
                </td>
                
                <td className="px-6 py-4 flex justify-end gap-2">
                  <button 
                    onClick={() => handleOpenModal(u)} 
                    className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
                    title="Editar Permisos"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(u.id, u.name)} 
                    className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition-colors border border-red-500/20"
                    title="Eliminar Acceso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="bg-surface border border-white/10 rounded-3xl w-full max-w-lg p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary to-accent"></div>
              
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-6 w-6"/>
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary"/> 
                {editId ? 'Editar Accesos' : 'Crear Perfil de Usuario'}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Nombre</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full bg-black/50 border border-gray-700 text-white rounded-xl p-3 outline-none focus:border-primary transition-colors" 
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Nivel de Rol</label>
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})} 
                      className="w-full bg-black/50 border border-gray-700 text-white rounded-xl p-3 outline-none focus:border-primary cursor-pointer appearance-none"
                    >
                      <option value="STAFF">Equipo Staff</option>
                      <option value="MASTER">Administrador Master</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Correo de Acceso</label>
                    <input 
                      type="email" 
                      required 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      className="w-full bg-black/50 border border-gray-700 text-white rounded-xl p-3 outline-none focus:border-primary" 
                      placeholder="usuario@acofi.co"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Contraseña</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      className="w-full bg-black/50 border border-gray-700 text-white rounded-xl p-3 outline-none focus:border-primary" 
                      placeholder="Establecer clave"
                    />
                  </div>
                </div>

                {formData.role === 'STAFF' && (
                  <div className="pt-4 border-t border-white/5">
                    <label className="block text-xs font-bold uppercase text-primary mb-3">Permisos Específicos</label>
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {availablePermissions.map((perm: any) => {
                        const isChecked = formData.permissions.includes(perm.id);
                        return (
                          <div 
                            key={perm.id} 
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isChecked ? 'bg-primary/10 border-primary/30' : 'bg-black/30 border-gray-800 hover:border-gray-600'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="h-5 w-5 text-primary shrink-0"/> : <Square className="h-5 w-5 text-gray-600 shrink-0"/>}
                            <span className={`text-sm ${isChecked ? 'text-white' : 'text-gray-400'} leading-tight`}>{perm.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-4d-static active:translate-y-1 active:shadow-none transition-transform disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : 'Guardar Usuario'}
                  </button>
                </div>
              </form>
              
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}