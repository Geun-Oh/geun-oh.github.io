+++
title = 'Cloudflare Workers and Containers'
date = 2025-07-04T00:38:43+09:00
draft = true
+++

## Introduction

Cloudflare has launched its Container Service Platform in Public Open Beta, enabling developers to deploy containers as serverless functions alongside Cloudflare Workers. This release comes approximately 9 months after Cloudflare first introduced its unified container platform, integrating a range of technologies into a single offering.

While Cloudflare Containers and Cloudflare Workers are now unified under one platform, they are fundamentally different in their internal architecture. [This article](https://blog.cloudflare.com/container-platform-preview/) provides a concise technical overview of the differences between Workers and Containers, and discusses the future direction of Cloudflare's serverless ecosystem.

## Cloudflare Workers

In the case of traditional Cloudflare Workers, the platform is built on the V8 engine's built-in feature, V8 Isolate. Within each Worker, an isolated environment is created and destroyed repeatedly based on V8 Isolate, allowing specific JS/WASM-based functions or procedures to be executed in isolation. This continuous cycle of creating and removing lightweight execution environments forms the basis of the service, which Cloudflare refers to as a "Nanoservice". This concept has been previously introduced in the following article: [Nanoservice with V8 Isolate](https://medium.com/@plaintexting/nanoservice-with-v8-isolate-c3c95370e5a9)

Since the V8 engine is fundamentally a JS/WASM engine, unfortunately, typical Cloudflare Workers only support a limited set of languages: JS, TS and WASM. Technically, other languages such as Rust, Go can be compiled to WASM—primarily for running frontend applications in browsers—so, in theory, any language that can be cross-compiled to WASM can be deployed to Cloudflare Workers. While there are related features and templates that support those languages, it's undeniable that these capabilities are limited in practice.

Moreover, it is rare to find a compelling reason to serve code compiled to WASM on Cloudflare Workers, especially when other robust services like AWS Lambda or Google Cloud Run are available. This limitation has been a notable drawback of Cloudflare Workers, and it seems likely that Cloudflare has been internally considering how to address this issue.

## Cloudflare Containers

Cloudflare Containers, first previewed in late 2024, have now entered public beta as a cutting-edge service that allows users to run container images as serverless functions. It is designed to bring the full power of the Cloudflare global network to containerized workloads, and is tightly integrated with Workers to form a unified serverless platform.

A key differentiator is Cloudflare's philosophy of global-first deployment, as described in "The Network is the Computer." Developers can deploy services globally by default, without being tied to specific regions.

It has its own powerful background features such as unique control plane architecture, detailed methods to serve GPU-based AI serverless workloads, which will be introduced one by one before long. These architectures enable Cloudflare Containers to route external traffic efficiently and manage container orchestration at a global scale.

Cloudflare Containers allow developers to define execution environments and orchestrate containers with minimal configuration, similar to how Workers are managed via Wrangler. Developers can specify ports, timeouts, and images in configuration files, and deploy globally with a single command.

While the initial concept included support for GPU-based AI model serving, this feature is not yet available in the current beta version. However, Cloudflare has indicated that both GPU support and advanced features like custom image management and Unimog-based routing are on the roadmap.

Containers are not a replacement for Workers, but rather a complement. Workers are ideal for lightweight, short-lived tasks, while Containers are suited for heavier, stateful, or long-running workloads. Both can be orchestrated together, with Workers handling routing and Containers executing compute-intensive logic.

## Insights

The public beta release of Cloudflare Containers marks a significant step forward, removing previous limitations of Cloudflare Workers and enabling a broader range of services to be delivered with low latency. However, the move away from the V8 Isolate-based Nanoservice model means that some of the ultra-lightweight, rapid-execution benefits of Workers are not directly inherited by Containers.

There is potential for Cloudflare to further optimize the platform by supporting WASM-compiled code in Containers, combining the flexibility of multiple languages with the speed and efficiency of nanoservices.

Looking ahead, Cloudflare Containers are expected to introduce GPU support, native image management, and advanced routing capabilities, positioning the platform as one of the fastest and most versatile serverless solutions available on a global network.

In future articles, I'll explore in depth how Cloudflare Containers deliver these advanced features and what it means for modern cloud-native application development.

## Ref

[[1] Containers are available in public beta for simple, global, and programmable compute](https://blog.cloudflare.com/containers-are-available-in-public-beta-for-simple-global-and-programmable/)
[[2] Our container platform is in production. It has GPUs. Here's an early look](https://blog.cloudflare.com/container-platform-preview/)