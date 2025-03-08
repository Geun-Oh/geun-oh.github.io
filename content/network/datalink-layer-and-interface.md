+++
title = 'Datalink Layer and Interface'
date = 2025-03-08T17:15:11+09:00
draft = true
+++

Datalink Layer, a second layer of Network layer stack, is a middle layer that connects physical world and logical world.

Before 1990, when internet was not generalized to the masses, datalink layer and it's technology like ethernet was used for mobile telecommunication stuff. Each ethernet interface has its own address called as MAC address. To identify individual physical machines, there are NIC that grants unique MAC address to the host. But the thing we should know is that datalink is not invented for IP layer.

By watching the internet protocol suite, we know that IP is the only one protocol that connects upper layer protocols and lower layer protocols together. Which means that it's standard and all technologies should match it's specification to be incorporated into internet services. 

So datalink layer has it's own duties, and it uses ARP to connect with IP Layer.

## Datalink's own Role

### Framing

Frame means a unit of data bundle. It also has various informations of data.

### Error Control

Because wireless communication is vulnerable to errors, strong retransmission and confirm processes are inevitable. Datalink layer should think about how to detect error and restore data.

### Flow Control

Since there are huge amount of data transfers in the whole world, there must be a bottle neck phenomenon frequently.
So datalink layer should calculate the delay and control it.

### Medium Access Control (MAC, only in shared link)

Identify each devices with MAC address in local area network.

## What IP Layer requests to Datalink Layer

### Encapsulation

By encapsulating data with informations, it allows other switches to identify and forward it to the next hop.
This header is called as frame, which contains destination address, source address, and type of IP. And it defers with other ethernet technologies like WiFi, 4G,,,etc. And there is a checksum for checking data integrity in it's trailer.

By noticing the type of IP in datalink frame header(e.g. IPv4, IPv6), destination node can be aware of which datagram is behind of it.

### ARP

Required in shared medium. Doesn't need in point-to-point.

> Then, why we don't point-to-point in everywhere? Doesn't it reduces delay of query time to ARP?
>
> Because it's base technology (maybe WiFi for shared medium and LTE for the opposite.) is designed with specific purpose and it can be used with cheaper cost and designed with efficient architectures. That's why we use shared medium even if it needs additional procedures to identify individual hosts.

## Management Information base

It's an standard of internet remote management. We can access and manage all the stuffs that are connected to internet(e.g. CCTV..).
