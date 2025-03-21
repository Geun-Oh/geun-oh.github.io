+++
title = 'Local and Private Network IPs'
date = 2024-11-23T22:37:12+09:00
draft = false
+++

In general, developers often use non-public IP like 192.168.1.111, 127.0.0.1...etc.
What's the difference between them? And why there are various ranges for Private usage IPs?

## Loopback IP

At first, Let's talk about Loopback IP.

Loopback IP, which helps individual host to interconnect between processes using port number, is defined in [RFC3330](https://datatracker.ietf.org/doc/html/rfc3330). Be specific, it includes range of 127.0.0.0/8 and we use 127.0.0.1 (as known as localhost) in common. That means we can use other CIDR blocks like 127.0.0.2 to use as loopback!

RFC says that IPs in the range of loopback CIDR should not be revealed in public. And the IP datagrams from this address goes back to it's host and be multiplexed by the port number. So we can use it as method of IPC.

Also, IPv6's loopback IP is defined in [RFC4291](https://datatracker.ietf.org/doc/html/rfc4291). It is represented as ::1 or 0:0:0:0:0:0:0:1 (we can abbreviate continous 0 block with ::).

The loopback IP address is not connected or defined logically to be exhibited in public. When the kernel boots, internetworking stack defines it as loopback and use it locally in permanent.

Let's take a loock at them one by one.

### 10.0.0.0/8 (Class A)

- The biggest range of private IP
- Commonly used in NAT (to define multiple large networks)
- Mainly adopted in company's network, data center, and cloud environments

### 172.16.0.0/12 (Class B)

- For middle size networks
- Cloud service providers such as AWS uses it as default VPC address range
- Because of it's ambiguous position, does not used as much as the ohter ranges

### 192.168.0.0/16 (Class C)

- Commonly used in small size networks and household networks
- Most of household routers use 192.168.0.0/24 or 192.168.1.0/24 as default
- Fit for small offices or branch networks

### Private Network IP

There are various ranges of private network IPs such as 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
Ranges and detail configurations are defined in [RFC1918](https://datatracker.ietf.org/doc/html/rfc1918).

### Why such a large range for 127.x.x.x when we only need one IP for Loopback?

In reality, having just one IP address like 127.0.0.1 for loopback would be sufficient.
So why was such a large range of 127.0.0.0/8 (Class A) allocated?

1. Historical Reasons

When IPv4 addressing was first designed, IP address spaces were divided into several classes.
At that time, addresses were allocated as Classes A through C based on network size and purpose.
It was common practice then to allocate large address ranges.

2. Scalability and Flexibility

Using the entire 127.x.x.x range for loopback allows multiple IPs to be used for various testing and internal communications.

- For example, when multiple network interfaces or services are running on a single system, different loopback IPs can be used to distinguish between them.
- In development environments, different IPs can be used to test various network scenarios.

3. Subnetting and Network Separation

- The 127.x.x.x range can be divided into subnets for different uses. For example, 127.0.0.1 can be used for basic testing, while 127.0.10.x can be used for specific service or application testing.
- This helps in setting up more diverse and complex testing scenarios.

4. Compatibility and Standardization

- In early Internet design, it was common to allocate wide address ranges to account for future expandability. Although most cases today only use 127.0.0.1,
  the wide range allocation ensures that various future requirements can be met.
