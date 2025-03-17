+++
title = '[RDBMS with zig] - Storage'
date = 2025-03-16T19:11:58+09:00
draft = false
+++

> Zig의 allocator와 comptime에 대한 이해를 더하기 위해, facebook의 RocksDB를 기반으로 하는 RDBMS를 구성한다.
> 데이터를 저장하기 위한 직렬화 / 역직렬화를 수행하는 코드를 작성한다.
>
> 모든 코드는 https://notes.eatonphil.com/zigrocks-sql.html 레포지토리를 기반으로 하며,
> 추가적인 기능을 구현하는 내용을 포함한다.

이제는 RocksDB에 데이터를 저장할 때의 직렬화 및 데이터 조회 시 역직렬화를 위한 코드를 작성한다.

## Serialize & Deserialize

```zig
pub fn serializeInteger(comptime T: type, buf: *std.ArrayList(u8), i: T) !void {
    var length: [@sizeOf(T)]u8 = undefined;
    std.mem.writeInt(T, &length, i, std.builtin.Endian.big);
    try buf.appendSlice(length[0..8]);
}

pub fn deserializeInteger(comptime T: type, buf: String) T {
    return std.mem.readInt(T, buf[0..@sizeOf(T)], std.builtin.Endian.big);
}

pub fn serializeBytes(buf: *std.ArrayList(u8), bytes: String) !void {
    try serializeInteger(u64, buf, bytes.len);
    try buf.appendSlice(bytes);
}

pub fn deserializeBytes(bytes: String) struct {
    offset: usize,
    bytes: String,
} {
    const length = deserializeInteger(u64, bytes);
    const offset = length + 8;
    return .{ .offset = offset, .bytes = bytes[8..offset] };
}
```

위 함수들은 각각 직렬화, 역직렬화를 진행한다.
여기에서 다뤄지고 있는 `i64`를 예로 들면, 64비트(8바이트 8개) 정보를 담기 위해서, `@sizeOf`에 들어오는 타입에 필요한 바이트 수를 계산하고, 이를 기반으로 버퍼를 생성해두는 것이다.
이후 `writeInt`를 통해 Big Endian 방향으로 데이터를 써내려간다.

역직렬화는 그 반대라고 생각하면 된다.

이후, 특정 상황에서 타입을 변환하기 위한 ("true" => true 로 간주하는 등) as* 함수를 작성해줄 필요가 있다.

```zig
        pub fn asBool(self: Value) bool {
            return switch (self) {
                .null_value => false,
                .bool_value => |value| value,
                .integer_value => |value| value != 0,
                .string_value => |value| value.len > 0,
            };
        }

        pub fn asString(self: Value, buf: *std.ArrayList(u8)) !void {
            try switch (self) {
                .null_value => _ = 1, // Do nothing.
                .bool_value => |value| buf.appendSlice(if (value) "true" else "false"),
                .string_value => |value| buf.appendSlice(value),
                .integer_value => |value| buf.writer().print("{d}", .{value}),
            };
        }

        pub fn asInteger(self: Value) i64 {
            return switch (self) {
                .null_value => 0,
                .bool_value => |value| if (value) 1 else 0,
                .string_value => |value| fromIntegerString(value).integer_value,
                .integer_value => |value| value,
            };
        }
```

이제는 실제 직렬화 및 역직렬화를 수행할 수 있도록 데이터 별로 타입을 식별하기 위한 표시자를 심어두고, 각 표시자를 기반으로 데이터를 인식하도록 한다.
직렬화된 데이터 또한 바이트의 첫 요소를 읽어 구분함으로써 각각 올바른 데이터 처리로 이어지도록 한다.

```zig
        pub fn serialize(self: Value, buf: *std.ArrayList(u8)) String {
            switch (self) {
                .null_value => buf.append('0') catch return "",

                .bool_value => |value| {
                    buf.append('1') catch return "";
                    buf.append(if (value) '1' else '0') catch return "";
                },

                .string_value => |value| {
                    buf.append('2') catch return "";
                    buf.appendSlice(value) catch return "";
                },

                .integer_value => |value| {
                    buf.append('3') catch return "";
                    serializeInteger(i64, buf, value) catch return "";
                },
            }

            return buf.items;
        }

        pub fn deserialize(data: String) Value {
            return switch (data[0]) {
                '0' => Value.NULL,
                '1' => Value{ .bool_value = data[1] == '1' },
                '2' => Value{ .string_value = data[1..] },
                '3' => Value{ .integer_value = deserializeInteger(i64, data[1..]) },
                else => unreachable,
            };
        }
```

## Define Row

실질적으로 하나의 데이터를 저장하는 단위인 Row를 정의한다. Row는 특정 Table 이름을 포함한 id를 key로 하는 KV pair에서 value가 된다.
Table이름을 id로 하기 때문에, 별도의 table이라는 단위를 가지는 대신 `rowIter`를 통해서 동일한 테이블 이름을 가지는 row를 조회한다.

속성에는 Index가 되는 fields와 실제 데이터를 쌓는 cells 가 주가 된다.

```zig
    pub const Row = struct {
        allocator: std.mem.Allocator,
        cells: std.ArrayList(String),
        fields: []String,

        pub fn init(allocator: std.mem.Allocator, fields: []String) Row {
            return Row{
                .allocator = allocator,
                .cells = std.ArrayList(String).init(allocator),
                .fields = fields,
            };
        }
```

이후, 직렬화되지 않은 데이터를 추가하는 `append()`, 직렬화된 데이터를 추가하는 `appendBytes()`, 특정 field만 쿼리하는 `get()`, item전체를 조회하는 `items()`, 초기화함수 등이 있다. 각각 작성하자.

```zig
        pub fn append(self: *Row, cell: Value) !void {
            var cellBuffer = std.ArrayList(u8).init(self.allocator);
            try self.cells.append(cell.serialize(&cellBuffer));
        }

        pub fn appendBytes(self: *Row, cell: String) !void {
            try self.cells.append(cell);
        }

        pub fn get(self: Row, field: String) Value {
            for (self.fields, 0..) |f, i| {
                if (std.mem.eql(u8, field, f)) {
                    var copy = std.ArrayList(u8).init(self.allocator);
                    copy.appendSlice(self.cells.items[i]) catch return Storage.Value.NULL;
                    return Storage.Value.deserialize(copy.items);
                }
            }
            return Value.NULL;
        }

        pub fn items(self: Row) []String {
            return self.cells.items;
        }

        fn reset(self: *Row) void {
            self.cells.clearRetainingCapacity();
        }
```

### Unique ID Generator

위 언급한 것처럼 Row는 자신이 포함되는 테이블을 포함한 값을 Key로 가진다. 따라서 Key를 만들 때 table 이름 + Unique ID를 포함하도록 한다.
이에 필요한 id 생성기가 필요하다.

```zig
    fn generateId(allocator: std.mem.Allocator) ![]u8 {
        const file = try std.fs.cwd().openFile("/dev/random", .{});
        defer file.close();

        var buf: [16]u8 = undefined;
        _ = try file.read(&buf);

        var id = try allocator.alloc(u8, 32);
        _ = try std.fmt.bufPrint(id, "{s}", .{std.fmt.fmtSliceHexLower(&buf)});

        id[0] = '2';

        return id;
    }
```

본 프로젝트에서는 모든 row 맨 앞의 item은 id 가 되고 있다. 따라서 id[0] 에 이것이 단순 String임을 나타낼 수 있도록 '2'를 할당해주어야한다.

### Write Row

실제 Row를 제작하여 저장한다.
Row의 처음에 id를 만들어 넣어주고, 뒤에는 입력받은 row를 직렬화하여 저장하는 과정을 진행한다.

```zig
    pub fn writeRow(self: Storage, table: String, row: *Row) ?Error {
        var key = std.ArrayList(u8).init(self.allocator);
        key.writer().print("row_{s}_", .{table}) catch return "Could not allocate row key in writeRow";

        const id = generateId(self.allocator) catch return "Failed to generate id";
        key.appendSlice(id) catch return "Could not allocate for id in writeRow";

        row.cells.insert(0, id) catch return "Could not insert id into cells";

        var value = std.ArrayList(u8).init(self.allocator);
        for (row.cells.items) |cell| {
            std.debug.print("{any}\n", .{cell});
            serializeBytes(&value, cell) catch return "Could not allocate for cell";
        }

        return self.db.set(key.items, value.items);
    }
```

## Define RowIter

특정 테이블을 포함하는 id를 모두 조회하는 RowIter를 반환한다. 추후 이를 순회하면서 작업들을 진행한다.

```zig
    pub const RowIter = struct {
        row: Row,
        iter: RocksDB.Iter,

        fn init(allocator: std.mem.Allocator, iter: RocksDB.Iter, fields: []String) RowIter {
            return RowIter{
                .iter = iter,
                .row = Row.init(allocator, fields),
            };
        }

        pub fn next(self: *RowIter) ?Row {
            var rowBytes: String = undefined;
            if (self.iter.next()) |b| {
                rowBytes = b.value;
            } else {
                return null;
            }

            self.row.reset();
            var offset: usize = 0;
            while (offset < rowBytes.len) {
                const d = deserializeBytes(rowBytes[offset..]);
                offset += d.offset;
                self.row.appendBytes(d.bytes) catch return null;
            }

            return self.row;
        }

        pub fn close(self: RowIter) void {
            self.iter.close();
        }
    };
```

특정 테이블 이름을 입력으로 해당 테이블 이름을 id로 가지는 row를 조회하는 함수이다.

```zig
    pub fn getRowIter(self: Storage, table: String) Result(RowIter) {
        var rowPrefix = std.ArrayList(u8).init(self.allocator);
        rowPrefix.writer().print("row_{s}_", .{table}) catch return .{
            .err = "Could not allocate for row prefix",
        };

        const iter = switch (self.db.iter(rowPrefix.items)) {
            .err => |err| return .{ .err = err },
            .val => |it| it,
        };

        const tableInfo = switch (self.getTable(table)) {
            .err => |err| return .{ .err = err },
            .val => |t| t,
        };

        return .{ .val = RowIter.init(self.allocator, iter, tableInfo.columns) };
    }
```

## Table

테이블에 대해 정의한다. 속성으로는 column정보와, 각 column에 대한 type정보를 포함하도록 하여 저장한다.
테이블의 메타데이터도 결국 key-value 형태로 저장되어야하므로, key에 특정 키워드를 포함한 채 데이터베이스에 이를 추가한다.

```zig
    pub const Table = struct {
        name: String,
        columns: []String,
        types: []String,
    };

    pub fn writeTable(self: Storage, table: Table) ?Error {
        var key = std.ArrayList(u8).init(self.allocator);
        key.writer().print("tbl_{s}_", .{table.name}) catch return "Could not allocate key for table";

        var value = std.ArrayList(u8).init(self.allocator);
        for (table.columns, 0..) |column, i| {
            serializeBytes(&value, column) catch return "Could not allocate for column";
            serializeBytes(&value, table.types[i]) catch return "Could not allocate for column";
        }

        return self.db.set(key.items, value.items);
    }
```

그리고, Table 정보를 조회하는 `getTable()`을 작성한다.

```zig
    pub fn getTable(self: Storage, name: String) Result(Table) {
        var tableKey = std.ArrayList(u8).init(self.allocator);
        tableKey.writer().print("tbl_{s}_", .{name}) catch return .{
            .err = "Could not allocate for table prefix",
        };

        var columns = std.ArrayList(String).init(self.allocator);
        var types = std.ArrayList(String).init(self.allocator);
        var table = Table{
            .name = name,
            .columns = undefined,
            .types = undefined,
        };

        var columnInfo = switch (self.db.get(tableKey.items)) {
            .err => |err| return .{ .err = err },
            .val => |val| val,
            .not_found => return .{ .err = "No such table" },
        };

        var columnOffset: usize = 0;
        while (columnOffset < columnInfo.len) {
            const column = deserializeBytes(columnInfo[columnOffset..]);
            columnOffset += column.offset;
            columns.append(column.bytes) catch return .{
                .err = "Could not allocate for column name.",
            };

            const kind = deserializeBytes(columnInfo[columnOffset..]);
            columnOffset += kind.offset;
            types.append(kind.bytes) catch return .{
                .err = "Could not allocate for column kind.",
            };
        }

        table.columns = columns.items;
        table.types = types.items;

        return .{ .val = table };
    }
```

===

데이터를 저장하기 위한 직렬화 / 역직렬화를 수행하는 함수, Iter와 Row, Table 등 데이터베이스에 핵심이 되는 개념적인 내용들을 모두 구조체화 하였다.
이제, 실행을 위한 코드만 남았다.
