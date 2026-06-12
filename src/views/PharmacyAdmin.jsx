import React, { useContext, useState } from 'react';
import { QueueContext } from '../context/QueueContext';

export default function ViewDPharmacyAdmin() {
  const { ticketsSnapshot, beginPrep, completePrep, rooms, queueSlots, kpiCheckins, pulseCounter } = useContext(QueueContext);
  const [activeTab, setActiveTab] = useState('pharmacy');

  const tickets = ticketsSnapshot.docs.map(doc => doc.data());

  const incomingTickets = tickets.filter(t => t.status === 'incoming');
  const prepTickets = tickets.filter(t => t.status === 'preparation');
  const completedTickets = tickets.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
        <button
          onClick={() => setActiveTab('pharmacy')}
          className={`py-3 px-6 text-sm uppercase tracking-wider font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'pharmacy'
              ? 'border-[#319795] text-[#319795]'
              : 'border-transparent text-[#718096] hover:text-[#1A365D]'
          }`}
        >
          Pharmacy Terminal
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`py-3 px-6 text-sm uppercase tracking-wider font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'admin'
              ? 'border-[#319795] text-[#319795]'
              : 'border-transparent text-[#718096] hover:text-[#1A365D]'
          }`}
          id="queue-tower"
        >
          Admin Command Tower
        </button>
      </div>

      {activeTab === 'pharmacy' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Incoming */}
          <div className="bg-slate-50 border border-gray-200 rounded-md p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-xs uppercase tracking-widest text-[#718096] font-bold">Incoming Requests</span>
              <span className="font-mono text-xs bg-[#1A365D] text-white px-2 py-0.5 rounded-md font-semibold">
                {incomingTickets.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-1">
              {incomingTickets.length === 0 ? (
                <div className="text-center py-12 text-[#718096] text-xs font-mono uppercase">No incoming routing</div>
              ) : (
                incomingTickets.map(t => (
                  <div key={t.id} className="bg-white border border-gray-100 rounded-md p-4 shadow-sm hover:border-sky-300 transition-all">
                    <div className="flex justify-between items-center mb-2 font-mono text-xs">
                      <span className="font-bold text-[#3182CE]">{t.token}</span>
                      <span className="text-[#718096]">{t.timestamp}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">{t.patientName}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#718096] mb-3">Dispensed: {t.doctorId}</div>
                    <div className="bg-slate-50 p-2.5 rounded-md border border-gray-100 font-mono text-xs text-slate-700 mb-4 notranslate" translate="no">
                      {t.prescriptionSummary}
                    </div>
                    <button
                      onClick={() => beginPrep(t.id)}
                      className="w-full bg-[#1A365D] hover:bg-[#2B6CB0] text-white text-xs font-semibold py-2 rounded-md transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Begin Preparation →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: In Preparation */}
          <div className="bg-slate-50 border border-gray-200 rounded-md p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-xs uppercase tracking-widest text-[#718096] font-bold">In Preparation</span>
              <span className="font-mono text-xs bg-[#319795] text-white px-2 py-0.5 rounded-md font-semibold">
                {prepTickets.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-1">
              {prepTickets.length === 0 ? (
                <div className="text-center py-12 text-[#718096] text-xs font-mono uppercase">Queue clear</div>
              ) : (
                prepTickets.map(t => (
                  <div key={t.id} className="bg-white border border-gray-100 rounded-md p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2 font-mono text-xs">
                      <span className="font-bold text-[#319795]">{t.token}</span>
                      <span className="text-amber-600 font-semibold">Started {t.startedAt}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">{t.patientName}</div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#718096]">Rx: {t.doctorId}</span>
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] px-2 py-0.5 rounded-md font-semibold font-mono">
                        PILOT: {t.pharmacist}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-md border border-gray-100 font-mono text-xs text-slate-700 mb-4 notranslate" translate="no">
                      {t.prescriptionSummary}
                    </div>
                    <button
                      onClick={() => completePrep(t.id)}
                      className="w-full bg-[#319795] hover:bg-[#2B6CB0] text-white text-xs font-semibold py-2 rounded-md transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Mark Completed ✓
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="bg-slate-50 border border-gray-200 rounded-md p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-xs uppercase tracking-widest text-[#718096] font-bold">Completed & Filled</span>
              <span className="font-mono text-xs bg-emerald-700 text-white px-2 py-0.5 rounded-md font-semibold">
                {completedTickets.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-1">
              {completedTickets.length === 0 ? (
                <div className="text-center py-12 text-[#718096] text-xs font-mono uppercase">None discharged</div>
              ) : (
                completedTickets.map(t => (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-md p-4 shadow-sm opacity-65 relative overflow-hidden">
                    <div className="absolute right-2 top-2 border-2 border-emerald-500 text-emerald-500 rounded-md font-mono text-[9px] font-bold px-1.5 py-0.5 transform rotate-12 tracking-wide">
                      COMPLETED {t.completedAt}
                    </div>

                    <div className="flex justify-between items-center mb-2 font-mono text-xs">
                      <span className="font-bold text-slate-500">{t.token}</span>
                      <span className="text-[#718096]">{t.timestamp}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 mb-1">{t.patientName}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#718096] mb-3">Physician: {t.doctorId}</div>
                    <div className="bg-slate-50 p-2.5 rounded-md border border-gray-100 font-mono text-xs text-slate-500 notranslate" translate="no">
                      {t.prescriptionSummary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Top KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Checkins */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold">Total Check-Ins Today</span>
                <span className="text-emerald-600 font-mono text-xs font-bold">+12%</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[#1A365D] mb-4">{kpiCheckins}</div>
              <div className="flex items-end space-x-1.5 h-6 bg-slate-50 border border-gray-100 rounded-md p-1">
                <div className="bg-[#319795] flex-1 rounded-sm" style={{ height: '30%' }} />
                <div className="bg-[#319795] flex-1 rounded-sm" style={{ height: '50%' }} />
                <div className="bg-[#319795] flex-1 rounded-sm" style={{ height: '40%' }} />
                <div className="bg-[#319795] flex-1 rounded-sm" style={{ height: '65%' }} />
                <div className="bg-[#319795] flex-1 rounded-sm" style={{ height: '80%' }} />
                <div className="bg-[#3182CE] flex-1 rounded-sm" style={{ height: '95%' }} />
              </div>
            </div>

            {/* Avg wait time */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold">Avg. Wait Time</span>
                <span className="text-[#319795] font-mono text-xs font-bold">Target &lt;15m</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[#319795] mb-4">14 mins</div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-md bg-[#319795]" />
                <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">ALL SYSTEMS OPTIMAL</span>
              </div>
            </div>

            {/* Doctor Utilization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold">Doctor Utilization</span>
                <span className="text-[#3182CE] font-mono text-xs font-bold">4 Rooms Active</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[#1A365D] mb-4">75.0%</div>
              <div className="w-full bg-slate-100 h-2.5 rounded-md overflow-hidden">
                <div className="bg-[#3182CE] h-full" style={{ width: '75%' }} />
              </div>
            </div>

            {/* Pharmacy Bottleneck Index */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold">Pharmacy Bottleneck</span>
                <span className="text-amber-600 font-mono text-xs font-bold">Mild Load</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[#1A365D] mb-4">2.4 / 10</div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
                <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">NOMINAL CONGESTION</span>
              </div>
            </div>

          </div>

          {/* Table Allocation & Monitor side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Doctor Room Allocations */}
            <div className="col-span-12 lg:col-span-7 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-4">Doctor Room Allocations</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 text-[10px] uppercase tracking-widest text-[#718096]">Room #</th>
                      <th className="py-2 text-[10px] uppercase tracking-widest text-[#718096]">Physician</th>
                      <th className="py-2 text-[10px] uppercase tracking-widest text-[#718096]">Current Patient</th>
                      <th className="py-2 text-[10px] uppercase tracking-widest text-[#718096]">Status</th>
                      <th className="py-2 text-[10px] uppercase tracking-widest text-[#718096] text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((rm, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-slate-800 font-semibold">{rm.room}</td>
                        <td className="py-3 text-[#1A365D] font-bold">{rm.doctor}</td>
                        <td className="py-3 text-slate-800 font-medium">{rm.patientToken}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              rm.status === 'AVAILABLE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : rm.status === 'IN SESSION'
                                ? 'bg-sky-50 text-sky-700 border-sky-100'
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}
                          >
                            {rm.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-[#718096]">{rm.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Queue Floor Monitor */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs uppercase tracking-widest text-[#718096] font-bold">Queue Floor Monitor</h3>
                <span className="text-[10px] text-[#718096] font-mono">Sync Block #{pulseCounter}</span>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-6">
                {queueSlots.map((status, index) => {
                  let slotBg = 'bg-gray-100'; // empty
                  if (status === 'waiting') slotBg = 'bg-amber-500';
                  else if (status === 'in-progress') slotBg = 'bg-[#319795]';
                  else if (status === 'completed') slotBg = 'bg-emerald-700';

                  return (
                    <div
                      key={index}
                      className={`h-10 rounded-md flex flex-col justify-between p-1 text-[10px] font-mono font-bold transition-all duration-300 ${slotBg} text-white`}
                    >
                      <div className="flex justify-between">
                        <span>S-{index + 1}</span>
                      </div>
                      <span className="text-[8px] uppercase tracking-wider text-right font-sans">
                        {status === 'empty' ? 'MT' : status.slice(0, 4)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-[10px] font-mono font-bold text-[#718096]">
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-gray-100 rounded-sm" />
                  <span>Empty</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
                  <span>Wait</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-[#319795] rounded-sm" />
                  <span>In-Prog</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-emerald-700 rounded-sm" />
                  <span>Filled</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
