import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, RefreshCw } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('settlements');
  const [settlements, setSettlements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'settlements') {
        const res = await axios.get('/api/settlements?limit=50');
        setSettlements(res.data.settlements);
      } else if (activeTab === 'jobs') {
        const res = await axios.get('/api/jobs');
        setJobs(res.data);
      } else if (activeTab === 'notifications') {
        const res = await axios.get('/api/notifications');
        setNotifications(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('/api/settlements/upload', formData);
      alert('Upload successful');
      fetchData();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  const runReconciliation = async () => {
    try {
      await axios.post('/api/jobs/run');
      alert('Reconciliation triggered');
      setActiveTab('jobs');
    } catch (err) {
      alert('Error triggering task: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen p-8 text-slate-200">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-700">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          CourierAlert System
        </h1>
        <button onClick={runReconciliation} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors">
          <RefreshCw size={18} />
          Run Reconciliation
        </button>
      </header>
      
      <div className="flex gap-4 mb-8">
        {['settlements', 'jobs', 'notifications', 'upload'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${activeTab === tab ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm">
        {activeTab === 'upload' && (
          <form onSubmit={handleUpload} className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-600 rounded-xl hover:border-blue-500 transition-colors">
            <Upload size={48} className="text-slate-400 mb-4" />
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="mb-4 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mx-auto max-w-xs" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg font-medium transition-colors">Upload Settlements CSV</button>
          </form>
        )}

        {activeTab === 'settlements' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-3 text-slate-400 font-medium">AWB / Batch</th>
                  <th className="p-3 text-slate-400 font-medium">Status</th>
                  <th className="p-3 text-slate-400 font-medium">COD Amt</th>
                  <th className="p-3 text-slate-400 font-medium">Discrepancies</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-3">
                      <div>{s.awbNumber}</div>
                      <div className="text-xs text-slate-500">{s.batchId}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${s.status === 'MATCHED' ? 'bg-emerald-900/50 text-emerald-400' : s.status === 'DISCREPANCY' ? 'bg-rose-900/50 text-rose-400' : s.status === 'PENDING_REVIEW' ? 'bg-amber-900/50 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3">₹{s.settledCodAmount}</td>
                    <td className="p-3 text-rose-300 text-sm">
                      {s.discrepancies?.map((d, i) => (
                         <div key={i} className="mb-1">
                           <span className="font-bold text-xs uppercase opacity-70">[{d.type}]</span> {d.message}
                           {d.expected !== undefined && <span className="block text-xs text-slate-400">Exp: {d.expected} | Act: {d.actual}</span>}
                         </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="grid gap-4">
            {jobs.map(job => (
              <div key={job.jobId} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-mono text-xs text-blue-400 mb-1">{job.jobId}</div>
                    <div className="text-sm text-slate-300">
                      Processed: <span className="text-white font-semibold">{job.recordsProcessed}</span> | 
                      Discrepancies: <span className="text-rose-400 font-semibold">{job.discrepanciesFound}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${job.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-900/30' : 'text-rose-400 bg-rose-900/30'}`}>
                    {job.status}
                  </div>
                </div>
                {job.logs && job.logs.length > 0 && (
                  <div className="mt-3 p-3 bg-black/40 rounded border border-slate-800 text-xs font-mono max-h-32 overflow-y-auto">
                    {job.logs.map((log, i) => <div key={i} className={job.status === 'FAILED' ? 'text-rose-400' : 'text-slate-400'}>{log}</div>)}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 mt-2">Run at: {new Date(job.runAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notifications' && (
           <div className="grid gap-4">
             {notifications.map(n => (
               <div key={n._id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                 <div className="flex justify-between items-center mb-2">
                   <div className="font-medium">AWB: {n.awbNumber} (Merchant {n.merchantId})</div>
                   <div className={`px-2 py-1 text-xs rounded-full ${n.status === 'SENT' ? 'text-emerald-400 bg-emerald-900/30' : n.status === 'RETRYING' ? 'text-amber-400 bg-amber-900/30' : 'text-rose-400 bg-rose-900/30'}`}>
                     {n.status}
                   </div>
                 </div>
                 <div className="text-sm text-slate-400">Attempts: {n.attempts}</div>
                 {n.error && <div className="text-sm text-rose-400 mt-1">Error: {n.error}</div>}
               </div>
             ))}
           </div>
        )}
      </main>
    </div>
  );
}
