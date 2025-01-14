+++
title = 'Garbage Collection'
date = 2024-09-24T17:40:00+09:00
draft = false 
+++

> ref: https://blog.siner.io/2021/12/26/garbage-collection/

### Mark-and-Sweep

전통적인 가비지 컬렉션 기법 중 하나.
프로그램 실행 중 동적으로 할당된 메모리들에 대해 주기적으로 sweeping을 진행하며 메모리를 관리함.

#### 과정

1. Mark: 프로그램이 도달할 수 있는 모든 객체에 대해 탐색을 시작하며(유향그래프 형태), 직접 또는 간접적으로 참조 가능한 객체에 "표시"를 남긴다. 이는 트리 탐색과 비슷한 형식으로 이루어지며, 모든 루트 객체에서 시작해 연결된 객체를 찾아나가는 과정을 거친다.

- mark 단계에서 root set 전체를 순회하며 flag를 '사용중'상태로 설정한다. 현재 참조가 되어 있는 객체들은 모두 '사용중' flag를 가지게 된다.

2. Sweep: 표시되지 않은, 즉 참조되지 않은 객체들을 수거하여 메모리에서 해제한다. 

- 현재 사용중인 메모리가 모두 스캔되었기에 '사용중'상태가 아닌 메모리를 모두 해제 가능하다.
- GC를 진행하는 동안 stop-the-world가 필요하다.

### Tri-color marking

기본적인 Tri-color marking은 다음과 같이 동작한다.

1. 각각의 객체를 white, gray, black으로 분류한다.

- 흰색은 더 이상 접근 불가한 객체
- 회색은 접근 가능하지만, 아직 검사되지 않은 객체
- 검은색은 이 영역에서 가리키는 객체들이 흰색 객체를 가리키고 있지 않음을 의미

2. 알고리즘이 동작할 때, 루트 객체가 가리키는 객체들이 회색으로 표시되며, 그 외에 모든 객체는 흰색으로 표시된다.

3. 회색으로 표시된 객체 중 하나를 선택하여 검은색으로 표시한다. 이후 이 객체가 참조하는 모든 객체를 회색으로 표시한다.

4. 과정을 반복하며 모든 객체가 검은색 객체로(모든 사용 중인 객체가 탐지되도록) 식별될 때까지 반복한다.

5. 남은 객체는 접근 불가한 객체이므로, 모두 해제한다.

- 이 기법의 경우 mark-and-sweep과 다르게 시스템의 중단이 필요하지 않다(on-the-fly).

> 어떻게 가능할까?

Tri-color marking의 주요한 특징은 아래와 같다.

1. Incremental GC

- GC 작업을 여러 단계로 나누어 수행한다. 한 번에 전체 객체를 다 탐색하지 않고, 프로그램이 실행되면서 조금씩 marking과 sweeping을 진행한다.

2. Concurrent GC

- 메인 프로그램이 실행되면서도 GC 작업을 병렬로 실행한다. 프로그램의 로직과 GC가 동시에 진행되기 때문에 STW가 일어나지 않는다.

Tri-color marking에서는 다음과 같은 두 가지 주요 메커니즘을 활용하여 stop-the-world를 피한다.

1. Tri-color Invariant 유지

- 프로그램이 실행되는 동안에도 흰색, 회색, 검은색에 대한 정보를 유지한다. 이에 객체 그래프가 변할 수 있는 상황에서도, 이 세 가지 색으로 상태를 구분하면 살아있는 객체와 해제할 객체를 안정적으로 관리 가능하다.

2. Barrier 사용

- 프로그램이 새로운 객체를 생성하거나 참조로 변경할 때, 이를 감지하기 위한 **write barrier** 또는 **read barrier**를 사용해 메모리 변화를 추적한다. 즉, 메모리 변화 이벤트를 항상 확인한다.

- 이렇게 하면, GC가 이미 검사를 마친 객체라도 참조 관계가 변하는 것을 알 수 있다. 이를 통해 동적으로 객체를 관리한다.

이러한 점들로 인해, Tri-color marking은 STW를 최소화할 수 있지만, 그만큼 추가적인 메모리와 연산 비용이 요구된다. 이는 알고리즘의 복잡성으로 인해 GC의 메모리 오버헤드가 커질 수 있는 요인이 된다.

> 메인 로직과 GC가 병렬적으로 동작한다면, 서로 동일한 메모리에 관여하려고 할 때 문제가 발생하지 않는가?
>
> Ex) Concurrent GC에서 메모리 해제 작업을 수행하던 중, 메모리 참조 변경이 일어난다면?
> => 해당 메모리 해제 동작은 취소되거나 연기된다.

실제로 메모리 충돌 이슈가 발생할 수 있다. 이를 위해 Concurrent GC는 write barrier와 tri-color invariant를 통해 이를 막아낸다. 이는 아래와 같은 과정을 거친다.

1. Write Barrier와 참조 변경의 처리

- White 객체가 참조되거나 변경될 때 
    - 메모리 해제 전에 프로그램이 white객체를 참조하거나 그 참조를 다른 객체가 할당하면, write barrier가 이를 감지하여 해당 객체를 gray(검사 중) 상태로 변경한다. 이 상태에서는 GC가 해당 객체를 해제하지 않는다.

- Gray 상태로 승격
    - white객체가 gray로 승격되면, GC는 해당 객체가 다시 살아있을 가능성이 있다 판단하고, 해제 동작을 취소하거나 연기한다. 이후, gray상태인 객체는 다시금 마킹 작업에 포함되어, 프로그램이 여전히 참조 중이면 black으로 변경한다.

2. Tri-color Invariant의 보장

- Concurrent GC는 tri-color invariant를 유지하면서, **black객체는 white를 직접 참조하지 않는다**는 원칙을 강제하도록 한다. 이로 인해, 메모리 해제 작업이 이루어지는 동안 프로그램이 white객체를 참조하게 될 경우, white객체는 바로 gray로 승격된다.
    - invariant에 의해 white객체 해제 방지
        - 참조가 발생하면 white는 gray로 전환되고, tri-color invariant가 깨지지 않도록 처리한다. 이 과정에서 메모리 해제 동작이 취소된다.

3. 메모리 해제의 연기

Concurrent GC에서 메모리 해제를 진행하기 전에 gray 혹은 black으로 변경된 객체는 더 이상 해제되지 않으며, 이는 메모리 해제 동작이 연기되는 효과를 가져온다. GC가 해당 객체가 더 이상 참조되지 않음을 확실히 하기 전까지 해제를 미룬다.

4. Snapshot-at-the-Beginning(SATB)와 Incremental Update

SATB와 Incremental Update는 서로 다른 방식으로 참조 변경을 처리하지만, 모두 메모리 해제 시점에서 참조 변경을 감지하여 해제 작업을 취소하거나 연기한다.

- SATB는 GC가 시작될 때 객체 그래프(혹은 트리 형태)를 스냅샷으로 기록한다. 이후 참조 변경이 발생하면 해당 객체를 다시 gray로 승격시킨다.
- Incremental Update는 프로그램이 새로운 참조를 생성할 때마다 즉시 gray로 승격하여 해제되지 않도록 방지한다.

> ref: [The Garbage Collection Handbook](https://gchandbook.org/)

> Gray 상태는 검사 중인 객체를 나타내는 중간 상태이다. GC는 gray상태의 객체를 아직 분석이 끝나지 않은 객체로 간주한다.
> => 즉, gray객체가 존재하는 동안에는 GC가 해당 객체를 절대 해제하지 않는다.

#### SATB

SATB는 tri-color marking에서 사용되는 주요한 알고리즘이다. 주로 G1 GC에서 사용한다.

Marking Cycle이 시작될 때, Heap메모리에 있는 살아있는 객체의 set을 logical snapshot으로 저장한다.
=> 이는 marking cycle 시작 시점에 기존의 Heap상태를 나타내는 것이다.

SATB는 객체 변경을 추적하기 위해 프로그램이 write하는 모든 포인터를 가로채어 처리한다.
이때 SATB 알고리즘은 `remembered set`이라는 자료구조를 사용한다.
=> remembered set은 프로그램에서 write하는 포인터를 가지고 있는데, 이 포인터가 가리키는 객체가 heap영역에서 다른 영역으로 이동하거나, 아예 사라져도 그 포인터가 가리키는 객체를 살아 있는 객체로 추적할 수 있도록 한다.
=> 따라서 변경 작업으로 기존 메모리에 남은 객체가 없다고 하더라도 감지를 하여 추적한다.
=> 이러한 방법으로 더 높은 성능을 발휘하며, 프로그램을 중지하지 않고도 marking작업을 수행할 수 있다.

> ref: [G1 GC 에 대해](https://velog.io/@ddangle/Java-G1-GC-%EC%97%90-%EB%8C%80%ED%95%B4)