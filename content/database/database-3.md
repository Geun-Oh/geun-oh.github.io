+++
title = 'Database 3'
date = 2024-09-05T18:29:23+09:00
draft = false
+++

> MySQL의 사례를 기반으로 설명하는 경우가 있음.

### 논리적 격리와 물리적 격리

**1. 물리적 격리**

물리적 격리는 데이터베이스의 데이터 파일을 별도의 물리적 디스크나 저장 장치에 분리하여 저장하는 방법이다.
MySQL에서는 다음과 같은 방식으로 물리적 격리를 구현하고 있다고 한다(물론 다른 옵션이 많을 듯).

- 데이터 파일과 로그 파일 분리: MySQL데이터베이스는 데이터파일다 로그 파일을 사용한다. 성능 최적화를 위헤 데이터 파일과 로그 파일을 서로 다른 물리적 디스크에 저장하는 것이 일반적이다. 이를 통해 디스크 I/O를 분산시켜 성능을 향상시킬 수 있다.
- 파일시스템 마운트 포인트: MySQL의 데이터 디렉토리를 별도의 디스크에 마운트된 파일 시스템에 설정하여 데이터 파일과 로그 파일을 저장 가능하다. => 이게 왜 물리? 각기 다른 디스크를 의미하는 걸지도...!
- RAID구성: 성능 및 데이터 보호를 위해 RAID구성을 사용하는 것도 물리적 격리의 한 형태이다. [RAID](https://devocean.sk.com/blog/techBoardDetail.do?ID=163608)를 통해 데이터가 여러 디스크에 걸쳐 저장되므로 장애 발생 시 데이터 손실을 최소화하고 성능을 최적화할 수 있다.

**2. 논리적 격리**

논리적 격리는 데이터베이스 내에서 데이터를 논리적으로 분리하는 방법을 말한다. MySQL에서는 다음과 같은 논리적 격리 방법을 제공한다.

- 스키마 별 분리: 여러 스키마를 생성하여 관리한다. 각 스키마는 자체적 테이블과 데이터를 가지며, 서로의 데이터에 직접 접근할 수 없다. 이를 통해 한 인스턴스에서 여러 애플리케이션의 데이터를 논리적으로 격리할 수 있다.
- 테이블 스페이스: InnoDB 스토리지 엔진은 테이블 스페이스를 사용하여 테이블과 인덱스의 물리적 저장소를 제어한다. 기본적으로 모든 테이블은 `ibdata1` 이라는 공용 테이블 스페이스에 저장되지만, 개별 테이블에 대해 독립적인 테이블 스페이스 파일을 사용할 수 있다.
- 파티셔닝: 큰 테이블을 논리적으로 작은 단위로 나눈다. 각 파티션은 물리적으로 다른 디스크에 저장될 수 있으며, 이를 통해 성능을 최적화하고 데이터 관리의 효율성을 높일 수 있다.

**3. 네트워크 및 접근 격리**

네트워크 및 접근 격리를 통해 보안 강화를 지원한다.

- 사용자 권한 관리: MySQL은 사용자 계정을 기반으로 데이터베이스 접근을 제어한다. 각 사용자에게 특정 데이터베이스, 테이블 또는 열에 대한 CRUD 작업 권한을 부여할 수 있다.
- 네트워크 접근 제어: MySQL은 특정 IP주소 또는 호스트에 대해서만 데이터베이스에 접근할 수 있도록 설정 가능하다. 이를 통해 데이터베이스 서버에 대한 네트워크 접근을 격리하고 보안을 강화한다.

**4. 가상화 및 컨테이너 격리**

- 컨테이너화: 데이터베이스 인스턴스를 Docker와 같은 컨테이너 기술을 사용하여 격리할 수 있다. 이를 통해 각각의 인스턴스가 독립적으로 동작하며, 다른 인스턴스에 영향을 주지 않도록 할 수 있다.
- 가상 머신: 데이터베이스 인스턴스를 별도의 가상 머신에 운영해 물리적 하드웨어 자원과 독립적으로 실행되도록 한다. 이를 통해 여러 데이터베이스 인스턴스를 논리적 및 물리적으로 격리하여 운영 가능하다.

**5. 스토리지 엔진 선택**

MySQL은 여러 스토리지 엔진을 지원하며, 각 엔진은 데이터 저장 방식이 다르다. 특정 스토리지 엔진을 선택하여 데이터를 저장하는 방법도 논리적 격리의 한 방법이 된다.

- InnoDB: 기본 스토리지 엔진으로, 트랜잭션 지원 및 외래 키 제약 조건을 제공하며, ACID 특성을 보장한다.
- MyISAM: 트랜잭션을 지원하지 않지만, 빠른 읽기 성능을 제공한다. MyISAM 엔진을 사용하여 특정 유형의 데이터에 대해 성능을 최적화할 수 있다.