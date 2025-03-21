+++
title = '[Database] Database Basics'
date = 2024-08-30T16:53:28+09:00
draft = false
+++

> 데이터베이스 수강하기 전에 공부해두기
>
> 알고 있는 사항
>
> 1. SQLD자격증을 취득한 정도의 SQL 문법 이해도
> 2. 트랜잭션, ACID, 트랜잭션 격리 수준 등
>
> 공부할 사항
>
> 1. 데이터베이스 엔진을 만들기 위해서 필요한 것들
> 2. 데이터베이스 엔진 구축하기
>
> MySQL의 사례를 기반으로 설명하는 경우가 있음
>
> 이후 간단하게 Rust기반 RDBMS를 만들면서 관련 사항들을 되짚는다

### 메모리와 디스크 간의 데이터 관리

데이터베이스 시스템은 일반적으로 메모리 (RAM)과 디스크 (HDD/SSD)를 함께 사용하여 데이터 관리. - 메모리: 고속 액세스가 필요한 임시 데이터를 저장함. 예를 들어, 자주 액세스되는 데이터 페이지를 메모리에 캐싱하여 데이터베이스의 응답을 높이는 등의 처리 가능. - 디스크: 영구 데이터 저장에 사용. 디스크에 저장된 데이터는 시스템이 재시작되어도 유지.

### 데이터 저장 구조

데이터베이스는 데이터를 디스크에 효율적으로 저장하기 위해 특별한 구조 사용. 이를 주로 **페이지**와 **블록**의 단위로 나눈다.

    - 페이지: 한 페이지 당 4KB~16KB 정도 되는 고정 크기의 블록을 의미함. 페이지는 데이터의 기본 단위로 사용되며, 메모리와 디스크 간의 데이터 전송 또한 페이지 단위로 이루어진다.
    - 블록: 디스크에서 데이터를 저장하는 물리적 단위. 데이터베이스는 디스크 블록과 데이터베이스 페이지를 매핑해 데이터 관리.

### 데이터의 논리적 저장 구조

관계형 데이터베이스에서는 데이터를 **테이블**의 형태로 저장함. 테이블은 **행**과 **열**로 구성됨.

### 데이터 저장 방식

데이터베이스에서 데이터를 저장하는 방식은 데이터베이스 엔진 설계에 따라 달라짐. 일반적으로 두 개의 방식을 사용.

1. 행 기반 저장(Row-oriented Storage)
   - 모든 열의 데이터를 각 행에 연속적으로 저장한다.
   - 모든 열을 포함한 개별 행에 대한 액세스가 빠르다. 특정 행의 모든 데이터를 한 번에 가져와야하는 경우 유용하다.
   - 전통적인 관계형 데이터베이스 시스템의 경우 행 기반이다(MySQL, PostgreSQL 등).

예시

```plaintext
| ID | Name   | Age |
|----|--------|-----|
| 1  | Alice  | 30  |
| 2  | Bob    | 25  |
| 3  | Charlie| 35  |
```

위 경우, 데이터는 디스크에 다음과 같이 저장된다.
`[1, Alice, 30], [2, Bob, 25], [3, Charlie, 35]`

2. 열 기반 저장(Column-oriented Storage)
   - 동일한 열의 모든 데이터를 연속적으로 저장한다.
   - 특정 열의 데이터를 빠르게 접근할 수 있어 분석 작업이나 집계 쿼리 등에서 효율적이다.
   - 분석용 데이터베이스 시스템은 열 기반 저장 방식을 사용한다(Cassandra, Parquet 등).

위와 동일한 예시에서, 데이터는 디스크에 다음과 같이 저장된다.
`[1, 2, 3], [Alice, Bob, Charlie], [30, 25, 35]`

### 메모리 할당 및 데이터 저장

데이터베이스가 데이터를 특정 경로의 메모리 공간에 할당하고 데이터를 저장하는 과정은 다음과 같다.

1. **디스크 페이지 할당**: 데이터베이스는 데이터를 저장할 공간을 디스크에 페이지 단위로 할당한다. 이때 페이지는 특정 크기의 메모리 블록을 나타낸다.

2. **메모리 버퍼 관리**: 데이터베이스는 메모리 내에서 데이터를 관리하기 위해 버퍼 풀을 사용한다. 버퍼 풀은 자주 사용되는 데이터 페이지를 메모리에 캐싱하여 디스크 접근을 최소화한다.

3. **데이터 쓰기 및 읽기**:

- 쓰기: 세로운 데이터를 삽입하거나 기존 데이터를 업데이트할 때, 데이터는 메모리에 먼저 기록된 후(Buffer Flush) 주기적으로 디스크에 기록된다.

- 읽기: 데이터베이스는 필요한 데이터 페이지를 버퍼 풀에서 찾고, 없다면 디스크에서 페이지를 읽어온다. 이 페이지의 경우 메모리에 캐싱되어 이후 접근 속도를 높인다.

4. **파일 포맷 및 인덱스**: 데이터베이스는 데이터를 저장할 때 효율적인 검색을 위해 인덱스를 함께 관리한다. 인덱스는 데이터의 특정 열을 기준으로 정렬된 정보로, 데이터를 빠르게 검색하는 데 사용한다.

---

이외에도, 데이터베이스는 여러 저장 방식을 지원한다.

1. 하이브리드 저장방식

하이브리드 저장방식은 행 기반과 열 기반 저장 방식을 합친 접근방식이다. 데이터의 일부는 행 기반으로, 다른 일부는 열 기반으로 저장하여 각 방식의 장점을 취했다.

SAP HANA, MemSQL 등이 그 예시.

장점

- 트랜잭션 처리(OLTP)와 분석 처리(OLAP)를 한 시스템에서 최적화가 가능하다.
- 데이터 접근 패턴에 따라 유연하게 저장방식 선택이 가능하다.

2. LSM-트리(Log-Structured Merge-Tree) 저장방식

주로 쓰기 성능 최적화에 중점을 둔다. 새로운 데이터를 메모리에 쓰고, 일정 조건이 충족되면 데이터를 디스크로 병합하여 저장한다.

Cassandra, RocksDB, LevelDB등이 그 예시.

장점

- 쓰기 작업이 빠르고, 쓰기 부하가 높은 애플리케이션에 적합하다.
- 데이터의 삭제 및 업데이트가 빈번하지 않은 워크로드에 유리하다.
- 효율적인 디스크 공간 활용이 가능함.

이외에도 객체 저장(Object Storage), 문서 저장(Document Storage), 그래프 저장(Graph Storage) 등이 존재한다. 나머지는 각자.

===

### 데이터베이스 시스템 제작에 필요한 것들

데이터베이스 시스템을 제작하기 위해서는 다음과 같은 사항들이 필요하다.

#### 1. 기본 아키텍쳐 설계

- 스토리지 엔진: 데이터 저장 및 검색을 위한 엔진 설계. 여러 인덱싱 기술과 자료구조를 사용하여 구현함.
- 데이터 파일 관리: 데이터를 저장하기 위한 파일 포맷과 파일 시스템 상에서의 효율적인 관리 방법을 설계해야 함.
- 버퍼 관리: 데이터 파일과 메모리 간의 데이터를 효율적으로 교환하기 위한 버퍼 풀 관리가 필요함.

#### 2. SQL 파서 및 실행기

- SQL파서: SQL을 파싱하여 필요한 정보를 추출한다. 이후 이를 쿼리 실행기에 전달하여 기능을 수행한다.
- 쿼리 최적화기: 효율적인 실행 계획 생성을 위해 쿼리를 최적화하는 알고리즘을 설계한다.
- 쿼리 실행기: 최적화된 실행 계획에 따라 실제로 데이터를 조회하거나 변경하는 모듈.

#### 3. 트랜잭션 관리

- ACID 속성 구현: 트랜잭션의 가장 기본적인 원칙을 보장하는 메커니즘 설계 필요.
- Lock 구현: 임계 영역 내 데이터의 무결성 보장을 위해 다중 접근을 통재하는 매커니즘 구현 필요.
- 저널링 및 로깅: 트랜잭션 기록을 통한 데이터 복구 메커니즘을 위한 로그 시스템 설계 필요.

#### 4. 보안 및 사용자 관리

- 인증: 사용자 인증을 위한 메커니즘 설계(Oauth or Kerberos).
- 권한 부여: 사용자의 데이터베이스 객체에 대한 접근 권한 관리를 위한 권한 부여시스템 설계.

#### 5. 네트워크 프로토콜 및 통신

- Client-Server 통신 프로토콜: 클라이언트와 서버 간 데이터베이스 쿼리와 결과를 주고받기 위한 프로토콜 설계.
- 연결 관리: 다수의 클라이언트가 접속 가능하도록 연결 풀링 및 연결 관리 시스템 설계.

#### 6. 복제 및 백업

- 데이터 복제: 고가용성을 위한 데이터베이스 복제 메커니즘 구현.
- 백업 및 복구: 데이터 손실 시 복구할 수 있는 백업 전략과 복구 절차 설계.

#### 7. 운영 및 모니터링 도구

- 모니터링: 데이터베이스의 성능과 상태 모니터링을 위한 도구 개발
- 로깅 및 감사: 데이터베이스의 활동 전체를 기록하여 보안을 강화하고 문제를 해결할 수 있는 시스템 설계.

#### 8. 성능 최적화

- 인덱싱: 데이터 검색 속도 향상을 위한 다양한 인덱스 구조 설계.
- 캐싱: 자주 사용하는 데이터를 빠르게 액세스하기 위한 캐싱 메커니즘 설계.
- 파티셔닝: 대규모 데이터베이스의 성능을 높이기 위해 데이터를 파티셔닝하는 전략 설계.

#### 9. 테스트 및 검증

- 단위 테스트: 각 기능이 올바르게 작동하는지 확인하기 위한 단위 테스트 작성.
- 성능 테스트: 시스템이 다양한 부하 조건에서 안정적으로 동작하는지 확인하기 위한 성능 테스트 수행.
- 안정성 테스트: 장기간 운영 시 시스템 안정성 보장하기 위함.

---

온전한 데이터베이스 시스템 설계를 위해서는 위와 같은 다양한 사항들이 맞물려 설계되어야한다.

===

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

===

### /mnt/data와 /mnt/log 가 다른 디스크에 마운트됨을 확인하기

단순히 경로를 표시하는 것만으로는 확실하게 물리적 격리가 이루어지고 있는지 확인할 수 없다.
각 마운트 지점이 물리적으로 서로 다른 디스크에 매핑되어 있는지 확인하려면, 다음과 같은 명령어를 사용한다.

#### 1. `df`

`df` 는 파일 시스템의 디스크 사용량을 확인하는 데 사용되며, 각 마운트 포인트가 어떤 디스크에 연결되어 있는지 확인 가능하다.

```bash
df -h /mnt/data /mnt/log
```

해당 명령어 실행 시 아래와 같이 `/mnt/data`와 `/mnt/log` 가 각각 어떤 디스크와 디바이스에 마운트되어 있는지 확인할 수 있다.

```bash
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   20G   80G  20% /mnt/data
/dev/sdb1       200G   50G  150G  25% /mnt/log
```

위 결과에서 `/mnt/data` 는 `/dev/sda1`에, `/mnt/log` 는 `/dev/sdb1`에 마운트되어 있음을 확인할 수 있었다.
이렇게 다른 디스크에 마운트되어 있는 경우 물리적으로 다른 디스크에 저장된다는 것이 확인 가능하다.

#### 2. `lsblk`

`lsblk`는 블록 디바이스의 계층 구조를 보여주며, 마운트 지점과 디바이스 간의 매핑을 확인하는 데 유용하다.

```bash
lsblk
```

위 명령어를 실행하면 모든 블록 디바이스 및 그에 연결된 마운트 지점의 목록을 볼 수 있다. 아래 그 실행 예시이다.

```bash
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda      8:0    0   100G  0 disk
└─sda1   8:1    0   100G  0 part /mnt/data
sdb      8:16   0   200G  0 disk
└─sdb1   8:17   0   200G  0 part /mnt/log
```

여기서 `sda`와 `sdb`는 각각 다른 물리적 디스크를 나타내며, `/mnt/data` 와 `/mnt/log` 가 각각 다른 디스크에 마운트되어 있는 것을 확인할 수 있다.

#### 3. `mount`

`mount` 를 사용하면 현재 시스템에서 마운트된 모든 파일 시스템 확인이 가능하다.

```bash
mount | grep -E "/mnt/data|/mnt/log"
```

이 명령은 `/mnt/data` 와 `/mnt/log` 가 어떤 디바이스에 마운트되어 있는지 보여준다. 아래는 그 실행 예시.

```bash
/dev/sda1 on /mnt/data type ext4 (rw,relatime)
/dev/sdb1 on /mnt/log type ext4 (rw,relatime)
```

이 출력에서 `/mnt/data`는 `/dev/sda1`에, `/mnt/log`는 `/dev/sdb1`에 마운트되어 있음을 확인할 수 있다.

#### 4. `/etc/fstab` 확인

시스템 재부팅 시 자동으로 마운트되는 파일 시스템을 정의하는 `/etc/fstab` 파일을 확인하는 것도 좋다.
다음 명령어를 사용한다.

```bash
cat /etc/fstab
```

`/etc/fstab` 파일 내용 중 `/mnt/data`와 `/mnt/log`가 서로 다른 디스크 디바이스에 설정되어 있는지 확인 가능하다.

```bash
/dev/sda1   /mnt/data  ext4  defaults  0  2
/dev/sdb1   /mnt/log   ext4  defaults  0  2
```

여기서도 `/mnt/data`와 `/mnt/log`가 서로 다른 디스크에 설정되어 있는 것을 확인 가능하다.

---

이러한 방법들을 통해 `/mnt/data`와 `/mnt/log`가 물리적으로 격리되어 있는지 여부를 확인할 수 있다.

===

### Transparent data encryption

TDE는 MS, IBM, Oracle 에서 데이터베이스 파일 암호화를 위해 적용하는 암호화 기술이다.

> Oracle이 쓰므로 MySQL도 동일하게 TDE를 사용한다.

TDE는 파일 레벨로 암호화를 진행하기 때문에, 일반적으로 테이블 단위의 암호화를 수행한다.

TDE는 휴지 상태의 데이터 보호 문제를 해결하며, 하드 드라이브와 궁극적으로는 백업 미디어에서 데이터베이스를 암호화한다.

조금은 크고 무거운 단위의 파일들을 암호화하는 것에 집중되는 듯 하다.

### Application level data encryption

데이터베이스에 데이터를 저장하기 전에 애플리케이션에서 암호화를 수행하여 저장하는 방법이다. 이 방법은 데이터베이스는 데이터를 받아 적재하는 역할만 수행하고, 애플리케이션이 암호화 및 복호화 작업을 수행하는 방식이다.

### 나는?

내가 구현할 때에는 데이터를 .csv 형태로 적재하고 있기 때문에,
단순하게 파일 전체 데이터를 암호화하는 TDE를 이용해서 매 파일에 대한 IO가 발생할 때마다 암/복호화를 진행하고자 한다.

===

### 데이터베이스 시스템 구현

세부 구현을 시작한다.

먼저, 마운트된 공간에 데이터를 적재하고, 해당 데이터를 조회하는 기본적인 기능을 수행하도록 Table 구조체를 작성한다.

예시 코드를 작성할 때에는 마운트 포인트를 `pwd + /data` 로 임의 설정했다.
내부에 테이블 종류에 따라 폴더를 추가 구성하고, 해당 폴더 내부에 `.schema` 파일을 생성하여 schema 구조를 정의하고, `.csv` 확장자로 데이터를 적재했다.
데이터 저장 형태는 여러 형태가 권장되고 있었는데, 별도의 예시를 찾기 어려워 테이블 구조를 저장하고 관리하기 좋은 csv 형태를 선택했다.

아래는 구현된 Table 구조체 코드이다.

```rust
// table.rs
use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::error::Error;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TableSchema {
	columns: Vec<String>,
}

pub struct Table {
	rows: Vec<Vec<String>>,
	index: BTreeMap<String, usize>,
	schema: TableSchema,
	path: PathBuf,
}


impl Table {
	pub fn new(table_name: &str, schema: Vec<String>) -> Result<Table, Box<dyn Error>> {
		let table_dir = format!("./data/{}", table_name);
		let schema_file = format!("{}/{}.schema", table_dir, table_name);
		let csv_file = format!("{}/{}.csv", table_dir, table_name);
		let path = PathBuf::from(table_dir);

		if !Path::new(&path).exists() {
			fs::create_dir_all(&path)?;
		}

		let schema = if Path::new(&schema_file).exists() {
			Table::load_schema(&schema_file)?
		} else {
			TableSchema { columns: schema }
		};

		let rows = if Path::new(&csv_file).exists() {
			Table::load_csv(&csv_file)?
		} else {
			Vec::new()
		};

		Ok(Table {
			rows,
			index: BTreeMap::new(),
			schema,
			path: PathBuf::from(path),
		})
	}

	pub fn load_schema(schema_path: &str) -> Result<TableSchema, Box<dyn Error>> {
		let file = File::open(schema_path)?;
		let reader = BufReader::new(file);
		let schema: TableSchema = serde_json::from_reader(reader)?;
		Ok(schema)
	}

	pub fn load_csv(csv_path: &str) -> Result <Vec<Vec<String>>, Box<dyn Error>> {
		let file = File::open(csv_path)?;
		let reader = BufReader::new(file);
		let mut rows = Vec::new();

		for line in reader.lines() {
			let line = line?;
			let row: Vec<String> = line.split(',').map(|s| s.to_string()).collect();
			rows.push(row);
		}

		Ok(rows)
	}

	pub fn save_schema(&self) -> Result<(), Box<dyn Error>> {
		let schema_file = format!("{}/{}.schema", self.path.display(), "table");
		println!("Saving Schema to: {}", schema_file);
		let file = File::create(schema_file)?;
		let writer = BufWriter::new(file);
		serde_json::to_writer(writer, &self.schema)?;
		Ok(())
	}

	pub fn save_csv(&self) -> Result<(), Box<dyn Error>> {
		let csv_file = format!("{}/{}.csv", self.path.display(), "table");
		println!("Saving CSV to: {}", csv_file);
		let file = File::create(csv_file)?;
		let mut writer = BufWriter::new(file);

		for row in &self.rows {
			writeln!(writer, "{}", row.join(","))?;
		}

		writer.flush()?;
		Ok(())
	}

	pub fn insert(&mut self, row: Vec<String>) -> Result<(), Box<dyn Error>> {
		let key = row[0].clone(); // use first row as a key
		self.index.insert(key.clone(), self.rows.len());
		self.rows.push(row);

		self.save_csv();
		Ok(())
	}

	pub fn select(&self, key: &String) -> Option<&Vec<String>> {
		self.index.get(key).map(|&i| &self.rows[i])
	}
}

```

큰 설명이 필요한 코드가 존재하지는 않고, 단순히 파일 경로와 파일 이름을 확인하여 I/O 를 수행하는 테이블이다.

### Transparent Database Encryption

.csv 파일 단위로 암호화를 실행한다. 이후 해당 파일을 읽어들일 때 복호화를 진행한다.

```rust
// encryption.rs
use aes::cipher::{BlockDecrypt, KeyInit};
use aes::Aes256;
use aes::cipher::{BlockEncrypt, generic_array::GenericArray};
use rand::Rng;
use base64::{engine, Engine};
use std::error::Error;
use std::fs::{File};
use std::io::{Read, Write};

const KEY_SIZE: usize = 32;

pub fn generate_key() -> [u8; KEY_SIZE] {
    let mut key = [0u8; KEY_SIZE];
    rand::thread_rng().fill(&mut key[..]);
    key
}

fn encrypt_data(key: &[u8], data: &[u8]) -> Result<String, Box<dyn Error>> {
    let cipher = Aes256::new(&GenericArray::from_slice(key));
    let mut buffer = data.to_vec();
    let padding = 16 - (buffer.len() % 16);
    buffer.extend(vec![padding as u8; padding]);

    for chunk in buffer.chunks_mut(16) {
        cipher.encrypt_block(&mut GenericArray::from_mut_slice(chunk));
    }

    Ok(engine::general_purpose::STANDARD.encode(&buffer))
}

fn decrypt_data(key: &[u8], encode_data: &str) -> Result<Vec<u8>, Box<dyn Error>> {
    let cipher = Aes256::new(&GenericArray::from_slice(key));
    let data = engine::general_purpose::STANDARD.decode(encode_data)?;

    let mut buffer = data;
    for chunk in buffer.chunks_mut(16) {
        cipher.decrypt_block(&mut GenericArray::from_mut_slice(chunk));
    }

    let padding = buffer.last().unwrap_or(&0) & 0xFF;
    let end = buffer.len() - padding as usize;

    Ok(buffer[..end].to_vec())
}

pub fn encrypt_file(file_path: &str, key: &[u8]) -> Result<(), Box<dyn Error>> {
    let mut file = File::open(file_path)?;
    let mut data = Vec::new();
    file.read_to_end(&mut data)?;

    let encrypted_data = encrypt_data(key, &data)?;
    let mut file = File::create(file_path)?;
    file.write_all(encrypted_data.as_bytes())?;
    Ok(())
}

pub fn decrypt_file(file_path: &str, key: &[u8]) -> Result<(), Box<dyn Error>> {
    let mut file = File::open(file_path)?;
    let mut encoded_data = String::new();
    file.read_to_string(&mut encoded_data)?;

    let decrypted_data = decrypt_data(key, &encoded_data)?;
    let mut file = File::create(file_path)?;
    file.write_all(&decrypted_data)?;
    Ok(())
}
```

위의 구현된 내용처럼 AES 기반 암호화를 진행한다.

실제 기본 파일은 다음과 같은 형태인데,

```csv
1,Alice,25
2,Bob,30
```

다음과 같이 암호화된 형태로 적재된다.

```csv
VBodlpqBIeCPbBgBbTVGBckgTmw+Vbq6amR7l8heUS4=
```

이후 다시 조회하는 경우 decryption을 진행하여 데이터를 불러온다.

===

## SQL Optimization

Before executing SQL, subdivide optimization process is as follows.

1. Parsing SQL

SQL Parser parses SQL when parser gets it from user. To summmarize SQL parsing process, it is as belows.

- Generate parsing tree: generate parsing tree from whole SQL code by analyzing it into individual components.
- Checking syntax: Checks if it has inaccurate syntax error. Like using unavailable or missing keywords, written with wrong sequence...etc.
- Checking semantic: Check if it has inaccurate semantic error. If it used table or column that does not exist. Or has right permissions to use the target object.

2. Optimize SQL

The next step is SQL optimization, and the Optimizer takes the role. SQL Optimizer selects one efficient way from various execution path that generated with precollected statistic information of systems and objects. It's the most important core engine that determines database performance.

3. Generate Row-Sources

The step that SQL Optimizer forms new executable code or procedure with selected execution path. Row-Source Generator takes that role.

## Execution Plan

It's a visible tree structure that user can check optimizer generated procedure. In other words, a preview of procedure.
With preview, user notices whether SQL scans tables or indexes, and if it scans indexes, user can see what indexes they are. Also can change execution path if it operates with unintended way.

===

## Analyze sql.pest file

`.pest` file format is for files that are used for parser generator names **Pest**. It usually used in rust ecosystem, appropriate for define various language syntaxes and operates syntax analysis.

And so, Let's break down my `sql.pest` file.

## General Overview

sql.pest

```pest
/////// LIMITATIONS OF CURRENT GRAMMAR
// quote strings only allow certain characters
// column_names, etc. are defined as only allowing alpha

//////// PUNCTUATIONS
// curly braces
open_brace = { "{" }
close_brace = { "}" }
open_paren = { "(" }
close_paren = { ")" }
comma = { "," }
star = { "*" }
quote = { "\"" }  // a single quote

//////// SPECIAL
WHITESPACE = _{ " " }

///////// DATATYPE
int = { "INT" }
text = { "TEXT" }

///////// VALUE
int_val = @{ ("+" | "-")? ~ ASCII_DIGIT+ }
// legal characters allowed in string
// text parsing will require more thought
char = ${ ASCII_ALPHANUMERIC | "+" | "-" | "." }
quoted_text_val = { quote ~ char* ~ quote }
literal_text_val = @{ char+ }
value = { (int_val | quoted_text_val | literal_text_val) }

///////// SQL KEYWORDS/IDENTIFIERS
// keywords will be case insensitive
// case insensitivity is specified through '^'
create_kw = { ^"CREATE" }
table_kw = { ^"TABLE" }
select_kw = { ^"SELECT" }
from_kw = {  ^"FROM" }
insert_kw = { ^"INSERT" }
into_kw = { ^"INTO" }
values_kw = { ^"VALUES" }

table_name = { (ASCII_ALPHA)+ }

///////// CREATE TABLE DEFINITION
column_name = ${ (ASCII_ALPHA)+ }

column_type = @{ ( int | text ) }
column_def = { column_name ~ column_type }

table_fields = { (column_def ~ comma)* ~ (column_def)? }

create_table_stmnt = { create_kw ~ table_kw ~ table_name ~
                       (open_brace ~ table_fields ~ close_brace) }

////////// SELECT STATEMENT

select_stmnt = { select_kw ~ star ~ from_kw ~ table_name }

////////// INSERT STATMENT

column_names = { (column_name ~ comma)* ~ (column_name)? }
values = { (value ~ comma)* ~ (value)? }

insert_stmnt = { insert_kw ~ into_kw ~ table_name ~ ( open_paren ~ column_names ~ close_paren ) ~
                 values_kw ~ ( open_paren ~ values ~ close_paren ) }

insert_grammar = { SOI ~ insert_kw ~ into_kw ~ table_name ~ ( open_paren ~ column_names ~ close_paren ) ~
                  values_kw ~ ( open_paren ~  values ~ close_paren ) ~ EOI }

////////// UNIFIED GRAMMAR

sql_grammar = {SOI ~ (create_table_stmnt | select_stmnt | insert_stmnt ) ~ EOI }
```

The file defines a grammar for parsing a subset of SQL that focuses on basic commands like `CRAETE`, `TABLE`, `SELECT`, and `INSERT`.
This grammar allows only specified characters, for example, limits strings wrapped with double quote, or enforces `column_names` to allow alphabet characters only.

## Take the grammar into rust code

Install `pest` and `pest_derive`

Cargo.toml

```toml
pest = "2.1"
pest_derive = "2.1"
```

Import crate and derive it into `SQLParser` struct.

```rust
use pest::Parser;

#[derive(Parser)]
#[grammar = "sql.pest"] // .pest defines grammar of SQL
struct SQLParser;
```

Then we can use our grammar that defined in `sql.pest` in our code like below.

```rust
...
let pairs = SQLParser::parse(Rule::sql_grammar, query)
            .expect("Failed to parse SQL")
            .next()
            .unwrap();
...
```

We can also get the `Rule` from `Parser`. As we can see, `sql_grammar` syntax in `sql.pest` is written in UNIFIED GRAMMAR section. It's for defining top-level rule, set to locate only `create_table_stmnt`, `select_stmnt`, or `insert_stmnt` between `SOI`(start of input) and `EOI`(end of input). So we can notice that this grammar syntax can be composed with one of `CREATE_TABLE`, `INSERT`, and `SELECT`.

So the `sql_grammar` defines SQL query structure, and enforces to allow only queries that fits in it.

===

## Database storing structure

### Tablespace

Tablespace is a space that storing real data in database object.
It is a physical part of database, allocates repositories to all DBMSs that are managed by segment.

It is for managing massive datas with stable restoring mechanism, and also for disk i/o opt.

### Page

In MySQL, there are many types of datas.

1. Row in Table
2. Index
3. Undo Log

etc..

Row: Real Data that are managed by MySQL.
Index: For efficient row searching.
Undo Log: Datas for transaction operation.

These datas are managed in On-disk sector repository.
It's called a Tablespace(already seen it!)
Row, Index, Undo Logs are stored in each Tablespace.

Page is a bunddle of datas. It also called as "Block of Data".
Page is a logical bunddle of data inside of Tablespace, a huge size of file.
Also, Page is a data unit that MySQL calls at once when Disk i/o operates.

This means that when we search for a particular row, we load all the data pages containing the row at once.

### Types of Page

#### Data Page

is for storing real data.

#### Index Page

Stores information of indexes.

Each index page has index value and data page address that corresponds to it.
Primary index page has one data page that corresponds to, and Secondary index page has two data pages that corresponds to it.

#### Undo Log Page

Undo log page writes down undo log entries.

For implementing Transaction Isolation, Undo log stores the original data for each transaction.
Specially, It is used for implementing REPEATABLE READ at REPEATABLE READ isolation level.

===

## Rewrite DBMS code

To get SQL queries by input and parse it to operate logics based on it.

optimizer.rs

```rust
use crate::database::Database;
use std::error::Error;

#[derive(Debug)]
pub enum ExecutionStep {
    Scan(String),
    Filter(String),
    Project(Vec<String>),
    Insert(String, Vec<String>),
}

pub struct Optimizer {
    database: Database,
}

impl Optimizer {
    pub fn new(database: Database) -> Self {
        Optimizer { database }
    }

    pub fn optimize(&self, query: &str) -> Vec<ExecutionStep> {
        if query.to_lowercase().starts_with("select") {
            let table_name = query.split_whitespace().nth(3).unwrap_or("").to_string();
            vec![
                ExecutionStep::Scan(table_name.clone()),
                ExecutionStep::Project(vec!["*".to_string()]),
            ]
        } else if query.to_lowercase().starts_with("insert") {
            let parts: Vec<&str> = query.split_whitespace().collect();
            let table_name = parts[2].to_string();
            let values = parts[4].trim_matches(|c| c == '(' || c == ')').split(',')
                .map(|s| s.trim().trim_matches('"').to_string())
                .collect();
            vec![ExecutionStep::Insert(table_name, values)]
        } else {
            vec![]
        }
    }

    pub fn execute_plan(&mut self, plan: &[ExecutionStep]) -> Result<Vec<Vec<String>>, Box<dyn Error>> {
        let mut result = Vec::new();

        for step in plan {
            match step {
                ExecutionStep::Scan(table_name) => {
                    let table = self.database.get_table(table_name);
                    result = table.rows.clone();
                }
                ExecutionStep::Project(columns) => {
                    if columns[0] == "*" {

                    } else {}
                }
                ExecutionStep::Insert(table_name, values) => {
                    let table = self.database.get_table_mut(table_name);
                    table.insert(values.clone()).expect(&format!("Insert Operation Failed"));
                }
                ExecutionStep::Filter(_) => {

                }
            }
        }

        Ok(result)
    }
}
```

Extract query_optimizer logic from sql_parser.
interprete sql query by reading fisrt keyword.
(do not use sql parser functions)

then execution plan matches each step, operates adequate logics and return result.

---

Next, I'll add sql parser logic and pass it to optimizer.
Also study more about query optimizer...
