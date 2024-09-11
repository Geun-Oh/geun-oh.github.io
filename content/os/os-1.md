+++
title = 'OS 1'
date = 2024-09-11T11:03:09+09:00
draft = false
+++

### Go goroutine, JAVA virtual thread, Node.js worker_thread

#### 공통점

1. 경량 스레드

- 이들 모두 경량 스레드 또는 작업 단위로서 동작한다. 즉, 전통적인 운영체제의 스레드보다 훨씬 적은 비용으로 생성되고 스케쥴링될 수 있다.
- 실제 운영체제 스레드보다 메모리 사용량이 적고, 컨텍스트 스위칭 비용이 적다.

2. 동시성 지원

- 모두 동시성 프로그래밍을 지원하며, 여러 작업을 비동기적으로 실행하여 프로그램의 응답성을 높인다.
- 복잡한 병렬 처리나 비동기 작업을 더 쉽게 관리할 수 있도록 한다.

3. 비동기적 실행

- 병렬 작업을 스케쥴링하고 비동기적으로 실행할 수 있다. 작업 완료를 기다리지 않고 다른 작업을 수행할 수 있도록 설계되었다.
- 특히 I/O 작업에서 효율성을 극대화할 수 있다.

4. 운영체제 스레드와의 매핑

- 운영체제 스레드를 직접적으로 사용하지 않거나, 많은 수의 작업 단위를 적은 수의 운영체제 스레드에 매핑하여 사용한다. 이를 통해 적은 자원으로 많은 병렬 작업 처리가 가능하다.


#### 차이점

|특징|Go goroutine|JAVA virtual thread|Node.js worker thread|
|--|--|--|--|
|경량성|매우 경량(수백만 개 생성 가능)|경량(기존 스레드보다 적은 자원)|상대적으로 무겁고, 운영체제 스레드 직접 사용(기존 Node.js 런타임 이벤트 루프에서 벗어남)
|스케쥴링 모델|M스레드(Go 런타임 스케쥴러)|1:1스레드 (JVM관리)|운영체제 스레드(단일 스레드 모델 보완)|
|동시성 처리|고수준 동시성(채널 사용)|일반 스레드 모델과 유사|메세지 패싱|
|비동기 지원|동기/비동기 모두 지원|비동기 및 블로킹 작업 모두 효율적 처리|주로 비동기 처리, 블로킹 시 성능 저하 가능|
|통신 방식|채널을 통한 통신|일반 스레드 API|메세지 패싱(직렬화 필요)|

### 요약

- Go 의 goroutine은 매우 경량화된 동시성 모델로, 수많은 동시성 처리에 최적화되어 있다.
- JAVA 의 virtual thread는 전통적인 스레드의 사용성을 유지하면서 경량화된 가상 스레드를 통해 동시성을 처리하며, 블로킹 작업에 대한 최적화 제공.
- Node.js 의 worker thread는 실제 운영체제 스레드를 사용하여 CPU 집약적인 작업을 처리하고, Node.js의 단일 스레드 모델을 보완함.