import { useState, useEffect } from "react";
import { Search, Eye, X, Calendar, User, Phone, MapPin, Truck, History, ClipboardCheck, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

import ResidentHistoryModal from '../../components/resident/modals/ResidentHistoryModal';
export default function ResidentRegistry() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedResident, setSelectedResident] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedResident) setSelectedResident(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedResident]);

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

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/residents', { params: { per_page: 1000, search: debouncedSearch } });
      const allResidents = res.data?.data?.data || residents;

      let csv = `ID,Family Head,Contact Number,Barangay,Family Size,Special Needs,Total Stays,Total Rations Claimed,Current Status\n`;
      allResidents.forEach(r => {
        const id = r.id || '';
        const name = (r.name || '').replace(/"/g, '""');
        const contact = (r.contact_number || r.contact || 'N/A').replace(/"/g, '""');
        const brgy = (r.barangay || 'N/A').replace(/"/g, '""');
        const size = r.family_size || 1;
        const needs = (r.special_needs || 'None').replace(/"/g, '""');
        const stays = r.check_ins_count ?? (r.check_ins?.length ?? 0);
        const rations = r.rations_count ?? (r.rations?.length ?? 0);
        const status = r.active_check_in ? 'Evacuated' : 'Cleared / Decamped';
        csv += `"${id}","${name}","${contact}","${brgy}","${size}","${needs}","${stays}","${rations}","${status}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `EvacRoute_Resident_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Detail Modal */}
      {selectedResident && (
        <ResidentHistoryModal
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
        />
      )}

      <div className="flex justify-end items-center gap-3 mb-4">
        <div className="text-sm text-gray-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
          <Calendar size={16} /> {today}
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!residents.length}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition shadow-sm text-sm disabled:opacity-50 cursor-pointer"
        >
          <Download size={16} /> Export to CSV
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex items-center justify-between">
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800/80 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-2xs cursor-pointer"
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
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
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

