
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  icon,
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  requirePassword = false,
  passwordValue,
  setPasswordValue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200 animate-slide-up">
        {icon && (
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-900/30 rounded-full mx-auto mb-4 animate-pulse">
            {icon}
          </div>
        )}

        <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
          {title}
        </h3>

        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          {message}
        </p>

        {requirePassword && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-200">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm with Password
            </label>
            <input
              type="password"
              value={passwordValue || ''}
              onChange={(e) => setPasswordValue && setPasswordValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter your password"
            />
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={requirePassword && !passwordValue}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
