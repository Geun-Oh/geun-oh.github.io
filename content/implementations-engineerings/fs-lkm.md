+++
title = '[System Engineering] How to improve kernel observability with LKM code modification'
date = 2025-04-04T01:01:23+09:00
draft = false
+++

# Loadable Kernel Modules & Micro Kernel

Loadable Kernel Modules (hereinafter referred to as LKM) stretches standard monolithic kernel's flexibility, and become a enormous turning point that expanded its facilities which are work as as an open source so developers can reform it without building the whole kernel agian. If a microkernel is like a brick house where developer can build different kernels from scratch, then building kernel with LKM is simply removing the built-in furniture, such as built-in cabinets, and filling it with their own furniture with ease.

It can be enabled because they have different start lines.
Microkernel aims to "kernel's minimization". It fully works as DIY to developer so they can add modules which they really need with only base module that essential features are supported. This architecture design provides not only highly engineer-depended personalization based on modulability and also additional stability and security, fault tolerance as pros.  
But this inevitably derives user-space penetration of kernel features which built and loaded by engineer. So if they do not get ready for external threats and error situations enough, it can evoke massive faults. Also performance downgrade which caused by frequent switching between user-space and kernel-space is a big part of its cons.

By the way, LKM aims to a dynamic expansion of kernel features in solid monolithic kernel architecture. It basically reflects traditional benefits of monolithic architecture, and additionally opens a 'loadable' modern features with format of module that can be expanded for the purpose of dynamic system. It strongly supported by linux kernel, which has a big power in kernel ecosystem (since it has numerous descendants which are rooted in linux and unix system), empowered kernel's productivity by removing redundant times that comes from building unchanged linux kernel modules because it forced to build the whole linux source code to change features which are not provided by LKM. You can also experience how much time takes to built the whole linux kernel.
Unlike microkernel, dynamically loaded features are executed in kernel-space so we do not need to consider about switching overheads.

# Debugging Kernel

It is a hard part to debug kerenl. Since kernel space operations are executed in highly isolated environment, it does not allowed to touch its source code in manual if you are not a system engineer. However, with the recent rise in the engineering of kernel-level operations in cloud native, virtualized environments, kernel observability based on tools like eBPF has become a hot topic.

Therefore, if you wanna live in a cloud native environment in the future, it'll be essential to explore ways to improve observability by simply customizing the kernel and monitoring it.
Today, as part of it, Let's add some debuggable code to kernel level source code, and see what data it produces.

### printk vs \*trace

These two methods are the most representative logging tools used in Unix like kernels. Other advances tools such as eBPF & syslog, which is used in conjunction with both tools, are introduced, so today I'll consider only these two methods.

#### \*trace

\*trace is the main tracing tool in the Linux kernel, with different names depending on what it traces, such as ptrace and ftrace. Each traces the details of the element it traces and provides
relevant infromation. ptrace is for processes, and ftrace is for functions.
In general, when debugging the kernel, ftrace seems to be the most commonly used tool because engineer often wanna check whether a function in the call stack is executing or not, related events or latency,,,et cetera.

In addition, ptrace is unknowingly very useful as the basis for strace, a tool that traces the history of system calls in user space.

#### printk

printk is the tool that I'll use primarily in this post, and it takes the form of logging to a seperate buffer called dmesg, and later querying that dmesg to print the log.

It simply prints a message and leaves the associated logs. It doesn't provide a lot of abstraction like \*trace below, but engineers can customize their own logs.

The advantage is that the logs are usually versioned, so the observability can be adjusted based on the log level.

In practice, if you query like this, you'll probably have a log level of 4.

```sh
cat /proc/sys/kernel/printk
4  4  1  7
# The numbers above represent the following in order:
#
# 1. Currently set log level
# 2. Log level applied when not specified in printk()
# 3. Minimum configurable log level (highest risk level)
# 4. Default
```

The specifics for each log level of printk are as follows.

| Name         | Log Level | Alias         | Description                                  |
| ------------ | --------- | ------------- | -------------------------------------------- |
| KERN_EMERG   | "0"       | `pr_emerg()`  | Outputs emergency level messages             |
| KERN_ALERT   | "1"       | `pr_alert()`  | Outputs alert level messages                 |
| KERN_CRIT    | "2"       | `pr_crit()`   | Outputs critical level messages              |
| KERN_ERR     | "3"       | `pr_err()`    | Outputs error level messages                 |
| KERN_WARNING | "4"       | `pr_warn()`   | Outputs warning level messages               |
| KERN_NOTICE  | "5"       | `pr_notice()` | Outputs notice level messages                |
| KERN_INFO    | "6"       | `pr_info()`   | Outputs informational level messages         |
| KERN_DEBUG   | "7"       | `pr_debug`    | Outputs debug level messages                 |
| KERN_DEFAULT | ""        | `-`           | Outputs messages at default kernel log level |
| KERN_CONT    | "c"       | `pr_cont()`   | Outputs on the same line as previous message |

Since I'm gonna use KERN_DEBUG to output level 7 logs today, let's adjust it as follows.

```sh
echo 8 > /proc/sys/kernel/printk
```

This will store all logs with levels less than 8 (higher risk levels) in the buffer.

### BTRFS (B-tree file system)

It is often compared with ext4 and is a popular filesystem. ext4 is the default filesystem of Linux and has evolved alongside Linux as a representative filesystem, and both are very popular.

Here, I'll briefly skip over the filesystem comparison.

BTRFS provides CoW (Copy on Write) and offers high data corruption prevention based on this feature.
Additionally, it has several advantages such as being optimized for SSDs, making it commonly used in workstations that store data like NAS systems.

In the Linux kernel (I'll be using version 6.13.5), BTRFS is installed as an LKM from the start, so I'll try to modify this code directly and replace it.

If you want to check whether a specific system is installed as a module in that kernel, use the menuconfig command to enter the kernel configuration and check the tristate of the modules.

- built-in(y): Included in the kernel from the start. If not changed to LKM, full build is required when modifying code.
- module(m): Built as LKM, can be attached and detached.
- disable(n): Disabled.

Also, if you want to enable LKM and modify code dynamically, check the Loadable Module Support item in menuconfig. If enabled, dynamic module loading is possible.

There are many other methods, so check them in your preferred way.

### Module Build

First, in the Linux kernel source code's `fs/btrfs/` path, the basic operations for BTRFS's VFS interface are implemented. Since I'll be adding logging for write() operations today, I'll go into `fs/btrfs/file.c`.

Here, the actual functions that perform the work are `btrfs_buffered_write()`, `btrfs_do_write_iter()`, etc. To find these, you can use tools like ftrace mentioned earlier to trace functions, or search for them (I used search).

And since the kernel has gone through various versions and provides multiple compatibilities, it has done a lot of abstraction, so function calls happen very frequently.
So if you find something that seems like it might perform the operation you want, it's good to try adding a tracer or debugging code to that function to find out directly.

Anyway, once you've found the function to log, let's add logs using printk().

`fs/btrfs/file.c`

```c
static ssize_t btrfs_file_write_iter(struct kiocb *iocb, struct iov_iter *from)
{
        printk(KERN_DEBUG "[BTRFS_DEBUG] Entering btrfs_do_write_iter\n");

        return btrfs_do_write_iter(iocb, from, NULL);
}
```

In this way, we can add logging in the middle of the function call stack, and

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

        /* Start logging */
        if (path_buf) {
            char *path = d_path(&file->f_path, path_buf, PATH_MAX);
            if (!IS_ERR(path)) path_str = path;
        }

        ktime_get_real_ts64(&ts);
        printk(KERN_DEBUG "[BTRFS_WRITE] Path: %s, Inode: %llu, Offset: %lld, Time: %lld.%09ld\n",
               path_str,
               btrfs_ino(BTRFS_I(file_inode(file))),  // Btrfs specific inode number
               iocb->ki_pos,
               (s64)ts.tv_sec,
               ts.tv_nsec);

        printk(KERN_INFO "[BTRFS_WRITE] Path: %s, Inode: %llu, Offset: %lld, Time: %lld.%09ld\n",
               path_str,
               btrfs_ino(BTRFS_I(file_inode(file))),  // Btrfs specific inode number
               iocb->ki_pos,
               (s64)ts.tv_sec,
               ts.tv_nsec);
        if (path_buf) kfree(path_buf);
        /* End logging */
	...
};
```

In this way, I've added logging to the bottom of the actual function code to add related information.

Also, let's add the following module version specification at the very beginning to verify that my modified code is built and reflected correctly.

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

After this, let's build the module again.

> _Assume that the kernel has already been fully built and bootloaded._

```sh
# Build the btrfs module with up to 4 cores (jobs)
make -j4 M=fs/btrfs
```

Then, install the module.

```sh
make j4 M=fs/btrfs modules_install
```

Now that we've installed the module in the kernel, it should recognize that a loadable module has been installed.
Let's check if the module is installed.

```sh
modinfo btrfs | grep version
```

The result will be as follows.

```sh
version:        1.0.3-custom
srcversion:     1182D3CE6E2E5F34E45378A
vermagic:       6.13.5.sp SMP preempt mod_unload modversions aarch64
```

The version code was added by me, so it's something that didn't exist before. Let's verify that it matches the version I specified.

After this, let's go through the process of replacing the installed module with the existing one.
For this, it must be guaranteed that the existing module is not in use.

For filesystems like btrfs, there should be no directories mounted based on that filesystem.

```sh
rmmod btrfs
insmod btrfs
```

LKM makes module removal and installation easy, so let's load the new module as shown above.

After this, if you mount a directory based on btrfs and write to a specific file, level 7 logs will be added to dmesg as follows.

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

From now on, we can improve observability by modifying kernel source code in manual and add logging logics as belows.

Honestly, I was confused at first because I thought the module was loaded after `make -j4 fs/btrfs modules_install` (and the version was new...), so I didn't log it, but I'm glad I was able to fix that.
