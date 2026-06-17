/**
 * ============================================
 * UI CONTROLLER
 * ============================================
 * Manages all user interface interactions and updates
 * 
 * Responsibilities:
 * - Handle button clicks
 * - Manage modals
 * - Update configuration panel
 * - Display logs in UI
 * - Handle connection mode (source/destination selection)
 * - File save/load operations
 */

class UIController {
    constructor() {
        this.connectionMode = 'idle'; // 'idle', 'selecting-source', 'selecting-destination'
        this.selectedSourceNF = null;
        this.selectedDestinationNF = null;

        console.log('✅ UIController initialized');
    }

    /**
     * Initialize all UI components and event listeners
     */
    init() {
        console.log('🎮 Initializing UI...');

        // Setup all button handlers
        this.setupAddNFButton();
        this.setupCoreDeployButton();
        this.setupSaveLoadButtons();
        this.setupClearButton();
        this.setupValidateButton();
        this.setupHelpButton();
        this.setupConnectionButtons();
        this.setupNFPalette();
        this.setupConfigPanelToggle();

        // Initialize log panel
        this.initializeLogPanel();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        console.log('✅ UI initialized');
    }

    // ==========================================
    // NF PALETTE SETUP
    // ==========================================

    /**
     * Setup NF palette in left sidebar
     */
    setupNFPalette() {
        const palette = document.querySelector('.nf-palette');
        if (!palette) return;

        const nfTypes = ['NRF', 'AMF', 'SMF', 'UPF', 'AUSF', 'UDM', 'PCF', 'NSSF', 'UDR'];

        nfTypes.forEach(type => {
            const nfDef = window.nfDefinitions?.[type] || {
                name: type,
                color: '#95a5a6'
            };

            const item = document.createElement('div');
            item.className = 'nf-palette-item';
            item.dataset.type = type;

            item.innerHTML = `
                <div class="nf-icon-small" style="background: ${nfDef.color}">
                    ${type[0]}
                </div>
                <div class="nf-label">
                    <div class="nf-name">${type}</div>
                    <div class="nf-desc">${nfDef.name || type}</div>
                </div>
            `;

            // Click to add NF
            item.addEventListener('click', () => {
                console.log('🖱️ Palette item clicked:', type);
                this.createNFFromPalette(type);
            });

            palette.appendChild(item);
        });
    }

    /**
     * Create NF from palette click - NEW WORKFLOW: Show config first
     * @param {string} type - NF type
     */
    createNFFromPalette(type) {
        console.log('🖱️ Palette item clicked:', type);
        // NEW: Show configuration panel first, don't create NF yet
        this.showNFConfigurationForNewNF(type);
    }

    // ==========================================
    // ADD NF BUTTON & MODAL
    // ==========================================

    /**
     * Setup Add NF button and modal
     */
    setupAddNFButton() {
        const addNFBtn = document.getElementById('btn-add-nf');
        if (!addNFBtn) {
            console.error('❌ Add NF button not found');
            return;
        }

        addNFBtn.addEventListener('click', () => {
            console.log('🖱️ Add NF button clicked');
            this.showAddNFModal();
        });

        // Setup modal
        this.setupAddNFModal();
    }

    /**
     * Setup Add NF modal
     */
    setupAddNFModal() {
        const modal = document.getElementById('add-nf-modal');
        const modalCancel = document.getElementById('modal-cancel');
        const nfGrid = document.getElementById('nf-grid');

        if (!modal || !nfGrid) return;

        // Create NF selection buttons
        const nfTypes = ['NRF', 'AMF', 'SMF', 'UPF', 'AUSF', 'UDM', 'PCF', 'NSSF', 'UDR'];

        nfGrid.innerHTML = '';

        nfTypes.forEach(type => {
            const nfDef = window.nfDefinitions?.[type] || {
                name: type,
                color: '#95a5a6'
            };

            const btn = document.createElement('button');
            btn.className = 'nf-select-btn';
            btn.dataset.type = type;

            btn.innerHTML = `
                <div class="nf-icon" style="background: ${nfDef.color}">
                    ${type[0]}
                </div>
                <div class="nf-label">${type}</div>
            `;

            // Click handler - NEW WORKFLOW: Show config first
            btn.addEventListener('click', () => {
                console.log('🖱️ Modal: Selected NF type:', type);

                // NEW: Show configuration panel first, don't create NF yet
                this.showNFConfigurationForNewNF(type);

                // Close modal
                modal.style.display = 'none';
            });

            nfGrid.appendChild(btn);
        });

        // Cancel button
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Show Add NF modal
     */
    showAddNFModal() {
        const modal = document.getElementById('add-nf-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // ==========================================
    // CORE DEPLOY BUTTON
    // ==========================================

    /**
     * Setup Core Deploy button
     */
    setupCoreDeployButton() {
        const coreDeployBtn = document.getElementById('btn-core-deploy');
        if (!coreDeployBtn) {
            console.error('❌ Core Deploy button not found');
            return;
        }

        coreDeployBtn.addEventListener('click', () => {
            console.log('🚀 Core Deploy button clicked');
            this.showCoreDeployConfirmation();
        });

        console.log('✅ Core Deploy button initialized');
    }

    /**
     * Show Core Deploy confirmation dialog
     */
    showCoreDeployConfirmation() {
        const currentNFs = window.dataStore?.getAllNFs() || [];
        
        let confirmMessage = '🚀 5G Core Network Deployment\n\n';
        confirmMessage += 'This will deploy a complete 5G Service-Based Architecture:\n\n';
        confirmMessage += '📋 Network Functions to Deploy:\n';
        confirmMessage += '• NRF (Network Repository Function)\n';
        confirmMessage += '• AMF (Access and Mobility Management)\n';
        confirmMessage += '• SMF (Session Management Function)\n';
        confirmMessage += '• UPF (User Plane Function)\n';
        confirmMessage += '• AUSF (Authentication Server Function)\n';
        confirmMessage += '• UDM (Unified Data Management)\n';
        confirmMessage += '• PCF (Policy Control Function)\n';
        confirmMessage += '• NSSF (Network Slice Selection Function)\n';
        confirmMessage += '• UDR (Unified Data Repository)\n\n';
        confirmMessage += '🔗 Includes:\n';
        confirmMessage += '• Service Bus with all NF connections\n';
        confirmMessage += '• Pre-configured IP addresses (192.168.1.x)\n';
        confirmMessage += '• Standard 3GPP interfaces\n';
        confirmMessage += '• HTTP/2 protocol configuration\n\n';
        
        if (currentNFs.length > 0) {
            confirmMessage += `⚠️ WARNING: This will replace your current topology!\n`;
            confirmMessage += `Current topology has ${currentNFs.length} Network Functions.\n\n`;
        }
        
        confirmMessage += 'Do you want to proceed with the deployment?';
        
        if (confirm(confirmMessage)) {
            this.deployCoreNetwork();
        }
    }

    /**
     * Deploy the complete 5G core network
     */
    async deployCoreNetwork() {
        try {
            console.log('🚀 Starting 5G Core Network deployment...');
            
            // Show deployment progress
            this.showDeploymentProgress();
            
            // Clear existing topology
            if (window.dataStore) {
                window.dataStore.clearAll();
            }
            
            // Load and deploy from 5g-core.json
            await this.loadCoreConfiguration();
            
            console.log('✅ 5G Core Network deployment completed');
            
        } catch (error) {
            console.error('❌ Core deployment failed:', error);
            alert(`❌ Core Deployment Failed!\n\n${error.message}`);
            
            if (window.logEngine) {
                window.logEngine.addLog('system', 'ERROR', 
                    `Core deployment failed: ${error.message}`);
            }
        }
    }

    /**
     * Show deployment progress modal
     */
    showDeploymentProgress() {
        // Remove existing progress modal if any
        const existingModal = document.getElementById('deployment-progress-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create progress modal
        const modal = document.createElement('div');
        modal.id = 'deployment-progress-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="modal-content deployment-progress-modal">
                <h2>🚀 Deploying 5G Core Network</h2>
                
                <div class="deployment-status">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="deployment-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="deployment-progress-text">Initializing deployment...</div>
                    </div>
                    
                    <div class="deployment-steps" id="deployment-steps">
                        <div class="step-item" id="step-clear">
                            <span class="step-icon">⏳</span>
                            <span class="step-text">Clearing existing topology</span>
                        </div>
                        <div class="step-item" id="step-load">
                            <span class="step-icon">⏳</span>
                            <span class="step-text">Loading core configuration</span>
                        </div>
                        <div class="step-item" id="step-nfs">
                            <span class="step-icon">⏳</span>
                            <span class="step-text">Deploying Network Functions</span>
                        </div>
                        <div class="step-item" id="step-connections">
                            <span class="step-icon">⏳</span>
                            <span class="step-text">Establishing connections</span>
                        </div>
                        <div class="step-item" id="step-complete">
                            <span class="step-icon">⏳</span>
                            <span class="step-text">Finalizing deployment</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Update deployment progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Progress text
     * @param {string} stepId - Current step ID
     */
    updateDeploymentProgress(progress, text, stepId) {
        const progressFill = document.getElementById('deployment-progress-fill');
        const progressText = document.getElementById('deployment-progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
        
        // Update step status
        if (stepId) {
            const stepElement = document.getElementById(stepId);
            if (stepElement) {
                const icon = stepElement.querySelector('.step-icon');
                if (icon) {
                    icon.textContent = '✅';
                }
                stepElement.classList.add('completed');
            }
        }
    }

    /**
     * Load and apply core configuration from 5g-core.json
     */
    async loadCoreConfiguration() {
        try {
            this.updateDeploymentProgress(10, 'Loading 5G core configuration...', 'step-clear');
            
            // Fetch the 5g-core.json file
            const response = await fetch('../5g-core.json');
            if (!response.ok) {
                throw new Error(`Failed to load 5g-core.json: ${response.statusText}`);
            }
            
            const coreConfig = await response.json();
            this.updateDeploymentProgress(20, 'Configuration loaded successfully', 'step-load');
            
            // Deploy Network Functions
            await this.deployNetworkFunctions(coreConfig.nfs);
            this.updateDeploymentProgress(50, 'Network Functions deployed', 'step-nfs');
            
            // Deploy Service Bus
            await this.deployServiceBus(coreConfig.buses);
            this.updateDeploymentProgress(70, 'Service Bus created', 'step-bus');
            
            // Establish connections
            await this.deployConnections(coreConfig.connections, coreConfig.busConnections);
            this.updateDeploymentProgress(90, 'Connections established', 'step-connections');
            
            // Finalize deployment
            this.finalizeDeployment(coreConfig);
            this.updateDeploymentProgress(100, 'Deployment completed successfully!', 'step-complete');
            
            // Close progress modal after a short delay
            setTimeout(() => {
                const modal = document.getElementById('deployment-progress-modal');
                if (modal) {
                    modal.remove();
                }
                
                // Show success message
                this.showDeploymentSuccess(coreConfig);
            }, 2000);
            
        } catch (error) {
            console.error('❌ Failed to load core configuration:', error);
            throw error;
        }
    }

    /**
     * Deploy Network Functions from configuration with detailed logs
     * @param {Array} nfs - Network Functions configuration
     */
    async deployNetworkFunctions(nfs) {
        if (!window.nfManager || !nfs) return;
        
        console.log(`🚀 Deploying ${nfs.length} Network Functions...`);
        
        // Store ID mapping for connections
        this.deploymentIdMapping = {};
        
        for (let i = 0; i < nfs.length; i++) {
            const nfConfig = nfs[i];
            
            // Generate new unique ID
            const newId = this.generateUniqueId(nfConfig.type.toLowerCase());
            
            // Store mapping from old ID to new ID
            this.deploymentIdMapping[nfConfig.id] = newId;
            
            // Log deployment start
            if (window.logEngine) {
                window.logEngine.addLog('system', 'INFO',
                    `[DEPLOY] Starting ${nfConfig.type} deployment (${i + 1}/${nfs.length})`, {
                    nfName: nfConfig.name,
                    nfType: nfConfig.type,
                    targetIP: nfConfig.config.ipAddress,
                    targetPort: nfConfig.config.port,
                    deploymentPhase: 'nf-creation',
                    timestamp: new Date().toISOString()
                });
            }
            
            await this.delay(200);
            
            // Create NF with configuration
            const nf = {
                id: newId,
                type: nfConfig.type,
                name: nfConfig.name,
                position: nfConfig.position,
                color: nfConfig.color,
                status: 'stable',
                statusTimestamp: Date.now(),
                config: {
                    ipAddress: nfConfig.config.ipAddress,
                    port: nfConfig.config.port,
                    capacity: nfConfig.config.capacity || 1000,
                    load: nfConfig.config.load || 0,
                    httpProtocol: nfConfig.config.httpProtocol || 'HTTP/2'
                }
            };
            
            // Add to data store
            window.dataStore.addNF(nf);
            
            // Log successful deployment with service startup
            if (window.logEngine) {
                window.logEngine.addLog(nf.id, 'INFO',
                    `[INFO] ${nf.name} container starting...`, {
                    containerImage: `5g-core/${nf.type.toLowerCase()}:latest`,
                    ipAddress: nf.config.ipAddress,
                    port: nf.config.port,
                    protocol: nf.config.httpProtocol,
                    timestamp: new Date().toISOString()
                });
                
                await this.delay(300);
                
                window.logEngine.addLog(nf.id, 'INFO',
                    `[INFO] Initializing ${nf.type} services...`, {
                    servicePort: nf.config.port,
                    capacity: nf.config.capacity,
                    loadBalancer: 'enabled',
                    timestamp: new Date().toISOString()
                });
                
                await this.delay(400);
                
                window.logEngine.addLog(nf.id, 'SUCCESS',
                    `[INFO] ${nf.name} ready for connections`, {
                    status: 'OPERATIONAL',
                    endpoint: `https://${nf.config.ipAddress}:${nf.config.port}`,
                    healthCheck: 'PASSED',
                    deployment: 'core-deploy',
                    readyForConnections: true,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Delay between NF deployments
            await this.delay(500);
        }
        
        console.log('✅ All Network Functions deployed and ready');
    }

    /**
     * Deploy Service Bus from configuration with detailed logs
     * @param {Array} buses - Service Bus configuration
     */
    async deployServiceBus(buses) {
        if (!window.busManager || !buses) return;
        
        console.log(`🚌 Deploying ${buses.length} Service Bus(es)...`);
        
        // Store bus ID mapping
        this.deploymentBusIdMapping = {};
        
        for (let i = 0; i < buses.length; i++) {
            const busConfig = buses[i];
            const newBusId = this.generateUniqueId('bus');
            
            // Store mapping from old bus ID to new bus ID
            this.deploymentBusIdMapping[busConfig.id] = newBusId;
            
            // Log bus deployment start
            if (window.logEngine) {
                window.logEngine.addLog('system', 'INFO',
                    `[DEPLOY] Creating ${busConfig.name} (${i + 1}/${buses.length})`, {
                    busType: busConfig.type,
                    orientation: busConfig.orientation,
                    length: `${busConfig.length}px`,
                    position: `${busConfig.position.x},${busConfig.position.y}`,
                    deploymentPhase: 'bus-creation',
                    timestamp: new Date().toISOString()
                });
            }
            
            await this.delay(300);
            
            const bus = {
                id: newBusId,
                name: busConfig.name,
                orientation: busConfig.orientation,
                position: busConfig.position,
                length: busConfig.length,
                thickness: busConfig.thickness,
                color: busConfig.color,
                type: busConfig.type,
                connections: []
            };
            
            // Add to data store
            window.dataStore.addBus(bus);
            
            // Log bus ready
            if (window.logEngine) {
                window.logEngine.addLog('system', 'SUCCESS',
                    `[INFO] ${busConfig.name} infrastructure ready`, {
                    busId: newBusId,
                    capacity: 'unlimited',
                    protocol: 'Multi-protocol support',
                    serviceDiscovery: 'enabled',
                    loadBalancing: 'enabled',
                    status: 'OPERATIONAL',
                    timestamp: new Date().toISOString()
                });
            }
            
            await this.delay(400);
        }
        
        console.log('✅ All Service Buses deployed and operational');
    }

    /**
     * Deploy connections from configuration with detailed request/response logs
     * @param {Array} connections - Direct connections
     * @param {Array} busConnections - Bus connections
     */
    async deployConnections(connections, busConnections) {
        console.log('🔗 Starting connection deployment with detailed logs...');
        
        // Deploy bus connections first with detailed logs
        if (busConnections && window.busManager) {
            console.log(`📋 Establishing ${busConnections.length} bus connections...`);
            
            for (let i = 0; i < busConnections.length; i++) {
                const busConn = busConnections[i];
                
                // Map old IDs to new IDs
                const newNfId = this.deploymentIdMapping[busConn.nfId];
                const newBusId = this.deploymentBusIdMapping[busConn.busId];
                
                if (newNfId && newBusId) {
                    const sourceNF = window.dataStore.getNFById(newNfId);
                    const bus = window.dataStore.getBusById(newBusId);
                    
                    if (sourceNF && bus) {
                        // Log the bus connection establishment
                        await this.logBusConnectionSequence(sourceNF, bus, busConn, i + 1, busConnections.length);
                        
                        // Create the actual connection
                        const connection = {
                            id: this.generateUniqueId('bus-conn'),
                            nfId: newNfId,
                            busId: newBusId,
                            type: busConn.type,
                            interfaceName: busConn.interfaceName,
                            protocol: busConn.protocol,
                            status: busConn.status,
                            createdAt: Date.now()
                        };
                        
                        window.dataStore.addBusConnection(connection);
                    }
                }
                
                // Delay between connections for sequential logging
                await this.delay(1500);
            }
        }
        
        // Deploy direct connections with detailed logs
        if (connections && window.connectionManager) {
            console.log(`🔗 Establishing ${connections.length} direct connections...`);
            
            for (let i = 0; i < connections.length; i++) {
                const conn = connections[i];
                
                // Map old IDs to new IDs
                const newSourceId = this.deploymentIdMapping[conn.sourceId];
                const newTargetId = this.deploymentIdMapping[conn.targetId];
                
                if (newSourceId && newTargetId) {
                    const sourceNF = window.dataStore.getNFById(newSourceId);
                    const targetNF = window.dataStore.getNFById(newTargetId);
                    
                    if (sourceNF && targetNF) {
                        // Log the direct connection establishment with full sequence
                        await this.logDirectConnectionSequence(sourceNF, targetNF, conn, i + 1, connections.length);
                        
                        // Create the actual connection
                        const connection = {
                            id: this.generateUniqueId('conn'),
                            sourceId: newSourceId,
                            targetId: newTargetId,
                            interfaceName: conn.interfaceName,
                            protocol: conn.protocol,
                            status: conn.status,
                            createdAt: Date.now(),
                            isManual: conn.isManual || false,
                            showVisual: conn.showVisual || false
                        };
                        
                        window.dataStore.addConnection(connection);
                        
                        // Trigger NRF registration if applicable
                        if (targetNF.type === 'NRF' && sourceNF.type !== 'NRF') {
                            await this.delay(500);
                            if (window.logEngine) {
                                window.logEngine.simulateNRFRegistration(sourceNF, targetNF);
                            }
                        }
                    }
                }
                
                // Delay between connections for sequential logging
                await this.delay(2500);
            }
        }
        
        console.log('✅ All connections established with detailed logs');
    }

    /**
     * Log detailed bus connection sequence
     */
    async logBusConnectionSequence(nf, bus, connConfig, index, total) {
        if (!window.logEngine) return;
        
        const requestId = `bus-req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        // Step 1: Bus connection initiation
        window.logEngine.addLog(nf.id, 'INFO',
            `[REQ] Connecting to Service Bus (${index}/${total})`, {
            requestId: requestId,
            busName: bus.name,
            interface: connConfig.interfaceName,
            protocol: connConfig.protocol,
            busType: bus.type,
            timestamp: new Date().toISOString()
        });
        
        await this.delay(200);
        
        // Step 2: Bus accepts connection
        window.logEngine.addLog('system', 'INFO',
            `[RESP] Service Bus accepting connection from ${nf.name}`, {
            requestId: requestId,
            nfType: nf.type,
            nfAddress: nf.config.ipAddress,
            busCapacity: 'unlimited',
            timestamp: new Date().toISOString()
        });
        
        await this.delay(300);
        
        // Step 3: Interface registration
        window.logEngine.addLog(nf.id, 'INFO',
            `[REQ] Registering ${connConfig.interfaceName} interface`, {
            requestId: requestId,
            interface: connConfig.interfaceName,
            serviceEndpoint: `${nf.config.ipAddress}:${nf.config.port}`,
            timestamp: new Date().toISOString()
        });
        
        await this.delay(200);
        
        // Step 4: Registration confirmed
        window.logEngine.addLog('system', 'SUCCESS',
            `[RESP] ${nf.name} registered on Service Bus`, {
            requestId: requestId,
            status: 'CONNECTED',
            busPosition: `${bus.position.x},${bus.position.y}`,
            timestamp: new Date().toISOString()
        });
        
        await this.delay(300);
        
        // Step 5: Service discovery capability
        window.logEngine.addLog(nf.id, 'SUCCESS',
            `[INFO] Service Bus connection established - Discovery enabled`, {
            requestId: requestId,
            discoveryScope: 'All connected NFs',
            busServices: bus.connections?.length || 0,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log detailed direct connection sequence
     */
    async logDirectConnectionSequence(sourceNF, targetNF, connConfig, index, total) {
        if (!window.logEngine) return;
        
        // Use the log engine's detailed connection sequence
        const connection = {
            id: `temp-${Date.now()}`,
            sourceId: sourceNF.id,
            targetId: targetNF.id,
            interfaceName: connConfig.interfaceName,
            protocol: connConfig.protocol,
            status: 'connected'
        };
        
        // Add deployment context log
        window.logEngine.addLog(sourceNF.id, 'INFO',
            `[DEPLOY] Establishing connection ${index}/${total}: ${sourceNF.name} → ${targetNF.name}`, {
            deploymentPhase: 'connection-establishment',
            connectionIndex: index,
            totalConnections: total,
            interface: connConfig.interfaceName,
            timestamp: new Date().toISOString()
        });
        
        await this.delay(300);
        
        // Generate the full connection sequence
        window.logEngine.generateConnectionSequenceLogs(sourceNF, targetNF, connection);
    }

    /**
     * Finalize deployment with comprehensive network summary
     * @param {Object} coreConfig - Core configuration
     */
    finalizeDeployment(coreConfig) {
        // Update global protocol
        if (coreConfig.nfs && coreConfig.nfs.length > 0) {
            const protocol = coreConfig.nfs[0].config.httpProtocol || 'HTTP/2';
            window.globalHTTPProtocol = protocol;
        }
        
        // Re-render canvas
        if (window.canvasRenderer) {
            window.canvasRenderer.render();
        }
        
        // Update UI elements
        this.updateLogNFFilter();
        
        // Add comprehensive deployment summary
        if (window.logEngine) {
            // Final deployment success log
            window.logEngine.addLog('system', 'SUCCESS',
                '[DEPLOY] 5G Core Network deployment completed successfully', {
                deploymentPhase: 'finalization',
                nfCount: coreConfig.nfs?.length || 0,
                connectionCount: coreConfig.connections?.length || 0,
                busCount: coreConfig.buses?.length || 0,
                busConnectionCount: coreConfig.busConnections?.length || 0,
                deployment: 'one-click-core-deploy',
                timestamp: new Date().toISOString()
            });
            
            // Network topology summary
            setTimeout(() => {
                const allNFs = window.dataStore?.getAllNFs() || [];
                const nfSummary = {};
                allNFs.forEach(nf => {
                    if (!nfSummary[nf.type]) nfSummary[nf.type] = [];
                    nfSummary[nf.type].push(`${nf.name} (${nf.config.ipAddress}:${nf.config.port})`);
                });
                
                window.logEngine.addLog('system', 'INFO',
                    '[INFO] Network topology established', {
                    networkSummary: nfSummary,
                    subnet: '192.168.1.0/24',
                    protocol: window.globalHTTPProtocol || 'HTTP/2',
                    serviceBusEnabled: true,
                    serviceDiscovery: 'NRF-based',
                    timestamp: new Date().toISOString()
                });
            }, 500);
            
            // Start network health monitoring
            setTimeout(() => {
                window.logEngine.addLog('system', 'SUCCESS',
                    '[INFO] 5G Service-Based Architecture is operational', {
                    status: 'FULLY_OPERATIONAL',
                    allServicesUp: true,
                    connectivityMatrix: 'Complete',
                    readyForTraffic: true,
                    monitoringEnabled: true,
                    timestamp: new Date().toISOString()
                });
                
                // Start the connection activity simulation for ongoing logs
                setTimeout(() => {
                    if (window.logEngine && typeof window.logEngine.startConnectionActivitySimulation === 'function') {
                        window.logEngine.startConnectionActivitySimulation();
                    }
                }, 2000);
            }, 1000);
        }
    }

    /**
     * Show deployment success message
     * @param {Object} coreConfig - Deployed configuration
     */
    showDeploymentSuccess(coreConfig) {
        const nfCount = coreConfig.nfs?.length || 0;
        const connectionCount = coreConfig.connections?.length || 0;
        const busCount = coreConfig.buses?.length || 0;
        
        alert(`🚀 5G Core Network Deployed Successfully!\n\n` +
              `📋 Deployment Summary:\n` +
              `• Network Functions: ${nfCount}\n` +
              `• Direct Connections: ${connectionCount}\n` +
              `• Service Buses: ${busCount}\n` +
              `• Bus Connections: ${coreConfig.busConnections?.length || 0}\n\n` +
              `🌐 Network Configuration:\n` +
              `• Subnet: 192.168.1.0/24\n` +
              `• Protocol: HTTP/2\n` +
              `• All NFs registered with NRF\n\n` +
              `Your 5G Service-Based Architecture is ready!`);
    }

    /**
     * Generate unique ID for deployment
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateUniqueId(prefix) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Delay helper for deployment animation
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // CONNECTION BUTTONS (Source/Destination)
    // ==========================================

    /**
     * Setup connection control buttons
     */
    setupConnectionButtons() {
        const btnSource = document.getElementById('btn-select-source');
        const btnDestination = document.getElementById('btn-select-destination');
        const btnCancel = document.getElementById('btn-cancel-connection');

        if (!btnSource || !btnDestination || !btnCancel) {
            console.error('❌ Connection buttons not found');
            return;
        }

        // Select Source button
        btnSource.addEventListener('click', () => {
            console.log('🖱️ Select Source clicked');
            this.enterSourceSelectionMode();
        });

        // Select Destination button
        btnDestination.addEventListener('click', () => {
            console.log('🖱️ Select Destination clicked');
            if (this.selectedSourceNF) {
                // Simplified: Just enter destination mode - user can click NF or Bus
                this.enterDestinationSelectionMode();
                console.log('💡 You can now click on an NF or Bus Line to connect!');
            } else {
                alert('Please select a source NF first!');
            }
        });

        // Cancel button
        btnCancel.addEventListener('click', () => {
            console.log('🖱️ Connection cancelled');
            this.cancelConnectionMode();
        });

        // Listen to canvas clicks for connection mode
        this.setupConnectionModeListener();
    }

    /**
     * Enter bus selection mode
     */
    enterBusSelectionMode() {
        this.connectionMode = 'selecting-bus';

        const btnDestination = document.getElementById('btn-select-destination');
        btnDestination.classList.add('active');
        btnDestination.style.background = '#27ae60';

        this.showCanvasMessage(`Select a SERVICE BUS to connect ${this.selectedSourceNF.name}`);
    }

    /**
     * Select bus and create connection
         */
    selectBus(bus) {
        console.log('✅ Bus selected as destination:', bus.name);

        if (this.selectedSourceNF) {
            // NF to Bus connection
            console.log('🔗 Creating NF-to-Bus connection:', this.selectedSourceNF.name, '→', bus.name);
            if (window.busManager) {
                const connection = window.busManager.connectNFToBus(this.selectedSourceNF.id, bus.id);
                if (connection) {
                    console.log('✅ NF-to-Bus connection created successfully!');
                }
            }
        } else if (this.selectedSourceBus) {
            // Bus to Bus connection
            console.log('🔗 Creating Bus-to-Bus connection:', this.selectedSourceBus.name, '→', bus.name);
            if (window.busManager) {
                const connection = window.busManager.connectBusToBus(this.selectedSourceBus.id, bus.id);
                if (connection) {
                    console.log('✅ Bus-to-Bus connection created successfully!');
                }
            }
        } else {
            console.error('❌ No source selected!');
            alert('Error: No source selected');
        }

        this.cancelConnectionMode();
    }

    /**
     * Setup listener for connection mode canvas clicks
     */
    setupConnectionModeListener() {
        if (window.dataStore) {
            window.dataStore.subscribe((event, data) => {
                if (event === 'nf-added') {
                    this.updateLogNFFilter();
                }
            });
        }

        const canvas = document.getElementById('main-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                if (this.connectionMode === 'idle') return;

                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const clickedNF = window.canvasRenderer?.getNFAtPosition(x, y);
                const clickedBus = this.getBusAtPosition(x, y);

                console.log('🖱️ Canvas click in connection mode:', this.connectionMode);
                console.log('🖱️ Clicked NF:', clickedNF?.name || 'none');
                console.log('🖱️ Clicked Bus:', clickedBus?.name || 'none');

                if (this.connectionMode === 'selecting-source') {
                    // In source mode, allow clicking either NF or Bus
                    if (clickedNF) {
                        console.log('🔗 Selecting NF as source...');
                        this.selectSourceNF(clickedNF);
                    } else if (clickedBus) {
                        console.log('🚌 Selecting Bus as source...');
                        this.selectSourceBus(clickedBus);
                    } else {
                        console.log('❌ Please click on an NF or Bus Line');
                    }
                } else if (this.connectionMode === 'selecting-destination') {
                    // In destination mode, allow clicking either NF or Bus
                    if (clickedNF) {
                        console.log('🔗 Connecting to NF...');
                        this.selectDestinationNF(clickedNF);
                    } else if (clickedBus) {
                        console.log(' Connecting to Bus...');
                        this.selectBus(clickedBus);
                    } else {
                        console.log('❌ Please click on an NF or Bus Line');
                    }
                } else if (this.connectionMode === 'selecting-bus' && clickedBus) {
                    // Keep this for backward compatibility
                    console.log(' Bus click detected, calling selectBus...');
                    this.selectBus(clickedBus);
                }
            });
        }
    }
    /**
     * Enter source selection mode
     */
    enterSourceSelectionMode() {
        this.connectionMode = 'selecting-source';
        this.selectedSourceNF = null;
        this.selectedSourceBus = null; // NEW: Clear bus source
        this.selectedDestinationNF = null;

        // Update UI
        const btnSource = document.getElementById('btn-select-source');
        const btnDestination = document.getElementById('btn-select-destination');
        const btnCancel = document.getElementById('btn-cancel-connection');

        btnSource.classList.add('active');
        btnSource.style.background = '#3498db';
        btnDestination.disabled = true;
        btnCancel.style.display = 'block';

        // Show canvas message
        // this.showCanvasMessage('Click an NF or BUS LINE to set as SOURCE');
    }

    /**
     * Enter destination selection mode
     */
    enterDestinationSelectionMode() {
        this.connectionMode = 'selecting-destination';

        // Update UI
        const btnSource = document.getElementById('btn-select-source');
        const btnDestination = document.getElementById('btn-select-destination');

        btnSource.classList.remove('active');
        btnSource.style.background = '';
        btnDestination.classList.add('active');
        btnDestination.style.background = '#4caf50';

        // // Show canvas message
        // const sourceName = this.selectedSourceNF?.name || this.selectedSourceBus?.name || 'source';
        // this.showCanvasMessage(`Click on an NF or BUS LINE to connect from ${sourceName}`);
    }

    /**
     * Select source NF
     * @param {Object} nf - Selected NF
     */
    selectSourceNF(nf) {
        console.log('✅ Source selected:', nf.name);
        this.selectedSourceNF = nf;

        // Enable destination button
        const btnDestination = document.getElementById('btn-select-destination');
        btnDestination.disabled = false;

        // Auto-switch to destination mode
        this.enterDestinationSelectionMode();
    }

    /**
     * Select source Bus
     * @param {Object} bus - Selected Bus
     */
    selectSourceBus(bus) {
        console.log('✅ Bus source selected:', bus.name);
        this.selectedSourceBus = bus;
        this.selectedSourceNF = null; // Clear NF selection

        // Enable destination button
        const btnDestination = document.getElementById('btn-select-destination');
        btnDestination.disabled = false;

        // Auto-switch to destination mode
        this.enterDestinationSelectionMode();
    }

    /**
     * Select destination NF and show connection interface preview
     * @param {Object} nf - Selected NF
     */
    selectDestinationNF(nf) {
        console.log('✅ NF selected as destination:', nf.name);
        this.selectedDestinationNF = nf;

        if (this.selectedSourceNF) {
            // Show connection interface preview before creating connection
            this.showConnectionInterfacePreview(this.selectedSourceNF, nf);
        } else if (this.selectedSourceBus) {
            // Bus to NF connection (no interface preview needed)
            console.log('🔗 Creating Bus-to-NF connection:', this.selectedSourceBus.name, '→', nf.name);
            if (window.busManager) {
                const connection = window.busManager.connectBusToNF(this.selectedSourceBus.id, nf.id);
                if (connection) {
                    console.log('✅ Bus-to-NF connection created successfully');
                }
            }
            // Reset connection mode
            this.cancelConnectionMode();
        } else {
            console.error('❌ No source selected!');
            alert('Error: No source selected');
            this.cancelConnectionMode();
        }
    }

    /**
     * Cancel connection mode
     */
    cancelConnectionMode() {
        this.connectionMode = 'idle';
        this.selectedSourceNF = null;
        this.selectedSourceBus = null; // NEW: Clear bus source
        this.selectedDestinationNF = null;

        // Update UI
        const btnSource = document.getElementById('btn-select-source');
        const btnDestination = document.getElementById('btn-select-destination');
        const btnCancel = document.getElementById('btn-cancel-connection');

        btnSource.classList.remove('active');
        btnSource.style.background = '';
        btnDestination.classList.remove('active');
        btnDestination.style.background = '';
        btnDestination.disabled = true;
        btnCancel.style.display = 'none';

        // Hide canvas message
        this.hideCanvasMessage();
    }

    /**
     * Show canvas message
     * @param {string} message - Message to display
     */
    showCanvasMessage(message) {
        const msgElement = document.getElementById('canvas-message');
        if (msgElement) {
            msgElement.textContent = message;
            msgElement.classList.add('show');
        }
    }

    /**
     * Hide canvas message
     */
    hideCanvasMessage() {
        const msgElement = document.getElementById('canvas-message');
        if (msgElement) {
            msgElement.classList.remove('show');
        }
    }

    /**
     * Show connection interface preview modal
     * @param {Object} sourceNF - Source Network Function
     * @param {Object} targetNF - Target Network Function
     */
    showConnectionInterfacePreview(sourceNF, targetNF) {
        // Check if connection is valid first
        if (!window.connectionManager.isConnectionValid(sourceNF.type, targetNF.type)) {
            alert(`❌ Invalid Connection\n\n${sourceNF.type} cannot connect to ${targetNF.type}\n\nPer 3GPP specifications, this connection is not allowed.`);
            this.cancelConnectionMode();
            return;
        }

        // Check subnet restriction
        const sourceNetwork = window.connectionManager.getNetworkFromIP(sourceNF.config.ipAddress);
        const targetNetwork = window.connectionManager.getNetworkFromIP(targetNF.config.ipAddress);
        
        if (sourceNetwork !== targetNetwork) {
            alert(`❌ Subnet Restriction!\n\n` +
                  `${sourceNF.name} (${sourceNF.config.ipAddress}) is in subnet ${sourceNetwork}.0/24\n` +
                  `${targetNF.name} (${targetNF.config.ipAddress}) is in subnet ${targetNetwork}.0/24\n\n` +
                  `Network Functions can only connect within the same subnet.`);
            this.cancelConnectionMode();
            return;
        }

        // Get interface information
        const interfaceName = window.connectionManager.getInterfaceName(sourceNF.type, targetNF.type);
        const protocol = window.globalHTTPProtocol || 'HTTP/2';

        // Create and show interface preview modal
        this.createConnectionInterfaceModal(sourceNF, targetNF, interfaceName, protocol);
    }

    /**
     * Create connection interface preview modal
     * @param {Object} sourceNF - Source Network Function
     * @param {Object} targetNF - Target Network Function
     * @param {string} interfaceName - 3GPP interface name
     * @param {string} protocol - HTTP protocol
     */
    createConnectionInterfaceModal(sourceNF, targetNF, interfaceName, protocol) {
        // Remove existing modal if any
        const existingModal = document.getElementById('connection-interface-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'connection-interface-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';

        // Get interface description
        const interfaceDescription = this.getInterfaceDescription(interfaceName);
        const connectionType = this.getConnectionType(sourceNF.type, targetNF.type);

        modal.innerHTML = `
            <div class="modal-content interface-preview-modal">
                <h2>🔗 Connection Interface Preview</h2>
                
                <div class="connection-overview">
                    <div class="connection-flow">
                        <div class="nf-preview source">
                            <div class="nf-icon" style="background: ${this.getNFColor(sourceNF.type)}">
                                ${sourceNF.type[0]}
                            </div>
                            <div class="nf-details">
                                <div class="nf-name">${sourceNF.name}</div>
                                <div class="nf-type">${sourceNF.type}</div>
                                <div class="nf-ip">${sourceNF.config.ipAddress}:${sourceNF.config.port}</div>
                            </div>
                        </div>
                        
                        <div class="connection-arrow">
                            <div class="interface-info">
                                <div class="interface-name">${interfaceName}</div>
                                <div class="interface-protocol">${protocol}</div>
                                <div class="interface-type">${connectionType}</div>
                            </div>
                            <div class="arrow">→</div>
                        </div>
                        
                        <div class="nf-preview target">
                            <div class="nf-icon" style="background: ${this.getNFColor(targetNF.type)}">
                                ${targetNF.type[0]}
                            </div>
                            <div class="nf-details">
                                <div class="nf-name">${targetNF.name}</div>
                                <div class="nf-type">${targetNF.type}</div>
                                <div class="nf-ip">${targetNF.config.ipAddress}:${targetNF.config.port}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="interface-details">
                    <h3>📋 Interface Details</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Interface Name:</label>
                            <span>${interfaceName}</span>
                        </div>
                        <div class="detail-item">
                            <label>Protocol:</label>
                            <span>${protocol}</span>
                        </div>
                        <div class="detail-item">
                            <label>Connection Type:</label>
                            <span>${connectionType}</span>
                        </div>
                        <div class="detail-item">
                            <label>Subnet:</label>
                            <span>${sourceNetwork}.0/24</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-ready">✅ Ready to Connect</span>
                        </div>
                    </div>
                    
                    <div class="interface-description">
                        <h4>Description:</h4>
                        <p>${interfaceDescription}</p>
                    </div>
                </div>

                <div class="modal-actions">
                    <button id="btn-create-connection" class="btn btn-success">
                        🔗 Create Connection
                    </button>
                    <button id="btn-cancel-connection-preview" class="btn btn-secondary">
                        ❌ Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event handlers
        const createBtn = document.getElementById('btn-create-connection');
        const cancelBtn = document.getElementById('btn-cancel-connection-preview');

        createBtn.addEventListener('click', () => {
            this.createConnectionFromPreview(sourceNF, targetNF);
            modal.remove();
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            this.cancelConnectionMode();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                this.cancelConnectionMode();
            }
        });

        console.log('🔗 Interface preview shown:', interfaceName);
    }

    /**
     * Create connection after preview confirmation
     * @param {Object} sourceNF - Source Network Function
     * @param {Object} targetNF - Target Network Function
     */
    createConnectionFromPreview(sourceNF, targetNF) {
        console.log('🔗 Creating NF-to-NF connection:', sourceNF.name, '→', targetNF.name);
        
        if (window.connectionManager) {
            const connection = window.connectionManager.createManualConnection(
                sourceNF.id,
                targetNF.id
            );

            if (connection) {
                console.log('✅ NF-to-NF connection created successfully');
                
                // Show success message with interface details
                alert(`✅ Connection Created Successfully!\n\n` +
                      `Interface: ${connection.interfaceName}\n` +
                      `Protocol: ${connection.protocol}\n` +
                      `Source: ${sourceNF.name} (${sourceNF.config.ipAddress})\n` +
                      `Target: ${targetNF.name} (${targetNF.config.ipAddress})`);
            }
        }

        // Reset connection mode
        this.cancelConnectionMode();
    }

    /**
     * Get interface description for display
     * @param {string} interfaceName - Interface name
     * @returns {string} Interface description
     */
    getInterfaceDescription(interfaceName) {
        const descriptions = {
            'Nnrf_NFManagement': 'Network Function Management interface for NF registration and discovery',
            'Nnrf_NFDiscovery': 'Network Function Discovery interface for finding available services',
            'Namf_Communication': 'AMF Communication interface for mobility and session management',
            'Nausf_UEAuthentication': 'AUSF Authentication interface for user equipment authentication',
            'Nudm_UECM': 'UDM UE Context Management interface for subscriber data',
            'Npcf_AMPolicyControl': 'PCF AM Policy Control interface for access and mobility policies',
            'Nnssf_NSSelection': 'NSSF Network Slice Selection interface',
            'N4': 'Control plane interface between SMF and UPF for session management',
            'Npcf_SMPolicyControl': 'PCF SM Policy Control interface for session management policies',
            'Nudm_SDM': 'UDM Subscriber Data Management interface',
            'Nudr_EventExposure': 'UDR Event Exposure interface for data repository access',
            'Nudm_Authentication': 'UDM Authentication interface for credential verification',
            'Nudm_PolicyControl': 'UDM Policy Control interface for policy data access',
            'N2': 'Control plane interface between gNB and AMF',
            'N3': 'User plane interface between gNB and UPF',
            'N1': 'Control plane interface between UE and AMF',
            'Radio': 'Radio interface between UE and gNB (Uu interface)',
            'SQL/REST API': 'Database interface for subscriber data storage and retrieval',
            'SBI': 'Service-Based Interface for inter-NF communication'
        };

        return descriptions[interfaceName] || 'Service-Based Interface for network function communication';
    }

    /**
     * Get connection type description
     * @param {string} sourceType - Source NF type
     * @param {string} targetType - Target NF type
     * @returns {string} Connection type
     */
    getConnectionType(sourceType, targetType) {
        // Control plane connections
        const controlPlaneNFs = ['AMF', 'SMF', 'AUSF', 'UDM', 'PCF', 'NSSF', 'NRF', 'UDR'];
        
        if (controlPlaneNFs.includes(sourceType) && controlPlaneNFs.includes(targetType)) {
            return 'Control Plane (SBI)';
        }
        
        // User plane connections
        if ((sourceType === 'SMF' && targetType === 'UPF') || 
            (sourceType === 'UPF' && targetType === 'SMF')) {
            return 'Control Plane (N4)';
        }
        
        if ((sourceType === 'gNB' && targetType === 'UPF') || 
            (sourceType === 'UPF' && targetType === 'gNB')) {
            return 'User Plane (N3)';
        }
        
        // Radio access connections
        if ((sourceType === 'UE' && targetType === 'gNB') || 
            (sourceType === 'gNB' && targetType === 'UE')) {
            return 'Radio Access (Uu)';
        }
        
        if ((sourceType === 'gNB' && targetType === 'AMF') || 
            (sourceType === 'AMF' && targetType === 'gNB')) {
            return 'Control Plane (N2)';
        }
        
        if ((sourceType === 'UE' && targetType === 'AMF') || 
            (sourceType === 'AMF' && targetType === 'UE')) {
            return 'Control Plane (N1)';
        }
        
        // Database connections
        if ((sourceType === 'UDM' && targetType === 'MySQL') || 
            (sourceType === 'MySQL' && targetType === 'UDM')) {
            return 'Database Interface';
        }
        
        return 'Service-Based Interface';
    }

    /**
     * Get NF color for display
     * @param {string} nfType - NF type
     * @returns {string} Color hex code
     */
    getNFColor(nfType) {
        const nfDef = window.nfDefinitions?.[nfType];
        return nfDef?.color || '#95a5a6';
    }

    // ==========================================
    // SAVE / LOAD TOPOLOGY BUTTONS
    // ==========================================

    /**
     * Setup Save and Load topology buttons
     */
    setupSaveLoadButtons() {
        const saveBtn = document.getElementById('btn-save-topology');
        const loadBtn = document.getElementById('btn-load-topology');
        const fileInput = document.getElementById('file-input-topology');

        if (!saveBtn || !loadBtn || !fileInput) {
            console.error('❌ Save/Load buttons or file input not found');
            return;
        }

        // Save button
        saveBtn.addEventListener('click', () => {
            console.log('💾 Save topology clicked');
            this.saveTopology();
        });

        // Load button
        loadBtn.addEventListener('click', () => {
            console.log('📁 Load topology clicked');
            fileInput.click(); // Trigger file selection
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('📁 File selected:', file.name);
                this.loadTopology(file);
                // Clear the input so the same file can be loaded again
                fileInput.value = '';
            }
        });

        console.log('✅ Save/Load buttons initialized');
    }

    /**
     * Save topology to JSON file
     */
    saveTopology() {
        if (!window.dataStore) {
            alert('❌ Error: Data store not available');
            return;
        }

        try {
            // Export data from data store
            const topologyData = window.dataStore.exportData();
            
            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `5g-topology-${timestamp}.json`;
            
            // Create and download file
            const jsonString = JSON.stringify(topologyData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            
            URL.revokeObjectURL(url);
            
            console.log('✅ Topology saved:', filename);
            
            // Show success message
            const nfCount = topologyData.nfs?.length || 0;
            const connectionCount = topologyData.connections?.length || 0;
            const busCount = topologyData.buses?.length || 0;
            
            alert(`✅ Topology Saved Successfully!\n\n` +
                  `File: ${filename}\n` +
                  `Network Functions: ${nfCount}\n` +
                  `Connections: ${connectionCount}\n` +
                  `Service Buses: ${busCount}\n\n` +
                  `The file has been downloaded to your Downloads folder.`);
                  
            // Add log entry
            if (window.logEngine) {
                window.logEngine.addLog('system', 'SUCCESS', 
                    `Topology saved to ${filename}`, {
                    nfCount,
                    connectionCount,
                    busCount,
                    timestamp: topologyData.timestamp
                });
            }
            
        } catch (error) {
            console.error('❌ Save topology error:', error);
            alert(`❌ Failed to save topology:\n\n${error.message}`);
            
            if (window.logEngine) {
                window.logEngine.addLog('system', 'ERROR', 
                    `Failed to save topology: ${error.message}`);
            }
        }
    }

    /**
     * Load topology from JSON file
     * @param {File} file - Selected file
     */
    async loadTopology(file) {
        if (!window.dataStore) {
            alert('❌ Error: Data store not available');
            return;
        }

        try {
            // Read file content
            const fileContent = await this.readFileAsText(file);
            const topologyData = JSON.parse(fileContent);
            
            // Validate data structure
            if (!this.validateTopologyData(topologyData)) {
                alert('❌ Invalid topology file format!\n\nPlease select a valid 5G topology JSON file.');
                return;
            }
            
            // Confirm before loading (will clear current topology)
            const currentNFs = window.dataStore.getAllNFs().length;
            const newNFs = topologyData.nfs?.length || 0;
            
            let confirmMessage = `📁 Load Topology\n\n`;
            confirmMessage += `File: ${file.name}\n`;
            confirmMessage += `Network Functions: ${newNFs}\n`;
            confirmMessage += `Connections: ${topologyData.connections?.length || 0}\n`;
            confirmMessage += `Service Buses: ${topologyData.buses?.length || 0}\n\n`;
            
            if (currentNFs > 0) {
                confirmMessage += `⚠️ WARNING: This will replace your current topology!\n`;
                confirmMessage += `Current topology has ${currentNFs} Network Functions.\n\n`;
            }
            
            confirmMessage += `Do you want to continue?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Clear current topology
            window.dataStore.clearAll();
            
            // Import new topology
            window.dataStore.importData(topologyData);
            
            // Re-render canvas
            if (window.canvasRenderer) {
                window.canvasRenderer.render();
            }
            
            // Update UI elements
            this.updateLogNFFilter();
            
            console.log('✅ Topology loaded:', file.name);
            
            // Show success message
            alert(`✅ Topology Loaded Successfully!\n\n` +
                  `File: ${file.name}\n` +
                  `Network Functions: ${newNFs}\n` +
                  `Connections: ${topologyData.connections?.length || 0}\n` +
                  `Service Buses: ${topologyData.buses?.length || 0}\n\n` +
                  `Your 5G network topology has been restored.`);
                  
            // Add log entry
            if (window.logEngine) {
                window.logEngine.addLog('system', 'SUCCESS', 
                    `Topology loaded from ${file.name}`, {
                    nfCount: newNFs,
                    connectionCount: topologyData.connections?.length || 0,
                    busCount: topologyData.buses?.length || 0,
                    originalTimestamp: topologyData.timestamp
                });
            }
            
        } catch (error) {
            console.error('❌ Load topology error:', error);
            
            let errorMessage = '❌ Failed to load topology:\n\n';
            if (error instanceof SyntaxError) {
                errorMessage += 'Invalid JSON file format. Please select a valid topology file.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
            
            if (window.logEngine) {
                window.logEngine.addLog('system', 'ERROR', 
                    `Failed to load topology from ${file.name}: ${error.message}`);
            }
        }
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File content as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Validate topology data structure
     * @param {Object} data - Topology data to validate
     * @returns {boolean} True if valid
     */
    validateTopologyData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check required properties
        if (!Array.isArray(data.nfs)) {
            return false;
        }
        
        if (!Array.isArray(data.connections)) {
            return false;
        }
        
        // Validate NF structure
        for (const nf of data.nfs) {
            if (!nf.id || !nf.type || !nf.name || !nf.config) {
                return false;
            }
            
            if (!nf.config.ipAddress || !nf.config.port) {
                return false;
            }
        }
        
        // Validate connection structure
        for (const conn of data.connections) {
            if (!conn.id || !conn.sourceId || !conn.targetId) {
                return false;
            }
        }
        
        return true;
    }

    // ==========================================
    // CLEAR BUTTON
    // ==========================================



    /**
     * Setup Clear button
     */
    setupClearButton() {
        const clearBtn = document.getElementById('btn-clear');
        if (!clearBtn) return;

        clearBtn.addEventListener('click', () => {
            console.log('🗑️ Clear clicked');
            this.clearTopology();
        });
    }

    /**
     * Clear entire topology
     */
    clearTopology() {
        if (!confirm('Are you sure you want to clear the entire topology? This cannot be undone.')) {
            return;
        }

        // Clear data
        if (window.dataStore) {
            window.dataStore.clearAll();
        }

        // Clear logs
        if (window.logEngine) {
            window.logEngine.clearAllLogs();
        }

        // Clear log UI
        const logContent = document.getElementById('log-content');
        if (logContent) {
            logContent.innerHTML = '';
        }

        // Re-render canvas
        if (window.canvasRenderer) {
            window.canvasRenderer.render();
        }

        console.log('✅ Topology cleared');
        alert('Topology cleared successfully!');
        // Full refresh ensures complete re-initialization of all managers and UI state
        window.location.reload();
    }

    /**
     * Setup Validate button
     */
    setupValidateButton() {
        const validateBtn = document.getElementById('btn-validate');
        if (!validateBtn) return;

        validateBtn.addEventListener('click', () => {
            console.log('✓ Validate clicked');
            this.validateTopology();
        });
    }

    /**
     * Validate topology
     */
    validateTopology() {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const allConnections = window.dataStore?.getAllConnections() || [];

        if (allNFs.length === 0) {
            alert('Topology is empty. Add some Network Functions first.');
            return;
        }

        let report = '═══════════════════════════════════\n';
        report += '5G TOPOLOGY VALIDATION REPORT\n';
        report += '═══════════════════════════════════\n\n';

        // Check for NRF
        const hasNRF = allNFs.some(nf => nf.type === 'NRF');
        if (!hasNRF) {
            report += '❌ CRITICAL: NRF is missing!\n';
            report += '   NRF is required as the central registry.\n\n';
        } else {
            report += '✅ NRF exists\n\n';
        }

        // Check each NF
        report += 'NETWORK FUNCTIONS:\n';
        report += '─────────────────────────────────\n';
        allNFs.forEach(nf => {
            const connections = window.dataStore.getConnectionsForNF(nf.id);
            report += `${nf.name} (${nf.type}): ${connections.length} connections\n`;
        });

        report += '\n';
        report += `Total NFs: ${allNFs.length}\n`;
        report += `Total Connections: ${allConnections.length}\n`;

        report += '\n═══════════════════════════════════\n';
        report += hasNRF ? 'STATUS: ✅ VALID' : 'STATUS: ❌ INVALID';
        report += '\n═══════════════════════════════════';

        alert(report);
        console.log(report);
    }

    /**
     * Setup Help button
     */
    setupHelpButton() {
        const helpBtn = document.getElementById('btn-help');
        if (!helpBtn) return;

        helpBtn.addEventListener('click', () => {
            console.log('❓ Help clicked');
            this.showHelpModal();
        });
    }

    /**
     * Show Help modal
     */
    showHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.style.display = 'flex';
        }

        // Setup close button
        const closeBtn = document.getElementById('help-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    // ==========================================
    // CONFIGURATION PANEL
    // ==========================================

    /**
     * Show NF configuration panel for NEW NF (before creation)
     * @param {string} nfType - NF type to configure
     */
    showNFConfigurationForNewNF(nfType) {
        const configForm = document.getElementById('config-form');
        if (!configForm) return;

        // Check if this NF type is already running
        const allNFs = window.dataStore?.getAllNFs() || [];
        const existingNF = allNFs.find(nf => nf.type === nfType);
        
        if (existingNF) {
            configForm.innerHTML = `
                <h4>⚠️ ${nfType} Already Running</h4>
                <div class="warning-message" style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 0 0 10px 0; color: #856404;">
                        <strong>Cannot start multiple instances</strong>
                    </p>
                    <p style="margin: 0; color: #856404; font-size: 13px;">
                        A ${nfType} instance is already running:<br>
                        <strong>${existingNF.name}</strong> (${existingNF.config.ipAddress}:${existingNF.config.port})
                    </p>
                </div>
                <button class="btn btn-secondary btn-block" id="btn-cancel-nf">Close</button>
            `;
            
            // Cancel button handler
            const cancelBtn = document.getElementById('btn-cancel-nf');
            cancelBtn.addEventListener('click', () => {
                this.hideNFConfigPanel();
            });
            
            return;
        }

        // Get NF definition for defaults
        const nfDef = window.nfManager?.getNFDefinition(nfType) || { name: nfType, color: '#95a5a6' };

        // Generate unique default values automatically
        const count = (window.nfManager?.nfCounters[nfType] || 0) + 1;
        const defaultName = `${nfType}-${count}`;
        
        // Get next available unique IP and port
        const defaultIP = this.getNextAvailableIP();
        const defaultPort = this.getNextAvailablePort();
        const globalProtocol = window.globalHTTPProtocol || 'HTTP/2';

        configForm.innerHTML = `
            <h4>Configure New ${nfType}</h4>
            
            <div class="form-group">
                <label>📍 IP Address</label>
                <input type="text" id="config-ip" value="${defaultIP}" required>
                <small id="ip-validation-msg" class="validation-message"></small>
            </div>
            
            <div class="form-group">
                <label>🔌 Port</label>
                <input type="text" id="config-port" value="${defaultPort}" required>
                <small id="port-validation-msg" class="validation-message"></small>
            </div>
            
            <div class="form-group">
                <label>🌐 HTTP Protocol (Global Setting)</label>
                <select id="config-http-protocol">
                    <option value="HTTP/1" ${globalProtocol === 'HTTP/1' ? 'selected' : ''}>HTTP/1.1</option>
                    <option value="HTTP/2" ${globalProtocol === 'HTTP/2' ? 'selected' : ''}>HTTP/2</option>
                </select>
                <small style="color: #95a5a6; font-size: 11px; display: block; margin-top: 4px;">
                    ⚠️ Changing this will update ALL Network Functions in topology
                </small>
            </div>
            
            <button class="btn btn-success btn-block" id="btn-start-nf" data-nf-type="${nfType}">
                🚀 Start Network Function
            </button>
            <button class="btn btn-secondary btn-block" id="btn-cancel-nf">Cancel</button>
        `;

        // Add real-time validation for IP address
        const ipInput = document.getElementById('config-ip');
        const ipValidationMsg = document.getElementById('ip-validation-msg');
        if (ipInput && ipValidationMsg) {
            ipInput.addEventListener('keypress', (e) => {
                const char = e.key;
                if (!/[0-9.]/.test(char)) {
                    e.preventDefault();
                }
            });
            ipInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const filteredText = pastedText.replace(/[^0-9.]/g, '');
                document.execCommand('insertText', false, filteredText);
            });
            ipInput.addEventListener('input', () => {
                this.validateIPInput(ipInput, ipValidationMsg);
            });
            ipInput.addEventListener('blur', () => {
                this.validateIPInput(ipInput, ipValidationMsg);
            });
        }

        // Add real-time validation for port
        const portInput = document.getElementById('config-port');
        const portValidationMsg = document.getElementById('port-validation-msg');
        if (portInput && portValidationMsg) {
            portInput.addEventListener('keypress', (e) => {
                const char = e.key;
                if (!/[0-9]/.test(char)) {
                    e.preventDefault();
                }
            });
            portInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const filteredText = pastedText.replace(/[^0-9]/g, '');
                document.execCommand('insertText', false, filteredText);
            });
            portInput.addEventListener('input', () => {
                this.validatePortInput(portInput, portValidationMsg);
            });
            portInput.addEventListener('blur', () => {
                this.validatePortInput(portInput, portValidationMsg);
            });
        }

        // Protocol change event listener
        const protocolSelect = document.getElementById('config-http-protocol');
        if (protocolSelect) {
            protocolSelect.addEventListener('change', (e) => {
                const newProtocol = e.target.value;
                const currentProtocol = window.globalHTTPProtocol || 'HTTP/2';

                if (newProtocol !== currentProtocol) {
                    const allNFs = window.dataStore?.getAllNFs() || [];
                    const confirmMsg = `⚠️ GLOBAL PROTOCOL CHANGE\n\n` +
                        `This will change HTTP protocol for ALL ${allNFs.length} Network Functions from ${currentProtocol} to ${newProtocol}.\n\n` +
                        `All NFs will use ${newProtocol} for Service-Based Interfaces.\n\n` +
                        `Do you want to continue?`;

                    if (confirm(confirmMsg)) {
                        if (window.nfManager) {
                            const updateCount = window.nfManager.updateGlobalProtocol(newProtocol);
                            alert(`✅ Success!\n\nUpdated ${updateCount} Network Functions to ${newProtocol}`);
                        }
                    } else {
                        protocolSelect.value = currentProtocol;
                    }
                }
            });
        }

        // Start button handler
        const startBtn = document.getElementById('btn-start-nf');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startNewNetworkFunction(nfType);
            });
        }

        // Cancel button handler
        const cancelBtn = document.getElementById('btn-cancel-nf');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideNFConfigPanel();
            });
        }
    }

    /**
     * Show NF configuration panel
     * @param {Object} nf - Network Function to configure
     */
    showNFConfigPanel(nf) {
        const configForm = document.getElementById('config-form');
        if (!configForm) return;

        configForm.innerHTML = `
            <h4>${nf.name} Configuration</h4>
            
            <div class="form-group">
                <label>NF Type</label>
                <input type="text" value="${nf.type}" disabled>
            </div>
            
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="config-name" value="${nf.name}">
            </div>
            
            <div class="form-group">
                <label>IP Address</label>
                <input type="text" id="config-ip" value="${nf.config.ipAddress}">
            </div>
            
            <div class="form-group">
                <label>Port</label>
                <input type="number" id="config-port" value="${nf.config.port}" min="1000" max="999999">
            </div>
            
            
            <div class="form-group">
                <label>🌐 HTTP Protocol (Global Setting)</label>
                <select id="config-http-protocol">
                    <option value="HTTP/1" ${nf.config.httpProtocol === 'HTTP/1' ? 'selected' : ''}>HTTP/1.1</option>
                    <option value="HTTP/2" ${nf.config.httpProtocol === 'HTTP/2' ? 'selected' : ''}>HTTP/2</option>
                </select>
                <small style="color: #95a5a6; font-size: 11px; display: block; margin-top: 4px;">
                    ⚠️ Changing this will update ALL Network Functions in topology
                </small>
            </div>
            
            
            <button class="btn btn-primary btn-block" id="btn-save-config">Save Changes</button>
            <button class="btn btn-danger btn-block" id="btn-delete-nf">Delete NF</button>
            
        
            <button class="btn btn-terminal btn-block" id="btn-open-terminal">
                💻 Open Command Prompt
            </button>
            
        `;

        // Add keypress and paste listeners for IP input
        const ipInput = document.getElementById('config-ip');
        if (ipInput) {
            ipInput.addEventListener('keypress', (e) => {
                const char = e.key;
                if (!/[0-9.]/.test(char)) {
                    e.preventDefault();
                }
            });
            ipInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const filteredText = pastedText.replace(/[^0-9.]/g, '');
                document.execCommand('insertText', false, filteredText);
            });
        }

        // Add keypress and paste listeners for port input
        const portInput = document.getElementById('config-port');
        if (portInput) {
            portInput.addEventListener('keypress', (e) => {
                const char = e.key;
                if (!/[0-9]/.test(char)) {
                    e.preventDefault();
                }
            });
            portInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const filteredText = pastedText.replace(/[^0-9]/g, '');
                document.execCommand('insertText', false, filteredText);
            });
        }

        // Protocol change event listener
        const protocolSelect = document.getElementById('config-http-protocol');
        if (protocolSelect) {
            protocolSelect.addEventListener('change', (e) => {
                const newProtocol = e.target.value;

                // Show confirmation dialog
                const currentProtocol = window.globalHTTPProtocol || 'HTTP/2';
                if (newProtocol !== currentProtocol) {
                    const allNFs = window.dataStore?.getAllNFs() || [];
                    const confirmMsg = `⚠️ GLOBAL PROTOCOL CHANGE\n\n` +
                        `This will change HTTP protocol for ALL ${allNFs.length} Network Functions from ${currentProtocol} to ${newProtocol}.\n\n` +
                        `All NFs will use ${newProtocol} for Service-Based Interfaces.\n\n` +
                        `Do you want to continue?`;

                    if (confirm(confirmMsg)) {
                        // Update global protocol
                        if (window.nfManager) {
                            const updateCount = window.nfManager.updateGlobalProtocol(newProtocol);
                            alert(`✅ Success!\n\nUpdated ${updateCount} Network Functions to ${newProtocol}`);

                            // Refresh config panel to show updated value
                            this.showNFConfigPanel(nf);
                        }
                    } else {
                        // Revert selection
                        protocolSelect.value = currentProtocol;
                    }
                }
            });
        }

        // Save button handler
        const saveBtn = document.getElementById('btn-save-config');
        saveBtn.addEventListener('click', () => {
            this.saveNFConfig(nf.id);
        });

        // Delete button handler
        const deleteBtn = document.getElementById('btn-delete-nf');
        deleteBtn.addEventListener('click', () => {
            this.deleteNF(nf.id);
        });

        // Ping troubleshooting handlers
        this.setupPingTroubleshootingHandlers(nf.id);
    }

    /**
     * Start new Network Function with IP conflict prevention
     * @param {string} nfType - NF type
     */
    startNewNetworkFunction(nfType) {
        // Check again if this NF type is already running (double-check)
        const allNFs = window.dataStore?.getAllNFs() || [];
        const existingNF = allNFs.find(nf => nf.type === nfType);
        
        if (existingNF) {
            alert(`❌ Cannot Start Multiple Instances!\n\n${nfType} is already running:\n${existingNF.name} (${existingNF.config.ipAddress}:${existingNF.config.port})\n\nOnly one instance of each Network Function type is allowed.`);
            return;
        }

        const ipAddress = document.getElementById('config-ip')?.value;
        const portValue = document.getElementById('config-port')?.value;
        const httpProtocol = document.getElementById('config-http-protocol')?.value;

        if (!ipAddress || !portValue) {
            alert('Please fill all required fields');
            return;
        }

        // Validate port format (no special characters)
        if (!this.isValidPort(portValue)) {
            alert('❌ Invalid Port Number!\n\nPort must contain only digits (no special characters)\n\nPort range: 1000 to 999999\n\nExamples: 8080, 38412, 123456');
            return;
        }

        const port = parseInt(portValue);
        
        // Validate port number (4-6 digits: 1000-999999)
        if (isNaN(port) || port < 1000 || port > 999999) {
            alert('❌ Invalid Port Number!\n\nPort must be between 1000 and 999999 (4-6 digits).\n\nExamples: 8080, 38412, 123456');
            return;
        }
        
        // Generate automatic name
        const count = (window.nfManager?.nfCounters[nfType] || 0) + 1;
        const name = `${nfType}-${count}`;

        // Validate IP address format
        if (!this.isValidIP(ipAddress)) {
            alert('❌ Invalid IP Address!\n\nIP address must be in range 1.0.0.0 to 255.255.255.255\n\nExamples:\n• 192.168.1.20\n• 10.0.0.5\n• 172.16.0.100\n\n❌ Not allowed:\n• 0.0.0.0 or any IP starting with 0\n• Special characters (only digits and dots)');
            return;
        }

        // Check for IP conflicts
        if (!window.nfManager?.isIPAddressAvailable(ipAddress)) {
            alert(`❌ IP Conflict Detected!\n\nIP address ${ipAddress} is already in use by another service.\n\nPlease choose a different IP address.`);
            return;
        }

        // Check for port conflicts
        if (!window.nfManager?.isPortAvailable(port)) {
            alert(`❌ Port Conflict Detected!\n\nPort ${port} is already in use by another service.\n\nPlease choose a different port number.`);
            return;
        }

        console.log('🚀 Starting new NF:', { nfType, name, ipAddress, port, httpProtocol });

        // Calculate position with proper spacing
        const position = this.calculateNFPositionWithSpacing(nfType);

        // Create NF with automatic unique IP/port (will be overridden)
        if (window.nfManager) {
            const nf = window.nfManager.createNetworkFunction(nfType, position);

            if (nf) {
                // Override with user-specified configuration
                nf.name = name;
                nf.config.ipAddress = ipAddress;
                nf.config.port = port;
                nf.config.httpProtocol = httpProtocol;

                // Update in data store
                window.dataStore.updateNF(nf.id, nf);

                console.log('✅ NF started successfully:', nf.name);

                // Log service creation with network info
                if (window.logEngine) {
                    window.logEngine.addLog(nf.id, 'SUCCESS',
                        `${nf.name} created successfully`, {
                        ipAddress: ipAddress,
                        port: port,
                        subnet: window.nfManager?.getNetworkFromIP(ipAddress) + '.0/24',
                        protocol: httpProtocol,
                        status: 'starting',
                        note: 'Service will be stable in 5 seconds'
                    });
                }

                // Auto-connect to bus if applicable
                this.autoConnectToBusIfApplicable(nf);

                // Auto-deploy dependencies based on NF type
                this.autoDeployDependencies(nf);

                // Clear configuration panel
                this.hideNFConfigPanel();

                // Re-render canvas
                if (window.canvasRenderer) {
                    window.canvasRenderer.render();
                }
            }
        } else {
            console.error('❌ NFManager not available');
            alert('Error: NFManager not available');
        }
    }

    /**
     * Calculate NF position with proper spacing
     * @param {string} nfType - NF type
     * @returns {Object} {x, y} position
     */
    calculateNFPositionWithSpacing(nfType) {
        const allNFs = window.dataStore?.getAllNFs() || [];

        // Grid layout with better spacing
        const nfsPerRow = 6;  // More NFs per row
        const nfWidth = 60;   // Smaller width for better fit
        const nfHeight = 80;  // Height including label
        const marginX = 40;   // Horizontal spacing
        const marginY = 60;   // Vertical spacing
        const startX = 120;   // Start position X
        const startY = 120;   // Start position Y

        const totalNFs = allNFs.length;
        const row = Math.floor(totalNFs / nfsPerRow);
        const col = totalNFs % nfsPerRow;

        return {
            x: startX + col * (nfWidth + marginX),
            y: startY + row * (nfHeight + marginY)
        };
    }

    /**
     * Auto-connect NF to bus line if applicable
     * @param {Object} nf - Network Function
     */
    autoConnectToBusIfApplicable(nf) {
        // Don't auto-connect UPF, gNB, and UE as per requirement
        const excludedTypes = ['UPF', 'gNB', 'UE'];

        if (excludedTypes.includes(nf.type)) {
            console.log(`🚫 Skipping auto-connect for ${nf.type} (excluded type)`);
            return;
        }

        // Find available bus lines
        const allBuses = window.dataStore?.getAllBuses() || [];

        if (allBuses.length === 0) {
            console.log('ℹ️ No bus lines available for auto-connect');
            return;
        }

        // Connect to the first available bus (or you can add logic to choose the best bus)
        const targetBus = allBuses[0];

        if (window.busManager) {
            console.log(`🔗 Auto-connecting ${nf.name} to ${targetBus.name}`);
            const connection = window.busManager.connectNFToBus(nf.id, targetBus.id);

            if (connection) {
                console.log(`✅ Auto-connected ${nf.name} to ${targetBus.name}`);

                // Add log for auto-connection
                if (window.logEngine) {
                    window.logEngine.addLog(nf.id, 'INFO',
                        `Auto-connected to ${targetBus.name} service bus`, {
                        busId: targetBus.id,
                        interfaceName: connection.interfaceName,
                        autoConnect: true
                    });
                }
            }
        }
    }

    /**
     * Auto-deploy dependencies for specific NF types
     * - UDR deployment triggers MySQL auto-deployment and auto-connection
     * - UPF deployment triggers EXT-DN auto-deployment and auto-connection
     * @param {Object} nf - Network Function that was just deployed
     */
    autoDeployDependencies(nf) {
        console.log(`🔍 Checking auto-deploy dependencies for ${nf.name} (${nf.type})`);

        // UDR requires MySQL
        if (nf.type === 'UDR') {
            this.autoDeployMySQL(nf);
        }

        // UPF requires EXT-DN
        if (nf.type === 'UPF') {
            this.autoDeployExtDN(nf);
        }
    }

    /**
     * Auto-deploy MySQL database when UDR is deployed
     * @param {Object} udrNF - UDR Network Function
     */
    autoDeployMySQL(udrNF) {
        console.log(`🔍 Checking if MySQL needs to be auto-deployed for ${udrNF.name}`);

        // Check if MySQL already exists
        const allNFs = window.dataStore?.getAllNFs() || [];
        const existingMySQL = allNFs.find(nf => nf.type === 'MySQL');

        if (existingMySQL) {
            console.log(`ℹ️ MySQL already exists: ${existingMySQL.name}`);
            
            // Auto-connect UDR to existing MySQL if not already connected
            this.autoConnectNFs(udrNF, existingMySQL, 'UDR → MySQL');
            return;
        }

        // Auto-deploy MySQL in the same subnet as UDR
        console.log(`🚀 Auto-deploying MySQL for ${udrNF.name}`);

        const sourceNetwork = window.nfManager?.getNetworkFromIP(udrNF.config.ipAddress);
        const mysqlIP = this.getNextAvailableIPInSubnet(sourceNetwork);
        const mysqlPort = this.getNextAvailablePort();

        // Calculate position: MySQL should be positioned above UDR (same x, but higher y position)
        const mysqlPosition = {
            x: udrNF.position.x + 122,  // Slightly to the right of UDR
            y: udrNF.position.y         // Same vertical level as UDR
        };

        // Create MySQL NF
        if (window.nfManager) {
            const mysqlNF = window.nfManager.createNetworkFunction('MySQL', mysqlPosition);

            if (mysqlNF) {
                // Override with same subnet configuration
                mysqlNF.config.ipAddress = mysqlIP;
                mysqlNF.config.port = mysqlPort;
                mysqlNF.config.httpProtocol = udrNF.config.httpProtocol;

                // Update in data store
                window.dataStore.updateNF(mysqlNF.id, mysqlNF);

                console.log(`✅ MySQL auto-deployed: ${mysqlNF.name} (${mysqlIP}:${mysqlPort})`);

                // Log auto-deployment
                if (window.logEngine) {
                    window.logEngine.addLog(mysqlNF.id, 'SUCCESS',
                        `MySQL auto-deployed for ${udrNF.name}`, {
                        reason: 'UDR requires MySQL database',
                        ipAddress: mysqlIP,
                        port: mysqlPort,
                        subnet: sourceNetwork + '.0/24',
                        autoDeployed: true,
                        triggeredBy: udrNF.name
                    });
                }

                // Wait for MySQL to become stable, then auto-connect
                setTimeout(() => {
                    this.autoConnectNFs(udrNF, mysqlNF, 'UDR → MySQL');
                }, 5500); // Wait for MySQL to become stable (5 seconds + buffer)

                // Re-render canvas
                if (window.canvasRenderer) {
                    window.canvasRenderer.render();
                }
            }
        }
    }

    /**
     * Auto-deploy External Data Network when UPF is deployed
     * @param {Object} upfNF - UPF Network Function
     */
    autoDeployExtDN(upfNF) {
        console.log(`🔍 Checking if EXT-DN needs to be auto-deployed for ${upfNF.name}`);

        // Check if EXT-DN already exists
        const allNFs = window.dataStore?.getAllNFs() || [];
        const existingExtDN = allNFs.find(nf => nf.type === 'ext-dn');

        if (existingExtDN) {
            console.log(`ℹ️ EXT-DN already exists: ${existingExtDN.name}`);
            
            // Auto-connect UPF to existing EXT-DN if not already connected
            this.autoConnectNFs(upfNF, existingExtDN, 'UPF → EXT-DN');
            return;
        }

        // Auto-deploy EXT-DN in the same subnet as UPF
        console.log(`🚀 Auto-deploying EXT-DN for ${upfNF.name}`);

        const sourceNetwork = window.nfManager?.getNetworkFromIP(upfNF.config.ipAddress);
        const extDnIP = this.getNextAvailableIPInSubnet(sourceNetwork);
        const extDnPort = this.getNextAvailablePort();

        // Calculate position: EXT-DN should be to the right of UPF (same vertical level)
        const extDnPosition = {
            x: upfNF.position.x + 186,  // To the right of UPF
            y: upfNF.position.y         // Same vertical level as UPF
        };

        // Create EXT-DN NF
        if (window.nfManager) {
            const extDnNF = window.nfManager.createNetworkFunction('ext-dn', extDnPosition);

            if (extDnNF) {
                // Override with same subnet configuration
                extDnNF.config.ipAddress = extDnIP;
                extDnNF.config.port = extDnPort;
                extDnNF.config.httpProtocol = upfNF.config.httpProtocol;

                // Update in data store
                window.dataStore.updateNF(extDnNF.id, extDnNF);

                console.log(`✅ EXT-DN auto-deployed: ${extDnNF.name} (${extDnIP}:${extDnPort})`);

                // Log auto-deployment
                if (window.logEngine) {
                    window.logEngine.addLog(extDnNF.id, 'SUCCESS',
                        `EXT-DN auto-deployed for ${upfNF.name}`, {
                        reason: 'UPF requires External Data Network',
                        ipAddress: extDnIP,
                        port: extDnPort,
                        subnet: sourceNetwork + '.0/24',
                        autoDeployed: true,
                        triggeredBy: upfNF.name
                    });
                }

                // Wait for EXT-DN to become stable, then auto-connect
                setTimeout(() => {
                    this.autoConnectNFs(upfNF, extDnNF, 'UPF → EXT-DN');
                }, 5500); // Wait for EXT-DN to become stable (5 seconds + buffer)

                // Re-render canvas
                if (window.canvasRenderer) {
                    window.canvasRenderer.render();
                }
            }
        }
    }

    /**
     * Auto-connect two NFs if they are in the same subnet and not already connected
     * @param {Object} sourceNF - Source Network Function
     * @param {Object} targetNF - Target Network Function
     * @param {string} description - Connection description for logging
     */
    autoConnectNFs(sourceNF, targetNF, description) {
        // Check if both NFs are stable
        if (sourceNF.status !== 'stable' || targetNF.status !== 'stable') {
            console.log(`⏳ Waiting for both NFs to become stable before connecting`);
            return;
        }

        // Check if they are in the same subnet
        const sourceNetwork = window.nfManager?.getNetworkFromIP(sourceNF.config.ipAddress);
        const targetNetwork = window.nfManager?.getNetworkFromIP(targetNF.config.ipAddress);

        if (sourceNetwork !== targetNetwork) {
            console.warn(`⚠️ Cannot auto-connect: ${sourceNF.name} and ${targetNF.name} are in different subnets`);
            
            if (window.logEngine) {
                window.logEngine.addLog(sourceNF.id, 'WARNING',
                    `Auto-connection blocked: Different subnets`, {
                    sourceSubnet: sourceNetwork + '.0/24',
                    targetSubnet: targetNetwork + '.0/24',
                    reason: 'Cross-subnet connections not allowed'
                });
            }
            return;
        }

        // Check if connection already exists
        const existingConnections = window.dataStore.getConnectionsForNF(sourceNF.id);
        const alreadyConnected = existingConnections.some(conn => 
            conn.sourceId === targetNF.id || conn.targetId === targetNF.id
        );

        if (alreadyConnected) {
            console.log(`ℹ️ ${description}: Already connected`);
            return;
        }

        // Create auto-connection
        if (window.connectionManager) {
            const connection = window.connectionManager.createManualConnection(sourceNF.id, targetNF.id);
            
            if (connection) {
                console.log(`✅ Auto-connected: ${description}`);
                
                if (window.logEngine) {
                    window.logEngine.addLog(sourceNF.id, 'SUCCESS',
                        `Auto-connected to ${targetNF.name}`, {
                        targetType: targetNF.type,
                        interface: connection.interfaceName,
                        autoConnection: true,
                        subnet: sourceNetwork + '.0/24',
                        reason: 'Dependency requirement'
                    });
                }

                // Re-render canvas
                if (window.canvasRenderer) {
                    window.canvasRenderer.render();
                }
            }
        }
    }

    /**
     * Get next available IP in a specific subnet
     * @param {string} subnet - Subnet (e.g., "192.168.1")
     * @returns {string} Available IP address
     */
    getNextAvailableIPInSubnet(subnet) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const usedIPs = new Set(allNFs.map(nf => nf.config.ipAddress));

        for (let host = 10; host <= 254; host++) {
            const ip = `${subnet}.${host}`;
            if (!usedIPs.has(ip)) {
                return ip;
            }
        }

        // Fallback
        return `${subnet}.${Math.floor(Math.random() * 244) + 10}`;
    }

    /**
     * Hide NF configuration panel
     */
    hideNFConfigPanel() {
        const configForm = document.getElementById('config-form');
        if (configForm) {
            configForm.innerHTML = '<p class="hint">Select a Network Function type to configure and start it</p>';
        }
    }

    /**
     * Save NF configuration with IP conflict prevention
     * @param {string} nfId - NF ID
     */
    saveNFConfig(nfId) {
        const name = document.getElementById('config-name')?.value;
        const ipAddress = document.getElementById('config-ip')?.value;
        const portValue = document.getElementById('config-port')?.value;
        const httpProtocol = document.getElementById('config-http-protocol')?.value;

        if (!name || !ipAddress || !portValue) {
            alert('Please fill all required fields');
            return;
        }

        // Validate port format (no special characters)
        if (!this.isValidPort(portValue)) {
            alert('❌ Invalid Port Number!\n\nPort must contain only digits (no special characters)\n\nPort range: 1000 to 999999\n\nExamples: 8080, 38412, 123456');
            return;
        }

        const port = parseInt(portValue);

        // Validate port number (4-6 digits: 1000-999999)
        if (isNaN(port) || port < 1000 || port > 999999) {
            alert('❌ Invalid Port Number!\n\nPort must be between 1000 and 999999 (4-6 digits).\n\nExamples: 8080, 38412, 123456');
            return;
        }

        // Validate IP address format
        if (!this.isValidIP(ipAddress)) {
            alert('❌ Invalid IP Address!\n\nIP address must be in range 1.0.0.0 to 255.255.255.255\n\nExamples:\n• 192.168.1.20\n• 10.0.0.5\n• 172.16.0.100\n\n❌ Not allowed:\n• 0.0.0.0 or any IP starting with 0\n• Special characters (only digits and dots)');
            return;
        }

        // Check for IP conflicts (excluding current NF)
        const currentNf = window.dataStore.getNFById(nfId);
        if (currentNf && currentNf.config.ipAddress !== ipAddress) {
            if (!window.nfManager?.isIPAddressAvailable(ipAddress)) {
                alert(`❌ IP Conflict Detected!\n\nIP address ${ipAddress} is already in use by another service.\n\nPlease choose a different IP address.`);
                return;
            }
        }

        // Check for port conflicts (excluding current NF)
        if (currentNf && currentNf.config.port !== port) {
            if (!window.nfManager?.isPortAvailable(port)) {
                alert(`❌ Port Conflict Detected!\n\nPort ${port} is already in use by another service.\n\nPlease choose a different port number.`);
                return;
            }
        }

        // Update NF
        const nf = window.dataStore.getNFById(nfId);
        if (nf) {
            const oldIP = nf.config.ipAddress;
            const oldPort = nf.config.port;

            nf.name = name;
            nf.config.ipAddress = ipAddress;
            nf.config.port = port;
            nf.config.httpProtocol = httpProtocol;

            window.dataStore.updateNF(nfId, nf);

            // Log configuration change
            if (window.logEngine) {
                const changes = [];
                if (oldIP !== ipAddress) changes.push(`IP: ${oldIP} → ${ipAddress}`);
                if (oldPort !== port) changes.push(`Port: ${oldPort} → ${port}`);
                
                if (changes.length > 0) {
                    window.logEngine.addLog(nfId, 'INFO',
                        `Configuration updated: ${changes.join(', ')}`, {
                        previousIP: oldIP,
                        newIP: ipAddress,
                        previousPort: oldPort,
                        newPort: port,
                        subnet: window.nfManager?.getNetworkFromIP(ipAddress) + '.0/24'
                    });
                }
            }

            // Re-render
            if (window.canvasRenderer) {
                window.canvasRenderer.render();
            }

            alert('✅ Configuration saved successfully!\n\n' + 
                  `IP: ${ipAddress}\n` +
                  `Port: ${port}\n` +
                  `Subnet: ${window.nfManager?.getNetworkFromIP(ipAddress)}.0/24`);
            console.log('✅ NF config saved:', nf.name);
        }
    }

    /**
     * Delete NF
     * @param {string} nfId - NF ID
     */
    deleteNF(nfId) {
        const nf = window.dataStore.getNFById(nfId);
        if (!nf) return;

        if (!confirm(`Are you sure you want to delete ${nf.name}?`)) {
            return;
        }

        if (window.nfManager) {
            window.nfManager.deleteNetworkFunction(nfId);
        }

        this.hideNFConfigPanel();
    }

    // ==========================================
    // LOG PANEL
    // ==========================================

    /**
     * Initialize log panel
     */
    initializeLogPanel() {
        console.log('📋 Initializing log panel...');

        // Subscribe to log engine
        if (window.logEngine) {
            window.logEngine.subscribe((logEntry) => {
                if (logEntry.type) return; // Skip event objects
                this.appendLogToUI(logEntry);
            });
        }

        // Setup log controls
        const filterNF = document.getElementById('log-filter-nf');
        const filterLevel = document.getElementById('log-filter-level');
        const clearBtn = document.getElementById('btn-clear-logs');
        const exportBtn = document.getElementById('btn-export-logs');
        const toggleBtn = document.getElementById('btn-toggle-logs');

        if (filterNF) {
            filterNF.addEventListener('change', () => this.filterLogs());
        }

        if (filterLevel) {
            filterLevel.addEventListener('change', () => this.filterLogs());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const logContent = document.getElementById('log-content');
                if (logContent) {
                    logContent.innerHTML = '';
                }
                if (window.logEngine) {
                    window.logEngine.clearAllLogs();
                }
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleLogPanel());
        }

        console.log('✅ Log panel initialized');
    }

    /**
     * Append log entry to UI
     * @param {Object} logEntry - Log entry object
     */
    appendLogToUI(logEntry) {
        const logContent = document.getElementById('log-content');
        if (!logContent) return;

        const nf = window.dataStore?.getNFById(logEntry.nfId);
        const nfName = nf?.name || logEntry.nfId;

        const logDiv = document.createElement('div');
        logDiv.className = `log-entry ${logEntry.level}`;
        logDiv.dataset.nfId = logEntry.nfId;
        logDiv.dataset.level = logEntry.level;

        // Add request ID for visual grouping if present
        if (logEntry.details && logEntry.details.requestId) {
            logDiv.dataset.requestId = logEntry.details.requestId;
        }

        const time = new Date(logEntry.timestamp).toLocaleTimeString();

        logDiv.innerHTML = `
            <span class="log-timestamp">[${time}]</span>
            <span class="log-nf-name">${nfName}</span>
            <span class="log-level">${logEntry.level}</span>
            <span class="log-message">${this.escapeHtml(logEntry.message)}</span>
        `;

        // Add details if present
        if (logEntry.details && Object.keys(logEntry.details).length > 0) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'log-details';

            Object.entries(logEntry.details).forEach(([key, value]) => {
                const detailLine = document.createElement('div');
                detailLine.className = `detail-${key}`;
                
                // Format different types of details
                let displayValue = value;
                if (typeof value === 'object' && value !== null) {
                    displayValue = JSON.stringify(value, null, 2);
                } else if (key === 'timestamp') {
                    displayValue = new Date(value).toLocaleString();
                } else if (key.includes('Time') || key.includes('Duration')) {
                    displayValue = value;
                }
                
                detailLine.textContent = `${key}: ${displayValue}`;
                detailsDiv.appendChild(detailLine);
            });

            logDiv.appendChild(detailsDiv);
        }

        logContent.appendChild(logDiv);

        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;

        // Limit displayed logs
        while (logContent.children.length > 500) {
            logContent.removeChild(logContent.firstChild);
        }
    }

    /**
     * Filter logs based on selected filters
     */
    filterLogs() {
        const filterNF = document.getElementById('log-filter-nf')?.value || 'all';
        const filterLevel = document.getElementById('log-filter-level')?.value || 'all';
        const logContent = document.getElementById('log-content');

        if (!logContent) return;

        const allLogEntries = logContent.querySelectorAll('.log-entry');

        allLogEntries.forEach(entry => {
            let show = true;

            if (filterNF !== 'all' && entry.dataset.nfId !== filterNF) {
                show = false;
            }

            if (filterLevel !== 'all' && entry.dataset.level !== filterLevel) {
                show = false;
            }

            entry.style.display = show ? 'flex' : 'none';
        });
    }

    /**
     * Update NF filter dropdown in log panel
     */
    updateLogNFFilter() {
        const select = document.getElementById('log-filter-nf');
        if (!select) return;

        const currentValue = select.value;

        // Clear options except "All NFs"
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add option for each NF
        const allNFs = window.dataStore?.getAllNFs() || [];
        allNFs.forEach(nf => {
            const option = document.createElement('option');
            option.value = nf.id;
            option.textContent = `${nf.name} (${nf.type})`;
            select.appendChild(option);
        });

        // Restore previous selection if valid
        if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    }

    /**
     * Export logs
     */
    exportLogs() {
        if (!window.logEngine) return;

        const format = prompt('Export format (json/csv/txt):', 'txt');

        if (!format) return;

        let content, filename, mimeType;

        if (format.toLowerCase() === 'json') {
            content = window.logEngine.exportLogsAsJSON();
            filename = `5g-logs-${Date.now()}.json`;
            mimeType = 'application/json';
        } else if (format.toLowerCase() === 'csv') {
            content = window.logEngine.exportLogsAsCSV();
            filename = `5g-logs-${Date.now()}.csv`;
            mimeType = 'text/csv';
        } else if (format.toLowerCase() === 'txt') {
            content = window.logEngine.exportLogsAsText();
            filename = `5g-logs-${Date.now()}.txt`;
            mimeType = 'text/plain';
        } else {
            alert('Invalid format. Use "json", "csv", or "txt"');
            return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log('✅ Logs exported as', format);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Toggle log panel visibility
     */
    toggleLogPanel() {
        const logPanel = document.getElementById('log-panel');
        const toggleIcon = document.getElementById('toggle-icon');

        if (!logPanel || !toggleIcon) return;

        const isCollapsed = logPanel.classList.contains('collapsed');

        if (isCollapsed) {
            // Show logs
            logPanel.classList.remove('collapsed');
            toggleIcon.textContent = '▼';
            console.log('📋 Log panel expanded');
        } else {
            // Hide logs
            logPanel.classList.add('collapsed');
            toggleIcon.textContent = '▲';
            console.log('📋 Log panel collapsed');
        }

        // Trigger canvas resize after panel toggle animation completes
        setTimeout(() => {
            if (window.canvasRenderer) {
                window.canvasRenderer.resizeCanvas();
            }
        }, 350); // Wait for CSS transition to complete (300ms + buffer)
    }

    /**
     * Setup configuration panel toggle
     */
    setupConfigPanelToggle() {
        const toggleBtn = document.getElementById('btn-toggle-config');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleConfigPanel());
            console.log('✅ Config panel toggle initialized');
        } else {
            console.warn('⚠️ Config panel toggle button not found');
        }
    }

    /**
     * Toggle configuration panel visibility
     */
    toggleConfigPanel() {
        const sidebar = document.querySelector('.sidebar-right');
        const toggleIcon = document.getElementById('config-toggle-icon');

        if (!sidebar || !toggleIcon) return;

        const isCollapsed = sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            // Show config panel
            sidebar.classList.remove('collapsed');
            toggleIcon.textContent = '◀';
            console.log('⚙️ Config panel expanded');
        } else {
            // Hide config panel
            sidebar.classList.add('collapsed');
            toggleIcon.textContent = '▶';
            console.log('⚙️ Config panel collapsed');
        }

        // Trigger canvas resize after panel toggle animation completes
        setTimeout(() => {
            if (window.canvasRenderer) {
                window.canvasRenderer.resizeCanvas();
            }
        }, 350); // Wait for CSS transition to complete (300ms + buffer)
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + L to toggle logs
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.toggleLogPanel();
            }

            // Ctrl/Cmd + K to toggle config panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggleConfigPanel();
            }

            // F1 or Ctrl/Cmd + H to show help
            if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === 'h')) {
                e.preventDefault();
                this.showHelpModal();
            }
        });

        console.log('⌨️ Keyboard shortcuts initialized (Ctrl+L: Toggle logs, Ctrl+K: Toggle config, F1/Ctrl+H: Help)');
    }




    /**
     * Setup ping troubleshooting handlers
     * @param {string} nfId - NF ID
     */
    setupPingTroubleshootingHandlers(nfId) {
        const terminalBtn = document.getElementById('btn-open-terminal');
        const pingHistoryBtn = document.getElementById('btn-ping-history');

        if (terminalBtn) {
            terminalBtn.addEventListener('click', () => {
                this.openWindowsTerminal(nfId);
            });
        }

        if (pingHistoryBtn) {
            pingHistoryBtn.addEventListener('click', () => {
                this.showPingHistory(nfId);
            });
        }
    }

    /**
     * Execute ping to specific target IP
     * @param {string} nfId - Source NF ID
     */
    async executePingTarget(nfId) {
        const targetIP = document.getElementById('ping-target-ip')?.value?.trim();
        
        if (!targetIP) {
            alert('Please enter a target IP address');
            return;
        }

        // Validate IP format
        if (!this.isValidIP(targetIP)) {
            alert('Please enter a valid IP address (e.g., 192.168.1.20)');
            return;
        }

        const nf = window.dataStore?.getNFById(nfId);
        if (!nf) return;

        // Check if ping is already active
        if (window.pingManager && window.pingManager.isPingActive(nfId)) {
            alert('Ping is already in progress. Please wait for it to complete.');
            return;
        }

        console.log(`🏓 Executing ping from ${nf.name} to ${targetIP}`);

        // Disable button during ping
        const btn = document.getElementById('btn-ping-target');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '🏓 Pinging...';
        }

        try {
            if (window.pingManager) {
                await window.pingManager.executePing(nfId, targetIP, 4);
            } else {
                console.error('❌ PingManager not available');
                alert('Ping functionality not available');
            }
        } catch (error) {
            console.error('❌ Ping error:', error);
            if (window.logEngine) {
                window.logEngine.addLog(nfId, 'ERROR', `Ping failed: ${error.message}`);
            }
        } finally {
            // Re-enable button
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🏓 Ping Target IP';
            }
        }
    }

    /**
     * Execute ping to all network services
     * @param {string} nfId - Source NF ID
     */
    async executePingNetwork(nfId) {
        const nf = window.dataStore?.getNFById(nfId);
        if (!nf) return;

        // Check if ping is already active
        if (window.pingManager && window.pingManager.isPingActive(nfId)) {
            alert('Ping is already in progress. Please wait for it to complete.');
            return;
        }

        console.log(`📡 Executing network ping from ${nf.name}`);

        // Disable button during ping
        const btn = document.getElementById('btn-ping-network');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '📡 Scanning Network...';
        }

        try {
            if (window.pingManager) {
                await window.pingManager.pingNetworkServices(nfId);
            } else {
                console.error('❌ PingManager not available');
                alert('Ping functionality not available');
            }
        } catch (error) {
            console.error('❌ Network ping error:', error);
            if (window.logEngine) {
                window.logEngine.addLog(nfId, 'ERROR', `Network ping failed: ${error.message}`);
            }
        } finally {
            // Re-enable button
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📡 Ping Network Services';
            }
        }
    }

    /**
     * Show ping history for NF
     * @param {string} nfId - NF ID
     */
    showPingHistory(nfId) {
        const nf = window.dataStore?.getNFById(nfId);
        if (!nf) return;

        if (!window.pingManager) {
            alert('Ping functionality not available');
            return;
        }

        const history = window.pingManager.getPingHistory(nfId);
        
        if (history.length === 0) {
            alert(`No ping history available for ${nf.name}\n\nExecute some ping commands first to see history.`);
            return;
        }

        let historyText = `═══════════════════════════════════\n`;
        historyText += `PING HISTORY FOR ${nf.name}\n`;
        historyText += `═══════════════════════════════════\n\n`;

        history.slice(-10).forEach((entry, index) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            historyText += `${index + 1}. ${timestamp}\n`;
            historyText += `   Target: ${entry.targetIP}\n`;
            historyText += `   Result: ${entry.summary.received}/${entry.summary.sent} packets received (${entry.summary.lossPercentage}% loss)\n\n`;
        });

        historyText += `═══════════════════════════════════\n`;
        historyText += `Total ping sessions: ${history.length}\n`;
        historyText += `Showing last ${Math.min(10, history.length)} sessions\n`;
        historyText += `═══════════════════════════════════`;

        alert(historyText);
    }

    /**
     * Open Windows-style terminal for NF
     * @param {string} nfId - NF ID
     */
    openWindowsTerminal(nfId) {
        const nf = window.dataStore?.getNFById(nfId);
        if (!nf) return;

        // Create terminal modal
        this.createTerminalModal(nf);
    }

    /**
     * Create Windows-style terminal modal
     * @param {Object} nf - Network Function
     */
    createTerminalModal(nf) {
        // Remove existing terminal if any
        const existingTerminal = document.getElementById('windows-terminal-modal');
        if (existingTerminal) {
            existingTerminal.remove();
        }

        // Create terminal modal
        const terminalModal = document.createElement('div');
        terminalModal.id = 'windows-terminal-modal';
        terminalModal.className = 'windows-terminal-modal';
        
        terminalModal.innerHTML = `
            <div class="windows-terminal-window">
                <div class="windows-terminal-titlebar">
                    <div class="terminal-title">
                        <span class="terminal-icon">⬛</span>
                        Command Prompt - ${nf.name} (${nf.config.ipAddress})
                    </div>
                    <div class="terminal-controls">
                        <button class="terminal-btn close" id="terminal-close">×</button>
                    </div>
                </div>
                <div class="windows-terminal-content" id="terminal-content">
                    <div class="terminal-output" id="terminal-output">
                        <div class="terminal-line terminal-info">5G WIRELESS LAB</div>
                        <div class="terminal-line terminal-info">Type "help" for available commands.</div>
                        <div class="terminal-line terminal-blank">&nbsp;</div>
                    </div>
                    <div class="terminal-input-wrapper" id="terminal-input-wrapper">
                        <span class="terminal-prompt">C:\\${nf.name}></span>
                        <input type="text" id="terminal-input" class="terminal-input" autocomplete="off" spellcheck="false">
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(terminalModal);

        // Setup terminal functionality
        this.setupWindowsTerminal(nf, terminalModal);

        // Show terminal with animation
        setTimeout(() => {
            terminalModal.classList.add('show');
        }, 10);

        // Focus on input
        const input = document.getElementById('terminal-input');
        if (input) {
            input.focus();
        }
    }

    /**
     * Setup Windows terminal functionality
     * @param {Object} nf - Network Function
     * @param {HTMLElement} terminalModal - Terminal modal element
     */
    setupWindowsTerminal(nf, terminalModal) {
        const input = document.getElementById('terminal-input');
        const output = document.getElementById('terminal-output');
        const content = document.getElementById('terminal-content');
        const closeBtn = document.getElementById('terminal-close');
        
        let commandHistory = [];
        let historyIndex = -1;

        // Close button
        closeBtn.addEventListener('click', () => {
            terminalModal.classList.remove('show');
            setTimeout(() => {
                terminalModal.remove();
            }, 300);
        });

        // Click outside to close
        terminalModal.addEventListener('click', (e) => {
            if (e.target === terminalModal) {
                closeBtn.click();
            }
        });

        // Input handling
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const command = input.value.trim();
                if (command) {
                    // Add to history
                    commandHistory.push(command);
                    historyIndex = commandHistory.length;

                    // Display command inline (like real terminal)
                    this.addTerminalLine(output, `C:\\${nf.name}>${command}`, 'command');
                    
                    // Clear input
                    input.value = '';

                    // Process command
                    await this.processWindowsCommand(nf, command, output);
                    
                    // Scroll to bottom
                    this.scrollTerminalToBottom(content);
                } else {
                    // Empty enter — just print a blank prompt line
                    this.addTerminalLine(output, `C:\\${nf.name}>`, 'command');
                    this.scrollTerminalToBottom(content);
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
                this.handleWindowsTabCompletion(input, nf);
            } else if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                output.innerHTML = '';
            } else {
                this._nfTabState = null;
            }
        });

        // Focus input on any click in terminal
        if (content) {
            content.addEventListener('click', (e) => {
                if (e.target !== input) {
                    input.focus();
                }
            });
        }
    }

    scrollTerminalToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }

    handleWindowsTabCompletion(input, nf) {
        const commandTokens = [
            ['help'],
            ['ifconfig'],
            ['ping'],
            ['ping', 'gateway'],
            ['systeminfo'],
            ['netstat'],
            ['cls'],
            ['clear'],
            ['exit']
        ];

        const raw = input.value;
        const trailingSpace = raw.endsWith(' ');
        const tokens = raw.trimStart().split(/\s+/).filter(Boolean);
        const wordIndex = trailingSpace ? tokens.length : tokens.length - 1;
        const prefix = trailingSpace ? '' : (tokens[wordIndex] || '').toLowerCase();
        const before = trailingSpace ? tokens : tokens.slice(0, wordIndex);

        // Cycle if tab pressed again on same input
        if (this._nfTabState && this._nfTabState.base === raw) {
            this._nfTabState.index = (this._nfTabState.index + 1) % this._nfTabState.candidates.length;
            const next = this._nfTabState.candidates[this._nfTabState.index];
            input.value = [...before, next].join(' ');
            this._nfTabState.base = input.value;
            return;
        }

        // Fresh tab — find candidates for current word
        const candidates = commandTokens
            .filter(cmd => {
                if (cmd.length <= wordIndex) return false;
                for (let i = 0; i < before.length; i++) {
                    if ((cmd[i] || '').toLowerCase() !== before[i].toLowerCase()) return false;
                }
                return cmd[wordIndex].toLowerCase().startsWith(prefix);
            })
            .map(cmd => cmd[wordIndex]);

        const unique = [...new Set(candidates)];
        if (unique.length === 0) return;

        input.value = [...before, unique[0]].join(' ');
        this._nfTabState = unique.length > 1
            ? { base: input.value, candidates: unique, index: 0 }
            : null;
    }

    /**
     * Process Windows command
     * @param {Object} nf - Network Function
     * @param {string} command - Command to process
     * @param {HTMLElement} output - Output element
     */
    async processWindowsCommand(nf, command, output) {
        const cmd = command.toLowerCase().trim();
        const args = command.split(' ');

        if (cmd === 'help' || cmd === '?') {
            this.showWindowsHelp(output);
        } else if (cmd === 'ifconfig') {
            this.showifconfig(nf, output);
        } else if (cmd.startsWith('ping ')) {
            const target = args[1];
            if (target === 'gateway') {
                await this.executeWindowsPingGateway(nf, output);
            } else if (target) {
                await this.executeWindowsPing(nf, target, output);
            } else {
                this.addTerminalLine(output, 'Usage: ping <hostname or IP address>', 'error');
                this.addTerminalLine(output, '       ping gateway', 'error');
            }
        } else if (cmd === 'cls' || cmd === 'clear') {
            output.innerHTML = '';
        } else if (cmd === 'exit') {
            const closeBtn = document.getElementById('terminal-close');
            if (closeBtn) closeBtn.click();
        } else if (cmd === 'systeminfo') {
            this.showSystemInfo(nf, output);
        } else if (cmd === 'netstat') {
            this.showNetstat(nf, output);
        } else if (cmd === '') {
            // Empty command, just show prompt
        } else {
            this.addTerminalLine(output, `'${command}' is not recognized as an internal or external command,`, 'error');
            this.addTerminalLine(output, 'operable program or batch file.', 'error');
        }

        this.addTerminalLine(output, '', 'blank');
    }

    /**
     * Add line to terminal output
     * @param {HTMLElement} output - Output element
     * @param {string} text - Text to add
     * @param {string} type - Line type (command, info, error, success, blank)
     */
    addTerminalLine(output, text, type = 'normal') {
        const line = document.createElement('div');
        line.className = `terminal-line terminal-${type}`;
        line.innerHTML = text || '&nbsp;';
        output.appendChild(line);
        
        // Auto-scroll to bottom
        output.scrollTop = output.scrollHeight;
    }

    /**
     * Show Windows help
     * @param {HTMLElement} output - Output element
     */
    showWindowsHelp(output) {
        const helpText = [
            'Available commands:',
            '',
            'HELP           - Display this help message',
            'ifconfig       - Display network configuration',
            'PING <ip>      - Test connectivity to specific IP',
            'PING GATEWAY   - Test connectivity to default gateway',
            'SYSTEMINFO     - Display system information',
            'NETSTAT        - Display network connections',
            'CLS            - Clear the screen',
            'EXIT           - Close this terminal',
            '',
            'Network Commands:',
            '  ping 192.168.1.10    - Ping specific IP address',
            '  ping gateway         - Test gateway connectivity',
            ''
        ];

        helpText.forEach(line => {
            this.addTerminalLine(output, line, 'info');
        });
    }

    /**
     * Show IP configuration
     * @param {Object} nf - Network Function
     * @param {HTMLElement} output - Output element
     */
    showifconfig(nf, output) {
        const sourceNetwork = this.getNetworkFromIP(nf.config.ipAddress);
        const gatewayIP = `${sourceNetwork}.1`;
        
        const lines = [
            'Windows IP Configuration',
            '',
            'Ethernet adapter Local Area Connection:',
            '',
            `   Connection-specific DNS Suffix  . : 5g.local`,
            `   IPv4 Address. . . . . . . . . . . : ${nf.config.ipAddress}`,
            `   Subnet Mask . . . . . . . . . . . : 255.255.255.0`,
            `   Default Gateway . . . . . . . . . : ${gatewayIP}`,
            `   DNS Servers . . . . . . . . . . . : 8.8.8.8`,
            ''
        ];

        lines.forEach(line => {
            this.addTerminalLine(output, line, 'info');
        });
    }

    /**
     * Execute Windows-style ping with subnet restrictions
     * @param {Object} nf - Network Function
     * @param {string} target - Target IP or hostname
     * @param {HTMLElement} output - Output element
     */
    async executeWindowsPing(nf, target, output) {
        // Disable terminal input during ping
        const input = document.getElementById('terminal-input');
        const inputWrapper = document.getElementById('terminal-input-wrapper');
        if (input) {
            input.disabled = true;
            input.placeholder = '';
            if (inputWrapper) {
                inputWrapper.style.opacity = '0.5';
            }
        }

        try {
            // Validate IP
            if (!this.isValidIP(target)) {
                this.addTerminalLine(output, `Ping request could not find host ${target}. Please check the name and try again.`, 'error');
                return;
            }

            // Check subnet restriction FIRST
            const sourceNetwork = this.getNetworkFromIP(nf.config.ipAddress);
            const targetNetwork = this.getNetworkFromIP(target);
            
            if (sourceNetwork !== targetNetwork) {
                this.addTerminalLine(output, `Pinging ${target} with 32 bytes of data:`, 'info');
                this.addTerminalLine(output, '', 'blank');
                this.addTerminalLine(output, `PING: transmit failed. General failure.`, 'error');
                this.addTerminalLine(output, '', 'blank');
                this.addTerminalLine(output, `Network Error: Cannot reach ${target}`, 'error');
                this.addTerminalLine(output, `Source subnet: ${sourceNetwork}.0/24`, 'error');
                this.addTerminalLine(output, `Target subnet: ${targetNetwork}.0/24`, 'error');
                this.addTerminalLine(output, `Reason: Cross-subnet communication not allowed`, 'error');
                this.addTerminalLine(output, '', 'blank');
                this.addTerminalLine(output, `Ping statistics for ${target}:`, 'info');
                this.addTerminalLine(output, `    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),`, 'info');
                return;
            }

            // Initial ping message
            this.addTerminalLine(output, `Pinging ${target} with 32 bytes of data:`, 'info');
            this.addTerminalLine(output, '', 'blank');

            // Check if target is reachable (same subnet)
            const isReachable = this.isTargetReachable(nf, target);
            const results = [];

            // Send 4 ping packets with 0.5 second delays
            for (let i = 1; i <= 4; i++) {
                await this.delay(500); // 0.5 second delay

                if (isReachable) {
                    const responseTime = this.generateResponseTime();
                    const ttl = 255;
                    
                    results.push({
                        sequence: i,
                        time: responseTime,
                        ttl: ttl,
                        success: true
                    });

                    this.addTerminalLine(output, 
                        `Reply from ${target}: bytes=32 time=${responseTime}ms TTL=${ttl}`, 
                        'success'
                    );
                } else {
                    await this.delay(500); // Additional delay for timeout
                    
                    results.push({
                        sequence: i,
                        success: false,
                        timeout: true
                    });

                    this.addTerminalLine(output, 'Request timed out.', 'error');
                }
            }

            // Show statistics after final delay
            await this.delay(500);
            this.showPingStatistics(target, results, output);
        } finally {
            // Re-enable terminal input after ping completes
            if (input) {
                input.disabled = false;
                input.placeholder = '';
                input.focus();
                if (inputWrapper) {
                    inputWrapper.style.opacity = '1';
                }
            }
        }
    }

    /**
     * Execute ping to gateway
     * @param {Object} nf - Network Function
     * @param {HTMLElement} output - Output element
     */
    async executeWindowsPingGateway(nf, output) {
        // Disable terminal input during ping
        const input = document.getElementById('terminal-input');
        const inputWrapper = document.getElementById('terminal-input-wrapper');
        if (input) {
            input.disabled = true;
            input.placeholder = '';
            if (inputWrapper) {
                inputWrapper.style.opacity = '0.5';
            }
        }

        try {
            const sourceNetwork = this.getNetworkFromIP(nf.config.ipAddress);
            const gatewayIP = `${sourceNetwork}.1`; // Gateway is typically .1
            
            this.addTerminalLine(output, `Pinging Gateway: ${gatewayIP}`, 'info');
            this.addTerminalLine(output, `Source: ${nf.name} (${nf.config.ipAddress})`, 'info');
            this.addTerminalLine(output, `Subnet: ${sourceNetwork}.0/24`, 'info');
            this.addTerminalLine(output, '', 'blank');
            
            // Gateway ping simulation
            this.addTerminalLine(output, `Pinging ${gatewayIP} with 32 bytes of data:`, 'info');
            this.addTerminalLine(output, '', 'blank');

            const results = [];
            
            // Send 4 ping packets to gateway
            for (let i = 1; i <= 4; i++) {
                await this.delay(500);
                
                // Gateway is always reachable in same subnet
                const responseTime = this.generateGatewayResponseTime();
                const ttl = 64; // Gateway TTL
                
                results.push({
                    sequence: i,
                    time: responseTime,
                    ttl: ttl,
                    success: true
                });

                this.addTerminalLine(output, 
                    `Reply from ${gatewayIP}: bytes=32 time=${responseTime}ms TTL=${ttl}`, 
                    'success'
                );
            }

            // Show gateway statistics
            await this.delay(500);
            this.showPingStatistics(gatewayIP, results, output);
            
            this.addTerminalLine(output, '', 'blank');
            this.addTerminalLine(output, `✅ Gateway ${gatewayIP} is reachable`, 'success');
            this.addTerminalLine(output, `Network connectivity: GOOD`, 'success');
        } finally {
            // Re-enable terminal input after ping completes
            if (input) {
                input.disabled = false;
                input.placeholder = '';
                input.focus();
                if (inputWrapper) {
                    inputWrapper.style.opacity = '1';
                }
            }
        }
    }

    /**
     * Execute ping subnet with detailed subnet information and running IPs
     * @param {Object} nf - Network Function
     * @param {HTMLElement} output - Output element
     */
    /**
     * Generate gateway response time (typically faster than regular hosts)
     * @returns {number} Response time in milliseconds
     */
    generateGatewayResponseTime() {
        // Gateway typically responds faster (1-5ms)
        return Math.max(1, Math.round(Math.random() * 4 + 1));
    }

    /**
     * Show ping statistics
     * @param {string} target - Target IP
     * @param {Array} results - Ping results
     * @param {HTMLElement} output - Output element
     */
    showPingStatistics(target, results, output) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const lossPercentage = Math.round((failed.length / results.length) * 100);

        this.addTerminalLine(output, '', 'blank');
        this.addTerminalLine(output, `Ping statistics for ${target}:`, 'info');
        this.addTerminalLine(output, 
            `    Packets: Sent = ${results.length}, Received = ${successful.length}, Lost = ${failed.length} (${lossPercentage}% loss),`, 
            'info'
        );

        if (successful.length > 0) {
            const times = successful.map(r => r.time);
            const min = Math.min(...times);
            const max = Math.max(...times);
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

            this.addTerminalLine(output, 'Approximate round trip times in milli-seconds:', 'info');
            this.addTerminalLine(output, 
                `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`, 
                'info'
            );
        }
    }

    /**
     * Show directory listing
     * @param {HTMLElement} output - Output element
     */
   

    /**
     * Show system information
     * @param {Object} nf - Network Function
     * @param {HTMLElement} output - Output element
     */
    showSystemInfo(nf, output) {
        const uptime = window.nfManager?.getServiceUptime(nf) || 'Unknown';
        const lines = [
            'Host Name:                 ' + nf.name,
            'Network Card:              5G Service Interface',
            '                          Connection Name: Local Area Connection',
            `                          IP Address:      ${nf.config.ipAddress}`,
            `                          Port:            ${nf.config.port}`,
            `                          Protocol:        ${nf.config.httpProtocol}`,
            `System Up Time:            ${uptime}`,
            `Service Status:            ${nf.status.toUpperCase()}`,
            ''
        ];

        lines.forEach(line => {
            this.addTerminalLine(output, line, 'info');
        });
    }

    /**
     * Show network statistics
     * @param {Object} nf - Network Function
     * @param {HTMLElement} output - Output element
     */
    showNetstat(nf, output) {
        const connections = window.dataStore?.getConnectionsForNF(nf.id) || [];
        const busConnections = window.dataStore?.getBusConnectionsForNF(nf.id) || [];
        
        this.addTerminalLine(output, 'Active Connections', 'info');
        this.addTerminalLine(output, '', 'blank');
        this.addTerminalLine(output, '  Proto  Local Address          Foreign Address        State', 'info');

        // Show direct connections
        connections.forEach(conn => {
            const otherNfId = conn.sourceId === nf.id ? conn.targetId : conn.sourceId;
            const otherNf = window.dataStore?.getNFById(otherNfId);
            if (otherNf) {
                this.addTerminalLine(output, 
                    `  TCP    ${nf.config.ipAddress}:${nf.config.port}         ${otherNf.config.ipAddress}:${otherNf.config.port}         ESTABLISHED`, 
                    'info'
                );
            }
        });

        // Show bus connections
        busConnections.forEach(busConn => {
            const bus = window.dataStore?.getBusById(busConn.busId);
            if (bus) {
                this.addTerminalLine(output, 
                    `  TCP    ${nf.config.ipAddress}:${nf.config.port}         ${bus.name}:BUS            ESTABLISHED`, 
                    'info'
                );
            }
        });

        if (connections.length === 0 && busConnections.length === 0) {
            this.addTerminalLine(output, '  No active connections.', 'info');
        }

        this.addTerminalLine(output, '', 'blank');
    }

    /**
     * Helper methods for terminal functionality
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isTargetReachable(sourceNf, targetIP) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const targetNf = allNFs.find(nf => nf.config.ipAddress === targetIP);
        
        if (!targetNf) {
            return Math.random() < 0.1; // 10% success for unknown IPs
        }

        const sourceNetwork = this.getNetworkFromIP(sourceNf.config.ipAddress);
        const targetNetwork = this.getNetworkFromIP(targetIP);
        
        if (sourceNetwork !== targetNetwork) {
            return Math.random() < 0.2; // 20% success for different networks
        }

        // Check if both services are stable
        if (sourceNf.status !== 'stable' || targetNf.status !== 'stable') {
            return Math.random() < 0.3; // 30% success if not both stable
        }

        return Math.random() < 0.9; // 90% success for stable same-network services
    }

    getNetworkFromIP(ip) {
        const parts = ip.split('.');
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }

    generateResponseTime() {
        const baseTime = Math.random() * 50 + 1;
        const variation = (Math.random() - 0.5) * 10;
        return Math.max(1, Math.round(baseTime + variation));
    }

    /**
     * Get next available IP address automatically
     * @returns {string} Next available IP address
     */
    getNextAvailableIP() {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const usedIPs = new Set(allNFs.map(nf => nf.config.ipAddress));
        
        // Define subnets in priority order
        const subnets = [
            '192.168.1', // Core network functions
            '192.168.2', // User plane functions  
            '192.168.3', // Edge services
            '192.168.4'  // Additional services
        ];

        // Find next available IP in priority order
        for (const subnet of subnets) {
            for (let host = 10; host <= 254; host++) {
                const ip = `${subnet}.${host}`;
                if (!usedIPs.has(ip)) {
                    console.log(`🌐 Auto-assigned next available IP: ${ip}`);
                    return ip;
                }
            }
        }

        // Fallback if all subnets are full
        const randomSubnet = Math.floor(Math.random() * 254) + 1;
        const randomHost = Math.floor(Math.random() * 244) + 10;
        const fallbackIP = `192.168.${randomSubnet}.${randomHost}`;
        
        console.warn(`⚠️ Using fallback IP: ${fallbackIP}`);
        return fallbackIP;
    }

    /**
     * Get next available port number automatically
     * @returns {number} Next available port number
     */
    getNextAvailablePort() {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const usedPorts = new Set(allNFs.map(nf => nf.config.port));
        
        // Find next available port starting from 8080
        for (let port = 8080; port <= 9999; port++) {
            if (!usedPorts.has(port)) {
                console.log(`🔌 Auto-assigned next available port: ${port}`);
                return port;
            }
        }

        // Fallback if all ports are used
        const randomPort = Math.floor(Math.random() * 1000) + 8000;
        console.warn(`⚠️ Using fallback port: ${randomPort}`);
        return randomPort;
    }

    /**
     * Validate IP address format
     * @param {string} ip - IP address to validate
     * @returns {boolean} True if valid IP
     */
    isValidIP(ip) {
        // Check for null, undefined, or empty string
        if (!ip || typeof ip !== 'string') {
            return false;
        }

        // Check for special characters (only digits and dots allowed)
        if (!/^[0-9.]+$/.test(ip)) {
            return false;
        }

        // Validate IP format
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            return false;
        }

        // Split IP into octets
        const octets = ip.split('.').map(octet => parseInt(octet, 10));

        // First octet must be between 1 and 255 (not 0)
        if (octets[0] < 1 || octets[0] > 255) {
            return false;
        }

        // All other octets must be between 0 and 255 (already validated by regex)
        // But we double-check here for safety
        for (let i = 1; i < octets.length; i++) {
            if (octets[i] < 0 || octets[i] > 255) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate port number
     * @param {string|number} port - Port number to validate
     * @returns {boolean} True if valid port
     */
    isValidPort(port) {
        // Convert to string for validation
        const portStr = String(port);

        // Check for special characters (only digits allowed)
        if (!/^[0-9]+$/.test(portStr)) {
            return false;
        }

        // Convert to number
        const portNum = parseInt(portStr, 10);

        // Check if it's a valid number
        if (isNaN(portNum)) {
            return false;
        }

        // Port must be between 1 and 65535
        if (portNum < 1 || portNum > 65535) {
            return false;
        }

        return true;
    }

    /**
     * Validate IP input field in real-time
     * @param {HTMLElement} input - Input element
     * @param {HTMLElement} messageElement - Message element for feedback
     */
    validateIPInput(input, messageElement) {
        const ipAddress = input.value.trim();

        if (!ipAddress) {
            input.classList.remove('input-valid', 'input-invalid');
            messageElement.textContent = '';
            messageElement.className = 'validation-message';
            return;
        }

        // Check for special characters first
        if (!/^[0-9.]+$/.test(ipAddress)) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            messageElement.textContent = '❌ Only digits and dots allowed';
            messageElement.className = 'validation-message error';
            return;
        }

        // Check if it's a valid IP format
        if (!this.isValidIP(ipAddress)) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            
            // Provide specific error message
            if (ipAddress === '0.0.0.0' || ipAddress.startsWith('0.')) {
                messageElement.textContent = '❌ IP cannot be 0.0.0.0 or start with 0';
            } else {
                messageElement.textContent = '❌ Invalid IP format (must be 1.0.0.0 to 255.255.255.255)';
            }
            messageElement.className = 'validation-message error';
            return;
        }

        // Check for IP conflicts
        if (!window.nfManager?.isIPAddressAvailable(ipAddress)) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            messageElement.textContent = '❌ IP address already in use';
            messageElement.className = 'validation-message error';
            return;
        }

        // Valid IP
        input.classList.remove('input-invalid');
        input.classList.add('input-valid');
        messageElement.textContent = '✅ Valid IP address';
        messageElement.className = 'validation-message success';
    }

    /**
     * Validate port input field in real-time
     * @param {HTMLElement} input - Input element
     * @param {HTMLElement} messageElement - Message element for feedback
     */
    validatePortInput(input, messageElement) {
        const portValue = input.value.trim();

        if (!portValue) {
            input.classList.remove('input-valid', 'input-invalid');
            messageElement.textContent = '';
            messageElement.className = 'validation-message';
            return;
        }

        // Check for special characters first
        if (!/^[0-9]+$/.test(portValue)) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            messageElement.textContent = '❌ Only digits allowed (no special characters)';
            messageElement.className = 'validation-message error';
            return;
        }

        const port = parseInt(portValue, 10);

        // Check if it's a valid number
        if (isNaN(port)) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            messageElement.textContent = '❌ Invalid port number';
            messageElement.className = 'validation-message error';
            return;
        }

        // Check port range (1000-999999 for this application)
        if (port < 1000 || port > 999999) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            messageElement.textContent = '❌ Port must be between 1000 and 999999';
            messageElement.className = 'validation-message error';
            return;
        }

        // Check for port conflicts
        if (!window.nfManager?.isPortAvailable(port)) {
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
            messageElement.textContent = '❌ Port already in use';
            messageElement.className = 'validation-message error';
            return;
        }

        // Valid port
        input.classList.remove('input-invalid');
        input.classList.add('input-valid');
        messageElement.textContent = '✅ Valid port number';
        messageElement.className = 'validation-message success';
    }

    /**
     * Get bus at position (for clicking)
     */
    getBusAtPosition(x, y) {
        const allBuses = window.dataStore?.getAllBuses() || [];

        for (const bus of allBuses) {
            const tolerance = 30; // Increased for easier clicking

            if (bus.orientation === 'horizontal') {
                if (x >= bus.position.x &&
                    x <= bus.position.x + bus.length &&
                    Math.abs(y - bus.position.y) <= tolerance) {
                    return bus;
                }
            } else {
                if (y >= bus.position.y &&
                    y <= bus.position.y + bus.length &&
                    Math.abs(x - bus.position.x) <= tolerance) {
                    return bus;
                }
            }
        }

        return null;
    }
}