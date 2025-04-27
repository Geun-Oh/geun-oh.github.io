+++
title = '[Computer Networks] SDN Basic'
date = 2025-03-24T19:53:42+09:00
draft = false
+++

> Software Defined Network (SDN) is a new paradigm of network architecture that allows streamlined traffic control by detaching controlling part from each switch and merge it into one control tower which is called as controller.
> This article deeply introduces a whole basic information of SDN and also offers cutting-edge technologies of it, too.

# Traditional Network Architecture

In previous times, many organizations that have their own network(it can be virtual/physical, public/private network,,,and everything) are struggling with packet controls. Their word wide network switches and routers needed to trasmit numerous packets to each destination router(also can be switch, but use it as representative of internetworking layer) and it's operation cost for calculating and transmitting next hop to bypass the delay in real-time network topology was a big deal for them. Also it was a huge challenge for network engineers to managing consistency of routing rule around the whole network. They must access each AP one by one and change its setting in manual.

Of course there are much more reasons of SDN's beginning, but now we know the biggest part of early network engineer's pain and why new architecture is required.

There are unignorable limitations in traditional network.

### Limitation of topology

Current network system is a tree-structured topology for traditional server-client connection. It changed from 1:1 or 1:n static structure to any-to-any dynamic structure with more various connection methods.

### Complexity of existing networks

With exponential increase of network resources like protocols and topologies, existing network became massive with tangled legacies. It came back to haunt engineers to consider much stuffs like VLAN, ACL, QoS...and everything were required to maintain modern software architectures than before.

### Exponential increasement of human effort

To expand thousands of network, engineer needed to config each hardware's software and manage it untiringly. And if there are breaking change of fundamental technologies, whole network machines should be recofigured and it eventually derives downtime of whole systems. It has caused a significant amount of side effects, which can be represented as addition of security rule, QoS maintainance...etc.

# Birth of SDN

Altough the concept was first introduced by Sun microsystems when they announced JAVA, but detailed concept was introduced in 2004 with the name as Routing Control Platform(RCP). It's early implementation was called RCP, more explicit word I think, which was a control tower of iBGP in single AS. Check the details in [[1]](#1-design-and-implementation-of-a-routing-control-platform).

Since the introduction of OpenFlow (core protocol of SDN, but does not equal to it), the concept of RCP was eveolved and redefined as SDN based on OpenFlow. [[2]](#2-revisiting-ip-routing-control-platforms-with-openflow-based-software-defined-networks) shows how RCP eveolved to SDN based on OpenFlow,

> _This work discusses how previous IP routing solutions, like RCPs, are reshaped in light of SDN’s clean separation of functions.([[3](#3-sdn은-왜-등장하였고-무엇인가--1-역사와-등장배경)])_

OpenFlow enabled concentration of network control from each network switch(or any type of network machines) to open-source based, local managed control software. It evolved early concept of RCP, provided powerful programmable centralized framework for network management.

# SDN

Broadly speaking, SDN is seperated in 3 componenets which called as 'Stacks'. And it's idea of detaching control-side and forwarding-side is referred to as 'Disaggregation' or 'Decoupling' since each components can be deployed in different ways rather than deployed as on integratd system[[5]](#5-understanding-the-sdn-architecture--sdn-control-plane--sdn-data-plane). Each component has independent and exclusive roles for trasmitting network packets with the most effecient way in real-time network circumstances. Components are called with 'Application Plane', 'Controller Plane', 'Data Plane'.

![Software Defined Networking](https://opennetworking.org/wp-content/uploads/2017/06/sdn-architecture-img.jpg)
*Open Netwroking Foundation*

## Application Plane

Application

Interface that interacts with user. Let user to manufacture whole packet processing rules(which will be called as flow control), or provides monitoring service to observe whole network traffics and help to build new flow control rules. Can be represented with various tools.

## Control Plane

Actually, control plane is a grounded basic term in computer networks. Also introduced deeply in Computer Networks: Top-down approach, which is a general coursework textbook in many universities. It divides inter-networking layer (3rd layer) into control plane and data plane because it is more complicated than we thought (or just i thought...). 

## Data Plane

According to given rules, it actually sends packets. Each packet switches have their own 'match plus action' table that has been calculated and distributed by control plane. Traditional routings to find optimal path with OSPF or somethings are done by control plane, and control plane distributes it with table entries that has only next hop informations of target router. Further detailed approaches can be found in OpenFlow 1.0 (which is the most simple version to explain its concept).


# Furthermore

Under enormous growing demand of center based control system of routing, more developed features are figured out until these days, and it is definitely a hot tea. And more of computer network IT Companies which make network router are applying the concepts of SDN to serve their customers to structure SDN with ease and fully managed architecture. Honestly, it means that this technology is already mature so their are only few of things to be developed groundbreakingly. Nevertheless, we should always be on the lookout to keep up with the latest trends in this concept.

In the next articles, I'll take more detailed terms and concepts that modern SDN architecture has which refers to OpenFlow, MiceTrap, OpenSample, RCP...etc.

===

### References

#### [[1] Design and Implementation of a Routing Control Platform](http://www.cs.columbia.edu/~lierranli/coms6998-8SDNFall2013/papers/RCP-NSDI2005.pdf)
#### [[2] Revisiting IP Routing Control Platforms with OpenFlow-based Software-Defined Networks](https://www.dca.fee.unicamp.br/~chesteve/pubs/WPEIF12%20-%20Revisiting%20IP%20Routing%20Control%20Platforms%20with%20OpenFlow%20based%20SDN%20-%20120501.pdf)
#### [[3] SDN은 왜 등장하였고 무엇인가? – 1. 역사와 등장배경](https://ryusstory.tistory.com/entry/SDN은-왜-등장하였고-무엇인가-–-1-역사와-등장배경)
#### [[4] Software-Defined Networks: A Systems Approach](https://sdn.systemsapproach.org/intro.html)
#### [[5] Understanding the SDN Architecture – SDN Control Plane & SDN Data Plane](https://www.sdxcentral.com/networking/sdn/definitions/what-the-definition-of-software-defined-networking-sdn/inside-sdn-architecture/)