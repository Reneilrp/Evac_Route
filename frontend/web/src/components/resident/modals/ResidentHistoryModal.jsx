import React from 'react';
import { User, X, Phone, MapPin } from 'lucide-react';

// ─── Scoped Resident Stay History Modal Component ───────────────────────────────────────────
function ResidentHistoryModal({ resident, onClose }) {
  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-xl">
                {resident.name}
              </h3>
              <p className="text-xs text-gray-450 dark:text-slate-500 font-mono mt-0.5">
                QR Code Hash: {resident.qr_code_hash}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Profile Card details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <MapPin size={10} /> Barangay
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200 truncate">
              {resident.barangay}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <Phone size={10} /> Contact Number
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200">
              {resident.contact_number}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <User size={10} /> Registered Size
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200">
              {resident.headcount} Pax
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <Truck size={10} /> Transport
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200 capitalize">
              {resident.transportation_mode || "N/A"}
            </span>
          </div>
        </div>

        {/* Stay Timeline / History Table */}
        <div className="mb-6">
          <h4 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-3 flex items-center gap-1.5">
            <History size={16} className="text-gray-450 dark:text-slate-400" />
            Evacuation &amp; Relief Stay History
          </h4>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="min-w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-4">Evacuation Center</th>
                  <th className="py-2.5 px-4">Stay Duration</th>
                  <th className="py-2.5 px-4">Headcount Checked In</th>
                  <th className="py-2.5 px-4">Ration Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {resident.history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-gray-400 dark:text-slate-500 font-semibold"
                    >
                      No stay history recorded in database.
                    </td>
                  </tr>
                ) : (
                  resident.history.map((log) => {
                    const checkIn = new Date(log.checked_in_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const checkOut = log.checked_out_at
                      ? new Date(log.checked_out_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Present Stay";

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition"
                      >
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-slate-200">
                          {log.shelter_name}
                        </td>
                        <td className="py-3 px-4 text-gray-650 dark:text-slate-355">
                          <div className="font-medium">{checkIn} &rarr;</div>
                          <div className={`text-[10px] ${log.checked_out_at ? 'text-gray-400 dark:text-slate-500' : 'text-green-600 dark:text-green-400 font-bold'}`}>
                            {checkOut}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-700 dark:text-slate-300">
                          {log.recorded_headcount} Pax
                        </td>
                        <td className="py-3 px-4">
                          {log.ration_claimed ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center w-fit bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 py-0.5 px-2 rounded-full text-[9px] font-black uppercase">
                                Claimed
                              </span>
                              {log.ration_claimed_at && (
                                <span className="text-[9px] text-gray-400 dark:text-slate-500">
                                  {new Date(log.ration_claimed_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                              {log.claimed_ration_items && log.claimed_ration_items.length > 0 ? (
                                <div className="mt-1 border-t border-purple-100 dark:border-purple-900/40 pt-1 text-[10px] text-purple-800 dark:text-purple-300 space-y-0.5 bg-purple-50/50 dark:bg-purple-950/20 p-1.5 rounded">
                                  <div className="font-extrabold text-[8px] uppercase tracking-wider text-purple-500">Items Claimed:</div>
                                  {log.claimed_ration_items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between gap-2">
                                      <span className="font-semibold">{item.item_name}:</span>
                                      <span className="font-bold">{item.quantity} {item.unit_type}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic">No details saved</span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 py-0.5 px-2 rounded-full text-[9px] font-bold uppercase">
                              No Claim / Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}


export default ResidentHistoryModal;
