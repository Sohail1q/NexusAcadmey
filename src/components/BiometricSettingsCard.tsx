import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
  UploadCloud,
  DownloadCloud,
  Cpu,
  RefreshCw,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { NexusStudent } from '../types';

interface BiometricSettingsCardProps {
  students?: NexusStudent[];
  initialConnected?: boolean;
  onToggleConnection?: (connected: boolean) => void;
  onNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function BiometricSettingsCard({
  students,
  initialConnected,
  onToggleConnection,
  onNotification,
}: BiometricSettingsCardProps = {}) {
  const [isBiometricConnected, setIsBiometricConnected] = useState<boolean>(() => {
    if (typeof initialConnected === 'boolean') return initialConnected;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexus_biometric_connected');
      return stored === 'true';
    }
    return false;
  });

  const [testBioId, setTestBioId] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<{
    loading: boolean;
    result?: { success: boolean; message: string; status?: string; studentName?: string };
  }>({ loading: false });

  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    type?: 'push' | 'import' | 'pull';
    message?: string;
    count?: number;
    pulledNewIds?: string[];
  }>({ loading: false });

  const [deviceStudents, setDeviceStudents] = useState<Array<{ id: string; name: string; biometricId: string }>>([]);
  const [pulledNewIds, setPulledNewIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load students with biometric IDs
  const loadDeviceStudents = async () => {
    try {
      const res = await fetch('/api/biometric/device/students');
      if (res.ok) {
        const data = await res.json();
        if (data.students) {
          setDeviceStudents(data.students);
        }
      }
    } catch {
      // Fallback to local students prop if API offline
      if (students) {
        const list = students
          .filter((s) => s.biometricId && s.biometricId.trim().length > 0)
          .map((s) => ({ id: s.id, name: s.name, biometricId: s.biometricId! }));
        setDeviceStudents(list);
      }
    }
  };

  useEffect(() => {
    if (typeof initialConnected === 'boolean') {
      setIsBiometricConnected(initialConnected);
    }
  }, [initialConnected]);

  useEffect(() => {
    if (isBiometricConnected) {
      loadDeviceStudents();
    }
  }, [isBiometricConnected, students]);

  const handleToggleBiometric = () => {
    const nextState = !isBiometricConnected;
    setIsBiometricConnected(nextState);

    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_biometric_connected', String(nextState));
    }

    if (onToggleConnection) {
      onToggleConnection(nextState);
    }

    if (onNotification) {
      onNotification(
        nextState
          ? 'Biometric Attendance Scanner connected & active for time-window verification.'
          : 'Biometric Attendance Scanner disconnected.',
        nextState ? 'success' : 'info'
      );
    }
  };

  // Push all valid biometric students directly to physical scanner connected to PC
  const handlePushToDevice = async () => {
    setSyncStatus({ loading: true, type: 'push' });
    try {
      const res = await fetch('/api/biometric/device/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSyncStatus({
        loading: false,
        type: 'push',
        message: data.message || `Successfully pushed student keys to device.`,
        count: data.pushedCount,
      });
      loadDeviceStudents();
      if (onNotification) {
        onNotification(data.message || `Biometric keys pushed to physical device!`, 'success');
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        type: 'push',
        message: err.message || 'Error communicating with physical device',
      });
      if (onNotification) {
        onNotification('Failed to push records to physical biometric device', 'error');
      }
    }
  };

  // Import registered templates / scans from connected physical device
  const handleImportFromDevice = async () => {
    setSyncStatus({ loading: true, type: 'import' });
    try {
      const res = await fetch('/api/biometric/device/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const newIds = data.newHardwareIds || [];
      if (newIds.length > 0) {
        setPulledNewIds(newIds);
      }
      setSyncStatus({
        loading: false,
        type: 'import',
        message: data.message || `Read ${data.importedCount || 0} templates from device.`,
        count: data.importedCount,
        pulledNewIds: newIds,
      });
      loadDeviceStudents();
      if (onNotification) {
        onNotification(data.message || 'Imported biometric logs from device!', 'success');
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        type: 'import',
        message: err.message || 'Device communication error',
      });
      if (onNotification) {
        onNotification('Failed to import records from physical biometric device', 'error');
      }
    }
  };

  // Pull newly created user IDs directly from physical hardware (e.g. ID "1111")
  const handlePullNewIdsFromDevice = async () => {
    setSyncStatus({ loading: true, type: 'pull' });
    try {
      const res = await fetch('/api/biometric/device/pull-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const newIds = data.newHardwareIds || [];
      setPulledNewIds(newIds);
      setSyncStatus({
        loading: false,
        type: 'pull',
        message: data.message || `Pulled IDs from device.`,
        count: newIds.length,
        pulledNewIds: newIds,
      });
      loadDeviceStudents();
      if (onNotification) {
        onNotification(
          data.message || `Fetched new hardware user IDs from connected biometric scanner!`,
          'success'
        );
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        type: 'pull',
        message: err.message || 'Hardware communication error',
      });
      if (onNotification) {
        onNotification('Failed to pull user IDs from physical device', 'error');
      }
    }
  };

  const handleTestScan = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!testBioId.trim()) return;

    setScanStatus({ loading: true });
    try {
      const res = await fetch('/api/biometric/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biometricId: testBioId.trim() }),
      });
      const data = await res.json();
      setScanStatus({ loading: false, result: data });
      if (onNotification) {
        onNotification(
          data.message || (data.success ? 'Biometric scan verified!' : 'Scan failed'),
          data.success ? 'success' : 'error'
        );
      }
    } catch (err: any) {
      setScanStatus({
        loading: false,
        result: { success: false, message: err.message || 'Failed to communicate with scanner API' },
      });
      if (onNotification) {
        onNotification('Scanner API communication error', 'error');
      }
    }
  };

  const activeCount =
    deviceStudents.length > 0
      ? deviceStudents.length
      : (students || []).filter((s) => s.biometricId && s.biometricId.trim().length > 0).length;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isBiometricConnected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              Biometric Attendance Scanner
              {isBiometricConnected && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Connected &amp; Active
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {isBiometricConnected
                ? 'Status: Connected & Active for automated time-window verification.'
                : 'Status: Disconnected. Click to link fingerprint scanners.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleBiometric}
          className={`px-5 py-2.5 rounded-lg font-medium text-white transition-all shadow-md cursor-pointer shrink-0 ${
            isBiometricConnected
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isBiometricConnected ? 'Disconnect' : 'Connect Biometric'}
        </button>
      </div>

      {/* Connected Physical Device Actions & Scanner Controls */}
      {isBiometricConnected && (
        <div className="pt-3 border-t border-slate-100 space-y-3.5">
          {/* Push and Import Device Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  Physical Scanner Interface (USB / Serial / Network)
                </span>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {activeCount} Student{activeCount === 1 ? '' : 's'} with Biometric ID
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePushToDevice}
                  disabled={syncStatus.loading}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Push and import all student records that have a valid biometricId directly into the physical device"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {syncStatus.loading && syncStatus.type === 'push' ? 'Pushing...' : 'Push Students to Device'}
                </button>
                <button
                  type="button"
                  onClick={handleImportFromDevice}
                  disabled={syncStatus.loading}
                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Import registered template scans from connected physical device"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  {syncStatus.loading && syncStatus.type === 'import' ? 'Importing...' : 'Import from Device'}
                </button>
                <button
                  type="button"
                  onClick={handlePullNewIdsFromDevice}
                  disabled={syncStatus.loading}
                  className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Fetch newly created user IDs (like ID '1111') directly from the physical hardware into the software directory"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.loading && syncStatus.type === 'pull' ? 'animate-spin' : ''}`} />
                  {syncStatus.loading && syncStatus.type === 'pull' ? 'Fetching IDs...' : 'Pull New IDs From Device'}
                </button>
              </div>
            </div>

            {syncStatus.message && (
              <div className="p-2.5 rounded bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatus.message}</span>
              </div>
            )}

            {/* Display Newly Pulled Hardware IDs (e.g. ID "1111") */}
            {pulledNewIds.length > 0 && (
              <div className="p-3 rounded-lg bg-indigo-50/80 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
                    Newly Pulled Hardware Device IDs ({pulledNewIds.length})
                  </span>
                  <span className="text-[11px] text-indigo-700 font-medium">Ready to assign</span>
                </div>
                <p className="text-[11px] text-indigo-800">
                  The following user ID slots were created directly on the physical hardware keypad/sensor. Click any ID to copy and paste it into the student's <strong>Edit Student</strong> modal:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {pulledNewIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(id);
                        setCopiedId(id);
                        if (onNotification) {
                          onNotification(`Copied Device ID "${id}" to clipboard! You can paste it into the Edit modal.`, 'success');
                        }
                        setTimeout(() => setCopiedId(null), 2500);
                      }}
                      className="px-2.5 py-1 rounded bg-white border border-indigo-300 hover:border-indigo-500 text-xs font-mono font-bold text-indigo-900 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-indigo-50 transition"
                      title={`Copy ID ${id} to clipboard`}
                    >
                      <span>ID: <strong>{id}</strong></span>
                      {copiedId === id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Students self-registered without a biometric ID can be given a token anytime in the <strong>Edit Student</strong> modal. Pushing sends all assigned tokens directly into the scanner memory slots.
            </p>
          </div>

          {/* Biometric Verification Diagnostic & Live Scanner Simulator */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Automated Time-Window Scanner Endpoint: <code className="text-blue-700 font-mono bg-blue-50 px-1 py-0.5 rounded">POST /api/biometric/scan</code>
            </div>
            <p>
              When a student scans their fingerprint key, the system checks their class schedule. If scanned within window (up to 10 min early until class end), they are marked <strong>Present</strong>; if late after class ends, marked <strong>Absent</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={testBioId}
                onChange={(e) => setTestBioId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTestScan(e);
                  }
                }}
                placeholder="Test Biometric ID (e.g. BIO-101)..."
                className="h-8 px-2.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-blue-600 font-mono w-56"
              />
              <button
                type="button"
                onClick={() => handleTestScan()}
                disabled={scanStatus.loading || !testBioId.trim()}
                className="h-8 px-3 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                {scanStatus.loading ? 'Scanning...' : 'Test Device Scan'}
              </button>
              {scanStatus.result && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded inline-flex items-center gap-1 ${
                    scanStatus.result.success
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {scanStatus.result.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  )}
                  {scanStatus.result.message}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
