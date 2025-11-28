import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Calendar, Clock, Trash2, User, Phone, Ban, CheckCircle, Lock, Settings, Save, X, XCircle } from 'lucide-react';

export default function Dashboard({ session }) {
  // --- ESTADOS ---
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [takenSlots, setTakenSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
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
        
        fetchAppointments();
        fetchTakenSlots();
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
      
      if (error) alert("Error guardando configuración");
      else {
          alert("¡Horario actualizado!");
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

    const nameToSave = prompt(`Cliente para las ${time}:`);
    if (!nameToSave) return;

    setLoading(true);
    const { error } = await supabase.from('appointments').insert({
      barber_id: session.user.id,
      appointment_date: date,
      appointment_time: time,
      client_name: nameToSave,
      client_phone: "Manual", 
      haircut_type: "General",
      status: 'scheduled'
    });
    handleResponse(error, "Cita creada.");
  };

  const confirmBatchBlock = async () => {
    if (!window.confirm(`¿Bloquear ${selectedToBlock.length} horas?`)) return;
    setLoading(true);
    const updates = selectedToBlock.map(time => ({
        barber_id: session.user.id, appointment_date: date, appointment_time: time,
        client_name: "⛔ NO DISPONIBLE", haircut_type: "Bloqueo", status: 'blocked'
    }));
    const { error } = await supabase.from('appointments').upsert(updates, { onConflict: 'barber_id, appointment_date, appointment_time' });
    handleResponse(error, "Bloqueo exitoso.");
    setSelectedToBlock([]);
  };

  const blockAllDay = async () => {
    if(!window.confirm(`⚠️ ¿CERRAR TODO el día ${date}?`)) return;
    setLoading(true);
    const updates = dynamicSlots.map(time => ({
        barber_id: session.user.id, appointment_date: date, appointment_time: time,
        client_name: "⛔ CERRADO", haircut_type: "Día Completo", status: 'blocked'
    }));
    const { error } = await supabase.from('appointments').upsert(updates, { onConflict: 'barber_id, appointment_date, appointment_time' });
    handleResponse(error, "Día cerrado.");
  };

  const handleResponse = (error, msg) => {
    setLoading(false);
    if (error) error.code === '23505' ? alert("Horario ocupado.") : alert(error.message);
    else { alert(msg); fetchAppointments(); fetchTakenSlots(); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Liberar espacio?")) return;
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    fetchAppointments();
    fetchTakenSlots();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col min-h-[90vh]">
      
      {/* HEADER CON NUEVO NOMBRE */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            Barber-app <span className="text-sm bg-black text-white px-2 py-1 rounded font-normal">ADMIN</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">Agenda, Administra, Crece.</p>
        </div>
        
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
        >
            <Settings size={18} /> Configurar Horario
        </button>
      </div>

      {/* --- MODAL CONFIGURACIÓN --- */}
      {showSettings && (
          <div className="mb-8 bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Settings size={20}/> Configuración Base</h3>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Apertura</label>
                      <select value={config.start} onChange={e => setConfig({...config, start: e.target.value})} className="w-full p-2 border rounded-lg font-bold bg-white">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Cierre</label>
                      <select value={config.end} onChange={e => setConfig({...config, end: e.target.value})} className="w-full p-2 border rounded-lg font-bold bg-white">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <label className="block text-sm font-bold text-orange-800 mb-1">Inicio Almuerzo</label>
                      <select value={config.breakStart} onChange={e => setConfig({...config, breakStart: e.target.value})} className="w-full p-2 border rounded-lg font-bold bg-white">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <label className="block text-sm font-bold text-orange-800 mb-1">Fin Almuerzo</label>
                      <select value={config.breakEnd} onChange={e => setConfig({...config, breakEnd: e.target.value})} className="w-full p-2 border rounded-lg font-bold bg-white">
                          {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
              </div>

              <div className="mt-6 flex justify-end">
                  <button onClick={saveSettings} disabled={loading} className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-green-600 transition flex items-center gap-2">
                      <Save size={18} /> Guardar
                  </button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        
        {/* IZQUIERDA: CALENDARIO */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5" /> Disponibilidad</h2>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg font-bold text-sm" />
          </div>

          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => { setIsBlocking(false); setSelectedToBlock([]); }} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${!isBlocking ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                📅 Agendar
            </button>
            <button onClick={() => setIsBlocking(true)} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${isBlocking ? 'bg-red-100 text-red-600 shadow' : 'text-gray-500'}`}>
                ⛔ Bloquear Horas / Día
            </button>
          </div>

          <div className="mb-4 text-center min-h-[40px]">
            {isBlocking ? (
                <button 
                    onClick={blockAllDay} 
                    className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 border border-red-200 flex items-center justify-center gap-2 transition"
                >
                    <XCircle size={14} /> CERRAR ESTE DÍA COMPLETO
                </button>
            ) : (
                <p className="text-xs text-gray-400 pt-2">Selecciona una hora para agendar manualmente.</p>
            )}
          </div>

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
                    py-3 px-1 rounded-lg text-sm font-bold transition-all border relative
                    ${isTaken 
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' 
                      : isBlocking && isSelected
                        ? 'bg-red-600 text-white border-red-700 scale-95' 
                        : isBlocking
                            ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' 
                            : 'bg-black text-white border-black hover:bg-gray-800' 
                    }
                  `}
                >
                  {slot} 
                  {isSelected && <CheckCircle size={14} className="absolute top-1 right-1 text-white" />}
                </button>
              )
            })}
          </div>

          {dynamicSlots.length === 0 && <p className="text-center text-gray-400 py-10">No hay horarios configurados.</p>}

          {isBlocking && selectedToBlock.length > 0 && (
              <button onClick={confirmBatchBlock} className="w-full mt-6 py-3 bg-red-800 text-white rounded-xl font-bold hover:bg-red-900 shadow-lg animate-bounce">
                <Lock size={16} className="inline mr-2" /> CONFIRMAR BLOQUEO
              </button>
          )}
        </div>

        {/* DERECHA: LISTADO */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col h-[600px]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800"><Clock className="w-5 h-5" /> Agenda: {date}</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {appointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p>No hay citas para este día.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {appointments.map(appt => {
                    const isBlocked = appt.status === 'blocked';
                    return (
                      <li key={appt.id} className={`flex justify-between p-4 rounded-xl border ${appt.status === 'cancelled' ? 'hidden' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="w-full">
                          <div className="flex items-center gap-3 mb-2">
                             <span className="font-bold text-xl text-gray-900 bg-white px-3 py-1 rounded border shadow-sm">
                                {appt.appointment_time.slice(0, 5)}
                             </span>
                             {isBlocked 
                                ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1"><Ban size={12}/> NO DISPONIBLE</span>
                                : <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={12}/> CLIENTE</span>
                             }
                          </div>
                          
                          {!isBlocked && (
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="flex items-center gap-2 text-gray-800 text-sm font-bold"><User size={14} className="text-gray-400"/> {appt.client_name}</div>
                                <div className="flex items-center gap-2 text-gray-600 text-sm"><Phone size={14} className="text-gray-400"/> {appt.client_phone}</div>
                              </div>
                          )}
                        </div>
                        <button onClick={() => handleCancel(appt.id)} className="text-gray-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-full self-center">
                            <Trash2 size={20} />
                        </button>
                      </li>
                    )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER DEL DASHBOARD */}
      <footer className="mt-12 mb-6 text-center text-gray-400 text-xs">
        <p>© 2025 Barber-app SaaS. Todos los derechos reservados.</p>
        <p className="mt-1">Ideada y Desarrollada por <strong>flexedwin</strong></p>
        <p className="mt-1 text-gray-300">Soporte: 3166173884 | @flexedwin</p>
      </footer>
    </div>
  );
}