import React, { useState, useEffect } from "react";
import { Search, Eye, X, Calendar, User, Phone, MapPin, Truck, History, ClipboardCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export default function ResidentRegistry() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedResident, setSelectedResident] = useState(null);

  // Debounce search input to limit API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch paginated residents list
  const { data: residentsData, isLoading } = useQuery({
    queryKey: ["residents-registry", page, debouncedSearch],
    queryFn: () =>
      api
        .get("/residents", {
          params: {
            page,
            search: debouncedSearch,
          },
        })
        .then((res) => res.data),
    refetchInterval: 10000, // Refresh registry every 10 seconds
  });

  const residents = residentsData?.data?.data || [];
  const pagination = residentsData?.data || {};

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Detail Modal */}
      {selectedResident && (
        <ResidentHistoryModal
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
            Resident History &amp; Registry
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Directory of evacuees, total checked-in counts, and relief ration history.
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
          <Calendar size={16} /> {today}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <div className="relative w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search family name, barangay, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <span className="flex h-6 w-6 relative mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
              </span>
              <p className="text-gray-500 dark:text-slate-400 font-medium">
                Loading evacuee records...
              </p>
            </div>
          ) : (
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6 font-semibold">Family Head</th>
                  <th className="py-3.5 px-6 font-semibold">Barangay</th>
                  <th className="py-3.5 px-6 font-semibold">Family Size</th>
                  <th className="py-3.5 px-6 font-semibold">Current Status</th>
                  <th className="py-3.5 px-6 font-semibold">Total Stays</th>
                  <th className="py-3.5 px-6 font-semibold">Rations Claimed</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {residents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium"
                    >
                      {search ? "No matching records found." : "No registered families found."}
                    </td>
                  </tr>
                ) : (
                  residents.map((res) => (
                    <tr
                      key={res.id}
                      className="hover:bg-blue-50/20 dark:hover:bg-slate-800/20 transition"
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-800 dark:text-slate-200">
                          {res.name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 font-mono mt-0.5">
                          QR: {res.qr_code_hash?.substring(0, 12)}...
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-700 dark:text-slate-300">
                        {res.barangay}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 py-1 px-3 rounded-full text-xs font-bold">
                          {res.headcount} Pax
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {res.current_status === "checked_in" ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center w-fit bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 py-0.5 px-2.5 rounded-full text-xs font-bold uppercase">
                              Checked In
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 max-w-[150px] truncate">
                              at {res.current_shelter}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 py-0.5 px-2.5 rounded-full text-xs font-bold uppercase">
                            Checked Out
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-750 dark:text-slate-300">
                        {res.total_checkins} stays
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 py-1 px-2.5 rounded-lg text-xs font-bold border border-purple-100 dark:border-purple-900/50">
                          <ClipboardCheck size={14} /> {res.total_rations_claimed} claimed
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedResident(res)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm"
                        >
                          <Eye size={14} /> View History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {!isLoading && pagination.last_page > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Showing page {page} of {pagination.last_page} (Total: {pagination.total} records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-750 transition disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={page === pagination.last_page}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-750 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scoped Resident Stay History Modal Component ───────────────────────────────────────────
function ResidentHistoryModal({ resident, onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <MapPin size={10} /> Barangay
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200 truncate">
              {resident.barangay}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <Phone size={10} /> Contact Number
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200">
              {resident.contact_number}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              <User size={10} /> Registered Size
            </span>
            <span className="block mt-1 text-sm font-bold text-gray-800 dark:text-slate-200">
              {resident.headcount} Pax
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
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

          <div className="border border-gray-100 dark:border-slate-800 rounded-lg overflow-hidden">
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
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-xs uppercase transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
