+++
title = '[Internet Protocol]Internet Protocol Basics'
date = 2025-04-06T23:32:58+09:00
draft = true
+++


# 인터넷, 프로토콜 그리고 계층화 원칙

*인터넷은 냉전 시대의 산물이다..*

기본적인 네트워크 관련 내용들..

# 데이터링크 계층과 인터페이스

*데이터링크 계층을 인터넷 프로토콜에서 어떻게 다루는가?*

## 데이터링크 계층의 기능

IP 바로 및 계층

> IP를 위해 개발된 것은 아님.
> 본래 전화 등의 이동통신 기술이 2계층에 자리하고 있었으며, 추후 IP로의 통합이 이루어짐.


데이터 계층 본연의 역할

- Framing
- Error control
- Flow control
- 매체 

#### Framing

데이터 묶음의 단위로, 데이터 이외에 다양한 정보를 포함한다.

#### Error Control

보내다가 잘못 보내는 경우 / 재전송과 확인 과정이 포함된다.

#### Flow Control

송 / 수신량이 차이나는 경우 지연을 제어해야한다.

#### Medium Access Control (MAC)

한 시간 프레임에 하나의 개체에만 접근하도록 하는 것.


### IP가 2계층에 요구하는 것

#### 캡슐화

프레임의 페이로드 부분에 IP 데이터그램이 실려있음을 표시

- 전송 시: IP 로부터 전달받은 페이로드를 감싸는 헤더에 IP에 해당하는 번호 기록
- 수신 시: 번호를 보고 IP가 실려있음을 알아 페이로드를 3계층에 올바르게 전달.


#### 주소 결정 프로토콜 (ARP)

공유형 링크 (Shared medium)에 필요함
- 점대점 링크에는 불필요함
- IP -> MAC 변환에 필요함.

#### 관리 정보 베이스 (MIB)

무엇을 읽고, 무엇을 쓸 수 있는지에 대한 명세이다.

인터넷 원격 관리 표준
인터넷 뿐 아니라 인터넷에 연결된 그 어떤 것도 관리 가능하도록 한다.


## 인터페이스

컴퓨터를 인터넷에 연결시키는 모든 HW를 커널에서 대표하는 자료구조
- 네트워크 HW기술에 대해서 IP가 알아야하는 정보
	- MTU
- 디바이스 드라이버 등

결국 디바이스를 연결하는 하나의 레이어라고 생각하면 좋을 듯.

> Interface: 하드웨어를 대표해 표현하는 자료구조
> But 적어도 인터넷 프로토콜 안에서는 하드웨어가 아니다

고속 기술일수록 MTU가 크고, 현대 기술에서는 이더넷이 1500정도로 가장 작은 편이다.
인터넷 중심부의 기술일 수록 고속 기술이다.

IP는 모든 인터넷 연결 기술을 인터페이스로 추상화한다.
- 5G, Ethernet, Wi-Fi...

와이파이는 shared medium 기반 기술이기 때문에 ARP가 필요하지만, 스마트폰의 LTE는 점대점이기 때문에 이것이 필요하지 않음.

WiFi도 격자 구조로 각 대역폭을 분리 및 격리해서 서빙할 수 있지만, 그렇게 기술이 고도화되면 비싸지기 때문에 싸고 효율적인 기술을 쓴다.

모든 인터페이스가 하드웨어와 1:1 상응하지 않는다.
Local Loopback 
- 같은 인터페이스 내에 IPC를 목적으로 하는 논리 인터페이스
- HW로 인한 제한점이 없음

MTU에 의해 제한되는 경우는 거의 이더넷이 대부분이기 때문에, 일반적으로는 이것에 초점을 맞춘다.
MTU는 큰 단위의 링크일 수록 더욱 커진다. 그만큼 많은 패킷을 이동시켜야하기 때문에
- 데이터가 MTU보다 크면 분할하여 여러 데이터그램으로 만들어서 전송한다.


# ARP (Address Resolution Protocol)

> Shared Medium 형태의 2계층 기술을 사용하고 싶다면 무조건 필요하다.

공유형 매체 (Shared Medium)에 연결되어있는 인터페이스 중에 어느 것에 수신해야하는가??
를 식별하기 위한 MAC(Medium Access Control) 주소

> IP는 다음 홉의 IP주소는 알고 있어도 MAC주소는 모른다!


## ARP의 작동 개요

ARP는 공유형 링크에 있는 모든 호스트의 커널 단에 구현되어 있다.
Ex) 스마트폰이 와이파이에 연결되어있을 때 사용한다. 따라서 스마트폰 커널 단에 무조건 구현되어있어야한다.

**작동 조건** : 다음 홉으로 가는 IP데이터그램이 도착할 때
- 또한, 다음 홉 IP 주소에 대응하는 MAC주소를 모를 때만 도착한다.
- 한 IP데이터그램에 대해 최대 1회만 동작한다 (Demand 요청).
	- 재전송 없고, 동기적으로 동작 (ARP응답이 올 때까지 IP데이터그램은 큐에서 대기한다)
	- 같은 목적지에 대한 pending request가 있다면 보내지 않음.

1. Next hop 가야하는 패킷 도착
2. IP Datagram Header에는 최종 Dest IP만 존재함.
3. 라우터에서 라우팅 테이블과 대조해서 이를 위한 다음 IP를 결정함 => ARP에 request
4. MAC주소 응답을 받으면 해당 MAC주소를 2계층 헤더에 함께 포함시킴

### ARP 캐시

- arp -a
- 임시 저장소로, 수명은 1200초이다.
	- 최근 구현에서는 hit할 때마다 1200초의 ttl을 refresh한다.
	- IPv4기준으로는 그렇고, IPv6에서는 neighbor cache

> 용량 걱정은 하지 않아도 된다.
> 
> 실제 arp cache 테이블에는 인터넷 주소 : 물리적 주소 : 유형 이 적혀 있는데
> 동적인 것들은 직접 추가, 삭제도 가능하고, 매번 변경도 가능함. 수명에 따라 동작하는 캐시.
> 
> 그러나 정적인 것들은 처음 부팅 시에 OS단에서 추가해둔 것으로, 멀티캐스트나 브로드캐스트 주소에 대한 정보가 담겨 있다. 정적인 애들은 실제로는 ARP영역이 아니다. 단순히 계층을 통과하기 위한 수단으로 생각하면된다.

![[Screenshot 2025-04-13 at 2.11.05 AM.png]]

위 사진은 이더넷 프레임의 일반적인 개요이다.

Destination Address: 다음 홉 MAC 주소
Source Address: 현재 보내는 곳의 MAC 주소
Type: 3계층의 타입 (IPv4는 0x0800)
Data: 2계층 ARP패킷 형식
FCS(Frame Check Sequence)


## ARP 패킷 형식

앞서 언급한 이더넷 프레임에 대한 개요에서 Data부분에 포함되는 내용이다.

![[Screenshot 2025-04-13 at 2.48.16 AM.png]]

Hardware Type: 데이터링크 계층의 기술 (Ethernet: 0x0001)
Protocol Type: 네트워크 계층의 기술 (IPv4: 0x0800)
Hardware address size: 거의 6 (MAC주소, 00000110) 
Protocol address size:  거의 4 (IPv4, 00000100)
OP: 요청인지 응답인지에 대한 flag
Sender HW adress: n BYTE만큼 (보통 MAC)
Sender protocol: m BYTE만큼 (보통 IPv4)
Target HW: Target mac
Target protocol: IPv4


# Internetworking Protocol (IP)

없으면 인터넷이 안 돌아간다.
3계층의 통합 프로토콜

## IP 의 특징 

- 비연결 프로토콜
	- 관리가 없다: 순서, 전송 보장, 흐름 제어 등

- Best Effort: 최선은 다하지만 보장은 안 함.

- Packet: 데이터그램 (data + telegram)

IP Datagram하나하나가 독립적으로 취급된다.


## IP 헤더


![[Screenshot 2025-04-14 at 3.04.31 AM.png]]


20-60 바이트 내의 가변적인 값

Version: 4
IHL(Header length): 전체 헤더 길이 (4byte단위이다)
Type of Service: 안 쓴다.
Total length: 어차피 2계층 프로토콜 MTU에 종속된다. 대부분 1500Byte 이하가 될 수밖에 없음.
Identification: 큰 단위의 IP데이터그램이 잘려 보내지는 경우, 동일한 데이터임을 나타내기 위한 인식표. 다른 데이터그램인 경우 1씩 증가한다.
Flags
	Reserved
	Don't fragment(DF): 자르지 마라.
	More fragment(NF): 다음 fragment가 존재한다는 의미.

> Don't fragment 필드는 PMTU(path MTU discovery)를 판별하는 데에 주로 사용되는데, 기본적으로 송신 측에서 DF=1로 송신한 경우, 수신 측에서 이후의 경로의 MTU가 패킷보다 짧은 경우 ICMP "Fragmentation Needed"(Type3, Code4)를 송신 측에 반환하고 본 패킷을 폐기하기 때문이다.

Fragment Offset: 분할 이전 IP 페이로드에서의 위치이다. 첫 바이트를 기준으로 현재 fragment의 위치 / 8에 대한 값을 표기한다.
=> 계산 방법을 이후 확실히 알아두기.


TTL : Loop 방지용. 본래 시간 단위이지만, 실제로는 거친 라우터 수 만큼 감소한다.
Protocol: 상위 계층으로 올릴 때의 IP페이로드를 받아줄 트랜스포트 계층의 프로토콜 번호
ex) TCP=6, UDP=17, ICMP=1...

헤더 체크섬: 1의 보수법을 이용해서 전체 패킷을 더했을 때 0이 되도록 계산한 값
요즘은 NIC에서 자동으로 계산 해줄 수 있음.

이후 옵션: 거의 사용되지 않음. 해킹을 우려해 라우터가 대부분 불허한다. Router Alert옵션 정도 사용.