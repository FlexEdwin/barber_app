import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Calendar, Clock, Trash2, User } from 'lucide-react';

export default function Dashboard({ session }) {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [takenSlots, setTakenSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Horarios de atención
  const allSlots = [
    "09:00", "10:00", "11:00", "12:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // 1. Verificar si soy ADMIN
  useEffect(() => {
    const checkRole = async () => {
      // Consultamos la tabla profiles para ver el rol
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (data?.role === 'admin') {
        setIsAdmin(true);
      }
    };
    checkRole();
  }, [session]);

  // 2. Cargar Citas
  const fetchAppointments = async () => {
    // Preparamos la consulta
    let query = supabase
      .from('appointments')
      .select('*, profiles(email, full_name)')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    // Si NO es admin, filtra para ver solo SUS citas
    if (!isAdmin) {
      query = query.eq('user_id', session.user.id);
    } 
    // Si ES admin, ve todo (podrías filtrar por fecha si quisieras)

    const { data, error } = await query;
    if (error) console.error('Error cargando citas:', error);
    else setAppointments(data || []);
  };

  // 3. Cargar horarios OCUPADOS del día seleccionado
  const fetchTakenSlots = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', date)
      .neq('status', 'cancelled'); // Ignoramos las canceladas

    if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0, 5)));
  };

  // Recargar datos cuando algo cambia
  useEffect(() => {
    fetchAppointments();
    fetchTakenSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, session, isAdmin]);

  // Función: Reservar Cita
  const handleBook = async (time) => {
    if (!window.confirm(`¿Confirmar reserva para el ${date} a las ${time}?`)) return;

    setLoading(true);
    const { error } = await supabase.from('appointments').insert({
      user_id: session.user.id,
      appointment_date: date,
      appointment_time: time,
      haircut_type: "Corte Clásico",
      notes: isAdmin ? "Agendado por Admin" : "Web Booking",
      status: 'scheduled'
    });

    if (error) alert("Error: " + error.message);
    else {
      alert("¡Cita agendada con éxito!");
      fetchAppointments();
      fetchTakenSlots();
    }
    setLoading(false);
  };

  // Función: Cancelar Cita
  const handleCancel = async (id) => {
    if (!window.confirm("¿Seguro que quieres cancelar esta cita?")) return;
    
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);
      
    fetchAppointments();
    fetchTakenSlots();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
           {isAdmin ? '👮‍♂️ Panel de Administración' : '✂️ Reserva tu Corte'}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- COLUMNA IZQUIERDA: CALENDARIO --- */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Calendar className="w-5 h-5" /> Selecciona Fecha y Hora
          </h2>
          
          <div className="mb-6">
            <input 
              type="date" 
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)} 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-semibold text-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {allSlots.map(slot => {
              const isTaken = takenSlots.includes(slot);
              return (
                <button 
                  key={slot} 
                  disabled={isTaken || loading}
                  onClick={() => handleBook(slot)}
                  className={`
                    py-3 px-2 rounded-lg text-sm font-bold transition-all duration-200
                    ${isTaken 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-black text-white hover:bg-gray-800 hover:scale-105 shadow-md'}
                  `}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-black rounded"></div> Disponible</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded"></div> Ocupado</span>
          </div>
        </div>

        {/* --- COLUMNA DERECHA: LISTADO --- */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col h-full">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Clock className="w-5 h-5" /> {isAdmin ? 'Agenda Global' : 'Mis Citas'}
          </h2>
          
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {appointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Calendar size={48} className="mb-2 opacity-20" />
                <p>No hay citas programadas.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {appointments.map(appt => (
                  <li key={appt.id} className={`flex justify-between items-start p-4 rounded-xl border transition-all ${appt.status === 'cancelled' ? 'bg-red-50 border-red-100 opacity-60' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-900">{appt.appointment_time}</span>
                        <span className="text-sm text-gray-500 font-medium">{appt.appointment_date}</span>
                      </div>
                      
                      {isAdmin && (
                        <div className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-md inline-flex items-center gap-1 mb-1">
                          <User size={12} /> {appt.profiles?.email || 'Cliente'}
                        </div>
                      )}
                      
                      <div className={`text-xs font-bold px-2 py-1 rounded-full w-fit mt-1 ${
                        appt.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {appt.status === 'scheduled' ? 'CONFIRMADA' : 'CANCELADA'}
                      </div>
                    </div>
                    
                    {appt.status === 'scheduled' && (
                      <button 
                        onClick={() => handleCancel(appt.id)}
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition"
                        title="Cancelar Cita"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}