import React, { useState } from 'react';
import { User, UserRole, PlayerCategory } from '../types';
import { Mail, Plus, User as UserIcon, Shield, Pencil, Trash2, X, Save } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState = {
    name: '',
    username: '',
    password: '',
    email: '',
    role: 'PLAYER' as UserRole,
    category: 'ADULTO' as PlayerCategory,
    weight: 6
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const startAdding = () => {
      setEditingId(null);
      setFormData(initialFormState);
      setIsFormOpen(true);
  };

  const startEditing = (user: User) => {
      setEditingId(user.id);
      setFormData({
          name: user.name,
          username: user.username,
          password: user.password || '',
          email: user.email,
          role: user.role,
          category: user.category,
          weight: user.weight
      });
      setIsFormOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
      if(window.confirm(`Sei sicuro di voler eliminare l'atleta ${name}? Verranno eliminate anche tutte le sue partite.`)) {
          onDeleteUser(id);
      }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cat = e.target.value as PlayerCategory;
      let w = 6;
      if (cat === 'RAGAZZO') w = 2;
      if (cat === 'GIOVANE') w = 4;
      setFormData({ ...formData, category: cat, weight: w });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        // Update existing
        const existingUser = users.find(u => u.id === editingId);
        const updatedUser: User = {
            id: editingId,
            teamId: existingUser?.teamId, // Preserve teamId if exists
            ...formData,
            avatar: existingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`
        };
        onUpdateUser(updatedUser);
    } else {
        // Create new
        const newUser: Omit<User, 'id'> = {
            ...formData,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`
        };
        onAddUser(newUser);
        alert(`📧 EMAIL INVIATA A: ${formData.email}\n\nCredenziali:\nUser: ${formData.username}\nPass: ${formData.password}`);
    }

    setIsFormOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Gestione Database Utenti</h2>
            <button 
                onClick={startAdding}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
                <Plus size={18} />
                Nuovo Atleta
            </button>
       </div>

       {isFormOpen && (
           <div className="mb-6 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-blue-200 animate-fade-in shadow-lg relative">
               <button 
                   onClick={() => setIsFormOpen(false)} 
                   className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
               >
                   <X size={20} />
               </button>
               <h3 className="text-lg font-bold mb-4 text-blue-900">
                   {editingId ? 'Modifica Atleta' : 'Crea Nuovo Atleta'}
               </h3>
               <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo</label>
                       <input required className="w-full p-2 rounded border border-gray-300" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                       <input required type="email" className="w-full p-2 rounded border border-gray-300" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Username</label>
                       <input required className="w-full p-2 rounded border border-gray-300" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                       <input required className="w-full p-2 rounded border border-gray-300" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Ruolo</label>
                       <select className="w-full p-2 rounded border border-gray-300" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                           <option value="PLAYER">Giocatore</option>
                           <option value="MASTER">Master Admin</option>
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria (Peso)</label>
                       <select className="w-full p-2 rounded border border-gray-300" value={formData.category} onChange={handleCategoryChange}>
                           <option value="RAGAZZO">RAGAZZO (2)</option>
                           <option value="GIOVANE">GIOVANE (4)</option>
                           <option value="ADULTO">ADULTO (6)</option>
                       </select>
                   </div>
                   
                   <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                       <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annulla</button>
                       <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-medium shadow-md">
                           {editingId ? <Save size={16} /> : <Mail size={16} />} 
                           {editingId ? 'Salva Modifiche' : 'Crea e Invia'}
                       </button>
                   </div>
               </form>
           </div>
       )}

       <div className="flex-1 overflow-y-auto bg-white/40 rounded-xl border border-white/30 shadow-inner">
           <table className="w-full text-left">
               <thead className="bg-gray-50/90 text-gray-600 uppercase text-xs sticky top-0 backdrop-blur-sm z-10">
                   <tr>
                       <th className="px-6 py-3">Atleta</th>
                       <th className="px-6 py-3">Username</th>
                       <th className="px-6 py-3 hidden md:table-cell">Email</th>
                       <th className="px-6 py-3">Ruolo</th>
                       <th className="px-6 py-3 text-right">Azioni</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                   {users.map(u => (
                       <tr key={u.id} className="hover:bg-white/60 transition-colors group">
                           <td className="px-6 py-4 flex items-center gap-3">
                               <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full shadow-sm border border-white" />
                               <div className="flex flex-col">
                                   <span className="font-medium text-gray-900">{u.name}</span>
                                   <span className="text-[10px] text-gray-500">{u.category} (w:{u.weight})</span>
                               </div>
                           </td>
                           <td className="px-6 py-4 text-gray-600 font-mono text-sm">{u.username}</td>
                           <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{u.email}</td>
                           <td className="px-6 py-4">
                               {u.role === 'MASTER' ? (
                                   <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
                                       <Shield size={12} /> MASTER
                                   </span>
                               ) : (
                                   <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                                       <UserIcon size={12} /> PLAYER
                                   </span>
                               )}
                           </td>
                           <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                      onClick={() => startEditing(u)}
                                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                                      title="Modifica"
                                    >
                                       <Pencil size={16} />
                                   </button>
                                   {u.role !== 'MASTER' && (
                                       <button 
                                          onClick={() => handleDelete(u.id, u.name)}
                                          className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                                          title="Elimina"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   )}
                               </div>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>
    </div>
  );
};