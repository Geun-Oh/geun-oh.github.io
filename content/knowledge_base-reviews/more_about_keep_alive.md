+++
title = '[Networks] More About Keep Alive'
date = 2025-03-18T18:51:35+09:00
draft = false
+++

> Compare the two Keep-Alive techniques of TCP and HTTP.

# TCP Keep Alive

TCP Keep-Alive is a mechanism that works on the transport layer (L4), which checks if the remaining TCP socket is still in use. If not, it disconnects and frees idle resources.

## Purpose

These are the main purposes of TCP Keep-Alive.

- Detect dead connections: Detect if the other host has shut down abnormally or is disconnected due to network issues. Terminate unresponsive connections after a period of time to avoid wasting resources.
- Free Resources: Clear all the remaining resources suspended by dead connections and manage system resources efficiently.

It is mainly used for cleaning system resources periodically.
And which resources are wasted when a dead TCP connection is alive?

## Wasted Resources when a dead TCP connection is alive

1. Memory: An idle TCP connection occupies system memory. Each connection is allocated memory to store information of the TCP socket struct. So the memory with a dead TCP socket struct cannot be released and it can increase overall system memory utilization.
2. Usage of file descriptor: Each TCP connection uses a file descriptor. Since the socket struct is also managed as a file (even if it is not a regular file), it requires a proper file descriptor. As with memory, it can be wasted when it does not become free.
3. CPU & Network resources: Although a TCP connection does not use CPU utilization that much, it clearly uses it without any specific purpose.

# HTTP Keep Alive

HTTP Keep Alive operates on the application layer (L7), which enables multiple HTTP requests to be processed in one TCP connection.

It keeps the client-server connection continuous by providing the `Keep-Alive` Header within the request, and this behavior works by default from HTTP/1.1.

Since HTTP Keep Alive is managed by the application, we can modify and control its behavior with ease.

```text
HTTP/1.1 200 OK
Connection: Keep-Alive
Keep-Alive: timeout=5, max=100
```

Timeout is the maximum amount of time to keep the connection alive. And max means the maximum number of requests that can be maintained.

## Purpose

These are the main purposes of HTTP Keep-Alive.

- Reduce the cost of making a new TCP connection: Skip the 3-way handshake and improve performance.
- Reduce transport delay: Remove the whole delay derived from making connections.
- Improve web page loading speed: Load resources faster.

===

In general, the two Keep-Alive techniques are used together by default. This enables many more tasks to be done efficiently by reducing and cleaning wasted resources.

We must know how to manage the two configurations and need to determine proper techniques in each system architecture.
