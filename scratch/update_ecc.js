const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', '..', 'hcm_frontend', 'src', 'features', 'hr', 'ExitClearanceCenter.jsx');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

// 1. Ensure Mail and Send are imported from lucide-react
if (!content.includes('Mail,') && !content.includes(', Mail')) {
  content = content.replace(
    "  ShieldCheck, CheckSquare, XCircle, Info\n} from 'lucide-react';",
    "  ShieldCheck, CheckSquare, XCircle, Info, Mail, Send\n} from 'lucide-react';"
  );
}

// 2. Add isSubmittingTermination state
if (!content.includes('isSubmittingTermination')) {
  content = content.replace(
    "  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);",
    "  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);\n  const [isSubmittingTermination, setIsSubmittingTermination] = useState(false);"
  );
}

// 3. Update terminateData default state to include email flags
const oldTerminateDataState = `  const [terminateData, setTerminateData] = useState({
    employeeId: '',
    exitType: 'TERMINATION',
    reason: '',
    lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  });`;

const newTerminateDataState = `  const [terminateData, setTerminateData] = useState({
    employeeId: '',
    exitType: 'TERMINATION',
    reason: '',
    lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    sendNoticeEmail: true,
    notifyManager: true
  });`;

content = content.replace(oldTerminateDataState, newTerminateDataState);

// 4. Update handleInitiateTermination
const oldHandleInit = `  const handleInitiateTermination = async (e) => {
    e.preventDefault();
    if (!terminateData.employeeId || !terminateData.lastWorkingDay) {
      showToast('Please select an employee and last working day', 'error');
      return;
    }
    const res = await initiateTermination(terminateData);
    if (res?.success) {
      setIsTerminateModalOpen(false);
      setTerminateData({
        employeeId: '',
        exitType: 'TERMINATION',
        reason: '',
        lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
      });
      if (refetch?.fetchExits) await refetch.fetchExits();
      if (refetch?.fetchEmployees) await refetch.fetchEmployees();
    }
  };`;

const newHandleInit = `  const handleInitiateTermination = async (e) => {
    e.preventDefault();
    if (!terminateData.employeeId || !terminateData.lastWorkingDay) {
      showToast('Please select an employee and last working day', 'error');
      return;
    }
    setIsSubmittingTermination(true);
    try {
      const res = await initiateTermination({
        ...terminateData,
        sendNoticeEmail: terminateData.sendNoticeEmail !== false,
        notifyManager: terminateData.notifyManager !== false
      });
      if (res?.success) {
        setIsTerminateModalOpen(false);
        setTerminateData({
          employeeId: '',
          exitType: 'TERMINATION',
          reason: '',
          lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
          sendNoticeEmail: true,
          notifyManager: true
        });
        if (refetch?.fetchExits) await refetch.fetchExits();
        if (refetch?.fetchEmployees) await refetch.fetchEmployees();
      }
    } finally {
      setIsSubmittingTermination(false);
    }
  };`;

content = content.replace(oldHandleInit, newHandleInit);

// 5. Replace Modal Form JSX
const oldModalFormRegex = /<form onSubmit=\{handleInitiateTermination\} className="p-5 sm:p-6 space-y-4 text-left">[\s\S]*?<\/form>/;

const newModalForm = `<form onSubmit={handleInitiateTermination} className="p-5 sm:p-6 space-y-4 text-left">
                {/* Employee Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={terminateData.employeeId}
                    onChange={e => setTerminateData({ ...terminateData, employeeId: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">Choose employee...</option>
                    {employees
                      .filter(emp => !['TERMINATED', 'ON_NOTICE'].includes(emp.lifecycleStatus))
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName || emp.name} ({emp.employeeId || 'No ID'}) — {emp.department?.name || 'General'}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Selected Employee Info Preview */}
                {(() => {
                  const selectedEmp = employees.find(e => e.id === terminateData.employeeId);
                  if (!selectedEmp) return null;
                  const empEmail = selectedEmp.user?.email || selectedEmp.email;
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-200 font-semibold">
                        <span>{selectedEmp.fullName || selectedEmp.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          {selectedEmp.employeeId || 'ID Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Mail size={13} className="text-primary-500" />
                        <span>Notice email destination: <strong>{empEmail || 'No email attached'}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Exit Type
                    </label>
                    <select
                      value={terminateData.exitType}
                      onChange={e => setTerminateData({ ...terminateData, exitType: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="TERMINATION">Termination</option>
                      <option value="RESIGNATION">Resignation</option>
                      <option value="RETIREMENT">Retirement</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Scheduled Last Working Day (LWD) <span className="text-rose-500">*</span>
                    </label>
                    <DatePicker
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      value={terminateData.lastWorkingDay}
                      onChange={val => setTerminateData({ ...terminateData, lastWorkingDay: typeof val === 'string' ? val : val?.target?.value || '' })}
                    />
                  </div>
                </div>

                {/* Date schedule indicator */}
                {terminateData.lastWorkingDay && (
                  <div className={cn(
                    "p-3 rounded-xl text-xs flex items-start gap-2.5 border",
                    new Date(terminateData.lastWorkingDay) > new Date()
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
                  )}>
                    <Calendar size={15} className="mt-0.5 shrink-0" />
                    <div>
                      {new Date(terminateData.lastWorkingDay) > new Date() ? (
                        <span>
                          <strong>Scheduled Notice Period:</strong> Employee remains active until <strong>{formatDate(terminateData.lastWorkingDay)}</strong>. System will automatically relieve and deactivate their login at the end of that day.
                        </span>
                      ) : (
                        <span>
                          <strong>Immediate Termination:</strong> Scheduled date is today or earlier. Employee account and access will be concluded immediately upon confirmation.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason & Clearance Instructions <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide details regarding the offboarding, handover expectations, and settlement notes..."
                    value={terminateData.reason}
                    onChange={e => setTerminateData({ ...terminateData, reason: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                {/* Automatic Email Notification Options */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Send size={13} className="text-primary-500" />
                    <span>Automated Dispatch Settings</span>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={terminateData.sendNoticeEmail !== false}
                      onChange={e => setTerminateData({ ...terminateData, sendNoticeEmail: e.target.checked })}
                      className="mt-0.5 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Send formal termination notice letter to employee's email</span>
                      <p className="text-[11px] text-slate-400">Includes company notice, effective date, handover checklist, asset return steps, and HR contact.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={terminateData.notifyManager !== false}
                      onChange={e => setTerminateData({ ...terminateData, notifyManager: e.target.checked })}
                      className="mt-0.5 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Send advisory notification to reporting manager</span>
                      <p className="text-[11px] text-slate-400">Alerts the manager to schedule knowledge transfer and project reassignments.</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsTerminateModalOpen(false)}
                    className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTermination}
                    className="h-10 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-all active:scale-95 shadow-sm shadow-primary-500/20 cursor-pointer"
                  >
                    <UserMinus size={16} />
                    <span>{isSubmittingTermination ? 'Processing...' : (new Date(terminateData.lastWorkingDay) > new Date() ? 'Schedule & Send Email' : 'Terminate & Send Email')}</span>
                  </button>
                </div>
              </form>`;

if (!oldModalFormRegex.test(content)) {
  console.error('Failed to match old modal form regex in ExitClearanceCenter.jsx!');
  process.exit(1);
}

content = content.replace(oldModalFormRegex, newModalForm);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ExitClearanceCenter.jsx!');

