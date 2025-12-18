export default {
  // Home
  'home.title': 'Reabastecimento',
  'home.subtitle': 'Selecione uma operação',
  'home.receive': 'Receber',
  'home.receive.description': 'Adicionar inventário ao armazém',
  'home.release': 'Liberar',
  'home.release.description': 'Retirar inventário',

  // Common
  'common.continue': 'Continuar',
  'common.back': 'Voltar',
  'common.confirm': 'Confirmar',
  'common.loading': 'Carregando...',

  // Receive Flow
  'receive.title': 'Receber Inventário',
  'receive.step1.name': 'Inserir detalhes',
  'receive.step2.name': 'Revisar e confirmar',
  'receive.confirm.title': 'Confirmar Recebimento',
  'receive.success': 'Recebido {quantity} unidades de {name}',

  // Form labels
  'form.product': 'Produto',
  'form.product.placeholder': 'Selecione um produto...',
  'form.product.search': 'Buscar por nome ou SKU...',
  'form.quantity': 'Quantidade',
  'form.position': 'Posição de Armazenamento',
  'form.position.label': 'Posição',
  'form.batch': 'Lote #',
  'form.batch.generating': 'Gerando...',

  // Errors
  'error.missing_data': 'Dados obrigatórios ausentes',
  'error.receive_failed': 'Falha ao receber inventário',
  'error.release_failed': 'Falha ao liberar inventário',
  'error.unexpected': 'Ocorreu um erro inesperado',

  // Release Flow
  'release.title': 'Liberar Inventário',
  'release.step1.name': 'Selecionar produto',
  'release.step2.title': 'Selecionar Posição de Origem',
  'release.step2.name': 'Escolher de onde retirar',
  'release.step3.title': 'Confirmar Liberação',
  'release.step3.name': 'Revisar e confirmar',
  'release.picking': 'Retirando:',
  'release.full_batch': 'Lote completo',
  'release.no_batches': 'Nenhum lote disponível para este produto',
  'release.fifo_hint': 'Lotes mais antigos primeiro (FIFO)',
  'release.success': 'Liberado {quantity} unidades de {name}',
  'release.quantity_full_batch': '{quantity} (lote completo)',

  // Movement labels
  'movement.from': 'De',
  'movement.to': 'Para',

  // Form (additional)
  'form.product.placeholder_inventory': 'Selecione um produto com inventário...',

  // Auth - Activate
  'auth.activate.title': 'Ativar Dispositivo',
  'auth.activate.subtitle': 'Entre com sua conta FlowBin',
  'auth.activate.email': 'Email',
  'auth.activate.email.placeholder': 'seu@email.com',
  'auth.activate.password': 'Senha',
  'auth.activate.password.placeholder': 'Digite a senha',
  'auth.activate.device_name': 'Nome do Dispositivo',
  'auth.activate.device_name.placeholder': 'Tablet Armazém #3',
  'auth.activate.optional': '(opcional)',
  'auth.activate.button': 'Ativar Dispositivo',
  'auth.activate.activating': 'Ativando...',
  'auth.activate.api_not_configured': 'API não configurada. Por favor, defina VITE_FLOWBIN_API_URL no seu ambiente.',
  'auth.activate.clear_data_warning': 'Isso irá apagar todos os dados locais existentes.',
  'auth.activate.no_account': 'Não tem uma conta? Contate seu administrador.',
  'auth.activate.enter_credentials': 'Por favor, insira email e senha',
  'auth.activate.language': 'Idioma',

  // Auth - Setup PIN
  'auth.pin.create_title': 'Criar PIN',
  'auth.pin.create_subtitle': 'Digite um PIN de {min}-{max} dígitos para acesso rápido',
  'auth.pin.confirm_title': 'Confirmar PIN',
  'auth.pin.confirm_subtitle': 'Digite seu PIN novamente para confirmar',
  'auth.pin.mismatch': 'Os PINs não coincidem. Tente novamente.',
  'auth.pin.save_failed': 'Falha ao salvar PIN',
  'auth.pin.activation_failed': 'Falha ao completar ativação',
  'auth.pin.user_not_found': 'Usuário não encontrado. Por favor, ative o dispositivo novamente.',

  // Auth - Biometric
  'auth.biometric.title': 'Ativar Biometria?',
  'auth.biometric.subtitle': 'Use impressão digital ou reconhecimento facial para login mais rápido',
  'auth.biometric.enable': 'Ativar Biometria',
  'auth.biometric.skip': 'Pular por Agora',
  'auth.biometric.setting_up': 'Configurando...',
  'auth.biometric.failed': 'Falha ao ativar biometria. Você pode tentar novamente nas configurações.',
  'auth.biometric.use': 'Usar Biometria',

  // Auth - Login
  'auth.login.enter_pin': 'Digite seu PIN',
  'auth.login.signing_in': 'Entrando...',
  'auth.login.syncing': 'Sincronizando dados do armazém...',
  'auth.login.locked': 'Conta temporariamente bloqueada',
  'auth.login.try_again_at': 'Tente novamente às {time}',
  'auth.login.attempts_remaining': '{count} tentativa restante',
  'auth.login.attempts_remaining_plural': '{count} tentativas restantes',
  'auth.login.not_me': 'Não sou eu',
  'auth.login.not_me_confirm': 'Isso irá apagar todos os dados deste dispositivo e exigir reativação. Continuar?',

  // Auth - Locked
  'auth.locked.revoked_title': 'Dispositivo Revogado',
  'auth.locked.suspended_title': 'Dispositivo Suspenso',
  'auth.locked.revoked_description': 'Este dispositivo foi permanentemente revogado e não pode mais acessar o FlowBin. Contate seu administrador para assistência.',
  'auth.locked.suspended_description': 'Este dispositivo foi temporariamente suspenso. Contate seu administrador para restaurar o acesso.',
  'auth.locked.deactivate': 'Desativar Dispositivo',
  'auth.locked.deactivate_confirm': 'Isso irá remover todos os dados locais. Tem certeza?',

  // Common (additional)
  'common.cancel': 'Cancelar',
  'common.user_not_found': 'Usuário não encontrado',

  // Sync
  'sync.success': 'Sincronizado',
  'sync.partial': 'Sincronizado {synced}, {rejected} rejeitadas',

  // Rejected Transactions Screen
  'sync.rejected.title': 'Transações Rejeitadas',
  'sync.rejected.subtitle': 'Estas transações não foram aceitas pelo servidor',
  'sync.rejected.empty': 'Nenhuma transação rejeitada',
  'sync.rejected.retry': 'Tentar',
  'sync.rejected.retry_all': 'Tentar Todas',
  'sync.rejected.retrying': 'Tentando...',
  'sync.rejected.reason': 'Motivo: {error}',
  'sync.rejected.type.RECEIVE': 'Recebimento',
  'sync.rejected.type.RELEASE': 'Liberação',
} as const;
