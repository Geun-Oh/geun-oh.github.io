+++
title = '[System Programming] More about RVMA'
date = 2025-03-12T19:26:28+09:00
draft = false
+++

> [Google Scholar](https://ieeexplore.ieee.org/abstract/document/9460494?casa_token=a_ziniKAeSIAAAAA:l_6XJraLUD_6TeVKaO9q033hZAg8xfOr6DPLeE79GoXYAVDUkfdlJzcK8onDKvu4xEfnXGo)
>
> RVMA is a new approach for data access which is useful in distributed systems. It overcomes remain restrictions in RDMA and behaves properly in distributed & large scale systems.
> This article summarize and organize key concepts of it.

## Remain Restrictions of RDMA

RDMA is a technology that enables memory access between multiple nodes, and maximizes its benefits when used in large scale computing architectures that distinguish between data nodes and worker nodes in distributed networks.
However, there are issues with RDMA as well, including the following.

### Incomplete ordering guarantees

RDMA operations are given ordering rules based on their operation types. Although write operation ordering is fully guaranteed, others are not.
Based on transaction ordering rules of InfiniBand, many unexpected situations can occur (such as reads being executed before previously entered writes) because it does not guarantee complete ordering.

Of course there are various programs that controls ordering of operations in RDMA, but it still remains as fundamental problems.

### Security

RDMA exposes detailed information of low-level memory buffers when connected, which can be a security concern outside of local networks.

## RVMA

RVMA is a improved connection method based on RDMA, which focuses on usability, resource management, and fault tolerance.
And these core concepts are introduced.

### Receiver-Side Resource Management

In RVMA, sender-side resource management capabilities are reduced by transferring them to the receiver-side.
This allows data to be transferred through virtual addresses (mailbox addresses) without requiring the sender to know sensitive information such as low-level memory addresses.

### Lightweight Completion Notification Mechanism

Where traditional RDMA is used, it polls the completion queue to confirm task completion. RDMA must continuously monitor this queue to check whether the task is done.
Unlike RDMA, RVMA reduces receiver's polling pressure by providing lightweight notifications that alert the receiver when tasks are completed, which helps maintain high performance.

RVMA also provides abstraction of virtual addresses with resource which sender manages and notifies task completion with completion pointer. RNIC records memory buffer's head when the buffer is full, and the receiver can detect the completion by monitoring the memory buffer.

> BTW, it is inevitable to poll something?
> : That's right. But RVMA reduces overhead and provides fast response times by using more effeicient machanism (Monitor/MWait).

### Adaptive Routing Network Support

RVMA also guarantees ordering in adaptive routing network by utilizing some techniques. Which means that the packets can be reordered in right way even if it arrives in reverse order without any data corruption.
There's a examples of techniques like virtual addresses or offsets which are used for providing adaptive routing network.

### Virtual Address

Based on Mailbox. So it means that it is considered like IPC after all...I think.

In RVMA, NIC keep transfer table which converts virtual addresses into real physical memory addresses that receiver hosts uses. It enables to connect RVMA mailbox address with multiple buffers.

The process of conversion is the following.

1. When RVMA operation is received, address conversion occures (in RNIC). It maps virtual address with physical address.
2. Data is prepared to be written to memory.
3. Preparing memory address for completion notification, and the counter which is connected with virtual address increase.
4. After if buffer is fully used, the head of data buffer is written to pointer address for completion notification.

This has the following advantages.

1. No remote address exchange required: Doesn't need hand-shaking for detection of remote address (which was done in RDMA).
2. Abstraction: converts low-level information and simplifies programming interface.
3. Enables efficient resource management by allowing receivers to manage their own resources independently.
4. Free from byte ordering by supporting adaptive routing network.

---

It's actually not as accessible as I might thought. Since it was hard to find proper documentation of it, i mostly relied on paper. There's a lot more to it, but I'll have to write more about it later.

I'd like to implement this in the future, even in a simplified form perhaps on a per-component basis (virtual address, lightweight completion notification).
