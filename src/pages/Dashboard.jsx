import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Calendar, Clock, Trash2, User, Phone, Ban, CheckCircle, Lock, XCircle } from 'lucide-react';

export default function Dashboard({ session }) {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [takenSlots, setTakenSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para agendar manual
  const [isBlocking, setIsBlocking] = useState(false); // Modo bloqueo activado
  const [selectedToBlock, setSelectedToBlock] = useState([]); // Array de horas seleccionadas

  const allSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  // 1. Cargar Citas
  const fetchAppointments = async () => {
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true }) // Ordenar por fecha
      .order('appointment_time', { ascending: true }) // Luego por hora
      .eq('barber_id', session.user.id);

    const { data, error } = await query;
    if (error) console.error('Error cargando citas:', error);
    else setAppointments(data || []);
  };

  // 2. Cargar horarios ocupados
  const fetchTakenSlots = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('barber_id', session.user.id)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0, 5)));
  };

  useEffect(() => {
    fetchAppointments();
    fetchTakenSlots();
    setSelectedToBlock([]); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, session]);

  // 3. Manejar Clic en Hora
  const handleSlotClick = async (time) => {
    if (isBlocking) {
        if (selectedToBlock.includes(time)) {
            setSelectedToBlock(prev => prev.filter(t => t !== time));
        } else {
            setSelectedToBlock(prev => [...prev, time]);
        }
        return;
    }

    const nameToSave = prompt(`Ingresa nombre del cliente para las ${time}:`);
    if (!nameToSave) return;

    setLoading(true);
    const { error } = await supabase.from('appointments').insert({
      barber_id: session.user.id,
      appointment_date: date,
      appointment_time: time,
      client_name: nameToSave,
      client_phone: "Agendado Manualmente", 
      haircut_type: "General",
      status: 'scheduled'
    });

    handleResponse(error, "Cita agendada.");
  };

  // 4. Confirmar Bloqueo Masivo
  const confirmBatchBlock = async () => {
    if (selectedToBlock.length === 0) return;
    if (!window.confirm(`¿Bloquear estas ${selectedToBlock.length} horas seleccionadas?`)) return;

    setLoading(true);
    const updates = selectedToBlock.map(time => ({
        barber_id: session.user.id,
        appointment_date: date,
        appointment_time: time,
        client_name: "⛔ NO DISPONIBLE",
        client_phone: "", 
        haircut_type: "Bloqueo",
        status: 'blocked'
    }));

    const { error } = await supabase.from('appointments').upsert(updates, { onConflict: 'barber_id, appointment_date, appointment_time' });
    handleResponse(error, "Horarios bloqueados correctamente.");
    setSelectedToBlock([]);
  };

  // 5. CERRAR TODO EL DÍA
  const blockAllDay = async () => {
    if(!window.confirm(`⚠️ ¿Seguro que quieres CERRAR TODO el día ${date}? Esto bloqueará todas las horas.`)) return;
    setLoading(true);

    const updates = allSlots.map(time => ({
        barber_id: session.user.id,
        appointment_date: date,
        appointment_time: time,
        client_name: "⛔ CERRADO",
        haircut_type: "Día Completo",
        status: 'blocked'
    }));

    const { error } = await supabase.from('appointments').upsert(updates, { onConflict: 'barber_id, appointment_date, appointment_time' });
    handleResponse(error, "Día cerrado correctamente.");
  };

  const handleResponse = (error, successMsg) => {
    setLoading(false);
    if (error) {
        if (error.code === '23505') alert("¡Conflicto! Alguien reservó mientras seleccionabas.");
        else alert("Error: " + error.message);
    } else {
      alert(successMsg);
      fetchAppointments();
      fetchTakenSlots();
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Liberar este espacio?")) return;
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    fetchAppointments();
    fetchTakenSlots();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
           Panel de Gestión
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- COLUMNA IZQUIERDA: GESTIÓN DE TIEMPO --- */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Calendar className="w-5 h-5" /> Gestionar Horarios
          </h2>
          
          <input 
            type="date" 
            value={date}
            onChange={e => setDate(e.target.value)} 
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-lg mb-6"
          />

          {/* Interruptor de Modo - TEXTO MEJORADO */}
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => { setIsBlocking(false); setSelectedToBlock([]); }}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition ${!isBlocking ? 'bg-white shadow text-black' : 'text-gray-500'}`}
            >
                📅 Agendar Cliente
            </button>
            <button 
                onClick={() => setIsBlocking(true)}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition ${isBlocking ? 'bg-red-100 text-red-600 shadow' : 'text-gray-500'}`}
            >
                {/* CAMBIO DE TEXTO PARA QUE SEA INTUITIVO */}
                ⛔ Bloquear Horas / Día
            </button>
          </div>

          {/* Botón de CERRAR TODO (Solo visible en modo bloqueo) */}
          <div className="mb-4 text-center min-h-[40px]">
            {isBlocking ? (
                <button 
                    onClick={blockAllDay}
                    className="w-full py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-200 flex items-center justify-center gap-2 transition"
                >
                    <XCircle size={14} /> CERRAR ESTE DÍA COMPLETO
                </button>
            ) : (
                <p className="text-xs text-gray-400 pt-2">Selecciona una hora para agendar manualmente.</p>
            )}
          </div>

          {/* GRILLA DE HORARIOS */}
          <div className="grid grid-cols-3 gap-3">
            {allSlots.map(slot => {
              const isTaken = takenSlots.includes(slot);
              const isSelected = selectedToBlock.includes(slot);

              return (
                <button 
                  key={slot} 
                  disabled={isTaken || loading}
                  onClick={() => handleSlotClick(slot)}
                  className={`
                    py-3 px-2 rounded-lg text-sm font-bold transition-all duration-200 border relative
                    ${isTaken 
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' 
                      : isBlocking && isSelected
                        ? 'bg-red-600 text-white border-red-700 shadow-inner scale-95' 
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

          {/* BOTÓN CONFIRMAR SELECCIÓN */}
          {isBlocking && selectedToBlock.length > 0 && (
              <button 
                onClick={confirmBatchBlock}
                className="w-full mt-6 py-3 bg-red-800 text-white rounded-xl font-bold hover:bg-red-900 shadow-lg animate-bounce"
              >
                <Lock size={16} className="inline mr-2" />
                BLOQUEAR ({selectedToBlock.length}) HORAS
              </button>
          )}

        </div>

        {/* --- COLUMNA DERECHA: LISTADO DETALLADO --- */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col h-full max-h-[600px]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Clock className="w-5 h-5" /> Agenda Global
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {appointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                <p>No hay citas futuras.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {appointments.map(appt => {
                    const isBlocked = appt.status === 'blocked';
                    return (
                      <li key={appt.id} className={`flex justify-between items-start p-4 rounded-xl border transition-all ${appt.status === 'cancelled' ? 'hidden' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {/* HORA DE LA CITA */}
                                <span className="font-bold text-xl text-gray-900">{appt.appointment_time}</span>
                                
                                {/* FECHA DE LA CITA (AHORA SIEMPRE VISIBLE) */}
                                <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border shadow-sm">
                                  {appt.appointment_date}
                                </span>
                            </div>
                            
                            {/* ETIQUETA DE ESTADO */}
                            {isBlocked ? (
                                <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Ban size={12} /> BLOQUEADO
                                </span>
                            ) : (
                                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle size={12} /> ACTIVA
                                </span>
                            )}
                          </div>
                          
                          {/* DETALLES DEL CLIENTE (Solo si no está bloqueado) */}
                          {!isBlocked && (
                              <div className="bg-white p-3 rounded-lg border border-gray-100 mt-2">
                                <div className="flex items-center gap-2 text-gray-800 font-bold mb-1">
                                    <User size={16} className="text-gray-400" />
                                    {appt.client_name || "Cliente Anónimo"}
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <Phone size={16} className="text-gray-400" />
                                    {appt.client_phone || "Sin teléfono"}
                                </div>
                              </div>
                          )}
                        </div>
                        
                        {/* BOTÓN CANCELAR/LIBERAR */}
                        <button 
                            onClick={() => handleCancel(appt.id)}
                            className="ml-4 text-gray-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition self-center"
                            title={isBlocked ? "Desbloquear" : "Cancelar Cita"}
                        >
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
    </div>
  );
}