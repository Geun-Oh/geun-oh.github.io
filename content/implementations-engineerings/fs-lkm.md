+++
title = '[System Engineering] How to improve kernel observability with LKM code modification'
date = 2025-04-04T01:01:23+09:00
draft = false
+++

# Loadable Kernel Modules & Micro Kernel

Loadable Kernel Modules (이하 LKM)은 기존의 모놀리식 커널의 유연성을 높이고, 다양한 형태의 커스텀이 가능하도록 오픈소스로서의 기능을 높인 하나의 큰 전환점이라고 할 수 있다.

마이크로 커널이 다양한 커널을 처음부터 내 마음대로 쌓아 올리는 벽돌집과 같다면, LKM을 이용한 커널은 단순히 기존 붙박이장과 같은 내장 가구를 제거하고 나만의 가구들로 채우는 것이라고 이해하면 좋다.

이는 실제 둘의 출발점이 다르기 때문인데,

마이크로 커널은 애초에 '커널의 최소화' 를 위한 것이다. 가장 고유하고 필수적인 기능만 있는 기초적인 커널 위에 엔지니어가 직접 자신이 필요한 기능들을 고유하게 추가하여 만들 수 있는 DIY를 추가한 것이다. 이러한 점은 매우 높은 모듈성을 기반으로 하는 개인화와 더불어 추가적인 안정성과 보안, 장애 격리 등을 장점으로 가지고 있다고 할 수 있다.
다만 이는 커널의 사용자 공간으로의 침투가 매우 큰 부분 일어나기 때문에, 안정성과 보안을 제대로 확보하지 못하면 큰 문제를 야기할 수 있다. 물론 커널 공간과 사용자 공간을 계속 왕복해야하는 것도 큰 성능 오버헤드를 야기하는 부분이 된다.

반면 LKM의 경우, 모놀리식 커널에서의 동적 확장을 목적으로 한다. 기본적인 모놀리식 커널의 장점을 그대로 반영하되, 현대화된 기능들을 추가적으로 제공하거나 별도의 확장 가능한 시스템을 위한 가능성을 열어준 느낌이라고 생각하면 좋을 것 같다. 이는 기존의 매우 큰 생태계를 강하게 가지고 있는 리눅스 커널에서 지원됨으로써, 이 글에서 진행할 동적인 기능 추가에 '모듈 단위 빌드' 를 통해 전체 커널을 매번 빌드해야하는 소요를 없애 생산성을 크게 높였고 (실제로 커널 빌드 한 번 해보면 이게 얼마나 생산성 향상을 가져오는지 체감할 수 있다.), 커널 공간에서 실행하여 보안, 성능 등의 기본적인 사항들을 무리없이 제공받을 수 있다는 점에서 장점을 가진다.

# Debugging Kernel

커널을 디버깅하는 것은 어려운 문제이다. 실제로 커널 공간의 작업들은 매우 격리된 환경에서 이루어지기 때문에, 시스템 프로그래밍을 직접 하는 것이 아니면 사실상 건드리지 않을 영역으로 여겨진다.
그러나 최근 클라우드 네이티브의 가상화된 환경에서 커널 단의 작업들에 대한 엔지니어링이 대두되면서, eBPF 와 같은 도구들을 기반으로 하는 커널 관찰가능성이 큰 토픽으로 자리하고 있다.

그렇기에 앞으로 클라우드 네이티브 환경에서 살아가고자 한다면, 커널을 간단하게 커스텀하고 이에 대한 모니터링을 함으로써 관찰가능성을 향상시키는 방안들을 탐구하는 것이 필수적으로 다가오지 않을까 싶다.
오늘은 그에 대한 일환으로, 커널 단의 코드에 디버깅 할 수 있도록 코드를 추가하고, 이를 기반으로 출력되는 데이터들을 확인해보자.

### printk vs \*trace

두 방법은 Unix 계열의 커널에서 사용되는 가장 대표적인 로깅 도구이다. 이외에는 eBPF등의 고도화된 도구가 있거나, 두 도구와 함께 사용되는 syslog 등이 소개되고 있기에 우선 둘만 생각한다.

#### \*trace

\*trace는 리눅스 커널에서의 대표적인 추적 도구인데, ptrace, ftrace 등 각자 추적하는 요소에 따라 이름이 다르다. 각자 추적하는 요소에 대한 정보들을 세세하게 추적하고, 관련 정보를 제공한다고 생각하면 된다. ptrace는 프로세스 관련, ftrace는 함수 관련이다.
일반적으로 커널을 디버깅하는 경우에는 함수 단위의 실행 여부, 관련 이벤트나 레이턴시 등을 확인하는 경우가 많아 ftrace가 보편적으로 사용되는 듯하다.

이외에도 ptrace같은 경우 유저 공간에서 시스템 콜 이력을 추적하는 도구인 strace의 기반이 되는 등 알게모르게 아주 유용하게 사용되고 있다.

#### printk

printk 는 해당 글에서 주로 사용할 도구이며, dmesg라고 하는 별도 버퍼에 로깅을 진행하고, 추후 해당 dmesg를 조회해서 로그를 출력하는 형태를 띈다.

단순히 메세지를 출력하고, 관련 로그를 남긴다. 아래 소개할 \*trace처럼 다양한 기능을 추상화해서 제공하지는 않지만, 엔지니어가 직접 로그를 다양하게 커스텀하여 남길 수 있다.

일반적으로 로그에 버전을 두고 있어서, 관찰가능성을 로그 레벨을 기반으로 조절할 수 있다는 것이 장점으로 생각된다.

실제로 다음과 같이 조회하면, 4 정도의 로그 레벨을 가지고 있을 것이다.

```sh
cat /proc/sys/kernel/printk
4  4  1  7
# 위 숫자는 순서대로 다음과 같다.
#
# 1. 현재 설정된 로그 레벨
# 2. printk()에서 로그 레벨을 명시하지 않은 경우 적용되는 로그 레벨
# 3. 설정 가능한 최소한의 로그 레벨 (최고 위험도 수준)
# 4. Default
```

printk에 대한 각 로그 레벨에 대한 구체적인 내용은 다음과 같다.

| Name         | Log Level | Alias         | Description                             |
| ------------ | --------- | ------------- | --------------------------------------- |
| KERN_EMERG   | "0"       | `pr_emerg()`  | 긴급한 수준의 메세지를 출력             |
| KERN_ALERT   | "1"       | `pr_alert()`  | 경고 수준의 메세지를 출력               |
| KERN_CRIT    | "2"       | `pr_crit()`   | 치명적 수준의 메세지를 출력             |
| KERN_ERR     | "3"       | `pr_err()`    | 에러 수준의 메세지를 출력               |
| KERN_WARNING | "4"       | `pr_warn()`   | 경고 수준의 메세지를 출력               |
| KERN_NOTICE  | "5"       | `pr_notice()` | 주의 수준의 메세지를 출력               |
| KERN_INFO    | "6"       | `pr_info()`   | 설명 수준의 메세지를 출력               |
| KERN_DEBUG   | "7"       | `pr_debug`    | 디버그 수준의 메세지를 출력             |
| KERN_DEFAULT | ""        | `-`           | 기본적인 커널 로그 레벨의 메세지를 출력 |
| KERN_CONT    | "c"       | `pr_cont()`   | 이전 로그 메세지와 같은 라인에서 출력   |

우리는 오늘 KERN_DEBUG 를 사용해서 레벨 7 수준의 로그를 출력할 예정이기 때문에, 다음과 같이 로그 레벨을 조정해주자.

```sh
echo 8 > /proc/sys/kernel/printk
```

8보다 숫자가 작은 (위험도가 높은) 수준의 로그를 모두 버퍼에 저장하게 된다.

### BTRFS (B-tree file system)

ext4와 가장 많이 비교되고, 대중적인 파일시스템이다. ext4는 리눅스의 기본이자 리눅스와 함께 진화한 대표적인 파일 시스템인데, 둘 다 매우 대중적이다.

여기서는 파일 시스템 비교는 간단히 넘어가고자 한다.

btrfs의 경우 CoW (Copy on Write)을 제공하고, 이를 기반으로 하는 높은 데이터 손상 방지를 제공한다.
이외에도 SSD에 최적화된..등의 여러 장점들이 있기에 실제로 NAS와 같은 데이터를 보관하는 형태의 워크스테이션들에서 매우 자주 사용된다고 알려져 있다.

리눅스 커널 (본 필자는 6.13.5를 사용할 예정이다)에서는 btrfs가 처음부터 LKM으로 설치되어 있기 때문에, 이 코드를 직접 수정하고 바로 교체해보려고 한다.

특정 시스템이 해당 커널에 모듈로 설치되어있는지 확인하고 싶다면, menuconfig 명령어로 커널의 설정에 진입하여 모듈들의 tristate를 확인하자.

- built-in(y): 커널에 포함되어 처음부터 함께한다. LKM으로 변경하는 것이 아니라면 코드 수정 시 전체 빌드가 필요하다.
- moduel(m): LKM으로 빌드되어 탈부착 가능해진다.
- disable(n): 비활성화.

또한 LKM을 활성화하고 코드를 동적으로 수정하고 싶다면, menuconfig에서 Loadable Module Support 항목을 확인하자. Enable이면 동적인 모듈 로딩이 가능하다.

그 외에도 방법은 많으니, 각자 편한 방법으로 확인하자.

### Module Build

일단 리눅스 커널 소스코드의 `fs/btrfs/` 경로에는 기본적인 btrfs의 vfs 인터페이스에 대한 동작들이 구현되어있다. 관련해서 나는 오늘 write() 작업 실행에 대한 로깅을 추가할 것이기 때문에, `fs/btrfs/file.c`로 들어가준다.

여기서, 실제로 작업을 하게 되는 함수는 `btrfs_buffered_write()`, `btrfs_do_write_iter()` 등이 있는데, 이걸 알려면 앞서 언급한 ftrace 등의 도구를 통해 함수 추적을 진행하거나, 검색하거나,,,(필자는 검색을 했다)

그리고 커널이 실제로 다양한 버전을 거쳐오고, 여러 호환성을 제공하기 위해서 추상화를 정말 많이 진행해왔기 때문에 실제 함수 호출이 매우 빈번하게 일어난다.
그러니 뭔가 내가 원하는 동작을 수행할 것 같은 친구라면 해당 함수에 추적기를 달거나 디버깅 코드를 추가하는 식으로 직접 찾아내보는 것도 좋지 않을까 싶다.

아무튼 이렇게 로깅할 함수를 찾았다면 printk() 를 통해서 로그를 남겨주자.

`fs/btrfs/file.c`

```c
static ssize_t btrfs_file_write_iter(struct kiocb *iocb, struct iov_iter *from)
{
        printk(KERN_DEBUG "[BTRFS_DEBUG] Entering btrfs_do_write_iter\n");

        return btrfs_do_write_iter(iocb, from, NULL);
}
```

이런 식으로 함수 호출 스택 중간에도 로깅을 남기고,

`fs/btrfs/file.c`

```sh
ssize_t btrfs_do_write_iter(struct kiocb *iocb, struct iov_iter *from,
                            const struct btrfs_ioctl_encoded_io_args *encoded)
{
        struct file *file = iocb->ki_filp;
        struct btrfs_fs_info *fs_info = btrfs_sb(file_inode(file)->i_sb);
        char *path_buf = kmalloc(PATH_MAX, GFP_KERNEL);
        struct timespec64 ts;
        const char *path_str = "unknown";
        struct btrfs_inode *inode = BTRFS_I(file_inode(file));
        ssize_t num_written, num_sync;

        pr_emerg("HELLO WORLD!!!!\n");

        /* 로깅 시작 */
        if (path_buf) {
            char *path = d_path(&file->f_path, path_buf, PATH_MAX);
            if (!IS_ERR(path)) path_str = path;
        }

        ktime_get_real_ts64(&ts);
        printk(KERN_DEBUG "[BTRFS_WRITE] Path: %s, Inode: %llu, Offset: %lld, Time: %lld.%09ld\n",
               path_str,
               btrfs_ino(BTRFS_I(file_inode(file))),  // Btrfs 전용 inode 번호
               iocb->ki_pos,
               (s64)ts.tv_sec,
               ts.tv_nsec);

        printk(KERN_INFO "[BTRFS_WRITE] Path: %s, Inode: %llu, Offset: %lld, Time: %lld.%09ld\n",
               path_str,
               btrfs_ino(BTRFS_I(file_inode(file))),  // Btrfs 전용 inode 번호
               iocb->ki_pos,
               (s64)ts.tv_sec,
               ts.tv_nsec);
        if (path_buf) kfree(path_buf);
        /* 로깅 끝 */
		...
};
```

이런 식으로 실제 함수 코드 하단에 관련된 정보들을 추가하고자 로깅을 더했다.

또한, 맨 앞단에 다음과 같은 모듈 버전에 대한 명시를 추가해서 내가 수정한 코드가 정확히 빌드되고 반영되는지 확인하자.

```c
#include <linux/printk.h>
#include <linux/path.h>
#include <linux/timekeeping.h>
#include <linux/fs.h>
#include <linux/time.h>
#include <linux/init.h>
#include <linux/string.h>
# ... other header files ...

/*
 *Hyeonggeun's own version control
 */
MODULE_VERSION("1.0.3-custom");
```

이렇게 하고, 모듈을 새로 빌드한다.

> _기존에 해당 커널은 전체 빌드 및 부트로딩을 마쳤다고 가정한다._

```sh
# 최대 4개의 코어(job)을 수행 가능한 btrfs 모듈을 빌드한다.
make -j4 M=fs/btrfs
```

이후에, 해당 모듈을 설치해준다.

```sh
make j4 M=fs/btrfs modules_install
```

이제 커널에서 해당 모듈을 설치해주었기 때문에 loadable 한 모듈이 설치됨을 인식했을 것이다.
해당 모듈이 설치되었는지 확인하자.

```sh
modinfo btrfs | grep version
```

결과는 다음과 같이 나온다.

```sh
version:        1.0.3-custom
srcversion:     1182D3CE6E2E5F34E45378A
vermagic:       6.13.5.sp SMP preempt mod_unload modversions aarch64
```

version에 대한 코드는 내가 추가해주었기 때문에 기존에 없던 것이 추가된 것이다. 내가 표기한 버전과 동일함을 확인하자.

이후에, 설치된 모듈을 기존 모듈과 바꿔끼는 과정을 거치자.
이를 위해서는 기존 모듈을 사용하고 있지 않음이 보장되어야한다.

btrfs와 같은 파일 시스템의 경우, 해당 파일시스템을 기반으로 마운트된 디렉토리가 없어야한다.

```sh
rmmod btrfs
insmod btrfs
```

LKM은 모듈 삭제와 설치가 쉬운 편이라. 위와 같이 새로운 모듈을 불러와주자.

이후에 write() 작업이 수행되도록 btrfs 기반의 디렉토리를 마운트해주고, 특정 파일을 새로 쓰게 되면 다음과 같이 dmesg 내에 레벨 7의 로그가 추가된다.

```sh
dmesg -l 7

[ 4455.969888] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 0, Time: 1743682870.219685782
[ 4455.969925] [BTRFS] write operation executed
[ 4455.977421] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 10485760, Time: 1743682870.227218969
[ 4455.977460] [BTRFS] write operation executed
[ 4455.983422] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 20971520, Time: 1743682870.233219361
[ 4455.984047] [BTRFS] write operation executed
[ 4455.989617] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 31457280, Time: 1743682870.239415169
[ 4455.989932] [BTRFS] write operation executed
[ 4455.995473] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 41943040, Time: 1743682870.245270852
[ 4455.996446] [BTRFS] write operation executed
[ 4456.002150] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 52428800, Time: 1743682870.251948328
[ 4456.002706] [BTRFS] write operation executed
[ 4456.007403] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 62914560, Time: 1743682870.257201134
[ 4456.007827] [BTRFS] write operation executed
[ 4456.013150] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 73400320, Time: 1743682870.262947525
[ 4456.013757] [BTRFS] write operation executed
[ 4456.018874] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 83886080, Time: 1743682870.268671499
[ 4456.019758] [BTRFS] write operation executed
[ 4456.025081] [BTRFS_WRITE] Path: /home/admin/app/system_programming/prac1/btrfs_dir/testfile, Inode: 257, Offset: 94371840, Time: 1743682870.274878724
[ 4456.025511] [BTRFS] write operation executed
```

---

위와 같이 커널 코드를 수정해서 직접 로깅을 추가하고, 관찰가능성을 높일 수 있다.

사실 처음에는 `make -j4 fs/btrfs modules_install` 이후에 모듈 로딩이 완료된 줄 알고 (버전도 새 버전으로 표기해줌..) 로깅 안 된다고 많이 헤맸는데, 바로잡을 수 있어 다행이다.
