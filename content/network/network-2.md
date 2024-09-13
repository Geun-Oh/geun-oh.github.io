+++
title = 'Network 2'
date = 2024-09-12T00:29:41+09:00
draft = false
+++

### 2계층 동작

2계층은 통상적으로 스위치라고 불리며, 전기 신호 - 디지털 데이터 간의 전환 작업을 수행하는 랜카드(NIC)가 존재하는 계층이다.
랜카드는 무선(Wi-Fi, IEEE 802.3), 유선(Ethernet, IEEE 802.11) 으로 나뉘는데, 각각에 맞는 프로토콜에 기반하여 전기적 신호를 디지털 데이터로 변환한다.
이 과정에서, 디지털 데이터로 변환하고 이를 상위 계층에 전달하는 역할을 하는 것이 운영체제 내 드라이버이며, 각 네트워크 장치 드라이버가 랜카드를 조작하여 데이터 변환을 진행한다.

그러나 이와 별개로 2계층 장치인 라우터의 경우 별도의 상위 계층을 위한 작업을 수행하지 않고, 변환된 디지털 데이터를 기반으로 목적지 MAC주소를 파악한 뒤 해당 주소에 맞게 전송하는 기능을 주로 수행한다. 이는 로컬 네트워크(LAN) 상에서 이루어지며, 만일 로컬 네트워크를 벗어나는 요청이 들어오는 경우 3계층 스위치에서 IP를 기반으로 추가적인 전송 작업을 수행한다.

스위치의 경우 별도의 MAC 주소를 가지지 않고, 다중 랜포트를 통해 로컬 네트워크 내에서 네트워크 인터페이스를 확장하는 기능을 주요하게 진행한다. 타 호스트 혹은 타 네트워크와의 통신을 위해서는 상위 계층에서의 도움이 필요하다.

스위치에는 각각 자신의 랜포트에 연결되어있는 컴퓨터의 MAC주소를 저장할 수 있는 데이터베이스가 존재하여, 연결된 컴퓨터의 주소를 학습하고 기억한다. 이를 통해 스위치로 전송되는 데이터를 제어하고 올바른 수신지로 데이터를 전달하게 된다.