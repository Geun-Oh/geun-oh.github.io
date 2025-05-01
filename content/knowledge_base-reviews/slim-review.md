+++
title = '[Paper Review] Slim: OS Kernel Support for a Low-Overhead Container Overlay Network'
date = 2025-05-01T22:24:50+09:00
draft = false
+++

> Paper Review for https://www.usenix.org/conference/nsdi19/presentation/zhuo

# Introduction

Slim은 컨테이너 오버레이 네트워크의 문제점을 해결하고자 나온 개념으로, 기존의 패킷 기반 오버레이 네트워크 방식을 연결 기반 네트워크를 구축하는 방식으로 해결한다. 관련하여 기존의 배경과 문제점을 짚고, Slim에 대해 깊이 있게 다뤄보자.


# Container Overlay Network

기존의 컨테이너 간 네트워킹 방식에는 크게 네 가지 모드가 존재한다.

| 모드           | 애플리케이션 IP    | 호스트 네트워크 라우팅 IP |
| ------------ | ------------ | --------------- |
| Bridge Mode  | Container IP | Host IP         |
| Host Mode    | Host IP      | Host IP         |
| Macvlan Mode | Container IP | Container IP    |
| Overlay Mode | Container IP | Host IP         |

이 중 이번에 다뤄지는 오버레이 모드의 경우, 컨테이너 클러스터를 위한 가상 네트워크를 생성하게 된다. 이는 VXLAN을 기반으로 하고, 이를 통해 각 애플리케이션에 자체 네트워크 네임스페이스가 부여된다. 컨테이너 별로 가상 네트워크 인터페이스가 생성되며, 가상 스위치 (ex. OpenvSwitch)를 통해 외부와 연결된다. 

여기서 오버레이 패킷의 경우 호스트 네트워크에서 라우팅될 때 호스트 네트워크 헤더로 캡슐화가 되며, 이를 통해 컨테이너 오버레이 네트워크 자체적으로 격리된 IP 주소 공간을 생성하여 독립적인 다중 컨테이너 관리가 가능해진다. 이는 마치 4계층 위에 새로운 계층을 생성하여 독자적인 다중화를 추가적으로 진행하는 것과 같은 원리이다. Weave, Flannel, Docker Overlay 등 다양한 솔루션이 존재하며, 모두가 비슷한 아키텍쳐를 기반으로 한다.

그러나 어렵지 않게 떠올릴 수 있듯이 이러한 추가적인 캡슐화를 기반으로하는 동작은 당연하게도 높은 성능 오버헤드를 발생시킨다. 이는 컨테이너 오버레이 네트워크 방식이 모든 패킷을 캡슐화하여 호스트 네트워크 패킷으로 변환하는 고정적인 방식을 고집해오기 때문에, 각 패킷이 OS 커널 내부의 긴 파이프라인을 추가적으로 거쳐야한다는 단점을 불러일으키게 된다.

본 논문에 따르면, 동일 호스트 내 (혹은 노드 내, Intra 환경)에서는 약 23%의 처리량 감소와 약 34%의 지연 시간 증가, 외부 호스트 간 (혹은 노드 밖, Inter 환경) 에서는 약 48%의 처리량 감소 및 약 85%의 지연 시간 증가를 가져온다고 한다. 수치적으로 따졌을 때 대규모 워크로드에서는 이러한 단점이 크게 드러날 수밖에 없어 보인다.

Slim은 여기에서 핵심 문제라고 생각되는 패킷 변환 및 네트워크 스택 다중 순회에 초점을 맞추었다.

# Slim

Slim은 기존의 패킷 기반 네트워크 가상화 방식과 다르게 **연결 기반 네트워크 가상화** 를 택했는데, 애플리케이션이 데이터를 보낼 때 여러 과정들을 제거하여 데이터가 즉시 호스트 네트워크 스택을 통과하도록 만들어 기존에 필요했던 여러 절차들을 대체하고 성능 상의 이점을 가져오도록 하였다.

## 연결 기반

Slim은 기존의 패킷 기반 => 연결 기반으로 방식을 변경 적용했다고 하고 있는데, 정확히 무슨 뜻일까? 이는 다음 원문을 확인하면 알 수 있다.

>We have designed and implemented Slim, a low-overhead container overlay network that implements network virtualization by manipulating connection-level metadata.
>
>"This requires us to remove packet transformation from the overlay network’s data-plane. Instead, we implement network virtualization by manipulating connection-level metadata at connection setup time, saving CPU cycles and reducing packet latency."
>
>"Slim virtualizes the network by manipulating connection-level metadata. ... When SlimSocket detects an application is trying to set up a connection, it sends a request to SlimRouter. After SlimRouter sets up the network connection, it passes access to the connection as a file descriptor to the process inside the container. The application inside the container then uses the host namespace file descriptor to send/receive packets directly to/from the host network."
>
>"SlimRouter stores control-plane policies and enforces them at connection setup time. This approach obviates the need to inspect every packet in the connection."

여기서 말하는 것의 핵심은 결국 Slim이 패킷마다 오버레이 헤더를 붙여 변환하는 대신에, 연결을 생성하는 시점에만 관련 메타데이터를 조작하여 가상화를 구현하고, 이후에는 별도의 변환 없이 직접 호스트 네트워크를 통하도록 만드는 것임을 알 수 있다. 이를 통해 별도의 data plane에서의 수정 (패킷 수정) 없이 메타데이터를 수정함으로써 통신이 가능하도록 한다.

여기에서 '메타데이터 수정'이라고 함은, 컨테이너의 가상 IP/Port 정보와 실제 호스트의 IP/Port 정보를 매핑하여 이를 외부 분산 데이터베이스에 동기화하거나 gossip protocol을 통해 전체 slim router에게 자신의 정보를 advertising하는 것이라고 볼 수 있다.

즉, 한 번의 메타데이터 수정을 통해 전체 slim router와 연결되어 통신할 준비가 됨을 의미하는 것이다.

이를 기반으로 실제 연결을 정리하면 아래와 같다.

- 컨테이너가 소켓을 생성하거나 bind할 때, container shim layer의 SlimSocket이 이를 가로채 SlimRouter에 전달
- SlimRouter는 해당 가상 IP와 Post <=> 실 호스트 IP와 Port로 매핑 정보 생성 및 갱신
- 이 정보는 외부의 분산 데이터베이스(ex. etcd, consul) 혹은 gossip protocol을 통해 전체 advertising
- 이후 패킷을 주고받을 때 SlimRouter는 이 매핑 정보를 기반으로 패킷을 변환하여 전달

## 구성 요소

Slim의 핵심 개념을 구현하기 위해서는 다음과 같은 2가지(와 1개의 선택 옵션)의 구성요소가 필요하다.

1. Slim Socket: 호스트와 프로세스 사이에 존재하는 container runtime shim layer이다. Shim layer는 컨테이너 엔진이 (containerd, podman 등) 컨테이너 런타임을 실행하던 구조 사이에 끼어서 컨테이너 엔진이 shim을 실행하도록 하면, shim이 추가적인 기능을 포함하여 컨테이너를 실행하도록 돕는다.
   
   이러한 shim layer로써 동작하는 slim socket은 컨테이너 내부에서 POSIX 인터페이스를 노출하여 소켓 관련한 system call을 가로챈다. 실제로 애플리케이션이 POSIX API로 네트워크 연결을 시도할 때, 관련 연결을 가로채 이후 설명할 slim router로 전달한다.
2. Slim Router: 실질적인 작업을 수행하며, 컨테이너의 네트워크 연결을 호스트 네트워크 연결로 변환하는 역할을 진행한다. 이는 기존 컨테이너 오버레이 네트워크에서 컨테이너 정보를 관리하던 방식을 그대로 차용하여 외부 분산 저장소 혹은 gossip protocol을 사용하게 된다.
   
   이후 컨테이너 내부에서 생성된 패킷은 slim router가 가로채어 host IP와 slim socket binding port로 변환해주고, 이를 호스트 네트워크 스택으로 보내준다. 이 과정에서 기존의 vSwitch 등을 우회하기 때문에 관련 과정이 제거되어 성능을 향상시킨다.
   
   이후 패킷을 받는 과정도 동일하다. 패킷을 받은 호스트가 지정된 포트로 패킷을 전달하면, slim router가 이를 확인하여 관련 처리를 하고 컨테이너에 이를 전달한다.
3. Slim Kernel Moduel: 선택사항이다. Access Control Policy를 변경하거나, 보안적인 사항들을 강화할 수 있도록 기능을 제공한다. 특정 시스템 콜을 막거나, 컨테이너 내부에서의 수상한 요청이 오는 경우 이를 제거하고 관련 컨테이너를 다운시킬 수 있도록 하는 등의 기능을 담고 있다. 이후 (가능하다면) 상용화 과정에서 큰 역할을 해내지 않을까 생각이 든다.

위와 같은 역할을 해내는 여러 도구들을 통해 slim은 기존의 컨테이너 오버레이 네트워크의 단점을 보완하는 새로운 방식을 제시하고 있다.

실제로도 Slim은 호스트 모드를 사용하는 것과 거의 동일한 성능 지표를 보여주었으며, 이는 Weave와 같은 기존의 오버레이 네트워크 솔루션이 호스트 모드 대비 낮은 성능 지표를 보여주던 것과 대비된다.

특히 CPU 활용 측면에서 더욱 그 장점이 부각되었는데, 이는 Slim에서 패킷이 커널의 네트워크 스택을 한 번만 통과하기에 발생하는 인터럽트 처리 감소에서 비롯된다.

또한 Slim은 POSIX API 를 기반으로 하기 때문에, 여러 애플리케이션들에 호환되기 좋음을 시사하고 있다.

## Slim의 단점 및 한계

그러나 이러한 Slim의 방식도 단점이 존재한다. 다양한 문제가 드러나지만 내가 생각할 때 크게 작용할 문제점 및 내가 추가적으로 생각하는 문제점을 나열해보고자 한다.

1. 정책 지원: 연결 기반 네트워크라는 어떻게 보면 새로운 형태의 통신 방식을 적용했기 때문에, 기존의 패킷 기반 네트워크 정책을 지원하지 못한다. 그래서 불필요한 RACK 에 대한 처리, 특정 패킷 누락 등등의 고도화된 패킷 기반 정책을 지원하기에는 추가적인 구현이 필요할 수 있다.
2. 연결 설정 시간 증대: 연결 기반 네트워크이므로, 연결을 수행하는 데 큰 오버헤드가 든다. 기존의 가상화 비용을 줄이는 대신 연결 설정을 시도하고 있기 때문이다. 이는 여러 컨테이너가 뜨고 지는 단기 연결이 많은 애플리케이션에 불리하게 작용할 수 있다.
3. Low-Level 네트워크 도구 사용 불가: vSwitch기반 가상 네트워크 인터페이스를 통과하지 않으므로 tcpdump와 같은 네트워크 도구 사용이 불가하다. 이 또한 추가 구현을 통해 해결할 수도 있어 보인다.
4. 데이터그램 미지원: TCP만 지원한다. 근데 아마 UDP에 적용 시 연결 생성 시 시간 지연에 대한 단점을 상쇄할 수 있으면서도 비연결 지향 기법을 사용하면서 충돌이 나는 포인트가 있을 듯하다.

이외에도 컨테이너 라이브 마이그레이션 미지원 등 논문에 제기된 여러 문제점들이 있다.

---

Slim은 기존 컨테이너 오버레이 네트워크에서의 패킷 기반 네트워크 방식을 사용하지 않고, 연결 기반의 새로운 방식을 적용하면서 부가적인 오버헤드를 없애 성능 이점을 가져온 획기적인 시도로 보여진다.

아직 단순한 구현만이 소스코드로 공개되어 있고, 이외에 여러 기능들에 대한 시도 및 구현이 필요해보이므로, 이후 다양한 연구 및 활용 사례를 기대해도 좋을 것 같다.

