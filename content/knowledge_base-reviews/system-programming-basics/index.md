+++
title = '[System Programming] System Programming Basics'
date = 2025-03-25T20:36:10+09:00
draft = true
+++

===

# File System Basics

## Persistent Storage

영구적인 데이터 저장소. 전원이 꺼져도 유지되는 비휘발성을 특징으로 한다.
- Hard Disk (HDD)
- Solid-State Storage Devide (Flash Drive, SSD)

비휘발성 이외에도, 메모리와 비교하여 속도가 느리지만 규모가 상대적으로 크다는 특징을 가진다.

Storage에 대한 abstraction은 대게 File + Directory의 형태로 나타난다.

## File Abstraction

기본적으로는 byte의 선형 배열로 나타난다.
프로세스 주소 공간과의 비교를 다루면 다음과 같다.

차이

1. Length
	1. File: 가변 길이를 가짐 (조작이 가능하다.)
	2. Process Address Space: 고정된 길이를 가짐
2. Persistency
	1. File: 영속적임
	2. Process Address Space: 휘발성이 있음
3. Continuity
	1. File: 연속적임
	2. Process Address Space: 불연속

공통

여러 프로세스 간에 공유 가능함 (Shared Memory)

> **File 이 가변 길이를 가진다는 것의 의미**
> 
> 파일의 가변 길이는 파일이 고정된 크기의 데이터 블록으로 구성되는 것이 아니라, 각 데이터 블록(혹은 레코드라 불리는 단위)으로 저장되며, 그 단위마다의 길이가 다를 수 있음을 뜻함.
> 
> 즉, 파일은 여러 개의 레코드로 구성될 수 있고, 각 레코드의 길이가 다를 수 있다.
> 마치 텍스트 파일에서 한 줄을 레코드라고 치면, 각 줄마다 텍스트의 길이가 다른 것과 같다.
> 
> 이와 같은 방식에서는 하나의 레코드가 어디까지인지를 알려줄 필요가 있기 때문에, 별도의 메타데이터에서 이를 표시하도록 되어 있다.
> 이러한 방법을 통해 효율적인 공간 사용이 가능해지지만, 위와 같은 별도 정보 제공을 위해 공간이 추가로 필요한 소요도 있다.


## File System

커널 내부에 존재한다.
하나의 파일 시스템은 일반적으로 하나의 디스크 단위의 데이터를 관리하게 되며, 해당 디스크 내의 파일들에 대해 일관성을 유지하는 것에 대한 모든 책임을 진다.

File 이라고 함은 사용자가 접근 가능한 것이기 때문에, File System은 유저가 파일을 탐색하는 행위를 함으로써 실제 물리적 위치로 이를 매핑해주는 역할을 담당한다.
이를 통해 유저는 실제 데이터의 위치를 알 필요 없이, 파일에 접근하는 것만으로 데이터를 열람하는 것이 가능해진다.

파일 시스템은 각 디스크 별로 다르게 적용될 수 있으며, 파일 시스템 별 특징에 따라 용도가 나뉘게 된다.

## Process and File/FS

프로그램은 우선 프로세스에서 실행된다.

프로세스는 virtual memory에 접근해 프로그램 데이터를 사용하고, 이는 뒤에서는 demand paging등의 기법을 통해 효율적인 메모리 사용을 가능하도록 한다.

또한 프로세스는 FS에 접근하게 되는데 (file과 directory), 이는 FS에 의해 물리적인 저장소에 매핑된다.

FS가 사용자에게 File과 directory라는 단순한 형태의 인터페이스를 제공하기 때문에, 새로운 디스크를 탈부착하는 것이 매우 용이하며, 이는 외부 디스크 또한 동일한 형태로 관리 접근 가능하도록 한다.

> **Virtual Memory**
> 
> 프로세스가 virtual address에 접근해 RW를 수행함. 여기서 virtual address의 최소 단위를 Page라고 하고, 각 Page는 Page Table에 의해 관리되어 다시금 물리적인 메모리에 매핑된다. 여기서 물리 메모리의 단위를 Frame이라고 한다.
> 
> **File System**
> 
> 프로세스가 file에 접근하면 File allocation table에서 해당 file에 대한 실제 물리 storage block을 매핑한다. storage의 block이 기본적인 단위이지만, 하나의 파일이 여러 block을 가지고 있을 수 있다. 이는 추후 설명할 FCB (inode in linux)로 연결된다.


## File Systems and Partitions

#### Partition

전체 디스크 공간을 효율적으로 사용하고, 각 목적 별로 사용 공간을 나누기 위해 (혹은 재해 복구 등의 다양한 이유를 들어서) 파티션이라는 단위를 기용한다.

이는 하나의 디스크를 쪼개서 여러 파티션으로 둘 수도, 여러 디스크를 하나의 파티션으로 둘 수도 있다.

> **각 파티션마다 각기 다른 FS를 적용할 수 있다.** <= 중요

#### File

실제 데이터를 가진다 (text, image, executables...)

#### Directory

인덱싱을 위해 존재한다 (메타데이터나, 매핑 정보 등을 포함한다.)
계층적이고 구조화된 디스크 관리 방법이다.
- 윈도우 시스템에서는 폴더라고 칭해진다.

디렉토리 또한 파일의 한 종류이다. (타입이 다르고, 내부에 다른 파일들을 여럿 포함하는 재귀적인 형태를 띈다.)

## Directory Example

디렉토리는 트리 형태를 띈다.

![[figure1.png]]

위 그림처럼, 루트 디렉토리가 위치하고 해당 트리의 리프 노드들은 (주로) 디렉토리 타입의 파일로 구성되어 있다.

이후, 여러 번 거치다 보면 실제 확장자를 가지는 파일들에 도달할 수 있다.

## File attributes (metadata)

![[figure2.png]]

실제 데이터에 대한 정보들을 포함한다.
이외에도 시간, 날짜 등등의 정보를 추가적으로 가지고 있을 수 있다.

여기서 가장 중요하게 보여지는 것은 

- Location => 현재 디바이스(디스크) 내에 어느 위치에 이 데이터가 적재되어있는지를 표시한다.
- Protection => 현재 파일에 누가 어떻게 접근 가능하며, 누가 조작, 실행이 가능한지 등의 권한을 나타낸다.

이러한 메타데이터 또한 당연히 실제 데이터와 함게 저장된다.
이러한 메타데이터를 담은 커널 단에서의 자료구조를 **FCB**라고 부른다.

- Unix-like System에서는 inode라고 한다.

> 왜 FCB가 필요한건가요?
> 
> for indexing and distinguishing
> 
> PCB가 특정 프로세스에 대한 task_struct 의 형태로 정보를 저장하여 프로세스 제어에 용이하도록 하는 것처럼, FCB도 파일 제어를 위해 FCB를 가진다.
> 
> 근데 FCB와 Real Data가 모두 Disk에 있으면 매번 읽어오기 힘들지 않나요?
> 
> 그래서 FCB 캐싱 등을 활용하여 이를 최소화한다.


## File Operations: Creation

Linux에서 `open()` 과 `close()`에 해당된다.

파일 생성: `O_CREAT` flag를 포함한 `open()`으로 시작된다.

`int fd = open("/foo/kuos.log", O_CREAT | O_WRONLY | O_TRUNC);`
- `O_WRONLY`: 읽고 쓰는 작업만 가능하도록 제한
- `O_TRUNC`: 파일 초기화 시, 이미 동일한 이름의 파일이 존재한다면 이를 제거하고 새로 생성하도록 함(덮어쓰기)

이렇게 나온 `fd`는 file descriptor라고 한다. 숫자로 표시되며, 열려있는 파일에 접근 가능하도록 하는 변수이다.

> **File Descriptor**
> 
> 운영 체제가 파일 또는 IO 자원 참조를 위해 사용하는 정수형 식별자이다. 이는 다양한 리소스를 추상적으로 관리 가능하도록 하는 하나의 인터페이스이다. 
> 단순 번호로 나타나지만, 이를 통해 해당 파일의 inode번호, 접근 모드(RW), 현재 오프셋, 관련 버퍼 및 상태 등을 관리한다.
> 
> 파일 디스크립터 (반환된 정수값을 의미)는 커널 내부에서 사용되는 파일 테이블과 연결되며, 이 테이블에는 해당 파일에 대한 메타데이터와 상태등의 부가정보가 저장된다.
> 
> **File Descriptor와 커널 구조**
> 
> 각 프로세스는 자체적인 파일 디스크립터 테이블을 가지며, 이 테이블은 정수형 데이터인 파일 디스크립터를 운영체제 내의 글로벌 파일 테이블의 항목과 매핑한다.
> - 파일 디스크립터 테이블: 프로세스 내에서 사용되는 정수형 식별자를 저장함.
> - 글로벌 파일 테이블: 시스템 전체에서 열려있는 모든 파일의 정보를 저장함. 파일 오프셋, 접근 모드, inode번호 등이 포함됨.
>   
>   결국, 파일 디스크립터는 이러한 프로세스 or 글로벌 파일 테이블에 접근할 수 있도록 하는 키가 된다.

## File Operations: Read and Write

File read: `read(fd, buffer address in mem, len to read)`
File write: `write(fd, buffer addr in mem, len to write)`

**Position**: 파일 내 현재 작업이 수행되는 지점

- 초기화된 파일의 경우, 시작 지점이 포지션
- read, write을 수행할 수록 position이 변경
- 포지션은 'current file-position pointer'로 불림
	- fd에도 이에대한 정보가 적재되어 있음

포지션은 read, write를 수행하면 그에 맞게 암시적으로 쓰인 만큼 or 읽은 만큼 증가함.
`lseek` 시스템 콜을 통해 명시적으로 강제 이동 시킬 수 있다.


## Directory Structure


---

# File and Directory in Disks

## File Implementation on Disks

디스크에서의 데이터 저장 및 인덱싱 방법에 대해서 다룬다.

- Key: 데이터의 위치를 나타내며, 효율적으로 본 데이터의 정보를 관리한다.
- Data block (Disk Block): 가장 작은 단위의 데이터를 저장하는 블록이다.
	- EXT4에서는 4KB를 단위로 함.

파일을 Data Block에 할당할 때의 매커니즘

- Contiguous Allocation
- Liked List Allocation
- Indexed allocation with liked list
- Multilevel indexed allocation

## Contiguous Allocation


특정 인덱스를 시작으로 연속적으로 데이터를 저장한다.
FCB에서는 파일의 이름을 key값으로, 시작 인덱스와 길이만을 저장하는 방식을 취한다.

시작 인덱스의 위치는 별도의 규칙이 없지만, 해당 시작 인덱스를 기반으로 반드시 **연속적인** 블록 할당이 필수적이다.

만일 남은 블록 중 해당 파일 만큼의 길이를 만족하는 연속된 빈 블록이 없다면, 데이터를 저장할 수 없게 된다.
이러한 점은 블록의 관리가 제대로 이루어지지 못하는 경우 심각한 외부 단편화를 야기할 수 있다.
메모리 최적화? 청소? 등의 과정이 필요할 수도 있다.


> 별개로, 모든 allocation방법에서 마지막 블록에 대해 내부 단편화가 이루어질 수밖에 없다.
> 이를 최대한 방지하고자 블록 크기를 줄여 섬세한 제어를 할 수도 있으나, 이러한 경우 관리 비용의 증대를 감수해야한다.

Pros
- 구현의 단순성
- 하드디스크가 순회하는 데 시간을 많이 쓰지 않아 읽기 성능이 좋음
	- 특정 스토리지 유형에서는 랜덤 위치를 읽는 것이 지연을 초래할 수 있기 때문에, 이런 경우 더욱 강점을 가짐

Cons
- 단편화.
- 각 파일에 대한 새로운 데이터 블록 추가가 매우 어려워짐
	- 파일을 생성한 뒤에 파일의 크기가 매우 커지면, 이를 온전히 저장하지 못함.
	- 그렇다고 이를 고려해서 예약된 블록을 많이두게 되면 블록의 낭비를 초래할 수도 있음.

> 디스크 성능 평가의 4개 지표
> 1. Random Read
> 2. Random Write
> 3. Sequential Read
> 4. Sequential Write


## Linked List Allocation

File, Start, End를 기록한다 (End는 굳이 없어도 됨).
연결 리스트 형태로, 각 노드가 Next block Number를 포함하는 형태이다.
ex) 만약 4KB의 블록 크기를 가진다면, 4b정도가 다음을 가리키는 용도로 사용된다.

Next Block을 표현하기 위해서는 전체 블록의 숫자만큼 표현 가능해야함.

디스크가 4GB이고 각 블록이 4KB라면, 총 2^10 개의 블록이 있음(단편적으로).
따라서 모든 블록을 표현하기 위해서는 최소 10개의 bit이 필요함.
=> 이런 식으로 계산해서 일반적으로는 4Byte정도를 다음 가리킬 때 사용한다(2^32 개의 블록 표현이 가능).

Pros
- 단편화가 훨씬 적다(모든 블록을 사용 가능해 낭비가 없음)
- 파일 크기 변화에 유연하게 대응이 가능하다.

Cons
- 내가 만약 파일의 중간을 읽고 싶다면, 해당 파일의 처음부터 읽어나가야하므로 성능 상 이점을 가져오기 어렵다.
	- 별도로 중간 지점의 정보를 FCB에서 가지지 않기 때문.
	- Random location 접근에서 단점을 가진다.
		- Direct random access: impossible
		- Must traverse from the starting data block
- 만약 중간 블록이 손상되는 경우, 파일에 대한 정보를 온전히 저장하기 어려움(vulnerable to crash).
- 이중화가 필수적이라고 생각됨.

> FAT File System
> 
> 일반 OS에서 볼 수 있는 가장 간단한 형태의 파일 시스템이다.
> 데이터 구조체 타입 수가 적어서 간단하다.
> 이름 그대로 파일의 할당 정보를 표현한 테이블이다.
> 간단한 구조로 메모리 카드, USB, 플래시 메모리 등에 사용된다.

## Indexed allocation with Linked list

FCB 내에 파일 이름과 해당 파일의 모든 블록 포인터를 저장한 인덱스 블록 주소를 가진다.

해당 인덱스 블록에 접근하면, 순서대로 모든 블록에 대한 정보를 담고 있다.

Pros

인덱스 블록만 접근하면 실제 데이터 블록의 위치와 무관하게 모든 블록을 찾을 수 있다.

Cons

만약 1개의 블록만 인덱스 블록으로 쓰게되는 경우 Max File size가 고정되기 쉬움.


## Multilevel indexed allocation

인덱싱하는 블록을 하나 두는 대신, 계층적으로 여러 인덱싱을 적용하도록 한다.

inode 의 기본 베이스 구현 방법이 되었다.
Unix 기반 시스템에서의 UFS, Ext2~4 등에서 널리 사용되었다.

> Inode 의 구성요소
> 
> - 일반적인 파일의 메타데이터
> - 데이터 블록에 대한 인덱스들
> 	- direct blocks: 바로 데이터 블록을 조회 가능한 inode 블록
> 	- single indirect blocks: 1회 조회를 통해 접근 가능한 데이터 블록
> 	- double ~ : 2회 조회
> 	- Triple: 3회 조회
> 
> 실제 디스크를 왔다갔다 하는 과정이다보니, 여러 번 조회할 수록 성능이 떨어짐. 그러나 여러 번 인덱싱할수록 나타낼 수 있는 블록의 갯수가 매우 늘어남.


## Inode Design

전형적인 inode 크기는 128byte정도이다.
일반적인 블록 사이즈는 4KB (4096Byte)이다.

> Access Speed와 Space waste는 서로 반비례한다. 따라서 특정 기준을 기반으로 설계할 필요가 있다.
> 
> Depth 깊어질 수록 IO 1회씩 더 필요하므로 많이 느려진다. (Trade Off!)


## Directory Implementation


디렉토리도 FCB로 나타내어짐.
여러 파일을 트리 구조로 저장하고 분류한다.

Directory Entry: 특정 경로 내부의 파일이면 파일, 디렉토리면 디렉토리의 정보를 나타낸다.

각 엔트리에 대한 블록은 liked list, hash table, tree 구조로 구현된다.
각 엔트리에는 타입, 파일 이름, Pointer to FCB 등의 정보를 담고 있음.

### Linked list

중간 접근 어려움.

### Hash table

Sorting이 없음
key collision이 발생 가능.
이에 대한 방안으로 key : linked list index를 가지는 경우도 있음
=> hash collision이 있더라도 그 경우가 매우 적어서 효율적으로 동작한다.

### Tree based

엔트리들을 균형있는 트리 구조로 저장함.

오름차순 찾기가 매우 빠르다.
정렬이 이미 되어 있다.

---

# In-kernel file system implementation


## Review: on-disk

### on disk data structure

- 디스크는 블럭 단위로 나뉘어 관리된다.

![[figure3.png]]

위의 그림처럼 하나의 Disk 를 Block단위로 관리하게 된다 (위 예시는 64개의 블록을 가지는 경우).

최상단의 블록들의 경우 Blocks for On-disk Structure 라고 명명되어 해당 디스크의 메타데이터를 저장하는 블록으로 사용된다.

![[figure4.png]]

위 그림을 보면, 처음 8개의 블록의 경우 해당 디스크에 대한 메타데이터를 적재하는 경우이다.

여기서 최상단 블록의 구성은 다음과 같다.

>- **Boot block**: 실제 OS 부팅에 필요한 부트로더 및 커널 관련 파일들을 포함한다.
>- **Super block**: 파일 시스템에 대한 메타 데이터를 포함한다.
	- 전체 블록 갯수, 전체 inode갯수 등의 정보를 포함한다.
	- 복구를 위해 여러 복사본이 생성된다.
	- 각 디스크 파티션들 각각의 처음 블록(혹은 boot block 뒤에)에 포함된다.
	- 시스템 구동 중에는 메인 메모리에 적재된다. => 디스크 접근을 최소화하고, 캐싱을 위함. 각각 disk superblock, memory superblock이라고 구분한다.
	- inode table에 대한 정보를 포함한다.
>- **inode/data block bitmap**: 각 inode block 및 data block에 대한 유휴 상태를 체크하여 1 혹은 0 으로 활성 상태를 표기한다.
>- **inode array**: 전체 파일들에 대한 inode.


전체적인 블록의 구조를 살펴보면 부트 블록을 제외한 전체 부분은 복제되어 있다. => 재해 복구를 위함이다.
이외에도 디스크 접근에는 회당 비용이 많이 소요된다. 이는 성능과 직결되는 문제이기 때문에 추후 캐싱 등을 통해 디스크 접근을 최소화한다. 특히 긴 pathname등으로 인한 문제를 해결하기 위해, 여러 정보들을 메모리 적재하는 방식을 채택한다.


## File System Hierarchy

파일 시스템은 다음과 같이 구성된다.

1. read, write과 같은 시스템 콜들이 호출
2. 호출이 유니크한 API를 제공하는 VFS로 전달
3. VFS는 정해진 동작을 수행
4. VFS 하위에 연결된 디스크 별 파일시스템에 대한 구현들이 동작

각 VFS interface는 여러 로컬 파일 시스템에 대한 연결이 가능하도록 되어 있으며, 각 파일 시스템은 해당 VFS에 맞게 자신들의 기능을 구현해두어야한다.

**커널 파일 시스템은 계층적으로 구현되어있다.**

**왜 계층적인가?**

- 다양한 스토리지 디바이스 유형이 있고
- 각 하드웨어 유형에 따라서 데이터를 적재하는 방식이 상이하다
- 커널은 여러 기기들에 대한 여러 파일 시스템에 대응할 수 있어야 한다. 따라서 여러 파일시스템에 대응 가능한 추상화된 상위 계층에 대한 소요가 있다.
- 또한, 이러한 과정을 통해 중복된 코드를 방지할 수 있다.


![[figure5.png]]

Lower Level file system에는 ext4, NFS, FAT 등이 포함된다.

## VFS

상위 계층의 파일 시스템이다.

여러 파일 시스템들을 추상화하고, HDD, SSD 등의 여러 디바이스 특성에 맞는 각기 다른 파일시스템에 대한 모든 지원이 가능하도록 한다.

Role: 여러 파일 시스템에 대한 통합 API 제공

- 하나의 API를 사용해서 여러 하드웨어나 파일 시스템에 대응 가능하도록 한다.
- **이를 위해 각 파일 시스템들은 해당 VFS에서 정의한 필수적인 기능들을 구현하여야한다.**

구현은 OOP 기반으로 접근하여 살펴본다.

VFS는 하나의 클래스이고, 각 FS들이 이에 대한 객체(인스턴스)로 작용한다.

VFS는 필수적인 함수와 변수들을 정의한다.
각자의 FS는 이에 대한 구현을 수행한다(해당 VFS를 상속하는 느낌).
=> C의 function pointer를 사용하여 구현된다.

## File operations

스토리지에 있는 파일들의 경우 프로세스가 접근하게 된다.

파일 시스템은 이러한 프로세스 별 파일 접근에 대한 성능 관리를 위해 다음과 같이 open-file table이라는 구조를 가진다.

- System-wide open-file table
	- 현재 열려있는 모든 파일에 대한 정보를 관리한다.
- Per-process open-file table
	- 특정 프로세스에서 열어서 열려 있는 파일들에 대한 정보를 관리한다.

## File Operations: Open

파일에 접근하기 위해서 프로세스는 open() 시스템콜을 통해서 파일을 여는 과정을 거친다.

이 과정은 다음과 같이 이루어진다.

1. 프로세스에서 open() 시스템 콜 호출
2. system-wide open-file table에서 엔트리 체크
3. 만약 system-wide open-file table에 열려있다고 뜨지 않다면(만일 열려있다면 해당 정보를 제공한다), 디스크에서 해당 파일에 대한 inode(FCB)를 복제하여 새로운 엔트리를 만든다.
	- 여기서 메모리에 복제된 inode를 vnode라고 부르는 책도 있다.
4. 새로운 엔트리가 system-wide open-file table에 생성되면, per-process open-file table에서는 system-wide open-file table의 엔트리를 가리킨다.
5. 이후 해당 per-process open-file table에 대한 인덱스를 fd로써 제공한다.

이제 각 per process와 system wide open-file table에 대해 더 알아보자.

### Per-process table

각 프로세스 별로 저장되는 상태이다.

- fd (integer값으로 저장되는 index): 프로세스에서 사용해야하는 열려있는 파일들에 접근할 수 있도록 하는 정보이다.
	- 몇개는 예약되어있다. 0은 stdin, 1은 stdout, 2는 stderr...
- 현재 파일 위치 관련 포인터
- Access modes: 파일들에 대한 rwx 권한 정보를 담는다.
- pointer to system-wide table entry: system-wide open-file table의 각 엔트리에 대한 주소 정보를 가짐.

어쨋든 프로세스가 fd를 인덱스로 하여 per-process open-file table을 조회하면, 그 결과로 system-wide open-file table에서의 포인터값과 접근 관련 권한, 현재 파일 위치 관련 정보 등등을 조회 가능하다.


### System-wide table

- 복제된 FCB를 가진다.
- 최근 파일에 접근한 시각 정보를 가진다.
- open count: 현재 해당 파일이 몇개의 프로세스에서 참조중인지에 대한 숫자 정보를 가진다.
	- open() : open count ++ / close() : open count --

만약 특정 프로세스가 파일을 닫으면, 해당 프로세스의 per process table에서 관련 엔트리가 사라진다.
만약 open count가 0이 되면, 해당 엔트리는 system-wide table에서도 제거될 수 있다


## File Operations: Read

다음과 같은 과정을 거친다.

1. Access per-process open-file table by fd
2. Get pointer of system-wide open-file table entry
3. Get FCB (inode)
4. get real data block based on the inode


## Caching file system metadata

이러한 과정 전반에서, 파일 시스템 관련 작업들은 여러 번의 IO작업을 수반한다.
검색에만 해도 1) superblock -> 2) inode list -> 3) data block...

어떻게 이러한 오버헤드를 줄일 것인가?
=> 자주 사용하거나 최근 사용한 파일 및 파일 시스템에 대한 정보를 메모리에 적재해두어 빠른 접근을 가능하게 한다.


### Cached superblock

시스템 부팅 시 혹은 파일 시스템 마운트 시, 해당 파일 시스템이 맡고 있는 파티션에 대한 superblock을 디스크에서 메모리로 로드해두어 접근을 빠르게 한다.

### Dentry

path: inode number와 같은 형태로 정보를 저장하는 KVS의 일종이라고 생각하면 좋다.

e.g) /home/user/file.txt -> inode nubmer

dentry의 cache hit이 발생함녀, 매우 빠른 FCB로의 접근이 가능해진다.

> dentry와 directory entry는 다르므로 이를 주의하자!!!
> directory entry는 디스크 안에서의 개념이고, dentry는 메모리 내에서 캐싱을 위한 요소이다.

### Cached FCB

system-wide open-file table에 미리 복사해둔 FCB
앞서 언급한 것처럼 open count 를 기반으로 캐싱된 정보를 관리한다.
open count 가 0이고, LRU 기반으로 관리될 때 삭제 판명나면 삭제되는 방식.


## Caching Data blocks

FCB뿐만 아니라 자주 사용되는 데이터 블록들도 커널 메모리에 적재된다.

e.g) buffer cache, unified buffer cache, unified virtual memory
=> 각각 조금씩 다르지만, 데이터블록 캐싱을 위한 것들임은 같다.

데이터블록을 캐싱하는 것도 IO레이턴시 감소가 주 목적이며
주로 최근 접근한 block들이 캐싱된다 => time based policy!


전형적으로 1~10%정도의 물리적인 메모리 공간이 데이터 블록 캐싱을 위해 사용된다.
다만 전체 공간이 한정되어있기 때문에, **교체 알고리즘**이 필수적이다.

> LRU: 임시 지역성을 위해 일반적으로 사용된다.
> 캐시 공간이 꽉 차면, 가장 오랜 기간 사용되지 않은 데이터블록이 대체된다.

**많은 애플리케이션들이 버퍼 캐시의 도움을 크게 받고 있다.** => 캐시가 그만큼 중요하다.

>캐싱되지 않는 데이터블록들
>- 멀티미디어 파일 등은 캐싱되지 않음. 너무 커서 캐싱하기에는 메모리 차지가 심한 경우 등.
>- DBMS로 관리되는 데이터의 경우, 각자가 가지는 내장 매커니즘이 있기 때문에 캐싱되지 않음

## How is a data block cached?

![[Screenshot 2025-04-17 at 11.15.51 AM.png]]

1. 프로세스에서 read/write 시스템 콜 호출
2. Kernel이 cache를 체크한다. 요구된 블록이 캐시에 존재하는지 확인한다.
	1. 이 경우 캐시는 hash-table 로 구성되며, link 를 따라가면서 해당 데이터 블록이 존재하는지 확인한다.
3. 만일 캐시에서 해당 데이터블록이 없다면, 디스크에서 검색을 시작한다.
4. 다음 두 경우에 대해서 캐싱된 블록에 대한 revalidation이 이루어진다.
	1. 캐싱된 블록이 새로운 블록으로 교체되어야할 때,
	2. 주기적으로 데이터 블록 변경을 동기화할 때
5. 그 외에 캐시를 사용하지 않는 데이터 등의 경우 Direct IO를 수행해 디스크에서 직접 데이터를 바로 가져온다.

## Read routine and data block caching


1. 프로세스가 VFS에 read call을 날림
2. get_block()을 통해 VFS가 캐시를 조회함
	1. cache-hit인 경우에 해당 데이터를 반환함
	2. cache-miss인 경우에 해당 fs에 접근해 disk로부터 데이터를 가져옴
3. **VFS가 검색한 데이터를 프로세스 내에 지정된 버퍼에 복사함. 그리고 읽은 byte 수를 반환함.**

## Write routine with data block caching

1. 프로세스가 VFS에 write call을 날림
2. write_block()을 수행하여 cached blocks에 작성을 목표로 하는 블록이 존재하는지 확인함.
	1. cache-hit인 경우, 메모리 캐시의 해당 블록을 새로운 내용으로 수정함.
	2. cache-miss인 경우, disk에서 데이터 블록을 가져온 뒤에 작성함.
	3. 이후 dirty-bit을 추가하여 disk에 대한 동기화가 필요함을 표시함.
3. kworker가 수정된 블록의 dirty-bit을 확인하고 동기화를 수행함.

## Block synchronization by worker

kworker

- 캐싱된 블록과 해당 블록에 대한 디스크 블록의 동기화를 담당하는 책무를 진다.
- dirty block을 체크하여 동기화를 수행한다.
- 데이터 영속성을 위해 dirty-bit이 표기된 블록들을 다시금 disk 에 작성함 (mem -> disk로 작성!!)
- 주기적으로 돌아간다.

**flush를 할 때, fsync system call을 사용 가능하다.**
**즉, 파일의 디스크 동기화는 즉시 진행되지 않음을 시사한다.**
**즉, 단기간 내에 여러 파일들에 대한 변화가 진행되고 나면 특정 시간 이후 모든 dirty block에 대한 flush가 batch 처리된다.**


## File read/write operations


프로세스는 특정 데이터를 사용할 때 해당 프로세스 메모리의 버퍼를 가리킨다(커널에 직접 접근 불가하기 때문).
따라서, 데이터 블록을 캐싱하게 되면 해당 데이터는 이미 디스크에서 캐싱되었던 커널 메모리의 데이터 블록을 복사하는 형태로 진행된다.

이는 동일한 블록에 대한 중복이나 다름 없기 때문에, 우리는 Memory-mapped file을 사용한다.

## Memory-mapped file

`void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset);`

프로세스 내의 mmap은 page table의 addr를 가리키고, 해당 페이지 테이블의 value가 커널 메모리에 있는 캐싱된 블록을 가리키는 형태를 띈다.

**본래 RAM의 다른 부분을 가리켜 복제될 뻔한 데이터를 mmap으로 kernel cache를 가리키도록 하여 불필요한 복제를 방지하였다.**

여기서 page table을 사용하는 것이 여러 데이터들을 process memory에 복제해서 쓰는 것보다 훨씬 효율적이다.

## Memory-mapped file of two processes

또한, 이런 경우 다중 프로세스 환경에서도 이점을 가지는데,

각 프로세스 별 가지고 있는 mmap을 이용하여 각 프로세스 별 페이지 테이블을 조회하는 경우, 그 값이 커널의 동일한 메모리 블록을 가리키면 그만큼의 복제를 더 제거할 수 있다.

만약 mmap을 쓰지 않으면 다중 프로세스 수만큼 프로세스 캐시 버퍼에 해당 데이터 블록에 대한 복제가 생기기 때문에, 매우 효율적이다.![[Screenshot 2025-04-17 at 11.34.20 AM.png]]

> 결국 Memory-mapped file 이란?
> 
> process의 virtual address space에 매핑하는 파일이다
> - 프로세스가 해당 mmap 파일에 접근하거나 수정하게 된다면, 커널이 이를 감지하여 적절한 operation으로 변환해준다.
> - virtual memory 과 file system의 통합이라고 생각해도 좋을 것 같다.
>   
>   이점은?
>   
>   - file IO를 간단명료하게 바꾼다.
>   **- 중복 복제를 방지한다!!**

# Crash and recovery

우리는 데이터의 영속성 보존을 위해 매우 노력한다. 
ex) 메모리에 있지만 모종의 이유로 인해 flush되지 않았다거나,,,
=> kworker가 실시간으로 활동하는 것이 아니기 때문에 충분히 발생 가능의 여지가 있다.

## Example Scenario

1. 이미 존재하던 파일에 4kb짜리 하나의 데이터블록을 추가했다.
	1. e.g.) open -> lseek -> write -> close
2. 이 경우 하나의 inode가 할당된다.
3. 이후 하나의 data block이 할당된다.
4. write을 수행하기 전에
	1. file size: one block
	2. first direct pointer: index 4를 가리키는 블록 하나만 존재하고, 나머지는 NULL![[Screenshot 2025-04-17 at 11.40.23 AM.png]]
5. write 수행 이후
	1. data bitmap updated
	2. inode is updated
	3. inode내에 first direct pointer의 두 번째 pointer가 5로 채워진다.![[Screenshot 2025-04-17 at 11.41.25 AM.png]]

우리는 여기서 다음 세 쓰기를 진행해야한다.

1. 데이터 블록에 데이터 쓰기
2. data block bitmap 쓰기
3. inode내에 first direct pointer 추가하기.

따라서, 이들 모든 데이터에 대한 flush가 필요한 상황이다. 그러나 이 flush 작업은 실시간으로 일어나지 않기 때문에, crash가 발생하면 어떤 데이터가 살아남고 어떤 데이터가 제대로 flush되지 않을지 보장할 수 없다. 또한, 만일 위 셋 중 일부만 flush되는 것도 큰 문제를 야기할 수 있다.

1. data block만 동기화된 경우
	1. inode가 이를 가리키지 못하기 때문에, 사실상 없는 데이터 => 문제는 없음
2. inode만 업데이트된 경우
	1. inode내에서는 해당 데이터 블록을 사용 중이라고 했으나 올바르지 않은 데이터가 있음 => 문제 발생
3. bitmap만 업데이트된 경우
	1. bitmap에서 데이터블록을 사용중이라고 했으나, inode에도 없고 데이터 블록도 없음 => 추후 어떤 inode라도 해당 데이터 블록을 찾아볼 생각도 못함(bitmap에서 이미 쓰고 있다고 했으니) => 해당 데이터 블록은 영영 유휴 상태에 빠짐

이외에도 다양한 상황의 crash 발생이 가능하다.

어떻게 하지?

## File system checker(fsck)

비일관성을 확인하고 고치는 도구

1. superblock check
	1. 실제 디스크의 capacity와 block 개수를 확인하여 superblock에서 말하는 쓰이고 있는 데이터 블록 수가 실제 디스크나 파티션 용량과 차이나지 않는지 확인한다.
	2. 이 경우에, 실제 super블록에 직접 접근해 비교하면 위험할 수 있으니, 복제본을 활용한다.
2. Free block check 
	1. 모든 유휴 block을 직접 체크합니다 (꽤나 비싼 작업일 듯하다..)
	2. inode bitmap, data bitmap에 free라고 되어 있는 블록을 전부 확인한다.
		1. 만일 root directory에서부터 접근했는데 해당 블록을 접근 가능한 경우, 이는 crash상황이다.
	3. 이러한 불일치는 데이터를 덮어쓰게 되거나 고아 파일을 만들게 될 여지가 있다.
	4. 이러한 경우, data block의 bitmap을 사용 중으로 변경한다(왜 반대로 하지 않을까? 데이터의 용도를 확실히 모르기 때문에?)
		1. 즉, 데이터 블록에 데이터가 있는데 불일치가 있는 경우는 해당 데이터를 보존하고자 bitmap을 업데이트한다.
3. inode check
	1. 모든 inode가 정상 데이터로 이루어져 있는지 확인한다.
	2. 모든 inode가 directory entry에 의해 참조되고 있는지 확인한다.
	3. 만일 directory entry에서 참조하지 않는 inode가 발견된 경우, lost+found 디렉토리로 해당 inode를 이동시킨다.
		1. **왜 해제하지 않는가?**
4. 데이터 블록 공유 확인
	1. 특정 블록이 여러 inode에게 참조되고 있는지 확인한다.
		1. 데이터 블록은 항상 하나의 inode에서만 참조 중인 형태여야 한다.
		2. 만일 두 개 이상의 inode가 하나의 데이터 블록을 가리키고 있다면, 이는 특정 파일에서의 수정 작업이 다른 파일에도 영향을 끼칠 수 있어 일관성을 깨뜨린다.
	2. 만일 특정 inode가 의심된다면, 이를 제거한다
		1. 혹은 의심은 가지만 확실하지 않다면, target이 되는 데이터 블록을 복제한다.
5. Bad block pointer check
	1. 특정 파티션에 맞는 데이터 블록 포인터인지 확인한다.
	2. 만일 아니라면, 해당 포인터를 inode에서 제거한다.
6. 디렉토리 구조 check
	1. fsck는 directory content를 직접 식별하거나 해석하지 못한다.
	2. 각 디렉토리 내의 inode들이 실제 디스크에도 존재하는지 확인한다.

위에서처럼 fsck는 생각보다 비용이 비싼 작업들을 많이 포함한다.
실제로 동작하는 fsck를 만드려면 깊은 file system 지식이 필수적이다.

그리고,,느리다. 작업에 수 분, 수 시간이 들어갈 수도 있다. 이는 전체 디스크를 스캔하는 것이 수반되기 때문이다.
또한, 디스크의 크기가 커질 수록 더욱 비효율적이게 된다.

=> 이는 저널링의 등장을 야기했다.

## Journaling Example

Write-ahead logging으로 대변되기도 한다.
디스크에 메모리의 업데이트 사항을 적어나가기 전에, 디스크 상에 작은 노트를 적어서 어떤 작업을 진행하는지에 대한 내용을 작성해두는 것을 의미한다.

왜?

crash가 발생하는 경우 다시 돌아가 해당 기록을 살펴보면서 다시금 업데이트를 진행할 수 있다.
전체 디스크를 조회하는 대신에, 해당 노트를 확인하는 것으로 작업을 단순화하고 간단화한다.

저널링은 ext3에서부터 도입되었는데, superblock바로 다음으로 journal을 쓰기 위한 공간을 마련해둠으로서 로깅을 진행하도록 하였다.

## Data journaling

일반적인 데이터 저널링에서 우리는 다음 세 가지를 업데이트해야한다.
1. inode
2. bitmap
3. data block

우리는 이를 하나의 쓰기 단위로 관리하며, 이는 transaction이라고 불린다.
이들을 쓰기 전에, 우리는 transaction을 시작한다는 의미의 journal을 작성한다.
모두 쓰이고 나면, 우리는 transaction을 종료한다는 의미의 journal을 작성한다.

- TxB: transaction begin block
	- Transaction ID (TID)를 포함한다.
- Middle Three: 실제 업데이트해야하는 디스크 블록을 쓴다.
	- Physical Logging
- TxE: transaction End block
	- 트랜잭션이 종료됨을 알리는 마커로서의 역할을 한다 (TID를 포함한다)

### Checkpoint

우리는 TxB와 TxE가 존재하는 경우에만 이를 valid하다고 여긴다.
FS에 checkpoint를 날릴 때, kernel은 데이터들과 디스크의 특정 위치를 보낸다.

### Summary

Journal Write
- 디스크의 저널 부분에 트랜잭션에 대해 적는다.
- 이는 TxB, all pending data, metadata updates, TxE를 포함한다.
Checkpoint
- 모든 metadata와 data update를 디스크의 실제 위치에 적어낸다.

## How journal write can happen

1. 순차적 쓰기
이전 요소가 올바르게 쓰임을 확인한 뒤에 다음 요소를 쓴다.
=> 각 요소에 대한 쓰임을 확인하고 다음을 써내려가기 때문에 느리다.

2. 한 번에 쓰기
다섯 요소를 전부 한 번에 쓴다.
=> 이는 위험하다
큰 단위의 파일을 쓰게 된다면, 디스크 내부적으로 이를 재정렬하는 이슈가 발생 가능하다.
Ex) TxB, inode, bitmap, TxE를 먼저 쓴 뒤에 Data를 나중에 작성하게 되는 등
이후에 디스크에 crash가 발생해서 Data가 사라지게 되더라도 이를 valid라고 여기게 된다 (journal에서 TxB와 TxE는 온전히 존재하기 때문에)

해결책은? => 하나의 트랜잭션을 두 요소로 나누어서 쓴다.

1. 모든 요소를 TxE를 제외하고 작성한다.
2. 1번 과정이 성공하면 그 때 TxE를 작성한다.

	이렇게 하면 첫 과정에서 하나라도 invalid한 경우에 다 invalid로 간주하게 된다.

### Summary

Journal Write: 저널에 쓰기를 하는데, TxE를 제외하고 작성하는 것
Journal Commit: TxE를 작성하는 것.
Checkpoint: 완성된 트랜잭션에 대한 내용을 디스크 내 실제 주소에 작성한다.


## Crash Recovery

만약 TxE가 쓰이지 않아 트랜잭션이 완성되지 않은 상태에서 crash가 발생하면
해당 업데이트는 스킵된다.

만약 TxE까지 온전히 적힌 트랜잭션 이후에 checkpoint가 일어나지 못하고 crash되면,
이후 저널에서 해당 트랜잭션 정보를 스캔해서 아직 checkpoint가 일어나지 않은 트랜잭션에 대해 이를 적용한다.

> Journaling은 분명 훌륭한 기능이지만, 이에 대한 단점은 무엇일까?
> 
> 1. 중복 작성
> 2. 1/2 of bandwidth btw mem-disk

## Metadata journaling

문제: 디스크 내 모든 데이터를 두 번 작성한다.
- 저널에 먼저 쓰고, 실제 위치에 닫시 쓴다.
- 이는 트래픽을 2배 올리고, 쓰기 율성을 1/2로 만든다.

Another Approach: 메타데이터 저널링
- 데이터 블록은 굳이 저널링될 필요가 없다!! **=> 메타데이터 (inode, bitmap 정보)만 저널링된다.**


## Then, how is the data block updated?

그렇다면 우리는 언제 데이터 블록 업데이트를 해야할까?

1. 데이터블록을 트랜잭션 이후에 진행한다.
	1. 메타데이터는 안전하다 (저널링)
	2. 그러나 데이터는 사라질 수도 있다
	3. inode에 의해 참조된 데이터 블록이 유효하지 못하거나 쓰레기 데이터일 수 있다.
	4. 안전하지 않음!!
	5. 이 경우 crash가 발생하면 메타데이터만 남아있는 경우가 있을 수도 있다. (올바르지 못한 데이터를 가리키게 된다).
2. 데이터를 트랜잭션 이전에 작성한다.
	1. 데이터 쓰기: 데이터 블록을 먼저 실제 장소에 작성
	2. 메타데이터 저널링: TxE빼고 모두 작성
	3. 저널 커밋: TxE작성해서 트랜잭션 완성
	4. checkpoint metadata
	5. journal을 해제
	6. 이 경우에 crash가 발생하면 저널과 데이터가 모두 사라진다.


>[!alert] SSD 에 RAID 5에 대한 컨셉이 적용될 경우에 additional challenge 
>

## 1. **RAID5와 SSD: 기본 개념부터**

## **RAID5란?**

- 여러 개의 하드(또는 SSD)에 데이터를 나눠서 저장하고, 한 개의 디스크가 고장 나도 복구할 수 있게 '패리티'라는 정보를 같이 저장하는 방식입니다.
    

## **SSD란?**

- 하드디스크(HDD)와 달리, 움직이는 부품 없이 전자적으로 데이터를 저장하는 저장장치입니다.
    
- **특징:** 빠르지만, 한 셀에 데이터를 여러 번 쓰고 지울 수 있는 횟수가 제한되어 있습니다.
    

## 2. **문제가 생기는 이유: 예시로 이해하기**

## **(1) 쓰기 증폭(Write Amplification) 현상**

## **상황 예시**

- 예를 들어, 3개의 SSD로 RAID5를 구성했다고 가정해볼게요.
    
- 작은 파일 하나(예: 4KB)를 저장하려고 할 때, RAID5는 이 데이터를 나누고, 패리티 정보도 계산해서 저장해야 합니다.
    

## **어떻게 문제가 될까?**

- 4KB만 저장하면 될 것 같지만, 실제로는
    
    - **원래 데이터(4KB) + 패리티 계산을 위한 추가 데이터(4KB 이상)**  
        → **실제로는 8KB 이상을 SSD에 써야 할 수도 있습니다.**
        
- SSD는 쓰기 횟수가 제한되어 있는데, 이렇게 불필요하게 자주 쓰게 되면 **SSD 수명이 빨리 닳게 됩니다.**
    

## **(2) 패리티 업데이트 오버헤드**

## **상황 예시**

- 어떤 파일의 일부만 바꿔야 할 때(예: 문서의 한 줄만 수정)
    
- RAID5는 해당 부분뿐 아니라, **같은 줄에 저장된 데이터들과 패리티 정보까지 다시 읽고, 계산해서, 다시 써야 합니다.**
    

## **어떻게 문제가 될까?**

- 파일 한 줄만 바꿔도, 실제로는 여러 SSD에서 데이터와 패리티를 읽고, 다시 써야 하니,  
    → **작은 변경에도 SSD에 불필요한 작업이 많이 생깁니다.**
    
- 이 과정에서 SSD의 수명이 더 빨리 줄어듭니다.
    

## **(3) SSD 내구성 문제**

## **상황 예시**

- SSD는 보통 한 셀에 1,000~3,000번 정도만 데이터를 쓸 수 있습니다.
    
- RAID5로 여러 번 쓰고 지우다 보면, **SSD가 생각보다 빨리 고장날 수 있습니다.**
    

## **실제 사례**

- 4개의 SSD로 RAID5를 만들고, 계속 데이터를 저장/수정하다 보면,  
    → **패리티 때문에 한 SSD에만 집중적으로 쓰기가 몰려서, 그 SSD만 먼저 고장날 수 있습니다.**
    

## **(4) RAID 재구축 시간**

## **상황 예시**

- 만약 한 SSD가 고장나서 새 SSD로 교체하면, RAID5는 남은 SSD에서 데이터를 읽어 새 SSD로 복구합니다.
    
- SSD 용량이 크면 클수록, 이 복구(재구축) 작업이 오래 걸립니다.
    

## **어떻게 문제가 될까?**

- 복구하는 동안 다른 SSD가 또 고장나면,  
    → **데이터 전체가 날아갈 수 있습니다.**
    
- 특히 SSD는 갑자기 고장나는 경우가 많아 더 위험합니다.
    

## 3. **어떻게 하면 좋을까?**

## **(1) SSD 여유 공간(오버 프로비저닝) 확보**

- SSD의 전체 용량을 다 쓰지 말고, 60% 정도만 쓰고 나머지는 비워두면,  
    → SSD 내부 관리(가비지 컬렉션, 웨어 레벨링)가 더 잘 되어 수명이 늘어납니다.
    

## **(2) RAID6 등 대안 고려**

- SSD가 많거나, 데이터가 정말 중요하다면,  
    → RAID6(패리티 2개 저장)처럼 더 안전한 방식을 쓰는 것도 방법입니다.
    

## **(3) SSD 수명 관리 기능(QSAL 등) 활용**

- 일부 NAS/스토리지 장비에는 SSD 수명을 체크해서, 한 SSD만 빨리 닳지 않게 분산해서 쓰는 기능이 있습니다.
    

## **(4) 스트라이프 크기와 IO 크기 맞추기**

- RAID5의 데이터 분산 단위(스트라이프 크기)를, 실제 사용하는 파일 크기와 비슷하게 맞추면 불필요한 쓰기를 줄일 수 있습니다.
    

## 4. **정리**

- **RAID5를 SSD에 적용하면, 데이터 안전성은 올라가지만, SSD 수명과 성능에 악영향을 줄 수 있습니다.**
    
- **특히 작은 파일을 자주 저장/수정하는 환경에서는 쓰기 증폭이 심해져 SSD가 빨리 닳을 수 있습니다.**
    
- **SSD의 특성을 이해하고, 여유 공간 확보, RAID6 등 대안, 관리 기능 활용 등을 통해 문제를 완화할 수 있습니다.**
    

**즉, SSD에 RAID5를 쓸 때는 "하드디스크 때처럼 단순하게 적용하면 안 되고, SSD만의 특성(쓰기 횟수 제한, 패리티 쓰기 증폭 등)을 꼭 고려해야 한다"는 점을 기억하시면 됩니다!**

---

Answer from Perplexity: [pplx.ai/share](https://www.perplexity.ai/search/pplx.ai/share)