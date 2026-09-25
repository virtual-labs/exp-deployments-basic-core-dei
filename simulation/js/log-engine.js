/**
 * ============================================
 * LOG ENGINE
 * ============================================
 * Manages all logging for Network Functions
 * 
 * Responsibilities:
 * - Generate logs for NF lifecycle events
 * - Check dependencies and show errors/warnings
 * - Simulate 5G network behavior
 * - Store and manage log entries
 * - Notify UI of new logs
 */

class LogEngine {
    constructor() {
        this.logs = new Map();
        this.maxLogsPerNF = 100;
        this.logListeners = [];
        this.dependencies = null;
        this.logScenarios = null; // Custom log scenarios

        this.init();
    }

    async init() {
        console.log('📋 LogEngine: Initializing...');

        // Load dependencies
        try {
            const response = await fetch('../nf-dependencies.json');
            this.dependencies = await response.json();
            console.log('✅ Dependencies loaded');
        } catch (error) {
            console.warn('⚠️ Could not load dependencies');
            this.dependencies = this.getDefaultDependencies();
        }

        // Load custom log scenarios
        try {
            const response = await fetch('../log-scenarios.json');
            this.logScenarios = await response.json();
            console.log('✅ Log scenarios loaded');
        } catch (error) {
            console.warn('⚠️ Could not load log scenarios, using basic logs');
            this.logScenarios = null;
        }

        // Start connection activity simulation
        setTimeout(() => {
            this.startConnectionActivitySimulation();
            console.log('✅ Connection activity simulation started');
        }, 5000); // Start after 5 seconds
    }

    getDefaultDependencies() {
        return {
            'NRF': { required: [], optional: [] },
            'AMF': { required: ['NRF'], optional: ['AUSF', 'UDM'] },
            'SMF': { required: ['NRF'], optional: ['UPF', 'PCF'] },
            'UPF': { required: ['NRF'], optional: [] },
            'AUSF': { required: ['NRF', 'UDM'], optional: [] },
            'UDM': { required: ['NRF'], optional: ['MySQL'] },
            'PCF': { required: ['NRF'], optional: [] },
            'NSSF': { required: ['NRF'], optional: [] },
            'UDR': { required: ['NRF'], optional: [] },
            'gNB': { required: ['AMF', 'UPF'], optional: [] },
            'UE': { required: ['gNB'], optional: [] },
            'MySQL': { required: [], optional: ['UDM'] }
        };
    }

    addLog(nfId, level, message, details = {}) {
        // Replace {instance} and {random} placeholders
        const nf = window.dataStore?.getNFById(nfId);
        if (nf) {
            const instance = nf.name.split('-')[1] || '1';
            const random = Math.random().toString(36).substr(2, 6);
            message = message.replace(/\{instance\}/g, instance);
            message = message.replace(/\{random\}/g, random);

            // Replace in details too
            Object.keys(details).forEach(key => {
                if (typeof details[key] === 'string') {
                    details[key] = details[key].replace(/\{random\}/g, random);
                }
            });

            // Generate dynamic endpoint if details contains a static endpoint
            if (details.endpoint && nf.config) {
                details.endpoint = this.generateDynamicEndpoint(nf);
            }
        }

        const logEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            nfId: nfId,
            timestamp: Date.now(),
            level: level,
            message: message,
            details: details
        };

        if (!this.logs.has(nfId)) {
            this.logs.set(nfId, []);
        }

        const nfLogs = this.logs.get(nfId);
        nfLogs.push(logEntry);

        if (nfLogs.length > this.maxLogsPerNF) {
            nfLogs.shift();
        }

        this.notifyListeners(logEntry);

        // Console log
        const time = new Date(logEntry.timestamp).toLocaleTimeString();
        const nfName = nf?.name || nfId;

        const logStyles = {
            'ERROR': 'color: #e74c3c; font-weight: bold',
            'WARNING': 'color: #ff9800; font-weight: bold',
            'INFO': 'color: #3498db',
            'SUCCESS': 'color: #4caf50; font-weight: bold',
            'DEBUG': 'color: #95a5a6'
        };

        console.log(
            `%c[${time}] ${nfName} | ${level}%c | ${message}`,
            logStyles[level],
            'color: inherit'
        );

        return logEntry;
    }

    /**
     * Generate dynamic endpoint URL based on NF configuration
     * @param {Object} nf - Network Function object
     * @returns {string} Dynamic endpoint URL
     */
    generateDynamicEndpoint(nf) {
        if (!nf.config || !nf.config.ipAddress || !nf.config.port) {
            return 'https://192.168.1.10:8080/api/v1'; // fallback
        }

        const protocol = nf.config.httpProtocol === 'HTTP/1' ? 'http' : 'https';
        const ip = nf.config.ipAddress;
        const port = nf.config.port;

        // Generate NF-specific endpoint paths
        const endpointPaths = {
            'NRF': '/nnrf-nfm/v1',
            'AMF': '/namf-comm/v1',
            'SMF': '/nsmf-pdusession/v1',
            'UPF': '/nupf-upf/v1',
            'AUSF': '/nausf-auth/v1',
            'UDM': '/nudm-sdm/v1',
            'PCF': '/npcf-am-policy/v1',
            'NSSF': '/nnssf-nsselection/v1',
            'UDR': '/nudr-dr/v1',
            'gNB': '/gnb-mgmt/v1',
            'UE': '/ue-mgmt/v1',
            'MySQL': '' // MySQL uses different format
        };

        if (nf.type === 'MySQL') {
            return `mysql://${ip}:${port}/5g_core_db`;
        }

        const path = endpointPaths[nf.type] || '/api/v1';
        return `${protocol}://${ip}:${port}${path}`;
    }

    /**
     * NF Added - Generate custom logs based on scenarios
     */
    onNFAdded(nf) {
        console.log('📋 LogEngine: NF Added:', nf.name);

        // Check if we have custom scenarios for this NF type
        if (this.logScenarios && this.logScenarios[nf.type]) {
            this.runCustomScenario(nf);
        } else {
            // Fallback to basic logs
            this.runBasicScenario(nf);
        }
    }

    /**
     * Run custom log scenario from JSON
     */
    runCustomScenario(nf) {
        const scenario = this.logScenarios[nf.type];

        // ==================================
        // STARTUP LOGS
        // ==================================
        if (scenario.startup) {
            Object.values(scenario.startup).forEach(logConfig => {
                setTimeout(() => {
                    this.addLog(nf.id, logConfig.level, logConfig.message, logConfig.details || {});
                }, logConfig.delay);
            });
        }

        // ==================================
        // DEPENDENCY CHECKS
        // ==================================
        if (scenario.dependencies) {
            Object.keys(scenario.dependencies).forEach(depType => {
                const depConfig = scenario.dependencies[depType];

                // Check if dependency exists
                const exists = this.checkNFTypeExists(depType);
                const isConnected = this.hasConnectionToType(nf, depType);

                if (!exists && depConfig.missing) {
                    // Dependency missing
                    setTimeout(() => {
                        this.addLog(nf.id, depConfig.missing.level, depConfig.missing.message, depConfig.missing.details || {});
                    }, depConfig.missing.delay);
                } else if (exists && !isConnected && depConfig.exists_not_connected) {
                    // Exists but not connected
                    setTimeout(() => {
                        this.addLog(nf.id, depConfig.exists_not_connected.level, depConfig.exists_not_connected.message, depConfig.exists_not_connected.details || {});
                    }, depConfig.exists_not_connected.delay);
                } else if (exists && isConnected) {
                    // Connected - show connection logs
                    if (depConfig.connected) {
                        setTimeout(() => {
                            // Check if connection is via bus
                            const connectionMethod = this.getConnectionMethod(nf, depType);
                            const enhancedDetails = {
                                ...depConfig.connected.details,
                                connectionMethod: connectionMethod
                            };

                            let message = depConfig.connected.message;
                            if (connectionMethod === 'bus') {
                                message = message.replace('connection established', 'connection established via Service Bus');
                            }

                            this.addLog(nf.id, depConfig.connected.level, message, enhancedDetails);
                        }, depConfig.connected.delay);
                    }

                    if (depConfig.registered) {
                        setTimeout(() => {
                            this.addLog(nf.id, depConfig.registered.level, depConfig.registered.message, depConfig.registered.details || {});
                        }, depConfig.registered.delay);
                    }
                }
            });
        }

        // ==================================
        // FINAL STATUS
        // ==================================
        if (scenario.final_status) {
            const depInfo = this.dependencies[nf.type];
            let hasErrors = false;
            let hasWarnings = false;

            // Check all required dependencies
            depInfo.required.forEach(reqType => {
                const exists = this.checkNFTypeExists(reqType);
                const isConnected = this.hasConnectionToType(nf, reqType);
                if (!exists || !isConnected) {
                    hasErrors = true;
                }
            });

            // Check optional dependencies
            depInfo.optional.forEach(optType => {
                const exists = this.checkNFTypeExists(optType);
                const isConnected = this.hasConnectionToType(nf, optType);
                if (!exists || !isConnected) {
                    hasWarnings = true;
                }
            });

            // Determine final status
            let finalStatus;
            if (!hasErrors && !hasWarnings) {
                finalStatus = scenario.final_status.all_ok;
            } else if (hasErrors) {
                finalStatus = scenario.final_status.failed;
            } else {
                finalStatus = scenario.final_status.partial;
            }

            if (finalStatus) {
                setTimeout(() => {
                    this.addLog(nf.id, finalStatus.level, finalStatus.message, finalStatus.details || {});
                }, finalStatus.delay);
            }
        }
    }

    /**
     * Fallback basic scenario
     */
    runBasicScenario(nf) {
        this.addLog(nf.id, 'INFO', `${nf.type} instance created: ${nf.name}`);

        setTimeout(() => {
            this.addLog(nf.id, 'INFO', `Initializing ${nf.type} services...`);
            setTimeout(() => {
                this.checkDependencies(nf);
            }, 500);
        }, 300);
    }

    checkDependencies(nf) {
        if (!this.dependencies || !this.dependencies[nf.type]) return;

        const depInfo = this.dependencies[nf.type];
        let hasErrors = false;

        depInfo.required.forEach((requiredType, index) => {
            setTimeout(() => {
                const exists = this.checkNFTypeExists(requiredType);
                const isConnected = this.hasConnectionToType(nf, requiredType);

                if (!exists) {
                    hasErrors = true;
                    this.addLog(nf.id, 'ERROR',
                        `Cannot register with ${requiredType} - ${requiredType} not found in topology`, {
                        suggestion: `Add ${requiredType} to the topology first`
                    });
                } else if (!isConnected) {
                    hasErrors = true;
                    this.addLog(nf.id, 'ERROR',
                        `${requiredType} exists but not connected`, {
                        suggestion: `Connect ${nf.name} to ${requiredType}`
                    });
                } else {
                    this.addLog(nf.id, 'SUCCESS',
                        `Connected to ${requiredType} successfully`);
                }
            }, 200 * index);
        });

        depInfo.optional.forEach((optionalType, index) => {
            setTimeout(() => {
                const exists = this.checkNFTypeExists(optionalType);
                const isConnected = this.hasConnectionToType(nf, optionalType);

                if (!exists || !isConnected) {
                    this.addLog(nf.id, 'WARNING',
                        `${optionalType} not available - Some features may not work`);
                }
            }, 200 * (depInfo.required.length + index));
        });

        setTimeout(() => {
            if (hasErrors) {
                this.addLog(nf.id, 'ERROR',
                    `${nf.type} startup failed - Cannot operate without required dependencies`);
            } else {
                this.addLog(nf.id, 'SUCCESS',
                    `${nf.type} is fully operational ✓`);
            }
        }, 200 * (depInfo.required.length + depInfo.optional.length) + 500);
    }

    /**
     * Connection Created - Generate comprehensive connection request/response logs
     */
    onConnectionCreated(connection) {
        const sourceNF = window.dataStore?.getNFById(connection.sourceId);
        const targetNF = window.dataStore?.getNFById(connection.targetId);

        if (!sourceNF || !targetNF) return;

        console.log('📋 LogEngine: Connection Created - Generating detailed request/response logs');

        // Generate comprehensive connection logs with request/response sequence
        this.generateConnectionSequenceLogs(sourceNF, targetNF, connection);

        // Check if we have custom scenario for additional logs
        const hasCustom = this.logScenarios &&
            this.logScenarios[sourceNF.type] &&
            this.logScenarios[sourceNF.type].dependencies &&
            this.logScenarios[sourceNF.type].dependencies[targetNF.type];

        if (hasCustom) {
            const depConfig = this.logScenarios[sourceNF.type].dependencies[targetNF.type];

            if (depConfig.registered) {
                setTimeout(() => {
                    this.addLog(sourceNF.id, depConfig.registered.level,
                        depConfig.registered.message,
                        depConfig.registered.details || {});
                }, depConfig.registered.delay || 3000);
            }
        }

        // Handle NRF registration if applicable
        if (targetNF.type === 'NRF' && sourceNF.type !== 'NRF') {
            setTimeout(() => {
                this.simulateNRFRegistration(sourceNF, targetNF);
            }, 2500);
        }

        // Re-check dependencies after connection is established
        setTimeout(() => {
            this.recheckDependenciesAfterConnection(sourceNF);
            this.recheckDependenciesAfterConnection(targetNF);
        }, 4000);
    }

    /**
     * Generate detailed connection sequence logs showing all request/response interactions
     */
    generateConnectionSequenceLogs(sourceNF, targetNF, connection) {
        const requestId = this.generateRequestId();
        const sessionId = this.generateSessionId();
        
        // Step 1: Initial connection request
        this.addLog(sourceNF.id, 'INFO',
            `[REQ] Initiating ${connection.interfaceName} connection to ${targetNF.name}`, {
            requestId: requestId,
            method: 'CONNECT',
            targetIP: targetNF.config.ipAddress,
            targetPort: targetNF.config.port,
            protocol: connection.protocol,
            userAgent: `${sourceNF.type}/1.0`,
            timestamp: new Date().toISOString()
        });

        // Step 2: Target receives connection request
        setTimeout(() => {
            this.addLog(targetNF.id, 'INFO',
                `[REQ] Incoming connection request from ${sourceNF.name}`, {
                requestId: requestId,
                sourceIP: sourceNF.config.ipAddress,
                sourcePort: sourceNF.config.port,
                interface: connection.interfaceName,
                clientAgent: `${sourceNF.type}/1.0`,
                timestamp: new Date().toISOString()
            });
        }, 100);

        // Step 3: TLS handshake initiation
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO', 
                `[REQ] Starting TLS handshake with ${targetNF.name}`, {
                requestId: requestId,
                tlsVersion: 'TLS 1.3',
                cipherSuite: 'TLS_AES_256_GCM_SHA384',
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'INFO',
                `[RESP] Accepting TLS handshake from ${sourceNF.name}`, {
                requestId: requestId,
                tlsVersion: 'TLS 1.3',
                serverCert: `${targetNF.type.toLowerCase()}.5g-core.local`,
                timestamp: new Date().toISOString()
            });
        }, 300);

        // Step 4: Certificate exchange
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO',
                `[RESP] Certificate received from ${targetNF.name}`, {
                requestId: requestId,
                certSubject: `CN=${targetNF.type.toLowerCase()}.5g-core.local`,
                certIssuer: '5G-Core-CA',
                certValid: true,
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'INFO',
                `[REQ] Validating client certificate from ${sourceNF.name}`, {
                requestId: requestId,
                clientCert: `${sourceNF.type.toLowerCase()}.5g-core.local`,
                validation: 'SUCCESS',
                timestamp: new Date().toISOString()
            });
        }, 600);

        // Step 5: TLS handshake completion
        setTimeout(() => {
            this.addLog(sourceNF.id, 'SUCCESS',
                `[RESP] TLS handshake completed with ${targetNF.name}`, {
                requestId: requestId,
                sessionId: sessionId,
                encryptionLevel: '256-bit AES',
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'SUCCESS',
                `[RESP] TLS session established with ${sourceNF.name}`, {
                requestId: requestId,
                sessionId: sessionId,
                clientAuthenticated: true,
                timestamp: new Date().toISOString()
            });
        }, 900);

        // Step 6: HTTP/2 upgrade
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO',
                `[REQ] HTTP/2 connection upgrade request`, {
                requestId: requestId,
                sessionId: sessionId,
                upgrade: 'h2',
                connection: 'Upgrade',
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'INFO',
                `[RESP] HTTP/2 upgrade accepted`, {
                requestId: requestId,
                sessionId: sessionId,
                status: '101 Switching Protocols',
                upgrade: 'h2',
                timestamp: new Date().toISOString()
            });
        }, 1200);

        // Step 7: HTTP/2 settings exchange
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO',
                `[REQ] HTTP/2 SETTINGS frame sent`, {
                requestId: requestId,
                sessionId: sessionId,
                maxConcurrentStreams: 100,
                initialWindowSize: 65535,
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'INFO',
                `[RESP] HTTP/2 SETTINGS ACK received`, {
                requestId: requestId,
                sessionId: sessionId,
                settingsApplied: true,
                timestamp: new Date().toISOString()
            });
        }, 1500);

        // Step 8: Connection established
        setTimeout(() => {
            const endpoint = this.generateDynamicEndpoint(targetNF);
            
            this.addLog(sourceNF.id, 'SUCCESS',
                `[RESP] ${connection.interfaceName} connection established with ${targetNF.name}`, {
                requestId: requestId,
                sessionId: sessionId,
                endpoint: endpoint,
                protocol: connection.protocol,
                status: 'ACTIVE',
                connectionTime: '1.8s',
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'SUCCESS',
                `[RESP] ${connection.interfaceName} connection active from ${sourceNF.name}`, {
                requestId: requestId,
                sessionId: sessionId,
                clientEndpoint: `${sourceNF.config.ipAddress}:${sourceNF.config.port}`,
                status: 'READY',
                timestamp: new Date().toISOString()
            });
        }, 1800);

        // Step 9: First heartbeat/keepalive
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO',
                `[REQ] Sending keepalive to ${targetNF.name}`, {
                requestId: this.generateRequestId(),
                sessionId: sessionId,
                method: 'OPTIONS',
                endpoint: this.generateDynamicEndpoint(targetNF) + '/health',
                timestamp: new Date().toISOString()
            });

            setTimeout(() => {
                this.addLog(targetNF.id, 'INFO',
                    `[RESP] Keepalive response to ${sourceNF.name}`, {
                    requestId: this.generateRequestId(),
                    sessionId: sessionId,
                    status: '200 OK',
                    health: 'HEALTHY',
                    timestamp: new Date().toISOString()
                });
            }, 100);
        }, 2200);
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Simulate detailed NRF registration with request/response logs
     */
    simulateNRFRegistration(nf, nrfNF) {
        const registrationId = this.generateRequestId();
        const profileId = `profile-${Math.random().toString(36).substr(2, 9)}`;
        const nfProfile = {
            nfInstanceId: nf.id,
            nfType: nf.type,
            nfStatus: 'REGISTERED',
            ipv4Addresses: [nf.config.ipAddress],
            nfServices: [{
                serviceInstanceId: `${nf.type.toLowerCase()}-service-1`,
                serviceName: `n${nf.type.toLowerCase()}`,
                versions: [{ apiVersionInUri: 'v1', apiFullVersion: '1.0.0' }],
                scheme: 'https',
                fqdn: `${nf.type.toLowerCase()}.5g-core.local`,
                ipEndPoints: [{
                    ipv4Address: nf.config.ipAddress,
                    port: nf.config.port,
                    transport: 'TCP'
                }]
            }]
        };

        // Step 1: NF sends registration request
        setTimeout(() => {
            this.addLog(nf.id, 'INFO',
                `[REQ] Sending NF registration request to NRF`, {
                requestId: registrationId,
                method: 'PUT',
                endpoint: `/nnrf-nfm/v1/nf-instances/${nf.id}`,
                contentType: 'application/json',
                nfProfile: JSON.stringify(nfProfile, null, 2),
                timestamp: new Date().toISOString()
            });
        }, 500);

        // Step 2: NRF receives and validates request
        setTimeout(() => {
            this.addLog(nrfNF.id, 'INFO',
                `[REQ] Processing NF registration from ${nf.name}`, {
                requestId: registrationId,
                nfType: nf.type,
                nfInstanceId: nf.id,
                sourceIP: nf.config.ipAddress,
                validationStatus: 'IN_PROGRESS',
                timestamp: new Date().toISOString()
            });
        }, 800);

        // Step 3: NRF validates NF profile
        setTimeout(() => {
            this.addLog(nrfNF.id, 'INFO',
                `[PROC] Validating NF profile for ${nf.name}`, {
                requestId: registrationId,
                profileValidation: 'SUCCESS',
                servicesCount: nfProfile.nfServices.length,
                ipValidation: 'VALID',
                portValidation: 'VALID',
                timestamp: new Date().toISOString()
            });
        }, 1100);

        // Step 4: NRF stores profile and responds
        setTimeout(() => {
            this.addLog(nrfNF.id, 'SUCCESS',
                `[RESP] ${nf.name} registered successfully`, {
                requestId: registrationId,
                status: '201 Created',
                profileId: profileId,
                location: `/nnrf-nfm/v1/nf-instances/${nf.id}`,
                validity: '3600 seconds',
                heartbeatTimer: '60 seconds',
                timestamp: new Date().toISOString()
            });
        }, 1400);

        // Step 5: NF receives registration response
        setTimeout(() => {
            this.addLog(nf.id, 'SUCCESS',
                `[RESP] Successfully registered with NRF`, {
                requestId: registrationId,
                status: '201 Created',
                profileId: profileId,
                nrfAddress: nrfNF.config.ipAddress,
                heartbeatInterval: '60 seconds',
                registrationExpiry: new Date(Date.now() + 3600000).toISOString(),
                timestamp: new Date().toISOString()
            });
        }, 1600);

        // Step 6: Start heartbeat mechanism
        setTimeout(() => {
            this.addLog(nf.id, 'INFO',
                `[INFO] Starting heartbeat timer with NRF`, {
                heartbeatInterval: '60 seconds',
                nextHeartbeat: new Date(Date.now() + 60000).toISOString(),
                profileId: profileId,
                timestamp: new Date().toISOString()
            });

            // Simulate first heartbeat
            setTimeout(() => {
                const heartbeatId = this.generateRequestId();
                
                this.addLog(nf.id, 'INFO',
                    `[REQ] Sending heartbeat to NRF`, {
                    requestId: heartbeatId,
                    method: 'PATCH',
                    endpoint: `/nnrf-nfm/v1/nf-instances/${nf.id}`,
                    operation: 'heartbeat',
                    timestamp: new Date().toISOString()
                });

                setTimeout(() => {
                    this.addLog(nrfNF.id, 'INFO',
                        `[RESP] Heartbeat acknowledged from ${nf.name}`, {
                        requestId: heartbeatId,
                        status: '204 No Content',
                        profileStatus: 'ACTIVE',
                        nextHeartbeat: new Date(Date.now() + 60000).toISOString(),
                        timestamp: new Date().toISOString()
                    });
                }, 200);
            }, 3000);
        }, 1800);
    }

    /**
     * Re-check dependencies after connection
     */
    recheckDependenciesAfterConnection(nf) {
        if (!this.dependencies || !this.dependencies[nf.type]) return;

        const depInfo = this.dependencies[nf.type];
        let allSatisfied = true;
        let newlySatisfied = [];

        // Check all required dependencies
        depInfo.required.forEach(reqType => {
            const exists = this.checkNFTypeExists(reqType);
            const isConnected = this.hasConnectionToType(nf, reqType);

            if (!exists || !isConnected) {
                allSatisfied = false;
            } else {
                newlySatisfied.push(reqType);
            }
        });

        // If all dependencies are now satisfied
        if (allSatisfied && newlySatisfied.length > 0) {
            this.addLog(nf.id, 'SUCCESS',
                `All dependencies satisfied - ${nf.type} is now fully operational ✓`, {
                status: 'OPERATIONAL',
                mode: 'FULL',
                timestamp: new Date().toISOString()
            });
        } else if (newlySatisfied.length > 0) {
            // Some dependencies satisfied
            this.addLog(nf.id, 'INFO',
                `Dependencies resolved: ${newlySatisfied.join(', ')}`);
        }
    }

    onNFRemoved(nf) {
        console.log('📋 LogEngine: NF Removed:', nf.name);

        this.addLog(nf.id, 'WARNING',
            `${nf.type} instance ${nf.name} is shutting down`, {
            reason: 'Manual removal',
            timestamp: new Date().toISOString()
        });

        const connections = window.dataStore?.getConnectionsForNF(nf.id) || [];
        connections.forEach(conn => {
            const otherNfId = conn.sourceId === nf.id ? conn.targetId : conn.sourceId;
            const otherNf = window.dataStore?.getNFById(otherNfId);

            if (otherNf) {
                this.addLog(otherNfId, 'ERROR',
                    `Connection lost to ${nf.name}`, {
                    reason: 'Peer NF was removed from topology',
                    interface: conn.interfaceName,
                    impact: 'Service disruption'
                });

                setTimeout(() => {
                    this.checkDependencies(otherNf);
                }, 1000);
            }
        });
    }

    onConnectionDeleted(connection) {
        const sourceNF = window.dataStore?.getNFById(connection.sourceId);
        const targetNF = window.dataStore?.getNFById(connection.targetId);

        if (!sourceNF || !targetNF) return;

        console.log('📋 LogEngine: Connection Deleted - Generating disconnection logs');
        
        // Generate detailed disconnection sequence
        this.generateDisconnectionSequenceLogs(sourceNF, targetNF, connection);

        // Re-check dependencies after disconnection
        setTimeout(() => {
            this.checkDependencies(sourceNF);
            this.checkDependencies(targetNF);
        }, 2000);
    }

    /**
     * Generate detailed disconnection sequence logs
     */
    generateDisconnectionSequenceLogs(sourceNF, targetNF, connection) {
        const disconnectId = this.generateRequestId();
        
        // Step 1: Initiate disconnection
        this.addLog(sourceNF.id, 'WARNING',
            `[REQ] Initiating disconnection from ${targetNF.name}`, {
            requestId: disconnectId,
            interface: connection.interfaceName,
            reason: 'Manual disconnection',
            method: 'DISCONNECT',
            timestamp: new Date().toISOString()
        });

        // Step 2: Target receives disconnection notice
        setTimeout(() => {
            this.addLog(targetNF.id, 'WARNING',
                `[REQ] Disconnection request from ${sourceNF.name}`, {
                requestId: disconnectId,
                interface: connection.interfaceName,
                connectionId: connection.id,
                timestamp: new Date().toISOString()
            });
        }, 100);

        // Step 3: Graceful session termination
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO',
                `[REQ] Sending connection close frame`, {
                requestId: disconnectId,
                protocol: connection.protocol,
                closeCode: 1000,
                closeReason: 'Normal closure',
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'INFO',
                `[RESP] Acknowledging connection close`, {
                requestId: disconnectId,
                status: 'CLOSING',
                activeStreams: 0,
                timestamp: new Date().toISOString()
            });
        }, 300);

        // Step 4: TLS session termination
        setTimeout(() => {
            this.addLog(sourceNF.id, 'INFO',
                `[INFO] TLS session terminated with ${targetNF.name}`, {
                requestId: disconnectId,
                tlsCloseNotify: true,
                sessionCleanup: 'SUCCESS',
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'INFO',
                `[INFO] TLS session closed with ${sourceNF.name}`, {
                requestId: disconnectId,
                sessionId: 'terminated',
                resourcesReleased: true,
                timestamp: new Date().toISOString()
            });
        }, 600);

        // Step 5: Connection fully closed
        setTimeout(() => {
            this.addLog(sourceNF.id, 'WARNING',
                `[RESP] Connection to ${targetNF.name} closed`, {
                requestId: disconnectId,
                interface: connection.interfaceName,
                status: 'DISCONNECTED',
                connectionDuration: this.calculateConnectionDuration(connection),
                timestamp: new Date().toISOString()
            });

            this.addLog(targetNF.id, 'WARNING',
                `[RESP] Connection from ${sourceNF.name} closed`, {
                requestId: disconnectId,
                interface: connection.interfaceName,
                status: 'DISCONNECTED',
                timestamp: new Date().toISOString()
            });
        }, 900);

        // Step 6: Impact assessment
        setTimeout(() => {
            this.addLog(sourceNF.id, 'ERROR',
                `[WARN] Service impact: Lost connection to ${targetNF.name}`, {
                impactLevel: this.assessDisconnectionImpact(sourceNF, targetNF),
                affectedServices: this.getAffectedServices(sourceNF, targetNF),
                recommendation: 'Restore connection to maintain full functionality',
                timestamp: new Date().toISOString()
            });
        }, 1200);
    }

    /**
     * Calculate connection duration
     */
    calculateConnectionDuration(connection) {
        const duration = Date.now() - connection.createdAt;
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Assess disconnection impact
     */
    assessDisconnectionImpact(sourceNF, targetNF) {
        if (!this.dependencies || !this.dependencies[sourceNF.type]) {
            return 'UNKNOWN';
        }

        const depInfo = this.dependencies[sourceNF.type];
        
        if (depInfo.required.includes(targetNF.type)) {
            return 'CRITICAL';
        } else if (depInfo.optional.includes(targetNF.type)) {
            return 'MODERATE';
        } else {
            return 'LOW';
        }
    }

    /**
     * Get affected services
     */
    getAffectedServices(sourceNF, targetNF) {
        const serviceMap = {
            'NRF': ['Service Discovery', 'NF Registration', 'NF Management'],
            'AMF': ['UE Registration', 'Mobility Management', 'Authentication'],
            'SMF': ['Session Management', 'PDU Session Control'],
            'UPF': ['User Plane Traffic', 'Packet Forwarding'],
            'AUSF': ['Authentication Services', 'Key Management'],
            'UDM': ['Subscription Data', 'User Context'],
            'PCF': ['Policy Control', 'QoS Management'],
            'NSSF': ['Network Slice Selection'],
            'UDR': ['Data Repository', 'Subscription Storage']
        };

        return serviceMap[targetNF.type] || ['Unknown Services'];
    }

    /**
     * Start simulating periodic connection activity
     */
    startConnectionActivitySimulation() {
        // Simulate periodic service requests between connected NFs
        setInterval(() => {
            this.simulateRandomServiceRequest();
        }, 15000); // Every 15 seconds

        // Simulate heartbeats
        setInterval(() => {
            this.simulateHeartbeats();
        }, 60000); // Every minute
    }

    /**
     * Simulate random service requests between connected NFs
     */
    simulateRandomServiceRequest() {
        const connections = window.dataStore?.getAllConnections() || [];
        if (connections.length === 0) return;

        // Pick a random connection
        const connection = connections[Math.floor(Math.random() * connections.length)];
        const sourceNF = window.dataStore?.getNFById(connection.sourceId);
        const targetNF = window.dataStore?.getNFById(connection.targetId);

        if (!sourceNF || !targetNF) return;

        const requestId = this.generateRequestId();
        const serviceRequests = this.getServiceRequestsForNFPair(sourceNF.type, targetNF.type);
        
        if (serviceRequests.length === 0) return;

        const request = serviceRequests[Math.floor(Math.random() * serviceRequests.length)];

        // Request
        this.addLog(sourceNF.id, 'INFO',
            `[REQ] ${request.description}`, {
            requestId: requestId,
            method: request.method,
            endpoint: request.endpoint,
            targetNF: targetNF.name,
            timestamp: new Date().toISOString()
        });

        // Response
        setTimeout(() => {
            this.addLog(targetNF.id, 'SUCCESS',
                `[RESP] ${request.responseDescription}`, {
                requestId: requestId,
                status: request.responseCode,
                responseTime: `${Math.floor(Math.random() * 50 + 10)}ms`,
                sourceNF: sourceNF.name,
                timestamp: new Date().toISOString()
            });
        }, Math.floor(Math.random() * 500 + 100));
    }

    /**
     * Get service requests for NF pair
     */
    getServiceRequestsForNFPair(sourceType, targetType) {
        const requestMap = {
            'AMF-NRF': [
                { method: 'GET', endpoint: '/nnrf-disc/v1/nf-instances', description: 'Service discovery request', responseCode: '200 OK', responseDescription: 'Service instances returned' },
                { method: 'PUT', endpoint: '/nnrf-nfm/v1/nf-instances', description: 'NF status update', responseCode: '204 No Content', responseDescription: 'Status updated successfully' }
            ],
            'SMF-NRF': [
                { method: 'GET', endpoint: '/nnrf-disc/v1/nf-instances', description: 'UPF discovery request', responseCode: '200 OK', responseDescription: 'UPF instances returned' },
                { method: 'GET', endpoint: '/nnrf-disc/v1/nf-instances', description: 'PCF discovery request', responseCode: '200 OK', responseDescription: 'PCF instances returned' }
            ],
            'AMF-AUSF': [
                { method: 'POST', endpoint: '/nausf-auth/v1/ue-authentications', description: 'UE authentication request', responseCode: '201 Created', responseDescription: 'Authentication challenge created' },
                { method: 'PUT', endpoint: '/nausf-auth/v1/ue-authentications', description: 'Authentication response', responseCode: '200 OK', responseDescription: 'Authentication successful' }
            ],
            'AMF-UDM': [
                { method: 'GET', endpoint: '/nudm-uecm/v1/imsi/registration', description: 'UE context retrieval', responseCode: '200 OK', responseDescription: 'UE context returned' },
                { method: 'PUT', endpoint: '/nudm-uecm/v1/imsi/registrations', description: 'UE registration update', responseCode: '204 No Content', responseDescription: 'Registration updated' }
            ],
            'SMF-UPF': [
                { method: 'POST', endpoint: '/n4/sessions', description: 'PDU session establishment', responseCode: '201 Created', responseDescription: 'Session established' },
                { method: 'PUT', endpoint: '/n4/sessions', description: 'Session modification', responseCode: '200 OK', responseDescription: 'Session modified' }
            ]
        };

        const key1 = `${sourceType}-${targetType}`;
        const key2 = `${targetType}-${sourceType}`;
        
        return requestMap[key1] || requestMap[key2] || [];
    }

    /**
     * Simulate heartbeats for all registered NFs
     */
    simulateHeartbeats() {
        const allNFs = window.dataStore?.getAllNFs() || [];
        const nrfNFs = allNFs.filter(nf => nf.type === 'NRF');
        
        if (nrfNFs.length === 0) return;

        allNFs.forEach(nf => {
            if (nf.type !== 'NRF') {
                // Check if NF is connected to NRF
                const hasNRFConnection = this.hasConnectionToType(nf, 'NRF');
                
                if (hasNRFConnection) {
                    const heartbeatId = this.generateRequestId();
                    
                    this.addLog(nf.id, 'DEBUG',
                        `[REQ] Heartbeat to NRF`, {
                        requestId: heartbeatId,
                        method: 'PATCH',
                        endpoint: `/nnrf-nfm/v1/nf-instances/${nf.id}`,
                        operation: 'heartbeat',
                        timestamp: new Date().toISOString()
                    });

                    setTimeout(() => {
                        const nrfNF = nrfNFs[0]; // Use first NRF
                        this.addLog(nrfNF.id, 'DEBUG',
                            `[RESP] Heartbeat ACK to ${nf.name}`, {
                            requestId: heartbeatId,
                            status: '204 No Content',
                            nfStatus: 'REGISTERED',
                            timestamp: new Date().toISOString()
                        });
                    }, Math.floor(Math.random() * 200 + 50));
                }
            }
        });
    }

    checkNFTypeExists(type) {
        const allNFs = window.dataStore?.getAllNFs() || [];
        return allNFs.some(nf => nf.type === type);
    }

    hasConnectionToType(nf, targetType) {
        // Check direct NF-to-NF connections
        const connections = window.dataStore?.getConnectionsForNF(nf.id) || [];
        const hasDirectConnection = connections.some(conn => {
            const otherNfId = conn.sourceId === nf.id ? conn.targetId : conn.sourceId;
            const otherNf = window.dataStore?.getNFById(otherNfId);
            return otherNf && otherNf.type === targetType;
        });

        if (hasDirectConnection) {
            return true;
        }

        // Check bus connections - if both NFs are on the same bus, consider them connected
        const busConnections = window.dataStore?.getBusConnectionsForNF(nf.id) || [];

        return busConnections.some(busConn => {
            // Get all NFs connected to the same bus
            const sameBusConnections = window.dataStore?.getBusConnectionsForBus(busConn.busId) || [];

            return sameBusConnections.some(otherBusConn => {
                if (otherBusConn.nfId !== nf.id) {
                    const otherNf = window.dataStore?.getNFById(otherBusConn.nfId);
                    return otherNf && otherNf.type === targetType;
                }
                return false;
            });
        });
    }

    /**
     * Get connection method (direct or bus)
     * @param {Object} nf - Network Function
     * @param {string} targetType - Target NF type
     * @returns {string} 'direct' or 'bus'
     */
    getConnectionMethod(nf, targetType) {
        // Check direct connections first
        const connections = window.dataStore?.getConnectionsForNF(nf.id) || [];
        const hasDirectConnection = connections.some(conn => {
            const otherNfId = conn.sourceId === nf.id ? conn.targetId : conn.sourceId;
            const otherNf = window.dataStore?.getNFById(otherNfId);
            return otherNf && otherNf.type === targetType;
        });

        if (hasDirectConnection) {
            return 'direct';
        }

        // Check bus connections
        const busConnections = window.dataStore?.getBusConnectionsForNF(nf.id) || [];
        const hasBusConnection = busConnections.some(busConn => {
            const sameBusConnections = window.dataStore?.getBusConnectionsForBus(busConn.busId) || [];
            return sameBusConnections.some(otherBusConn => {
                if (otherBusConn.nfId !== nf.id) {
                    const otherNf = window.dataStore?.getNFById(otherBusConn.nfId);
                    return otherNf && otherNf.type === targetType;
                }
                return false;
            });
        });

        return hasBusConnection ? 'bus' : 'none';
    }

    getAllLogs() {
        const allLogs = [];
        this.logs.forEach(nfLogs => {
            allLogs.push(...nfLogs);
        });
        return allLogs.sort((a, b) => a.timestamp - b.timestamp);
    }

    getLogsForNF(nfId) {
        return this.logs.get(nfId) || [];
    }

    clearLogsForNF(nfId) {
        this.logs.delete(nfId);
        this.notifyListeners({ type: 'clear', nfId });
    }

    clearAllLogs() {
        this.logs.clear();
        this.notifyListeners({ type: 'clear-all' });
    }

    subscribe(callback) {
        this.logListeners.push(callback);
    }

    notifyListeners(logEntry) {
        this.logListeners.forEach(callback => {
            try {
                callback(logEntry);
            } catch (error) {
                console.error('Error in log listener:', error);
            }
        });
    }

    exportLogsAsJSON() {
        const exportData = {
            exportTime: new Date().toISOString(),
            logs: this.getAllLogs()
        };
        return JSON.stringify(exportData, null, 2);
    }

    exportLogsAsCSV() {
        const logs = this.getAllLogs();
        const headers = ['Timestamp', 'NF Name', 'NF Type', 'Level', 'Message'];
        let csv = headers.join(',') + '\n';

        logs.forEach(log => {
            const nf = window.dataStore?.getNFById(log.nfId);
            const timestamp = new Date(log.timestamp).toISOString();
            csv += [
                timestamp,
                nf?.name || 'Unknown',
                nf?.type || 'Unknown',
                log.level,
                `"${log.message.replace(/"/g, '""')}"`
            ].join(',') + '\n';
        });

        return csv;
    }

    /**
     * Export logs as plain text
     * @returns {string} Plain text string of all logs
     */
    exportLogsAsText() {
        const logs = this.getAllLogs();
        let text = '═══════════════════════════════════════════════════════\n';
        text += '5G SBA DASHBOARD - LOG EXPORT\n';
        text += '═══════════════════════════════════════════════════════\n';
        text += `Export Time: ${new Date().toISOString()}\n`;
        text += `Total Logs: ${logs.length}\n`;
        text += '═══════════════════════════════════════════════════════\n\n';

        logs.forEach(log => {
            const nf = window.dataStore?.getNFById(log.nfId);
            const timestamp = new Date(log.timestamp).toLocaleString();

            text += `[${timestamp}] ${nf?.name || 'Unknown'} (${nf?.type || 'Unknown'}) - ${log.level}\n`;
            text += `${log.message}\n`;

            // Add details if present
            if (log.details && Object.keys(log.details).length > 0) {
                text += 'Details:\n';
                Object.entries(log.details).forEach(([key, value]) => {
                    text += `  ${key}: ${JSON.stringify(value)}\n`;
                });
            }
            text += '\n';
        });

        text += '═══════════════════════════════════════════════════════\n';
        text += 'END OF LOG EXPORT\n';
        text += '═══════════════════════════════════════════════════════\n';

        return text;
    }
}

