+++
title = 'OpenFlow'
date = 2025-04-27T20:12:01+09:00
draft = true
+++

# OpenFlow

To control the whole packet flows in Software-Defined Network (SDN), there must be a pre-defined communication protocol to transmit data between control plane and data plane. And that's the motivation of the OpenFlow's appearance which I will introduce today.

At first, It is not a term that was introduced with SDN together. This was revealed first time in 2006 in Stanford University's research as a concept of network security & centralized policy management system. After then this concept had been evolved into OpenFlow. This research introduced centralized controller and flow-based network control that are the most important concepts in SDN and OpenFlow nowadays. Afterwards in 2009, the first version of OpenFlow 1.0 was introduced.

Point is that the OpenFlow was not developed with keeping in mind that this concept will be used in SDN. Since the concept of 'Centralized flow control system' was fully fit in SDN, it became to have a major responsibility in SDN.


# Detailed Concepts

OpenFlow is not only protocol but also a suite of multiple components that works organically together. It can be divided into 3 core components.

## Controller

Software that configures network devices and optimized flow paths by using OpenFlow protocol. It determines differentiated packet processing rules and forwarding rules and delivers it to each switch box. By using controller, developer can add, delete, or update flow entry in a flow table.

## OpenFlow Protocol

Main open standard interface that is used to communicate between controller and its switches.

## OpenFlow Switch

An additional version of L2 switch which was added a new OpenFlow protocol firmware. Or it can be made by software methods in logical way. It operates packet forwarding based on its flow table which controller announced, metric aggregation, tunnel encapsulation and decapsulation...etc. It consists of a flow table, pipline(packet processing channel), group table, security channel(SSL).