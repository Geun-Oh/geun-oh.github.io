+++
title = '[RDBMS with zig] - RocksDB Interface'
date = 2025-03-09T18:38:09+09:00
draft = false
+++

> Zig의 allocator와 comptime에 대한 이해를 더하기 위해, facebook의 RocksDB를 기반으로 하는 RDBMS를 구성한다.
> RocksDB Header file을 불러와 직접적으로 RocksDB API와 소통하는 인터페이스를 제작한다.
>
> 모든 코드는 https://notes.eatonphil.com/zigrocks-sql.html 레포지토리를 기반으로 하며,
> 추가적인 기능을 구현하는 내용을 포함한다.

# RocksDB Interface

RocksDB는 고성능의 Persistent Key-Value Store로 c++로 작성되었기에 zig에서는 빌드된 내용을 header file을 import하여 소통할 수 있다.

> Zig는 내부적으로 Clang 컴파일러를 내장하고 있어, `@cimport()`를 사용하여 c 헤더파일을 가져오는 경우 내부적으로 Clang을 활용하여 AST를 만들고 이를 Zig 코드로 변환하는 과정을 거친다.

이제, RocksDB 기능을 가져와 기본적인 I/O를 수행하는 함수들을 작성하자.

**Ready for**

본격적인 I/O 작업 이전에, 문자열에 대한 온전한 소유권을 보장받고 관련 작업을 이어나가야 한다. 이에 대해서는 메모리 관리와 소유권 관련 이슈가 있는데, 자세히 풀어보면 아래와 같다.

1. 메모리 소유권
- 입력으로 받은 문자열은 함수 외부에서 관리된다. 따라서 별도 과정에서 해당 문자열이 변경되는 여지가 있고, 이는 예상치 못한 동작을 야기한다. 고로 문자열에 대한 안전한 수정을 위해 별도의 복사가 필요하다.
2. 메모리 안정성
- 만약 외부의 작업으로 문자열이 해제된다면, Dangling Resource 발생 여지가 있다.

비록 문자열을 복사하는 것이 추가적인 메모리 사용량을 발생시키지만, 이에 대해서는 개인적으로 다음과 같은 최적화가 가능하지 않을까 싶다.

- 소유권 이전: 너무 Rust쪽 개념인 듯 보이지만,,,결과적으로 복사가 아닌 소유권 이전을 통해 추가 메모리 소요를 막고 동일 작업을 진행할 수 있을 것이다.
- 메모리 풀 사용: 메모리 풀을 사용하면, 할당 및 해제 지연을 줄이고 단편화를 막는 관점에서 최적화가 가능할 것 같다.

이제 관련 함수들을 작성해보자. 문자열 복사는 두 종류로 나뉘는데, zig 내장 로직에서온 문자열을 복사하는 일반 복사와 c 기반 로직에서 온 문자열을 복사하는 null-termination복사가 존재한다. null-termination복사는 \0이 나올 때까지 복사하여 길이가 미정인 문자열을 복사하는 함수라고 생각하면 좋을 것 같다.

```zig
    // Used for copying string in zig internal api logic.
    fn ownString(self: RocksDB, string: []u8) []u8 {
        const result = self.allocator.alloc(u8, string.len) catch unreachable;
        std.mem.copyForwards(u8, result, string);
        std.heap.c_allocator.free(string);
        return result;
    }

    // Used for copying string in c based null-termination strings.
    fn ownZeroString(self: RocksDB, zstr: [*:0]u8) []u8 {
        const spanned = std.mem.span(zstr);
        const result = self.allocator.alloc(u8, spanned.len);
        std.mem.copyForwards(u8, result, spanned);
        std.heap.c_allocator.free(zstr);
        return result;
    }
```

### Open & Close

RocksDB 인스턴스를 만들고 제거하는 기능을 한다.

```zig
    pub fn open(allocator: std.mem.Allocator, dir: []const u8) union(enum) { val: RocksDB, err: []u8 } {
        const options: ?*rdb.rocksdb_options_t = rdb.rocksdb_options_create();
        rdb.rocksdb_options_set_create_if_missing(options, 1);
        var err: ?[*:0]u8 = null;
        const db = rdb.rocksdb_open(options, dir.ptr, &err);
        const r = RocksDB{
            .db = db.?,
            .allocator = allocator,
        };
        if (err) |errStr| {
            return .{
                .err = std.mem.span(errStr),
            };
        }
        return .{
            .val = r,
        };
    }

    pub fn close(self: RocksDB) void {
        rdb.rocksdb_close(self.db);
    }
```

### Set

`rdb.rocksdb_put()` 메서드를 사용해서 RocksDB에 key-value pair를 저장하는 역할을 한다.

```zig
    pub fn set(self: RocksDB, key: []const u8, value: []const u8) ?[]u8 {
        const writeOptions = rdb.rocksdb_writeoptions_create();
        var err: ?[*:0]u8 = null;
        rdb.rocksdb_put(self.db, writeOptions, key.ptr, key.len, value.ptr, value.len, &err);
        if (err) |errStr| {
            return std.mem.span(errStr);
        }

        return null;
    }
```

### Get

`rdb.rocksdb_get()` 메서드를 사용해 RocksDB에 key 를 기반으로 value를 조회한다. 반환 값이 문자열의 포인터가 되므로, 이를 `ownString`을 사용해서 복사해 온전한 소유권을 획득한다. 본래는 길이를 모르는 경우 `ownZeroString`을 사용하지만, 현재는 vallen 값에 value의 길이값을 담아오기 때문에 `ownString`을 사용하여 메모리를 올바르게 사용하도록 한다.

```zig
    pub fn get(self: RocksDB, key: []const u8) union(enum) { val: []u8, err: []u8, not_found: bool } {
        const readOptions = rdb.rocksdb_readoptions_create();
        var vallen: usize = 0;
        var err: ?[*:0]u8 = null;
        const v = rdb.rocksdb_get(self.db, readOptions, key.ptr, key.len, &vallen, &err);

        if (err) |errStr| {
            return .{
                .err = std.mem.span(errStr),
            };
        }

        if (v == 0) {
            return .{ .not_found = true };
        }

        return .{ .val = self.ownString(v[0..vallen]) };
    }
```

### Iter

여타 Key-Value Store가 그렇듯이 RocksDB에서도 key값 조회를 위해 `iterator`라는 단위를 사용하는데, 하나의 iterator 인스턴스를 제작한 뒤 key와 value를 각각 돌면서 입력받은 key (혹은 value)가 일치하는지 여부에 따라 추가적인 작업을 수행하도록 조치한다.

따라서 우리도 기본적인 Iter 구조체를 생성하여 `SELECT` keyword에 대한 조회를 수행하도록 해야한다.

```zig
    pub const IterEntry = struct {
        key: []const u8,
        value: []const u8,
    };

    pub const Iter = struct {
        iter: *rdb.rocksdb_iterator_t,
        first: bool,
        prefix: []const u8,

        pub fn next(self: *Iter) ?IterEntry {
            if (!self.first) {
                rdb.rocksdb_iter_next(self.iter);
            }

            self.first = false;
            if (rdb.rocksdb_iter_valid(self.iter) != 1) {
                return null;
            }

            var keySize: usize = 0;
            var key = rdb.rocksdb_iter_key(self.iter, &keySize);

            if (self.prefix.len > 0) {
                if (self.prefix.len > keySize or !std.mem.eql(u8, key[0..self.prefix.len], self.prefix)) {
                    return null;
                }
            }

            var valueSize: usize = 0;
            var value = rdb.rocksdb_iter_value(self.iter, &valueSize);

            return IterEntry{
                .key = key[0..keySize],
                .value = value[0..valueSize],
            };
        }

        pub fn close(self: Iter) void {
            rdb.rocksdb_iter_destroy(self.iter);
        }
    };
```

하나의 Key-Value pair 단위가 되는 `IterEntry`를 제작하고, 이를 기반으로 `Iter` 구조체를 제작한다.

그리고, 특정 prefix를 입력으로 받아 부합하는 Key-Value pair를 제작하는 `iter()` 함수를 제작한다.

```zig
    pub fn iter(self: RocksDB, prefix: []const u8) union(enum) { val: Iter, err: []u8 } {
        const readOptions = rdb.rocksdb_readoptions_create();
        var it = Iter{
            .iter = undefined,
            .first = true,
            .prefix = prefix,
        };

        it.iter = rdb.rocksdb_create_iterator(self.db, readOptions).?;

        var err: ?[*:0]u8 = null;
        rdb.rocksdb_iter_get_error(it.iter, &err);
        if (err) |errStr| {
            return .{
                .err = std.mem.span(errStr),
            };
        }

        if (prefix.len > 0) {
            rdb.rocksdb_iter_seek(
                it.iter,
                prefix.ptr,
                prefix.len,
            );
        } else {
            rdb.rocksdb_iter_seek_to_first(it.iter);
        }

        return .{ .val = it };
    }
```