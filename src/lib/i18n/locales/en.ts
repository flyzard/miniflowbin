export default {
  // Home
  'home.title': 'Product Restock',
  'home.subtitle': 'Select an operation',
  'home.receive': 'Receive',
  'home.receive.description': 'Add inventory to storage',
  'home.release': 'Release',
  'home.release.description': 'Move inventory out',

  // Common
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.confirm': 'Confirm',
  'common.loading': 'Loading...',

  // Receive Flow
  'receive.title': 'Receive Inventory',
  'receive.step1.name': 'Enter details',
  'receive.step2.name': 'Review and confirm',
  'receive.confirm.title': 'Confirm Receiving',
  'receive.success': 'Received {quantity} units of {name}',

  // Form labels
  'form.product': 'Product',
  'form.product.placeholder': 'Select a product...',
  'form.product.search': 'Search by name or SKU...',
  'form.quantity': 'Quantity',
  'form.position': 'Storage Position',
  'form.position.label': 'Position',
  'form.receiveDate': 'Receive Date',
  'form.batch': 'Batch #',
  'form.batch.generating': 'Generating...',

  // Errors
  'error.missing_data': 'Missing required data',
  'error.receive_failed': 'Failed to receive inventory',
  'error.release_failed': 'Failed to release inventory',
  'error.unexpected': 'An unexpected error occurred',

  // Release Flow
  'release.title': 'Release Inventory',
  'release.step1.name': 'Select product',
  'release.step2.title': 'Select Source Position',
  'release.step2.name': 'Choose where to pick from',
  'release.step3.title': 'Confirm Release',
  'release.step3.name': 'Review and confirm',
  'release.picking': 'Picking:',
  'release.full_batch': 'Full batch',
  'release.no_batches': 'No batches available for this product',
  'release.fifo_hint': 'Oldest batches shown first (FIFO)',
  'release.success': 'Released {quantity} units of {name}',
  'release.quantity_full_batch': '{quantity} (full batch)',
  'release.quantity_partial': '{quantity} of {total} (partial)',
  'release.quantity_label': 'Quantity to Release',
  'release.quantity_hint': 'Max: {max} units available',

  // Movement labels
  'movement.from': 'From',
  'movement.to': 'To',

  // Form (additional)
  'form.product.placeholder_inventory': 'Select a product with inventory...',

  // Auth - Activate
  'auth.activate.title': 'Activate Device',
  'auth.activate.subtitle': 'Sign in with your FlowBin account',
  'auth.activate.email': 'Email',
  'auth.activate.email.placeholder': 'your@email.com',
  'auth.activate.password': 'Password',
  'auth.activate.password.placeholder': 'Enter password',
  'auth.activate.device_name': 'Device Name',
  'auth.activate.device_name.placeholder': 'Warehouse Tablet #3',
  'auth.activate.optional': '(optional)',
  'auth.activate.button': 'Activate Device',
  'auth.activate.activating': 'Activating...',
  'auth.activate.api_not_configured': 'API not configured. Please set VITE_FLOWBIN_API_URL in your environment.',
  'auth.activate.clear_data_warning': 'This will clear any existing local data.',
  'auth.activate.no_account': "Don't have an account? Contact your administrator.",
  'auth.activate.enter_credentials': 'Please enter email and password',
  'auth.activate.language': 'Language',

  // Auth - Setup PIN
  'auth.pin.create_title': 'Create PIN',
  'auth.pin.create_subtitle': 'Enter a {min}-{max} digit PIN for quick access',
  'auth.pin.confirm_title': 'Confirm PIN',
  'auth.pin.confirm_subtitle': 'Enter your PIN again to confirm',
  'auth.pin.mismatch': 'PINs do not match. Try again.',
  'auth.pin.save_failed': 'Failed to save PIN',
  'auth.pin.activation_failed': 'Failed to complete activation',
  'auth.pin.user_not_found': 'User not found. Please activate device again.',

  // Auth - Biometric
  'auth.biometric.title': 'Enable Biometric?',
  'auth.biometric.subtitle': 'Use fingerprint or face recognition for faster login',
  'auth.biometric.enable': 'Enable Biometric',
  'auth.biometric.skip': 'Skip for Now',
  'auth.biometric.setting_up': 'Setting up...',
  'auth.biometric.failed': 'Failed to enable biometric. You can try again in settings.',
  'auth.biometric.use': 'Use Biometric',

  // Auth - Login
  'auth.login.enter_pin': 'Enter your PIN',
  'auth.login.signing_in': 'Signing in...',
  'auth.login.syncing': 'Syncing warehouse data...',
  'auth.login.locked': 'Account temporarily locked',
  'auth.login.try_again_at': 'Try again at {time}',
  'auth.login.attempts_remaining': '{count} attempt remaining',
  'auth.login.attempts_remaining_plural': '{count} attempts remaining',
  'auth.login.not_me': "It's not me",
  'auth.login.not_me_confirm': 'This will clear all data on this device and require re-activation. Continue?',

  // Auth - Locked
  'auth.locked.revoked_title': 'Device Revoked',
  'auth.locked.suspended_title': 'Device Suspended',
  'auth.locked.revoked_description': 'This device has been permanently revoked and can no longer access FlowBin. Contact your administrator for assistance.',
  'auth.locked.suspended_description': 'This device has been temporarily suspended. Contact your administrator to restore access.',
  'auth.locked.deactivate': 'Deactivate Device',
  'auth.locked.deactivate_confirm': 'This will remove all local data. Are you sure?',

  // Common (additional)
  'common.cancel': 'Cancel',
  'common.user_not_found': 'User not found',

  // Sync
  'sync.success': 'Synced',
  'sync.partial': 'Synced {synced}, {rejected} rejected',

  // Rejected Transactions Screen
  'sync.rejected.title': 'Rejected Transactions',
  'sync.rejected.subtitle': 'These transactions were not accepted by the server',
  'sync.rejected.empty': 'No rejected transactions',
  'sync.rejected.retry': 'Retry',
  'sync.rejected.retry_all': 'Retry All',
  'sync.rejected.retrying': 'Retrying...',
  'sync.rejected.reason': 'Reason: {error}',
  'sync.rejected.type.RECEIVE': 'Receive',
  'sync.rejected.type.RELEASE': 'Release',

  // Barcode Scanning
  'barcode.scan': 'Scan Barcode',
  'barcode.looking_up': 'Looking up product...',
  'barcode.not_found': 'No product found for barcode: {barcode}',
  'barcode.lookup_error': 'Failed to look up barcode',
  'barcode.camera_not_available': 'Camera not available',
  'barcode.manual_hint': 'Use a hardware scanner or enter barcode manually',
  'barcode.point_camera': 'Point camera at barcode',
  'barcode.retry': 'Retry',
} as const;
