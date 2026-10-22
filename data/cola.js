window.COLA = {
  jfl: {
    titulo: 'Cola Vegas — JFL Active',
    aplica: ['active'],
    intro: 'Valores padrão Vegas para programação das centrais JFL Active. Senha do instalador: 299.',
    grupos: [
      { titulo: 'Zonas', itens: [
        ['001 a 099', 'Tipo da zona', '00 Desabilitada · 10 Imediata · 11 Entrada/Saída 1 · 12 Entrada/Saída 2 · 13 Seguidora · 14 24h · 15 Ronda · 16 Pânico · 19 Tamper'],
        ['100xx', 'Número da partição (central BUS)', '01 (padrão)'],
        ['101 a 199', 'Atributos da zona — ARM A', '1 a 4 Partições A–D · 5 Stay · 6 Inteligente · 7 Silenciosa · 8 Auto anulável · 9 Permite inibir'],
        ['101 a 199', 'Atributos da zona — ARM B', 'Sirene intermitente · Reporta inatividade · Sensibilidade sem fio (2 mín, 3 média, 4 máx) · 5 Chime · 6 Aviso porta aberta'],
        ['601 a 699', 'Nome da zona', 'Texto livre']
      ]},
      { titulo: 'Usuários e senhas', itens: [
        ['200', 'Senha do mestre', 'Número do cliente'],
        ['201 a 298', 'Senhas dos usuários', 'Conforme cliente'],
        ['299', 'Senha do instalador', '5225', 1],
        ['300', 'Permissões', '1 Programação · 2 Arme · 3 Desarme · 4 PGM · 5 Inibir zonas'],
        ['301 a 398', 'Atributos dos usuários', 'Armar partições, AWAY, ronda, PGM, eletrificador'],
        ['900 a 998', 'Nome dos usuários', 'Texto livre']
      ]},
      { titulo: 'Tempos', itens: [
        ['400', 'Trava de reset', '159 trava · 000 não trava (padrão)'],
        ['401 e 411', 'Tempo de entrada 1 e 2', '060 s'],
        ['402 e 412', 'Tempo de saída 1 e 2', '060 s'],
        ['403 e 413', 'Tempo de sirene 1 e 2 (partições A/B)', '005 min'],
        ['425', 'Tempo de zona inteligente', '060 s'],
        ['426', 'Tempo de falta de AC', '001 min'],
        ['427', 'Intervalo de autoteste', '004 h (padrão Vegas; fábrica 000)'],
        ['428', 'Tempo de falta de linha telefônica', '005 min'],
        ['429 a 431', 'Expiração de senhas temporárias', '000 dias'],
        ['432', 'Intervalo de ronda', '000 min'],
        ['433', 'Duração da ronda', '000 min'],
        ['434', 'Intervalo de autoteste do meio secundário', '000 h'],
        ['435', 'Porta aberta', '005 min'],
        ['436', 'Inatividade de zona', '000 h']
      ]},
      { titulo: 'Horários', itens: [
        ['500', 'Data/hora automáticas', '03 (Brasília, sem horário de verão)'],
        ['501', 'Hora', 'HH:MM:SS'],
        ['502', 'Data', 'DD/MM/AA'],
        ['503', 'Primeiro autoteste', 'HH:MM'],
        ['506 / 507', 'Início / término da ronda', 'HH:MM'],
        ['508 / 509', 'Arme por não movimento', 'HH:MM'],
        ['511 a 514', 'Tempo de acionamento da PGM', ''],
        ['515 a 518', 'Horário de acionamento da PGM', 'HH:MM'],
        ['521 a 524', 'Auto arme das partições', 'HH:MM']
      ]},
      { titulo: 'Comunicação', itens: [
        ['700', 'Opções de reporte', '2 4G · 3 Ethernet · 7 Inverter prioridade · 8 Modo duplo · 9 DHCP'],
        ['701', 'Acesso remoto', 'SMS, telefone, app, nuvem, notificações'],
        ['702 / 703', 'IP/DNS de destino — Volta Redonda', 'vegasvigilancia.ddns.net / vegasvigilancia.dyndns.org', 1],
        ['702 / 703', 'IP/DNS de destino — Niterói', 'vnt.dyndns.org / vegasvigilancia.dyndns.org', 1],
        ['704 / 705', 'Conta das partições', 'Conta do cliente'],
        ['706 / 707', 'Porta IP1 / IP2', '3006 / 3009', 1],
        ['710', 'Notificações', 'Arme, desarme, alarmes, PGM, eventos'],
        ['720', 'Bloqueios do app', ''],
        ['722 a 724', 'APN / usuário / senha — Link Solutions', 'linksolutions.br / link / link', 1],
        ['722 a 724', 'APN / usuário / senha — Allcom', 'allcom.br / allcom / allcom', 1],
        ['740 a 743', 'Rede IP', 'IP, máscara, gateway, DNS'],
        ['746 / 747', 'Wi-Fi', 'SSID e senha do cliente']
      ]},
      { titulo: 'Opções gerais e de teclado', itens: [
        ['800', 'Dígito de coação (somente no desarme)', '0 (padrão)'],
        ['801', 'Opções gerais', 'Senha 6 dígitos, arme rápido, supervisão de teclado, bips, bloqueio após erros'],
        ['803', 'Eventos de reporte', 'PGM, pânico, ronda, rede IP'],
        ['804', 'Zonas com fio', '1 EOL · 2 Tamper · 3 Zonas duplas'],
        ['805', 'Pânico / emergência', 'Pânico (1+3) · Médica (4+6) · Incêndio (7+9) · sirene habilitada'],
        ['806', 'Sensores sem fio', 'Falha, tamper, supervisão, inibir'],
        ['807', 'Barramento', 'Falha, tamper, supervisão'],
        ['810', 'Endereçamento de teclados', '01 a 04'],
        ['811 a 814', 'Opções de teclado', 'Partições, arme rápido, bips']
      ]},
      { titulo: 'Saídas PGM — 821 a 824 (valores conforme manual)', itens: [
        ['00', 'Desabilitada', ''], ['01', 'Aciona junto com a sirene', ''], ['02 a 04', 'Sirene para partição B, C e D', ''],
        ['05', 'Aciona junto com o arme total', ''], ['06 a 09', 'Aciona junto com o arme da partição', ''],
        ['10', 'Aciona quando houver problema no sistema', ''], ['11', 'Aciona e desaciona no horário programado', ''],
        ['12', 'Com retenção, acionada pelo usuário', ''], ['13', 'Sem retenção, acionada pelo usuário', ''],
        ['14', 'Sem retenção quando ronda OK', ''], ['15', 'Sem retenção na falha de ronda', ''],
        ['16', 'Sem retenção no disparo de qualquer zona', ''], ['17', 'Sem retenção no disparo da zona 1', ''],
        ['18', 'Armar e desarmar o eletrificador', ''], ['19 a 21', 'Sem retenção no disparo da zona 2 a 4', ''],
        ['22', 'Sem retenção no disparo do pânico', ''], ['23', 'Sem retenção no disparo de zona 24h', ''],
        ['24', 'Aciona junto ao abrir a zona 1', ''], ['25', 'Armar e desarmar o eletrificador silencioso', '']
      ]},
      { titulo: 'Programações variadas', itens: [
        ['831 / 832', 'Mensagem 1 e 2 do LCD', 'VEGAS VIGILANCIA / 0800 0522 555'],
        ['840', 'Número de partições', 'Active 20: 2 · Active 32: 4 · Active 100 Bus: 16'],
        ['841 a 844', 'Nome das partições (841xx no 100 Bus)', 'TECLA1 A · TECLA2 B · TECLA3 C · TECLA4 D'],
        ['861 a 864', 'Nome das saídas PGM (861xx no 100 Bus)', 'Texto livre'],
        ['881', 'Supervisão dos sensores sem fio', '00 Econômico · 01 Equilibrado · 02 Desempenho'],
        ['882', 'Cartão de comunicação sem fio', '01 a 13'],
        ['883', 'Aprender dispositivo sem fio', 'Número do sensor (até 32) ou ARM A, depois acionar o dispositivo'],
        ['884', 'Apagar dispositivo sem fio', 'Número do dispositivo · 000 apaga todos'],
        ['885', 'Teclas do controle remoto', 'Número do controle + tecla a programar'],
        ['886', 'Aprender dispositivo de barramento', 'Conectar ao barramento e pressionar ARM A'],
        ['887', 'Apagar dispositivo de barramento', 'Endereço · 000 apaga todos']
      ]},
      { titulo: 'Visualizações', itens: [
        ['891', 'IMEI', ''], ['892', 'Versão do teclado', ''], ['893', 'Versão do local', ''],
        ['894', 'Modelo/versão do módulo 4G', ''], ['895', 'Modelo/versão do módulo Ethernet', ''],
        ['896', 'Número de série da central', ''], ['897', 'Qtde. de dispositivos sem fio aprendidos', ''],
        ['898', 'Qtde. de dispositivos de barramento aprendidos', '']
      ]}
    ]
  },

  intelbras: {
    titulo: 'Cola Vegas — Intelbras',
    aplica: ['amt-8000', 'amt-4010-smart', 'amt-2018'],
    intro: 'Valores padrão Vegas para centrais Intelbras. Todos os comandos começam com Enter e terminam com Enter.',
    grupos: [
      { titulo: 'Senhas e conta', itens: [
        ['2000', 'Senha master', 'Senha do cliente (fábrica: 1234)'],
        ['2062', 'Senha do instalador', '5225', 1],
        ['2063', 'Senha 63', '474747', 1],
        ['150', 'Conta do cliente', 'Número da conta'],
        ['151', 'Conta do cliente', 'Número da conta']
      ]},
      { titulo: 'Monitoramento IP', itens: [
        ['8021', 'Porta 1', '9333', 1],
        ['8022', 'Porta 2', '4005', 1],
        ['8031', 'DNS 1', 'vegasvigilancia.dyndns.org', 1],
        ['8032', 'DNS 2', 'vegasvigilancia.ddns.net', 1],
        ['17', 'Modo de reportagem', '600'],
        ['19', 'Prioridade de comunicação', '2'],
        ['830', 'Monitoramento via IP', 'Habilitar 1, 2, 3 e 4'],
        ['471', 'Teste periódico (autoteste)', '004 horas']
      ]},
      { titulo: 'Dados móveis (chip)', itens: [
        ['8221', 'Login chip 1', 'ft'],
        ['8222', 'Login chip 2', '— não definido'],
        ['8231', 'Senha chip 1', 'ft'],
        ['8232', 'Senha chip 2', '— não definido'],
        ['8241', 'APN chip 1', 'ft.claro.com.br'],
        ['8242', 'APN chip 2', '— não definido']
      ]},
      { titulo: 'Opções e funções', itens: [
        ['510', 'Opções', 'Habilitar 3 e 4'],
        ['511', 'Opções (5 = envio de solicitação)', 'Habilitar 5, 6 e 8'],
        ['514', 'Funções especiais', 'Habilitar 3 e 4'],
        ['515', 'Falhas que geram disparo', 'Habilitar somente 6 (desmarcar todos os demais)'],
        ['53', 'Cancelamento automático de zona', '4 (disparos)'],
        ['310', 'Zona temporizada', 'Enter + 310']
      ]},
      { titulo: 'Relógio, pânico e controle', itens: [
        ['400 / 401', 'Hora / data', '400 + HH MM SS · 401 + data'],
        ['60 + usuário', 'Botão de pânico', 'Enter + 60 + nº do usuário'],
        ['65 + 1 + 01 + 07', 'Função da tecla do controle remoto', 'Formato: 65 + botão + usuário + função (ex.: botão 1, usuário 01, função 07)']
      ]}
    ]
  }
};
