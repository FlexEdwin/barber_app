import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { CheckCircle, Clock, Trash2, Calendar, AlertCircle } from 'lucide-react';

export default function PublicBooking() {
  const { slug } = useParams();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Formulario
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [step, setStep] = useState(1); 
  const [takenSlots, setTakenSlots] = useState([]);

  // Mis Citas (Leídas del LocalStorage)
  const [myAppointments, setMyAppointments] = useState([]);
  const [view, setView] = useState('booking'); // 'booking' o 'my-appts'

  const slots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  // 1. Cargar Barbero
  useEffect(() => {
    const fetchBarber = async () => {
      const { data } = await supabase.from('profiles').select('id, business_name').eq('slug', slug).single();
      if (data) setBarber(data);
      setLoading(false);
    };
    fetchBarber();
  }, [slug]);

  // 2. Cargar Mis Citas (del LocalStorage)
  useEffect(() => {
    const loadMyAppointments = async () => {
        // Leemos los IDs guardados en el navegador
        const savedIds = JSON.parse(localStorage.getItem('my_bookings') || '[]');
        if (savedIds.length > 0) {
            const { data } = await supabase
                .from('appointments')
                .select('*')
                .in('id', savedIds)
                .order('appointment_date', { ascending: true });
            setMyAppointments(data || []);
        }
    };
    loadMyAppointments();
  }, [step, view]); // Recargar si reservamos o cambiamos de vista

  // 3. Ver Disponibilidad
  useEffect(() => {
    if (!barber) return;
    const fetchTaken = async () => {
      const { data } = await supabase.from('appointments').select('appointment_time').eq('barber_id', barber.id).eq('appointment_date', date).neq('status', 'cancelled');
      if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0,5)));
    };
    fetchTaken();
  }, [date, barber]);

  // 4. Reservar
  const handleBooking = async (e) => {
    e.preventDefault();
    if (takenSlots.includes(selectedTime)) return alert("Horario ocupado.");

    const { data, error } = await supabase.from('appointments').insert({
      barber_id: barber.id,
      appointment_date: date,
      appointment_time: selectedTime,
      client_name: clientName,
      client_phone: clientPhone,
      haircut_type: "General",
      status: 'scheduled'
    }).select().single(); // Pedimos que nos devuelva el dato insertado

    if (error) {
        if (error.code === '23505') alert("¡Horario ocupado por otra persona!");
        else alert("Error: " + error.message);
    } else {
        // --- AQUÍ ESTÁ LA MAGIA: Guardar en el celular ---
        const savedIds = JSON.parse(localStorage.getItem('my_bookings') || '[]');
        savedIds.push(data.id);
        localStorage.setItem('my_bookings', JSON.stringify(savedIds));
        // -------------------------------------------------
        setStep(3);
    }
  };

  // 5. Cancelar Cita (Usando la función segura de Base de Datos)
  const handleCancelClient = async (id) => {
    if (!window.confirm("¿Seguro que deseas cancelar?")) return;

    const { error } = await supabase.rpc('cancel_appointment_by_client', { appt_id: id });

    if (error) {
        alert("Error: " + error.message); // Aquí saldrá el mensaje de "Menos de 2 horas"
    } else {
        alert("Cita cancelada correctamente.");
        window.location.reload();
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!barber) return <div className="p-10 text-center">❌ Barbería no encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden mb-4">
        
        {/* Header con pestañas */}
        <div className="bg-black text-white p-6 pb-2 text-center">
          <h1 className="text-2xl font-bold mb-1">{barber.business_name}</h1>
          <div className="flex gap-4 justify-center mt-4 text-sm font-bold">
            <button 
                onClick={() => setView('booking')}
                className={`pb-2 border-b-2 ${view === 'booking' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}
            >
                RESERVAR
            </button>
            <button 
                onClick={() => setView('my-appts')}
                className={`pb-2 border-b-2 ${view === 'my-appts' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}
            >
                MIS CITAS
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* VISTA: RESERVAR */}
          {view === 'booking' && (
            <>
                {step === 1 && (
                    <>
                    <label className="block text-sm font-bold mb-2">Fecha</label>
                    <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl mb-6 font-bold" />
                    
                    <label className="block text-sm font-bold mb-2">Hora</label>
                    <div className="grid grid-cols-3 gap-2">
                        {slots.map(slot => (
                        <button key={slot} disabled={takenSlots.includes(slot)} onClick={() => { setSelectedTime(slot); setStep(2); }} className={`p-2 rounded-lg text-sm font-bold transition ${takenSlots.includes(slot) ? 'bg-gray-100 text-gray-300' : 'bg-black text-white'}`}>
                            {slot}
                        </button>
                        ))}
                    </div>
                    </>
                )}

                {step === 2 && (
                    <form onSubmit={handleBooking} className="space-y-4">
                    <p className="text-sm text-gray-500">Reserva: <strong>{date} {selectedTime}</strong></p>
                    <input required placeholder="Tu Nombre" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-3 border rounded-lg" />
                    <input required type="tel" placeholder="Teléfono" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full p-3 border rounded-lg" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep(1)} className="w-1/3 py-3 border rounded-lg font-bold">Atrás</button>
                        <button type="submit" className="w-2/3 py-3 bg-black text-white rounded-lg font-bold">Confirmar</button>
                    </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">¡Confirmado!</h2>
                    <p className="text-sm text-gray-500 mb-4">Hemos guardado esta cita en este dispositivo.</p>
                    <button onClick={() => { setStep(1); setView('my-appts'); }} className="text-blue-600 underline">Ver mis citas</button>
                    </div>
                )}
            </>
          )}

          {/* VISTA: MIS CITAS */}
          {view === 'my-appts' && (
            <div className="space-y-3">
                {myAppointments.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No tienes citas guardadas en este dispositivo.</p>
                ) : (
                    myAppointments.map(appt => (
                        <div key={appt.id} className="border p-3 rounded-lg flex justify-between items-center bg-gray-50">
                            <div>
                                <div className="font-bold text-lg">{appt.appointment_time}</div>
                                <div className="text-sm text-gray-500">{appt.appointment_date}</div>
                                <div className={`text-xs font-bold mt-1 ${appt.status === 'scheduled' ? 'text-green-600' : 'text-red-600'}`}>
                                    {appt.status === 'scheduled' ? 'CONFIRMADA' : 'CANCELADA'}
                                </div>
                            </div>
                            {appt.status === 'scheduled' && (
                                <button onClick={() => handleCancelClient(appt.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
          )}
        </div>
      </div>
      
      {/* Aviso legal */}
      <div className="flex items-start gap-2 max-w-md text-xs text-gray-400 mt-4">
        <AlertCircle size={16} className="shrink-0" />
        <p>Las citas solo se pueden cancelar con 2 horas de anticipación. Tus reservas se guardan en este dispositivo.</p>
      </div>
    </div>
  );
}