import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { CheckCircle, Calendar, AlertCircle, Clock, Trash2 } from 'lucide-react';

export default function PublicBooking() {
  const { slug } = useParams();
  const [barber, setBarber] = useState(null);
  const [config, setConfig] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [step, setStep] = useState(1); 
  
  const [dynamicSlots, setDynamicSlots] = useState([]); 
  const [takenSlots, setTakenSlots] = useState([]);     
  const [myAppointments, setMyAppointments] = useState([]);
  const [view, setView] = useState('booking');

  // ... (El código de lógica sigue igual, lo omito para no repetir, mantén la lógica de la respuesta anterior) ...
  // COPIAR LA MISMA LÓGICA DE useEffects y handles QUE TE PASÉ EN LA RESPUESTA ANTERIOR
  // (Pego de nuevo la lógica aquí para que solo copies y pegues el archivo completo)

  useEffect(() => {
    const fetchBarber = async () => {
      const { data } = await supabase.from('profiles').select('id, business_name, config').eq('slug', slug).single();
      if (data) {
        setBarber(data);
        setConfig(data.config || { start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00", duration: 60 });
      }
      setLoading(false);
    };
    fetchBarber();
  }, [slug]);

  useEffect(() => {
    if (!config) return;
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

  useEffect(() => {
    const loadMyAppointments = async () => {
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
  }, [step, view]);

  useEffect(() => {
    if (!barber) return;
    const fetchTaken = async () => {
      const { data } = await supabase.from('appointments').select('appointment_time').eq('barber_id', barber.id).eq('appointment_date', date).neq('status', 'cancelled');
      if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0,5)));
    };
    fetchTaken();
  }, [date, barber]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (takenSlots.includes(selectedTime)) return alert("Horario ocupado.");

    const { data, error } = await supabase.from('appointments').insert({
      barber_id: barber.id, appointment_date: date, appointment_time: selectedTime,
      client_name: clientName, client_phone: clientPhone, haircut_type: "General", status: 'scheduled'
    }).select().single();

    if (error) {
        if (error.code === '23505') {
            alert("¡Ups! Alguien acaba de ganar ese horario.");
            const { data } = await supabase.from('appointments').select('appointment_time').eq('barber_id', barber.id).eq('appointment_date', date).neq('status', 'cancelled');
            if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0,5)));
        } else alert("Error: " + error.message);
    } else {
        const savedIds = JSON.parse(localStorage.getItem('my_bookings') || '[]');
        savedIds.push(data.id);
        localStorage.setItem('my_bookings', JSON.stringify(savedIds));
        setStep(3);
    }
  };

  const handleCancelClient = async (id) => {
    if (!window.confirm("¿Seguro que deseas cancelar?")) return;
    const { error } = await supabase.rpc('cancel_appointment_by_client', { appt_id: id });
    if (error) alert("Error: " + error.message);
    else { alert("Cita cancelada."); window.location.reload(); }
  };

  if (loading) return <div className="p-10 text-center font-bold animate-pulse">Cargando disponibilidad...</div>;
  if (!barber) return <div className="p-10 text-center">❌ Barbería no encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden mb-4">
        
        <div className="bg-black text-white p-6 pb-2 text-center">
          <h1 className="text-2xl font-bold mb-1">{barber.business_name}</h1>
          <div className="flex gap-4 justify-center mt-4 text-sm font-bold">
            <button onClick={() => setView('booking')} className={`pb-2 border-b-2 transition ${view === 'booking' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}>RESERVAR</button>
            <button onClick={() => setView('my-appts')} className={`pb-2 border-b-2 transition ${view === 'my-appts' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}>MIS CITAS</button>
          </div>
        </div>

        <div className="p-6">
          {view === 'booking' && (
            <>
                {step === 1 && (
                    <>
                    <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Calendar size={16}/> Selecciona Fecha</label>
                    <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl mb-6 font-bold text-lg" />
                    
                    <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Clock size={16}/> Horarios Disponibles</label>
                    <div className="grid grid-cols-3 gap-2">
                        {dynamicSlots.length > 0 ? dynamicSlots.map(slot => {
                            const isTaken = takenSlots.includes(slot);
                            return (
                                <button key={slot} disabled={isTaken} onClick={() => { setSelectedTime(slot); setStep(2); }} className={`p-2 rounded-lg text-sm font-bold transition ${isTaken ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-100' : 'bg-black text-white hover:bg-gray-800 shadow-md active:scale-95'}`}>
                                    {slot}
                                </button>
                            )
                        }) : <p className="col-span-3 text-center text-gray-400 py-4 text-sm">No hay horarios.</p>}
                    </div>
                    </>
                )}

                {step === 2 && (
                    <form onSubmit={handleBooking} className="space-y-4 animate-in slide-in-from-right-8">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 text-center">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Resumiendo</p>
                            <p className="text-xl font-bold text-gray-900">{selectedTime}</p>
                            <p className="text-sm text-gray-600">{date}</p>
                        </div>
                        <input required placeholder="Tu Nombre" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-3 border rounded-lg font-medium" />
                        <input required type="tel" placeholder="Teléfono" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full p-3 border rounded-lg font-medium" />
                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={() => setStep(1)} className="w-1/3 py-3 border rounded-lg font-bold text-gray-600 hover:bg-gray-50">Atrás</button>
                            <button type="submit" className="w-2/3 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 shadow-lg">Confirmar</button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="text-center py-8 animate-in zoom-in">
                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900">¡Reserva Exitosa!</h2>
                        <button onClick={() => { setStep(1); setView('my-appts'); }} className="bg-black text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition mt-4">Ver mis citas</button>
                    </div>
                )}
            </>
          )}

          {view === 'my-appts' && (
            <div className="space-y-3">
                {myAppointments.length === 0 ? (
                    <div className="text-center py-10"><Calendar className="w-12 h-12 text-gray-200 mx-auto mb-2"/><p className="text-gray-400">No tienes citas guardadas.</p></div>
                ) : (
                    myAppointments.map(appt => (
                        <div key={appt.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-center bg-white shadow-sm">
                            <div>
                                <div className="font-bold text-xl text-gray-900">{appt.appointment_time.slice(0, 5)}</div>
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{appt.appointment_date}</div>
                                <div className={`text-xs font-bold mt-2 px-2 py-1 rounded-md w-fit ${appt.status === 'scheduled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{appt.status === 'scheduled' ? 'CONFIRMADA' : 'CANCELADA'}</div>
                            </div>
                            {appt.status === 'scheduled' && (
                                <button onClick={() => handleCancelClient(appt.id)} className="text-gray-300 p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition" title="Cancelar Cita"><Trash2 size={20} /></button>
                            )}
                        </div>
                    ))
                )}
            </div>
          )}
        </div>
      </div>
      
      {/* NUEVO FOOTER CLIENTE */}
      <div className="mt-8 text-center pb-8">
        <p className="text-xs text-gray-400 font-medium">Powered by <span className="text-gray-600 font-bold">Barber-app</span></p>
        <p className="text-[10px] text-gray-300 mt-1">Dev: flexedwin | 3166173884</p>
      </div>
    </div>
  );
}