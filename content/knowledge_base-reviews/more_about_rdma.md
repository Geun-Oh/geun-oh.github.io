+++
title = '[System Programming] More about RDMA'
date = 2025-03-11T18:35:41+09:00
draft = false
+++

> Study of RDMA (Remote Direct Memory Access)

## Intro

RDMA is technology to transfer data efficiently in network, enables data exchanged between multiple device mem eory buffer without OS or CPU's interruptions. It contributes significantly in
RDMA는 네트워크 상에서 데이터를 효율적으로 전달하기 위한 기술로, 여러 기기 간 메모리 전송에서 OS나 CPU의 개입 없이 데이터를 교환하도록 한다. 이 기술은 고성능 컴퓨팅, 빅데이터 처리, 분산 시스템 등 여러 영역에서의 성능 향상에 크게 기여하고 있다.

RDMA는 결국 다른 호스트 간의 통신을 지원하는 기술이기 때문에 DMA와 같이 운영체제 단에서 생각하는 것 외에도 기본적으로 네트워크 관점에서 살펴볼 수 있어야 할 듯하다. 일반적인 통신을 기반으로 하여 데이터를 전송할 때에는 각 호스트의 커널을 반드시 거치고, 다양한 형태의 가공 과정 및 트래픽 분산 과정들이 포함되기 마련이다. 반면에 RDMA의 핵심은 이러한 커널 개입을 최소화한다는 것에 있는데, RDMA를 사용하면 호스트 어댑터가 네트워크에서 들어오는 패킷을 인식하고, 이를 어디로 수신할지, 그리고 메모리 공간 내 어디에 위치시킬지를 결정할 수 있다. 이로 인해  **패킷은 커널을 거치지 않고 메모리에 직접 배치된다.**

## High Performance 를 위한 장치들

### Zero-Copy

**본래 작동 방식**

Zero-Copy는 기존의 파일을 디스크에서 읽어서 소켓으로 내보내는 과정들이 포함된 일련의 과정을 최소화하는 것을 목표로 개발되었다. Zero-Copy는 특정 파일을 제공하는 과정에서 `Read 버퍼 생성 => 디스크에서 데이터 복사 => Read 버퍼에서 application 버퍼로 복사 => 소켓 버퍼로 복사 (read system call) => NIC buffer에 복사` 와 같은 일련의 복잡한 과정들을 통해 생기는 지연을 막고, 메모리 할당을 최소화하는 방식을 채택한 것이다.

**기본 Zero-Copy 동작**

이는 `transferTo()를 통해 파일 전송 요청 => Read 버퍼 생성 => 디스크에서 데이터 복사 => Read 버퍼에서 소켓 버퍼로 복사 => NIC버퍼로 복사` 과정으로, 기존의 과정에서 데이터가 애플리케이션 계층을 지나오던 것을 제거하고 최소한의 경로만을 채택한 것이다.

이러면 기존 4번의 Context Switching이 2번으로 줄게 된다. 또한 Application 버퍼는 존재하지 않아 불필요한 메모리 할당을 막았다.

**추가 개선**

이외에도 개선점이 있는데, NIC장비에서 `Gather Operation`을 지원하는 경우 복사본을 줄일 수 있다.

이는 `transferTo()를 통해 데이터 전송 요청 => Read버퍼 생성 => 디스크에서 데이터 복사 => 소켓 버퍼는 데이터를 복사하지 않고, 데이터의 위치와 길이를 함께 저장 => DMA엔진이 이를 이용해 Read buffer에 있는 데이터를 NIC에 바로 복사` 하는 과정을 거친다.

이러한 최적화는 `Gather Operation`과 무결성 검증(checksum)이 필요하다.
이는 여러 메모리 위치에서 데이터를 수집하여 한 번에 수신 호스트로 데이터를 전송해야하기 때문이라고 이해하면 좋을 듯하다. 하나의 RDMA 작업 단위 안에 여러 Scatter-Gather Element가 포함되어 있을 수 있기 때문에 NIC차원에서 데이터 전송 이전에 이를 모아주는 것이 필요하다.

현대적인 기술에서는 마지막에 소개된 방법을 이용해 오버로드가 최소화된 작업을 이어나갈 것이다.

RDMA에서도 마찬가지로 타 호스트의 데이터를 읽는 과정에서 불필요한 데이터 복제가 들어가지 않고 데이터에 대한 디스크립터를 받아온 다음 직접 메모리에 접근하여 이를 읽는 과정을 채택하고 있다고 한다. 이러한 방법은 커널 스택우회와 불필요한 파일 복사 및 메모리 할당을 막아 효율적인 작업을 가능하게 한다.

### Kernel Bypass

RNIC를 이용해서 2계층부터 트래픽을 우회한다. 이는 커널을 지나지 않고 별도로 패킷을 처리하도록 지시하는 것이다.
이로 인해 System Call, Context Switching 등의 오버헤드를 방지한다.

### CPU Offloading

당연하겠지만, 본래 CPU의 작업이었던 데이터 전송 작업이 RNIC로 오프로드 된다. 이는 CPU utilizationo을 높이고, 시스템 전체 효율을 향상시킨다.

### Hardware based Protocol process

네트워크 프로토콜 처리가 RNIC에서 수행된다. 이는 RNIC하드웨어에서 다양한 기능을 제공하기 때문인데, 덕분에 소프트웨어 프로토콜 스택보다 훨씬 빠르게 이를 전달 수 있다.

## RDMA의 메모리 접근 방식

특정 호스트는 본인 메모리를 타 호스트들의 RDMA게 허용하기 위해 다음과 같은 방식을 채택하고 있다.

1. 키 기반 인증 및 접근

키 기반 인증을 통해서 특정 키를 가지는 RDMA만 접근 가능하도록 제한한다. 여기서 생성되는 키는 아래와 같이 두 종류이다.

- L_KEY(Local Key): 본인 메모리에 접근할 때 사용
- R_KEY(Remote Key): 타 호스트에서 접근할 때 사용

이 경우, 접근 권한을 설정해서 등록된 메모리 영역(아마 페이지 단위)에 대한 접근 제어를 수행할 수 있다.
또한, 실제 연결 시 올바른 핸드셰이크 과정을 통해 인증된 호스트 간 통신만 가능하도록 한다.

### 데이터 접근 과정

1. RDMA 요청 생성: Source host 의 애플리케이션이 RDMA R/W 요청을 생성한다. 이 요청에는 목적지 가상 주소 및 R_KEY가 포함된다.
2. NIC처리: Source host의 NIC는 요청을 처리하여 네트워크를 통해 Destination NIC로 전송한다. 여기서 각 NIC는 RDMA를 위한 RNIC가 설치되어 있어야한다. 이는 트래픽을 미리 우회하여 커널 스택을 지나지 않도록 보장한다.
3. 키 검증: Destination NIC는 R_KEY를 검증하여 메모리 접근 권한을 확인한다. 만일 유효하지 않은 key라면 에러를 발생시킨다.
4. 검증이 성공하면 Destination NIC는 요청된 메모리 영역에 직접 접근하여 데이터 IO를 수행한다.

---

~Ref~

https://www.fibermall.com/ko/blog/what-is-rdma.htm
https://cuterwrite.top/en/p/rdma-mr/
https://docs.redhat.com/ko/documentation/red_hat_enterprise_linux/7/html/networking_guide/part-infiniband_and_rdma_networking
