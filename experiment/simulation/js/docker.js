/**
 * ============================================
 * DOCKER TERMINAL MANAGER
 * ============================================
 * Manages Docker terminal functionality for managing Network Functions
 *
 * Responsibilities:
 * - Docker compose commands (up, down, ps)
 * - Start/stop individual NFs
 * - Display service status with health indicators
 * - Watch mode for real-time status updates
 */

class DockerTerminal {
    constructor() {
        this.watchInterval = null;
        this.isWatching = false;
        this.dockerServices = new Map();
        this.isSelectingText = false;

        this.terminalState = {
            x: null,
            y: null,
            width: 900,
            height: 700,
            isMaximized: false,
            isMinimized: false
        };

        this.oaiWorkshopNetworkExists = false;
        this.oaiWorkshopNetworkId = this.generateNetworkId();
        this.oaiWorkshopCreatedTime = null;

        this.topologySource = '../5g-core.json';
        console.log('✅ DockerTerminal initialized');
    }

    /** Normalize icon path from topology (e.g. simulation/images/icons/nrf.svg -> images/icons/nrf.svg) */
    normalizeIconPath(icon) {
        if (!icon) return icon;
        if (typeof icon === 'string' && icon.startsWith('simulation/')) return icon.replace(/^simulation\//, '');
        return icon;
    }

    init() {
        const btn = document.getElementById('btn-docker-terminal');
        if (btn) {
            btn.addEventListener('click', () => this.openTerminal());
        }

        // Auto-connect MySQL↔UDR and UPF↔SMF whenever any NF is added to the canvas
        if (window.dataStore) {
            window.dataStore.subscribe((event) => {
                if (event === 'nf-added' || event === 'data-imported') {
                    this.checkAndAutoConnect();
                }
            });
        }

        console.log('✅ Docker terminal ready');
    }

    openTerminal() {
        const existingTerminal = document.getElementById('docker-terminal-modal');
        if (existingTerminal) existingTerminal.remove();

        const terminalModal = document.createElement('div');
        terminalModal.id = 'docker-terminal-modal';
        terminalModal.className = 'docker-terminal-modal';

        terminalModal.innerHTML = `
            <div class="docker-terminal-window" id="docker-terminal-window">
                <div class="docker-terminal-titlebar" id="docker-terminal-titlebar">
                    <div class="docker-terminal-title">
                        <span class="docker-terminal-icon">🐳</span>
                        Docker Terminal - Main Terminal
                    </div>
                    <div class="docker-terminal-controls">
                        <button class="docker-terminal-btn close" id="docker-terminal-close" title="Close">×</button>
                    </div>
                </div>
                <div class="docker-terminal-content" id="docker-terminal-content">
                    <div class="docker-terminal-output" id="docker-terminal-output">
                        <div class="docker-terminal-line docker-terminal-info">5G WIRELESS LAB</div>
                        <div class="docker-terminal-line docker-terminal-info">Type 'help' for available commands.</div>
                        <div class="docker-terminal-line docker-terminal-blank">&nbsp;</div>
                    </div>
                    <div class="docker-terminal-input-wrapper" id="docker-terminal-input-wrapper">
                        <span class="docker-terminal-prompt">docker@main></span>
                        <input type="text" id="docker-terminal-input" class="docker-terminal-input" autocomplete="off" spellcheck="false">
                    </div>
                </div>
                <div class="docker-terminal-resize-handle" id="docker-terminal-resize-handle"></div>
            </div>
        `;

        document.body.appendChild(terminalModal);
        this.setupTerminal(terminalModal);
        this.setupWindowControls(terminalModal);
        this.applyTerminalState();

        setTimeout(() => terminalModal.classList.add('show'), 10);

        const input = document.getElementById('docker-terminal-input');
        if (input) input.focus();
    }

    setupTerminal(terminalModal) {
        const input = document.getElementById('docker-terminal-input');
        const output = document.getElementById('docker-terminal-output');
        const inputWrapper = document.getElementById('docker-terminal-input-wrapper');
        const content = document.getElementById('docker-terminal-content');
        const closeBtn = document.getElementById('docker-terminal-close');

        let commandHistory = [];
        let historyIndex = -1;

        closeBtn.addEventListener('click', () => {
            this.stopWatch();
            terminalModal.classList.remove('show');
            setTimeout(() => terminalModal.remove(), 300);
        });

        terminalModal.addEventListener('click', (e) => {
            if (e.target === terminalModal) closeBtn.click();
        });

        // Global Ctrl+C to stop watch — works even when input is hidden
        const ctrlCHandler = (e) => {
            if (e.ctrlKey && e.key === 'c' && this.isWatching) {
                e.preventDefault();
                this.stopWatch();
                this.addTerminalLine(output, '^C', 'command');
                this.addTerminalLine(output, '', 'blank');
                this.scrollToBottom(content);
            }
        };
        document.addEventListener('keydown', ctrlCHandler);
        // Clean up when terminal is closed
        closeBtn.addEventListener('click', () => {
            document.removeEventListener('keydown', ctrlCHandler);
        }, { once: true });

        input.addEventListener('keydown', async (e) => {
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                return; // handled by global listener above
            }

            if (e.key === 'Enter') {
                const command = input.value.trim();
                if (command) {
                    commandHistory.push(command);
                    historyIndex = commandHistory.length;
                    this.addTerminalLine(output, `docker@main>${command}`, 'command');
                    input.value = '';
                    // Hide prompt while command runs
                    if (inputWrapper) inputWrapper.style.display = 'none';
                    await this.processCommand(command, output);
                    this.scrollToBottom(content);
                    // Show prompt again only if not in watch mode or vi mode
                    if (!this.isWatching && !document.getElementById('vi-screen')) {
                        if (inputWrapper) inputWrapper.style.display = '';
                        input.focus();
                    }
                } else {
                    // Empty enter — just print a blank prompt line
                    this.addTerminalLine(output, 'docker@main>', 'command');
                    this.scrollToBottom(content);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    input.value = commandHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    input.value = commandHistory[historyIndex];
                } else {
                    historyIndex = commandHistory.length;
                    input.value = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.handleTabCompletion(input);
            } else if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                output.innerHTML = '';
            } else {
                // Any other key resets tab cycle
                this._tabState = null;
            }
        });

        // Track text selection to avoid auto-scrolling while copying
        if (output) {
            const mouseUpHandler = () => { this.isSelectingText = false; };
            const selectionChangeHandler = () => {
                const sel = window.getSelection && window.getSelection();
                this.isSelectingText = !!(sel && sel.toString().length > 0);
            };

            output.addEventListener('mousedown', () => { this.isSelectingText = true; });
            document.addEventListener('mouseup', mouseUpHandler);
            document.addEventListener('selectionchange', selectionChangeHandler);

            closeBtn.addEventListener('click', () => {
                document.removeEventListener('mouseup', mouseUpHandler);
                document.removeEventListener('selectionchange', selectionChangeHandler);
            }, { once: true });
        }

        // Focus input on any click in terminal
        if (content) {
            content.addEventListener('click', (e) => {
                if (e.target !== input) {
                    input.focus();
                }
            });
        }
    }

    scrollToBottom(element) {
        if (!element) return;
        const sel = window.getSelection && window.getSelection();
        if (this.isSelectingText || (sel && sel.toString().length > 0)) return;
        element.scrollTop = element.scrollHeight;
    }

    handleTabCompletion(input) {
        const commandTokens = [
            ['help'], ['status'], ['check'], ['clear'], ['cls'], ['exit'], ['ls'],
            ['vi', 'docker-compose.yml'],
            ['docker', 'ps'],
            ['docker', 'network', 'ls'],
            ['docker', 'network', 'inspect'],
            ['docker', 'version'],
            ['docker', 'compose', '-f', 'docker-compose.yml', 'up', '-d'],
            ['docker', 'compose', '-f', 'docker-compose.yml', 'down'],
            ['docker', 'start'],
            ['docker', 'stop'],
            ['watch', 'docker', 'compose', '-f', 'docker-compose.yml', 'ps', '-a']
        ];

        const raw = input.value;
        const trailingSpace = raw.endsWith(' ');
        const tokens = raw.trimStart().split(/\s+/).filter(Boolean);
        const wordIndex = trailingSpace ? tokens.length : tokens.length - 1;
        const prefix = trailingSpace ? '' : (tokens[wordIndex] || '').toLowerCase();
        const before = trailingSpace ? tokens : tokens.slice(0, wordIndex);

        // If tab state exists and input hasn't changed, cycle to next candidate
        if (this._tabState && this._tabState.base === raw) {
            this._tabState.index = (this._tabState.index + 1) % this._tabState.candidates.length;
            const next = this._tabState.candidates[this._tabState.index];
            input.value = [...before, next].join(' ');
            this._tabState.base = input.value;
            return;
        }

        // Fresh tab press — find candidates
        const candidates = commandTokens
            .filter(cmd => {
                if (cmd.length <= wordIndex) return false;
                for (let i = 0; i < before.length; i++) {
                    if ((cmd[i] || '').toLowerCase() !== before[i].toLowerCase()) return false;
                }
                return cmd[wordIndex].toLowerCase().startsWith(prefix);
            })
            .map(cmd => cmd[wordIndex]);

        // Deduplicate
        const unique = [...new Set(candidates)];
        if (unique.length === 0) return;

        if (unique.length === 1) {
            // Only one match — fill it and reset state
            input.value = [...before, unique[0]].join(' ');
            this._tabState = null;
        } else {
            // Multiple — fill first candidate and set up cycle state
            input.value = [...before, unique[0]].join(' ');
            this._tabState = { base: input.value, candidates: unique, index: 0 };
        }
    }

    normalizeCommand(command) {
        return command.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    async processCommand(command, output) {
        const cmd = this.normalizeCommand(command);
        const args = command.trim().split(/\s+/);

        if (cmd === 'help' || cmd === '?') {
            this.showHelp(output);
        } else if (cmd === 'ls') {
            this.showLS(output);
        } else if (cmd === 'vi docker-compose.yml' || cmd === 'cat docker-compose.yml') {
            this.showViewer(output);
        } else if (cmd === 'status' || cmd === 'check') {
            this.checkSystemStatus(output);
        } else if (/^docker\s+compose\s+(-f\s+docker-compose\.yml\s+)?up\s+-d\s+(oai-[a-z0-9-]+|mysql)$/.test(cmd) ||
                   /^docker-compose\s+(-f\s+docker-compose\.yml\s+)?up\s+-d\s+(oai-[a-z0-9-]+|mysql)$/.test(cmd)) {
            const serviceName = (args[args.length - 1] || '').trim();
            await this.dockerComposeUpSingleNF(serviceName, output);
        } else if (/^docker\s+compose\s+(-f\s+docker-compose\.yml\s+)?up\s+-d\s*$/.test(cmd) ||
                   /^docker-compose\s+(-f\s+docker-compose\.yml\s+)?up\s+-d\s*$/.test(cmd)) {
            await this.dockerComposeUp(output);
        } else if (cmd === 'docker ps') {
            await this.dockerPS(output);
        } else if (cmd === 'docker network ls') {
            this.dockerNetworkLS(output);
        } else if (/^docker\s+network\s+inspect\s+.+$/.test(cmd)) {
            const networkName = args.slice(3).join(' ').trim();
            this.dockerNetworkInspect(networkName, output);
        } else if (cmd === 'docker version') {
            this.dockerVersion(output);
        } else if (/^watch\s+docker\s+(compose\s+)?(-f\s+docker-compose\.yml\s+)?ps\s+-a\s*$/.test(cmd) ||
                   /^watch\s+docker-compose\s+(-f\s+docker-compose\.yml\s+)?ps\s+-a\s*$/.test(cmd)) {
            const inputWrapper = document.getElementById('docker-terminal-input-wrapper');
            this.startWatch(output, inputWrapper);
        } else if (/^docker\s+compose\s+(-f\s+docker-compose\.yml\s+)?down\s+(oai-[a-z0-9-]+|mysql)$/.test(cmd) ||
                   /^docker-compose\s+(-f\s+docker-compose\.yml\s+)?down\s+(oai-[a-z0-9-]+|mysql)$/.test(cmd)) {
            const serviceName = (args[args.length - 1] || '').trim();
            await this.dockerComposeDownSingleNF(serviceName, output);
        } else if (/^docker\s+compose\s+(-f\s+docker-compose\.yml\s+)?down\s*$/.test(cmd) ||
                   /^docker-compose\s+(-f\s+docker-compose\.yml\s+)?down\s*$/.test(cmd)) {
            await this.dockerComposeDown(output);
        } else if (/^docker\s+start\s+.+$/.test(cmd)) {
            const serviceName = args.slice(2).join(' ');
            await this.dockerStart(serviceName, output);
        } else if (/^docker\s+stop\s+.+$/.test(cmd)) {
            const serviceName = args.slice(2).join(' ');
            await this.dockerStop(serviceName, output);
        } else if (cmd === 'cls' || cmd === 'clear') {
            output.innerHTML = '';
        } else if (cmd === 'exit') {
            const closeBtn = document.getElementById('docker-terminal-close');
            if (closeBtn) closeBtn.click();
        } else {
            this.addTerminalLine(output, `Command not found: ${command}`, 'error');
            this.addTerminalLine(output, 'Type "help" for available commands.', 'info');
        }

        this.addTerminalLine(output, '', 'blank');
    }

    checkSystemStatus(output) {
        this.addTerminalLine(output, 'System Status Check:', 'info');
        this.addTerminalLine(output, '', 'blank');

        if (window.dataStore) {
            this.addTerminalLine(output, '✅ DataStore: Available', 'success');
            const allNFs = window.dataStore.getAllNFs() || [];
            this.addTerminalLine(output, `   Found ${allNFs.length} Network Function(s)`, 'info');
            if (allNFs.length > 0) {
                this.addTerminalLine(output, '', 'blank');
                this.addTerminalLine(output, 'Network Functions:', 'info');
                allNFs.forEach(nf => {
                    const status = nf.status || 'unknown';
                    const statusColor = status === 'stable' ? 'success' : (status === 'starting' ? 'warning' : 'info');
                    this.addTerminalLine(output, `  - ${nf.name} (${nf.type}): ${status}`, statusColor);
                });
            }
        } else {
            this.addTerminalLine(output, '❌ DataStore: Not available', 'error');
        }

        this.addTerminalLine(output, '', 'blank');
        if (window.nfManager) {
            this.addTerminalLine(output, '✅ NFManager: Available', 'success');
        } else {
            this.addTerminalLine(output, '❌ NFManager: Not available', 'error');
        }
        if (window.canvasRenderer) {
            this.addTerminalLine(output, '✅ CanvasRenderer: Available', 'success');
        } else {
            this.addTerminalLine(output, '❌ CanvasRenderer: Not available', 'error');
        }
    }

    showHelp(output) {
        const helpText = [
            'Available Commands:',
            '',
            '  docker compose -f docker-compose.yml up -d          Start all Network Functions',
            '  docker compose -f docker-compose.yml up -d <svc>    Start a specific NF',
            '  docker compose -f docker-compose.yml down           Stop all services',
            '  docker compose -f docker-compose.yml down <svc>     Stop a specific NF',
            '  docker ps                                            Show running containers',
            '  docker network ls                                    List Docker networks',
            '  docker network inspect <network>                     Inspect a network',
            '  docker version                                       Show Docker version',
            '  watch docker compose -f docker-compose.yml ps -a    Watch service status',
            '  docker start <service>                               Start a specific NF',
            '  docker stop <service>                                Stop a specific NF',
            '  ls                                                   List files in current directory',
            '  vi docker-compose.yml                                View docker-compose.yml (read-only)',
            '  status / check                                       Check system status',
            '  cls / clear                                          Clear terminal',
            '  exit                                                 Close terminal',
            '',
            ''
        ];
        helpText.forEach(line => this.addTerminalLine(output, line, 'info'));
    }

    showLS(output) {
        this.addTerminalLine(output, '<span style="color:#4fc3f7;font-weight:bold;">docker-compose.yml</span>', 'info');
    }

    showViewer(output) {
        const ymlContent = [
            'services:',
            '  mysql:',
            '    container_name: "mysql"',
            '    image: ghcr.io/openairinterface/mysql:8.0',
            '    volumes:',
            '      - ./database/oai_db.sql:/docker-entrypoint-initdb.d/oai_db.sql',
            '      - ./healthscripts/mysql-healthcheck.sh:/tmp/mysql-healthcheck.sh',
            '    environment:',
            '      - TZ=Europe/Paris',
            '      - MYSQL_DATABASE=oai_db',
            '      - MYSQL_USER=test',
            '      - MYSQL_PASSWORD=test',
            '      - MYSQL_ROOT_PASSWORD=linux',
            '    healthcheck:',
            '      test: /bin/bash -c "/tmp/mysql-healthcheck.sh"',
            '      interval: 10s',
            '      timeout: 5s',
            '      retries: 30',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.131',
            '',
            '  oai-udr:',
            '    container_name: "oai-udr"',
            '    image: ghcr.io/openairinterface/oai-udr:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 8080/tcp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-udr/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    depends_on:',
            '      - mysql',
            '      - oai-nrf',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.136',
            '',
            '  oai-udm:',
            '    container_name: "oai-udm"',
            '    image: ghcr.io/openairinterface/oai-udm:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 8080/tcp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-udm/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    depends_on:',
            '      - oai-udr',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.137',
            '',
            '  oai-ausf:',
            '    container_name: "oai-ausf"',
            '    image: ghcr.io/openairinterface/oai-ausf:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 8080/tcp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-ausf/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    depends_on:',
            '      - oai-udm',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.138',
            '',
            '  oai-nrf:',
            '    container_name: "oai-nrf"',
            '    image: ghcr.io/openairinterface/oai-nrf:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 8080/tcp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-nrf/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.130',
            '',
            '  oai-amf:',
            '    container_name: "oai-amf"',
            '    image: ghcr.io/openairinterface/oai-amf:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 8080/tcp',
            '      - 38412/sctp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-amf/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    depends_on:',
            '      - mysql',
            '      - oai-nrf',
            '      - oai-ausf',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.132',
            '',
            '  oai-smf:',
            '    container_name: "oai-smf"',
            '    image: ghcr.io/openairinterface/oai-smf:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 8080/tcp',
            '      - 8805/udp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-smf/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    depends_on:',
            '      - oai-nrf',
            '      - oai-amf',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.133',
            '',
            '  oai-upf:',
            '    container_name: "oai-upf"',
            '    image: ghcr.io/openairinterface/oai-upf:develop',
            '    expose:',
            '      - 80/tcp',
            '      - 2152/udp',
            '      - 8805/udp',
            '    volumes:',
            '      - ./conf/config.yaml:/openair-upf/etc/config.yaml',
            '    environment:',
            '      - TZ=Europe/Paris',
            '    depends_on:',
            '      - oai-nrf',
            '      - oai-smf',
            '    cap_add:',
            '      - NET_ADMIN',
            '      - SYS_ADMIN',
            '    cap_drop:',
            '      - ALL',
            '    privileged: true',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.134',
            '',
            '  oai-traffic-server:',
            '    privileged: true',
            '    init: true',
            '    container_name: oai-ext-dn',
            '    image: ghcr.io/openairinterface/trf-gen-cn5g:latest',
            '    environment:',
            '      - UPF_FQDN=oai-upf',
            '      - UE_NETWORK=10.0.0.0/24',
            '      - USE_FQDN=yes',
            '    healthcheck:',
            '      test: /bin/bash -c "ip r | grep 12.1.1"',
            '      interval: 10s',
            '      timeout: 5s',
            '      retries: 5',
            '    networks:',
            '      public_net:',
            '        ipv4_address: 192.168.70.135',
            '',
            'networks:',
            '  public_net:',
            '    driver: bridge',
            '    name: oaiworkshop',
            '    ipam:',
            '      config:',
            '        - subnet: 192.168.70.128/26',
            '    driver_opts:',
            '      com.docker.network.bridge.name: "oaiworkshop"',
        ];

        const inputWrapper = document.getElementById('docker-terminal-input-wrapper');
        const content = document.getElementById('docker-terminal-content');
        if (!content) return;

        // --- Real vi behaviour: hide everything, take over the full content area ---
        output.style.display = 'none';
        if (inputWrapper) inputWrapper.style.display = 'none';

        // Build the vi screen inside the content area
        const viScreen = document.createElement('div');
        viScreen.id = 'vi-screen';
        viScreen.style.cssText = [
            'display:flex', 'flex-direction:column', 'height:100%',
            'background:#0d1117', 'font-family:Consolas,"Courier New",monospace',
            'font-size:13px', 'color:#c9d1d9', 'overflow:hidden'
        ].join(';');

        // Scrollable file body
        const fileBody = document.createElement('div');
        fileBody.style.cssText = 'flex:1;overflow-y:auto;padding:2px 0;';

        ymlContent.forEach((line, i) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;min-height:18px;white-space:pre;';

            // Line number gutter
            const gutter = document.createElement('span');
            gutter.style.cssText = 'color:#3d4450;min-width:40px;text-align:right;padding-right:10px;user-select:none;flex-shrink:0;';
            gutter.textContent = i + 1;

            // Line content — use textContent only, apply color via style
            const cell = document.createElement('span');
            cell.style.cssText = 'flex:1;';
            cell.textContent = line || '';

            // Apply YAML syntax colour based on line pattern
            if (/^\s*#/.test(line)) {
                cell.style.color = '#6a9955';
            } else if (/^\s*[a-zA-Z_-]+:/.test(line)) {
                // Key lines — colour the whole line cyan-ish
                cell.style.color = '#9cdcfe';
            } else if (/^\s*-\s/.test(line)) {
                cell.style.color = '#ce9178';
            } else {
                cell.style.color = '#c9d1d9';
            }

            row.appendChild(gutter);
            row.appendChild(cell);
            fileBody.appendChild(row);
        });

        // Status bar — full-width blue bar like real vim
        const statusBar = document.createElement('div');
        statusBar.style.cssText = [
            'background:#264f78', 'color:#fff', 'padding:1px 8px',
            'font-size:12px', 'display:flex', 'justify-content:space-between',
            'flex-shrink:0'
        ].join(';');
        statusBar.innerHTML = `<span>"docker-compose.yml" [readonly] ${ymlContent.length}L, ${ymlContent.join('\n').length}C</span>`;

        // Command line at the very bottom (where vim shows : commands)
        const cmdLine = document.createElement('div');
        cmdLine.style.cssText = [
            'display:flex', 'align-items:center', 'padding:1px 4px',
            'background:#0d1117', 'border-top:1px solid #21262d', 'flex-shrink:0'
        ].join(';');
        const cmdPrefix = document.createElement('span');
        cmdPrefix.style.cssText = 'color:#c9d1d9;font-family:monospace;min-width:8px;';
        cmdPrefix.textContent = '';
        const cmdInput = document.createElement('input');
        cmdInput.type = 'text';
        cmdInput.autocomplete = 'off';
        cmdInput.spellcheck = false;
        cmdInput.placeholder = 'Type :q to quit';
        cmdInput.style.cssText = [
            'flex:1', 'background:transparent', 'border:none', 'outline:none',
            'color:#c9d1d9', 'font-family:Consolas,monospace', 'font-size:13px',
            'caret-color:#c9d1d9'
        ].join(';');
        cmdLine.appendChild(cmdPrefix);
        cmdLine.appendChild(cmdInput);

        viScreen.appendChild(fileBody);
        viScreen.appendChild(statusBar);
        viScreen.appendChild(cmdLine);
        content.appendChild(viScreen);
        cmdInput.focus();

        // Exit: tear down vi screen, restore terminal output
        const exitVi = () => {
            viScreen.remove();
            output.style.display = '';
            if (inputWrapper) inputWrapper.style.display = '';
            const termInput = document.getElementById('docker-terminal-input');
            if (termInput) { termInput.focus(); }
        };

        cmdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cmdPrefix.textContent = '';
                cmdInput.value = '';
                cmdInput.placeholder = 'Type :q to quit';
                e.preventDefault();
            } else if (e.key === 'Enter') {
                const cmd = cmdInput.value.trim();
                if (cmd === 'q' || cmd === 'q!' || cmd === 'wq' || cmd === 'wq!') {
                    exitVi();
                } else if (cmd !== '') {
                    // Show vim-style error in the command line area
                    cmdPrefix.textContent = '';
                    cmdInput.value = '';
                    cmdInput.placeholder = `E492: Not an editor command: ${cmd}`;
                    setTimeout(() => { cmdInput.placeholder = 'Type :q to quit'; }, 2000);
                }
                e.preventDefault();
            } else if (e.key === ':') {
                if (cmdPrefix.textContent !== ':') {
                    cmdPrefix.textContent = ':';
                    cmdInput.value = '';
                    cmdInput.placeholder = '';
                }
                e.preventDefault();
            }
        });

        cmdInput.addEventListener('input', () => {
            if (cmdInput.value.length > 0 && cmdPrefix.textContent !== ':') {
                cmdPrefix.textContent = ':';
                cmdInput.placeholder = '';
            }
        });
    }

    addTerminalLine(output, text, type = 'normal') {
        const line = document.createElement('div');
        line.className = `docker-terminal-line docker-terminal-${type}`;
        line.innerHTML = text || '&nbsp;';
        output.appendChild(line);
        this.scrollToBottom(output);
    }

    generateContainerId() {
        const chars = '0123456789abcdef';
        let id = '';
        for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
        return id;
    }

    getPortsForNF(nf) {
        const portMap = {
            'AMF': '80/tcp, 8080/tcp, 9090/tcp, 38412/sctp',
            'SMF': '80/tcp, 8080/tcp, 8805/udp',
            'UPF': '2152/udp, 8805/udp',
            'AUSF': '80/tcp, 8080/tcp',
            'UDM': '80/tcp, 8080/tcp',
            'UDR': '80/tcp, 8080/tcp',
            'NRF': '80/tcp, 8080/tcp, 9090/tcp',
            'PCF': '80/tcp, 8080/tcp',
            'NSSF': '80/tcp, 8080/tcp',
            'MySQL': '3306/tcp, 33060/tcp',
            'gNB': '2152/udp, 38412/sctp',
            'UE': '2152/udp'
        };
        return portMap[nf.type] || `${nf.config.port}/tcp`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getDefaultNFConfigurations() {
        return [
            { type: 'NRF',    ipAddress: '192.168.1.10',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'AMF',    ipAddress: '192.168.1.20',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'SMF',    ipAddress: '192.168.1.30',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'UPF',    ipAddress: '192.168.1.40',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'ext-dn', ipAddress: '192.168.1.45',  port: 80,   httpProtocol: 'HTTP/2' },
            { type: 'AUSF',   ipAddress: '192.168.1.50',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'UDM',    ipAddress: '192.168.1.60',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'UDR',    ipAddress: '192.168.1.70',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'PCF',    ipAddress: '192.168.1.80',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'NSSF',   ipAddress: '192.168.1.90',  port: 8080, httpProtocol: 'HTTP/2' },
            { type: 'MySQL',  ipAddress: '192.168.1.100', port: 3306, httpProtocol: 'HTTP/2' }
        ];
    }

    async dockerComposeUp(output) {
        if (!window.dataStore) {
            this.addTerminalLine(output, 'Error: DataStore not initialized. Please refresh the page.', 'error');
            return;
        }
        if (!window.nfManager) {
            this.addTerminalLine(output, 'Error: NFManager not initialized. Please refresh the page.', 'error');
            return;
        }
        let existingNFs = window.dataStore.getAllNFs();
        const defaultConfigs = this.getDefaultNFConfigurations();
        const existingTypes = new Set(existingNFs.map(nf => nf.type));
        const missingConfigs = defaultConfigs.filter(config => !existingTypes.has(config.type));

        if (existingNFs.length === 0) {
            try {
                const response = await fetch(this.topologySource);
                if (!response.ok) throw new Error(`Failed to load 5g-core.json: ${response.statusText}`);
                const topology = await response.json();
                const filteredTopology = this.filterTopology(topology);
                const importTime = Date.now();
                if (filteredTopology.nfs && Array.isArray(filteredTopology.nfs)) {
                    filteredTopology.nfs.forEach(nf => {
                        nf.createdAt = importTime;
                        nf.icon = this.normalizeIconPath(nf.icon) || nf.icon;
                    });
                }
                window.dataStore.importData(filteredTopology);
                if (filteredTopology.nfs && Array.isArray(filteredTopology.nfs)) {
                    for (const nf of filteredTopology.nfs) {
                        if (nf.type === 'gNB' || nf.type === 'UE') continue;
                        if (nf.icon && !nf.iconImage) {
                            const img = new Image();
                            const iconSrc = this.normalizeIconPath(nf.icon);
                            img.onload = () => { nf.iconImage = img; if (window.canvasRenderer) window.canvasRenderer.render(); };
                            img.onerror = () => console.warn(`Failed to load icon for ${nf.name}: ${nf.icon}`);
                            img.src = iconSrc.startsWith('http') ? iconSrc : new URL(iconSrc, window.location.href).href;
                        }
                        if (window.logEngine) {
                            const importedNF = window.dataStore.getNFById(nf.id);
                            if (importedNF) window.logEngine.onNFAdded(importedNF);
                        }
                    }
                }
                existingNFs = window.dataStore.getAllNFs();
                if (window.canvasRenderer) window.canvasRenderer.render();
                this.oaiWorkshopNetworkExists = true;
                this.oaiWorkshopCreatedTime = Date.now();
                const totalServices = existingNFs.length + 1;
                this.addTerminalLine(output, `[+] Running ${totalServices}/${totalServices}`, 'info');
                this.addTerminalLine(output, ' ✔ Network oaiworkshop Created' + ' '.repeat(20) + '0.2s', 'success');
                await this.delay(200);
                const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'oai-ext-dn' };
                for (const nf of existingNFs) {
                    const serviceName = serviceNameMap[nf.type] || nf.type.toLowerCase();
                    const randomDelay = (Math.random() * 0.5 + 0.3).toFixed(1);
                    this.addTerminalLine(output, ` ✔ Container ${serviceName.padEnd(16)} Started${' '.repeat(20)}${randomDelay}s`, 'success');
                    await this.delay(parseFloat(randomDelay) * 1000);
                }
                this.addTerminalLine(output, '', 'blank');
                this.addTerminalLine(output, `✅ Started ${existingNFs.length} Network Function(s)`, 'success');
                // Mark all NFs stable and wire connections after startup
                setTimeout(() => {
                    const allStartedNFs = window.dataStore?.getAllNFs() || [];
                    allStartedNFs.forEach(n => {
                        n.status = 'stable';
                        n.statusTimestamp = Date.now();
                        window.dataStore.updateNF(n.id, n);
                    });
                    window.dockerTerminal.checkAndAutoConnect();
                    if (window.canvasRenderer) window.canvasRenderer.render();
                }, 5000);
                return;
            } catch (error) {
                this.addTerminalLine(output, `❌ Failed to load topology: ${error.message}`, 'error');
                this.addTerminalLine(output, 'Falling back to default NF creation...', 'warning');
                this.addTerminalLine(output, '', 'blank');
                await this.createDefaultNFs(output);
                existingNFs = window.dataStore.getAllNFs();
                if (window.canvasRenderer) window.canvasRenderer.render();
                return;
            }
        }

        if (missingConfigs.length === 0) {
            this.oaiWorkshopNetworkExists = true;
            if (!this.oaiWorkshopCreatedTime) this.oaiWorkshopCreatedTime = Date.now();
            this.addTerminalLine(output, '✅ All Network Functions are already running!', 'success');
            this.addTerminalLine(output, '', 'blank');
            this.addTerminalLine(output, 'Running services:', 'info');
            const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'oai-ext-dn' };
            existingNFs.forEach(nf => {
                const serviceName = serviceNameMap[nf.type] || nf.type.toLowerCase();
                const status = nf.status === 'stable' ? '(healthy)' : '(starting)';
                this.addTerminalLine(output, `  - ${serviceName.padEnd(16)} ${status}`, 'success');
            });
            return;
        }

        const isFirstNF = existingNFs.length === 0;
        const totalToStart = missingConfigs.length + (isFirstNF ? 1 : 0);
        this.addTerminalLine(output, `[+] Running ${totalToStart}/${totalToStart}`, 'info');
        if (isFirstNF) {
            this.addTerminalLine(output, ' ✔ Network oaiworkshop Created' + ' '.repeat(20) + '0.2s', 'success');
            this.oaiWorkshopNetworkExists = true;
            this.oaiWorkshopCreatedTime = Date.now();
            await this.delay(200);
        }
        let topologyData = null;
        try {
            const response = await fetch(this.topologySource);
            if (response.ok) topologyData = this.filterTopology(await response.json());
        } catch (e) { console.warn('Failed to load topology for NF positioning:', e); }

        const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'oai-ext-dn' };
        for (const config of missingConfigs) {
            let topologyNF = topologyData?.nfs?.find(nf => nf.type === config.type) || null;
            let nf;
            if (topologyNF) {
                const posX = topologyNF.position?.x ?? topologyNF.x ?? 100;
                const posY = topologyNF.position?.y ?? topologyNF.y ?? 100;
                nf = {
                    id: topologyNF.id || `nf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: config.type,
                    name: topologyNF.name || config.type,
                    position: { x: posX, y: posY },
                    color: topologyNF.color,
                    config: { ipAddress: config.ipAddress, port: config.port, httpProtocol: config.httpProtocol || 'HTTP/2', capacity: topologyNF.config?.capacity || 1000, load: topologyNF.config?.load || 0 },
                    icon: this.normalizeIconPath(topologyNF.icon) || topologyNF.icon,
                    createdAt: Date.now(),
                    status: 'starting',
                    statusTimestamp: Date.now()
                };
                window.dataStore.addNF(nf);
                if (window.canvasRenderer) window.canvasRenderer.render();
                if (nf.icon) {
                    const img = new Image();
                    const iconSrc = nf.icon.startsWith('http') ? nf.icon : new URL(nf.icon, window.location.href).href;
                    img.src = iconSrc;
                    img.onload = () => { nf.iconImage = img; if (window.canvasRenderer) window.canvasRenderer.render(); };
                    img.onerror = () => { img.src = new URL(`images/icons/${config.type.toLowerCase()}.svg`, window.location.href).href; };
                }
                if (window.logEngine) window.logEngine.onNFAdded(nf);
            } else {
                const currentNFCount = window.dataStore.getAllNFs().length;
                const position = window.nfManager.calculateAutoPosition(config.type, currentNFCount + 1);
                nf = window.nfManager.createNetworkFunction(config.type, position);
                if (!nf) { this.addTerminalLine(output, `Error: Failed to create ${config.type}`, 'error'); continue; }
                nf.config.ipAddress = config.ipAddress;
                nf.config.port = config.port;
                nf.config.httpProtocol = config.httpProtocol || 'HTTP/2';
                nf.createdAt = Date.now();
                nf.status = 'starting';
                nf.statusTimestamp = Date.now();
                window.dataStore.updateNF(nf.id, nf);
            }
            if (topologyData && window.dataStore) this.ensureNFConnectedToBus(nf, topologyData);
            const serviceName = serviceNameMap[nf.type] || nf.type.toLowerCase();
            const randomDelay = (Math.random() * 1.5 + 0.8).toFixed(1);
            this.addTerminalLine(output, ` ✔ Container ${serviceName.padEnd(16)} Started${' '.repeat(20)}${randomDelay}s`, 'success');
            await this.delay(parseFloat(randomDelay) * 1000);
            if (window.logEngine) window.logEngine.addLog(nf.id, 'INFO', `${nf.name} starting via docker compose`, { ipAddress: nf.config.ipAddress, port: nf.config.port, protocol: nf.config.httpProtocol, status: 'starting', source: 'docker-compose' });
            setTimeout(() => {
                const updatedNF = window.dataStore?.getNFById(nf.id);
                if (updatedNF) {
                    updatedNF.status = 'stable';
                    updatedNF.statusTimestamp = Date.now();
                    if (!updatedNF.createdAt && nf.createdAt) updatedNF.createdAt = nf.createdAt;
                    window.dataStore.updateNF(updatedNF.id, updatedNF);
                    if (window.logEngine) window.logEngine.addLog(updatedNF.id, 'SUCCESS', `${updatedNF.name} is now STABLE and ready for connections`, { previousStatus: 'starting', newStatus: 'stable', uptime: '5 seconds', readyForConnections: true });
                    if (updatedNF.type === 'UPF') window.dockerTerminal.autoConnectUPFToSMFAndExtDn(updatedNF);
                    if (window.canvasRenderer) window.canvasRenderer.render();
                }
            }, 5000);
        }
        this.addTerminalLine(output, '', 'blank');
        if (missingConfigs.length > 0) this.addTerminalLine(output, `✅ Started ${missingConfigs.length} new Network Function(s)`, 'success');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    async dockerPS(output) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        if (allNFs.length === 0) { this.addTerminalLine(output, 'No containers running.', 'info'); return; }
        const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'ext-dn', 'gNB': 'oai-gnb', 'UE': 'oai-ue' };
        const imageMap = { 'AMF': 'ghcr.io/openairinterface/oai-amf:develop', 'SMF': 'ghcr.io/openairinterface/oai-smf:develop', 'UPF': 'ghcr.io/openairinterface/oai-upf:develop', 'AUSF': 'ghcr.io/openairinterface/oai-ausf:develop', 'UDM': 'ghcr.io/openairinterface/oai-udm:develop', 'UDR': 'ghcr.io/openairinterface/oai-udr:develop', 'NRF': 'ghcr.io/openairinterface/oai-nrf:develop', 'PCF': 'ghcr.io/openairinterface/oai-pcf:develop', 'NSSF': 'ghcr.io/openairinterface/oai-nssf:develop', 'MySQL': 'ghcr.io/openairinterface/mysql:8.0', 'ext-dn': 'ghcr.io/openairinterface/trf-gen-cn5g:latest', 'gNB': 'ghcr.io/openairinterface/oai-gnb:develop', 'UE': 'ghcr.io/openairinterface/oai-ue:develop' };
        this.addTerminalLine(output, 'CONTAINER ID   IMAGE                                          COMMAND                  CREATED       STATUS                 PORTS                                                   NAMES', 'info');
        this.addTerminalLine(output, '────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────', 'info');
        allNFs.forEach(nf => {
            const containerId = this.generateContainerId();
            const serviceName = serviceNameMap[nf.type] || `oai-${nf.type.toLowerCase()}`;
            const image = imageMap[nf.type] || `ghcr.io/openairinterface/oai-${nf.type.toLowerCase()}:develop`;
            const status = nf.status === 'stable' ? 'Up (healthy)' : 'Up (starting)';
            const ports = this.getPortsForNF(nf);
            const createdAt = nf.createdAt || nf.statusTimestamp || Date.now();
            const createdTime = this.formatCreationTime(createdAt);
            const line = `${containerId}   ${image.padEnd(45)} "${serviceName}"   ${createdTime.padEnd(13)} ${status.padEnd(20)} ${ports.padEnd(55)} ${serviceName}`;
            this.addTerminalLine(output, line, nf.status === 'stable' ? 'success' : 'warning');
        });
    }

    startWatch(output, inputWrapper) {
        if (this.isWatching) { this.addTerminalLine(output, 'Watch mode is already running. Use Ctrl+C to stop.', 'warning'); return; }
        this.isWatching = true;
        this._watchInputWrapper = inputWrapper || null;
        if (this._watchInputWrapper) this._watchInputWrapper.style.display = 'none';
        this.addTerminalLine(output, 'Starting watch mode (refreshes every 1 second)...', 'info');
        this.addTerminalLine(output, 'Press Ctrl+C to stop watching', 'info');
        this.addTerminalLine(output, '', 'blank');
        const initialLength = output.querySelectorAll('.docker-terminal-line').length;
        this.showDockerComposePS(output);
        this.watchInterval = setInterval(() => {
            const allLines = output.querySelectorAll('.docker-terminal-line');
            Array.from(allLines).slice(initialLength).forEach(line => line.remove());
            this.showDockerComposePS(output);
        }, 1000);
    }

    stopWatch() {
        if (this.watchInterval) { clearInterval(this.watchInterval); this.watchInterval = null; this.isWatching = false; }
        if (this._watchInputWrapper) {
            this._watchInputWrapper.style.display = '';
            const input = document.getElementById('docker-terminal-input');
            if (input) input.focus();
            this._watchInputWrapper = null;
        }
    }

    showDockerComposePS(output) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const timestamp = new Date().toLocaleString();
        this.addTerminalLine(output, `Every 1.0s: docker compose -f docker-compose.yml ps -a`, 'info');
        this.addTerminalLine(output, `Timestamp: ${timestamp}`, 'info');
        this.addTerminalLine(output, '', 'blank');
        if (allNFs.length === 0) { this.addTerminalLine(output, 'No services found.', 'info'); return; }
        const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'ext-dn', 'gNB': 'oai-gnb', 'UE': 'oai-ue' };
        const imageMap = { 'AMF': 'oaisoftwarealliance/oai-amf:2024-june', 'SMF': 'oaisoftwarealliance/oai-smf:2024-june', 'UPF': 'oaisoftwarealliance/oai-upf:2024-june', 'AUSF': 'oaisoftwarealliance/oai-ausf:2024-june', 'UDM': 'oaisoftwarealliance/oai-udm:2024-june', 'UDR': 'oaisoftwarealliance/oai-udr:2024-june', 'NRF': 'oaisoftwarealliance/oai-nrf:2024-june', 'PCF': 'oaisoftwarealliance/oai-pcf:2024-june', 'NSSF': 'oaisoftwarealliance/oai-nssf:2024-june', 'MySQL': 'mysql:8.0', 'ext-dn': 'oaisoftwarealliance/trf-gen-cn5g:latest', 'gNB': 'oaisoftwarealliance/oai-gnb:2024-june', 'UE': 'oaisoftwarealliance/oai-ue:2024-june' };
        this.addTerminalLine(output, 'NAME         IMAGE                                     COMMAND                  SERVICE              CREATED              STATUS                        PORTS', 'info');
        this.addTerminalLine(output, '════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════', 'info');
        allNFs.forEach(nf => {
            const serviceName = serviceNameMap[nf.type] || `oai-${nf.type.toLowerCase()}`;
            const image = imageMap[nf.type] || `oaisoftwarealliance/oai-${nf.type.toLowerCase()}:2024-june`;
            const createdAt = nf.createdAt || nf.statusTimestamp || Date.now();
            const created = this.formatCreationTimeForWatch(createdAt);
            const status = nf.status === 'stable' ? `Up ${created} (healthy)` : `Up ${created} (starting)`;
            const ports = this.getPortsForNF(nf);
            const statusColor = nf.status === 'stable' ? 'success' : 'warning';
            const statusIcon = nf.status === 'stable' ? '🟢' : '🔴';
            const line = `${serviceName.padEnd(12)} ${image.padEnd(38)} "${serviceName}"   ${serviceName.padEnd(15)} ${created.padEnd(20)} ${status.padEnd(28)} ${ports}`;
            this.addTerminalLine(output, `${statusIcon} ${line}`, statusColor);
        });
    }

    async dockerComposeDown(output) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        if (allNFs.length === 0) { this.addTerminalLine(output, 'No services to stop.', 'info'); return; }
        const nfIds = allNFs.map(nf => ({ id: nf.id, name: nf.name, type: nf.type }));
        this.addTerminalLine(output, `[+] Running ${nfIds.length + 1}/${nfIds.length + 1}`, 'info');
        const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'oai-ext-dn' };
        for (const nfInfo of nfIds) {
            const serviceName = serviceNameMap[nfInfo.type] || nfInfo.type.toLowerCase();
            const randomDelay = (Math.random() * 1.5 + 0.8).toFixed(1);
            this.addTerminalLine(output, ` ✔ Container ${serviceName.padEnd(16)} Removed${' '.repeat(20)}${randomDelay}s`, 'success');
            await this.delay(parseFloat(randomDelay) * 1000);
            if (window.nfManager) window.nfManager.deleteNetworkFunction(nfInfo.id);
            else if (window.dataStore) window.dataStore.removeNF(nfInfo.id);
        }
        if (window.dataStore) {
            (window.dataStore.getAllBusConnections() || []).forEach(bc => window.dataStore.removeBusConnection(bc.id));
            // Preserve service bus lines so users don't lose topology/connectivity layout after docker compose down.
            // Do not remove all buses here.
        }
        this.addTerminalLine(output, ` ✔ Network oaiworkshop Removed${' '.repeat(20)}0.2s`, 'success');
        this.oaiWorkshopNetworkExists = false;
        this.oaiWorkshopCreatedTime = null;
        this.addTerminalLine(output, '', 'blank');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    async dockerComposeDownSingleNF(serviceName, output) {
        if (!serviceName) { this.addTerminalLine(output, 'Usage: docker compose -f docker-compose.yml down <service-name>', 'error'); return; }
        const serviceToNFTypeMap = { 'oai-nrf': 'NRF', 'oai-amf': 'AMF', 'oai-smf': 'SMF', 'oai-upf': 'UPF', 'oai-ausf': 'AUSF', 'oai-udm': 'UDM', 'oai-udr': 'UDR', 'oai-pcf': 'PCF', 'oai-nssf': 'NSSF', 'mysql': 'MySQL', 'oai-ext-dn': 'ext-dn', 'oai-gnb': 'gNB', 'oai-ue': 'UE' };
        const nfType = serviceToNFTypeMap[serviceName.toLowerCase()];
        if (!nfType) { this.addTerminalLine(output, `Error: Unknown service '${serviceName}'`, 'error'); return; }
        const allNFs = window.dataStore?.getAllNFs() || [];
        const nf = allNFs.find(n => n.type === nfType);
        if (!nf) { this.addTerminalLine(output, `No such service: ${serviceName}`, 'error'); return; }
        this.addTerminalLine(output, `[+] Running 1/1`, 'info');
        const randomDelay = (Math.random() * 0.5 + 0.3).toFixed(1);
        this.addTerminalLine(output, ` ✔ Container ${serviceName.padEnd(16)} Removed${' '.repeat(20)}${randomDelay}s`, 'success');
        await this.delay(parseFloat(randomDelay) * 1000);
        if (window.nfManager) window.nfManager.deleteNetworkFunction(nf.id);
        else if (window.dataStore) window.dataStore.removeNF(nf.id);
        this.addTerminalLine(output, '', 'blank');
        this.addTerminalLine(output, `✅ Stopped and removed ${serviceName}`, 'success');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    async dockerStart(serviceName, output) {
        if (!serviceName) { this.addTerminalLine(output, 'Usage: docker start <service-name>', 'error'); return; }
        const serviceNameMap = { 'oai-amf': 'AMF', 'oai-smf': 'SMF', 'oai-upf': 'UPF', 'oai-ausf': 'AUSF', 'oai-udm': 'UDM', 'oai-udr': 'UDR', 'oai-nrf': 'NRF', 'oai-pcf': 'PCF', 'oai-nssf': 'NSSF', 'mysql': 'MySQL', 'ext-dn': 'ext-dn', 'oai-gnb': 'gNB', 'oai-ue': 'UE' };
        const allNFs = window.dataStore?.getAllNFs() || [];
        const nfType = serviceNameMap[serviceName.toLowerCase()];
        const nf = allNFs.find(n => n.type === nfType);
        if (!nf) { this.addTerminalLine(output, `Service '${serviceName}' not found.`, 'error'); return; }
        this.addTerminalLine(output, `Starting ${nf.name}...`, 'info');
        if (!nf.createdAt) nf.createdAt = Date.now();
        nf.status = 'starting';
        nf.statusTimestamp = Date.now();
        window.dataStore.updateNF(nf.id, nf);
        setTimeout(() => {
            const updatedNF = window.dataStore?.getNFById(nf.id);
            if (updatedNF) {
                updatedNF.status = 'stable';
                updatedNF.statusTimestamp = Date.now();
                window.dataStore.updateNF(updatedNF.id, updatedNF);
                if (updatedNF.type === 'UPF') window.dockerTerminal.autoConnectUPFToSMFAndExtDn(updatedNF);
                if (window.canvasRenderer) window.canvasRenderer.render();
            }
        }, 5000);
        this.addTerminalLine(output, `✅ ${nf.name} started (status: starting)`, 'success');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    async dockerStop(serviceName, output) {
        if (!serviceName) { this.addTerminalLine(output, 'Usage: docker stop <service-name>', 'error'); return; }
        const serviceNameMap = { 'oai-amf': 'AMF', 'oai-smf': 'SMF', 'oai-upf': 'UPF', 'oai-ausf': 'AUSF', 'oai-udm': 'UDM', 'oai-udr': 'UDR', 'oai-nrf': 'NRF', 'oai-pcf': 'PCF', 'oai-nssf': 'NSSF', 'mysql': 'MySQL', 'ext-dn': 'ext-dn', 'oai-gnb': 'gNB', 'oai-ue': 'UE' };
        const allNFs = window.dataStore?.getAllNFs() || [];
        const nf = allNFs.find(n => n.type === serviceNameMap[serviceName.toLowerCase()]);
        if (!nf) { this.addTerminalLine(output, `Service '${serviceName}' not found.`, 'error'); return; }
        this.addTerminalLine(output, `Stopping ${nf.name}...`, 'info');
        nf.status = 'stopped';
        nf.statusTimestamp = Date.now();
        window.dataStore.updateNF(nf.id, nf);
        this.addTerminalLine(output, `✅ ${nf.name} stopped`, 'success');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    async createDefaultNFs(output) {
        const defaultNFs = this.getDefaultNFConfigurations();
        const creationTime = Date.now();
        for (const nfConfig of defaultNFs) {
            this.addTerminalLine(output, `Creating ${nfConfig.type}...`, 'info');
            const position = window.nfManager.calculateAutoPosition(nfConfig.type, 1);
            const nf = window.nfManager.createNetworkFunction(nfConfig.type, position);
            if (nf) {
                nf.config.ipAddress = nfConfig.ipAddress;
                nf.config.port = nfConfig.port;
                nf.config.httpProtocol = nfConfig.httpProtocol || 'HTTP/2';
                nf.createdAt = creationTime;
                window.dataStore.updateNF(nf.id, nf);
                this.addTerminalLine(output, `✅ ${nf.name} created (${nfConfig.ipAddress}:${nfConfig.port})`, 'success');
                await this.delay(200);
            }
        }
        this.addTerminalLine(output, '', 'blank');
        this.addTerminalLine(output, `✅ Created ${defaultNFs.length} default Network Functions`, 'success');
    }

    filterTopology(topology) {
        const filtered = JSON.parse(JSON.stringify(topology));
        if (filtered.nfs && Array.isArray(filtered.nfs)) filtered.nfs = filtered.nfs.filter(nf => nf.type !== 'gNB' && nf.type !== 'UE');
        const serviceBusNFIds = new Set();
        if (filtered.buses && Array.isArray(filtered.buses)) filtered.buses.forEach(bus => { (bus.connections || []).forEach(nfId => serviceBusNFIds.add(nfId)); });
        if (filtered.busConnections && Array.isArray(filtered.busConnections)) filtered.busConnections.forEach(bc => serviceBusNFIds.add(bc.nfId));
        const excludedNFIds = new Set((topology.nfs || []).filter(nf => nf.type === 'gNB' || nf.type === 'UE').map(nf => nf.id));
        if (filtered.connections && Array.isArray(filtered.connections)) {
            const serviceBusInterfaces = ['Nnrf_NFManagement', 'Nnrf_NFDiscovery', 'Nnrf', 'Namf', 'Nsmf', 'Nausf', 'Nudm', 'Npcf', 'Nnssf', 'Nudr'];
            filtered.connections = filtered.connections.filter(conn => {
                if (excludedNFIds.has(conn.sourceId) || excludedNFIds.has(conn.targetId)) return false;
                const bothOnServiceBus = serviceBusNFIds.has(conn.sourceId) && serviceBusNFIds.has(conn.targetId);
                if (bothOnServiceBus && serviceBusInterfaces.some(iface => (conn.interfaceName || '').includes(iface))) return false;
                return true;
            });
        }
        if (filtered.busConnections && Array.isArray(filtered.busConnections)) filtered.busConnections = filtered.busConnections.filter(bc => !excludedNFIds.has(bc.nfId));
        if (filtered.buses && Array.isArray(filtered.buses)) filtered.buses.forEach(bus => { if (bus.connections) bus.connections = bus.connections.filter(nfId => !excludedNFIds.has(nfId)); });
        return filtered;
    }

    checkAndAutoConnect() {
        if (!window.dataStore) return;
        const allNFs = window.dataStore.getAllNFs() || [];

        const ensureVisualConnection = (sourceId, targetId, interfaceName) => {
            if (!sourceId || !targetId) return;
            const existing = window.dataStore.getAllConnections().find(
                c => (c.sourceId === sourceId && c.targetId === targetId) ||
                     (c.sourceId === targetId && c.targetId === sourceId)
            );
            if (existing) {
                if (!existing.showVisual) {
                    existing.showVisual = true;
                    window.dataStore.updateConnection?.(existing.id, existing);
                }
                return;
            }
            window.dataStore.addConnection({
                id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                sourceId, targetId, interfaceName,
                protocol: 'HTTP/2', status: 'connected',
                createdAt: Date.now(), isManual: false, showVisual: true
            });
        };

        const upf   = allNFs.find(n => n.type === 'UPF');
        const smf   = allNFs.find(n => n.type === 'SMF');
        const extDn = allNFs.find(n => n.type === 'ext-dn');
        const mysql = allNFs.find(n => n.type === 'MySQL');
        const udr   = allNFs.find(n => n.type === 'UDR');

        if (upf && smf)   ensureVisualConnection(upf.id,   smf.id,   'N4');
        if (extDn && upf) ensureVisualConnection(extDn.id, upf.id,   'N6');
        if (mysql && udr) ensureVisualConnection(mysql.id, udr.id,   'SQL');

        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    async autoConnectUPFToSMFAndExtDn(upf) {
        if (!upf || upf.type !== 'UPF' || !window.dataStore) return;
        let topology = null;
        try { const response = await fetch(this.topologySource); if (response.ok) topology = this.filterTopology(await response.json()); } catch (e) { console.warn('autoConnectUPFToSMFAndExtDn: failed to load topology', e); }
        const defs = this.getDefaultNFConfigurations();
        const allNFs = window.dataStore.getAllNFs() || [];
        const addConnection = (sourceId, targetId, interfaceName) => {
            const exists = (window.dataStore.getAllConnections() || []).some(c => (c.sourceId === sourceId && c.targetId === targetId) || (c.sourceId === targetId && c.targetId === sourceId));
            if (exists) return;
            window.dataStore.addConnection({ id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, sourceId, targetId, interfaceName, protocol: 'HTTP/2', status: 'connected', createdAt: Date.now(), isManual: false, showVisual: true });
        };
        const createNFFromTopology = (type, defaultConfig) => {
            const topoNF = topology?.nfs?.find(n => n.type === type);
            const posX = topoNF?.position?.x ?? topoNF?.x ?? 100;
            const posY = topoNF?.position?.y ?? topoNF?.y ?? 100;
            const cfg = defaultConfig || defs.find(c => c.type === type);
            const nf = { id: topoNF?.id || `nf-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type, name: topoNF?.name || `${type}-1`, position: { x: posX, y: posY }, color: topoNF?.color || '#00bcd4', config: { ipAddress: cfg?.ipAddress || '192.168.1.12', port: cfg?.port || 8080, httpProtocol: 'HTTP/2', capacity: 1000, load: 0 }, icon: this.normalizeIconPath(topoNF?.icon) || (type === 'SMF' ? 'images/icons/smf.svg' : null), createdAt: Date.now(), status: 'stable', statusTimestamp: Date.now() };
            if (type === 'ext-dn') nf.config.port = 80;
            window.dataStore.addNF(nf);
            if (nf.icon && type === 'SMF') { const img = new Image(); img.src = new URL(nf.icon.startsWith('http') ? nf.icon : nf.icon, window.location.href).href; img.onload = () => { nf.iconImage = img; if (window.canvasRenderer) window.canvasRenderer.render(); }; img.onerror = () => { img.src = new URL('images/icons/smf.svg', window.location.href).href; }; }
            if (window.logEngine) window.logEngine.onNFAdded(nf);
            return nf;
        };
        let smf = allNFs.find(n => n.type === 'SMF');
        if (!smf) smf = createNFFromTopology('SMF', defs.find(c => c.type === 'SMF'));
        let extDn = allNFs.find(n => n.type === 'ext-dn');
        if (!extDn) extDn = createNFFromTopology('ext-dn', { type: 'ext-dn', ipAddress: '192.168.1.15', port: 80, httpProtocol: 'HTTP/2' });
        addConnection(upf.id, smf.id, 'N4');
        addConnection(extDn.id, upf.id, 'N6');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    removeAllBusesAndBusConnections() {
        if (!window.dataStore) return;
        (window.dataStore.getAllBusConnections() || []).forEach(conn => window.dataStore.removeBusConnection(conn.id));
        (window.dataStore.getAllBuses() || []).forEach(bus => window.dataStore.removeBus(bus.id));
    }

    ensureNFConnectedToBus(nf, filteredTopology) {
        if (!window.dataStore || !nf || !nf.id || !filteredTopology) return;

        // Always use the single canvas bus — never create a second one
        const canvasBus = window.dataStore.getAllBuses()[0];
        if (!canvasBus) return; // No bus on canvas yet, nothing to connect to

        const busConnections = filteredTopology.busConnections || [];
        const topologyNFs = filteredTopology.nfs || [];

        // Find topology bus connections for this NF (match by id or by type)
        const connsForThisNF = busConnections.filter(bc =>
            bc.nfId === nf.id ||
            topologyNFs.some(n => n.id === bc.nfId && n.type === nf.type)
        );

        if (connsForThisNF.length === 0) return;

        // Connect to the canvas bus (reuse it, don't create a new one)
        const alreadyConnected = window.dataStore.getAllBusConnections()
            .some(c => c.nfId === nf.id && c.busId === canvasBus.id);

        if (!alreadyConnected) {
            const busConn = connsForThisNF[0];
            window.dataStore.addBusConnection({
                id: `bus-conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                nfId: nf.id,
                busId: canvasBus.id,
                type: 'bus-connection',
                interfaceName: busConn.interfaceName,
                protocol: busConn.protocol || 'HTTP/2',
                status: 'connected',
                createdAt: Date.now()
            });
        }
    }

    async dockerComposeUpSingleNF(serviceName, output) {
        const serviceToNFTypeMap = { 'oai-nrf': 'NRF', 'oai-amf': 'AMF', 'oai-smf': 'SMF', 'oai-upf': 'UPF', 'oai-ausf': 'AUSF', 'oai-udm': 'UDM', 'oai-udr': 'UDR', 'oai-pcf': 'PCF', 'oai-nssf': 'NSSF', 'mysql': 'MySQL', 'oai-ext-dn': 'ext-dn', 'oai-gnb': 'gNB', 'oai-ue': 'UE' };
        const nfType = serviceToNFTypeMap[(serviceName || '').toLowerCase()];
        if (!nfType) { this.addTerminalLine(output, `Error: Unknown service '${serviceName}'`, 'error'); return; }
        if (!window.dataStore || !window.nfManager) { this.addTerminalLine(output, 'Error: System not initialized. Please refresh the page.', 'error'); return; }
        const allNFs = window.dataStore.getAllNFs();
        const existingNF = allNFs.find(nf => nf.type === nfType);
        if (existingNF) { this.addTerminalLine(output, `Error: ${nfType} already exists!`, 'error'); return; }
        const isFirstNF = allNFs.length === 0;
        if (isFirstNF) { this.addTerminalLine(output, `[+] Running 2/2`, 'info'); this.addTerminalLine(output, ' ✔ Network oaiworkshop Created' + ' '.repeat(20) + '0.2s', 'success'); this.oaiWorkshopNetworkExists = true; this.oaiWorkshopCreatedTime = Date.now(); await this.delay(200); } else { this.addTerminalLine(output, `[+] Running 1/1`, 'info'); }
        let topologyNF = null;
        let filteredTopology = null;
        try { const response = await fetch(this.topologySource); if (response.ok) { const topology = await response.json(); filteredTopology = this.filterTopology(topology); topologyNF = filteredTopology.nfs?.find(nf => nf.type === nfType); } } catch (e) { console.warn('Failed to load topology', e); }
        const defaultConfig = this.getDefaultNFConfigurations().find(cfg => cfg.type === nfType);
        let nf;
        if (topologyNF) {
            const posX = topologyNF.position?.x ?? topologyNF.x ?? 100;
            const posY = topologyNF.position?.y ?? topologyNF.y ?? 100;
            nf = { id: topologyNF.id || `nf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: nfType, name: topologyNF.name || nfType, position: { x: posX, y: posY }, color: topologyNF.color, config: { ipAddress: topologyNF.config?.ipAddress || defaultConfig?.ipAddress, port: topologyNF.config?.port || defaultConfig?.port, httpProtocol: topologyNF.config?.httpProtocol || 'HTTP/2', capacity: topologyNF.config?.capacity || 1000, load: topologyNF.config?.load || 0 }, icon: this.normalizeIconPath(topologyNF.icon) || topologyNF.icon, createdAt: Date.now(), status: 'starting', statusTimestamp: Date.now() };
            window.dataStore.addNF(nf);
            if (window.canvasRenderer) window.canvasRenderer.render();
            if (nf.icon) { const img = new Image(); const iconSrc = nf.icon.startsWith('http') ? nf.icon : new URL(nf.icon, window.location.href).href; img.src = iconSrc; img.onload = () => { nf.iconImage = img; if (window.canvasRenderer) window.canvasRenderer.render(); }; img.onerror = () => { img.src = new URL(`images/icons/${nf.type.toLowerCase()}.svg`, window.location.href).href; }; }
            if (window.logEngine) window.logEngine.onNFAdded(nf);
            if (filteredTopology && window.dataStore) { window.dataStore.getAllNFs().forEach(existingNF => this.ensureNFConnectedToBus(existingNF, filteredTopology)); if (window.canvasRenderer) window.canvasRenderer.render(); }
        } else {
            const position = window.nfManager.calculateAutoPosition(nfType, allNFs.length + 1);
            nf = window.nfManager.createNetworkFunction(nfType, position);
            if (!nf) { this.addTerminalLine(output, `Error: Failed to create ${nfType}`, 'error'); return; }
            nf.config.ipAddress = defaultConfig.ipAddress;
            nf.config.port = defaultConfig.port;
            nf.config.httpProtocol = defaultConfig.httpProtocol || 'HTTP/2';
            nf.createdAt = Date.now();
            nf.status = 'starting';
            nf.statusTimestamp = Date.now();
            window.dataStore.updateNF(nf.id, nf);
        }
        const randomDelay = (Math.random() * 1.5 + 0.8).toFixed(1);
        this.addTerminalLine(output, ` ✔ Container ${(serviceName || '').padEnd(16)} Started${' '.repeat(20)}${randomDelay}s`, 'success');
        await this.delay(parseFloat(randomDelay) * 1000);
        if (window.logEngine) window.logEngine.addLog(nf.id, 'INFO', `${nf.name} starting via docker compose`, { ipAddress: nf.config.ipAddress, port: nf.config.port, protocol: nf.config.httpProtocol, status: 'starting', source: 'docker-compose' });
        setTimeout(() => {
            const updatedNF = window.dataStore?.getNFById(nf.id);
            if (updatedNF) { updatedNF.status = 'stable'; updatedNF.statusTimestamp = Date.now(); if (!updatedNF.createdAt && nf.createdAt) updatedNF.createdAt = nf.createdAt; window.dataStore.updateNF(updatedNF.id, updatedNF); if (window.logEngine) window.logEngine.addLog(updatedNF.id, 'SUCCESS', `${updatedNF.name} is now STABLE and ready for connections`, { previousStatus: 'starting', newStatus: 'stable', uptime: '5 seconds', readyForConnections: true }); if (updatedNF.type === 'UPF') window.dockerTerminal.autoConnectUPFToSMFAndExtDn(updatedNF); if (window.canvasRenderer) window.canvasRenderer.render(); }
        }, 5000);
        this.addTerminalLine(output, '', 'blank');
        this.addTerminalLine(output, `✅ ${nfType} deployed successfully on network oaiworkshop (${nf.config.ipAddress})`, 'success');
        if (window.canvasRenderer) window.canvasRenderer.render();
    }

    formatCreationTime(timestamp) {
        if (!timestamp) return '3 weeks ago';
        const diff = Date.now() - timestamp;
        const seconds = Math.floor(diff / 1000), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
        if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
        return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
    }

    formatCreationTimeForWatch(timestamp) {
        if (!timestamp) return 'About a minute ago';
        const diff = Date.now() - timestamp;
        const seconds = Math.floor(diff / 1000), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
        if (seconds < 30) return 'Just now';
        if (seconds < 60 || minutes === 1) return 'About a minute ago';
        if (minutes < 60) return `About ${minutes} minutes ago`;
        if (hours === 1) return 'About an hour ago';
        if (hours < 24) return `About ${hours} hours ago`;
        if (days === 1) return 'About a day ago';
        return `About ${days} days ago`;
    }

    setupWindowControls(terminalModal) {
        const terminalWindow = document.getElementById('docker-terminal-window');
        const titlebar = document.getElementById('docker-terminal-titlebar');
        const resizeHandle = document.getElementById('docker-terminal-resize-handle');
        if (!terminalWindow || !titlebar) return;

        // Dragging is disabled — terminal is always centered
        titlebar.style.cursor = 'default';

        let isResizing = false, resizeStartX = 0, resizeStartY = 0, startWidth = 0, startHeight = 0;
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                if (this.terminalState.isMaximized) return;
                isResizing = true;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                startWidth = terminalWindow.offsetWidth;
                startHeight = terminalWindow.offsetHeight;
                e.preventDefault();
                e.stopPropagation();
            });
        }
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const deltaX = e.clientX - resizeStartX, deltaY = e.clientY - resizeStartY;
            this.terminalState.width = Math.max(400, Math.min(startWidth + deltaX, window.innerWidth - 100));
            this.terminalState.height = Math.max(300, Math.min(startHeight + deltaY, window.innerHeight - 100));
            terminalWindow.style.width = this.terminalState.width + 'px';
            terminalWindow.style.height = this.terminalState.height + 'px';
        });
        document.addEventListener('mouseup', () => { if (isResizing) { isResizing = false; this.saveTerminalState(); } });
    }

    minimizeTerminal(terminalWindow) {
        this.terminalState.isMinimized = !this.terminalState.isMinimized;
        if (this.terminalState.isMinimized) {
            terminalWindow.style.height = '35px';
            const content = document.getElementById('docker-terminal-content');
            if (content) content.style.display = 'none';
            const resizeHandle = document.getElementById('docker-terminal-resize-handle');
            if (resizeHandle) resizeHandle.style.display = 'none';
        } else {
            terminalWindow.style.height = this.terminalState.height + 'px';
            const content = document.getElementById('docker-terminal-content');
            if (content) content.style.display = 'flex';
            const resizeHandle = document.getElementById('docker-terminal-resize-handle');
            if (resizeHandle) resizeHandle.style.display = 'block';
        }
        this.saveTerminalState();
    }

    toggleMaximize(terminalWindow) {
        this.terminalState.isMaximized = !this.terminalState.isMaximized;
        const maximizeBtn = document.getElementById('docker-terminal-maximize');
        if (this.terminalState.isMaximized) {
            if (!terminalWindow.style.left) { const rect = terminalWindow.getBoundingClientRect(); this.terminalState.x = rect.left; this.terminalState.y = rect.top; }
            terminalWindow.style.left = '0';
            terminalWindow.style.top = '0';
            terminalWindow.style.width = '100vw';
            terminalWindow.style.height = '100vh';
            terminalWindow.style.transform = 'none';
            terminalWindow.style.borderRadius = '0';
            if (maximizeBtn) maximizeBtn.textContent = '❐';
        } else {
            terminalWindow.style.width = this.terminalState.width + 'px';
            terminalWindow.style.height = this.terminalState.height + 'px';
            terminalWindow.style.borderRadius = '8px 8px 0 0';
            if (this.terminalState.x !== null && this.terminalState.y !== null) { terminalWindow.style.left = this.terminalState.x + 'px'; terminalWindow.style.top = this.terminalState.y + 'px'; terminalWindow.style.transform = 'none'; } else { terminalWindow.style.left = ''; terminalWindow.style.top = ''; terminalWindow.style.transform = ''; }
            if (maximizeBtn) maximizeBtn.textContent = '□';
        }
        this.saveTerminalState();
    }

    applyTerminalState() {
        const terminalWindow = document.getElementById('docker-terminal-window');
        if (!terminalWindow) return;
        const savedState = localStorage.getItem('dockerTerminalState');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                // Restore size and flags only — never restore x/y so the terminal
                // always opens centered via CSS (left:50% / top:50% / translate(-50%,-50%))
                this.terminalState = {
                    ...this.terminalState,
                    width: parsed.width || this.terminalState.width,
                    height: parsed.height || this.terminalState.height,
                    isMaximized: parsed.isMaximized || false,
                    isMinimized: parsed.isMinimized || false,
                    x: null,
                    y: null
                };
            } catch (e) { console.warn('Failed to load terminal state:', e); }
        }
        terminalWindow.style.width = this.terminalState.width + 'px';
        terminalWindow.style.height = this.terminalState.height + 'px';
        // Leave left/top/transform to CSS so it stays centered
        terminalWindow.style.left = '';
        terminalWindow.style.top = '';
        terminalWindow.style.transform = '';
        if (this.terminalState.isMaximized) this.toggleMaximize(terminalWindow);
        if (this.terminalState.isMinimized) this.minimizeTerminal(terminalWindow);
    }

    saveTerminalState() {
        try {
            // Never persist x/y — terminal always reopens centered
            const stateToSave = { ...this.terminalState, x: null, y: null };
            localStorage.setItem('dockerTerminalState', JSON.stringify(stateToSave));
        } catch (e) { console.warn('Failed to save terminal state:', e); }
    }

    dockerNetworkLS(output) {
        this.addTerminalLine(output, 'NETWORK ID     NAME          DRIVER    SCOPE', 'info');
        this.addTerminalLine(output, 'df33e4a6502d   bridge        bridge    local', 'info');
        this.addTerminalLine(output, '902c1fcc4369   host          host      local', 'info');
        this.addTerminalLine(output, '0c712814bbb0   none          null      local', 'info');
        const hasNFs = window.dataStore && window.dataStore.getAllNFs().length > 0;
        if (this.oaiWorkshopNetworkExists || hasNFs) {
            if (!this.oaiWorkshopNetworkExists && hasNFs) { this.oaiWorkshopNetworkExists = true; this.oaiWorkshopNetworkId = this.oaiWorkshopNetworkId || this.generateNetworkId(); }
            this.addTerminalLine(output, `${this.oaiWorkshopNetworkId}   oaiworkshop   bridge    local`, 'success');
        }
    }

    dockerNetworkInspect(networkName, output) {
        if (networkName === 'bridge') this.inspectBridgeNetwork(output);
        else if (networkName === 'host') this.inspectHostNetwork(output);
        else if (networkName === 'none') this.inspectNoneNetwork(output);
        else if (networkName === 'oaiworkshop') { if (this.oaiWorkshopNetworkExists) this.inspectOAIWorkshopNetwork(output); else this.addTerminalLine(output, `Error: No such network: ${networkName}`, 'error'); }
        else this.addTerminalLine(output, `Error: No such network: ${networkName}`, 'error');
    }

    inspectBridgeNetwork(output) {
        const json = { "Name": "bridge", "Id": "df33e4a6502d1229e87fbd225ce8cc4b95fd4553fcaadee50fd5a70a4a021f3d", "Created": "2026-01-30T15:26:16.417604705+05:30", "Scope": "local", "Driver": "bridge", "EnableIPv4": true, "EnableIPv6": false, "IPAM": { "Driver": "default", "Options": null, "Config": [{ "Subnet": "172.17.0.0/16", "Gateway": "172.17.0.1" }] }, "Internal": false, "Attachable": false, "Ingress": false, "ConfigFrom": { "Network": "" }, "ConfigOnly": false, "Containers": {}, "Options": { "com.docker.network.bridge.default_bridge": "true", "com.docker.network.bridge.enable_icc": "true", "com.docker.network.bridge.enable_ip_masquerade": "true", "com.docker.network.bridge.host_binding_ipv4": "0.0.0.0", "com.docker.network.bridge.name": "docker0", "com.docker.network.driver.mtu": "1500" }, "Labels": {} };
        this.addTerminalLine(output, JSON.stringify([json], null, 2), 'info');
    }

    inspectHostNetwork(output) {
        const json = { "Name": "host", "Id": "902c1fcc436950abba5007bd8b39b65ab96fd9c72b3873519ebc55bc14315b74", "Created": "2026-01-20T15:04:16.397276602+05:30", "Scope": "local", "Driver": "host", "EnableIPv4": true, "EnableIPv6": false, "IPAM": { "Driver": "default", "Options": null, "Config": null }, "Internal": false, "Attachable": false, "Ingress": false, "ConfigFrom": { "Network": "" }, "ConfigOnly": false, "Containers": {}, "Options": {}, "Labels": {} };
        this.addTerminalLine(output, JSON.stringify([json], null, 2), 'info');
    }

    inspectNoneNetwork(output) {
        const json = { "Name": "none", "Id": "0c712814bbb0c32a4d2846f885d90534121f472d0c71d0c34330ad6da8327020", "Created": "2026-01-20T15:04:16.389588497+05:30", "Scope": "local", "Driver": "null", "EnableIPv4": true, "EnableIPv6": false, "IPAM": { "Driver": "default", "Options": null, "Config": null }, "Internal": false, "Attachable": false, "Ingress": false, "ConfigFrom": { "Network": "" }, "ConfigOnly": false, "Containers": {}, "Options": {}, "Labels": {} };
        this.addTerminalLine(output, JSON.stringify([json], null, 2), 'info');
    }

    inspectOAIWorkshopNetwork(output) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const serviceNameMap = { 'AMF': 'oai-amf', 'SMF': 'oai-smf', 'UPF': 'oai-upf', 'AUSF': 'oai-ausf', 'UDM': 'oai-udm', 'UDR': 'oai-udr', 'NRF': 'oai-nrf', 'PCF': 'oai-pcf', 'NSSF': 'oai-nssf', 'MySQL': 'mysql', 'ext-dn': 'oai-ext-dn' };
        const containers = {};
        allNFs.forEach(nf => {
            const serviceName = serviceNameMap[nf.type] || nf.type.toLowerCase();
            const containerId = this.generateContainerId() + this.generateContainerId() + this.generateContainerId() + this.generateContainerId() + this.generateContainerId() + 'abcd';
            containers[containerId] = { "Name": serviceName, "EndpointID": this.generateContainerId() + this.generateContainerId() + this.generateContainerId() + this.generateContainerId() + this.generateContainerId() + 'ef01', "MacAddress": this.generateMacAddress(), "IPv4Address": nf.config.ipAddress + "/26", "IPv6Address": "" };
        });
        const createdTime = this.oaiWorkshopCreatedTime ? new Date(this.oaiWorkshopCreatedTime).toISOString() : new Date().toISOString();
        const json = { "Name": "oaiworkshop", "Id": this.oaiWorkshopNetworkId + "d0a87f40b563d8172b3f54045b0da9d9b859ed25522c2aaa8b86", "Created": createdTime, "Scope": "local", "Driver": "bridge", "EnableIPv4": true, "EnableIPv6": false, "IPAM": { "Driver": "default", "Options": null, "Config": [{ "Subnet": "192.168.1.0/24", "Gateway": "192.168.1.1" }] }, "Internal": false, "Attachable": false, "Ingress": false, "ConfigFrom": { "Network": "" }, "ConfigOnly": false, "Containers": containers, "Options": { "com.docker.network.bridge.name": "oaiworkshop" }, "Labels": { "com.docker.compose.config-hash": "dca0e19cf413805e199db52df7a818f82ffd4a571265d5f722c8e2198676da59", "com.docker.compose.network": "public_net", "com.docker.compose.project": "cn", "com.docker.compose.version": "5.0.1" } };
        this.addTerminalLine(output, JSON.stringify([json], null, 2), 'info');
    }

    generateNetworkId() {
        const chars = '0123456789abcdef';
        let id = '';
        for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
        return id;
    }

    generateMacAddress() {
        const chars = '0123456789abcdef';
        let mac = '';
        for (let i = 0; i < 6; i++) { if (i > 0) mac += ':'; mac += chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)]; }
        return mac;
    }

    dockerVersion(output) {
        ['Client: Docker Engine - Community', ' Version:           28.0.4', ' API version:       1.48', ' Go version:        go1.23.7', ' Git commit:        b8034c0', ' Built:             Tue Mar 25 15:07:11 2025', ' OS/Arch:           linux/amd64', ' Context:           default', '', 'Server: Docker Engine - Community', ' Engine:', '  Version:          28.0.4', '  API version:      1.48 (minimum version 1.24)', '  Go version:       go1.23.7', '  Git commit:       6430e49', '  Built:            Tue Mar 25 15:07:11 2025', '  OS/Arch:          linux/amd64', '  Experimental:     false', ' containerd:', '  Version:          v2.2.1', ' runc:', '  Version:          1.3.4', ' docker-init:', '  Version:          0.19.0'].forEach(line => this.addTerminalLine(output, line, line === '' ? 'blank' : 'info'));
    }
}

window.dockerTerminal = new DockerTerminal();
