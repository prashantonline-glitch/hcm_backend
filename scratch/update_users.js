const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', '..', 'hcm_frontend', 'src', 'features', 'admin', 'Users.jsx');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

// 1. Add UserMinus to lucide-react import
if (!content.includes('UserMinus')) {
  content = content.replace(
    "  AlertCircle\n} from 'lucide-react';",
    "  AlertCircle,\n  UserMinus\n} from 'lucide-react';"
  );
}

// 2. Add hrAPI and DatePicker imports
if (!content.includes('hrAPI')) {
  content = content.replace(
    "import ConfirmDialog from './components/ConfirmDialog';",
    "import ConfirmDialog from './components/ConfirmDialog';\nimport { hrAPI } from '../../utils/apiService';\nimport DatePicker from '../../shared/components/common/DatePicker';"
  );
}

// 3. Add states for termination
if (!content.includes('userToTerminate')) {
  content = content.replace(
    "  const [userToDelete, setUserToDelete] = useState(null);",
    "  const [userToDelete, setUserToDelete] = useState(null);\n  const [userToTerminate, setUserToTerminate] = useState(null);\n  const [termData, setTermData] = useState({\n    lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],\n    reason: '',\n    sendNoticeEmail: true,\n    notifyManager: true\n  });\n  const [isSubmittingTerm, setIsSubmittingTerm] = useState(false);"
  );
}

// 4. Update table view ActionDropdown
const oldTableActions = `                                  hasPermission('delete') ? { 
                                    label: 'Delete Employee', 
                                    icon: Trash2, 
                                    danger: true, 
                                    onClick: () => setUserToDelete(user) 
                                  } : null`;

const newTableActions = `                                  (user.status !== 'Terminated' && hasPermission('edit')) ? {
                                    label: 'Schedule Termination',
                                    icon: UserMinus,
                                    danger: true,
                                    onClick: () => {
                                      setUserToTerminate(user);
                                      setTermData({
                                        lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
                                        reason: '',
                                        sendNoticeEmail: true,
                                        notifyManager: true
                                      });
                                    }
                                  } : null,
                                  hasPermission('delete') ? { 
                                    label: 'Delete Employee', 
                                    icon: Trash2, 
                                    danger: true, 
                                    onClick: () => setUserToDelete(user) 
                                  } : null`;

content = content.replace(oldTableActions, newTableActions);

// 5. Update grid view ActionDropdown
const oldGridActions = `                          hasPermission('delete') ? { 
                            label: 'Delete Employee', 
                            icon: Trash2, 
                            danger: true, 
                            onClick: () => setUserToDelete(user) 
                          } : null`;

const newGridActions = `                          (user.status !== 'Terminated' && hasPermission('edit')) ? {
                            label: 'Schedule Termination',
                            icon: UserMinus,
                            danger: true,
                            onClick: () => {
                              setUserToTerminate(user);
                              setTermData({
                                lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
                                reason: '',
                                sendNoticeEmail: true,
                                notifyManager: true
                              });
                            }
                          } : null,
                          hasPermission('delete') ? { 
                            label: 'Delete Employee', 
                            icon: Trash2, 
                            danger: true, 
                            onClick: () => setUserToDelete(user) 
                          } : null`;

content = content.replace(oldGridActions, newGridActions);

// 6. Add ScheduleTerminationModal before ConfirmDialog closing
const terminationModalMarkup = `      {/* Schedule Termination Modal */}
      <AnimatePresence>
        {userToTerminate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Schedule Employee Termination
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Schedule effective last day and trigger automated email notification
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUserToTerminate(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!termData.lastWorkingDay) {
                  showToast('Please select a last working day', 'error');
                  return;
                }
                setIsSubmittingTerm(true);
                try {
                  const payload = {
                    employeeId: userToTerminate.employeeProfile?.id || userToTerminate.id,
                    lastWorkingDay: termData.lastWorkingDay,
                    reason: termData.reason || 'Scheduled termination initiated from Employee Directory.',
                    sendNoticeEmail: termData.sendNoticeEmail !== false,
                    notifyManager: termData.notifyManager !== false
                  };
                  const res = await hrAPI.initiateTermination(payload);
                  showToast(res.data?.message || 'Termination scheduled successfully!');
                  setUserToTerminate(null);
                  await fetchUsers();
                } catch (err) {
                  const msg = err.response?.data?.error?.message || err.message || 'Failed to schedule termination';
                  showToast(msg, 'error');
                } finally {
                  setIsSubmittingTerm(false);
                }
              }} className="p-5 sm:p-6 space-y-4 text-left">
                {/* Employee Preview Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-100">
                    <span>{userToTerminate.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                      {userToTerminate.empId || 'ID Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Mail size={13} className="text-primary-500" />
                    <span>Destination: <strong>{userToTerminate.email}</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Department: {userToTerminate.dept || 'General'} • Role: {userToTerminate.role}
                  </div>
                </div>

                {/* Scheduled Last Working Day */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Scheduled Last Working Day (LWD) <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    value={termData.lastWorkingDay}
                    onChange={val => setTermData({ ...termData, lastWorkingDay: typeof val === 'string' ? val : val?.target?.value || '' })}
                  />
                </div>

                {/* Schedule condition badge */}
                {termData.lastWorkingDay && (
                  <div className={cn(
                    "p-3 rounded-xl text-xs flex items-start gap-2.5 border",
                    new Date(termData.lastWorkingDay) > new Date()
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
                  )}>
                    <Calendar size={15} className="mt-0.5 shrink-0" />
                    <div>
                      {new Date(termData.lastWorkingDay) > new Date() ? (
                        <span>
                          <strong>Scheduled Notice:</strong> Remains active until <strong>{termData.lastWorkingDay}</strong>. The system will automatically relieve and deactivate this account on that date.
                        </span>
                      ) : (
                        <span>
                          <strong>Immediate Termination:</strong> Date is today or earlier. The account will be deactivated immediately upon submission.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason & Clearance Instructions <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide details regarding the offboarding and handover requirements..."
                    value={termData.reason}
                    onChange={e => setTermData({ ...termData, reason: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                {/* Email dispatch options */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Send size={13} className="text-primary-500" />
                    <span>Automated Email Dispatch</span>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termData.sendNoticeEmail !== false}
                      onChange={e => setTermData({ ...termData, sendNoticeEmail: e.target.checked })}
                      className="mt-0.5 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Send formal termination notice letter to employee email</span>
                      <p className="text-[11px] text-slate-400">Includes company notice, effective date, handover checklist, asset return steps, and HR contact.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termData.notifyManager !== false}
                      onChange={e => setTermData({ ...termData, notifyManager: e.target.checked })}
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
                    onClick={() => setUserToTerminate(null)}
                    className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTerm}
                    className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-all active:scale-95 shadow-sm shadow-rose-500/20 cursor-pointer"
                  >
                    <UserMinus size={16} />
                    <span>{isSubmittingTerm ? 'Processing...' : (new Date(termData.lastWorkingDay) > new Date() ? 'Schedule & Send Email' : 'Terminate & Send Email')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog`;

content = content.replace('      <ConfirmDialog', terminationModalMarkup);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated Users.jsx!');

