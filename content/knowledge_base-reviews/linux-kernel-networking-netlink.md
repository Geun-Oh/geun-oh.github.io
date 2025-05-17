+++
title = 'Linux Kernel Networking Netlink'
date = 2025-05-09T13:21:13+09:00
draft = true
+++

# Netlink

Netlink(netlink socket interface)는 리눅스 커널과 사용자 간 양방향 통신을 가능하도록 하는 소켓의 일종으로, 현재 iproute2를 비롯해 다양한 시스템 도구들의 네트워크 관련 작업을 수행하는 기반이 되는 도구이다. 기본적으로 인터페이스의 형태를 띄기 때문에, 사용자 공간에서 인터페이스를 통해 제공되는 메서드들을 자유로이 사용하여 네트워크 관련 작업들을 수행하도록 한다. 이는 POSIX 표준을 따르는 라이브러리 기준으로 AF_NETLINK 라는 주소 계열에 해당하며, 이후 인자들을 기반으로 작업을 수행하게 된다(PF_와 AF_는 일전에 다양성을 고려하여 나눠졌으나, 현재 거의 동일하게 간주되기 때문에 별도 설명 없이 AF_를 예시로 설명한다).

이전에도 이와 유사한 역할을 하는 ioctl이라는 도구가 있었으며, ioctl을 기반으로 많은 도구들이 구현되었다. 그러나 ioctl은 동기적인 동작만을 수행하기에 비동기적으로 사용자 공간에 메세지를 전송하는 등의 기능이 없어 불편함을 가져왔고, 이러한 ioctl에 대한 개선점을 가지고 나온 것이 netlink라고 볼 수 있다.

## Netlink Pros

- 폴링 불필요: netlink socket을 사용해 작업하는 경우 별도로 polling을 하며 응용 프로그램 구동에 필요한 자원을 낭비하지 않아도 된다. 응용은 단순히 recvmsg()를 호출하고, 커널로부터 메세지가 돌아오지 않는다면 단순히 block 상태를 취하면 된다. 이는 기존 ioctl의 모든 작업이 시스템 콜을 기반으로 수행되며, 호출 시점에서만 커널과 사용자 공간의 동기적인 통신이 발생하기 때문에, 사용자 공간에서 직접 주기적으로 데이터를 요청해야하는 것과 대비된다.
- 커널의 비동기 메세지 전송: 기존에 ioctl을 사용해 명령을 호출하거나 /proc 내 특정 버퍼에 메세지를 적는 등의 작업을 해야했던 반면, netlink를 사용하면 커널이 직접 비동기 메세지를 사용자 공간으로 전송할 수 있다. 이는 앞선 폴링 제거와 더불어 사용자 공간에서의 CPU 사용률 상승에 큰 영향을 준다.
- 멀티캐스트 전송: netlink는 여러 사용자 프로세스가 하나의 멀티캐스트 그룹에 가입하여 관련 메세지를 구독하도록 하는 멀티캐스트를 지원하기 때문에, 커널의 여러 데이터를 다중 프로세스가 쉽게 접근할 수 있도록 하고 있다.

## Netlink Family

Netlink는 기존의 socket 구현을 확장하여 만들어진 socket-based IPC 도구 혹은 매커니즘으로, 내부적으로 여러 netlink protocol을 기반으로 동작을 구분한다. 이러한 netlink protocol들의 집합을 netlink family라고 부른다. 이는 NETLINK_ROUTE, NETLINK_NETFILTER, NETLINK_AUDIT, NETLINK_KOBJECT_UEVENT 등 여러 목적에 따라 구분하여 사용하도록 하며, socket 생성 시 세 번째 인자로 이를 전달한다.


## Netlink Implementation

Netlink에 대한 구현은 기본적으로 net/netlink 디렉터리에 존재하고, 아래 파일들에서 찾아볼 수 있다.

- af_netlink.c
- af_netlink.h
- genetlink.c
- diag.c

이는 대표적인 것으로, 이외에 여러 헤더파일이 추가적으로 존재한다. 구현에 대한 세부적인 설명은,,,본 글에서는 생략한다.

## Netlink for User - User IPC

Netlink도 사용자 - 사용자 간 프로세스 통신에 사용될 수 있다. 그러나 이는 자주 사용되는 사항은 아니며, 일반적으로는 UNIX domain socket API가 사용된다.

## User Space Package: net-tools vs iproute2

TCP/IP네트워킹을 제어하고 네트워크 장치를 처리하는 사용자 공간 도구는 크게 net-tools와 iproute2가 대표적이다. iproute2 는 netlink를 기반으로 하여 사용자 공간에서 커널로 요청을 보내고 응답을 받는다. 이외에 L2/L3조작을 위한 tun/tap 장치 사용을 위해서는 ioctl을 예외적으로 사용한다.

iproute2에는 다음과 같은 명령어가 포함되는데, 아마 리눅스에 익숙하다면 자주 본 것들이 많을 것이다.

- ip: 네트워크 테이블 및 네트워크 인터페이스 관리
- tc: 트래픽 제어 관리
- ss: 소켓 통계 덤프
- lnstat: bridge 주소 및 장치 관리

반면 net-tools는 ioctl을 기반으로 만들어졌으며, 아래와 같은 명령어를 가진다. 마찬가지로 자주 본 것들이 많다.

- ifconfig
- arp
- route
- netstat
- hostname
- rarp

ioctl을 기반으로하는 net-tools보다는 netlink를 기반으로하는 iproute2가 조금 더 발전된 방식을 가지기 때문에, iproute2의 일부 고급 기능들의 경우 net-tools에서는 사용이 불가하다.

## Generic Netlink

Netlink protocol의 단점 중 하나는 Netlink family 수가 32개로 제한된다는 것이었는데, 이는 socket()의 세 번째 인자로 전달되는 netlink family가 socket()의 세 번째 인자 최댓값에 의존한다는 점에서 기인했다.

generic netlink는 netlink multiplexer의 역할을 하며, 하나의 netlink family를 적용하고 하위에서 여러 netlink family를 인자로 전달받도록 하는 형태를 띈다. 이러한 구조는 동적인 netlink family 추가 및 삭제 등을 가능하게 하여 확장성을 매우 높였다.

사용자 공간의 애플리케이션은 커널로 명령을 보내기 위해서 generic netlink 의 family id를 알아야한다. Family 이름은 사용자 공간에서도 알 수 있지만, family id의 경우 런타임에 커널에서 결정되기 때문에 사용자 공간에서 알지 못한다. 따라서 사용자 공간에서는 CTRL_CMD_GETFAMILY 요청을 통해서 family id를 받아와야한다.

## Socket Monitoring Interface

sock_diag netlink 소켓은 소켓에 대한 정보를 얻는 데 사용될 수 있는 넷링크 기반 서브시스템을 제공한다. 이는 사용자 공간에서 리눅스에 대한 체크포인트/복원 기능을 지원하기 위해 커널에 추가되었다.