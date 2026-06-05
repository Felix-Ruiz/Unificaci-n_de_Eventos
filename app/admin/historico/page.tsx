"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit, FileSpreadsheet, Loader2, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';

interface HistoricUser {
  email: string;
  documento_identidad: string;
  nombre: string;
  apellido: string;
  genero: string;
  direccion: string;
  telefono: string;
  institucion: string;
  cargo: string;
  ciudad: string;
  pais: string;
}

export default function HistoricoPage() {
  const [users, setUsers] = useState<HistoricUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingUser, setEditingUser] = useState<HistoricUser | null>(null);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);

  // Efecto principal para la paginación y búsqueda
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 400); // Pequeño retraso para no saturar la base de datos mientras escribes en el buscador

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentPage, itemsPerPage]);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Configuramos la consulta contando el total real
    let query = supabase
      .from('historic_users')
      .select('*', { count: 'exact' });

    // Búsqueda del lado del servidor
    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,documento_identidad.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Paginación del lado del servidor
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setUsers(data);
      if (count !== null) setTotalUsers(count);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert("El archivo Excel no tiene registros.");
          setUploading(false);
          return;
        }

        const mappedUsers: HistoricUser[] = data.map(row => {
          const rawDoc = String(row['Documento de identidad'] || row['Documento'] || '').replace(/\.0$/, '').trim();
          const rawTel = String(row['Teléfono'] || '').replace(/\.0$/, '').trim();
          
          return {
            email: row['Correo Electronico'] ? String(row['Correo Electronico']).trim().toLowerCase() : '',
            documento_identidad: rawDoc,
            nombre: row['Nombre'] ? String(row['Nombre']).trim() : '',
            apellido: row['Apellido'] ? String(row['Apellido']).trim() : '',
            genero: row['Género'] ? String(row['Género']).trim() : '',
            direccion: row['Dirección'] ? String(row['Dirección']).trim() : '',
            telefono: rawTel,
            institucion: row['Institución'] ? String(row['Institución']).trim() : '',
            cargo: row['Cargo'] ? String(row['Cargo']).trim() : '',
            ciudad: row['Ciudad'] ? String(row['Ciudad']).trim() : '',
            pais: row['País'] ? String(row['País']).trim() : '',
          };
        }).filter(u => u.documento_identidad);

        if (mappedUsers.length === 0) {
          alert("No se encontraron registros válidos con Documento de Identidad.");
          setUploading(false);
          return;
        }

        const uniqueUsersMap = new Map<string, HistoricUser>();
        mappedUsers.forEach(user => {
          uniqueUsersMap.set(user.documento_identidad, user);
        });
        const finalUsers = Array.from(uniqueUsersMap.values());

        const chunkSize = 100;
        for (let i = 0; i < finalUsers.length; i += chunkSize) {
          const chunk = finalUsers.slice(i, i + chunkSize);
          
          const { error } = await supabase
            .from('historic_users')
            .upsert(chunk, { onConflict: 'documento_identidad' });
          
          if (error) {
            console.error("Error detallado en base de datos:", error);
            throw new Error(`Error en base de datos: ${error.message}`);
          }
          
          setUploadProgress(Math.round(((i + chunk.length) / finalUsers.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        await fetchUsers();
      } catch (error: any) {
        console.error("Error procesando Excel:", error);
        alert(`Hubo un error procesando el archivo: ${error.message || 'Error desconocido'}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const { error } = await supabase
      .from('historic_users')
      .update(editingUser)
      .eq('documento_identidad', editingUser.documento_identidad);

    if (!error) {
      await fetchUsers(); // Refrescamos la página actual
      setEditingUser(null);
    } else {
      alert("Error al actualizar el usuario");
    }
  };

  const handleDeleteUser = async (documento_identidad: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este usuario histórico? Esta acción no se puede deshacer.")) {
      const { error } = await supabase
        .from('historic_users')
        .delete()
        .eq('documento_identidad', documento_identidad);

      if (!error) {
        await fetchUsers();
      } else {
        alert("Hubo un error al intentar eliminar el usuario.");
      }
    }
  };

  // Cálculos para paginación
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  return (
    <div className="space-y-8 relative">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Base Histórica de Usuarios</h1>
          <p className="text-gray-400">Gestiona y localiza a los participantes de eventos anteriores.</p>
        </div>
        
        <div className="relative">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload} 
            className="hidden" 
            id="excel-upload"
            disabled={uploading}
          />
          <label 
            htmlFor="excel-upload"
            className={`bg-primary text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform shadow-4d-static ${uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/90 active:translate-y-1 active:shadow-none'}`}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
            {uploading ? `Procesando... ${uploadProgress}%` : 'Cargar Histórico'}
          </label>
        </div>
      </header>

      {/* Controles de búsqueda y filtros por página */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full md:w-2/3">
          <Search className="text-gray-400 h-5 w-5 ml-2" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, documento o correo..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Resetea a la página 1 al buscar
            }}
            className="bg-transparent border-none text-white w-full focus:outline-none focus:ring-0 placeholder-gray-600"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 w-full md:w-auto justify-end">
          <span>Mostrar:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-black/50 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:border-accent"
          >
            <option value={20}>20 registros</option>
            <option value={50}>50 registros</option>
            <option value={100}>100 registros</option>
          </select>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {/* Diseño de tabla ajustado para evitar saltos de línea extraños */}
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/50 text-xs uppercase text-gray-500 whitespace-nowrap">
              <tr>
                <th className="px-6 py-4 font-medium w-32">Documento</th>
                <th className="px-6 py-4 font-medium w-64">Participante</th>
                <th className="px-6 py-4 font-medium w-56">Contacto</th>
                <th className="px-6 py-4 font-medium max-w-xs">Institución / Cargo</th>
                <th className="px-6 py-4 font-medium w-48">Ubicación</th>
                <th className="px-6 py-4 font-medium text-right sticky right-0 bg-black/50 z-10 w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No se encontraron registros en esta página.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    key={user.documento_identidad} 
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-accent whitespace-nowrap">{user.documento_identidad}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white truncate max-w-250px" title={`${user.nombre} ${user.apellido}`}>
                        {user.nombre} {user.apellido}
                      </div>
                      <div className="text-xs text-gray-500">{user.genero || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 truncate max-w-200px" title={user.email}>{user.email || '-'}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{user.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate max-w-200px" title={user.institucion}>{user.institucion || '-'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-200px" title={user.cargo}>{user.cargo || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate max-w-150px">{user.ciudad ? `${user.ciudad}, ${user.pais}` : '-'}</div>
                    </td>
                    {/* Botones fijados a la derecha */}
                    <td className="px-6 py-4 text-right sticky right-0 bg-surface z-10 border-l border-white/5 whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.documento_identidad)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t border-white/5 p-4 flex items-center justify-between bg-black/30">
          <p className="text-sm text-gray-400">
            Mostrando <span className="font-medium text-white">{users.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> a <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, totalUsers)}</span> de <span className="font-medium text-white">{totalUsers}</span> resultados
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-white/10 rounded-2xl p-8 w-full max-w-3xl shadow-2xl my-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Editar Perfil del Usuario</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Nombre</label>
                  <input type="text" value={editingUser.nombre} onChange={e => setEditingUser({...editingUser, nombre: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Apellido</label>
                  <input type="text" value={editingUser.apellido} onChange={e => setEditingUser({...editingUser, apellido: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Documento de Identidad (Llave Única)</label>
                  <input type="text" value={editingUser.documento_identidad} disabled className="w-full bg-black/30 border border-gray-800 rounded-lg py-2.5 px-3 text-gray-500 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Correo Electrónico</label>
                  <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Género</label>
                  <input type="text" value={editingUser.genero} onChange={e => setEditingUser({...editingUser, genero: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Teléfono</label>
                  <input type="text" value={editingUser.telefono} onChange={e => setEditingUser({...editingUser, telefono: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Dirección</label>
                <input type="text" value={editingUser.direccion} onChange={e => setEditingUser({...editingUser, direccion: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Institución</label>
                  <input type="text" value={editingUser.institucion} onChange={e => setEditingUser({...editingUser, institucion: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cargo</label>
                  <input type="text" value={editingUser.cargo} onChange={e => setEditingUser({...editingUser, cargo: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ciudad</label>
                  <input type="text" value={editingUser.ciudad} onChange={e => setEditingUser({...editingUser, ciudad: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">País</label>
                  <input type="text" value={editingUser.pais} onChange={e => setEditingUser({...editingUser, pais: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-accent text-black font-bold py-4 rounded-lg shadow-4d-static transition-transform active:translate-y-1 active:shadow-none hover:bg-accent/90 text-lg tracking-wide">
                  Guardar Todos Los Cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}