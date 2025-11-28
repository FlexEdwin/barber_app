import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { CheckCircle, Calendar, Clock, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/LoadingSkeleton';

export default function PublicBooking() {
  const { slug } = useParams();
  const [barber, setBarber] = useState(null);
  const [config, setConfig] = useState(null); 
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [step, setStep] = useState(1); 
  
  const [dynamicSlots, setDynamicSlots] = useState([]); 
  const [takenSlots, setTakenSlots] = useState([]);     
  const [myAppointments, setMyAppointments] = useState([]);
  const [view, setView] = useState('booking');

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
    if (takenSlots.includes(selectedTime)) {
      toast.error('Este horario ya está ocupado');
      return;
    }

    const { data, error } = await supabase.from('appointments').insert({
      barber_id: barber.id, appointment_date: date, appointment_time: selectedTime,
      client_name: clientName, client_phone: clientPhone, haircut_type: "General", status: 'scheduled'
    }).select().single();

    if (error) {
        if (error.code === '23505') {
            toast.error('¡Ups! Alguien acaba de reservar ese horario');
            const { data } = await supabase.from('appointments').select('appointment_time').eq('barber_id', barber.id).eq('appointment_date', date).neq('status', 'cancelled');
            if (data) setTakenSlots(data.map(d => d.appointment_time.slice(0,5)));
        } else {
          toast.error(error.message);
        }
    } else {
        const savedIds = JSON.parse(localStorage.getItem('my_bookings') || '[]');
        savedIds.push(data.id);
        localStorage.setItem('my_bookings', JSON.stringify(savedIds));
        setStep(3);
        toast.success('¡Reserva confirmada!');
    }
  };

  const handleCancelClient = async (id) => {
    const { error } = await supabase.rpc('cancel_appointment_by_client', { appt_id: id });
    if (error) {
      toast.error(error.message);
    } else { 
      toast.success('Cita cancelada correctamente');
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
        <div className="bg-gradient-to-r from-accent-from to-accent-to p-4 rounded-full mb-4 animate-bounce-gentle">
          <Calendar size={40} className="text-white" />
        </div>
        <div className="text-white font-semibold">Cargando disponibilidad...</div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState 
          icon={Calendar}
          title="Barbería no encontrada"
          description="No pudimos encontrar esta barbería. Verifica el enlace."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center p-4 py-8">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-premium overflow-hidden mb-6 animate-slide-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-950 to-primary-900 text-white p-6 pb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-4">{barber.business_name}</h1>
          <div className="flex gap-2 justify-center text-sm font-bold">
            <button 
              onClick={() => setView('booking')} 
              className={`pb-2 px-4 border-b-2 transition-all touch-target ${view === 'booking' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
            >
              RESERVAR
            </button>
            <button 
              onClick={() => setView('my-appts')} 
              className={`pb-2 px-4 border-b-2 transition-all touch-target ${view === 'my-appts' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
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
                    <label className="block text-sm font-bold mb-3 flex items-center gap-2 text-gray-700">
                      <Calendar size={18}/> Selecciona Fecha
                    </label>
                    <input 
                      type="date" 
                      value={date} 
                      min={new Date().toISOString().split('T')[0]} 
                      onChange={e => setDate(e.target.value)} 
                      className="w-full p-3.5 border-2 border-gray-200 rounded-xl mb-6 font-semibold text-lg hover:border-gray-300 focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all" 
                    />
                    
                    <label className="block text-sm font-bold mb-3 flex items-center gap-2 text-gray-700">
                      <Clock size={18}/> Horarios Disponibles
                    </label>
                    
                    {dynamicSlots.length === 0 ? (
                      <SkeletonGrid cols={3} rows={3} />
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {dynamicSlots.map(slot => {
                          const isTaken = takenSlots.includes(slot);
                          return (
                            <button 
                              key={slot} 
                              disabled={isTaken} 
                              onClick={() => { setSelectedTime(slot); setStep(2); }} 
                              className={`p-3 rounded-xl text-sm font-bold transition-all touch-target ${isTaken ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-2 border-gray-100' : 'bg-primary-950 text-white hover:bg-primary-800 hover:scale-105 shadow-md active:scale-95 border-2 border-primary-950'}`}
                            >
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    </>
                )}

                {step === 2 && (
                    <form onSubmit={handleBooking} className="space-y-5 animate-slide-up">
                        <div className="bg-gradient-to-r from-accent-from/10 to-accent-to/10 p-5 rounded-xl border-2 border-accent-from/20 text-center">
                            <p className="text-xs text-gray-600 uppercase font-bold tracking-wide mb-1">Tu Reserva</p>
                            <p className="text-3xl font-display font-bold text-gray-900">{selectedTime}</p>
                            <p className="text-sm text-gray-600 font-medium mt-1">{date}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Tu Nombre</label>
                          <input 
                            required 
                            placeholder="Ej: Juan Pérez" 
                            value={clientName} 
                            onChange={e => setClientName(e.target.value)} 
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl font-medium hover:border-gray-300 focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all" 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono / WhatsApp</label>
                          <input 
                            required 
                            type="tel" 
                            placeholder="Ej: 300 123 4567" 
                            value={clientPhone} 
                            onChange={e => setClientPhone(e.target.value)} 
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl font-medium hover:border-gray-300 focus:border-accent-from focus:ring-2 focus:ring-accent-from/20 outline-none transition-all" 
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                              type="button" 
                              onClick={() => setStep(1)} 
                              className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all touch-target"
                            >
                              Atrás
                            </button>
                            <button 
                              type="submit" 
                              className="flex-1 py-3.5 bg-primary-950 text-white rounded-xl font-bold hover:bg-primary-800 active:scale-95 shadow-lg transition-all touch-target"
                            >
                              Confirmar
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="text-center py-10 animate-slide-up">
                        <div className="bg-gradient-to-r from-green-400 to-green-500 p-4 rounded-full w-fit mx-auto mb-4 animate-bounce-gentle">
                          <CheckCircle className="w-16 h-16 text-white" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">¡Reserva Exitosa!</h2>
                        <p className="text-gray-600 mb-6">Te esperamos en tu cita</p>
                        <button 
                          onClick={() => { setStep(1); setView('my-appts'); }} 
                          className="bg-primary-950 text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all touch-target inline-flex items-center gap-2"
                        >
                          <Sparkles size={18} />
                          Ver mis citas
                        </button>
                    </div>
                )}
            </>
          )}

          {/* VISTA: MIS CITAS */}
          {view === 'my-appts' && (
            <div className="space-y-3">
                {myAppointments.length === 0 ? (
                    <EmptyState 
                      icon={Calendar}
                      title="No tienes citas guardadas"
                      description="Tus reservas aparecerán aquí"
                    />
                ) : (
                    myAppointments.map(appt => (
                        <div key={appt.id} className="border-2 border-gray-200 p-4 rounded-xl flex justify-between items-center bg-white hover:border-gray-300 hover:shadow-md transition-all">
                            <div>
                                <div className="font-bold text-2xl text-gray-900">{appt.appointment_time.slice(0, 5)}</div>
                                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">{appt.appointment_date}</div>
                                <div className={`text-xs font-bold mt-2 px-3 py-1.5 rounded-full w-fit border ${appt.status === 'scheduled' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                  {appt.status === 'scheduled' ? 'CONFIRMADA' : 'CANCELADA'}
                                </div>
                            </div>
                            {appt.status === 'scheduled' && (
                                <button 
                                  onClick={() => handleCancelClient(appt.id)} 
                                  className="text-gray-300 p-2.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-all touch-target" 
                                  title="Cancelar Cita"
                                >
                                  <Trash2 size={22} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
          )}
        </div>
      </div>
      
      {/* FOOTER */}
      <div className="mt-6 text-center pb-8 space-y-2 animate-fade-in">
        <p className="text-xs text-gray-500 font-medium">
          Powered by <span className="font-bold bg-gradient-to-r from-accent-from to-accent-to bg-clip-text text-transparent">Barber-app</span>
        </p>
        <p className="text-[10px] text-gray-400">Dev: flexedwin | 3166173884</p>
      </div>
    </div>
  );
}