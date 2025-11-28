import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Calendar, Clock, Trash2, User, Phone, Ban, CheckCircle, Lock, Settings, Save, X, XCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/LoadingSkeleton';

export default function Dashboard({ session }) {
  // --- ESTADOS ---
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [takenSlots, setTakenSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState(null);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  
  const toast = useToast();
  
  // Configuración con valores por defecto
  const [config, setConfig] = useState({
    start: "09:00",
    end: "19:00",
    breakStart: "13:00",
    breakEnd: "14:00",
    duration: 60
  });

  const [isBlocking, setIsBlocking] = useState(false);
  const [selectedToBlock, setSelectedToBlock] = useState([]);
  const [dynamicSlots, setDynamicSlots] = useState([]); 

  // --- GENERADOR DE OPCIONES DE TIEMPO (00 y 30) ---
  const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(`${hour}:00`);
      options.push(`${hour}:30`);
    }
    return options;
  };
  const timeOptions = generateTimeOptions();

  // 1. Cargar Todo
  useEffect(() => {
    const loadProfileAndData = async () => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('config')
            .eq('id', session.user.id)
            .single();
        
        if (profile?.config) setConfig(profile.config);
        
        await fetchAppointments();
        await fetchTakenSlots();
        setInitialLoading(false);
    };
    loadProfileAndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, session]); 

  // 2. Generador de Slots
  useEffect(() => {
    const slots = [];
    let currentTime = new Date(`2000-01-01T${config.start}`);
    const endTime = new Date(`2000-01-01T${config.end}`);
    const breakStart = new Date(`2000-01-01T${config.breakStart}`);
    const breakEnd = new Date(`2000-01-01T${config.breakEnd}`);

    while (currentTime < endTime) {
        const timeString = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const isBreak = (currentTime >= breakStart && currentTime < breakEnd);
        if (!isBreak) slots.push(timeString);
        currentTime.setMinutes(currentTime.getMinutes() + config.duration);
    }
    setDynamicSlots(slots);
  }, [config]);

  // --- FUNCIONES DB ---

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', session.user.id)
      .eq('appointment_date', date)
      .order('appointment_time', { ascending: true });
    
    setAppointments(data || []);
  };

  const fetchTakenSlots = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('barber_id', session.user.id)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');
    if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0, 5)));
  };

  const saveSettings = async () => {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ config: config })
        .eq('id', session.user.id);
      
      if (error) {
        toast.error('Error guardando configuración');
      } else {
        toast.success('¡Horario actualizado correctamente!');
        setShowSettings(false);
      }
      setLoading(false);
  };

  // --- ACCIONES ---

  const handleSlotClick = async (time) => {
    if (isBlocking) {
        if (selectedToBlock.includes(time)) setSelectedToBlock(prev => prev.filter(t => t !== time));
        else setSelectedToBlock(prev => [...prev, time]);
        return;
    }

    // Abrir modal en lugar de prompt
    setSelectedSlotTime(time);
    setShowBookingModal(true);
  };

  const handleManualBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('appointments').insert({
      barber_id: session.user.id,
      appointment_date: date,
      appointment_time: selectedSlotTime,
      client_name: manualClientName,
      client_phone: manualClientPhone, 
      haircut_type: "General",
      status: 'scheduled'
    });
    
    if (error) {
      if (error.code === '23505') {
        toast.error('Horario ocupado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Cita creada correctamente');
      setShowBookingModal(false);
      setManualClientName('');
      setManualClientPhone('');
      fetchAppointments();
      fetchTakenSlots();
    }
    setLoading(false);
  };

  const confirmBatchBlock = async () => {
    setLoading(true);
    const updates = selectedToBlock.map(time => ({
        barber_id: session.user.id, appointment_date: date, appointment_time: time,
        client_name: "⛔ NO DISPONIBLE", haircut_type: "Bloqueo", status: 'blocked'
    }));
    const { error } = await supabase.from('appointments').upsert(updates, { onConflict: 'barber_id, appointment_date, appointment_time' });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${selectedToBlock.length} horarios bloqueados`);
      setSelectedToBlock([]);
      fetchAppointments();
      fetchTakenSlots();
    }
    setLoading(false);
  };

  const blockAllDay = async () => {
    setLoading(true);
    const updates = dynamicSlots.map(time => ({
        barber_id: session.user.id, appointment_date: date, appointment_time: time,
        client_name: "⛔ CERRADO", haircut_type: "Día Completo", status: 'blocked'
    }));
    const { error } = await supabase.from('appointments').upsert(updates, { onConflict: 'barber_id, appointment_date, appointment_time' });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Día cerrado completamente');
      fetchAppointments();
      fetchTakenSlots();
    }
    setLoading(false);
  };

  const handleCancel = async (id) => {
    setLoading(true);
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    toast.success('Cita cancelada');
    fetchAppointments();
    fetchTakenSlots();
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col min-h-[90vh]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold text-gray-900 flex items-center gap-3 flex-wrap">
              Barber-app 
              <span className="text-sm bg-gradient-to-r from-accent-from to-accent-to text-white px-3 py-1 rounded-lg font-normal shadow-md">
                ADMIN
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-2">Agenda, Administra, Crece.</p>
        </div>
        
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:border-gray-300 hover:shadow-md transition-all active:scale-95 font-semibold touch-target"
        >
            <Settings size={18} /> Configurar Horario
        </button>
      </div>

      {/* MODAL CONFIGURACIÓN */}
      {showSettings && (
          <div className="mb-8 bg-white p-6 md:p-8 rounded-2xl shadow-premium border border-gray-200 animate-slide-down">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Settings size={22}/> Configuración Base</h3>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={24}/>
                  </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Apertura</label>
                      <select value={config.start} onChange={e => setConfig({...config, start: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-semibold bg-white hover:border-gray-300 focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Cierre</label>
                      <select value={config.end} onChange={e => setConfig({...config, end: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl font-semibold bg-white hover:border-gray-300 focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border-2 border-orange-200">
                      <label className="block text-sm font-bold text-orange-800 mb-2">Inicio Almuerzo</label>
                      <select value={config.breakStart} onChange={e => setConfig({...config, breakStart: e.target.value})} className="w-full p-3 border-2 border-orange-200 rounded-xl font-semibold bg-white hover:border-orange-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border-2 border-orange-200">
                      <label className="block text-sm font-bold text-orange-800 mb-2">Fin Almuerzo</label>
                      <select value={config.breakEnd} onChange={e => setConfig({...config, breakEnd: e.target.value})} className="w-full p-3 border-2 border-orange-200 rounded-xl font-semibold bg-white hover:border-orange-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
              </div>

              <div className="mt-8 flex justify-end">
                  <button onClick={saveSettings} disabled={loading} className="bg-primary-950 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-800 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg touch-target">
                      <Save size={18} /> Guardar Configuración
                  </button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-grow">
        
        {/* IZQUIERDA: CALENDARIO */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-premium border border-gray-200 h-fit">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Disponibilidad
              </h2>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="p-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm hover:border-gray-300 focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all" 
              />
          </div>

          <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-xl">
            <button 
              onClick={() => { setIsBlocking(false); setSelectedToBlock([]); }} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all touch-target ${!isBlocking ? 'bg-white shadow-md text-black' : 'text-gray-500 hover:text-gray-700'}`}
            >
                📅 Agendar
            </button>
            <button 
              onClick={() => setIsBlocking(true)} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all touch-target ${isBlocking ? 'bg-red-100 text-red-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
                ⛔ Bloquear
            </button>
          </div>

          <div className="mb-4 text-center min-h-[48px] flex items-center justify-center">
            {isBlocking ? (
                <button 
                    onClick={blockAllDay} 
                    disabled={loading}
                    className="w-full py-2.5 bg-red-100 text-red-700 rounded-xl text-sm font-bold hover:bg-red-200 active:scale-95 border-2 border-red-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 touch-target"
                >
                    <XCircle size={16} /> CERRAR ESTE DÍA COMPLETO
                </button>
            ) : (
                <p className="text-sm text-gray-500">Selecciona una hora para agendar manualmente</p>
            )}
          </div>

          {initialLoading ? (
            <SkeletonGrid cols={3} rows={3} />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {dynamicSlots.map(slot => {
                const isTaken = takenSlots.includes(slot);
                const isSelected = selectedToBlock.includes(slot);
                return (
                  <button 
                    key={slot} 
                    disabled={isTaken || loading}
                    onClick={() => handleSlotClick(slot)}
                    className={`
                      py-3 px-2 rounded-xl text-sm font-bold transition-all border-2 relative touch-target
                      ${isTaken 
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' 
                        : isBlocking && isSelected
                          ? 'bg-red-600 text-white border-red-700 scale-95 shadow-lg' 
                          : isBlocking
                              ? 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300' 
                              : 'bg-primary-950 text-white border-primary-950 hover:bg-primary-800 hover:scale-105 shadow-md' 
                      }
                    `}
                  >
                    {slot} 
                    {isSelected && <CheckCircle size={14} className="absolute top-1 right-1 text-white" />}
                  </button>
                )
              })}
            </div>
          )}

          {dynamicSlots.length === 0 && !initialLoading && (
            <EmptyState 
              icon={Clock}
              title="No hay horarios configurados"
              description="Configura tu horario de atención para comenzar"
            />
          )}

          {isBlocking && selectedToBlock.length > 0 && (
              <button 
                onClick={confirmBatchBlock} 
                disabled={loading}
                className="w-full mt-6 py-3.5 bg-red-800 text-white rounded-xl font-bold hover:bg-red-900 active:scale-95 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 touch-target"
              >
                <Lock size={18} /> CONFIRMAR BLOQUEO ({selectedToBlock.length})
              </button>
          )}
        </div>

        {/* DERECHA: LISTADO */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-premium border border-gray-200 flex flex-col h-[600px]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Clock className="w-5 h-5" /> Agenda: {date}
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {appointments.length === 0 ? (
              <EmptyState 
                icon={Calendar}
                title="No hay citas para este día"
                description="Las citas agendadas aparecerán aquí"
              />
            ) : (
              <ul className="space-y-3">
                {appointments.map(appt => {
                    const isBlocked = appt.status === 'blocked';
                    if (appt.status === 'cancelled') return null;
                    
                    return (
                      <li key={appt.id} className="bg-gray-50 border-2 border-gray-200 p-4 rounded-xl hover:border-gray-300 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                               <span className="font-bold text-2xl text-gray-900 bg-white px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                                  {appt.appointment_time.slice(0, 5)}
                               </span>
                               {isBlocked 
                                  ? <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-red-200">
                                      <Ban size={12}/> NO DISPONIBLE
                                    </span>
                                  : <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-green-200">
                                      <CheckCircle size={12}/> CLIENTE
                                    </span>
                               }
                            </div>
                            
                            {!isBlocked && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2 text-gray-800 text-sm font-semibold">
                                    <User size={16} className="text-gray-400"/> {appt.client_name}
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                    <Phone size={16} className="text-gray-400"/> {appt.client_phone}
                                  </div>
                                </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleCancel(appt.id)} 
                            disabled={loading}
                            className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-full transition-all disabled:opacity-50 touch-target"
                            title="Cancelar cita"
                          >
                              <Trash2 size={20} />
                          </button>
                        </div>
                      </li>
                    )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE RESERVA MANUAL */}
      <Modal 
        isOpen={showBookingModal} 
        onClose={() => {
          setShowBookingModal(false);
          setManualClientName('');
          setManualClientPhone('');
        }}
        title={`Agendar cita - ${selectedSlotTime}`}
      >
        <form onSubmit={handleManualBooking} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Cliente</label>
            <input
              type="text"
              required
              value={manualClientName}
              onChange={(e) => setManualClientName(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
            <input
              type="tel"
              required
              value={manualClientPhone}
              onChange={(e) => setManualClientPhone(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all"
              placeholder="Ej: 300 123 4567"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowBookingModal(false);
                setManualClientName('');
                setManualClientPhone('');
              }}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-primary-950 text-white rounded-xl font-bold hover:bg-primary-800 active:scale-95 transition-all disabled:opacity-50 shadow-lg touch-target"
            >
              {loading ? 'Guardando...' : 'Confirmar Cita'}
            </button>
          </div>
        </form>
      </Modal>

      {/* FOOTER */}
      <footer className="mt-12 mb-6 text-center text-gray-400 text-xs space-y-1">
        <p>© 2025 Barber-app SaaS. Todos los derechos reservados.</p>
        <p>Ideada y Desarrollada por <strong className="text-gray-500">flexedwin</strong></p>
        <p className="text-gray-400">Soporte: 3166173884 | @flexedwin</p>
      </footer>
    </div>
  );
}