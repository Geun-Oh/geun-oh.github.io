+++
title = 'Linux Namespaces'
date = 2025-05-12T18:35:26+09:00
draft = false
+++

## Linux Namespace

리눅스 네임스페이스는 **프로세스**를 실행할 때 시스템의 리소스를 분리해서 실행하도록 도와주는 기능으로, 현대 컨테이너 기반 운영체제 가상화 기술의 기반이 되는 기술이다. 

하나의 시스템에서 프로세스들은 기본적으로 시스템의 리소스들을 공유해서 실행하게 되는데, 이는 하나의 root namespace라고 생각할 수 있다. 실제로도 프로그램 실행 시 PID 1번 (launchd 혹은 systemd) 프로세스의 자식 프로세스들로 부팅이 되기 때문에, 모두가 단일 네임스페이스 내에서 동작하고 있다고 생각할 수 있다.

이러한 네임스페이스는 `/proc/{PID}/ns` 파일을 확인해서 현재 프로세스에서 사용 중인 네임스페이스의 고유 ID를 확인하도록 할 수 있다. 기본적으로 리눅스에서 지원하는 네임스페이스는 다음과 같다.

- cgroup
- IPC
- network
- mount
- pid
- uts
- user
- time

리눅스에서는 프로세스 실행 시 각 네임스페이스 별로 분리해서 실행이 가능하지만, 기본적으로는 시스템 기본인 1번 프로세스의 네임스페이스를 공유하는 형태로 실행된다.

네임스페이스라는 기능이 서로 다른 환경을 구성하는 것을 목적으로 하기 때문에, 이를 위한 기본 도구 이름 또한 `unshare` 이다. 앞으로 이 도구를 적극 활용하여 자원의 격리를 수행하게 된다.

네임스페이스 기능을 사용하기 위해서는 커널 빌드 이전 `.config`에 `CONFIG_*_NS` 와 같은 네임스페이스 관련 기능들을 사용 가능하도록 변경해주어야한다.

*user, time 네임스페이스를 제외한 다른 네임스페이스들에 대해 설명하고자 한다(Network 네임스페이스는 별도로 정리).*

## PID Namespace

PID 네임스페이스는 PID를 별도로 격리할 수 있는 네임스페이스이다 리눅스에서 PID는 처음 1을 시작으로 하위 프로세스들에게는 1보다 큰 값을 부여하지만, PID 네임스페이스를 분리하면 PID가 1부터 다시 시작하는 새로운 공간이 부여된다. 이때 분리를 시작하는 프로세스의 경우 기본 네임스페이스와 새로운 PID 네임스페이스에 동시에 속하게 된다. 즉, 기본 네임스페이스에서는 1보다 큰 PID를, 새로운 PID 네임스페이스에서는 PID가 1인 프로세스로 간주된다.

사실 하나의 호스트 내에서 프로세스의 고유성은 민감하게 다뤄지는 자원임에도 불구하고 이러한 조치가 취해지는 것은 정말 예외적인 상황이다. 그러나 격리 및 분리의 목적을 달성하기 위해 존재하는 네임스페이스 기능들의 경우 대부분 이렇게 기존의 고유성 보다 격리의 목적을 우선시하는 기능들이 많기 때문에, 미리 이러한 특성에 익숙해지면 좋을 것 같다.

PID 네임스페이스를 통해 분리된 프로세스는 다시금 PID 1로 시작되며, 이는 시스템 네임스페이스(분기하기 이전 네임스페이스) 기준에서는 변화가 없지만 분리된 프로세스 기준에서는 PID 1로 보여지게 된다.

 `fork()` 와 같이 수행 주체에 따라 PID가 다르게 보여지는 느낌이라고 생각할 수 있겠지만, 사실 전혀 다른 동작이므로 헷갈리지 말자. PID 네임스페이스에서는 프로세스가 자신이 속한 네임스페이스 별로 각기 다른 PID를 가지기 때문에, 여러 PID를 가질 수 있다. 이는 LXC와 같은 가상화 도구들에서 가끔 확인할 수 있는데, 처음과 중간, 마지막 네임스페이스에서의 PID가 매번 다르다. 이 때 프로세스는 자기 자신을 최종 네임스페이스에서의 PID로 인식한다.

PID 네임스페이스는 다음과 같은 방식으로 생성한다.

```sh
unshare --pid
```

위는 현재 실행중인 프로세스에 PID네임스페이스를 생성한다.

```sh
unshare --fork --pid
```

위는 우리가 평소 알던 fork()를 함께 수행하며, 새로 자식 프로세스를 생성한 뒤 해당 자식 프로세스를 기준으로 새로운 PID 네임스페이스를 생성한다.

그리고 이런 정보들은 모두 /proc 디렉토리에 프로세스 별로 기록되는데, 우리는 여기서 네임스페이스가 ‘프로세스’ 를 기준으로 동작함을 명심해야한다.

/proc 디렉토리는 해당 /proc 디렉토리를 마운트한(시스템 기본 네임스페이스) 네임스페이스를 기준으로하는 프로세스를 표시하기 때문에, 새로운 PID네임스페이스에서 프로세스 생성을 했더라도 /proc 디렉토리에서는 시스템 네임스페이스를 기준으로 할당한 PID로 표시되게 된다. 다시 정리해보면,

**다중 네임스페이스에서 PID 식별**

만약 8번 프로세스에서 PID네임스페이스를 생성한 후, 해당 프로세스의 자식 프로세스를 하나 만들었다면

해당 프로세스의 식별자는 아래와 같이 계층화된다.
- 시스템 네임스페이스에서: PID 8
- 새로운 네임스페이스에서: PID 1

이는 중첩된 PID네임스페이스에서 흔히 보이는 사례이다. 이렇게 되면 자식 프로세스의 경우
- 시스템 네임스페이스에서: PID 9
- 새로운 네임스페이스에서: PID 2

**/proc 에서의 식별**

/proc 파일시스템에서 어떻게 보이는지는 누가 /proc을 마운트했는가에 따라 달라진다.

1. 시스템 네임스페이스에서 마운트한 기본 /proc:
   - /proc/9 로 표시된다.
   - cat /proc/9/status | grep NSpid를 수행하면 NSpid: 9 2 출력을 확인 가능하다.
2. 새로운 네임스페이스에서 /proc 을 마운트했다면:
   - 해당 /proc에서는 /proc/2로 표시된다.

그러니까..PID 네임스페이스를 분리하게 되었을 때 혼동을 주지 않기 위해서는 아래 설명하게 될 mount 네임스페이스를 함께 분리하도록 `—mount-proc` 옵션을 함께 사용하는 것이 일반적이다.

## Mount Namespace

앞서 설명한 PID 네임스페이스와 더불어 중요하게 여겨지는 네임스페이스인데, 이는 리눅스 커널의 “everything is file” 이라는 설계 철학이 반영되어있기 때문이다. /proc이라는 마운트 포인트를 기점으로 프로세스를 관리하고 있기 때문에, PID 네임스페이스를 기반으로 무언가 격리하려면 마운트 네임스페이스를 함께 격리하는 것이 모범 사례이다.

마운트 네임스페이스는 파일 시스템 마운트와 언마운트 작업을 격리하도록 하는 기능이다. 서로 다른 마운트 네임스페이스에서 수행된 파일 시스템 작업은 서로 알 수 없이 별도로 진행된다. 

사실 이러면 궁금한 점이 생기게 되는데, 한정된 저장 공간은 어떻게 나눌 것인가에 대한 이야기이다. 네임스페이스 기능들은 사실 모두 논리적인 격리에 지나지 않기 때문에, 아무리 노력해도 없던 저장공간을 만들어서 나눌 수는 없는 노릇이다. 이에 대한 이야기는 아래 cgroup 네임스페이스를 다룰 때 함께 진행하겠다.

Mount 네임스페이스 또한 unshare 도구를 활용한다.

```sh
unshare --mount /bin/bash
```

이런 식으로 —mount 옵션과 함께 새로운 마운트 네임스페이스에서 실행할 실행 파일을 선택한다. 마운트 네임스페이스 생성 동작 자체가 분리된 네임스페이스에서 특정 실행파일을 수행하는 형태로 진행되기 때문에, 새로운 마운트 네임스페이스 내부에서 실행할 파일을 명시해주어야한다. 일반적인 경우 내부에서 자유로이 동작을 수행하기 위해 `/bin/sh` 혹은 `/bin/bash` 를 열어서 다음 동작을 수행하게 된다.

여기서부터 조금 헷갈릴 수 있는데, 마운트 네임스페이스는 마운트 동작에 대한 격리를 진행하고, 마운트된 이후 해당 마운트 포인트 내에서 파일시스템으로 관리된 것들에 대한 격리를 진행하는 것이지, 새로 마운트 작업을 통해 이루어진 것이 아니라면 그대로 부모 네임스페이스의 파일시스템에 귀속된다.

즉, `mount` 도구를 이용해서 새로운 마운트 지점을 생성한 뒤 해당 지점 내에서 작업하는 것이 아니라면, 모두 부모 네임스페이스에도 그대로 적용된다는 것이다.

예시: 새로 마운트하지 않고 디렉토리 생성 작업 시

```bash
sudo unshare --mount /bin/bash
root@system-progrogramming:/home/admin# mkdir /mnt/new
root@system-progrogramming:/home/admin# ls
linux-6.13.5  linux-6.13.5.tar.xz
root@system-progrogramming:/home/admin# ls /mnt
new
root@system-progrogramming:/home/admin# exit
exit
admin@system-progrogramming: ls /mnt
new
```

이처럼 마운트 네임스페이스 내에서 연 shell에서 작업했다고 하더라도 부모 네임스페이스에 반영된다.

예시: 새로 마운트 한 뒤 마운트 포인트 안과 밖에서 각각 디렉토리 생성 작업 시

```bash
sudo unshare --mount /bin/bash
root@system-progrogramming:/home/admin# mount -t tmpfs tmpfs /mnt
root@system-progrogramming:/home/admin# mkdir /mnt/new_dir_inside_mount_point
root@system-progrogramming:/home/admin# mkdir new_dir_outside_mount_point
root@system-progrogramming:/home/admin# ls
new_dir_outside_mount_point
root@system-progrogramming:/home/admin# ls /mnt
new_dir_inside_mount_point
root@system-progrogramming:/home/admin# exit
exit
admin@system-progrogramming: ls /mnt
admin@system-progrogramming: ls /home/admin
new_dir_outside_mount_point
```

위와 같이 새로운 마운트 네임스페이스에서 수행한 작업이라도 새로 마운트 포인트를 설정하고 해당 마운트 포인트 안에서 작업한 것과 그 외부에서 작업한 것의 부모 네임스페이스로의 귀속 여부가 다름을 확인할 수 있다.

지금까지 마운트 네임스페이스를 통한 마운트 작업 및 파일시스템 작업 격리에 대해 다루어보았는데, 여기서 중요하게 여겨지는 pivot_root 에 대해 추가적인 이야기를 하고자 한다.

### pivot_root

기존에는 마운트 네임스페이스를 사용해서 새로 격리 환경을 만들면, 기존 부모 네임스페이스의 사항을 전부 복사해오기 때문에 상위 디렉토리들에 대해서 접근이 어렵지 않았다. 이는 기존 정보들을 조회 가능한 상태로 만들기 때문에, 보안 상 취약점이 분명히 존재했다. 실제로 네임스페이스 기능은 멀티테넌시를 위해 사용되는 경우가 잦은데, 이런 경우 상위 디렉토리의 접근이 취약점으로 더욱 부각된다는 단점이 있었다.

본래 컨테이너 격리를 공부할 때 접하는 chroot를 이용해 생성한 격리 환경은 탈옥이 가능했는데, 이는 chroot의 내부 동작에서 root디렉토리가 절대 경로로 변경된 것이 아니고, 심링크를 이용해서 변경되었기 때문인데, 이는 soft link 특성 상 당연히 상위 디렉토리로 다시 접근할 수 있도록 여지를 주는 것이었다.

반면 pivot_root의 경우 새로운 마운트 네임스페이스 내에서 기존의 루트 파일시스템을 완전히 분리하게 되므로 루트 디렉토리의 상위에 아무것도 남지 않게 된다. 루트 디렉토리를 완전히 변경해버리기 때문에 탈옥이 불가능하며, 이러한 점을 이용해 완전한 격리 환경을 구성할 수 있다.

```bash
sudo unshare --mount /bin/bash
root@system-progrogramming:/home/admin# mount -t tmpfs tmpfs /mnt
root@system-progrogramming:/home/admin# mkdir /mnt/jail
root@system-progrogramming:/home/admin# pwd
/home/admin
root@system-progrogramming:/home/admin# cd /mnt/jail
root@system-progrogramming:/mnt/jail# ls
root@system-progrogramming:/mnt/jail# cd ..
root@system-progrogramming:/mnt# pivot_root . jail
root@system-progrogramming:/mnt# cd /
root@system-progrogramming:/# pwd
/
root@system-progrogramming:/# exit
exit
```


위 예시에서는 pivot_root를 통해서 마운트 네임스페이스 내 /mnt/jail 경로를 새로운 루트로 전환한다. 이후 `cd /` 를 통해 루트 디렉터리에 접근한 뒤에는 기존 마운트는 없어지므로 다시 돌아갈 수 없다.


## IPC Namespace

IPC(inter-process communicatioon) 네임스페이스는 프로세스 간 통신 리소스를 격리할 때 사용된다. 기본적으로 컨테이너가 프로세스 단위로 수행되는 가상화 기술이기 때문에, 프로세스 간 통신을 통제하는 IPC 네임스페이스 또한 그 중요성이 높다.

IPC 네임스페이스에서 격리하는 자원은 주로 다음과 같다.
- System V IPC 객체 (shared memory, message queue, semaphore)
- POSIX message
그냥 예전 IPC 객체 표준과 최근 표준 둘 다 지원한다고 생각하면 된다. 평소 알고 있는 Pipe, Socket 등도 포함된다.

즉, 여러 프로세스 간에 통신에 사용되는 자원들을 별도로 격리하여, 해당 자원들에 허용된 프로세스만 접근하도록 한다. 이는 허용된 프로세스 간 통신만을 허용하고, 이외의 프로세스의 접근을 방지하여 보안을 높이는 수단으로 작용한다.

IPC 네임스페이스는 자체적으로 System V IPC 식별자와 독립적인 POSIX 메세지큐 파일시스템을 가진다. 따라서 다른 IPC 네임스페이스와 자원을 공유하지 않도록 한다.

컨테이너 환경에서 기본적으로 컨테이너는 동일 pod 내에서만 IPC 리소스를 공유하도록 제한되며, 이는 컨테이너 간에 독립적인 IPC 네임스페이스를 가지도록 해 서로 간의 간섭이 없도록 보장하기 위해서 사용된다.

또한 쿠버네티스 환경에서는 컨테이너의 IPC 격리를 유지하기 위해 `hostIPC: false` 옵션을 설정하여 각 파드가 호스트 리소스에 접근하지 못하도록 방지하는 등의 설정을 진행한다.

## Cgroup Namespace

Cgroup 네임스페이스는 실제 cgroup 도구의 동작과는 별개로, cgroup을 이용한 자원의 할당 현황을 서로가 보지 못하도록 격리하는 기능이라고 생각한다. cgroup을 이용해서 여러 프로세스에 대한 컴퓨팅 자원 사용을 제한했다고 할 때, 각 프로세스를 cgroup 네임스페이스를 이용해 격리함으로써 부모 네임스페이스에서 어떻게 컴퓨팅 자원을 할당하고 있고 어떻게 멀티테넌시를 관리하는지 등을 알지 못하도록 방지할 수 있다.

또한 컨테이너 기술에서 각 컨테이너가 자체 cgroup 뷰를 가지도록 하면서, 각 격리된 환경의 자원을 추가적으로 구분하고 제한하도록 권한을 위임할 수 있다.

이렇게 격리하게 되는 경우 격리된 환경에서는 자신이 전체 시스템의 루트 cgroup에 속한다고 간주하게 되며, 다른 부모 네임스페이스의 cgroup에 대해 인지 및 접근이 불가하다.

자세한 내용은 cgroup 자체의 기능에 담겨져 있으며, 이는 단순히 cgroup 간의 격리를 수행하고 독립적인 뷰를 제공한다는 것에 초점을 맞추고 넘어가고자 한다.

## Network Namespace

프로세스의 **네트워크 환경을 분리**하는 네임스페이스이다. 네트워크 환경을 분리하면 네임스페이스에 속한 프로세스들에 새로운 IP를 부여하거나 네트워크 인터페이스를 추가하는 것이 가능해진다. 이는 iproute2 내 도구 중 하나인 ip를 활용해서 조작 가능하다(내부적으로 netlink를 사용하는 것).

Network 네임스페이스를 이용한 네트워크 격리와 여러 네트워크 아키텍쳐 설계와 관련하여서는 다른 글에서 조금 더 자세히 다뤄보고자 한다.

## UTS Namespace

UTS 네임스페이스는 호스트 네임과 NIS 도메인 이름을 격리하는 네임스페이스이다. 네트워크 네임스페이스와 함께 네트워크 격리를 목적으로 사용된다.

UTS는 Unix Timesharing System이라는 뜻인데, 사실상 시간 공유와는 무관하다.

UTS 네임스페이스를 사용하면 프로세스 간에 각자 독립적인 호스트명을 가지도록 할 수 있다. 이는 하나의 컴퓨터 안에서 각 프로세스가 독립적인 호스트로 승격된 형태를 띄도록 만들 수 있음을 보여준다.

UTS 네임스페이스도 위와 동일하게 unshare를 이용해서 생성하게 된다.

```bash
sudo unshare --uts /bin/bash
```

앞서 mount 네임스페이스와 같이 실행파일을 지정해주는 형태를 띈다.

이후 해당 격리된 네임스페이스 고유의 호스트 네임을 가질 수 있으며, 이러한 기능은 아래와 같은 상황에서 요긴하게 사용된다.

- 컨테이너 가상화: 사실 네임스페이스 전부를 열심히 사용해서 만든 것이 컨테이너 기반 가상화이기 때문에,,,안 쓰일 일이 없다. 대규모 컨테이너 환경에서 단일 물리 호스트 내부에 여러 호스트를 가지도록 하는 등의 확장된 설정들을 가능하게 한다.
- 웹서버: SSL인증서 등의 동작이 호스트이름을 기준으로 하기 때문에, 각 웹서버 인스턴스가 올바른 호스트명을 가지도록 조작할 때 사용 가능하다.
- 네트워크 시뮬레이션: 서로 다른 호스트명을 가진 격리 환경을 구성하면 다양한 네트워크 토폴로지를 설계 및 테스트 가능하다.
- 로그 관리 및 프로세스 식별: 로그 파일 검색 혹은 프로세스 추적 시에 호스트명을 통해 더욱 쉽게 식별이 가능하다. 특히 동적 IP 기반 환경에서 호스트를 식별하기 용이하게 만들어준다.

앞선 마운트 네임스페이스와 비슷하게 UTS 네임스페이스도 해당 네임스페이스에서 실행 중인 마지막 프로세스가 종료되면 함께 삭제된다(모든 리눅스 네임스페이스의 기본적인 생명주기 규칙이라고 한다).

```bash
sudo unshare -u
root@system-progrogramming:/home/admin# hostname
system-progrogramming
root@system-progrogramming:/home/admin# hostname new
root@system-progrogramming:/home/admin# hostname
new
root@system-progrogramming:/home/admin# exit
logout
admin@system-progrogramminghostname
system-progrogramming
```

위 예시처럼 간단하게 호스트네임 격리를 수행하여 프로세스마다 별도의 호스트네임을 가지도록 설정할 수 있다.

### Ref

https://bunny.net/academy/computing/what-is-a-linux-namespace-and-container-isolation/
https://blog.nginx.org/blog/what-are-namespaces-cgroups-how-do-they-work
[5.16 Do not share the host's IPC namespace](https://www.tenable.com/audits/items/CIS_Docker_1.11.0_v1.0.0_L1.audit:ce786421cd193850391b76a0de59f100)
[ipc_namespaces\(7\) - Linux manual page](https://man7.org/linux/man-pages/man7/ipc_namespaces.7.html)
[Building a container by hand using namespaces: The UTS namespace](https://www.redhat.com/en/blog/uts-namespace)
[The 7 most used Linux namespaces](https://www.redhat.com/en/blog/7-linux-namespaces)
https://www.44bits.io/ko/keyword/linux-namespace
https://westlife0615.tistory.com/910#5
[리눅스 NameSpace에 대해 알아보자](https://jaykos96.tistory.com/31)
[Kubernetes Namespaces VS Linux Namespaces \(Pause 컨테이너\)](https://everenew.tistory.com/382)