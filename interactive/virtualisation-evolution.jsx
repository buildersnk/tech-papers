import { useState, useRef, useEffect } from "react";

const COLORS = {
  bg: "#0e1117",
  surface: "#161b22",
  surfaceHover: "#1c2333",
  border: "#30363d",
  borderActive: "#58a6ff",
  text: "#e6edf3",
  textMuted: "#8b949e",
  accent: "#58a6ff",
  accentSoft: "rgba(88,166,255,0.08)",
  green: "#3fb950",
  orange: "#d29922",
  red: "#f85149",
  purple: "#bc8cff",
  pink: "#f778ba",
  teal: "#39d2c0",
  yellow: "#e3b341",
};

const ERAS = [
  { id: "bare", label: "Bare Metal", year: "1960s", color: "#8b949e" },
  { id: "hw-virt", label: "Hardware Virtualisation", year: "1999", color: "#d29922" },
  { id: "kvm", label: "KVM", year: "2007", color: "#f85149" },
  { id: "lxc", label: "LXC Containers", year: "2008", color: "#3fb950" },
  { id: "docker", label: "Docker", year: "2013", color: "#58a6ff" },
  { id: "k8s", label: "Kubernetes", year: "2014", color: "#bc8cff" },
  { id: "podman", label: "Podman", year: "2018", color: "#f778ba" },
  { id: "firecracker", label: "Firecracker", year: "2018", color: "#e3b341" },
  { id: "gvisor", label: "gVisor", year: "2018", color: "#39d2c0" },
  { id: "kata", label: "Kata Containers", year: "2018", color: "#ff7b72" },
  { id: "wasm", label: "WASM Containers", year: "2022+", color: "#79c0ff" },
  { id: "unikernel", label: "Unikernels", year: "2024+", color: "#d2a8ff" },
];

const GLOSSARY = {
  "Hypervisor": "A hypervisor is software that creates and runs virtual machines. First principle: a CPU can only run one OS at a time natively. A hypervisor tricks multiple OSes into thinking they each own the hardware by intercepting privileged CPU instructions and mapping virtual hardware to real hardware. Type 1 (bare-metal) runs directly on hardware. Type 2 runs on top of a host OS.",
  "KVM": "Kernel-based Virtual Machine. First principle: the Linux kernel already manages hardware (CPU scheduling, memory). KVM turns the kernel itself into a Type-1 hypervisor by using CPU virtualisation extensions (Intel VT-x / AMD-V). Instead of building a hypervisor from scratch, it reuses the battle-tested Linux kernel. Each VM is just a regular Linux process — you get all existing Linux tooling for free.",
  "Namespace": "A Linux kernel feature that partitions system resources so processes see their own isolated view. First principle: the kernel maintains global tables for PIDs, network stacks, mount points, users, etc. Namespaces create per-process copies of these tables. A process in a PID namespace thinks it's PID 1, even though the host sees it as PID 48372. This is the foundation of containers — isolation without a second kernel.",
  "cgroup": "Control Group. A Linux kernel mechanism to limit, account for, and isolate resource usage (CPU, memory, disk I/O, network). First principle: without cgroups, any process can consume unlimited resources. cgroups create a hierarchy where you assign resource budgets. If a container's cgroup says 'max 512MB RAM', the kernel enforces it. Combined with namespaces, this gives containers resource isolation.",
  "Container Image": "A read-only template containing application code, runtime, libraries, and config — everything needed to run. First principle: software has dependencies. 'Works on my machine' happens because machines differ. An image freezes a known-good filesystem state using layered filesystems (UnionFS/OverlayFS). Each layer is a diff. Layers are shared and cached, making images space-efficient.",
  "OCI": "Open Container Initiative. Industry standards for container formats and runtimes. First principle: Docker invented the container format, but a single vendor controlling infrastructure standards creates lock-in risk. OCI defined open specs (image-spec, runtime-spec, distribution-spec) so any runtime (Docker, Podman, containerd, CRI-O) can run any OCI image. Interoperability through standardisation.",
  "Container Runtime": "Software that actually creates and runs containers. First principle: a 'container' is just a process with namespaces + cgroups + a root filesystem. The runtime sets these up. Low-level runtimes (runc, crun, gVisor's runsc) configure the kernel primitives. High-level runtimes (containerd, CRI-O) manage image pulling, storage, and lifecycle on top.",
  "Orchestration": "Automated management of containerised applications across a cluster. First principle: one container on one server is simple. Hundreds of containers across dozens of servers introduces coordination problems — scheduling, networking, scaling, healing. Orchestration is the automation layer that treats a cluster as a single computer. Kubernetes is the dominant orchestrator.",
  "Pod": "The smallest deployable unit in Kubernetes — one or more containers sharing network and storage. First principle: some processes are tightly coupled (app + log shipper, app + sidecar proxy). Rather than forcing everything into one container (breaking single-responsibility), a Pod groups containers that must share localhost and filesystem. They're scheduled together and share a fate.",
  "microVM": "An extremely lightweight virtual machine optimised for fast boot and minimal overhead. First principle: traditional VMs carry a full OS — gigabytes of unused code. A microVM strips everything except what the workload needs: a tiny kernel, minimal device model, and the application. Firecracker boots a microVM in ~125ms with <5MB overhead while maintaining hardware-level isolation via KVM.",
  "Syscall": "A system call is how a userspace program requests services from the kernel (file I/O, networking, process creation). First principle: CPUs have privilege rings. User programs run in Ring 3 (restricted). The kernel runs in Ring 0 (full access). A syscall is the controlled gate between them — the program traps into kernel mode, the kernel validates and executes, then returns. Linux has ~450 syscalls.",
  "OverlayFS": "A union filesystem that layers multiple directories into a single merged view. First principle: you want containers to share base layers (Ubuntu, Node.js) without duplicating storage, but each container needs its own writable space. OverlayFS stacks a read-only 'lower' dir with a read-write 'upper' dir. Reads fall through layers. Writes go to upper via copy-on-write. This makes containers storage-efficient.",
  "etcd": "A distributed, strongly-consistent key-value store. Kubernetes uses it as its single source of truth. First principle: in a distributed system, all nodes need to agree on state (which pods run where, what config applies). etcd uses the Raft consensus algorithm — a majority of nodes must agree before a write is committed. This prevents split-brain scenarios where different parts of the cluster disagree.",
  "Seccomp": "Secure Computing mode. A Linux kernel feature that restricts which syscalls a process can make. First principle: most applications use only ~40-60 of Linux's ~450 syscalls. Every unused syscall is unnecessary attack surface. Seccomp lets you define a whitelist — if the process tries a blocked syscall, the kernel kills it. Docker applies a default seccomp profile blocking ~44 dangerous syscalls.",
  "WASM": "WebAssembly. A portable binary instruction format originally designed for browsers, now used as a universal runtime. First principle: different CPUs have different instruction sets, different OSes have different APIs. WASM defines a platform-neutral bytecode with a sandboxed memory model. Code compiles once, runs anywhere — with near-native speed and a strict security sandbox. Microsecond cold starts.",
  "Unikernel": "A specialised, single-address-space machine image built by compiling application code with only the OS primitives it needs into a single binary. First principle: general-purpose OS kernels carry millions of lines of code for hardware/features the app never uses. Each line is potential attack surface. A unikernel eliminates everything unnecessary — no shell, no users, no unused drivers. The result boots in milliseconds with a tiny attack surface.",
  "Service Mesh": "A dedicated infrastructure layer for handling service-to-service communication. First principle: in a microservices architecture, every service needs retry logic, TLS, load balancing, circuit breaking, and observability. Building this into every service is duplication. A service mesh (Istio, Linkerd) injects sidecar proxies that handle all network concerns transparently. Applications just make plain HTTP calls.",
  "Rootless": "Running containers without root (superuser) privileges. First principle: traditional Docker requires a root daemon — if compromised, an attacker gets full host access. Rootless remaps user IDs so the container's 'root' is actually an unprivileged user on the host. Even if an attacker escapes the container, they land as nobody. Podman pioneered this as a default.",
  "CRI": "Container Runtime Interface. A Kubernetes API for pluggable container runtimes. First principle: Kubernetes originally depended on Docker directly — tight coupling. CRI defines a gRPC interface that any runtime can implement (containerd, CRI-O). This lets Kubernetes swap runtimes without code changes. In 2022, Kubernetes removed Docker shim, completing the decoupling.",
  "Immutable Infrastructure": "Servers are never modified after deployment — changes mean deploying a new instance. First principle: mutable servers accumulate configuration drift (manual patches, undocumented tweaks) until no two servers match. Immutable infrastructure treats servers like containers — build a new image, deploy, destroy the old one. Every deployment is reproducible. This eliminates 'snowflake servers'.",
  "Copy-on-Write": "A resource-sharing strategy where copies are deferred until modification. First principle: copying large data structures (filesystems, memory pages) is expensive. If two processes read the same data, they can share it. Only when one writes does the system copy the modified portion. This is how container layers work — 100 containers sharing a base image only store their unique changes.",
  "eBPF": "Extended Berkeley Packet Filter. A technology that lets you run sandboxed programs inside the Linux kernel without modifying kernel source. First principle: the kernel is monolithic and hard to extend. eBPF provides a safe, verified virtual machine inside the kernel where you can attach custom logic to syscalls, network packets, and tracepoints — enabling deep observability and security without kernel modules.",
};

const TECH_DATA = {
  "bare": {
    title: "Bare Metal",
    subtitle: "Direct hardware, no abstraction",
    year: "1960s–present",
    desc: "Applications run directly on physical hardware with a single operating system. Maximum performance, zero overhead, but no isolation between workloads and catastrophic utilisation rates (often 5–15%).",
    arch: ["Physical Server", "Single OS Kernel", "Applications"],
    metrics: { isolation: 1, density: 1, boot: 5, portability: 1, overhead: 5, security: 2 },
    concepts: ["Syscall"],
    whys: [
      { q: "Why run on bare metal?", a: "Because the application needs 100% of hardware performance with zero abstraction overhead — every CPU cycle and memory access goes directly to the workload." },
      { q: "Why does it need zero overhead?", a: "Because workloads like HPC, real-time trading, and GPU-intensive ML training lose measurable throughput to any virtualisation layer — even 2–3% matters at scale." },
      { q: "Why can't virtualisation absorb that cost?", a: "Because hypervisor traps, memory indirection, and I/O virtualisation add latency at the instruction level that compounds across billions of operations per second." },
      { q: "Why haven't CPUs eliminated that overhead?", a: "Hardware virtualisation extensions (VT-x, VT-d, SR-IOV) have reduced it dramatically, but the abstraction layer itself still interposes on privileged operations and memory page tables." },
      { q: "Why do people still choose bare metal today?", a: "Because for latency-critical, single-tenant, or compliance-locked workloads, the complexity of virtualisation adds risk without proportional benefit — simplicity is itself a feature." },
    ],
  },
  "hw-virt": {
    title: "Hardware Virtualisation (VMware / Xen)",
    subtitle: "Multiple OSes on one machine",
    year: "1999–present",
    desc: "A hypervisor mediates between guest operating systems and physical hardware, letting multiple full OS instances share one server. VMware (1999) made x86 virtualisation practical; Xen (2003) pioneered paravirtualisation. Server utilisation jumped from ~15% to 60–80%.",
    arch: ["Physical Server", "Hypervisor (VMM)", "Guest OS 1 | Guest OS 2 | Guest OS N", "Apps | Apps | Apps"],
    metrics: { isolation: 5, density: 2, boot: 2, portability: 3, overhead: 2, security: 5 },
    concepts: ["Hypervisor", "Syscall", "Copy-on-Write"],
    whys: [
      { q: "Why virtualise hardware?", a: "Because physical servers were running at 5–15% utilisation — billions of dollars in hardware sitting idle because each app needed its own dedicated machine." },
      { q: "Why did each app need its own machine?", a: "Because applications conflicted — different OS versions, library dependencies, and kernel configs meant colocating apps caused crashes and security breaches." },
      { q: "Why not just fix the dependency conflicts?", a: "Because dependency management across thousands of apps at enterprise scale is an unsolvable coordination problem — the number of possible conflicts grows combinatorially." },
      { q: "Why is a hypervisor the right abstraction?", a: "Because it intercepts at the hardware level (CPU rings, memory pages), making isolation invisible to guest OSes — existing software runs unmodified inside VMs." },
      { q: "Why did this become the dominant model for decades?", a: "Because it solved the utilisation crisis, provided strong security isolation, enabled live migration, and let enterprises consolidate thousands of physical servers — saving millions in hardware and power." },
    ],
  },
  "kvm": {
    title: "KVM (Kernel-based Virtual Machine)",
    subtitle: "Linux kernel becomes the hypervisor",
    year: "2007–present",
    desc: "Rather than building a hypervisor from scratch, KVM turns the Linux kernel itself into a Type-1 hypervisor by leveraging CPU virtualisation extensions (Intel VT-x / AMD-V). Each VM is a regular Linux process managed by existing kernel scheduling and memory management. This made virtualisation a kernel feature, not a separate product.",
    arch: ["Hardware (VT-x/AMD-V)", "Linux Kernel + KVM Module", "QEMU (device emulation)", "Guest VM 1 | Guest VM 2"],
    metrics: { isolation: 5, density: 3, boot: 2, portability: 3, overhead: 3, security: 5 },
    concepts: ["KVM", "Hypervisor", "Syscall"],
    whys: [
      { q: "Why build KVM inside the Linux kernel?", a: "Because the Linux kernel already has world-class process scheduling, memory management, and hardware drivers — reimplementing all of this in a standalone hypervisor is duplication." },
      { q: "Why reuse existing kernel infrastructure?", a: "Because a standalone hypervisor (Xen, VMware ESXi) must maintain its own scheduler, memory allocator, and driver model — a massive engineering burden with a smaller developer community." },
      { q: "Why does developer community size matter?", a: "Because bugs in hypervisors are critical security vulnerabilities. More eyes on the code (Linux has thousands of contributors) means faster discovery and patching of exploits." },
      { q: "Why make VMs appear as regular Linux processes?", a: "Because it lets administrators use existing Linux tools (top, cgroups, perf, strace) to manage VMs — no new proprietary management stack needed." },
      { q: "Why did this matter so much?", a: "Because it democratised virtualisation. KVM shipped free in every Linux kernel from 2.6.20, eliminated hypervisor licensing costs, and became the foundation of OpenStack, Google Cloud, and cloud computing as we know it." },
    ],
  },
  "lxc": {
    title: "LXC (Linux Containers)",
    subtitle: "OS-level virtualisation via kernel primitives",
    year: "2008–present",
    desc: "LXC combined Linux namespaces and cgroups to create isolated user-space instances that share the host kernel. Unlike VMs, no second kernel boots — processes are isolated at the OS level. This was the conceptual ancestor of Docker and all modern containers.",
    arch: ["Hardware", "Single Linux Kernel", "Namespaces + cgroups", "Container 1 | Container 2 | Container N"],
    metrics: { isolation: 3, density: 4, boot: 4, portability: 2, overhead: 4, security: 3 },
    concepts: ["Namespace", "cgroup", "Seccomp", "Syscall"],
    whys: [
      { q: "Why share the host kernel instead of running a guest OS?", a: "Because a full guest OS kernel adds 200–500MB of overhead per instance and takes 10–30 seconds to boot. Sharing one kernel means near-zero overhead and sub-second startup." },
      { q: "Why was overhead a problem?", a: "Because cloud providers and enterprises were running thousands of microservices. If each needs a full VM, you burn gigabytes of RAM just on duplicate OS kernels that all do the same thing." },
      { q: "Why not just run multiple apps in one OS?", a: "Because without isolation, processes can interfere: one app's memory leak crashes another, one app can read another's files, and dependency conflicts break deployments." },
      { q: "Why are namespaces + cgroups sufficient for isolation?", a: "Because namespaces hide resources (PIDs, network, filesystem) and cgroups limit resources (CPU, memory). Together they provide visibility isolation + resource isolation — the two axes that matter." },
      { q: "Why didn't LXC become the standard?", a: "Because LXC focused on 'lightweight VMs' (full OS containers) rather than application packaging. It lacked a standard image format, registry, and developer workflow — the pieces Docker later provided." },
    ],
  },
  "docker": {
    title: "Docker",
    subtitle: "Containers for developers, not sysadmins",
    year: "2013–present",
    desc: "Docker democratised containers by solving the developer experience problem: a standard image format, Dockerfile build system, Docker Hub registry, and a simple CLI. 'Build once, run anywhere' finally worked. Docker didn't invent containers — it made them usable.",
    arch: ["Hardware", "Linux Kernel", "Docker Engine (containerd + runc)", "Image Layers (OverlayFS)", "Container 1 | Container 2"],
    metrics: { isolation: 3, density: 4, boot: 5, portability: 5, overhead: 4, security: 3 },
    concepts: ["Container Image", "OCI", "Container Runtime", "OverlayFS", "Namespace", "cgroup", "Copy-on-Write"],
    whys: [
      { q: "Why did Docker succeed where LXC didn't?", a: "Because Docker solved the packaging problem, not just the isolation problem. A Dockerfile defines a reproducible build. An image is a portable artifact. Docker Hub is a distribution mechanism. LXC had none of these." },
      { q: "Why is packaging more important than isolation?", a: "Because the #1 pain point for developers was 'it works on my machine' — dependency hell across dev, staging, and production. Isolation was a sysadmin concern; packaging was a developer concern. Docker targeted developers." },
      { q: "Why target developers instead of sysadmins?", a: "Because developers create the workloads. If you win the build-and-ship workflow, you control what runs in production. Bottom-up adoption (devs love it → teams adopt it → enterprises mandate it) is faster than top-down sales." },
      { q: "Why use layered images?", a: "Because most containers share common bases (Ubuntu, Node, Python). Layers enable deduplication via copy-on-write — 100 containers based on the same image share those layers, storing only their unique deltas." },
      { q: "Why did this reshape the entire industry?", a: "Because Docker made the 'immutable artifact' the unit of deployment, which enabled CI/CD pipelines, microservice architectures, and eventually Kubernetes. It shifted infrastructure from 'pets' (hand-managed servers) to 'cattle' (disposable, identical instances)." },
    ],
  },
  "k8s": {
    title: "Kubernetes",
    subtitle: "The operating system for containers at scale",
    year: "2014–present",
    desc: "Born from Google's internal Borg system, Kubernetes automates deployment, scaling, and management of containerised applications across clusters. It provides a declarative API: you describe desired state, Kubernetes converges reality to match. Now managed by CNCF, it's the de facto standard for container orchestration.",
    arch: ["Cluster (Nodes)", "Control Plane (API Server, Scheduler, Controller, etcd)", "Worker Nodes (kubelet, kube-proxy)", "Pods → Containers"],
    metrics: { isolation: 3, density: 4, boot: 4, portability: 5, overhead: 3, security: 4 },
    concepts: ["Orchestration", "Pod", "etcd", "CRI", "Service Mesh", "Namespace", "Immutable Infrastructure"],
    whys: [
      { q: "Why orchestrate containers?", a: "Because Docker solved single-host containers, but production means hundreds of containers across dozens of machines. Someone has to decide where each container runs, restart failures, balance load, and manage networking. Doing this manually doesn't scale." },
      { q: "Why not just use Docker Compose or Swarm?", a: "Because Compose is single-host and Swarm lacks the scheduling sophistication, self-healing, and extensibility needed at scale. Google ran 2 billion containers per week on Borg — they knew what scale required." },
      { q: "Why a declarative model (desired state) instead of imperative commands?", a: "Because imperative scripts break under partial failures. If step 3 of 10 fails, what state is the system in? Declarative systems continuously reconcile: 'I want 5 replicas' — Kubernetes ensures 5 exist regardless of crashes, node failures, or network partitions." },
      { q: "Why open-source it instead of keeping it proprietary?", a: "Because Google wanted to commoditise the orchestration layer to drive cloud adoption (including GKE). By making Kubernetes the standard, they prevented AWS or Azure from creating a proprietary lock-in alternative." },
      { q: "Why has it become the universal infrastructure API?", a: "Because Kubernetes' extensibility (Custom Resource Definitions, Operators) lets it manage anything — databases, ML pipelines, VMs, serverless. It evolved from 'container orchestrator' to 'platform for building platforms', which is why CNCF now positions it as AI infrastructure too." },
    ],
  },
  "podman": {
    title: "Podman",
    subtitle: "Daemonless, rootless, Docker-compatible",
    year: "2018–present",
    desc: "Red Hat built Podman to address Docker's architectural weaknesses: the privileged root daemon (single point of failure and security risk), and tight coupling. Podman is daemonless (each container is a child process of the CLI), rootless by default, and CLI-compatible with Docker.",
    arch: ["Hardware", "Linux Kernel", "No Daemon (fork/exec)", "conmon (container monitor)", "crun/runc", "Container 1 | Container 2"],
    metrics: { isolation: 4, density: 4, boot: 5, portability: 4, overhead: 4, security: 4 },
    concepts: ["Rootless", "OCI", "Container Runtime", "Pod", "Namespace", "cgroup", "Seccomp"],
    whys: [
      { q: "Why eliminate the Docker daemon?", a: "Because a daemon running as root that manages all containers is a single point of failure and a high-value attack target. If the daemon crashes, every container dies. If it's compromised, the attacker has root on the host." },
      { q: "Why is a root daemon a security problem?", a: "Because Docker's daemon runs as UID 0 (root). Any vulnerability in the daemon — or any container escape — gives full superuser access to the host. This violates the principle of least privilege." },
      { q: "Why not just fix Docker's daemon?", a: "Because the daemon architecture is fundamental to Docker's design. Refactoring it would break backwards compatibility and the Docker ecosystem. It was easier to build a clean alternative (Podman) than to retrofit security into Docker's core." },
      { q: "Why make it CLI-compatible with Docker?", a: "Because migration friction kills adoption. If switching from Docker to Podman requires rewriting every script, Makefile, and CI pipeline, nobody will switch. `alias docker=podman` works because the CLI is identical." },
      { q: "Why does Red Hat invest in this?", a: "Because Red Hat sells enterprise Linux (RHEL) and OpenShift (Kubernetes platform). Secure, rootless containers that integrate with systemd and SELinux make their platform safer. Podman became RHEL's default container tool, replacing Docker." },
    ],
  },
  "firecracker": {
    title: "Firecracker (microVM)",
    subtitle: "VM-level isolation at container speed",
    year: "2018–present",
    desc: "AWS built Firecracker in Rust to power Lambda and Fargate. It's a minimal Virtual Machine Monitor (VMM) that creates microVMs: each gets its own kernel and hardware-level isolation via KVM, but boots in ~125ms with <5MB memory overhead. Up to 150 microVMs per second per host. The best of both worlds — VM security with container speed.",
    arch: ["Hardware (KVM)", "Firecracker VMM (Rust)", "Minimal Guest Kernel", "microVM 1 | microVM 2 | ... | microVM 150+"],
    metrics: { isolation: 5, density: 4, boot: 4, portability: 3, overhead: 4, security: 5 },
    concepts: ["microVM", "KVM", "Hypervisor", "Syscall", "Seccomp"],
    whys: [
      { q: "Why not just use containers for Lambda?", a: "Because Lambda runs untrusted customer code from millions of accounts on shared hardware. Standard containers share the host kernel — a kernel vulnerability means one tenant can attack another. The blast radius is unacceptable." },
      { q: "Why not use traditional VMs?", a: "Because Lambda functions execute in milliseconds. A traditional VM takes 10–30 seconds to boot, consumes 200MB+ of RAM overhead, and can only run ~50 per host. At Lambda's scale (trillions of invocations), this is economically impossible." },
      { q: "Why build a new VMM instead of stripping down QEMU?", a: "Because QEMU supports 80+ device types and dozens of architectures — 1.4 million lines of code. Most of that code is attack surface Lambda doesn't need. Firecracker implements only ~20 devices in ~50K lines of Rust. Smaller codebase = smaller attack surface." },
      { q: "Why Rust?", a: "Because memory safety vulnerabilities (buffer overflows, use-after-free) account for ~70% of CVEs in systems software. Rust eliminates these classes of bugs at compile time. For a security boundary like a VMM, this matters enormously." },
      { q: "Why open-source it?", a: "Because AWS wanted industry adoption to validate the security model, attract external security audits, and establish microVMs as a standard isolation primitive. It also powers Fly.io, Koyeb, and other platforms — proving the model works beyond AWS." },
    ],
  },
  "gvisor": {
    title: "gVisor",
    subtitle: "User-space kernel for syscall interception",
    year: "2018–present",
    desc: "Google's gVisor implements a Linux-compatible kernel in user space (the 'Sentry'). Instead of containers sharing the real kernel, gVisor intercepts syscalls and re-implements them in a sandboxed Go process. This dramatically reduces the kernel attack surface without the overhead of a full VM.",
    arch: ["Hardware", "Host Linux Kernel", "gVisor Sentry (user-space kernel, Go)", "Gofer (file proxy)", "Sandboxed Application"],
    metrics: { isolation: 4, density: 4, boot: 4, portability: 3, overhead: 3, security: 4 },
    concepts: ["Syscall", "Seccomp", "Container Runtime", "OCI", "Namespace"],
    whys: [
      { q: "Why intercept syscalls in user space?", a: "Because the Linux kernel exposes ~450 syscalls, each a potential entry point for exploitation. By intercepting syscalls in a user-space process, you can re-implement only the ~200 that applications actually need, eliminating half the attack surface." },
      { q: "Why not just use seccomp to block dangerous syscalls?", a: "Because seccomp can only allow/deny syscalls — it can't change their behaviour. Some syscalls are needed but dangerous (e.g., ptrace, mount). gVisor re-implements them safely rather than blocking them entirely." },
      { q: "Why not just use microVMs (Firecracker)?", a: "Because microVMs have higher per-instance overhead (~5MB RAM + dedicated kernel). For Google's internal workloads (hundreds of thousands of containers), gVisor's process-level overhead is significantly cheaper at that density." },
      { q: "Why write it in Go?", a: "Because Go is memory-safe (eliminating buffer overflows), has built-in concurrency (goroutines for handling parallel syscalls), and is Google's lingua franca — their engineers can contribute and audit the code effectively." },
      { q: "Why does Google use this internally?", a: "Because Google Cloud runs untrusted customer containers in GKE and Cloud Run. gVisor (via runsc runtime) provides the default isolation layer. It's also used for Google's internal services — proving it works at massive scale with acceptable performance overhead (20–50% for syscall-heavy workloads)." },
    ],
  },
  "kata": {
    title: "Kata Containers",
    subtitle: "VM isolation with container UX via Kubernetes",
    year: "2018–present",
    desc: "Kata Containers is an orchestration framework that makes microVMs work seamlessly with container APIs. It supports multiple VMM backends (Cloud Hypervisor, Firecracker, QEMU) and integrates natively with Kubernetes via CRI. From Kubernetes' perspective, a Kata container looks like a normal container — under the hood, it's a full VM with hardware isolation.",
    arch: ["Kubernetes (CRI)", "Kata Runtime (containerd-shim-kata)", "VMM Backend (Cloud Hypervisor / Firecracker / QEMU)", "Guest Kernel + Agent", "OCI Container inside VM"],
    metrics: { isolation: 5, density: 3, boot: 3, portability: 4, overhead: 3, security: 5 },
    concepts: ["microVM", "CRI", "OCI", "KVM", "Hypervisor", "Pod", "Container Runtime"],
    whys: [
      { q: "Why wrap microVMs in container APIs?", a: "Because Kubernetes is the dominant orchestrator, and operators have invested heavily in Kubernetes tooling, monitoring, and workflows. If microVMs require a separate management stack, adoption dies. Kata makes VM isolation transparent to the Kubernetes layer." },
      { q: "Why support multiple VMM backends?", a: "Because different workloads need different trade-offs: Firecracker for speed and minimal footprint, Cloud Hypervisor for performance and feature completeness, QEMU for maximum hardware support. One size doesn't fit all." },
      { q: "Why not just improve container security?", a: "Because containers share the host kernel — a fundamental architectural choice that limits how much security you can add. Seccomp, AppArmor, and SELinux reduce risk but can't eliminate kernel-level vulnerabilities. Kata eliminates the shared kernel entirely." },
      { q: "Why merge the Clear Containers and runV projects?", a: "Because Intel (Clear Containers) and Hyper (runV) were solving the same problem independently. Merging reduced duplication, combined expertise, and created a single community under the OpenStack Foundation." },
      { q: "Why is this critical for multi-tenant Kubernetes?", a: "Because cloud providers (Azure AKS, IBM Cloud) run multiple customers' workloads on shared clusters. A container escape in a shared-kernel environment can access other tenants' data. Kata's per-pod VMs create hardware-enforced tenant boundaries." },
    ],
  },
  "wasm": {
    title: "WebAssembly (WASM) Containers",
    subtitle: "Microsecond cold starts, universal bytecode",
    year: "2022+–present",
    desc: "WASM was designed for browsers but is now a container alternative. WASM runtimes (Wasmtime, WasmEdge, Spin) execute portable bytecode in a strict sandbox with microsecond cold starts and ~1MB memory footprint. 'If WASM+WASI existed in 2008, we wouldn't have needed Docker' — Solomon Hykes (Docker co-founder).",
    arch: ["Hardware", "Host OS", "WASM Runtime (Wasmtime/WasmEdge)", "WASI (System Interface)", "WASM Module 1 | Module 2 | Module N"],
    metrics: { isolation: 4, density: 5, boot: 5, portability: 5, overhead: 5, security: 4 },
    concepts: ["WASM", "OCI", "Immutable Infrastructure"],
    whys: [
      { q: "Why use a browser technology for server-side containers?", a: "Because WASM's design goals — safe execution of untrusted code, platform-neutral bytecode, near-native performance — are exactly what server-side isolation needs. The browser just happened to need it first." },
      { q: "Why are microsecond cold starts important?", a: "Because serverless functions and edge computing need instant scale-from-zero. Container cold starts (~50–200ms) and microVM cold starts (~125ms) are too slow for latency-sensitive edge workloads handling thousands of requests per second." },
      { q: "Why is the sandbox model different from containers?", a: "Because WASM sandboxing is capability-based: a module has zero access by default — no filesystem, no network, no env vars. You explicitly grant each capability. Containers start with broad access and subtract via seccomp/AppArmor. Deny-by-default is stronger than allow-by-default." },
      { q: "Why can't WASM replace containers entirely yet?", a: "Because WASI (WebAssembly System Interface) is still maturing. Full filesystem, networking, and threading support are evolving. Complex applications needing OS-level integration (databases, legacy systems) can't run in WASM yet." },
      { q: "Why is the industry investing heavily anyway?", a: "Because for stateless, compute-focused workloads (API handlers, data transforms, edge functions), WASM offers 10–100× density improvements over containers. Fermyon, Fastly, Cloudflare Workers, and SpinKube (WASM on Kubernetes) are production-ready for these use cases." },
    ],
  },
  "unikernel": {
    title: "Unikernels",
    subtitle: "Single-purpose, library OS machines",
    year: "2024+–emerging",
    desc: "Unikernels compile an application with only the OS primitives it needs into a single bootable binary. No shell, no users, no unused drivers. NanoVMs (Nanos), MirageOS, and OSv produce images that boot in milliseconds with attack surfaces orders of magnitude smaller than general-purpose OSes. Still niche but gaining traction for edge and IoT.",
    arch: ["Hardware / Hypervisor", "Single Address Space", "App + Library OS (compiled together)", "No shell, no users, no multi-process"],
    metrics: { isolation: 5, density: 5, boot: 5, portability: 2, overhead: 5, security: 5 },
    concepts: ["Unikernel", "Immutable Infrastructure", "Hypervisor"],
    whys: [
      { q: "Why compile the OS into the application?", a: "Because a general-purpose Linux kernel contains 30+ million lines of code — most of which any given application never uses. Each unused line is attack surface. A unikernel includes only what's needed, reducing the image to kilobytes or single-digit megabytes." },
      { q: "Why eliminate the shell, SSH, and multi-user support?", a: "Because these exist for human operators to debug running systems. But in immutable infrastructure, you don't debug — you redeploy. Removing interactive access eliminates entire categories of attacks (remote shell exploits, privilege escalation)." },
      { q: "Why hasn't this gone mainstream?", a: "Because debugging is hard (no shell to attach to), the ecosystem is fragmented (each unikernel supports different languages), and the tooling assumes Linux-compatible environments. The developer experience gap is enormous." },
      { q: "Why is it re-emerging now?", a: "Because edge computing and IoT need ultra-lightweight, secure runtimes. A unikernel that boots in 5ms, uses 2MB RAM, and has almost no attack surface is ideal for embedded, automotive, and satellite computing where resources are scarce and patching is hard." },
      { q: "Why might this become important?", a: "Because the convergence of WASM, microVMs, and unikernels points toward a future where the 'container' is a specialised, minimal, immutable compute unit — not a miniature server. Unikernels represent the extreme end of this trend." },
    ],
  },
};

const METRIC_LABELS = {
  isolation: "Isolation Strength",
  density: "Workload Density",
  boot: "Boot Speed",
  portability: "Portability",
  overhead: "Resource Efficiency",
  security: "Security Posture",
};

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const tipRef = useRef(null);

  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
    setShow(true);
  };

  return (
    <span
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(!show); }}
      style={{
        borderBottom: `1px dashed ${COLORS.accent}`,
        color: COLORS.accent,
        cursor: "help",
        position: "relative",
        display: "inline",
      }}
    >
      {children}
      {show && (
        <span
          ref={tipRef}
          style={{
            position: "fixed",
            left: Math.min(pos.x, window.innerWidth - 380),
            top: Math.max(pos.y - 8, 8),
            transform: "translateX(-50%) translateY(-100%)",
            background: "#1c2333",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "12px 16px",
            maxWidth: 360,
            fontSize: 13,
            lineHeight: 1.55,
            color: COLORS.text,
            zIndex: 9999,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function ConceptTag({ name }) {
  const def = GLOSSARY[name];
  if (!def) return <span style={tagStyle}>{name}</span>;
  return (
    <Tooltip text={def}>
      <span style={tagStyle}>{name}</span>
    </Tooltip>
  );
}

const tagStyle = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 4,
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  background: COLORS.accentSoft,
  color: COLORS.accent,
  border: `1px solid rgba(88,166,255,0.15)`,
  marginRight: 6,
  marginBottom: 4,
  cursor: "help",
};

function MetricBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textMuted, marginBottom: 3, fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{label}</span>
        <span>{value}/5</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value * 20}%`, background: color, borderRadius: 3, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
    </div>
  );
}

function WhyChain({ whys, color }) {
  const [expanded, setExpanded] = useState(0);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
        5 Whys Analysis
      </div>
      {whys.map((w, i) => (
        <div
          key={i}
          onClick={() => setExpanded(expanded === i ? -1 : i)}
          style={{
            cursor: "pointer",
            marginBottom: 6,
            borderLeft: `3px solid ${i <= expanded ? color : "rgba(255,255,255,0.06)"}`,
            paddingLeft: 14,
            transition: "all 0.25s ease",
            opacity: i <= expanded ? 1 : 0.45,
          }}
        >
          <div style={{ fontSize: 12, color: i <= expanded ? color : COLORS.textMuted, fontWeight: 600, marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>
            Why #{i + 1}
          </div>
          <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500, marginBottom: 4 }}>{w.q}</div>
          {expanded >= i && (
            <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.6, paddingBottom: 8 }}>
              {w.a}
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", marginTop: 6 }}>
        Click each level to expand/collapse the reasoning chain
      </div>
    </div>
  );
}

function ArchDiagram({ layers, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "16px 0" }}>
      {layers.map((layer, i) => (
        <div
          key={i}
          style={{
            background: i === 0 ? `${color}15` : `rgba(255,255,255,${0.02 + i * 0.01})`,
            border: `1px solid ${i === 0 ? color + "40" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            color: i === 0 ? color : COLORS.textMuted,
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          {layer}
        </div>
      ))}
    </div>
  );
}

function TechCard({ id, era, active, onClick }) {
  const data = TECH_DATA[id];
  const isActive = active === id;
  return (
    <div
      onClick={() => onClick(id)}
      style={{
        background: isActive ? COLORS.surfaceHover : COLORS.surface,
        border: `1px solid ${isActive ? era.color + "80" : COLORS.border}`,
        borderRadius: 10,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isActive && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: era.color }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>{data.title}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{data.subtitle}</div>
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: era.color,
          background: era.color + "12",
          padding: "3px 10px",
          borderRadius: 4,
          border: `1px solid ${era.color}25`,
          whiteSpace: "nowrap",
        }}>
          {data.year}
        </div>
      </div>

      <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
        {data.desc}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {data.concepts.map(c => <ConceptTag key={c} name={c} />)}
      </div>

      {isActive && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8, letterSpacing: "0.03em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
            Architecture Stack
          </div>
          <ArchDiagram layers={data.arch} color={era.color} />

          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10, marginTop: 18, letterSpacing: "0.03em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
            Capability Profile
          </div>
          {Object.entries(data.metrics).map(([k, v]) => (
            <MetricBar key={k} label={METRIC_LABELS[k]} value={v} color={era.color} />
          ))}

          <WhyChain whys={data.whys} color={era.color} />
        </div>
      )}

      {!isActive && (
        <div style={{ fontSize: 11, color: era.color, fontFamily: "'JetBrains Mono', monospace", opacity: 0.7, marginTop: 4 }}>
          ▸ Click to expand architecture, metrics & 5 Whys
        </div>
      )}
    </div>
  );
}

function CompareView() {
  const [sel, setSel] = useState(["docker", "k8s", "firecracker"]);
  const toggle = (id) => {
    if (sel.includes(id)) {
      if (sel.length > 1) setSel(sel.filter(x => x !== id));
    } else if (sel.length < 4) {
      setSel([...sel, id]);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
        Select 1–4 technologies to compare (click to toggle):
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {ERAS.map(e => (
          <button
            key={e.id}
            onClick={() => toggle(e.id)}
            style={{
              background: sel.includes(e.id) ? e.color + "20" : "transparent",
              border: `1px solid ${sel.includes(e.id) ? e.color : COLORS.border}`,
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              color: sel.includes(e.id) ? e.color : COLORS.textMuted,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.15s ease",
            }}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              {sel.map(s => {
                const era = ERAS.find(e => e.id === s);
                return <th key={s} style={{ ...thStyle, color: era.color }}>{era.label}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(METRIC_LABELS).map(([k, label]) => (
              <tr key={k}>
                <td style={tdStyle}>{label}</td>
                {sel.map(s => {
                  const era = ERAS.find(e => e.id === s);
                  const v = TECH_DATA[s].metrics[k];
                  return (
                    <td key={s} style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${v * 20}%`, background: era.color, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: era.color, fontSize: 12 }}>{v}/5</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 14px",
  borderBottom: `1px solid ${COLORS.border}`,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: COLORS.textMuted,
};

const tdStyle = {
  padding: "10px 14px",
  borderBottom: `1px solid rgba(255,255,255,0.03)`,
  color: COLORS.textMuted,
  fontSize: 13,
};

function GlossaryView() {
  const [filter, setFilter] = useState("");
  const entries = Object.entries(GLOSSARY).filter(([k]) =>
    k.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search concepts..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          color: COLORS.text,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 16,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map(([name, def]) => (
          <div key={name} style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "14px 18px",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              {name}
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65 }}>
              {def}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineMini({ active, onSelect }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", padding: "16px 0", position: "relative" }}>
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: COLORS.border, zIndex: 0 }} />
      {ERAS.map((e, i) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", zIndex: 1, flexShrink: 0 }}>
          <div
            onClick={() => onSelect(e.id)}
            style={{
              width: active === e.id ? 14 : 10,
              height: active === e.id ? 14 : 10,
              borderRadius: "50%",
              background: active === e.id ? e.color : COLORS.surface,
              border: `2px solid ${e.color}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
            }}
            title={`${e.label} (${e.year})`}
          >
            {active === e.id && (
              <div style={{
                position: "absolute",
                bottom: -22,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                color: e.color,
                whiteSpace: "nowrap",
              }}>
                {e.year}
              </div>
            )}
          </div>
          {i < ERAS.length - 1 && (
            <div style={{ width: 28, height: 2, background: COLORS.border, flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("explore");
  const [active, setActive] = useState("docker");

  const tabs = [
    { id: "explore", label: "Explore" },
    { id: "compare", label: "Compare" },
    { id: "glossary", label: "Glossary" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        body { margin: 0; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: COLORS.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            Infrastructure Deep Dive
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            The Evolution of Compute Isolation
          </h1>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.6, maxWidth: 700 }}>
            From bare metal to WebAssembly — every technology, why it was built, and the first-principles reasoning behind each decision. Hover any <Tooltip text="Concepts with dashed underlines have detailed first-principles explanations. Hover or tap them anywhere in the dashboard.">highlighted term</Tooltip> for a deep explanation.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, background: COLORS.surface, borderRadius: 10, padding: 4, border: `1px solid ${COLORS.border}`, width: "fit-content" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? COLORS.surfaceHover : "transparent",
                border: tab === t.id ? `1px solid ${COLORS.border}` : "1px solid transparent",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? COLORS.text : COLORS.textMuted,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "explore" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <TimelineMini active={active} onSelect={setActive} />
            <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
              {ERAS.map(e => (
                <TechCard
                  key={e.id}
                  id={e.id}
                  era={e}
                  active={active}
                  onClick={setActive}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <CompareView />
          </div>
        )}

        {tab === "glossary" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <GlossaryView />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${COLORS.border}`, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
          <strong style={{ color: COLORS.text }}>How to read this dashboard:</strong> The <em>Explore</em> tab walks through each technology chronologically — click any card to expand its architecture diagram, capability metrics, and a 5 Whys analysis explaining the design decisions. The <em>Compare</em> tab lets you benchmark up to 4 technologies side by side. The <em>Glossary</em> contains every concept with a first-principles definition. Highlighted terms throughout the dashboard have hover tooltips.
        </div>
      </div>
    </div>
  );
}
