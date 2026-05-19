import { useState } from "react";
import { exportToCSV, exportToPDF } from "./utils/exportUtils";

const STATUS = { IDLE: "idle", SCRAPING: "scraping", DONE: "done", ERROR: "error", NOT_GOOGLE: "not_google" };

export default function Popup() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [data, setData] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleScrape = async () => {
    setStatus(STATUS.SCRAPING);
    setData([]);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url?.includes("google.com/search")) { setStatus(STATUS.NOT_GOOGLE); return; }

      const tryMessage = () =>
        new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(response);
          });
        });

      let response;
      try {
        response = await tryMessage();
      } catch {
        // ✅ Content script not injected yet — inject it now and retry
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/scraper.js"],
        });
        response = await tryMessage();
      }

      if (response?.success) { setData(response.data); setStatus(STATUS.DONE); }
      else { setErrorMsg("Could not scrape. Refresh the Google page and try again."); setStatus(STATUS.ERROR); }
    } catch (err) {
      setErrorMsg("Error: " + err.message);
      setStatus(STATUS.ERROR);
    }
  };

  return (
    <div className="w-[680px] min-h-[200px] max-h-[580px] bg-[#0f1117] text-white font-sans flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#10b981" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 11h6M11 8v6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Places Scraper</p>
            <p className="text-[10px] text-white/40 mt-0.5">Google Search → Export</p>
          </div>
        </div>
        {status === STATUS.DONE && (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-[11px] text-emerald-400 font-medium">{data.length} scraped</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
        <button
          onClick={handleScrape}
          disabled={status === STATUS.SCRAPING}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-semibold transition-all"
        >
          {status === STATUS.SCRAPING ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/>
              </svg>
              Scraping...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Scrape Current Page
            </>
          )}
        </button>

        {status === STATUS.DONE && data.length > 0 && (
          <>
            <button
              onClick={() => exportToCSV(data)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              CSV
            </button>
            <button
              onClick={() => exportToPDF(data)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              PDF
            </button>
          </>
        )}
      </div>

      {/* Notices */}
      {status === STATUS.NOT_GOOGLE && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Go to a Google Search page first
        </div>
      )}

      {status === STATUS.ERROR && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Idle State */}
      {status === STATUS.IDLE && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-white/30">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-3">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-xs">Search anything on Google then hit Scrape</p>
        </div>
      )}

      {/* No Results */}
      {status === STATUS.DONE && data.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-white/30">
          <p className="text-xs">No Places results found on this page</p>
        </div>
      )}

      {/* Results Table */}
      {status === STATUS.DONE && data.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0f1117] z-10">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider w-8">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Address</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Rating</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Category</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Phone</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Hours</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Ad</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2.5 text-white/20 font-mono">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-white max-w-[150px] truncate">{row.name || "—"}</td>
                  <td className="px-3 py-2.5 text-white/50 max-w-[130px] truncate">{row.address || "—"}</td>
                  <td className="px-3 py-2.5">
                    {row.rating && row.rating !== "—" ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        {row.rating}
                      </span>
                    ) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-white/50 max-w-[100px] truncate">{row.category || "—"}</td>
                  <td className="px-3 py-2.5 text-white/70">{row.phone || "—"}</td>
                  <td className="px-3 py-2.5">
                    {row.hours && row.hours !== "—" ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        row.hours.toLowerCase().includes("open")
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}>
                        {row.hours.length > 15 ? row.hours.slice(0, 15) + "…" : row.hours}
                      </span>
                    ) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.sponsored === "Yes"
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">Ad</span>
                      : <span className="text-white/20">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/10 text-[10px] text-white/20 text-center">
        Works on any Google Search with Places results
      </div>
    </div>
  );
}