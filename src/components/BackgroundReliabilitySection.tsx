import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Mail,
  Zap,
  Server,
  Terminal,
  ShieldCheck,
  Play,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { useDemoStore } from '../lib/store/demo-store';

interface JobRecord {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface DeliveryRecord {
  id: string;
  digestId: string;
  recipientEmail: string;
  provider: string;
  status: 'pending' | 'delivered' | 'failed' | 'bounced';
  sentAt?: string;
  errorMessage?: string;
}

interface BackgroundMetrics {
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeWorkers: number;
  oldestPendingJobAgeMs?: number;
}

export const BackgroundReliabilitySection: React.FC = () => {
  const { showToast, digests } = useDemoStore();
  const [metrics, setMetrics] = useState<BackgroundMetrics>({
    pendingJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    activeWorkers: 1,
  });
  const [recentJobs, setRecentJobs] = useState<JobRecord[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.getBackgroundStatus();
      if (res) {
        setMetrics(res.metrics || {});
        setRecentJobs(res.recentJobs || []);
        setRecentDeliveries(res.recentDeliveries || []);
      }
    } catch (e) {
      console.warn('Failed to load background status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleManualTick = async () => {
    setIsTriggering('tick');
    try {
      const res = await api.triggerCronTick();
      showToast(
        `Worker tick completed: ${res.result?.jobsProcessed ?? 0} jobs processed, ${res.result?.dueSyncsEnqueued ?? 0} syncs checked.`
      );
      await fetchStatus();
    } catch (e: any) {
      showToast(`Tick failed: ${e.message}`);
    } finally {
      setIsTriggering(null);
    }
  };

  const handleManualSyncCheck = async () => {
    setIsTriggering('sync');
    try {
      const res = await api.triggerCronSync();
      showToast(`Sync scheduler evaluated: ${res.dueSyncsEnqueued ?? 0} accounts enqueued.`);
      await fetchStatus();
    } catch (e: any) {
      showToast(`Sync trigger failed: ${e.message}`);
    } finally {
      setIsTriggering(null);
    }
  };

  const handleManualDigestCheck = async () => {
    setIsTriggering('digest');
    try {
      const res = await api.triggerCronDigests();
      showToast(`Digest scheduler evaluated: ${res.dueDigestsEnqueued ?? 0} digests enqueued.`);
      await fetchStatus();
    } catch (e: any) {
      showToast(`Digest trigger failed: ${e.message}`);
    } finally {
      setIsTriggering(null);
    }
  };

  const handlePreviewEmail = async (digestId: string) => {
    try {
      const res = await fetch(`/api/digests/${digestId}/email-preview`);
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
        setIsPreviewOpen(true);
      } else {
        showToast('Could not load email preview');
      }
    } catch (e) {
      showToast('Error loading preview');
    }
  };

  return (
    <div id="background-reliability-section" className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#171717]">Background Automation & Reliability</h2>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Worker Running</span>
            </span>
          </div>
          <p className="text-xs text-[#70706B] mt-1 max-w-xl">
            Autonomous server-side scheduling, token refresh, AI pipelines, and digest delivery that continue running even when your browser is closed.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E0E0DC] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-[#70706B]'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleManualTick}
            disabled={isTriggering === 'tick'}
            className="px-3 py-1.5 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-xs font-semibold text-[#FAFAF8] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            {isTriggering === 'tick' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run Worker Tick</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">Active Workers</span>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span className="text-xl font-bold text-[#171717]">{metrics.activeWorkers || 1}</span>
          </div>
          <p className="text-[10px] text-[#70706B]">Node.js continuous loop</p>
        </div>

        <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">Pending / In-Flight</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xl font-bold text-[#171717]">
              {(metrics.pendingJobs || 0) + (metrics.runningJobs || 0)}
            </span>
          </div>
          <p className="text-[10px] text-[#70706B]">{metrics.runningJobs || 0} running right now</p>
        </div>

        <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">Completed Jobs</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="text-xl font-bold text-[#171717]">{metrics.completedJobs || 0}</span>
          </div>
          <p className="text-[10px] text-[#70706B]">Autonomous executions</p>
        </div>

        <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">Failed / Retried</span>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xl font-bold text-[#171717]">{metrics.failedJobs || 0}</span>
          </div>
          <p className="text-[10px] text-[#70706B]">Exponential backoff</p>
        </div>
      </div>

      {/* Trigger Utilities */}
      <div className="p-5 bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#70706B]">Scheduler Diagnostics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-[#E8E8E5] rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-[#171717] block">X Sync Scheduler</span>
              <span className="text-[11px] text-[#70706B]">Checks cadence & tokens for all connected accounts</span>
            </div>
            <button
              onClick={handleManualSyncCheck}
              disabled={isTriggering === 'sync'}
              className="px-2.5 py-1.5 rounded-lg bg-[#F4F4F1] hover:bg-[#E8E8E5] text-xs font-medium text-[#171717] transition-colors cursor-pointer shrink-0"
            >
              {isTriggering === 'sync' ? 'Evaluating...' : 'Check Due'}
            </button>
          </div>

          <div className="p-3.5 bg-white border border-[#E8E8E5] rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-[#171717] block">Digest Scheduler</span>
              <span className="text-[11px] text-[#70706B]">Checks IANA timezone windows for weekly delivery</span>
            </div>
            <button
              onClick={handleManualDigestCheck}
              disabled={isTriggering === 'digest'}
              className="px-2.5 py-1.5 rounded-lg bg-[#F4F4F1] hover:bg-[#E8E8E5] text-xs font-medium text-[#171717] transition-colors cursor-pointer shrink-0"
            >
              {isTriggering === 'digest' ? 'Evaluating...' : 'Check Due'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#171717]">Recent Queue Executions</h3>
          <span className="text-xs text-[#8A8A85]">Showing last {recentJobs.length} jobs</span>
        </div>

        {recentJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8A8A85]">
            No jobs in queue yet. Jobs will appear here as automatic syncs, AI enrichment, and digest deliveries trigger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F0F0EC] text-[#8A8A85] font-medium">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Attempts</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Completed</th>
                  <th className="pb-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F1]">
                {recentJobs.map((job) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                      {job.status}
                    </span>
                  );
                  if (job.status === 'completed') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        completed
                      </span>
                    );
                  } else if (job.status === 'running') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 text-blue-800 animate-pulse">
                        running
                      </span>
                    );
                  } else if (job.status === 'failed') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-800">
                        failed
                      </span>
                    );
                  }

                  return (
                    <tr key={job.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="py-2.5 font-mono text-[11px] font-semibold text-[#171717]">
                        {job.type}
                      </td>
                      <td className="py-2.5">{statusBadge}</td>
                      <td className="py-2.5 text-[#70706B]">
                        {job.attempts} / {job.maxAttempts}
                      </td>
                      <td className="py-2.5 text-[#70706B]">
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 text-[#70706B]">
                        {job.completedAt
                          ? new Date(job.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '-'}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[10px] text-[#8A8A85]">
                        {job.lastErrorMessage ? (
                          <span className="text-rose-600 truncate max-w-xs block" title={job.lastErrorMessage}>
                            {job.lastErrorMessage}
                          </span>
                        ) : (
                          <span>Priority {job.priority}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Deliveries Log */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#171717]">Email Delivery History</h3>
            <p className="text-xs text-[#8A8A85]">Resend transactional delivery tracking for intelligence digests</p>
          </div>
          {digests.length > 0 && (
            <button
              onClick={() => handlePreviewEmail(digests[0].id)}
              className="px-3 py-1.5 rounded-xl bg-[#F4F4F1] hover:bg-[#E8E8E5] text-xs font-semibold text-[#171717] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#70706B]" />
              <span>Preview Latest Digest Email</span>
            </button>
          )}
        </div>

        {recentDeliveries.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8A8A85] bg-[#FAFAF8] rounded-xl border border-dashed border-[#E0E0DC]">
            No emails delivered yet. When weekly digests trigger or you click "Deliver via Email", deliveries are tracked here with provider response IDs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F0F0EC] text-[#8A8A85] font-medium">
                  <th className="pb-2">Recipient</th>
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Sent At</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F1]">
                {recentDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="py-2.5 font-medium text-[#171717]">{del.recipientEmail}</td>
                    <td className="py-2.5 font-mono text-[11px] text-[#70706B]">{del.provider}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {del.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#70706B]">
                      {del.sentAt ? new Date(del.sentAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handlePreviewEmail(del.digestId)}
                        className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Template</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {isPreviewOpen && previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden border border-[#E8E8E5]">
            <div className="p-4 border-b border-[#E8E8E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#171717]">Digest Email Preview</h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-xs font-semibold text-[#70706B] hover:text-[#171717] px-2.5 py-1 rounded-lg hover:bg-[#F4F4F1]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-4">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full h-[600px] border border-[#E0E0DC] rounded-xl bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
