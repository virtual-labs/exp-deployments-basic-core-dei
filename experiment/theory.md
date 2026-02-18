## 1. Introduction to the 5G Core Network (5GC)

The 5G Core Network (5GC) marks a significant evolution in mobile network architecture. It is designed to support a broad range of services — from enhanced mobile broadband (eMBB) to ultra-reliable low-latency communications (URLLC) and massive machine-type communications (mMTC). The 5GC adopts a Service-Based Architecture (SBA) in which network functions are implemented as modular, cloud-native services that interact via well-defined, standardized interfaces.

Cloud-native design principles (containerization, microservices, and orchestration) underpin the 5GC. These principles enable operators to deploy network functions as software instances that can scale dynamically, automate lifecycle operations, and improve resource utilization while reducing capital and operational expenditures.

<img src="images/fig-1.svg" alt="5G Core Network Service-Based Architecture" width="40%">

*Fig. 1 — 5G Core Network: Service-Based Architecture*

</details>

---

<details>
<summary><strong>2. Key Components of the 5G Core</strong></summary>

## 2. Key Components of the 5G Core

### 2.1 Control Plane Functions

• Access and Mobility Management Function (AMF): Single entry point for RAN control-plane traffic. The AMF handles registration, reachability, mobility management, and initial authentication/authorization flows for user equipment (UE).

• Session Management Function (SMF): Manages PDU sessions — session establishment, modification, and release. The SMF is responsible for IP address allocation, QoS handling, and steering traffic to appropriate User Plane Functions (UPFs).

Other essential control plane functions include:

- Authentication Server Function (AUSF): Verifies subscriber credentials and manages authentication contexts.  
- Unified Data Management (UDM): Provides subscriber profile, authentication data, and subscription information.  
- Policy Control Function (PCF): Supplies policy rules for QoS, charging, and access control.  
- Network Repository Function (NRF): Maintains a registry of available network function instances and their capabilities for service discovery.  
- Network Exposure Function (NEF): Exposes selected network capabilities to third-party applications in a secure, controlled manner.

### 2.2 User Plane Function (UPF)

The UPF implements the user/data plane for 5GC: high-performance packet forwarding, traffic inspection, QoS enforcement, and usage reporting. UPFs may be deployed centrally or at the network edge (MEC) to meet different latency and throughput requirements.

<img src="images/fig-2.svg" alt="5G Core Network Session Establishment Flow" width="40%">

*Fig. 2 — 5G Core Network: Session Establishment Flow*

</details>

---

<details>
<summary><strong>3. Software-Defined Networking (SDN) Principles in 5GC</strong></summary>

## 3. Software-Defined Networking (SDN) Principles in 5GC

### 3.1 How SDN Concepts Map to 5GC

The 5GC embraces SDN principles by separating control and user planes and by exposing programmable interfaces to dynamically configure forwarding behavior. Key mappings:

- SDN Application Layer ↔ OSS/BSS and network applications that request services and analytics from the core.  
- SDN Control Layer (controller) ↔ 5GC control-plane functions (AMF, SMF, PCF) that make global decisions and push policies.  
- SDN Infrastructure Layer ↔ UPF and RAN elements that execute forwarding rules and enforce QoS.

The SMF closely resembles an SDN controller for the user plane: it maintains session state and programs UPF forwarding rules to realize traffic steering and QoS.

<img src="images/fig-3.svg" alt="SDN Architecture Mapping to 5G Core Network" width="40%">

*Fig. 3 — SDN Architecture Mapping to 5G Core Network*

</details>

---

<details>
<summary><strong>4. Integration of SDN, 5GC, and Container Technologies</strong></summary>

## 4. Integration of SDN, 5GC, and Container Technologies

Modern 5GC deployments combine SDN principles with cloud-native technologies (Docker, Kubernetes) to achieve automated, scalable, and resilient networks.

### 4.1 Cloud-Native 5G

- Service-based communication uses HTTP/2 and REST/gRPC APIs between functions.  
- Kubernetes provides service discovery, load balancing, rolling updates, and autoscaling (HPA) for network functions.  
- Service meshes (e.g., Istio) add advanced traffic management, security, and observability.

### 4.2 SDN-Enhanced Traffic Management for Containerized UPFs

- UPFs can be deployed as containerized services and configured programmatically by the SMF.  
- CNIs and SDN controllers provide overlay/underlay connectivity, network policies, and integration with physical infrastructure.


</details>

---

<details>
<summary><strong>5. Benefits of a Containerized, SDN-Based 5G Core</strong></summary>

## 5. Benefits of a Containerized, SDN-Based 5G Core

### 5.1 Operational Benefits

- Rapid service rollout through automated deployments and APIs.  
- Cost optimization via COTS hardware, improved resource utilization, and automation.  
- Elastic scaling to match demand and geographic placement of UPFs for latency-sensitive services.

### 5.2 Technical Benefits

- Programmability and flexibility: network behavior is modified via software updates and API calls.  
- Multi-vendor interoperability: standardized interfaces and container packaging reduce vendor lock-in.  
- Resilience: Kubernetes self-healing, rolling updates, and distributed replicas improve availability.

<img src="images/fig-4.svg" alt="Packet Flow in Containerized SDN-Based 5G Core Network" width="50%">

**Fig. 5 — Packet Flow in a Containerized SDN-Based 5G Core Network**

</details>

---

<details>
<summary><strong>6. Challenges and Considerations</strong></summary>

## 6. Challenges and Considerations

### 6.1 Performance Considerations

- Container networking may add overhead; high-performance user plane workloads often require acceleration (SR-IOV, DPDK) or kernel bypass techniques.  
- Proper CPU, memory, and NIC resource allocation and tuned CNI choices are essential for predictable performance.

### 6.2 Operational and Security Challenges

- Operational complexity: teams must adopt Kubernetes, observability tooling, and cloud-native practices.  
- State management: use StatefulSets or external data stores where persistent state is required.  
- Security: secure images, runtime protections, network policies, and robust API authentication/authorization are required.

<img src="images/fig-5.svg" alt="Benefits of Containerized SDN-Based 5G Core Network" width="40%">

*Fig. 6 — Benefits of a Containerized SDN-Based 5G Core Network*

</details>

---

<details>
<summary><strong>7. Conclusion</strong></summary>

## 7. Conclusion

Combining SDN principles with a cloud-native 5G Core—deployed as containerized microservices and orchestrated with Kubernetes—delivers a flexible, programmable, and efficient platform for next-generation services. The approach enables rapid service innovation, improved resource efficiency, and fine-grained traffic control, while placing new demands on performance engineering, operations, and security practices.

This experiment’s theory provides a practical foundation for exploring how SDN, container orchestration, and 5GC functions interact in real-world deployments.

</details>
